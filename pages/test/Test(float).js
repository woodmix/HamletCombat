
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        this.layer = 0;
        this.setBehavior( new FillRenderer("aliceblue") );
        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        this.foo = new Fooant();
        this.setChild(this.foo, "foo");

        this.bar = new Barant(this.foo);
        this.setChild(this.bar, "bar");

        Acousmato.playMusic("WhIte");
    }
}


function test() {
    EngageScene.currentEngaged.test();
}

function test2() {
}


class Fooant extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 1;
        this.setBehavior( new FillRenderer("darkred") );

        this.position.put(500, 500);
        this.setBehavior( new FreeBody(new Rect(0, 0, 500, 500)) );
//         this.position.put(700, 700);
//         this.setBehavior( new FreeBody(new Rect(0, 0, 100, 100)) );
    }
}


class Barant extends FloatExecutant {

    _constructor(foo) {
        super._constructor(foo);

        this.layer = 2;
        this.position.put(750, 750);
        this.setBehavior( new NaturalBody() );
        this.setBehavior( new ImageRenderer("icon_256") );
        this.setBehavior( new DraggableInteractor() );
    }
}
