
/**
 * 画面上部に表示するガイドテキストを表示する素子。
 */
class GuideTexter extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        // 表示高さ。文字の大きさでもある。
        const HEIGHT = 48;

        // 表示するテキスト。null をセットすると背景も含めて描画を行わない。
        this.text = null;

        // レイヤーの設定。
        this.layer = TacticScene.UI;

        // アンカーの設定。左右と上を画面の各辺に合わせて...
        var anchor = new StretchAnchor(null, {"left":{offset:0}, "right":{offset:0}, "top":{offset:0}});
        this.behaviors.set(anchor);

        // 高さを固定、position を中央上部に合わせる。
        anchor.finisher = function(pile, body) {
            body.rect.height = HEIGHT;
            body.setBasingPivot(0.5, 0.0);
        };

        // デバッグモードだと見えないからさぁ…
        if(Settings["debug"])  anchor.edges.top.offset = 96;

        // テキストレンダラの作成。
        var texter = new TextRenderer(HEIGHT, "white");
        texter.halign = "center";

        // レンダラのセット。文字の下に黒い下地を入れておく。
        this.behaviors.set( new MultipleRenderer(
            new GradientRenderer(new Point(0, 1), [0.0, "#000000CC", 0.5, "#000000CC", 1.0, "#00000033"]),
            texter,
        ) );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ドローフェーズにおいて自分を描画する処理を行う。
     */
    draw(context, scene) {

        // テキストがセットされているときのみ描画する。
        if(this.text)
            super.draw(context, scene);
    }
}
