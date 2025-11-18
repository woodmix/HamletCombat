
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        this.layer = 0;
        this.behaviors.set( new FillRenderer("aliceblue") );
        this.childs.set(new DebugGrid(), "debug-grid");
        this.childs.set(new DebugInfo(), "debug-info");

        this.foo = new Fooant();
        this.childs.set(this.foo, "foo");

        this.bar = new Barant();
        this.childs.set(this.bar, "bar");

        Acousmato.playMusic("WhIte");
    }

    test() {

        var mover = new VibrateMover("xsquare", 10000, 20, 0.25, true);
        this.bar.behaviors.set(mover);
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
        this.position.put(1000);
        this.behaviors.set( new FreeBody(Rect.byCenter(0, 1000)) );
        this.behaviors.set( new FillRenderer("darkred") );
    }
}


class Barant extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 2;
        this.position.put(1000, 1000);
        this.behaviors.set( new NaturalBody() );
        this.behaviors.set( new DraggableInteractor() );
        this.behaviors.set( new ImageRenderer("icon_256") );
    }

    //------------------------------------------------------------------------------------------------------
    tap(point) {

        console.log("tap: " + point.explain());
    }
}
