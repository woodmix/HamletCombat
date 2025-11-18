/**
 * 個別の手法でベールイン・ベールアウトを行う実行素子を収める。レイヤーを手動で与える必要がある。
 * デフォルトでは親素子全体を覆うようにボディアンカーが設定される。
 */

//==========================================================================================================
/**
 * 基底のクラス
 */
class VeilExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   塗りつぶしを行うレンダラか、FillRenderer を使うなら塗りつぶしのスタイル(CanvasRenderingContext2D.fillStyle にセットできる値)。
     * @param   イン・アウトにかかる時間(ms)。
     */
    _constructor(renderer, duration) {
        super._constructor();

        // ベールイン・ベールアウトが完了したときに呼び出される親素子のメソッド名かコールバック関数。
        this.onfinish = nothing;

        // デフォルトとして親素子全体を覆うようにボディアンカーを設定する。
        this.anchor = new StretchAnchor(null, {"left":0, "top":0, "right":0, "bottom":0});
        this.behaviors.set(this.anchor);

        // 塗りつぶしを行うレンダラを正規化。
        if( !(renderer instanceof Renderer) )  renderer = new FillRenderer(renderer);

        // この素子で使う実際のレンダラを作成。
        this.renderer = this.createRenderer(renderer);
        this.behaviors.set(this.renderer);

        // 経過時間の管理を行うビヘイバーを作成。フレームごとにこのクラスの tictoc() が、終了時に finished() が呼ばれるようにする。
        var controller = new TictocBehavior(duration);
        controller.onfinish = "finished";
        this.behaviors.set(controller);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子で使うレンダラを作成する。
     *
     * @param   コンストラクタで指定されたレンダラ。
     */
    createRenderer(renderer) {

        return renderer;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 毎フレーム実行される。
     */
    tictoc(progress, scene) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 終了時に呼ばれる。
     */
    finished() {

        // onfinish で指定されているコールバックをコール。
        if(typeof this.onfinish == "string")  this.parent[this.onfinish](this);
        else                                  this.onfinish(this);
    }
}


//==========================================================================================================
/**
 * 単純なアルファ処理でベールイン・ベールアウトを行う実行素子。
 */
class AlphaVeilant extends VeilExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   ベールインかベールアウトかを "in", "out" のいずれかで指定する。
     *          ベールインは「ベールが段々濃くなる」、ベールアウトは「ベールが段々薄くなる」という意味なので注意。
     * @param   塗りつぶしを行うレンダラか、FillRenderer を使うなら塗りつぶしのスタイル(CanvasRenderingContext2D.fillStyle にセットできる値)。
     * @param   イン・アウトにかかる時間(ms)。
     */
    _constructor(direction, renderer, duration) {
        super._constructor(renderer, duration);

        this.direction = direction;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。この素子で使うレンダラを作成する。
     */
    createRenderer(renderer) {

        return new AlphaRenderer(renderer);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。毎フレーム実行される。
     */
    tictoc(progress, scene) {

        if(this.direction == "out")  progress = 1.0 - progress;

        this.renderer.alpha = progress;
    }
}


//==========================================================================================================
/**
 * 自身のポジションを中心とした円にクリッピングを設定してベールイン・ベールアウトを行う実行素子。
 */
class CircleVeilant extends VeilExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画種別。以下のいずれか。
     *              circle-in   塗りつぶしの円を拡大してベールインを行う
     *              circle-out  塗りつぶしの円を縮小してベールアウトを行う
     *              cover-in    円の外側を塗りつぶして、円を縮小していくことでベールインを行う
     *              cover-out   円の外側を塗りつぶして、円を拡大していくことでベールアウトを行う
     * @param   塗りつぶしを行うレンダラか、FillRenderer を使うなら塗りつぶしのスタイル(CanvasRenderingContext2D.fillStyle にセットできる値)。
     * @param   イン・アウトにかかる時間(ms)。
     */
    _constructor(type, renderer, duration) {

        this.type = type;

        super._constructor(renderer, duration);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。この素子で使うレンダラを作成する。
     */
    createRenderer(renderer) {

        renderer = new CircleClipper(renderer);
        renderer.outside = this.type.startsWith("cover-");

        return renderer;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。毎フレーム実行される。
     */
    tictoc(progress, scene) {

        // 円が縮小していくパターンの場合は進捗率を反転する。
        if(this.type == "circle-out" || this.type == "cover-in")
            progress = 1.0 - progress;

        // ボディ領域を取得。
        var body = this.behaviors.get("body").getRect();

        // 最も遠いボディ端までの距離を取得。
        var farthest = Math.max( body.lt.distance, body.rt.distance, body.rb.distance, body.lb.distance );

        // 指定の時間が経過したときに、その距離を覆えるようにクリップ半径を操作する。
        this.renderer.circle.radius = farthest * progress;
    }
}
