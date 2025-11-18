/**
 * レンダラのうち、他のレンダラを内包して変形させるものを収めたファイル。
 *
 * 普通に考えれば内包レンダラはsubstanceなどのプロパティで持っておくところなのだが、Renderer, Behavior のすべてのメソッドにおいて委譲コードを
 * 書かなくてはいけなくなるので Interceptor を使っている。
 */

//==========================================================================================================
/**
 * 他のレンダラによる描画に半透明処理を行うレンダラ。
 */
class AlphaRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   アルファ(不透明度)の値。0.0-1.0 で指定する。省略時は0.5。
     */
    constructor(substance, alpha = 0.5) {
        super(substance);

        this.alpha = alpha;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // ショートカット。
        if(this.alpha == 0.0)  return;

        // セットされたアルファを適用。
        var nature = context.globalAlpha;
        context.globalAlpha *= this.alpha;

        // 描画。
        this.reflectForce("paint", context, dest, scene);

        // アルファを戻す。
        context.globalAlpha = nature;
    }
}


//==========================================================================================================
/**
 * 他のレンダラによる描画を左右反転・上下反転するレンダラ。
 */
class FlipRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   左右反転なら "flip"、上下反転なら "flop"、両方なら "flip flop" を指定する。
     */
    constructor(substance, dir) {
        super(substance);

        // 指定された反転方向をフラグで保持する。
        dir = dir ? dir.split(" ") : [];
        this.flip = (dir.indexOf("flip") >= 0);
        this.flop = (dir.indexOf("flop") >= 0);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // 軸ごとに、反転するなら-1、そうでないなら+1にセットした Point を得る。
        var scale = new Point(this.flip ? -1 : +1, this.flop ? -1 : +1);

        // canvasコンテキストに反転を反映。
        context.scale(scale.x, scale.y);

        // 描画領域も反転するので相殺しておく。
        dest = dest.multi(scale).normalize();

        // 描画。
        this.reflectForce("paint", context, dest, scene);

        // 反転を戻す。
        context.scale(scale.x, scale.y);
    }
}


//==========================================================================================================
/**
 * 他のレンダラによる描画を回転するレンダラ。
 */
class RotateRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   メンバ変数 pivot の値。
     */
    constructor(substance, pivot = null) {
        super(substance);

        // ピボットの位置。回転中心を描画領域上のどこに合わせるか。
        // 描画領域の倍率で指定する。例えば左端なら0.0、中心なら0.5、右端なら1.0。
        // nullを指定すると宿主の座標系原点を中心とする。
        if(pivot != null  &&  !(pivot instanceof Point) )  pivot = new Point(pivot);
        this.pivot = pivot;

        // 回転角度(ラジアン)。
        this.angle = 0.0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // 回転 0 の場合のショートカット。
        if(this.angle == 0.0) {
            this.reflectForce("paint", context, dest, scene);
            return;
        }

        // ピボットが指定されているなら、先にピボット位置に translate する。
        if(this.pivot) {
            var pivot = dest.getPoint(this.pivot).int();
            context.translate(pivot.x, pivot.y);
            dest = dest.sub(pivot);
        }

        // セットされた回転を適用。
        context.rotate(this.angle);

        // 描画。
        this.reflectForce("paint", context, dest, scene);

        // 回転を戻す。
        context.rotate(-this.angle);

        // translate していたならそれも戻す。
        if(this.pivot)
            context.translate(-pivot.x, -pivot.y);
    }
}


//==========================================================================================================
/**
 * 宿主やその親のscaleをチェックして、反転描画しようとしている場合は反転を解除するレンダラ。
 * テキストなどのように反転すると読めないものを描画する場合に利用する。
 * チェックしているのは実行素子のscaleであって、FlipRendererの有無はチェックしないので注意。
 */
class ReadableRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     */
    constructor(substance) {
        super(substance);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() に干渉する。
     */
    paint(context, dest, scene) {

        // ルートからのscaleの累積を計算して、各軸 -1, 0, +1 のいずれかで取得する。
        var scale = this.host.globalCoord(Rect.ONE).size.sign();

        // canvasコンテキストに反転を反映。
        context.scale(scale.x, scale.y);

        // 描画領域も反転するので相殺しておく。
        dest = dest.multi(scale).normalize();

        // 描画。
        this.reflectForce("paint", context, dest, scene);

        // 反転を戻す。
        context.scale(scale.x, scale.y);
    }
}


//==========================================================================================================
/**
 * 他のレンダラによる描画を点滅させるレンダラ。
 */
class BlinkRenderer extends Interceptor {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   実際の描画を行うレンダラ。
     * @param   1000msあたりの点滅回数。例えば 5 を指定したなら1000msでON/OFFを5セット繰り返すので、ON/OFF一セットの長さは200ms、
     *          ON/OFFそれぞれの長さはその半分の100msとなる。デフォルトは 1。
     */
    constructor(substance, frequency) {
        super(substance);

        this.frequency = frequency || 1;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * render() に干渉する。
     */
    render(context, scene) {

        // ON/OFFそれぞれの一回あたりの長さを求める。
        var interval = 1000 / this.frequency / 2;

        // シーン経過時間をその長さで割った商が奇数か偶数かで決める。
        var visible = Math.floor(scene.time / interval) % 2;

        // 点灯中なら描画。
        if(visible)  this.reflectForce("render", context, scene);
    }
}
