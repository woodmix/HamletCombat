/**
 * 攻撃予測情報表示ウィンドウやそれに含まれる子要素を収める。
 */

//==========================================================================================================
/**
 * 攻撃予測情報表示ウィンドウを表す実行素子。
 */
class PredictPlate extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   素子階層で親となる StageExecutant。
     */
    _constructor(screen) {
        super._constructor();

        this.screen = screen;

        // レイヤーの設定。
        this.layer = TacticScene.UI;

        // ボディを当てておく。幅と高さは固定、下辺中央が原点となるようにする。
        var body = new FreeBody( Rect.byPivot(0.5, 1.0, PredictPlate.WIDTH, PredictPlate.HEIGHT) );
        this.behaviors.set(body);

        // 画面に対して左右中央、下辺から一定距離の場所に位置するようにする。
        var anchor = new PositionAnchor(null, [0.5, 1.0], [0, -TacticScene.PADDING-ScoutPlate.HEIGHT-TacticScene.PADDING]);
        this.behaviors.set(anchor);

        // この素子としてはウィンドウを描画する。
        var renderer = new NineRenderer("window", 2, 2);
        this.behaviors.set(renderer);

        // 各表示欄を作成。
        var texter2 = new PredictPlate_Text();
        this.childs.set(texter2, "texter");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたユニットからユニットへの攻撃予測情報をこのウィンドウを表示する。
     *
     * @param   攻撃側ユニット
     * @param   受け側ユニット
     */
    showPrediction(thrower, catcher) {

        // 既に表示しているのなら何もしない。
        if(this.parent)  return;

        // 攻撃予測情報を計算する。
        var prediction = ActionCommand.calcAttackPrediction(thrower, catcher);

        // 情報を取得。
        this.childs.search("texter").text = "%dダメージ  %.1f%%  %d回".format(prediction.damage*prediction.firecount, prediction.hitrate*100, prediction.firecount);

        // このウィンドウを実行素子階層に追加する。
        if(!this.parent)  this.screen.childs.set(this, "predictor");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * このウィンドウを隠す。
     */
    hide() {

        // 表示していないなら何もしない。
        if(!this.parent)  return;

        this.dropoff("predictor");
    }
}

// ウィンドウの幅・高さ。
PredictPlate.WIDTH = 600;
PredictPlate.HEIGHT = 40;


//==========================================================================================================
/**
 * テキストを表示する実行素子。
 */
class PredictPlate_Text extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor(graph, post) {
        super._constructor();

        // layerは新しいレイヤーを使うほどでもないのでウィンドウと同じ値を使う。この辺は実装に頼っちゃってるね…
        this.layer = TacticScene.UI;

        // テキストレンダラを作成。
        var renderer = new TextRenderer(TacticScene.TEXT_SIZE);
        renderer.halign = "center";
        renderer.valign = "middle";
        this.behaviors.set(renderer);

        // アンカーを作成。
        var anchor = new PositionAnchor(null);
        this.behaviors.set(anchor);
    }
}
