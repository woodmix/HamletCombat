
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        console.log("asset loaded");

        this.layer = 0;
        this.setBehavior( new FillRenderer("aliceblue") );

        var antA = new TestantA();
        this.setChild(antA, "a");
        this.setChild(new TestantB1(antA), "b1");

        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        Acousmato.playMusic("WhIte");
    }
}


function test() {
    EngageScene.currentEngaged.test();
}

function test2() {
}


class TestantA extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 2;
        this.position.put(500, 500);

        this.setBehavior( new ImageBody() );
        this.setBehavior( new ImageRenderer("mzm") );
    }
}


class TestantB1 extends Executant {

    _constructor(antA) {
        super._constructor();

        this.layer = 1;
        this.position.put(750, 750);

        this.setBehavior( new ImageBody() );
        this.setBehavior( new ImageRenderer("icon_256") );

        this.setChild(new TestantB2(antA), 'b2');
    }
}


class TestantB2 extends Executant {

    _constructor(antA) {
        super._constructor();

        this.layer = 3;

        this.setBehavior( new ImageBody() );
        this.setBehavior( new ImageRenderer("packman") );

        // var anchor = new PositionAnchor(antA);
        // this.setBehavior(anchor);

        var anchor = new EdgeAnchor("right", antA, 0.5);
        this.setBehavior(anchor);
    }
}
