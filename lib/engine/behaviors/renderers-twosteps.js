/**
 * ラッパーレンダラのうち、内部にキャンバスを抱えて事前描画した上でメインのキャンバスに描画するものを収める。
 */

//==========================================================================================================
/**
 * 基底クラス。派生クラスでは paintBefore() か paintAfter() のどちらかをオーバーライドして利用することになるだろう。
 */
class TwostepRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     */
    constructor(substance) {
        super(substance);

        // 内部で事前描画するキャンバスを作成。
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.context.imageSmoothingEnabled = false;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // 内部キャンバスのサイズが描画矩形と合っていなかったら合わせる。
        if(this.canvas.width != dest.width  || this.canvas.height != dest.height) {
            this.canvas.width =  dest.width;
            this.canvas.height = dest.height;

        // 合っている場合はリサイズする必要は無いが、代わりにリセットが必要になる。
        }else {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 描画矩形はメインキャンバスにおける座標を指しているので、内部キャンバスにおける座標に直す。
        var dest2 = new Rect(0, dest.size);

        // 前後に自分の処理を挟みながら、実レンダラの描画を内部キャンバスへ行わせる。
        this.paintBefore(this.context, dest2, scene);
        this.reflectForce("paint", this.context, dest2, scene);
        this.paintAfter(this.context, dest2, scene);

        // 内部キャンバスの内容をメインキャンバスに描く。
        this.mainTransfer(context, dest, scene);
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 実レンダラの描画前に内部キャンバスへの描画を行う。
     *
     * @param   内部キャンバスの描画コンテキスト。
     * @param   描画対象の矩形。左上を[0,0]、サイズを描画サイズ(=内部キャンバスのサイズ)とするRect。
     * @param   メインキャンバスを管理しているシーンオブジェクト
     */
    paintBefore(context, dest, scene) {
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 実レンダラの描画後に内部キャンバスへの描画を行う。
     *
     * @param   内部キャンバスの描画コンテキスト。
     * @param   描画対象の矩形。左上を[0,0]、サイズを描画サイズ(=内部キャンバスのサイズ)とするRect。
     * @param   メインキャンバスを管理しているシーンオブジェクト
     */
    paintAfter(context, dest, scene) {
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 事前描画の整った内部キャンバスの内容を、メインキャンバスに描画する。引数はpaint()と同一になる。
     *
     * @param   メインキャンバスの描画コンテキスト。
     * @param   メインキャンバスへの描画先矩形を表す Rect。
     * @param   メインキャンバスを管理しているシーンオブジェクト
     */
    mainTransfer(context, dest, scene) {

        // 基底としては単純にコピーするのみ。
        this.canvas.drawTo(context, dest);
    }
}


//==========================================================================================================
/**
 * 他のレンダラによる描画に着色を行うレンダラ。
 */
class ColoringRenderer extends TwostepRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   着色する色。CanvasRenderingContext2D.fillStyle に指定出来る値。
     * @param   着色のアルファ(不透明度)の値。0.0-1.0 で指定する。省略時は1.0。
     */
    constructor(substance, color = "black", alpha = 1.0) {
        super(substance);

        this.color = color;
        this.alpha = alpha;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 実レンダラの描画の後で...
     */
    paintAfter(context, dest, scene) {

        // 指定された透明度を適用、描画先の不透明ピクセルのみを対象に...
        context.globalAlpha = this.alpha;
        context.globalCompositeOperation = "source-atop";

        // 全面を指定の色で塗りつぶす。
        context.fillStyle = this.color;
        context.fillRect(dest.left, dest.top, dest.width, dest.height);

        // 透明度と合成操作を元に戻しておく。
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1.0;
    }
}
