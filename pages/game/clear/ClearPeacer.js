/**
 * オールクリアシーンのピースするヒヨコに関する処理を収める。
 */

//==========================================================================================================
/**
 * ピースサインをするヒヨコを表示する素子。
 */
class AllclearScene_Peacer extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param  ロゴを表示する素子。位置合わせの基準となる。
     */
    _constructor(logo) {
        super._constructor();

        // ヒヨコを表示
        var renderer = new ImageRenderer("gameclear-hiyoko");
        this.behaviors.set(renderer);
        this.layer = AllclearScene.UI;

        // ピースサイン素子をセット。
        var sign = new AllclearScene_PeacerSign();
        this.childs.set(sign, "sign");

        // 十分な横幅を持つときと持たないときのアンカーを作成。
        this.anchors = {

            // 持つとき。ロゴ左側に位置する。
            "large": new AttractAnchor(logo, {
                "right": {"pivot":"left"},
                "middle": {"pivot":"middle"},
            }),

            // 持たないとき。ロゴ上側に位置する。
            "compact": new AttractAnchor(logo, {
                "center": {"pivot":"center"},
                "bottom": {"pivot":"top"},
            }),
        };

        // シーン素子の領域が変化したら sceneSizeChanged() が呼ばれるようにする。
        var sensor = new SensorBehavior();
        sensor.onsense = "sceneSizeChanged";
        this.behaviors.set(sensor);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * シーン素子の領域が変化したら呼ばれる。
     *
     * @param  変化後の領域矩形
     * @param  変化前の領域矩形
     */
    sceneSizeChanged(after, before) {

        var anchor = this.anchors[ (after.width > 720) ? "large" : "compact" ];
        this.behaviors.set(anchor);
    }
}


//==========================================================================================================
/**
 * ヒヨコのピースサインを表示する素子。
 */
class AllclearScene_PeacerSign extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        // ポジションはここ。
        this.position.put(75, 0);

        // ピース画像を一定間隔で点滅させながら表示。
        var renderer = new ImageRenderer("peacesign");
        renderer = new BlinkRenderer(renderer);
        this.behaviors.set(renderer);
        this.layer = AllclearScene.UI;
    }
}
