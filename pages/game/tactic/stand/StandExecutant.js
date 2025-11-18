
/**
 * ステージ上に配置されているオブジェクト(スタンド)を表す実行素子の基底。具体的には派生クラスで、ユニットやシンボルを表す。
 */
class StandExecutant extends ScalableExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   このオブジェクトが配置されるステージ実行素子。
     * @param   スタンドの情報を表す構造体。基底として必要なのは以下のキーのみ。
     *              pos     所在ブロック位置。Point に変換可能な値で指定する。
     */
    _constructor(stage, data) {
        super._constructor();

        this.layer = TacticScene.SURFACE;

        // 所在ブロックの StageBlock インスタンスを取得して、位置合わせする。
        this.seatblock = stage.map.getBlock(data["pos"]);
        this.position.put(this.seatblock.anchor);

        // ボディの設定。横中央、下端をピボットとし、大きさはブロックより少し大きい程度とする。
        var body = new FreeBody( Rect.byCenter(0, StageBlock.TIPSIZE).add(0, -StageBlock.TIPSIZE/2).multi(1.3).int() );
        this.behaviors.set(body);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 所在しているStageBlockを表す。
     */
    get seatblock() {
        return this._seatblock;
    }
    set seatblock(v) {
        this._seatblock = v;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ステージを表す実行素子。
     */
    get stage() {

        return this.parent;
    }
}
