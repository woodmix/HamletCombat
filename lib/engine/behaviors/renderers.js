/**
 * Executantの描画を行うビヘイバー(レンダラ)を収めたファイル。
 */

//==========================================================================================================
/**
 * レンダラクラスの基底。
 */
class Renderer extends Behavior {

    //------------------------------------------------------------------------------------------------------
    /**
     * 描画を実行する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    render(context, scene) {

        // 基底では getDest() で得られる領域を...
        var dest = this.getDest(scene);

        // paint() で描画する。
        if(dest)  this.paint(context, dest, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 描画先の領域を取得する。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     * @return  描画先の領域を表す Rect。不明な場合は null。
     */
    getDest(scene) {

        // 基底では宿主のボディ領域を使う
        return this.host.behaviors.need("body", NaturalBody).getRect();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された領域に対して描画する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先の領域を表す Rect。
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    paint(context, dest, scene) {

        // 基底としては黒い矩形で塗りつぶす。fillRect() はクリップが効かないので使わない。
        context.beginPath();
        context.rect(dest.left, dest.top, dest.width, dest.height);
        context.fillStyle = "black";
        context.fill();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 描画素材などから考えられる自然な描画範囲の大きさを Point で表す。
     * ボディの大きさが自主的に定められることのない NaturalBody などによって参照される。
     */
    get naturalSize() {

        // 基底では根拠のない値を返すので、描画素材を持っているレンダラではそのサイズなどを返すと良いだろう。
        return new Point(100, 100);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ビヘイバーのデフォルト名を定義する。
     */
    get defaultKeyName() {
        return "renderer";
    }
}


//==========================================================================================================
/**
 * 宿主のボディビヘイバが返す領域を指定されたスタイルで塗りつぶすレンダラ。
 */
class FillRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   塗りつぶしに使うスタイル。CanvasRenderingContext2D.fillStyle にセットできる値。
     */
    constructor(style) {
        super();

        this.style = style || "green";
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // fillRect() はクリップが効かないので使わない。
        context.beginPath();
        context.rect(dest.left, dest.top, dest.width, dest.height);
        context.closePath();
        context.fillStyle = this.style;
        context.fill();
    }
}


//==========================================================================================================
/**
 * 宿主のボディビヘイバが返す領域を指定された線形グラデーションで塗りつぶすレンダラ。
 * ボディ矩形を元にグラデーションの形を決める。ボディ矩形に依りたくない場合は、普通にグラデーションを作成して
 * FillRenderer を使うと良いだろう。
 */
class GradientRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   [0, 0] を起点とした場合の、グラデーション方向の向きと長さを決める終端をPointで表す。
     *          たとえば [1, 1] を指定すると、宿主のボディ領域の左上から右下方向になるし、[0, 1] を指定すると上から下方向になる。
     *          また、[0.5, 0.5] と指定すると左上から中央までが色変化の対象となる。
     * @param   グラデーションの色ノードを、オフセット⇒色⇒オフセット⇒色⇒... の順で指定した配列。
     *          例えば、赤⇒青⇒緑 と変化するなら [0.0, "red", 0.5, "blue", 1.0, "green"] となる。
     */
    constructor(end, stops) {
        super();

        this.end = new Point(end);
        this.stops = stops;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // グラデーション方向と長さを決める矩形を取得する。
        var gradrect = dest.clone();
        gradrect.size.multiInto(this.end);

        // グラデーションを作成。
        var grad = context.createLinearGradient(gradrect.left, gradrect.top, gradrect.right, gradrect.bottom);

        // 指定された色ノードを追加する。
        for(var i = 0 ; i < this.stops.length ; i += 2)
            grad.addColorStop(this.stops[i], this.stops[i+1]);

        // 描画。fillRect() はクリップが効かないので使わない。
        context.beginPath();
        context.rect(dest.left, dest.top, dest.width, dest.height);
        context.fillStyle = grad;
        context.fill();
    }
}


//==========================================================================================================
/**
 * 宿主のボディビヘイバが返す領域にゲージを描画するレンダラ。
 */
class GaugeRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   メーターの塗りつぶしに使うスタイル。CanvasRenderingContext2D.fillStyle にセットできる値。
     * @param   同じく、背景の塗りつぶしに使うスタイル。
     */
    constructor(meterStyle, backStyle) {
        super();

        this.meterStyle = meterStyle || "royalblue";
        this.backStyle = backStyle || "black";

        // 最大値と現在値。
        this.current = 1;
        this.max = 1;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * メータの長さ小数で表す。0.0 で空、1.0 で最大。
     */
    get fillrate() {
        return this.current / this.max;
    }
    set fillrate(val) {
        this.current = this.max * val;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 最大値と現在値を設定する。
     *
     * @param   最大値
     * @param   現在値
     */
    setMeter(current, max) {

        this.current = current;
        this.max = max;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // メーターの長さを求める。
        var length = Math.floor(dest.width * this.fillrate);

        // まず背景を描画。
        context.beginPath();
        context.rect(dest.left, dest.top, dest.width, dest.height);
        context.closePath();
        context.fillStyle = this.backStyle;
        context.fill();

        // 次にメーターを描画。
        context.beginPath();
        context.rect(dest.left, dest.top, length, dest.height);
        context.closePath();
        context.fillStyle = this.meterStyle;
        context.fill();

        // fillRect() はクリップが効かないので使わない。
    }
}


//==========================================================================================================
/**
 * 同じシーンに属する別の実行素子(とその子供)の描画領域を、宿主の領域に再描画するレンダラ。
 * この処理は設定次第では無限ループすることになるので、再描画対象に自身が含まれないように注意する必要がある。
 * クリッピングは行わないので指定した領域の外も再描画される。クリッピングも必要な場合は ClippedDecaler のほうを使用されたい。
 */
class DecalRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   再描画してもらう実行素子。
     * @param   その素子の再描画対象となる領域(Rect)。対象素子のボディ全体とするならば省略出来る。
     *          このクラスではクリッピングを行わないので領域外も再描画される。
     * @param   再描画対象となるレイヤー。複数ある場合は配列で指定する。対象素子とその子供のレイヤーすべてを再描画する場合は省略出来る。
     */
    constructor(target, source, layers) {
        super();

        // 対象レイヤーが単一の数値で指定されている場合は配列に統一する。
        if( layers != undefined  &&  !(layers instanceof Array) )
            layers = [layers];

        this.target = target;
        this.source = source;
        this.layers = layers;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // 対象領域が省略されている場合は対象素子のボディ全体とする。
        var source = this.source ? this.source.clone() : this.target.behaviors.get("body").getRect();

        // 現在の描画指図矩形をバックアップして、指定された矩形に変更する。
        // これは、再描画素子がカメラに映っている領域全体に描画するような素子で、再描画対象矩形がキャンバスの外になっているようなケースで必要になる。
        var sight = scene.drawingSight;
        scene.drawingSight = this.target.globalCoord(source);

        // 描画対象矩形を対象素子の親の座標系で取得する。
        source = this.target.parentCoord(source);

        // 転写元に対する転写先のサイズ比を取得。
        var zoom = dest.size.divide(source.size);

        // 対象素子はその親の座標系で描画処理を行うことに留意しながら、転写元領域をうまく転写先領域に一致させるためのスライド距離を取得。
        var offset = dest.lt.divide(zoom).sub(source.lt);

        // 座標系を調整して転写領域を一致させる。
        context.save();
        context.scale(zoom.x, zoom.y);
        context.translate(offset.x, offset.y);

        // 対象素子を転写。
        this.target.drawLayers(context, scene, this.layers);

        // 座標系を元に戻す。スケールは逆数適用で戻したいのだが、実際やってみるとわずかに描画ずれが起きる…
        context.restore();

        // 描画指図矩形を元に戻す。
        scene.drawingSight = sight;
    }
}

/**
 * DecalRenderer にクリッピング処理を追加したもの。
 */
class ClippedDecaler extends DecalRenderer {

    paint(context, dest, scene) {

        context.save();

        // 転写先の領域をクリップ。
        context.beginPath();
        context.rect(dest.left, dest.top, dest.width, dest.height);
        context.clip();

        // 後は基底の処理を行ってから、クリップを解除する。
        super.paint(context, dest, scene);
        context.restore();
    }
}


//==========================================================================================================
/**
 * 複数のレンダラを使って描画するレンダラ。少数の簡単なレンダラを一つの素子で扱うことを意図している。あまり複雑な
 * レンダラの組み合わせが必要な場合は素子とレイヤーを分けて管理した方が良いだろう。
 *
 * 今のところ、アップデートフェーズやアフターフェーズで処理が必要なレンダラには対応していない。まあ対応は簡単なんですが。
 */
class MultipleRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param...    使用するレンダラ。
     */
    constructor(...coops) {
        super();

        this.coops = coops;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * イベント各種オーバーライド。
     */

    attached(host) {
        super.attached(host);

        for(var coop of this.coops)
            coop.attached(host);
    }

    behave(scene) {
        super.behave(scene);

        for(var coop of this.coops)
            coop.behave(scene);
    }

    stay(scene) {
        super.stay(scene);

        for(var coop of this.coops)
            coop.stay(scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画を実行する。
     */
    render(context, scene) {

        for(var coop of this.coops)
            coop.render(context, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画素材などから考えられる自然な描画範囲の大きさを Point で表す。
     */
    get naturalSize() {

        return this.coops[0].naturalSize;
    }
}
