/**
 * レンダラのうち、アニメーションを描画するものを収めたファイル。
 */

//==========================================================================================================
/**
 * アニメーションレンダラの基底クラス。
 */
class AnimationRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    constructor() {
        super();

        // メンバ変数。
        //      this.time       経過時間。一周したらリセットされる。
        //      this.animated   アニメーションするかどうか
        //      this.onround    アニメーションが一周したら呼ばれる宿主のメソッド名かコールバック関数。
        //      this.autostop   trueを指定すると、アニメーションが一周したときにアニメーションがストップする。

        // 初期化。
        this.onround = nothing;
        this.animate(true);

        // 経過時間をリセット。
        this.resetAnimation();

        // 現在のタイミングで描画するコマ。
        this.frame = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * アニメーションのON/OFFを行う。
     *
     * @param   ONにするならtrue、OFFにするならfalseを指定する。
     */
    animate(animated) {

        this.animated = animated;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 再生カーソルを最初に戻す。
     */
    resetAnimation() {

        // 経過時間をリセット。
        this.time = 0;

        // 最初のbehave()の代わりに reset() を呼ぶ。
        this.needReset();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。needReset() を呼んだ後、最初にbehave()が呼ばれる代わりに呼ばれる。
     */
    reset(scene) {

        this.frame = this.getCurrentFrame();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 毎フレーム実行される。
     */
    behave(scene) {

        // アニメーションしていないなら何もしない。
        if(!this.animated)  return;

        // 経過時間の管理。
        this.time += scene.delta;

        // 一周したら...
        while(this.totalDuration <= this.time) {

            // 経過時間をリセット。
            this.time -= this.totalDuration;

            // 一周したときの処理をコールする。
            if(typeof this.onround == "string")  this.host[this.onround]();
            else                                 this.onround();

            // 自動停止することになっているなら停止。
            if(this.autostop) {
                this.animate(false);
                this.resetAnimation();
                break;
            }
        }

        // 描画するコマの情報を取得し直す。
        this.frame = this.getCurrentFrame();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 各フレームのdurationの合計を表す。
     */
    get totalDuration() {

        throw new Error("実装して下さい");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在時間におけるコマの情報を返す。
     *
     * @return  コマの情報。キーの構成は派生クラスによるが、imageキーに描画するイメージオブジェクトがセットされている。
     */
    getCurrentFrame() {

        throw new Error("実装して下さい");
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        this.frame.image.drawTo(context, dest);
    }
}


//==========================================================================================================
/**
 * 指定されたコマイメージを、基底の秒数で切り替えていくシンプルなアニメーションレンダラ。
 */
class SimpleAnimator extends AnimationRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   アニメーションが一周する時間(ms)
     * @param   各コマのイメージを配列で指定する。
     *          各要素はAssetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンスとする。
     */
    constructor(duration, frames) {
        super();

        // 与えられたフローを正規化する。
        this.duration = duration / frames.length;

        // コマイメージの配列。
        this.frames = frames.map((frame)=>{
            return Asset.needAs(frame, CanvasImageSource);
        });
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。各フレームのdurationの合計を表す。
     */
    get totalDuration() {

        return this.duration * this.frames.length;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。現在時間におけるコマの情報を返す。
     */
    getCurrentFrame() {

        var index = Math.floor(this.time / this.duration) % this.frames.length;

        return {
            image: this.frames[index],
        };
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画素材などから考えられる自然な描画範囲の大きさを Point で表す。
     * 最初のコマで描画するイメージの大きさとする。
     */
    get naturalSize() {

        var image = this.frames[0];
        return new Point(image.assumedWidth, image.assumedHeight);
    }
}

/**
 * 指定されたイメージアトラスに含まれるすべてのピースを使ってシンプルなアニメーションを行う。
 * SimpleAnimator のイメージ配列をアトラスで一括指定出来るようにしただけのもの。
 */
class AtlasAnimator extends SimpleAnimator {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   アトラス。Assetのキー名か、ImageAtlas インスタンス。
     * @param   アニメーションが一周する時間(ms)
     */
    constructor(atlas, duration) {

        atlas = Asset.needAs(atlas, ImageAtlas);

        super(duration, atlas.getAllPieces());
    }
}


//==========================================================================================================
/**
 * 各コマをそれぞれ設定出来るアニメーションレンダラ。コマ間のフレームの動きの補完も行う。
 * 拡張すればいくらでも便利になりそうではあるが…あまり複雑にするくらいなら外部ツール使うべきと思う。
 */
class CustomAnimator extends AnimationRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   鍵となるコマを列挙した配列(フロー)。各コマは以下のキーを持つ。
     *              image       そのコマで表示する画像。Assetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンス。
     *              duration    この鍵コマを使用する時間長(ms)
     *              offset      表示位置をずらす場合はその量をPointで指定する。
     *              scale       拡大・縮小する場合はその比率をPointで指定する。基準はイメージの大きさではなく宿主のボディである点に留意。
     *              color       コマに着色する場合は効果色をRgbaで指定する。
     *              onnext      コマが終了したら呼ばれる宿主のメソッド名かコールバック関数。
     *
     * 一周して最初のコマに戻るのがフローの基本だが、戻らずにどこかで止めたい場合は duration:Infinity を活用する。
     *      [
     *          {image:"icon_256", duration:500, offset:[  0,   0]},                                    // 最初はこの位置から移動。
     *          {image:"icon_256", duration:500, offset:[100,   0], onnext:()=>console.log('fin')},     // この位置から次のコマに移動。終わったら "fin" と出力。
     *          {image:"icon_256", duration:Infinity, offset:[100, 100]},                               // duration:Infinity として [100, 100] の位置から動かないようにする。
     *      ]
     */
    constructor(flow) {
        super();

        // 与えられたフローを正規化する。
        this.flow = flow.map((frame, index) => {

            if(!frame.image)  throw new Error(`第${index}要素: imageの指定がないよ`);

            return {
                image: Asset.needAs(frame.image, CanvasImageSource),
                duration: frame.duration,
                offset: (frame.offset == undefined) ? Point.ZERO : new Point(frame.offset),
                scale: (frame.scale == undefined) ? Point.ONE : new Point(frame.scale),
                color: frame.color ? new Rgba(frame.color) : null,
                onnext: frame.onnext || nothing,
            };
        });

        // 初期化。
        this.resetAnimation();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。再生カーソルを最初に戻す。
     */
    resetAnimation() {

        // 基底クラスのコンストラクタからも呼ばれるけど、早すぎる…
        if(!this.flow)  return;

        super.resetAnimation();

        // 現在のコマカーソルと、現在コマの残り時間。
        this.frameCursor = 0;
        this.frameRemain = this.flow[0].duration;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。needReset() を呼んだ後、最初にbehave()が呼ばれる代わりに呼ばれる。
     */
    behave(scene) {

        // アニメーションしていないなら何もしない。
        if(!this.animated)  return;

        // 現在コマの残り時間を減算。
        this.frameRemain -= scene.delta;

        // カーソルが指しているコマが終了している場合は...
        while(this.frameRemain < 0) {

            // カーソルが指しているコマの終了ハンドラを取得。
            var onnext = this.flow[this.frameCursor].onnext;

            // ハンドラをコール。
            if(typeof onnext == "string")  this.host[onnext]();
            else                           onnext();

            // カーソルに次のコマを指させる。
            if(this.flow.length <= ++this.frameCursor)  this.frameCursor = 0;
            this.frameRemain += this.flow[this.frameCursor].duration;

            // autostop が有効で最初のコマに戻る場合はこれ以上処理しない。細かい数値合わせは後続の処理で行われる。
            if(this.autostop  &&  this.frameCursor == 0)  break;
        }

        // 基底の処理を呼んで、onround と autostop、コマ情報の更新を行わせる。
        super.behave(scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。各フレームのdurationの合計を表す。
     */
    get totalDuration() {

        // 一度の計算で済むようにする。
        if(this._totalDuration == undefined)
            this._totalDuration = this.flow.reduce( (previous, frame) => previous + frame.duration, 0 );

        return this._totalDuration;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在時間におけるコマの情報を返す。
     */
    getCurrentFrame() {

        // 現在時間を間に含む両側の鍵コマを取得。
        var current = this.flow[this.frameCursor];
        var next = this.flow[this.frameCursor + 1] || this.flow[0];

        // 鍵コマ間の経過率を取得。
        var progression = 1.0 - (this.frameRemain == Infinity ? 1.0 : this.frameRemain / current.duration);

        // offset, scale を補完して戻り値を作成。
        var result = {
            image: current.image,
            offset: current.offset.lerp(next.offset, progression),
            scale: current.scale.lerp(next.scale, progression),
        };

        // 着色が必要な場合はここで処理しておく。
        if(current.color || next.color) {
            var color = Rgba.lerp(current.color, next.color, progression);
            result.image = this.colorizeImage(result.image, color);
        }

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画先の領域を取得する。
     */
    getDest(scene) {

        var dest = super.getDest(scene);

        // コマ情報の offset, scale の反映を行う。
        return dest.multi(this.frame.scale).add(this.frame.offset);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたイメージを、指定された色で着色したイメージを作成する。
     *
     * @param   元になるイメージ。
     * @param   着色するRgba。
     * @return  着色後のイメージ。
     */
    colorizeImage(image, color) {

        // 内部キャンバスをまだ作成していないなら作成。
        if(!this.canvas) {
            this.canvas = document.createElement("canvas");
            this.context = this.canvas.getContext("2d");
        }

        // 元イメージのサイズを取得。
        var size = new Point(image.naturalWidth, image.naturalHeight);

        // 内部キャンバスのサイズがイメージサイズと合っていなかったら合わせる。
        if(this.canvas.width != size.x  || this.canvas.height != size.y) {
            this.canvas.width =  size.x;
            this.canvas.height = size.y;

        // 合っている場合はリサイズする必要は無いが、代わりにリセットが必要になる。
        }else {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 元イメージを描画。
        image.drawTo(this.context, [0, 0], new Rect(0, size));

        // 全面を指定の色で塗りつぶす。
        this.context.globalCompositeOperation = "source-atop";
        this.context.fillStyle = color.style;
        this.context.fillRect(0, 0, size.x, size.y);
        this.context.globalCompositeOperation = "source-over";

        // 出来上がり。
        return this.canvas;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画素材などから考えられる自然な描画範囲の大きさを Point で表す。
     * 最初のコマで描画するイメージの大きさとする。
     */
    get naturalSize() {

        var image = this.flow[0].image;
        return new Point(image.assumedWidth, image.assumedHeight);
    }
}
