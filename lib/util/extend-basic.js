/**
 * 汎用的な関数の定義や、Object, Math に対する拡張を定義するファイル。
 */

"use strict";

// 様々な環境に対応するための初期化や独自属性の処理を行う。
//=========================================================================================================

// devicePixelRatio を確実に参照できるようにする。
if(!window.devicePixelRatio)  window.devicePixelRatio = 1;

// 何もしない関数を定義。結構出番がある。
function nothing(a) {
    return a;
}

// JavaScriptドキュメント上での説明のためだけに存在する CanvasImageSource をソース中でも扱えるようにする。
function CanvasImageSource() {}
CanvasImageSource.classof = function(instance) {

    return instance instanceof HTMLImageElement
        || instance instanceof SVGImageElement
        || instance instanceof HTMLCanvasElement
        || instance instanceof HTMLVideoElement
        || instance instanceof ImagePiece
        || (window.CSSImageValue    &&  instance instanceof CSSImageValue)
        || (window.ImageBitmap      &&  instance instanceof ImageBitmap)
        || (window.OffscreenCanvas  &&  instance instanceof OffscreenCanvas);
};


// ミックスインの実装。
//=========================================================================================================

/**
 * クラスのミックスインを行う。PHPのtraitに似た挙動になる。
 * 例)
 *      // クラス A と B1 がある。
 *      class A {
 *          funcA() { console.log("this is A"); }
 *      }
 *
 *      class B1 {
 *          funcB1() { console.log("this is B1"); }
 *      }
 *
 *      // B1を継承した B2 がある。
 *      class B2 extends B1 {
 *          funcB2() { console.log("this is B2"); }
 *      }
 *
 *      // Aを継承した C を定義するのだが、B1のものも含めてB2が備えているメソッドも使えるようにしたい。
 *      class C extends mixin(A, B2) {
 *      }
 *
 *      // 次のようになる。
 *      var c = new C();
 *      c.funcA();                          // this is A
 *      c.funcB1();                         // this is B1
 *      c.funcB2();                         // this is B2
 *      console.log(c.constructor.name);    // C
 *      console.log(c instanceof A);        // true
 *      console.log(c instanceof B1);       // false。クローンなので…
 *      console.log(c instanceof B2);       // false。クローンなので…
 *      console.log(c instanceof C);        // true
 *
 *      // 継承関係は C <= B2(clone) <= B1(clone) <= A となっている。
 *      console.log(C.prototype.__proto__ == B2.prototype);                     // false。クローンなので…
 *      console.log(C.prototype.__proto__.__proto__ == B1.prototype);           // false。クローンなので…
 *      console.log(C.prototype.__proto__.__proto__.__proto__ == A.prototype);  // true
 *
 *      // 従って...
 *      class B3 {
 *          funcA() { console.log("this is A(B3)"); }
 *      }
 *
 *      class D extends mixin(A, B3) {
 *          funcD() { super.funcA() }   // このsuperはAのfuncA？それともB3のfuncA？
 *      }
 *
 *      var d = new D();
 *      d.funcD();          // "this is A(B3)" と出力される。B3のfuncAとなる。
 */
function mixin(base, ...traits) {

    var result = base;

    // 指定されたbaseに、指定クラスを乗せながら新たなクラスを作っていく。
    for(var trait of traits)
        result = mixin_one(result, trait);

    return result;
}

function mixin_one(base, trait) {

    // まずは指定されたトレイトのプロトタイプを Object.prototype に行き当たるまで配列 a に追加していく。
    var a = [];
    for(var p = trait.prototype ; p != Object.prototype ; p = p.__proto__)
        a.push(p);

    // 配列 a を逆に辿りながら、新たなクラスを作っていく。
    var result = base;
    for(var i = a.length - 1 ; i >= 0 ; i--) {
        result = class extends result {};
        result.prototype.mime(a[i]);
    }

    return result;
}

/**
 * …と、mixinを定義するのは良いんだけど、どうも super.func() 形式のコールには不思議挙動があって…
 *
 *      class A {
 *          funcA() { console.log("this is A"); }
 *      }
 *
 *      class B1 {
 *          funcA() { console.log("this is B1"); super.funcA(); }
 *      }
 *
 *      class B2 extends B1 {
 *          funcA() { console.log("this is B2"); super.funcA(); }
 *      }
 *
 *      class C extends mixin(A, B2) {
 *      }
 *
 *      var c = new C();
 *      c.funcA();
 *      // this is B2
 *      // this is B1
 *      // TypeError: (intermediate value).funcA is not a function
 *
 * となってしまう。extendsのあるclass内でないとsuperは使えない？でも次のは通るんだよなぁ。
 *
 *      var obj1 = {
 *          funcA() { console.log('obj1'); }
 *      };
 *
 *      var obj2 = {
 *          funcA() { console.log('obj2'); super.funcA(); }
 *      };
 *
 *      obj2.__proto__ = obj1;
 *      obj2.funcA();
 *
 * まあとにかく、B1からもなんとかsuper使えるようにしようぜっていうのがこの関数。次のように使う。
 *
 *      class B1 {
 *          funcA() { console.log("this is B1"); this.super(B1.prototype.funcA); }
 *      }
 *
 * せめて callee が廃止されていなければ次のように出来たのだが…バグ扱いされてるからそのうち復活すると思う。
 *
 *      this.super(arguments.callee);
 *
 * @param       プロトタイプチェーン上、呼びたい関数の手前にある同名関数。この関数をプロトタイプチェーンから見つけて、
 *              さらにその次に見付かる同名関数を呼ぶのがこの関数の働き。
 * @param...    引数リスト。
 * @return      関数が戻した値。
 */
Object.defineProperty(Object.prototype, 'super', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(meFunc, ...args) {

        var find = false;

        // プロトタイプチェーンを遡りながら、指定された関数と同じプロパティを見ていく。
        for(var holder = this ; holder ; holder = holder.__proto__) {
            if( holder.hasOwnProperty(meFunc.name) ) {

                // 指定された関数が見付かったらフラグを立てる。
                if(!find) {

                    if(holder[meFunc.name] == meFunc)
                        find = true;

                    continue;
                }

                // その次に見付かったプロパティを関数としてコールする。
                return holder[meFunc.name].call(this, ...args);
            }
        }

        throw new Error("指定の関数がプロトタイプチェーンに見付かりません");
    }
});


// Object拡張
//=========================================================================================================

/**
 * 引数に指定された値がオブジェクトかどうかを返す。typeof は null を "object" と報告するが、この関数はnullをオブジェクトとして扱わない。
 */
Object.isObject = function(val) {

    return val  &&  typeof val == "object";
}

/**
 * 引数で指定されたオブジェクトのキーをこのオブジェクトにマージする。プロトタイプチェーンの値も含めて列挙可能なものだけがインポートされる。
 * ゲッター・セッターは値化される。
 * もっと忠実に(列挙不能なものも、ゲッター・セッターもそのまま、ディスクリプターをそのまま)インポートしたい場合は mime() を使うと良い。
 *
 * @param   インポートしたい値を持つオブジェクト。
 * @return  このオブジェクト。
 */
Object.defineProperty(Object.prototype, 'merge', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        if(source === undefined  ||  source === null)  return this;

        // プロトタイプチェーンの値も含めて列挙可能なものだけを、ゲッター・セッターは値化しながらインポート。
        for(var i in source)
            this[i] = source[i];

        return this;
    }
});

/**
 * merge() の再帰バージョン。値がオブジェクトになっている同じキーがある場合に、それらが再帰的にマージされる。
 *
 * 例)
 *      var obj1 = { a:"A", b:{b1:"B1"} };
 *      var obj2 = {        b:{b2:"B2"}, c:"C" };
 *
 *      obj1.deepmerge(obj2);
 *      console.log(obj1);      // { a:"A", b:{b1:"B1", b2:"B2"}, c:"C" };
 */
Object.defineProperty(Object.prototype, 'deepmerge', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        if(source === undefined  ||  source === null)  return this;

        for(var i in source) {
            if(Object.isObject(this[i]) && Object.isObject(source[i]))  this[i].deepmerge(source[i]);
            else                                                        this[i] = source[i];
        }

        return this;
    }
});

/**
 * 引数で指定されたオブジェクトの内容をこのオブジェクトにマージする。プロトタイプチェーンはチェックせず直接所有のもののみが対象。
 * プロパティディスクリプターをそのままインポートするため、ゲッター・セッターなども値化せずにそのまま複製される。
 * 表面的な(列挙可能なものだけを、ゲッター・セッターは値化しながら)インポートをしたい場合は Object.assign() か、プロトタイプチェーンも含めて
 * 行いたいなら merge() を使うと良い。
 *
 * @param   インポートしたい値を持つオブジェクト。
 * @return  このオブジェクト。
 */
Object.defineProperty(Object.prototype, 'mime', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        if(source === undefined  ||  source === null)
            return this;

        // 直接所有のものだけを、列挙不能なものも、ゲッター・セッターもそのまま、ディスクリプターをそのままインポート。
        for(var name of Object.getOwnPropertyNames(source)) {
            var descriptor = Object.getOwnPropertyDescriptor(source, name);
            Object.defineProperty(this, name, descriptor);
        }

        return this;
    }
});

/**
 * インスタンスのシャローコピー(値として持っているオブジェクトを共有したもの)を作成する。
 * プロトタイプチェーンはまるごと共有しているので注意。
 */
Object.defineProperty(Object.prototype, 'copy', {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        // 同じ型のクローンを用意して、直接所有のプロパティのみをシャローコピーする。
        var result = Object.create( Object.getPrototypeOf(this) );
        result.mime(this);

        return result;
    }
});

/**
 * インスタンスのディープコピー(値として持っているオブジェクトもクローンで置き換えたもの)を作成する。
 * ただしプロトタイプチェーンはまるごと共有しているので注意。
 */
Object.defineProperty(Object.prototype, 'clone', {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        // まずはシャローコピーを作成。
        var result = this.copy();

        // 作成したコピーの直接所有のプロパティのうち、オブジェクトのものを再帰してクローンしていく。
        for(var name of Object.getOwnPropertyNames(result)) {

            var descriptor = Object.getOwnPropertyDescriptor(result, name);

            if( Object.isObject(descriptor.value) )
                descriptor.value = descriptor.value.clone();

            Object.defineProperty(result, name, descriptor);
        }

        return result;
    }
});

/**
 * 指定された値を保持しているキーを返す。見付からない場合は undefined。
 */
Object.defineProperty(Object.prototype, 'index', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(search) {

        for(var i in this) {
            if(this[i] == search)
                return i;
        }

        return undefined;
    }
});

/**
 * すべての要素に対してコールバックを適用する。
 *
 * @param   各要素に対して処理を行う関数。この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のキー
 *              @param  このオブジェクト
 */
Object.defineProperty(Object.prototype, 'each', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(callback) {

        for(var [i, v] of this)
            callback(v, i, this);
    }
});

/**
 * すべての要素に対してコールバックを適用した新しいオブジェクトを作成する。
 *
 * @param   各要素に対して処理を行う関数。この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のキー
 *              @param  このオブジェクト
 *              @return 処理結果
 * @return  作成した新しいオブジェクト。
 */
Object.defineProperty(Object.prototype, 'map', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(callback) {

        var result = {};

        for(var [i, v] of this)
            result[i] = callback(v, i, this);

        return result;
    }
});

/**
 * Object.keys() をインスタンスメソッドとして呼べるようにする。
 */
Object.defineProperty(Object.prototype, 'keys', {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        return Object.keys(this);
    }
});

/**
 * Object.values() をインスタンスメソッドとして呼べるようにする。
 */
Object.defineProperty(Object.prototype, 'values', {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        return Object.values(this);
    }
});

/**
 * オブジェクトのエントリを for(...of) で反復出来るようにする。
 */
Object.defineProperty(Object.prototype, Symbol.iterator, {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        var me = this, i = 0, keys = this.keys();

        return {
            next: ()=>{

                if(i == keys.length)
                    return {done:true};

                var key = keys[i++];
                var val = me[key];
                return {done:false, value:[key, val]};
            }
        };
    }
});

/**
 * オブジェクトのデフォルトの文字列変換動作で、せめて型くらい分かるようにする。
 */
Object.defineProperty(Object.prototype, "toString", {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        return `[object ${this.constructor.name}]`;
    }
});

/**
 * このオブジェクトが直接所有しているキーとその値を、最初に見つけた5つのみ説明する文字列を作成する。デバッグ用。
 */
Object.defineProperty(Object.prototype, "explain", {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        var explain = "";

        var i = 0
        for( var key of this.keys() ) {
            explain += `"${key}": ${this[key]}  `;
            if(++i == 5)  break;
        }

        return explain;
    }
});

/**
 * キーを引数に指定された通りにたどって子孫要素の値を取得したり設定したりする。
 *
 * @param   たとえば、["abc"]["def"]["ghi"] を取得したいなら "abc.def.ghi" と指定する。
 * @return  指定されたプロパティの値を変更できる set、取得できる get という関数を持つオブジェクト。
 *
 * 例)
 *      var o = {
 *          abc: {
 *              def: "DEF"
 *          },
 *          foo: {
 *              bar: "BAR"
 *          }
 *      };
 *
 *      var prop = o.route("abc.def");
 *      var p = prop.get();     // p = "DEF"
 *      prop.set("DEF a GO")    // o.abc.def = "DEF a GO"
 *
 *      // 途中のキーが存在しないとnullが返る。ただし、末尾のキーだけは存在しなくても良い。
 *      var prop = o.route("foo.bar");      // OK
 *      var prop = o.route("foo.baz");      // OK
 *      var prop = o.route("foooo.bar");    // prop = null
 */
Object.defineProperty(Object.prototype, 'route', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(route) {

        // 引数を "." で区切る。
        var strata = route.split(".");

        // 最後のキーは取り出しておく。
        var last = strata.pop();

        // 変数 cursor で最後の一つ手前までたどっていく。
        var cursor = this;
        for(var i = 0 ; i < strata.length ; i++) {

            // たどる。
            cursor = cursor[ strata[i] ];

            // プリミティブ値から先をたどるのはおかしい…
            if( !Object.isObject(cursor) )
                return null;
        }

        // 該当の値を操作・取得できるオブジェクトを返す。
        return cursor.ref(last);
    }
});

/**
 * このオブジェクトの指定されたキーに対する参照のようなオブジェクトを返す。
 *
 * 例)
 *      var obj = {a:"A"};
 *
 *      var r = obj.ref("a");
 *      console.log( r.get() );     // A と出力される。
 *
 *      r.set("A2");
 *      console.log( r.get() );     // A2 と出力される。
 *      console.log( obj.a );       // A2 と出力される。
 */
Object.defineProperty(Object.prototype, 'ref', {
    enumerable:false,  configurable:true,  writable:true,
    value: function(key) {

        var me = this;

        return {
            get: function() {
                return me[key];
            },
            set: function(val) {
                me[key] = val;
            }
        };
    }
});


// Math拡張
//=========================================================================================================

Math.PI15 = Math.PI / 12;
Math.PI30 = Math.PI / 6;
Math.PI45 = Math.PI / 4;
Math.PI90 = Math.PI / 2;
Math.PI180 = Math.PI;
Math.PI270 = Math.PI * 1.5;
Math.PI360 = Math.PI * 2;

/**
 * 指定された範囲内のランダム値(小数)を返すメソッドを追加。
 */
Math.randomRange = function(min, max) {

    return Math.random() * (max - min) + min;
}

/**
 * 同じく、ランダム整数を返すメソッドを追加。返される値にはmaxの値も含まれる。
 */
Math.randomInt = function(min, max) {

    // 大小が入れ替わっている場合は補正。
    if(max < min) {
        min ^= max;  max ^= min;  min ^= max;
    }

    return Math.floor( Math.randomRange(min, max + 1) );
}

/**
 * 指定された値を中心に、指定された上下幅に収まる数をランダムで返す。
 * たとえば中心に100、幅に10を指定したなら、90～110の値が返る。
 *
 * @param   中心となる値。
 * @param   幅。
 * @return  指定された範囲内のランダムな値。
 */
Math.randomFuzz = function(base, fuzz) {

    return base + this.randomRange(-fuzz, fuzz);
}

/**
 * randomFuzz() と同じだが、第二引数を割合で指定する点が異なる。
 *
 * 例)
 *      var ret = Math.swingRandom(100, 0.1);   // 90～110 の値を返す。
 *      var ret = Math.swingRandom(200, 0.2);   // 160～240 の値を返す。
 *
 * @param   中心となる値。
 * @param   第一引数に対する幅の割合。小数で指定する。
 * @return  指定された範囲内のランダムな値。
 */
Math.randomSwing = function(base, rate) {

    var fuzz = Math.abs(base * rate);

    return Math.randomFuzz(base, fuzz);
}

/**
 * 指定された配列から、指定された重み付けで要素を一つ選び、そのキーを返す。
 * 例えば、次のような連想配列を指定したとき...
 *     {
 *         'alpha': 10,
 *         'beta': 15,
 *         'gamma': 20,
 *     }
 * 次のような確率で値が返る。
 *     'alpha'    10 / (10 + 15 + 20)
 *     'beta'     15 / (10 + 15 + 20)
 *     'gamma'    20 / (10 + 15 + 20)
 *
 * @param   キーを戻り値、値を重みとする連想配列
 * @return  的中した要素のキー
 */
Math.weightedDraw = function(drops) {

    // 重みの合計を求める
    var total = 0;
    for(var k in drops)
        total += drops[k];

    // 合計が変なのはカラ配列とか考えられるので、nullリターン。
    if(total == 0)
        return null;

    // 1～合計値でランダム値を取得。
    pick = Math.randomInt(1, total);

    // ランダムにしたがって値を一つ返す。
    for(var k in drops) {

        if(pick <= drops[k])
            return k;

        pick -= drops[k];
    }

    // ここに来るのはエラー。
    throw 'ここに制御は来ないはず';
}

/**
 * 引数で与えられた値と同じ符号を持つ絶対値 1 の値を返す。0 が与えられた場合は 0 を返す。
 *
 * @param   調べたい値。
 * @param   マイナスの場合に -1 以外の値がほしい場合はその値を指定する。
 * @param   ゼロの場合に 0 以外の値がほしい場合はその値を指定する。
 * @param   プラスの場合に +1 以外の値がほしい場合はその値を指定する。
 * @return  与えられた値に応じた値。
 */
Math.sign = function(num, negative = -1, zero = 0, positive = +1) {

    if(num < 0)  return negative;
    if(num > 0)  return positive;
    return zero;
}

/**
 * 引数で与えられた値を、与えられたピボットで反転した値を返す。
 * 例)
 *     var x = Math.mirror(5, 10);   // 15
 *     var x = Math.mirror(8, 10);   // 12
 *     var x = Math.mirror(-3, 10);  // 23
 */
Math.mirror = function(num, pivot) {

    return num + (pivot - num) * 2;
}

/**
 * 指定された開始値から終了値までの間で、指定された進捗率における値を返す。
 *
 * @param   開始値
 * @param   終了値
 * @param   進捗率。0.0 ～ 1.0。
 * @return  指定された進捗率における値。
 */
Math.lerp = function(start, end, t) {

    return (end - start) * t + start;
}

/**
 * 引数で与えられた単位で切り捨てを行う。
 * つまり、第二引数の倍数のうち、第一引数以下の最大値を返す。
 * 第二引数を負で指定した場合、その絶対値の倍数のうち、第一引数以上の最小値を返す。
 *
 * 例)
 *     var x = Math.step(10, 3);   // 9
 *     var x = Math.step(20, 3);   // 18
 *     var x = Math.step(21, 3);   // 21
 *     var x = Math.step(-10, 3);  // -12
 *     var x = Math.step(10, -3);  // 12
 */
Math.step = function(num, width) {

    return Math.floor(num / width) * width;
}

/**
 * 指定された数値範囲の繰り返しで数値空間が構成されていると仮定した場合の、指定された値の数を返す。
 * 例) 2-5 の範囲のみで構成されている場合の、各値の位置。
 *     var x = Math.loop(0, 5, 2);      // 3
 *     var x = Math.loop(1, 5, 2);      // 4
 *     var x = Math.loop(2, 5, 2);      // 2
 *     var x = Math.loop(3, 5, 2);      // 3
 *     var x = Math.loop(4, 5, 2);      // 4
 *     var x = Math.loop(5, 5, 2);      // 2
 *     var x = Math.loop(6, 5, 2);      // 3
 *
 * @param   ループ位置を求めたい値。
 * @param   ループ終端値
 * @param   ループ始端値。省略時は 0。
 */
Math.loop = function(num, end, start) {

    // 始端省略時は 0。
    if(start === undefined)
        start = 0;

    // ループの幅を求める。
    var width = end - start;

    // ループ始端をゼロとして解を求める。
    var d = (num - start) % width;
    if(d < 0)
        d += width;

    // 始端を戻してリターン。
    return start + d;
}

/**
 * 指定された角度が、指定された範囲にあるかどうかを返す。
 * 0～360の範囲外の角度を混在指定しても正しく判定するが、始端と終端の指定方法には留意が必要となる。
 * たとえば、角度360°を判定している場合、次のようになる。
 *      正向・正順  -90～+90    ⇒ true
 *      逆向・正順  +90～-90    ⇒ true
 *      正向・逆順  +90～270    ⇒ false
 *      逆向・逆順  270～+90    ⇒ false
 * ここでは度数で説明したが、引数はすべてラジアンで指定すること。
 * 一周を超えているような範囲指定は想定していないので注意。
 *
 * @param   判定したい角度。
 * @param   始端角度。
 * @param   終端角度。
 * @return  範囲内ならtrue、範囲外ならfalse。始端と同じならtrueと評価されるが、終端と同じなのはfalseとされる。
 */
Math.inAngle = function(angle, begin, end) {

    // まずは正向かどうかを取得。正向ならtrue。
    var dir = begin < end;

    // 指定角度をすべて正規化。
    angle = Math.loop(angle, Math.PI360);
    begin = Math.loop(begin, Math.PI360);
    end = Math.loop(end, Math.PI360);

    // 始端と同じケースをまずはカットしておく。
    if(angle == begin)
        return true;

    // 正順かどうかを取得。正順ならtrue。
    var order = begin < end;

    // 範囲角度の大小を取る。
    var min = Math.min(begin, end);
    var max = Math.max(begin, end);

    // その範囲にあるかどうかを取得。
    var inside = (min < angle)  &&  (angle < max);

    // 範囲内か、向き、順によって戻り値が決まる。
    return inside ^ dir ^ order;
}

/**
 * ラジアンを度数に直す。
 */
Math.degree = function(radian) {

    return radian / Math.PI * 180;
}
