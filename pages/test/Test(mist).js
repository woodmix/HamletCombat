
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        this.layer = 0;
        this.setBehavior( new FillRenderer("aliceblue") );

        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        Acousmato.playMusic("WhIte");
    }

    //-----------------------------------------------------------------------------------------------------
    test() {

        var mist = new NanaMistant();
        mist.layer = 3;
        mist.position.put(1000);
        mist.generator = new BrushParticle(0, new LineWalker({polator:"easein"}), new MeltBall("darkred", 40));
        mist.clock = Clocker.perMille(new Approx(1, 2));
            mist.clock.multiplier = new Approx(1, 3);
            mist.clock.stopper = 5000;
        mist.duration = new Approx(500, 5000);
        mist.color = ["forestgreen", "darkred", "royalblue"];
        mist.size = new Approx(20, 50);
        mist.field = Rect.byCenter(0, 0, 200, 200);
        mist.emission = {
            angle: new ApproxFloat(Math.PI180, Math.PI180+Math.PI45),
            distance: new Approx(100, 500),
        };
        this.setChild(mist, "mist");
    }

    //-----------------------------------------------------------------------------------------------------
    test2() {

    }
}


function test() {
    EngageScene.currentEngaged.test();
}

function test2() {
}
