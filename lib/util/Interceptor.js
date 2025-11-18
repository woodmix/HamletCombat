
/**
 * Proxyを使って他のオブジェクトのプロパティ参照や関数実行に介入するクラスの基底。
 * 介入したい関数をオーバーライドのように定義したりできる。
 *
 * 例)
 *      // 次のようなクラスがあるとする。
 *      class A {
 *          func() {
 *              console.log("this is A::func()");
 *              this.func2();
 *          }
 *          func2() {
 *              console.log("this is A::func2()");
 *              this.func3();
 *          }
 *          func3() {
 *              console.log("this is A::func3()");
 *          }
 *      }
 *
 *      // これは次のように出力される。
 *      //      this is A::func()
 *      //      this is A::func2()
 *      //      this is A::func3()
 *      var a = new A();
 *      a.func();
 *
 *      // Interceptor から派生して、funcとfunc2に介入するクラスを作る。
 *      class MyInterceptor extends Interceptor {
 *
 *          func() {
 *              console.log("this is MyInterceptor::func()");
 *              this.reflect("func");       // 内包オブジェクトに転送するときはこのようにするのが基本。this._proxy_target.func() とすると、このクラスの func2 が呼ばれない。
 *                                          // ただ、注意点(後述)があるのでどちらを選択するかはケースバイケース。完璧な方法はない。
 *          }
 *          func2() {
 *              console.log("this is MyInterceptor::func2()");
 *              this.reflect("func2");
 *          }
 *      }
 *
 *      // 次のようにインスタンスを得る。
 *      var m = new MyInterceptor(a);
 *
 *      // 次のように出力される。
 *      //      this is MyInterceptor::func()
 *      //      this is A::func()
 *      //      this is MyInterceptor::func2()
 *      //      this is A::func2()
 *      //      this is A::func3()
 *      m.func();
 *
 *      // ちなみにProxyなので次のようになる。
 *      console.log("func3" in m);                  // true
 *      console.log(m instanceof MyInterceptor);    // false
 *      console.log(m instanceof A);                // true
 *      console.log(m.constructor.name);            // MyInterceptor
 *      m.b = "B";
 *      console.log(m.b);                           // B
 *      console.log(m._proxy_target.b);             // B
 *
 *      console.log(Object.getPrototypeOf(m) == A.prototype);               // true
 *      console.log(Object.getPrototypeOf(m) == MyInterceptor.prototype);   // false
 *      console.log(m.constructor.name);                                    // MyInterceptor。この辺↓は、constructor や __proto__ がmの直接のメンバだからだと思う。
 *      console.log(m.__proto__ == A.prototype);                            // false
 *      console.log(m.__proto__ == MyInterceptor.prototype);                // true
 *
 *      // また、このクラス自体がハンドラとして機能しているので、get(), set(), has() などはハンドラメソッドとして働く点に注意すること。
 *      // https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler
 */
class Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   プロパティ参照や関数実行に介入したいオブジェクト。
     */
    constructor(target) {

        this._proxy_target = target;
        return new Proxy(target, this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。普通にやるとターゲットをクローンすることになるので…
     */
    copy() {

        var target = this._proxy_target.copy();

        return new this.constructor(target);
    }

    clone() {

        // やることはcopy()と変わらんが、ここがclone()になる。
        var target = this._proxy_target.clone();

        return new this.constructor(target);
    }

    //------------------------------------------------------------------------------------------------------
    // ハンドラメソッドの実装。thisは普段、Proxyオブジェクトとして自身を指しているが、これらの中ではthisはハンドラとしての自身を指している。

    /**
     * プロパティが参照されるときに...
     */
    get(target, prop, receiver) {

        // 指定されたプロパティがプロトタイプにあるならそれを、ないなら内包オブジェクトから返す。
        return (prop in this) ? this[prop] : Reflect.get(...arguments);
    }

    has(target, prop) {

        return (prop in this) || Reflect.has(...arguments);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 内包オブジェクトのメソッドを呼びたいときのユーティリティメソッド。
     *
     * @param       呼びたいメソッドの名前
     * @param...    メソッドに渡す引数リスト
     * @return      メソッドが返した値
     */
    reflect(method, ...args) {

        return Reflect.apply(this._proxy_target[method], this, args);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * Interceptor を入れ子にする場合は注意が必要になる。ファイル冒頭の例から...
     *
     *      class MyInterceptor2 extends Interceptor {
     *
     *          func() {
     *              console.log("this is MyInterceptor2::func()");
     *              this.reflect("func");
     *          }
     *      }
     *
     *      var m2 = new MyInterceptor2(m);
     *      m2.func();
     *      // 次のような無限ループになる。
     *      //      this is MyInterceptor2::func()
     *      //      this is MyInterceptor::func()
     *      //      this is MyInterceptor::func()
     *      //      this is MyInterceptor::func()
     *      //      ...
     *      //      エラー Maximum call stack size exceeded
     *
     * これは、MyInterceptor::func() のthisがm2を指しているため。内包オブジェクトに転送するときに reflect() を使わなければ良いのだが、
     * 先に述べたような別の問題が発生する。完璧な解はなさそう…
     *
     * ※一応、reflect をこうして...
     *
     *          reflect(receiver, method, ...args) {
     *
     *              if(!receiver)
     *                  receiver = this;
     *
     *              var func = receiver._proxy_target[method].bind(this);
     *              func.receiver = receiver._proxy_target;
     *              return func(...args);
     *          }
     *
     *      派生クラスでreflect呼ぶ時にこうすればいけそうだけど…
     *
     *          class MyInterceptor extends Interceptor {
     *              func() {
     *                  console.log("this is MyInterceptor::func()");
     *                  this.reflect(arguments.callee.receiver, "func");
     *              }
     *          }
     *
     *      面倒くさい…のは良いとしても、そもそも arguments.callee 廃止されてるし(バグ扱いされてるから復活するかもだが…)。
     *      何とか reflect で receiver を取る方法を考るに…コールスタックに任意の値を設定できれば良いのだが、引数以外にそんな方法ないし…
     *      かといって引数使ったらコアオブジェクトのメソッド呼ぶときに影響出来るし…
     *
     * というわけで当面は、「入れ子はない」としてreflectを使うか、冒頭のような問題を認識した上で普通に this._proxy_target.func() にように呼ぶかの
     * 二者択一となる。このメソッドは後者のほう。
     */
    reflectForce(method, ...args) {

        return Reflect.apply(this._proxy_target[method], this._proxy_target, args);
    }
}
