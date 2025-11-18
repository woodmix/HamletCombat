
/**
 * 環境イベントも処理するシーン。InteractSceneから派生する。不可視になったときのBGM自動停止や、可視状態に復帰したときの処理などを行う。
 *
 * 基底クラスでは this.playing フラグによる「プレイ中／停止中」の2状態しかなかったが、このクラスによって「システムポーズ中」という新たな状態が間に入る。
 * システムポーズは、ウィンドウの非アクティブ化などによるシステム面を理由とするポーズ状態であり、ゲーム中にユーザ操作によって行うポーズとは異なる。
 *
 * documentにイベントリスナを登録するので、シーン処理が終わったときにオブジェクトを破棄したいなら disengageWindow() する必要がある。
 */
class EngageScene extends InteractScene {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     * @param   コンストラクタでエンゲージ処理も行うかどうか。
     */
    _constructor(canvas, engaging = true) {

        // 取り扱うイベントのリスナのthisをバインドしたものを作成。
        this.visibilityListener = this.visibilityChanged.bind(this);

        // ここまで来れば基底処理を適用出来る。
        super._constructor(canvas);

        // ウィンドウイベントを処理中かどうか。
        this.engaged = false;

        // システムポーズしているかどうか。
        this.waiting = false;

        // 非アクティブ化によって自動ポーズしているかどうか。
        this.autostopped = false;

        // システムポーズ中の追加描画を行うシーン。nullの場合は追加描画が行われない。
        this.pausingScene = this.makePausingScene();

        // 引数での指定に従ってエンゲージ処理。
        if(engaging)  this.engageWindow();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ウィンドウイベントの処理を開始する。ついでにBGM自動停止なども行うようになる。
     */
    engageWindow() {
        this.engaged = true;

        // addEventListener() は同じ関数を複数回登録しても無視するので、このメソッドが複数回呼ばれても問題ないようになっていることに留意。

        // ウィンドウの可視状態変更を監視する。
        // 本来は可視状態の変更時ではなくて window の blur による非アクティブ化時に行うのだが、フレームを使ってると blur は誤爆する。
        // また、Androidのブラウザではアプリ切り替えでは onblur が発生しない模様。タブ切り替えでは発生するのだが…
        window.addEventListener("visibilitychange", this.visibilityListener);

        // エンゲージしたシーンオブジェクトとして登録しておく。デバッグで現在のシーンを取得したいときに必要になる。
        EngageScene.currentEngages.add(this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ウィンドウのイベント処理を停止する。このオブジェクトを破棄したい場合は呼んでおく必要がある。
     */
    disengageWindow() {
        this.engaged = false;

        window.removeEventListener("visibilitychange", this.visibilityListener);

        // 最後にエンゲージしたシーンが自身なら解除しておく。
        EngageScene.currentEngages.delete(this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在エンゲージしているシーンオブジェクトを表す。
     * 複数エンゲージしている場合は先にエンゲージしたものが返される。
     */
    static get currentEngaged() {

        return EngageScene.currentEngages.values().next().value;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * canvas プロパティへの代入をオーバーライド。
     */
    set canvas(value) {
        super.canvas = value;

        // システムポーズ中のシーンオブジェクトにも反映する。
        if(this.pausingScene)
            this.pausingScene.canvas = value;
    }

    // セッターをオーバーライドしたらゲッターもオーバーライドしないといけないらしい。
    get canvas() {
        return super.canvas;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このシーンオブジェクトを破棄するときの処理を行う。
     */
    dispose() {

        if(this.pausingScene)
            this.pausingScene.dispose();

        this.disengageWindow();
        return super.dispose();
    }


    // システムポーズに関する制御
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 「プレイ」「停止」「システムポーズ」の三状態を統合的に取得出来るようにする。
     * 三状態には次のような違いがある。
     *                          戻り値      進行ループ      音楽
     *      停止中              stopped     OFF             OFF
     *      システムポーズ中    waiting     ON              OFF
     *      プレイ中            playing     ON              ON
     */
    get playstate() {

        if(this.playing)
            return this.waiting ? "waiting" : "playing";

        return "stopped";
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * システムポーズに遷移する。
     * プレイ状態から遷移するパターンと、停止状態から遷移するパターンがある。
     */
    wait() {

        // プレイ状態から遷移する場合はBGMをポーズする。
        if(this.playstate == "playing"  &&  this.engaged)
            Acousmato.pauseMusic();

        this.waiting = true;
        this.autostopped = false;
        super.start();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * スタート・ストップするときにシステムポーズ状態を経由するようにする。
     */
    start() {

        // 停止状態の場合は、まずシステムポーズに遷移。
        if(this.playstate == "stopped")  this.wait();

        // それからプレイ状態に遷移する。
        this.waiting = false;

        // BGM再開。
        if(this.engaged)  Acousmato.continueMusic();
    }

    stop(immediately = false) {

        // プレイ状態の場合は、まずシステムポーズに遷移。
        if(this.playstate == "playing")  this.wait();

        // それから停止状態に遷移する。
        super.stop(immediately);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ウィンドウの可視状態が変化したら呼ばれる。
     */
    visibilityChanged() {

        // 不可視になったとき
        if(document.hidden) {

            // 停止状態でないなら自動ポーズする。
            if(this.playstate != "stopped") {
                this.stop();
                this.autostopped = true;
            }

        // 可視になったとき
        }else {

            // 不可視イベントによって自動ポーズしている場合はこのタイミングで再開する。
            if(this.autostopped)
                this.wait();
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * touchstart()をオーバーライド。
     */
    touchstart(event) {

        // システムポーズしている場合は解除する。
        if(this.playstate == "waiting") {
            this.start();               // ここで音が再開される。「touchstartじゃ駄目なんじゃね？」と思うとこなのだが、再開なら問題ないらしい。
            event.preventDefault();

        // それ以外のタッチスタートは普通に処理する。
        }else {
            return super.touchstart(event);
        }
    }


    // システムポーズ中の動作について
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * frame()をオーバーライド。
     */
    frame(delta = 0) {

        // ポーズ中でないならいつも通り
        if(!this.waiting)  return super.frame(delta);

        // ポーズ中の場合は、時間を進めない形で再描画して...
        super.frame(0);

        // ポーズ中の追加描画が定められているならそちらに時間を渡す。
        if(this.pausingScene)  this.pausingScene.frame(delta);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * システムポーズ中の追加描画を行うシーンを作成する。
     *
     * @return  追加描画を行うGlassSceneオブジェクト。
     */
    makePausingScene() {

        // 基底ではキャンバス全体を半透明黒で覆い、画面の真ん中に "paused" の文字を表示する。

        // とりあえずシーンを作成。
        var scene = new GlassScene(this.canvas);

        // シーン背景として、キャンバス全体を半透明黒で覆うようにする。
        scene.layer = 0;
        scene.behaviors.set( new FillRenderer("rgba(0, 0, 0, 0.5)") );

        // 文字を描画する子実行素子を作成。
        var guide = new Executant();
        scene.childs.set(guide, "guide");

        guide.text = "paused";
        guide.layer = 1;

        guide.behaviors.set( new PositionAnchor() );

        var renderer = new TextRenderer();
        renderer.style = "white";
        renderer.halign = "center";
        renderer.valign = "middle";
        guide.behaviors.set(renderer);

        // 500msごとに点滅するようにする。
        guide.draw = function(context, scene) {

            if( !Math.floor(scene.time/500 % 2) )
                return;
            else
                Object.getPrototypeOf(this).draw.call(this, context, scene);
        };

        return scene;
    }
}

// エンゲージしたシーンオブジェクトを保持しておくセット。
EngageScene.currentEngages = new Set();
