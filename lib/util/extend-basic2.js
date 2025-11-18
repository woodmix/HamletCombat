/**
 * String, Array, Date オブジェクトに対する拡張を定義するファイル。
 */

// String拡張
//=========================================================================================================

// toLowerCase() と toUpperCase() って、ブラウザーのロケーション設定がトルコだと一般的でない動作をするらしい。
//      http://qiita.com/niusounds/items/fff91f3f236c31ca910f
// …ので、保証する。
if('i' !== 'I'.toLowerCase()) {

    String.prototype.toLowerCase = function() {
        return this.replace(/[A-Z]/g, function(ch){return String.fromCharCode(ch.charCodeAt(0) | 32)});
    };

    String.prototype.toUpperCase = function() {
        return s.replace(/[a-z]/g, function(ch){return String.fromCharCode(ch.charCodeAt(0) & ~32)});
    };
}

/**
 * 引数で指定された長さのランダム文字列を返す。
 *
 * @param   ほしい文字列の長さ。省略した場合は8。
 */
String.random = function(length) {

    // 引数省略時の対応。
    if(length == undefined)
        length = 8;

    // とりあえず8文字生成。
    // ネットでは Math.random().toString(36).substr(-8) というのがよくあるが、1000回試行すると10個以上は
    // 重複する。末尾じゃなくて先頭側を使うとだいぶ軽減される。
    var result = Math.random().toString(36).substr(2, 8);

    // 長さが足りない場合は再帰して対処。余る場合はカットする。
    if(result.length < length)
        result += String.random(length - result.length);
    else if(length < result.length)
        result = result.substr(0, length);

    return result;
}

/**
 * 先頭文字のみを大文字化した文字列を返す。
 */
String.prototype.ucfirst = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

/**
 * 引数で指定された配列の中にこの文字列と同じ値があるかどうかを返す。
 */
String.prototype.existsIn = function(collection) {

    // toString() しとかないとうまく動作しない。オブジェクトとしてのStringとプリミティブstring型で違いがあるのだろう。
    return collection.includes( this.toString() );
};

/**
 * この文字列をファイルパスと解釈して種々の情報を返す。
 *
 * @return  次のキーを持つコレクション。
 *              dirpath     ディレクトリパス
 *              basename    ベース名
 *              extension   拡張子
 *
 * 例)
 *      var info = "/abc/def/ghi.png.log".pathinfo()
 *      // info = { dirpath: '/abc/def/', basename: 'ghi.png', extension: 'log' }
 *      var info = "http://example.com/abc/def.html?ghi=jkl".pathinfo();
 *      // info = { dirpath: 'http://example.com/abc/', basename: 'def', extension: 'html' }
 */
String.prototype.pathinfo = function() {

    var result = {};

    var match = /^(.*?\/)?([^\/]*?)?(?:\.(\w+))?(?=\?|$)/.exec(this);
    result["dirpath"] = match[1] || "";
    result["basename"] = match[2] || "";
    result["extension"] = match[3] || "";

    return result;
};

/**
 * printf() と同様に文字埋め込みを行う。
 *
 * 例)
 *      var ret = "%05d is %s. %d is %s.".format(100, "hundred", 5, "five");
 *      // ret = "00100 is hundred. 5 is five."
 *
 * …と言っても、対応しているのは %s, %d, %+d, %0Nd, %x, %+s, %0Nx, %f, %.Nf, %% のみ。
 */
String.prototype.format = function() {

    // 指定された引数を取っておく。
    var args = arguments;

    // カウンタ変数初期化。
    var count = 0;

    // 置き換え文字列にマッチする正規表現で置き換え処理。
    return this.replace(/%(\+)?\.?(\d+)?([\w%])/g, function(match, p1, p2, p3){

        // "%%" だけは先に処理する。
        if(match == "%%")  return "%";

        // 対応する引数を取得してカウンタ変数進行。
        var arg = args[count++];

        // 対応する引数が undefined, null ならそのように置き換える。
        if(arg === undefined  ||  arg === null)
            return arg;

        // 対応する引数が数値であると仮定した場合、符号の表示追加が必要なら準備しておく。
        var sign = p1 ? Math.sign(arg, "", " ", "+") : "";

        switch(p3) {

            case "s":
                return arg;

            case "d":
            case "x":

                var radix = (p3 == "d") ? 10 : 16;
                var num = Math.floor(arg).toString(radix);

                if(p2 == undefined)
                    return sign + num;
                else
                    return sign + ("0".repeat(p2) + num).slice(-p2);

            case "f":
                if(p2 == undefined)
                    return sign + arg.toString();
                else
                    return sign + arg.toFixed(p2);

            default:
                return match;
        }
    })
}


// Array拡張
//=========================================================================================================

/**
 * 全要素のうち最大の値のものを返す。
 *
 * @param   単純に要素の値で比較するのではなく要素に対する何らかの計算結果で比較するのであれば、それを求めるための関数を指定する。
 *          この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のインデックス
 *              @param  呼び出されている配列
 *              @return 計算結果
 * @return  最大の値を持つ要素。空の配列の場合は -Infinity だが、引数を指定した場合は null。
 */
Array.prototype.max = function(callback) {

    if(!callback)  return Math.max(...this);

    var result = null, current = -Infinity;

    for(var index of this.sparseKeys()) {

        var element = this[index];
        var value = callback(element, index, this);

        if(current <= value) {
            result = element;
            current = value;
        }
    }

    return result;
}

/**
 * 全要素のうち最小の値のものを返す。
 *
 * @param   単純に要素の値で比較するのではなく要素に対する何らかの計算結果で比較するのであれば、それを求めるための関数を指定する。
 *          この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のインデックス
 *              @param  呼び出されている配列
 *              @return 計算結果
 * @return  最小の値を持つ要素。空の配列の場合は +Infinity か、引数を指定した場合は null。
 */
Array.prototype.min = function(callback) {

    if(!callback)  return Math.min(...this);

    var result = null, current = +Infinity;

    for(var index of this.sparseKeys()) {

        var element = this[index];
        var value = callback(element, index, this);

        if(value < current) {
            result = element;
            current = value;
        }
    }

    return result;
}

/**
 * 指定されたテスト関数を配列内の各要素に適用して、真値を返した数を数える。
 * テスト関数を省略した場合は、真に評価される値を持つ要素の数を数える。
 *
 * @param   テスト関数。この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のインデックス
 *              @param  呼び出されている配列
 *              @return テスト結果
 * @return  テスト関数が真に評価される値を返した数。空の配列の場合は 0。
 */
Array.prototype.count = function(callback) {

    if(callback == undefined)  callback = v => v;

    return this.reduce( (a, v, i, me) => a + (callback(v, i, me) ? 1 : 0), 0 );
}

/**
 * 全要素の値の合計を返す。
 *
 * @param   単純に各要素の値を使うのではなく要素に対する何らかの計算結果を使うのであれば、それを求めるための関数を指定する。
 *          この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のインデックス
 *              @param  呼び出されている配列
 *              @return 計算結果
 * @return  合計値。空の配列の場合は 0。
 */
Array.prototype.sum = function(callback) {

    if(callback == undefined)  callback = v => v;

    return this.reduce( (a, v, i, me) => a + callback(v, i, me), 0 );
}

/**
 * 全要素の値の平均を返す。
 *
 * @param   単純に各要素の値を使うのではなく要素に対する何らかの計算結果を使うのであれば、それを求めるための関数を指定する。
 *          この関数は次の引数・戻り値仕様を満たすことが求められる。
 *              @param  要素の値
 *              @param  要素のインデックス
 *              @param  呼び出されている配列
 *              @return 計算結果
 * @return  平均値。空の配列の場合は NaN。
 */
Array.prototype.average = function(callback) {

    return this.sum(callback) / this.length;
}

/**
 * 最後の要素の値を返す。
 */
Array.prototype.last = function() {

    return this[this.length - 1];
}

/**
 * pop() に引数を一つ取れるようにして、引数が指定された場合は指定されたインデックスの要素に対して働くものとする。
 */
Array.prototype.pop_org = Array.prototype.pop;
Array.prototype.pop = function(index) {

    // 引数が指定されていないならオリジナルの pop() を呼ぶ。
    if(index == undefined)
        return this.pop_org();

    // 指定されているなら、その要素を取り出すとともに削除する。
    var ret = this.splice(index, 1);

    // 取り出した値をリターン。
    return ret[0];
}

/**
 * 要素番号をランダムに一つ返す。
 */
Array.prototype.randomIndex = function() {

    // 要素が一つもない場合は undefined を返す。
    if(this.length == 0)
        return undefined;

    return Math.randomInt(0, this.length - 1);
}

/**
 * 要素をランダムに一つ返す。
 */
Array.prototype.random = function() {

    return this[ this.randomIndex() ];
}

/**
 * 要素をランダムに一つ取り出して、その要素を削除する。
 */
Array.prototype.popRandom = function() {

    return this.pop( this.randomIndex() );
}

/**
 * 配列の並び順をランダムに変更する。
 */
Array.prototype.shuffle = function() {

    var n = this.length, t, i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = this[n];
        this[n] = this[i];
        this[i] = t;
    }

    return this;
}

/**
 * 指定された値を持つ要素を一つ除去する。複数あっても一つしか処理しない。すべて処理したい場合は filter を使う方が良いだろう。
 */
Array.prototype.pickout = function(val) {

    for(var i = 0 ; i < this.length ; i++)
        if(this[i] == val)  this.pop(i);
}

/**
 * 重複する要素を排除した新しい配列を作成する。
 */
Array.prototype.unique = function() {

    return this.filter( (v, i) => (this.indexOf(v) == i) );
}

/**
 * 要素を数値としてソートする。引数には、降順にソートする場合はtrueを指定する。
 */
Array.prototype.numsort = function(desc) {

    if(desc)  return this.sort( (a, b) => b - a );
    else      return this.sort( (a, b) => a - b );
}

/**
 * 配列を指定された要素数ごとに分割する。
 *
 * 例)
 *      var s = [1, 2, 3, 4, 5, 6, 7].segment(3);
 *      // s = [ [1, 2, 3], [4, 5, 6], [7] ]
 */
Array.prototype.segment = function(size) {

    var result = []

    for(var i = 0 ; i < this.length ; i += size)
        result.push( this.slice(i, i + size) );

    return result;
}


/**
 * Array.prototype.keys() は抜けている要素のインデックスも含めて返すものなので、返さないバージョンの関数を追加する。
 */
Array.prototype.sparseKeys = function() {

    return Object.keys(this);
}

/**
 * 静的メソッド。指定された引数が配列ならそのまま、そうでないなら単一の要素を持つ配列にして返す。
 * ただし、null や undefined を指定すると空の配列を返す。
 */
Array.cast = function(value) {

    switch(true) {
        case value instanceof Array:    return value;
        case value == null:             return [];
        default:                        return [value];
    }
}


// Date拡張
//=========================================================================================================

/**
 * 引数に与えられた日時文字列を Date 型に変換する。Dateコンストラクタと似ているが、アプリで標準的に
 * 扱っている "YYYY-MM-DD hh:mm:ss" 形式の日付を iOS でも確実に解析できるようにする。
 *
 * @param   日時を表す文字列。
 * @return  Date型の値。
 */
Date.generate = function(datetime) {

    // 日付と時刻の区切りとしての "T" は要らないはずなんだけど、Mac Safari クンはこれがないと分からないようなので…
    if( datetime  &&  datetime.match(/^\d{4}\-\d{2}\-\d{2} \d{2}:\d{2}:\d{2}$/) )
        datetime = datetime.replace(" ", "T") + "+09:00";

    return new Date(datetime);
}

/**
 * 日付を引数で指定されたフォーマットで返す。
 *
 * @param   フォーマット文字列。今のところ、以下の文字列が変換される。
 *              YYYY, YY, MM, M, DD, D, hh, h, mm, m ss, s, S(ミリ秒。1-3桁), W(日本語曜日)
 * @return  フォーマット後の文字列。
 */
Date.prototype.format = function(format) {

    if(!format)  format = 'YYYY-MM-DD hh:mm:ss.SSS';

    format = format.replace( /YYYY/g, this.getFullYear() );
    format = format.replace( /YY/g, this.getFullYear().toString().slice(-2) );
    format = format.replace( /MM/g, ('0' + (this.getMonth() + 1)).slice(-2) );
    format = format.replace( /M/g,  this.getMonth() + 1 );
    format = format.replace( /DD/g, ('0' + this.getDate()).slice(-2) );
    format = format.replace( /D/g,  this.getDate() );
    format = format.replace( /hh/g, ('0' + this.getHours()).slice(-2) );
    format = format.replace( /h/g, this.getHours() );
    format = format.replace( /mm/g, ('0' + this.getMinutes()).slice(-2) );
    format = format.replace( /m/g, this.getMinutes() );
    format = format.replace( /ss/g, ('0' + this.getSeconds()).slice(-2) );
    format = format.replace( /s/g, this.getSeconds() );

    if (format.match(/S/g)) {
        var milliSeconds = ('00' + this.getMilliseconds()).slice(-3);
        var length = format.match(/S/g).length;
        for (var i = 0; i < length; i++) format = format.replace( /S/, milliSeconds.substring(i, i + 1) );
    }

    format = format.replace( /W/g, '日月火水木金土'[this.getDay()] );

    return format;
}

/**
 * format() と同じだが、時刻が 00:00:00 の場合に-1秒してからフォーマットする。
 * 終了日時などを「11日 00:00まで」などとせずに「10日 23:59まで」などと表示したい場合に使う。
 */
Date.prototype.uformat = function(format) {

    if(this.getHours() == 0  &&  this.getMinutes() == 0  &&  this.getSeconds() == 0)
        var date = new Date(this.getTime() - 1000);
    else
        var date = this;

    return date.format(format);
}

/**
 * format()とuformat()のstatic版。第一引数をgenerate()で日時に直してからフォーマットする。
 *
 * @param   日時を表す文字列。
 * @param   フォーマット文字列
 * @param   第一引数が偽の値だった場合の出力
 * @return  フォーマット後の文字列。
 */
Date.format = function(datetime, format, ifNull) {

    if(ifNull == undefined)  ifNull = '';

    return datetime ? Date.generate(datetime).format(format) : ifNull;
}

Date.uformat = function(datetime, format, ifNull) {

    if(ifNull == undefined)  ifNull = '';

    return datetime ? Date.generate(datetime).uformat(format) : ifNull;
}
