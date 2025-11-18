
/**
 * タイトルシーンに表示される一体のユニットを表す実行素子。
 */
class TitleUnit extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   ユニオン種別。0なら黄、1なら黒。
     */
    _constructor(union) {
        super._constructor();

        // レイヤーの設定。
        this.layer = [TitleScene.UNITS_UNDER, TitleScene.UNITS_FRONT].random();

        // ボディの設定。positionが真ん中になるようにする。
        var body = new FreeBody( Rect.byCenter(0, TitleUnit.SIZE) );
        this.behaviors.set(body);

        // ユニット種別を決定。
        var unitclass = Math.randomInt(0, 2);

        // ユニット種別によって移動スピードが決まる。
        this.speed = 200 * (3-unitclass);

        // 上下振動の周波数も決まる。
        var hz = 3 * (3-unitclass);
        var cycle = 1000 / hz;

        // 描画イメージを取得して、上下振動のアニメーションとしてを設定。
        var image = Asset.take("units").piece(union, unitclass);
        var renderer = new CustomAnimator([
            {"image":image, "duration":cycle/2, "offset":[0,  0]},
            {"image":image, "duration":cycle/2, "offset":[0, 20]},
        ]);
        this.behaviors.set(renderer);
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアップデートフェーズで呼ばれる。
     */
    update(scene) {

        // セットされているスピードで移動して...
        this.position.x -= this.speed / 1000 * scene.delta;

        // 画面の外に出たら消去。
        if(this.position.x <= -TitleUnit.SIZE)  this.dropoff();
    }
}

// 描画サイズ。
TitleUnit.SIZE = 256;
