
/**
 * スケールに関する制御を追加した実行素子。この素子の制御・描画に加えて子孫にも影響する。
 */
class ScalableExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        // この素子のスケール。この素子における座標系に適用される。
        this.scale = Point.ONE;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ドローフェーズの処理に最適化判定を一つ入れる。
     */
    processDraw(layer, context, scene) {

        // スケール 0 ということは見えないということ。
        if(this.scale.x == 0  ||  this.scale.y == 0)  return;

        super.processDraw(layer, context, scene);
    }

    /**
     * ドロー実行部分の前後にスケールの調整が必要になる。
     */
    drawFamily(layer, context, scene) {

        context.save();
        context.scale(this.scale.x, this.scale.y);

        super.drawFamily(layer, context, scene);

        // 逆数適用で戻したいのだが、実際やってみるとわずかに描画ずれが起きる…
        context.restore();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 座標変換で、スケールに関する処理を追加する。
     */
    getCoord(coord) {

        return super.getCoord(coord).divide(this.scale);
    }

    parentCoord(coord) {

        coord = coord.multi(this.scale);
        return super.parentCoord(coord);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * デバッグ用の文字列化でスケールも追加する。
     */
    toString() {

        return super.toString() + `  scale: ${this.scale.explain()}`;
    }
}
