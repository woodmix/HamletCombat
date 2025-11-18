
/**
 * ステージクリア時の表示を行う実行素子。
 */
class StageClearScreen extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.VEIL;

        // この素子としては半透明ベールとして画面の塗りつぶしを行う。
        var renderer = new FillRenderer("#000000C0");
        this.behaviors.set(renderer);

        // ボディは画面全体。
        var body = new CanvasBody();
        this.behaviors.set(body);

        // 中央を原点とする。
        var anchor = new PositionAnchor();
        this.behaviors.set(anchor);

        // 少し遅らせてから...
        var timer = new TimerBehavior(200);
        this.behaviors.set(timer);
        timer.onfinish = () => {

            // リボンの表示を行う素子を追加。
            var ribbon = new StageClearScreen_Ribbon();
            this.childs.set(ribbon, "ribbon");

            // 「Clear」のキャプションを行う素子を追加。
            var caption = new StageClearScreen_Caption(ribbon);
            this.childs.set(caption, "caption");
        };
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * リボンやキャプションの登場が終わったら呼ばれる。
     */
    appearFinished() {

        // リボンとキャプションを白くフラッシュさせる。
        this.childs.get("caption").flash();
        this.childs.get("ribbon").flash();

        // キラキラ光るミストを追加。
        var mist = new StageClearScreen_Twinkle();
        this.childs.set(mist, "twinkle");

        // タップされたら tap() が呼ばれるようにする。
        var interactor = new InteractBehavior();
        this.behaviors.set(interactor);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タップされたら呼ばれる。
     */
    tap() {

        // SEを鳴らす。
        Acousmato.strikeSound("gamestart-se");

        // 切り替え開始。
        this.parent.nextStage();

        // 自身は消去。
        this.dropoff();
    }
}


//==========================================================================================================
/**
 * リボンの表示を行う素子。
 */
class StageClearScreen_Ribbon extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.POPUP;

        // レンダラには着色機能を持たせておく。Captionの方で使用する。
        var renderer = new ImageRenderer("stage-clear-ribbon");
        renderer = new ColoringRenderer(renderer, "white", 0.0);
        this.behaviors.set(renderer);
        this.renderer = renderer;
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 白くフラッシュする。
     */
    flash() {

        this.renderer.alpha = 1.0;
        var tween = new TweenBehavior("renderer.alpha", -1.0, 600);
        this.behaviors.set(tween);
    }
}


//==========================================================================================================
/**
 * キャプションの表示を行う素子。
 */
class StageClearScreen_Caption extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   リボンの表示を行う素子。
     */
    _constructor(ribbon) {
        super._constructor();

        this.layer = TacticScene.POPUP;

        // ボディ領域を移動できるようにする。
        this.body = new RevisionBody();
        this.behaviors.set(this.body);

        // キャプション画像を取得。
        var image = Asset.take("stage-clear-caption");

        // クリップ領域を設定。リボンの上辺からマージンを挟んでキャプション全体が入る領域。
        const margin = 40;
        var clip = Rect.byCenter(0, [image.assumedWidth, image.assumedHeight]);
        clip.bottom += margin;

        // レンダラを作成。着色機能を持たせて、上で決定したクリップ領域も反映されるようにする。
        var renderer = new ImageRenderer(image)
        renderer = new ColoringRenderer(renderer, "white", 0.0);
        renderer = new RectClipper(renderer, clip);
        this.behaviors.set(renderer);
        this.renderer = renderer;

        // 素子のY座標はキャプションの最終目標地点とする。
        this.position.y = -Asset.take("stage-clear-ribbon").assumedHeight/2 - margin - image.assumedHeight/2;

        // ボディをそれより下に置いて、トゥイーンで徐々に0地点まで上がってくるようにする。
        this.body.offset.y = image.assumedHeight + margin;
        var tween = new TweenBehavior("body.offset.y", -this.body.offset.y, 4600);
        this.behaviors.set(tween);

        // トゥイーンが終わったらこのメソッドを呼ぶ。
        tween.onfinish = () => {
            this.parent.appearFinished();
        }
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 白くフラッシュする。
     */
    flash() {

        this.renderer.alpha = 1.0;
        var tween = new TweenBehavior("renderer.alpha", -1.0, 600);
        this.behaviors.set(tween);
    }
}


//==========================================================================================================
/**
 * キラキラ光るミスト素子。
 */
class StageClearScreen_Twinkle extends NanaMistant {

    //-----------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = TacticScene.POPUP;
        this.clock = Clocker.perMille(new Approx(2, 4));
        this.clock.multiplier = new Approx(1, 3);
        this.field = Rect.byCenter(0, [900, 400]);

        this.generator = new StageClearScreen_TwinkleParticle();
    }
}

/**
 * そのパーティクル。
 */
class StageClearScreen_TwinkleParticle extends DurationParticle {

    //------------------------------------------------------------------------------------------------------
    constructor() {

        // 持続時間はこれくらい。
        super(400);

        // offsetプロパティを持って、追加時にランダム設定してもらえるようにする。
        this.offset = new Point();

        // 経過時間によるパーティクルサイズの変遷を表す補間器。基本的に 0.0 ⇒ 1.0 ⇒ 0.0 とするのだが、最初の 0.0 ⇒ 0.25 をカットする。
        StageClearScreen_TwinkleParticle.sizer = new class extends PingpongPolator {
            treat(x) {
                x = x * 2.0 * 0.75 + 0.25;
                return super.treat(x);
            }
        };
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このパーティクルを与えられた進行で描画する。
     */
    depict(context, age) {

        // 必要な値を取得。
        const image = Asset.take("twinkle");
        const sizer = StageClearScreen_TwinkleParticle.sizer;

        // 最も大きなサイズを決めておく。
        const peaksize = 150;

        // 現時点でのサイズを取得。
        var size = peaksize * sizer.elicit(age);

        // 描画される領域を取得して、描画。
        var dest = Rect.byCenter(this.offset, size);
        image.drawTo(context, dest);
    }
}
