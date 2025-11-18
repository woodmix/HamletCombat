
/**
 * 円を表すクラス。
 */
class Circle {

    //-----------------------------------------------------------------------------------------------------
    static get ZERO() {
        return new Circle(Point.ZERO, 0);
    }
    static get ONE() {
        return new Circle(Point.ZERO, 1);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 中心座標と半径を指定する引数の正規化を行い、中心座標を第0要素、半径を第1要素に格納するようにする。
     * publicメソッドとして外部からも呼ばれる。
     *
     * () =>                (new Point(0, 0), 0)
     * (3) =>               (new Point(0, 0), 3)
     * (1, 2) =>            (new Point(1, 1), 2)
     * (1, 2, 3) =>         (new Point(1, 2), 3)
     */
    static normalizeArgs(args) {

        // Circleが直接指定された場合。
        if(args[0] instanceof Circle) {
            args[1] = args[0].radius;
            args[0] = args[0].center;
            return;
        }

        // 引数3つで指定された場合。
        if(args.length >= 3) {
            args[0] = new Point(args[0], args[1]);
            args[1] = args[2] || 0;
            return;
        }

        // 第一引数のみが指定されている場合は第二引数に移動させる。
        if(args.length == 1) {
            args[1] = args[0];
            args[0] = 0;
        }

        // 第一引数が Point でない場合はPointに変換する。
        if( !(args[0] instanceof Point) )  args[0] = new Point(args[0]);

        // 半径がundefinedなどの場合を 0 に統一する。
        args[1] = args[1] || 0;
    }


    // インスタンスメンバ
    //=====================================================================================================

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に与えられた中心座標と半径でインスタンスを作成する。
     * 引数規則は normalizeArgs を参照。
     */
    constructor(...args) {

        this.center = new Point();
        this.radius = 0;

        this.put(...args);
    }

    /**
     * 引数に与えられた中心座標と半径をセットする。
     * 引数規則は normalizeArgs を参照。
     */
    put(...args) {

        Circle.normalizeArgs(args);

        this.center.put(args[0]);
        this.radius = args[1];
        return this;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 四則演算のうち乗算と除算を定義する。それぞれ単一数を引数に取り、中心座標と半径の両方に作用する。
     * このインスタンスが修正されることはなく、常に新しいインスタンスが作成されて結果が示される。
     */

    multi(...args) {

        return this.clone().multiInto(...args);
    }

    divide(...args) {

        return this.clone().divideInto(...args);
    }

    /**
     * 四則演算のインスタンス変更版。結果はこのインスタンスに反映され、このインスタンスが返される。
     */
    multi(multiplyer) {

        this.center.multiInto(multiplyer);
        this.radius *= multiplyer;
        return this;
    }

    divide(divider) {

        this.center.divideInto(divider);
        this.radius /= divider;
        return this;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 計算関数各種。このインスタンスが修正されることはなく、常に新しいインスタンスが作成されて結果が示される。
     */

    /**
     * 中心座標と半径の小数部分を切り捨てる。
     */
    int() {

        return new Circle( this.center.int(), Math.floor(this.radius) );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定された角度における円周上の座標を返す。
     *
     * @param   角度(ラジアン)
     * @return  円周上の座標(Point)
     */
    rim(angle) {

        return new Point(this.center.x + Math.cos(angle) * radius, this.center.y + Math.sin(angle) * radius);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定されたCircleと等しいかどうかを返す。
     * 引数規則は normalizeArgs を参照。
     */
    equals(...args) {

        Point.normalizeArgs(args);

        return this.center.equals(args[0])  &&  this.radius == args[1];
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 中心座標と半径を出力する。デバッグ用。
     */
    explain() {

        return `c: [${this.center.explain()}] r: ${this.radius}`;
    }

    //-----------------------------------------------------------------------------------------------------
    toString() {

        return "[object Circle] " + this.explain();
    }
}
