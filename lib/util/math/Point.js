
/**
 * 二次元座標を表すクラス。
 */
class Point {

    //-----------------------------------------------------------------------------------------------------
    static get ZERO() {
        return new Point(0, 0);
    }
    static get ONE() {
        return new Point(1, 1);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された角度の sin, cos からインスタンスを生成する。
     *
     * @param   角度(ラジアン)。
     * @return  与えられた角度の cos を X、sin を Y とするPoint。
     */
    static circle(angle) {

        return new Point( Math.cos(angle), Math.sin(angle) );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * padnum() の逆の操作を提供する。ただし、x, y の各値は -1, 0, +1 のいずれかになる。
     *
     * @param   方向を表す数値。padnum() の戻り値。
     * @return  数値で示された方向を表すPointインスタンス。つまり次のような対応になる。
     *              0:[-1,-1]  1:[0,-1]  2:[+1,-1]
     *              3:[-1, 0]  4:[0, 0]  5:[+1, 0]
     *              6:[-1,+1]  7:[0,+1]  8:[+1,+1]
     */
    static numpad(number) {

        return new Point(number % 3 - 1, Math.floor(number / 3) - 1);
    }

    /**
     * 文字列で表された方向から padnum() の戻り値を得る。
     *
     * @param   "left", "lower", "upper-right" などの方向を表す文字列。
     * @return  指定された方向を意味する値。padnum() と同様。
     */
    static dirnum(dir) {

        var result = 4;

        for( var direction of dir.split("-") ) {
            switch(direction) {
                case "left":                    result -= 1;    break;
                case "top": case "upper":       result -= 3;    break;
                case "right":                   result += 1;    break;
                case "bottom": case "lower":    result += 3;    break;
            }
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定された関数を、引数にX軸、Y軸を与えて二度実行する。
     *
     * @param   コールバック関数。第一引数に "x" か "y"、第二引数に "width", "height" が与えられて二回実行される。
     *
     * 例)
     *      // width on x
     *      // height on y
     *      // と出力される。
     *      Point.forAxis((axis, dimension) => {
     *          console.log( `${dimension} on ${axis}` );
     *      });
     */
    static forAxis(func) {

        func("x", "width");
        func("y", "height");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 座標を指定する引数の正規化を行い、xを第0要素、yを第1要素に格納するようにする。
     * publicメソッドとして外部からも呼ばれる。
     *
     * (1, 2) =>            (1, 2)
     * (3) =>               (3, 3)
     * (3, null) =>         (3, 3)
     * (new Point(4, 5)) => (4, 5)
     * ([4, 5]) =>          (4, 5)
     * () =>                (0, 0)
     * (null) =>            (0, 0)
     * (null, null) =>      (0, 0)
     */
    static normalizeArgs(args) {

        while(args.length < 2)
            args.push(undefined);

        if(args[0] instanceof Array  ||  args[0] instanceof Point)  [ args[0], args[1] ] = args[0];

        if(args[0] == undefined)  args[0] = 0;
        if(args[1] == undefined)  args[1] = args[0];
    }


    // インスタンスメンバ
    //=====================================================================================================

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に与えられた座標でインスタンスを作成する。
     * 引数規則は normalizeArgs を参照。
     */
    constructor(...args) {

        this.put(...args);
    }

    /**
     * 引数に与えられた座標をセットする。
     * 引数規則は normalizeArgs を参照。
     */
    put(...args) {

        Point.normalizeArgs(args);

        this.x = args[0];
        this.y = args[1];
        return this;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * x, y の順で値を列挙するコレクションとして振る舞うようにする。
     */
    *[Symbol.iterator]() {
        yield this.x;
        yield this.y;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * width, height という名前でも x, y を参照出来るようにする。
     */
    get width()  {return this.x;}
    get height() {return this.y;}
    set width(val)  {this.x = val;}
    set height(val) {this.y = val;}

    //-----------------------------------------------------------------------------------------------------
    /**
     * 四則演算。引数規則は normalizeArgs を参照。
     * このインスタンスが修正されることはなく、常に新しいインスタンスが作成されて結果が示される。
     */
    add(...args) {

        return this.clone().addInto(...args);
    }

    sub(...args) {

        return this.clone().subInto(...args);
    }

    multi(...args) {

        return this.clone().multiInto(...args);
    }

    divide(...args) {

        return this.clone().divideInto(...args);
    }

    /**
     * 四則演算のインスタンス変更版。結果はこのインスタンスに反映され、このインスタンスが返される。
     */
    addInto(...args) {

        Point.normalizeArgs(args);

        this.x += args[0];
        this.y += args[1];
        return this;
    }

    subInto(...args) {

        Point.normalizeArgs(args);

        this.x -= args[0];
        this.y -= args[1];
        return this;
    }

    multiInto(...args) {

        Point.normalizeArgs(args);

        this.x *= args[0];
        this.y *= args[1];
        return this;
    }

    divideInto(...args) {

        Point.normalizeArgs(args);

        this.x /= args[0];
        this.y /= args[1];
        return this;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 計算関数各種。このインスタンスが修正されることはなく、常に新しいインスタンスが作成されて結果が示される。
     */

    /**
     * X, Y 成分の小数部分を切り捨てる。
     */
    int() {

        return new Point( Math.floor(this.x), Math.floor(this.y) );
    }

    /**
     * x, y ともに絶対値とする。
     */
    abs() {

        return new Point( Math.abs(this.x), Math.abs(this.y) );
    }

    /**
     * X, Y 成分をそれぞれ単位化(正なら+1、負なら-1、0なら0に)する。
     */
    sign() {

        return new Point( Math.sign(this.x), Math.sign(this.y) );
    }

    /**
     * この座標を開始点、指定された座標を終了点としたときの、指定された進捗率における座標を返す。
     *
     * @param   終了座標
     * @param   進捗率。0.0 ～ 1.0。
     * @return  指定された進捗率における座標。
     */
    lerp(goal, t) {

        var vector = (new Point(goal)).sub(this);
        return this.add( vector.multi(t) );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 計算から求められるプロパティ各種
     */

    /**
     * 原点からの距離を表す。
     */
    get distance() {

        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    set distance(val) {

        var rate = val / this.distance;
        this.x *= rate;
        this.y *= rate;
    }

    /**
     * 原点からの軸上の距離を足した値を表す。つまり、X軸上での距離とY軸上での距離の和。
     * distance ほど厳密な距離が必要ないならこちらのほうが速い。
     */
    get manhattan() {

        return Math.abs(this.x) + Math.abs(this.y);
    }

    set manhattan(val) {

        var rate = val / this.manhattan;
        this.x *= rate;
        this.y *= rate;
    }

    /**
     * 原点からこのインスタンスが示す座標への角度を表す。
     *
     * @return  角度。(0, 0) の場合は NaN。
     */
    get angle() {

        var angle = Math.atan(this.y / this.x);

        if(this.x < 0)  angle += Math.PI;

        return angle;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * このインスタンスが持つ方向をテンキーの並び順を模した一つの数値で表す。ただし、0スタートだし、上下が逆になっていることに注意。
     * 左上が 0、上が 1、右上が 2 ...つまり次のような並び順になる。
     *      0 1 2
     *      3 4 5
     *      6 7 8
     * 逆の操作は Point.numpad() で出来る。
     */
    padnum() {

        var result = 4;

        result += Math.sign(this.y) * 3;
        result += Math.sign(this.x);

        return result;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定されたPointと等しいかどうかを返す。引数規則は normalizeArgs を参照。
     */
    equals(...args) {

        Point.normalizeArgs(args);

        return this.x == args[0]  &&  this.y == args[1];
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 座標を出力する。デバッグ用。
     */
    explain() {

        return `${this.x}, ${this.y}`;
    }

    //-----------------------------------------------------------------------------------------------------
    toString() {

        return "[object Point] " + this.explain();
    }
}


//==========================================================================================================
/**
 * 変更されたときのコールバックを設定出来る Point。
 */
class PointTrapper extends Point {

    // this.ontrap      変更されたら呼ばれるコールバック。渡される引数は次のようになる。
    //                      変更後の値
    //                      X が変更されたなら "x", Y が変更されたなら "y"
    //                      X が変更されたなら "width", Y が変更されたなら "height"

    //------------------------------------------------------------------------------------------------------
    get x() {
        return this._x;
    }

    set x(val) {

        this._x = val;

        if(this.ontrap)  this.ontrap(val, "x", "width");
    }

    //------------------------------------------------------------------------------------------------------
    get y() {
        return this._y;
    }

    set y(val) {

        this._y = val;

        if(this.ontrap)  this.ontrap(val, "y", "height");
    }
}
