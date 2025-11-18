/**
 * エフェクトを表す実行素子を収める。
 */

//==========================================================================================================
/**
 * 剣の残像
 */
class SwordlagExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;
        this.behaviors.set(new ImageRenderer("swordlag"));

        // 右端中央をピボット、半分サイズで、ブロック左側が原点になるようにオフセットを設定。
        var body = new RevisionBody([0.9, 0.5], 0.5, [-StageBlock.TIPSIZE/2, 0]);
        this.behaviors.set(body);

        // 一定時間で消えるようにする。
        var timer = new TimerBehavior(300, "dropoff")
        this.behaviors.set(timer);
    }
}


//==========================================================================================================
/**
 * 銃火
 */
class GunfireExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // 点滅しながら描画する。
        var renderer = new ImageRenderer("gunfire");
        this.behaviors.set(new BlinkRenderer(renderer, 10));

        // 右端中央をピボット、半分サイズで、ブロック左側が原点になるようにオフセットを設定。
        var body = new RevisionBody([0.9, 0.5], 0.5, [-StageBlock.TIPSIZE/2, 0]);
        this.behaviors.set(body);

        // 一定時間で消えるようにする。
        var timer = new TimerBehavior(200, "dropoff")
        this.behaviors.set(timer);
    }
}


//==========================================================================================================
/**
 * 砲火
 */
class CannonfireExecutant extends Mistant {

    //------------------------------------------------------------------------------------------------------
    /**
     */
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // 表示時間と半径を決定。
        const duration = 1000, radius = 50;

        // パーティクルの雛型を登録。
        var brush = new FadeBall("dimgray", 60);
        this.generator = new BrushParticle(duration, new LineWalker({polator:new EaseinPolator(4)}), brush);

        // 煙玉をセット。45度から90度間隔で4つ。
        for(var angle = Math.PI45 ; angle < Math.PI360 ; angle += Math.PI90) {
            var particle = this.spawn();
            particle.walker.dest = Point.circle(angle).multi(radius).int();
            this.add(particle);
        }
    }

    //------------------------------------------------------------------------------------------------------
   /**
     * オーバーライド。素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {

        // この素子はブロック中央に配置されるため、左側に位置するように修正する。
        this.position.addInto(-StageBlock.TIPSIZE, 0);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレーム毎に呼ばれる。
     */
    update(scene) {
        super.update(scene);

        // すべてのパーティクルが消えたら自身も消える。
        if(this.particles.length == 0)  this.dropoff();
    }
}


//==========================================================================================================
/**
 * 斬撃。
 */
class SlashExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // 単純なアトラスアニメーション。終わったら消えるようにする。
        var ani = new AtlasAnimator("slash", 300);
        ani.onround = "dropoff";
        this.behaviors.set(ani);

        // 中央をピボット、倍サイズで表示。
        this.behaviors.set(new RevisionBody(0.5, 2.0));
    }
}


//==========================================================================================================
/**
 * 弾痕。
 */
class ShoteyeExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // 単純なアトラスアニメーション。終わったら消えるようにする。
        var ani = new AtlasAnimator("shoteye", 50);
        this.behaviors.set(ani);

        // 下辺中央をピボットにして表示。
        this.behaviors.set(new RevisionBody([0.5, 1.0]));

        // 一定時間で消えるようにする。
        var timer = new TimerBehavior(300, "dropoff");
        this.behaviors.set(timer);
    }

    //------------------------------------------------------------------------------------------------------
   /**
     * オーバーライド。素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {

        // この素子はブロック中央に配置されるため、下端に位置するように修正する。
        this.position.addInto(0, StageBlock.TIPSIZE/2);
    }
}


//==========================================================================================================
/**
 * 爆発。
 */
class ExplosionExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // 単純なアトラスアニメーション。終わったら消えるようにする。
        var ani = new AtlasAnimator("explosion", 400);
        ani.onround = "dropoff";
        this.behaviors.set(ani);

        // 中央をピボット、倍サイズで表示。
        this.behaviors.set(new RevisionBody(0.5, 2.0));
    }
}


//==========================================================================================================
/**
 * ユニットが撃破されるときに使用するミスト。positionは呼び出し側で設定する必要がある。
 */
class DeathMist extends NanaMistant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.EFFECT;

        // パーティクルの雛型を登録。
        this.generator = new BrushParticle(3000, new LineWalker({polator:"easein"}), new MeltBall("black", 20));

        // パーティクル発生量をセット。
        this.clock = Clocker.perMille(20);

        // 一定時間で止まるようにする。
        this.clock.stopper = 1000;

        // パーティクルパラメータの設定。
        this.emission = {
            angle: new ApproxFloat(Math.PI180, Math.PI360),
            distance: new Approx(100, 300),
        };
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレーム毎に呼ばれる。
     */
    update(scene) {
        super.update(scene);

        // パーティクルの生成が終わって、すべてのパーティクルが消えたら自身も消える。
        if(!this.clock.active  &&  this.particles.length == 0)
            this.dropoff();
    }
}
