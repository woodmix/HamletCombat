
/**
 * ダメージなどを一時的に表示するNumberExecutant。
 */
class ValuePopper extends NumberExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   表示する数字。null を指定すると "miss" と表示される。
     * @param   複数同時に表示する場合に、重ならないようにするための 0 から始まる連番。
     */
    _constructor(value, sequence = 0) {

        // 基底の初期化。ちょっと小さめに表示する。
        super._constructor("numbers", null, 0.7);

        // レイヤーと表示値の修正。
        this.layer = TacticScene.UI;
        this.value = value;

        // 字間をちょっと詰める。
        this.space = -20;

        // 数値がnullの場合の画像をセット。
        this.missImage = Asset.take("miss");

        // 連番を参照して、y位置をずらして重ならないようにする。1:-50, 2:+50, 3:-100, 4:+100 ... と言った具合。
        var sign = (sequence % 2) ? -1 : +1;
        var y = sign * Math.ceil(sequence / 2) * 50;    //

        // 移動目標座標を決定。x位置は適当にランダムを入れる。
        var dest = new Point(Math.floor(Math.randomSwing(StageBlock.TIPSIZE/2, 0.2)), y);

        // イーズインを入れて直線軌道のムーバーを作成。
        var mover = new WalkMover(new LineWalker({dest:dest, polator:"easein"}), 200);
        this.behaviors.set(mover);

        // 移動が終了したら一定時間停止して削除されるようにする。
        mover.onfinish = ()=>{
            var timer = new TimerBehavior(1000, "dropoff");
            this.behaviors.set(timer);
        }
    }
}
