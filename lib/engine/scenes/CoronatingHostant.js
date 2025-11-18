
/**
 * 主にシーン切り替わりなどにおける、次のシーン(セカンダリシーン)をホストする実行素子。
 * 切り替わり時に、前のシーン(プライマリシーン)のフレーム描画を残しつつ、画面の一部を次のシーンにも描画させるようなタイミングで使用する。
 * セカンダリをどのようにプライマリへ描画するか、どんなタイミングでプライマリ権を引き渡すのかは派生クラスで制御する。
 */
class CoronatingHostant extends Executant {

    // 実装メモ)
    //      セカンダリシーンのホストにおける注意点としては...
    //           1. プライマリの start(), stop() との連動(時間経過の共有)
    //           2. セカンダリが FollowScene だったらキャンバスサイズの連動
    //      加えて、シーン切り替え時には...
    //           3. ウィンドウ可視化イベントの監視やBGM制御の引継
    //      が必要になる。

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   セカンダリシーン。
     */
    _constructor(secondary) {
        super._constructor();

        this.secondary = secondary;

        // セカンダリシーンが EngageScene から派生しているなら一応エンゲージ解除しておく。元々されていなくてもこのコードは問題ないことに留意。
        if(secondary instanceof EngageScene)
            secondary.disengageWindow();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {

        // セカンダリシーンが FollowScene だった場合に備えて、セカンダリシーンの couplingSize プロパティをオーバーライドして、
        // この実行素子が属するシーンのキャンバスサイズと連動するようにする。
        // セカンダリシーンが FollowScene でなくても、呼ばれないだけなので問題ない。
        Object.defineProperty(this.secondary, "couplingSize", {
            configurable:true, enumerable:true,
            get:() => new Point(scene.canvas.clientWidth, scene.canvas.clientHeight),
        });
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。アップデートフェーズごとに呼ばれる。
     */
    update(scene) {

        // プライマリシーンの時間経過をセカンダリに伝える。
        // 普通に考えればセカンダリも start(), stop() して問題なさそうなのだが、プライマリの start(), stop() と連動するのが大変なため
        // こういう形を取っている。
        this.secondary.tick(scene.now);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子が属しているシーンを停止して、プライマリ権(時間の主導やウィンドウ可視化イベントの監視・BGM制御など)を
     * セカンダリシーンに引き継がせる。
     */
    takeoverCrown() {

        // この素子が属しているシーンを停止させる。
        var canvas = this.getScene().dispose();

        // セカンダリにプライマリ性やキャンバスを引き継がせてstart()する。
        this.secondary.engageWindow();
        this.secondary.canvas = canvas;
        this.secondary.start();

        // キャンバスサイズの連動を解除。
        delete this.secondary.couplingSize;
    }
}
