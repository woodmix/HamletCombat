
/**
 * ゲームオーバー時の表示を行う実行素子。
 */
class GameoverScreen extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.VEIL;

        // この素子としては半透明ベールとして画面の塗りつぶしを行う。
        var renderer = new FillRenderer("#00000070");
        this.behaviors.set(renderer);

        // ボディは画面全体。
        var body = new CanvasBody();
        this.behaviors.set(body);

        // 中央を原点とする。
        var anchor = new PositionAnchor();
        this.behaviors.set(anchor);

        // タップされたら tap() が呼ばれるようにする。
        var interactor = new InteractBehavior();
        this.behaviors.set(interactor);

        // 「GAME OVER」の表示を行う素子。
        var caption = new GameoverScreen_Caption();
        this.childs.set(caption, "caption");

        // 「continue」の表示を行う素子。
        var indicator = new GameoverScreen_Indicator();
        this.childs.set(indicator, "indicator");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タップされたら呼ばれる。
     */
    tap() {

        // コンティニュー回数記録を+1。
        TacticScene.score.continue++;

        // コンティニュー開始。
        this.parent.restartTactic();

        // 自身は消去。
        this.dropoff();
    }
}


//==========================================================================================================
/**
 * 「GAME OVER」の表示を行う素子。
 */
class GameoverScreen_Caption extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.POPUP;
        this.position.y = -70;

        var renderer = new ShadowDropper("gameover-caption", 10, "white");
        renderer.exchanging = true;
        this.behaviors.set(renderer);
    }
}


//==========================================================================================================
/**
 * 「continue」の表示を行う素子。
 */
class GameoverScreen_Indicator extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.POPUP;
        this.position.y = 70;
        this.text = "continue";

        var renderer = new TextRenderer(72, "white");
        renderer.halign = "center";
        renderer.valign = "middle";
        renderer = new BlinkRenderer(renderer, 1);
        this.behaviors.set(renderer);
    }
}
