
/**
 * タイトルシーンのユニットの行進を管理する実行素子。
 */
class TitleMarch extends ScalableExecutant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   プレイヤーユニットの行進なら "ally"、敵ユニットの行進なら "foe" を指定する。
     */
    _constructor(union) {
        super._constructor();

        this.union = union;

        // 位置合わせ。
        var pivot = new Point(0.0, 0.5);

        if(union == "ally") {
            pivot.x = 1.0;
            this.scale.x = -1;
        }

        // 位置合わせ。
        var anchor = new PositionAnchor(null, pivot);
        this.behaviors.set(anchor);

        // ついでに、laneLengthプロパティでユニットが移動する距離を保持する。
        anchor.finisher = pile => {
            this.laneLength = pile.width + TitleUnit.SIZE;
            this.laneHeight = Math.floor(pile.height / 2);
        };

        // 一定時間ごとに clicked() が呼ばれるようにする。
        var clock = new ClockBehavior(new Clocker(1000));
        this.behaviors.set(clock);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 一定時間ごとに呼ばれる。
     */
    clocked() {

        // ユニットを一体作成。
        var unit = new TitleUnit(this.union == "ally" ? 0 : 1);

        // ランダムな位置に配置。
        unit.position.x = this.laneLength;
        unit.position.y = Math.randomInt(0, this.laneHeight * (this.union == "ally" ? +1 : -1));
        this.childs.setWith(unit, "unit-");
    }
}
