
/**
 * タイトルロゴを表示するクラス。
 */
class TitleLogo extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        // レイヤーの設定。
        this.layer = TitleScene.LOGO;

        // 中央揃え
        this.behaviors.set( new PositionAnchor(null, 0.5) );

        // レンダラをセット。白着色した影とともに描画する。ただし影の方が前面になる。
        var renderer = new ShadowDropper("title", 10, "white");
        renderer.exchanging = true;
        this.behaviors.set(renderer);
    }
}
