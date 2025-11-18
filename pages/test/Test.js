
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        this.layer = 0;
        this.behaviors.set( new FillRenderer("aliceblue") );
        this.childs.set(new DebugGrid(), "debug-grid");
        this.childs.set(new DebugInfo(), "debug-info");

//         this.foo = new Fooant();
//         this.childs.set(this.foo, "foo");

        this.bar = new Barant();
        this.childs.set(this.bar, "bar");

        Acousmato.playMusic("WhIte");
    }
}


function test() {
    EngageScene.currentEngaged.test();
}

function test2() {
}


// class Fooant extends Executant {
//
//     _constructor() {
//         super._constructor();
//
//         this.layer = 1;
//         this.position.put(1000, 1000);
//         this.behaviors.set( new FreeBody(0, 0, 1000, 1000) );
//         this.behaviors.set( new FillRenderer("darkred") );
//     }
// }


class Barant extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 2;
        this.position.put(1000, 1000);
        this.behaviors.set( new NaturalBody() );
        this.behaviors.set( new ImageRenderer("icon_256") );
        this.behaviors.set( new DraggableInteractor() );

        var walker = new AxisWalker({x:"sin", x_apex:500, y:"linear", y_apex:100});

        var mover = new WalkMover(walker, 3000);
        this.behaviors.set(mover);
    }

    //------------------------------------------------------------------------------------------------------
    tap(point) {

        console.log("tap: " + point.explain());
    }
}
