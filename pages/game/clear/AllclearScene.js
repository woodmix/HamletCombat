
/**
 * オールクリア部分のシーンクラス。
 */
class AllclearScene extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     */
    _constructor(canvas) {
        super._constructor(canvas);

        // 素子としては背景を描画する。
        this.layer = 0;
        var renderer = new FillRenderer("yellowgreen");
        this.behaviors.set(renderer);

        // クリアロゴを表示する素子を作成。画面中央に位置するようにする。
        var logo = new AtlasWaver("gameclear-caption", -24);
        logo.layer = AllclearScene.LOGO;
        logo.behaviors.set(new AttractAnchor(null, {"center":0, "middle":0}));
        this.childs.set(logo, "logo");

        // ピースヒヨコを表示する素子を作成。
        var peacer = new AllclearScene_Peacer(logo);
        this.childs.set(peacer, "peacer");

        // スコアを表示する素子を作成。
        var board = new AllclearScene_ScoreBoard(logo);
        this.childs.set(board, "board");

        // タップ出来るようにする。
        this.behaviors.set( new InteractBehavior() );

        // デバッグ素子。
        if(Settings["debug"]) {
            this.childs.set(new DebugInfo(), "debug-info");
            this.childs.set(new DebugGrid(), "debug-grid");
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タップされたら呼ばれる。
     */
    tap(point) {

//         // タップ時SE。
//         Acousmato.strikeEffect("tympani-roll1");
//
//         // BGMを再生してすぐポーズする。モバイル端末ではジェスチャーハンドラの中でないと再生開始できないため。
//         Acousmato.readyMusic("WhIte");

        // インタラクターを外して、もうタップに反応しないようにする。
        this.behaviors.cut("interactor");

        // ブラックアウトする。
        var veil = new AlphaVeilant("in", "black", 2000)
        veil.layer = AllclearScene.VEIL;
        this.childs.set(veil, "veil");

        // ブラックアウトが完了したらタイトルシーンに切り替え。
        veil.onfinish = () => {
            this.accede( canvas => new TitleScene(canvas) );
        };
    }
}

// レイヤー定義。
AllclearScene.LOGO = 1;
AllclearScene.UI = 2;
AllclearScene.VEIL = 9;


//==========================================================================================================
class AllclearScene_ScoreBoard extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param  ロゴを表示する素子。位置合わせの基準となる。
     */
    _constructor(logo) {
        super._constructor();

        this.layer = AllclearScene.UI;

        // 表示するテキストを決定。
        this.text = `terminated: ${TacticScene.score.terminated}\ncontinue: ${TacticScene.score.continue}`;

        // レンダラの設定。
        var renderer = new TextRenderer(64);
        renderer.font = "sans-serif";
        renderer.halign = "center";
        this.behaviors.set(renderer);

        // ロゴの下側、左右中央に位置する。
        this.behaviors.set(new PositionAnchor(logo, [0.5, 1.0], [0, 50]));
    }
}
