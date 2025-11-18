
/**
 * 二次元矩形を表すクラス。
 */
class Rect {

    /**
     * 座標 0 に位置する、サイズ 0 の矩形を表す。
     */
    static get ZERO() {
        return new Rect(0, 0);
    }

    /**
     * 左上-右下が 0,0-1,1 のの矩形を表す。
     */
    static get ONE() {
        return new Rect(0, 1);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * インスタンス作成メソッド。
     */

    /**
     * 左上座標と右下座標で作成する。引数規則は normalizeArgs を参照。
     */
    static byCorner(...args) {

        Rect.normalizeArgs(args);

        return new Rect( args[0], args[1].sub(args[0]) );
    }

    /**
     * 中心座標とサイズで作成する。引数規則は normalizeArgs を参照。
     */
    static byCenter(...args) {

        Rect.normalizeArgs(args);

        return Rect.byRadius( args[0], args[1].divide(2) );
    }

    /**
     * 中心座標と半径で作成する。引数規則は normalizeArgs を参照。
     */
    static byRadius(...args) {

        Rect.normalizeArgs(args);

        var lt = new Point(args[0].x - args[1].x, args[0].y - args[1].y);
        return new Rect(lt, args[1].multi(2));
    }

    /**
     * 原点位置の割合とサイズで作成する。
     * たとえば原点位置0.2、サイズ10で作成した場合、left-top(-2, -2), size(10, 10) の矩形になる(原点が左上から0.2の割合の位置にある)。
     * 引数規則は normalizeArgs を参照。
     */
    static byPivot(...args) {

        Rect.normalizeArgs(args);

        var lt = new Point(args[1].x * -args[0].x, args[1].y * -args[0].y);
        return new Rect(lt, args[1]);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定された関数を、引数にX軸、Y軸を与えて二度実行する。
     *
     * @param   コールバック関数。以下の4つの引数が与えられて二回実行される。
     *              1.  "x" か "y"
     *              2.  "width" か "height"
     *              3.  "left" か "top"
     *              4.  "right" か "bottom"
     *
     * 例)
     *      // left to right = width on x
     *      // top to bottom = height on y
     *      // と出力される。
     *      Rect.forAxis((axis, dimension, head, tail) => {
     *          console.log( `${head} to ${tail} = ${dimension} on ${axis}` );
     *      });
     */
    static forAxis(func) {

        func("x", "width", "left", "right");
        func("y", "height", "top", "bottom");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 矩形を指定する引数の正規化を行い、最初のPointが第一要素、二番目のPointが第二要素に格納されるようにする。
     * publicメソッドとして外部からも呼ばれる。
     * 基本的に第一・第二要素をそれぞれ Point に変換するのみだが、例外として引数が四つ指定されるパターンにも対応する。
     *
     * つまり...
     *
     *      ([1,2], [3,4])              => (new Point(1,2), new Point(3,4))
     *      (1, [3,4])                  => (new Point(1,1), new Point(3,4))
     *      (1, 3)                      => (new Point(1,1), new Point(3,3))
     *      ([1,2], 3)                  => (new Point(1,2), new Point(3,3))
     *      ()                          => (new Point(0,0), new Point(0,0))
     *      (1)                         => (new Point(1,1), new Point(0,0))
     *      (1, 2, 3, 4)                => (new Point(1,2), new Point(3,4))
     *      (new Rect(1, 2, 3, 4))      => (new Point(1,2), new Point(3,4))
     */
    static normalizeArgs(args) {

        if(args.length == 4) {
            args[0] = new Point(args[0], args[1]);
            args[1] = new Point(args[2], args[3]);
            return;
        }

        if(args[0] instanceof Rect) {
            args[1] = args[0].size.clone();
            args[0] = args[0].lt.clone();
            return;
        }

        args[0] = new Point(args[0]);
        args[1] = new Point(args[1]);
    }


    // インスタンスメンバ
    //=====================================================================================================

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に与えられた左上座標とサイズでインスタンスを作成する。引数規則は normalizeArgs を参照。
     */
    constructor(...args) {

        this.lt =   new Point();
        this.size = new Point();

        this.put(...args);
    }

    /**
     * このインスタンスの矩形を、引数に与えられた左上座標とサイズにセットする。引数規則は normalizeArgs を参照。
     */
    put(...args) {

        Rect.normalizeArgs(args);

        this.lt.put(args[0]);
        this.size.put(args[1]);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 四辺の位置を表すプロパティ。代入した場合は他の辺の位置が変わらないようにサイズが調整される。
     */

    get left() {
        return this.lt.x;
    }
    set left(value) {
        this.size.x -= value - this.lt.x;
        this.lt.x = value;
    }

    get top() {
        return this.lt.y;
    }
    set top(value) {
        this.size.y -= value - this.lt.y;
        this.lt.y = value;
    }

    get right() {
        return this.lt.x + this.size.x;
    }
    set right(value) {
        this.size.x = value - this.lt.x;
    }

    get bottom() {
        return this.lt.y + this.size.y;
    }
    set bottom(value) {
        this.size.y = value - this.lt.y;
    }

    /**
     * X軸、Y軸それぞれの中央位置を表すプロパティ。代入した場合は矩形の位置が移動される。
     */

    get center() {
        return this.lt.x + this.size.x/2;
    }
    set center(value) {
        this.lt.x = value - this.size.x/2;
    }

    get middle() {
        return this.lt.y + this.size.y/2;
    }
    set middle(value) {
        this.lt.y = value - this.size.y/2;
    }

    /**
     * 幅・高さを表すプロパティ。代入した場合はサイズを保ったまま矩形の位置が移動される。
     */

    get width() {
        return this.size.x;
    }
    set width(value) {
        this.size.x = value;
    }

    get height() {
        return this.size.y;
    }
    set height(value) {
        this.size.y = value;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 四隅の座標を表すプロパティ。x, y を変更した場合は対角点を固定したままサイズが変更される。
     */

    // 左上
    get leftop() {

        var result = new PointTrapper(this.left, this.top);

        result.ontrap = (val, axis) => {
            this[ axis == "x" ? "left" : "top" ] = val;
        };

        return result;
    }

    // 右上
    get rigtop() {

        var result = new PointTrapper(this.right, this.top);

        result.ontrap = (val, axis) => {
            this[ axis == "x" ? "right" : "top" ] = val;
        };

        return result;
    }

    // 右下
    get rigtom() {

        var result = new PointTrapper(this.right, this.bottom);

        result.ontrap = (val, axis) => {
            this[ axis == "x" ? "right" : "bottom" ] = val;
        };

        return result;
    }

    // 左下
    get leftom() {

        var result = new PointTrapper(this.left, this.bottom);

        result.ontrap = (val, axis) => {
            this[ axis == "x" ? "left" : "bottom" ] = val;
        };

        return result;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * プロパティ lt と同様に、他の角点や中央を表すプロパティ。
     * leftop などとは異なり、x, y を変更した場合はサイズを保ったまま矩形の位置が移動される。
     */

    /**
     * 右上角(right-topの略)
     */
    get rt() {

        var result = new PointTrapper(this.right, this.top);

        result.ontrap = (val, axis) => {
            if(axis == "x")  this.lt.x = val - this.size.x;
            else             this.lt.y = val;
        };

        return result;
    }

    /**
     * 右下角(right-bottomの略)
     */
    get rb() {

        var result = new PointTrapper(this.right, this.bottom);

        result.ontrap = (val, axis) => {
            this.lt[axis] = val - this.size[axis];
        };

        return result;
    }

    /**
     * 左下角(left-bottomの略)
     */
    get lb() {

        var result = new PointTrapper(this.left, this.bottom);

        result.ontrap = (val, axis) => {
            if(axis == "x")  this.lt.x = val;
            else             this.lt.y = val - this.size.y;
        };

        return result;
    }

    /**
     * 中央(center-middleの略)
     */
    get cm() {

        var result = new PointTrapper( this.getPoint(0.5) );

        result.ontrap = (val, axis) => {
            this.lt[axis] = val - this.size[axis]/2;
        };

        return result;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 四則演算。引数規則は normalizeArgs を参照。
     * 加算と減算は、サイズはそのままで矩形の位置だけが移動する。
     * 乗算と除算は、例えば2をかけると、各辺の原点からの距離が2倍になる。自然とサイズも2倍になる。
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

        this.lt.addInto(...args);
        return this;
    }

    subInto(...args) {

        this.lt.subInto(...args);
        return this;
    }

    multiInto(...args) {

        this.lt.multiInto(...args);
        this.size.multiInto(...args);
        return this;
    }

    divideInto(...args) {

        this.lt.divideInto(...args);
        this.size.divideInto(...args);
        return this;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 計算関数各種。このインスタンスが修正されることはなく、常に新しいインスタンスが作成されて結果が示される。
     */

    /**
     * 座標・サイズの小数部分を切り捨てる。
     */
    int() {

        return new Rect( this.lt.int(), this.size.int() );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 調整関数各種。結果はこのインスタンスに反映される。
     */

    /**
     * サイズがマイナスになっている虚状態を解消する。
     */
    normalize() {

        Point.forAxis( (axis) => {
            if(this.size[axis] < 0) {
                this.lt[axis] += this.size[axis];
                this.size[axis] *= -1;
            }
        } );

        return this;
    }

    /**
     * 指定された値だけ矩形の四辺を動かして膨らませたり縮めたりする。
     * 例えば 5 を指定すると、両側が 5 ずつ膨らむため 10 膨らむことになる。縮ませたい場合はマイナスの値を指定する。
     *
     * @param   Point.normalizeArgs() で説明している通り。
     */
    swell(...args) {

        var arg = new Point(...args);
        this.lt.subInto(arg);
        this.size.addInto( arg.multi(2) );
        return this;
    }

    /**
     * swell() と同じだが、絶対量ではなく倍率で指定する。
     * 例えば 2 を指定すると、中心を固定してサイズが倍になる。
     *
     * @param   Point.normalizeArgs() で説明している通り。
     */
    swell2(...args) {

        var rate = new Point(...args);
        return this.swell( rate.sub(1).multi(this.width, this.height).divide(2) );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された座標が矩形の中にあるかどうかを返す。
     */
    inside(point) {

        return (
            this.left <= point.x  &&  point.x < this.right  &&  this.top <= point.y  &&  point.y < this.bottom
        );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された矩形と重複している部分があるかどうかを返す。
     */
    collide(rect) {

        return !(
            rect.right <= this.left  ||  rect.bottom <= this.top  ||  this.right <= rect.left  ||  this.bottom <= rect.top
        );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * この矩形が引数に指定された矩形と等しいかどうかを返す。
     */
    equals(rect) {

        return this.lt.equals(rect.lt)  &&  this.size.equals(rect.size);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 矩形の左上から、引数で指定された比率分、右下に向かった座標を返す。
     * 例)
     *      var rect = new Rect(100, 100, 100, 100);
     *      rect.getPoint(0.0);         // 100, 100
     *      rect.getPoint(0.5);         // 150, 150
     *      rect.getPoint(1.0);         // 200, 200
     *      rect.getPoint(0.5, 0.0);    // 150, 100
     *      rect.getPoint(0.0, 0.5);    // 100, 150
     *
     * @param   比率。引数規則は Point.normalizeArgs(args) で説明している通り。
     * @return  指定された位置を表す Point。
     */
    getPoint(...args) {

        Point.normalizeArgs(args);

        return new Point(this.left + this.width * args[0], this.top + this.height * args[1]);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 矩形内の座標をランダムに選択して返す。
     *
     * @return  矩形内に位置するPoint。座標は実数になっているので、整数で必要ならば戻り値から int() を呼ぶこと。
     */
    random() {

        return this.getPoint( Math.random(), Math.random() );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * この矩形と引数に指定された矩形が重複して構成される矩形を返す。
     * 重複していない場合は虚状態の矩形になる。
     */
    intersect(rect) {

        return Rect.byCorner(
            Math.max(this.left, rect.left), Math.max(this.top, rect.top),
            Math.min(this.right, rect.right), Math.min(this.bottom, rect.bottom)
        );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 座標軸上に引数で指定されたサイズのグリッド升を設定して、この矩形の四隅が位置するグリッドの序数を使って新たな矩形を作成する。
     *
     * 例)
     *      var rect = new Rect(5, 5, 20, 20);  // 右下は [25, 25]
     *      var grided = rect.grid(10);         // 左上[0, 0] 右下[3, 3]
     *
     *      var rect = new Rect(0, 0, 20, 20);  // 右下は [20, 20]
     *      var grided = rect.grid(10);         // 左上[0, 0] 右下[2, 2]
     *
     *      var rect = new Rect(0, 0, 21, 21);  // 右下は [21, 21]
     *      var grided = rect.grid(10);         // 左上[0, 0] 右下[3, 3]
     */
    grid(size) {

        var x = Math.floor(this.left / size);
        var y = Math.floor(this.top / size);
        var r = Math.floor((this.right - 1) / size) + 1;
        var b = Math.floor((this.bottom - 1) / size) + 1;

        return Rect.byCorner(x, y, r, b);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * x, y, w, h の順番で配列に格納された諸元を返す。
     */
    spec() {

        return [this.left, this.top, this.width, this.height];
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 座標を出力する。デバッグ用。
     */
    explain() {

        return `left-top:${this.lt.explain()}, size:${this.size.explain()}, right-bottom:${this.rb.explain()}`;
    }

    //-----------------------------------------------------------------------------------------------------
    toString() {

        return "[object Rect] " + this.explain();
    }
}
