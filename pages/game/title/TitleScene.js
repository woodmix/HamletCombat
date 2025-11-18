
/**
 * タイトル部分のシーンクラス。
 */
class TitleScene extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     */
    _constructor(canvas) {
        super._constructor(canvas);

        // 素子としては背景を描画する。
        this.layer = 0;
        var tips = Asset.take("tips_b_01");
        var renderer = new TileRenderer( tips.piece(1, 1) );
        this.behaviors.set(renderer);

        // ロゴを表示する素子を作成。
        var logo = new TitleLogo();
        this.childs.set(logo, "logo");

        // ユニットの行進を表示する素子。
        this.childs.set(new TitleMarch("foe"), "march-foe");
        this.childs.set(new TitleMarch("ally"), "march-ally");

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

        // インタラクターを外して、もうタップに反応しないようにする。
        this.behaviors.cut("interactor");

        // これが最初のタップになるので、ここでオーディオ再生の有効化を行う。完了したら...
        Acousmato.ready().then(() => {

            // スタートSE
            Acousmato.strikeSound("gamestart-se");

            // ブラックアウトする。
            var veil = new AlphaVeilant("in", "black", 2000)
            veil.layer = TitleScene.VEIL;
            this.childs.set(veil, "veil");

            // ブラックアウトが完了したらスコアをリセットして戦術シーンに切り替え。
            // スコアリセットは周回プレイ時に必要になる。
            veil.onfinish = () => {
                TacticScene.resetScore();
                this.accede( canvas => new TacticScene(canvas, 1) );
            };
        });
    }
}

// レイヤー定義。
TitleScene.UNITS_UNDER = 1;
TitleScene.LOGO = 2;
TitleScene.UNITS_FRONT = 3;
TitleScene.VEIL = 4;
