
/**
 * スケールを拡大・縮小することでリアクションを表現する実行素子。
 * スケールを利用しているので、ビジュアルの中央が原点になっている必要がある。
 */
class BoingExecutant extends ScalableExecutant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        // リアクションとして作用するツイーンを作成。とりあえずX軸に対するもの。

        // 正弦波を早回しして、0.0-1.0 で一周半する補間器を作成。
        var polator = new RunPolator(new SinPolator(), 1.5);

        // その補間器に減衰をかける。
        var polator = new DecayPolator(polator);

        // あとはその出力が1.0のときの幅を -0.3 とし、再生時間を設定してツイーンを作成する。
        this.reactionX = new TweenBehavior("scale.x", -0.3, 300, polator);
        this.reactionX.absolute = true;

        // それをクローンしてY軸版を作成。
        this.reactionY = this.reactionX.clone();
        this.reactionY.target = "scale.y";

        // あと、X軸方向の変化が逆向きになっているバージョンも作成。
        this.reactionR = this.reactionX.clone();
        this.reactionR.distance *= -1;
    }

    //------------------------------------------------------------------------------------------------------
   /**
     * オーバーライド。素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {

        this.initialScale = this.scale.clone();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * リアクションを再生する。最初は縮小して、その後反動して膨れるようなアクション。押下に対する反応などの用途。
     */
    boing() {

        this.scale.put(this.initialScale);
        this.behaviors.set(this.reactionX, "reactorX");
        this.behaviors.set(this.reactionY, "reactorY");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * すこし変えたバージョン。X, Y軸のスケールツイーンを反対方向に適用する。なんかプルプルした感じ。
     */
    boing2() {

        this.scale.put(this.initialScale);
        this.behaviors.set(this.reactionR, "reactorX");
        this.behaviors.set(this.reactionY, "reactorY");
    }
}
