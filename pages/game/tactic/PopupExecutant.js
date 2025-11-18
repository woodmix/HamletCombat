
/**
 * 一枚の画像を親素子領域の中央にポップアップ表示する実行素子。チュートリアルで使用する。
 */
class PopupExecutant extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   表示する画像名。
     */
    _constructor(graph) {
        super._constructor();

        // 指定された画像を表示するように設定。
        this.layer = TacticScene.UI;
        this.behaviors.set(new ImageRenderer(graph));
        this.behaviors.set(new NaturalBody());

        // 真ん中に位置するようにアンカーを設定する。
        var anchor = new PositionAnchor(null);
        this.behaviors.set(anchor);

        // ドラッグ可能、また、タップされたときに tap() が呼ばれるようにする。
        this.behaviors.set( new InteractBehavior() );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * タップされたら消える。
     */
    tap() {
        Acousmato.strikeSound("panel-se");
        this.dropoff();
    }
}
