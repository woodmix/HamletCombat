/**
 * レンダラのうち、クリッピングを行った後で他のレンダラに描画させるもの(クリッパー)を収めたファイル。
 */

//==========================================================================================================
/**
 * クリッパーの基底クラス。
 */
class RenderClipper extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   外側をクリッピングするならtrueを指定する。
     */
    constructor(substance, outside = false) {
        super(substance);

        // 内側ではなく外側をクリップするかどうか。
        this.outside = outside;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // クリッピング領域のパスを設定する。
        context.beginPath();
        this.clipPath(context, dest);

        // 外側をクリップする場合は矩形外周のパスも追加。
        if(this.outside)  context.rect(dest.left, dest.top, dest.width, dest.height);

        // クリップを設定。
        context.save();
        context.clip("evenodd");

        // 描画。
        this.reflectForce("paint", context, dest, scene);

        // クリップを解除。
        context.restore();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * クリッピング領域のパスを設定する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先の領域を表す Rect。
     */
    clipPath(context, dest) {

        throw new Error("実装して下さい。");
    }
}


//==========================================================================================================
/**
 * 矩形でクリップを行うクリッパー。
 */
class RectClipper extends RenderClipper {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   クリッピングする矩形を表すRectオブジェクト。
     * @param   外側をクリッピングするならtrueを指定する。
     */
    constructor(substance, rect, outside = false) {
        super(substance, outside);

        // クリップ領域を表すRectインスタンス。
        this.cliprect = rect ? rect.clone() : new Rect();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // 範囲 0 の場合のショートカット。
        if((this.cliprect.width <= 0 || this.cliprect.height <= 0)  &&  !this.outside)  return;

        super.paint(context, dest, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。クリッピング領域のパスを設定する。
     */
    clipPath(context, dest) {

        // 指定されている矩形のパスを作成。
        context.rect(this.cliprect.lt.x, this.cliprect.lt.y, this.cliprect.size.x, this.cliprect.size.y);
    }
}


//==========================================================================================================
/**
 * 円状のクリップを行うクリッパー。
 */
class CircleClipper extends RenderClipper {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   クリッピングする円(Circleオブジェクト)。
     * @param   外側をクリッピングするならtrueを指定する。
     */
    constructor(substance, circle, outside = false) {
        super(substance, outside);

        // クリップ領域を表すCircleインスタンス。
        this.circle = circle ? circle.clone() : new Circle();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // 半径 0 の場合のショートカット。
        if(this.circle.radius == 0  &&  !this.outside)  return;

        super.paint(context, dest, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。クリッピング領域のパスを設定する。
     */
    clipPath(context, dest) {

        // 指定されている円のパスを作成。
        context.arc(this.circle.center.x, this.circle.center.y, this.circle.radius, 0, Math.PI360);
    }
}


//==========================================================================================================
/**
 * 描画矩形の指定した辺から一定範囲をシャットアウトするクリッパー。
 */
class ShutterClipper extends RenderClipper {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   どの辺から内側を排除するか。"left", "top", "right", "bottom" のいずれかで指定する。
     * @param   その辺から何割を非描画領域とするかを 0.0-1.0 で指定する。
     * @param   外側をクリッピングするならtrueを指定する。
     */
    constructor(substance, edge, rate = 0, outside = false) {
        super(substance, outside);

        this.edge = edge;
        this.rate = rate;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。クリッピング領域のパスを設定する。
     */
    clipPath(context, dest) {

        var clip = dest.clone();

        // 指定された辺から、指定された割合を除外した矩形を得る。
        var axis = (this.edge == "left" || this.edge == "right") ? "width" : "height";
        var dir = (this.edge == "left" || this.edge == "top") ? +1 : -1;
        clip[this.edge] += dir * Math.floor(clip[axis] * this.rate);

        // その矩形を表すパスを作成。
        context.rect(clip.left, clip.top, clip.width, clip.height);
    }
}
