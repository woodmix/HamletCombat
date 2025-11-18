
/**
 * 戦術シーンの開始冒頭、ステージ番号を表示する素子。
 */
class StageNameplate extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   ステージ番号。
     */
    _constructor(stageNo) {
        super._constructor();

        // 縦方向で画面中央に位置するようにする。
        var anchor = new PositionAnchor(null, [NaN, 0.5]);
        this.behaviors.set(anchor);

        // アンカリングのついでについでにメンバ変数 centerX で横方向中央のX座標を保持する。
        anchor.finisher = (pile) => {
            this.centerX = pile.center;
        };

        // 表示時間をセットするとともに、時間中 tictoc メソッドがコールされるようにする。
        var ticker = new TictocBehavior(2000);
        this.behaviors.set(ticker);

        // 時間が過ぎたら消えるようにする。
        ticker.onfinish = "dropoff";

        // 時間に沿って左から右へ流すときの位置取りを求めるためのユーティリティを作成。
        this.walker = new CoalesceWalker({
            rail: {
                 50: {"type":"line", "dest":[StageNameplate.RADIUS, 0], "polator":"trigin"},
                100: {"type":"line", "dest":[StageNameplate.RADIUS, 0], "polator":"trigout"},
            }
        });

        // この素子のボディを定義。子供素子の位置決めの基準になる。
        var body = new FreeBody( Rect.byCenter(0, [670, 0]) );
        this.behaviors.set(body);

        // 「Stage」という文字を表示する素子を作成。
        var caption = new StageNameplate_Caption();
        this.childs.set(caption, "caption");

        // ステージ番号を表示する素子を作成。
        var number = new StageNameplate_Number(stageNo);
        this.childs.set(number, "number");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * TictocBehaviorによって毎フレームコールされる。
     */
    tictoc(progress, scene) {

        // まだアンカリングが住んでないなら何もしない。
        if(!this.centerX)  return;

        // この時間におけるX位置を取得。ただスタート位置が 0 になっているので、画面中央からの相対距離として適切なスタート位置に補正する。
        var pos = this.walker.walk(progress);
        pos.x -= StageNameplate.RADIUS;

        // X位置セット。
        this.position.x = this.centerX + pos.x;
    }
}

// ステージ番号が流れていく距離の半径。
StageNameplate.RADIUS = 720;


//==========================================================================================================
/**
 * 「Stage」という文字を表示する素子
 */
class StageNameplate_Caption extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.VEIL;

        // レンダラをセット。白着色した影とともに描画する。ただし影の方が前面になる。
        var renderer = new ShadowDropper("stage-caption", 10, "white");
        renderer.exchanging = true;
        this.behaviors.set(renderer);

        // 親素子の左端に合わせる。
        var anchor = new AttractAnchor(null, {"left":0});
        this.behaviors.set(anchor);
    }
}


//==========================================================================================================
/**
 * ステージ番号を表示する素子
 */
class StageNameplate_Number extends NumberExecutant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   ステージ番号。
     */
    _constructor(stageNo) {

        // 自身は白で着色した数字を描画する。
        var whitenGraph = Asset.take("stage-numbers").createSilhouette("white");
        super._constructor(whitenGraph);

        // レイヤーや数値の設定。
        this.layer = TacticScene.VEIL;
        this.value = stageNo;

        // 親素子の右端に合わせる。
        var anchor = new AttractAnchor(null, {"right":0});
        this.behaviors.set(anchor);

        // 影となる描画をセット。
        var shadow = new NumberExecutant("stage-numbers");
        shadow.position.put(10);
        shadow.value = stageNo;
        shadow.layer = this.layer - 1;  // これはまあ…ちゃんと表示されればええんや
        this.childs.set(shadow);
    }
}
