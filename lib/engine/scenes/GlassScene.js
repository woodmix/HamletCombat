
/**
 * 実行素子階層のルートとなる「シーン」の基底クラス。ScalableExecutantから派生している。
 * "body" ビヘイバを備え、getRect() でキャンバスに映っている領域を取得できる。
 *
 * シーン関連のクラス継承は次のようになっている。
 *      GlassScene => TimeScene => InteractScene => EngageScene => FollowScene
 *
 * 派生クラスではなくこのクラスのインスタンスを利用するケースとしては、メインのシーン階層からは独立したオフスクリーンキャンバスの運用が考えられる。
 * そのキャンバスをイメージリソースとしてメインから参照したいときなどに利用する。
 * ただ、階層システムやビヘイバイシステムが不要な単純なオフスクリーンキャンバスが必要ならば、独自に生成・準備したほうが良いだろう。
 *
 * 一フレームにおける関数呼び出しマップは以下の通り。子:子実行素子, ビ:ビヘイバー, レ:レンダラー
 *
 *      frame   →  processUpdate   →  activate
 *                                      update
 *                                      ビbehave
 *                                      子processUpdate → ...
 *
 *                  processAfter    →  after
 *                                      ビstay
 *                                      子processAfter → ...
 *
 *                  drawGameFrame   →  makeTribeLayers →  子makeTribeLayers   →  ...
 *                                      drawLayers  →  processDraw →  drawFamily  →  draw    →  レrender
 *                                                                                      子processDraw   →  ...
 */
class GlassScene extends ScalableExecutant {

    // 静的メソッド
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたサイズでオフスクリーンキャンバスを作成するとともに、このクラスのインスタンスも作成して紐付けて返す。
     * 派生クラスで呼ぶと派生クラスのインスタンスになる。
     *
     * @param   幅
     * @param   高さ
     * @return  指定されたサイズのオフスクリーンキャンバスを持つ呼び出し元クラスのインスタンス。
     */
    static create(width, height) {

        // オフスクリーンキャンバスを作成。
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        // このクラスのインスタンスを返す。
        return new this(canvas);
    }


    // インスタンスメソッド
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。nullを指定した場合はオフスクリーンキャンバスが作成される。
     */
    _constructor(canvas) {
        super._constructor()

        // canvas要素を取得。
        this.canvas = canvas  ||  document.createElement("canvas");

        // 前回からの経過時間と積算時間。
        this.delta = 0;
        this.time = 0;

        // ドローフェーズにおいて描画対象となる矩形(描画指図領域)をキャンバス上の座標系で表す。フレームごとに更新される。
        // 普通に考えればキャンバス全体が指図対象だが、DecalRenderer などの一部特殊なケースでは異なる領域となる。
        this.drawingSight = new Rect();

        // ボディビヘイバを備える。
        this.behaviors.set( new GlassSceneBody() );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * カップリングされているキャンバス(描画対象となる <canvas> 要素)を表す。
     * セットするときは <canvas> 要素かそのid値で指定出来る。
     */
    get canvas() {
        return this._canvas;
    }

    set canvas(value) {

        // 空の値が指定された場合。
        if( !value ) {
            this._canvas = null;
            this.context = undefined;
            return;
        }

        // セットされた値が <canvas> 要素ではない場合、そのid値が指定されたものと解釈する。
        if( !(value instanceof HTMLCanvasElement) )
            value = document.getElementById(value);

        this._canvas = value;

        // そのContext2Dを取得。
        this.context = value.getContext("2d");

        // イメージスムージングを無効にする。
        this.context.imageSmoothingEnabled = false;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 1フレーム分の処理と描画を行う。
     *
     * @param   前フレームからの経過時間(ms)。省略した場合は 0、つまり時間を進めずにもう一度フレームを処理する。
     */
    frame(delta = 0) {

        // 経過時間をセット。
        this.delta = delta;
        this.time += delta;

        // アップデートフェーズを実行。dispose() されたら終了する。
        this.processUpdate(this, new Point(NaN));
        if(!this.canvas)  return;

        // 同様に、アフターフェーズ。
        this.processAfter(this);
        if(!this.canvas)  return;

        // 最後にドローフェーズ。
        this.drawGameFrame();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在の状態ですべてのレイヤーを描画する。
     */
    drawGameFrame() {

        // 一応チェック。
        if( !this.canvas ) {
            console.log(`描画対象のキャンバスがありません。(${this.constructor.name})`);
            return;
        }

        // メンバ変数 tribeLayers が未構築なら構築する。
        if(!this.tribeLayers)  this.makeTribeLayers();

        // 描画指図領域を更新。
        this.drawingSight.put(0, 0, this.canvas.width, this.canvas.height);

        // 必要なレイヤーをすべて描画する。
        this.drawLayers(this.context, this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。メンバ変数 tribeLayers を構築する。
     */
    makeTribeLayers() {
        super.makeTribeLayers();

        // 構築した tribeLayers を数値順に並べ替えておく。この処理は drawLayers() でも行われるので必要ないのだが、あらかじめちゃんとならんでおけば sort() も速いかな、と。
        this.tribeLayers = this.tribeLayers.sort( (a,b) => a-b );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このシーンオブジェクトを破棄するときの処理を行う。
     *
     * @return  描画対象としていたキャンバス。
     */
    dispose() {

        // 基底ではキャンバスの解放を行っている。オブジェクトが解放されればこの辺の処理は必要ないのだが、
        // 派生クラスのInteractSceneはこの処理に依存している。
        var canvas = this.canvas;
        this.canvas = null;

        return canvas;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このシーンを破棄して、他のシーンオブジェクトにキャンバスに対する処理を引き継ぐ。
     * 即座に引き継ぐことになるので、シーン切り替えエフェクトとして両者の描画を利用するようなことは出来ない。その場合は CoronatingHostant を使う。
     *
     * @param   次のシーンオブジェクトを作成するためのコールバック。この関数は次の引数・戻り値仕様を満たす必要がある。
     *              @param  このシーンが取り扱っていたキャンバス。
     *              @return 次のシーンオブジェクト。
     */
    accede(creator) {

        // 自身を破棄。キャンバスを取得。
        var canvas = this.dispose();

        // 次のシーンを作成。
        var next = creator(canvas);

        // 必要なら start() させておく。
        if(next instanceof TimeScene)  next.start();
    }
}

//----------------------------------------------------------------------------------------------------------
/**
 * GlassScene でのみ使うボディビヘイバー。キャンバスに映っている領域を表す。
 */
class GlassSceneBody extends BodyBehavior {

    //------------------------------------------------------------------------------------------------------
    /**
     * getRect()を実装。キャンバスに映っている領域を宿主の座標系で返す。
     */
    getRect() {

        var canvas = this.host.canvas;
        if( !canvas )  return Rect.ZERO;

        var camera = new Rect(0, 0, canvas.width, canvas.height);
        return this.host.getCoord(camera).normalize();
    }
}
