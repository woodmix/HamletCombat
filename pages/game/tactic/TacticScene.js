
/**
 * 戦術部分のシーンクラス。
 */
class TacticScene extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    /**
     * スコアを初期化・リセットする。
     */
    static resetScore() {

        this.score = {"terminated":0, "continue":0};
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     * @param   ステージ番号。
     */
    _constructor(canvas, stageNo) {
        super._constructor(canvas);

        this.stageNo = stageNo;

        this.layer = 0;
        this.behaviors.set( new FillRenderer("black") );

        // このステージで倒された味方の数。
        this.terminated = 0;

        // ステージ番号表示素子を追加
        this.childs.set(new StageNameplate(stageNo), "nameplate");

        // ステージ素子を作成。
        this.childs.set(new StageExecutant(stageNo), "stage");

        // ガイドテキスト素子を作成。
        this.childs.set(new GuideTexter(), "guide");

        // 情報表示ウィンドウを作成。素子階層への追加は自律的に行われる。
        this.scouter = new ScoutPlate(this);
        this.predictor = new PredictPlate(this);

        // デバッグ素子。
        if(Settings["debug"]) {
            this.childs.set(new DebugInfo(), "debug-info");
        }
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * ガイドテキストを表す。
     * 表示したいテキストを代入する。非表示にしたい場合は null を指定する。
     */
    set guideText(val) {

        this.childs.get("guide").text = val;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * ステージクリア時の処理を行う。
     */
    processGoal() {

        // インスタンス変数に格納してある非撃破数をクラス変数に反映。
        TacticScene.score.terminated += this.terminated;

        // クリア表示を行う素子を作成。
        var screen = new StageClearScreen();
        this.childs.set(screen, "clear");

        // BGM停止。クリアジングル再生
        Acousmato.stopMusic();
        Acousmato.strikeSound("stageclear-se");
    }

    /**
     * 次のステージに切り替える。既にラストステージの場合はオールクリアシーンに切り替える。
     */
    nextStage() {

        // ブラックアウトする。
        var veil = new AlphaVeilant("in", "black", 2000)
        veil.layer = TitleScene.VEIL;
        this.childs.set(veil, "veil");

        // ブラックアウトが完了したら新たなシーンに切り替え。
        veil.onfinish = () => {
            this.accede(canvas => {
                var last = !Asset.take("stages")[ "stage%02d".format(this.stageNo+1) ];
                return last ? new AllclearScene(canvas) : new TacticScene(canvas, this.stageNo+1);
            });
        };
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * ゲームオーバー時の処理を行う。
     */
    processOver() {

        var screen = new GameoverScreen();
        this.childs.set(screen, "over");

        // BGM停止。
        Acousmato.stopMusic();
        Acousmato.strikeSound("gameover-se");
    }

    /**
     * 現在のステージを最初からやり直す。
     */
    restartTactic() {

        // ブラックアウトする。
        var veil = new AlphaVeilant("in", "black", 2000)
        veil.layer = TitleScene.VEIL;
        this.childs.set(veil, "veil");

        // ブラックアウトが完了したら新たなシーンに切り替え。
        veil.onfinish = () => {
            this.accede( canvas => new TacticScene(canvas, this.stageNo) );
        };
    }
}

// レイヤー定義。
TacticScene.GROUND = 1;
// TacticScene.GMMICK = 2;
TacticScene.SURFACE = 3;
TacticScene.MARKER = 4;
TacticScene.EFFECT = 5;
TacticScene.UI = 8;
TacticScene.VEIL = 9;
TacticScene.POPUP = 10;

// 汎用マージン
TacticScene.PADDING = 10;

// 標準文字サイズ
TacticScene.TEXT_SIZE = 32;

// スコア構造体を初期化する。
TacticScene.resetScore();
