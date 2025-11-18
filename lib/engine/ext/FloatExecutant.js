
/**
 * 自身のボディが対象素子のボディに内包されるように自動位置調整する実行素子。「フロート」と呼称する。
 * 自身のボディが対象ボディよりも大きい場合は、逆に自身が対象を内包するようになる。
 */
class FloatExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   対象素子。省略した場合は親素子。
     */
    _constructor(poleAnt) {
        super._constructor();

        // 対象素子。省略されている場合は activate() で初期化される。
        this.poleAnt = poleAnt;

        // 位置調整するときに、自信のボディを少し膨らませて考えたい場合に指定する。
        this.floatMargin = 0;

        // 位置調整を行うかどうか。一時的にフリーになりたい場合は false にする。
        this.leashed = true;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自身を被スクロール領域と捉えて、引数に指定された距離だけスクロールする。
     *
     * @param   スクロールしたい量。たとえば右に100、下に50動かしたいなら new Point(100, 50) と指定する。
     */
    scroll(vector) {

        this.position.addInto( vector.multi(-1) );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された座標が、対象のボディ中央に位置するようにする。
     *
     * @param   中央に位置させたい座標。省略した場合は自身のボディの中央となる。
     */
    centering(point) {

        // 省略された場合は自身のボディ中央。
        if(point == undefined)
            point = this.behaviors.get("body").getRect().cm;

        // 位置合わせ。
        var pole = this.takeBody(this.poleAnt);
        var diff = pole.cm.sub(point);
        this.position.addInto(diff);
    }

    //------------------------------------------------------------------------------------------------------
   /**
     * オーバーライド。素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {

        // 対象素子が省略されている場合は親素子を使用する。
        if( !this.poleAnt )
            this.poleAnt = this.parent;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアフターフェーズで呼ばれる。
     * フロートが領域外に出てしまわないように position を調整する。
     */
    after(scene) {

        // 位置調整が無効化されている場合は何もしない。
        if( !this.leashed )  return;

        // 対象素子の領域矩形を自身の座標系で取得する。
        var pole = this.takeBody(this.poleAnt);

        // 自身の領域矩形を取得。
        var me = this.behaviors.get("body").getRect().swell(this.floatMargin);

        // X, Y軸ごとに処理する。
        Rect.forAxis((axis, dimension, head, tail) => {

            // 自身のサイズが対象のサイズより大きいか小さいかで調整メソッドを切り替える。
            var method = (pole[dimension] < me[dimension]) ? "repositionOnLeash" : "repositionOnCage";
            this[method](pole, me, axis, dimension, head, tail);
        });
    }

    /**
     * 自身のサイズが対象のサイズより大きい場合のチェックと調整を行う。
     */
    repositionOnLeash(pole, me, axis, dimension, head, tail) {

        // 始端チェック。
        if( pole[head] < me[head] )
            this.position[axis] -= me[head] - pole[head];

        // 終端チェック。
        if( me[tail] < pole[tail] )
            this.position[axis] += pole[tail] - me[tail];
    }

    /**
     * 自身のサイズが対象のサイズより小さい場合のチェックと調整を行う。
     */
    repositionOnCage(pole, me, axis, dimension, head, tail) {

        // 始端チェック。
        if( me[head] < pole[head] )
            this.position[axis] += pole[head] - me[head];

        // 終端チェック。
        if( pole[tail] < me[tail] )
            this.position[axis] -= me[tail] - pole[tail];
    }
}

//==========================================================================================================
/**
 * 自身のサイズが対象のサイズより小さい場合、中央に位置するように固定されたフロート。
 */
class PrimFloat extends FloatExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。自身の幅が対象の幅より小さい場合のチェックと調整を行う。
     */
    repositionOnCage(pole, me, axis, dimension, head, tail) {

        this.position[axis] += pole.cm[axis] - me.cm[axis];
    }
}
