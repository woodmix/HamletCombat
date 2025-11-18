
function test() {

    g_scene2 = new Testant2("canvas2");
    g_scene1.startChange(g_scene2);
}

function test2() {

}

//-----------------------------------------------------------------------------------------------------
class Testant1 extends FollowScene {

    _constructor(canvas) {
        super._constructor(canvas);

        this.layer = 0;
        this.setBehavior( new FillRenderer("aliceblue") );
        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        this.foo = new Fooant();
        this.setChild(this.foo, "foo");

        this.start();
        Acousmato.playMusic("WhIte");
    }

    startChange(next) {

        this.changer = new MyChanger(next);
        this.setChild(this.changer, "changer");
    }
}

class Fooant extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 1;
        this.position.put(200, 500);

        var renderer = new TextRenderer("darkred");
        renderer.style = "darkred";
        this.setBehavior(renderer);

        this.text = 0;
    }

    update(scene) {

        this.text++;
    }
}

//-----------------------------------------------------------------------------------------------------
class MyChanger extends CoronatingHostant {

    _constructor(secondary) {
        super._constructor(secondary);

        this.layer = 3;
        this.closing = 0;

        this.onfinish = nothing;
    }

    update(scene) {
        super.update(scene);

        this.closing += 3;

        var camera = this.takeBody(scene);
        if(camera.height <= this.closing)
            this.takeoverCrown();
    }

    draw(context, scene) {

        var camera = this.takeBody(scene);

        context.decalImage(this.secondary.canvas, 0, camera.bottom - this.closing, camera.width, camera.height);

//         context.centerImage(this.secondary.canvas, camera.center.x, camera.center.y);
    }
}

//-----------------------------------------------------------------------------------------------------
class Testant2 extends FollowScene {

    _constructor(canvas) {
        super._constructor(canvas, false);

        this.layer = 0;
        this.setBehavior( new FillRenderer("palegoldenrod") );
        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        this.bar = new Barant(this.foo);
        this.setChild(this.bar, "bar");
        this.foo = new Fooant(this.foo);
        this.setChild(this.foo, "foo");

//         this.start();
//         Acousmato.playMusic("WhIte");
    }
}

class Barant extends FloatExecutant {

    _constructor(foo) {
        super._constructor(foo);

        this.layer = 2;
        this.position.put(750, 750);
        this.floatMargin = 20;

        this.setBehavior( new NaturalBody() );
        this.setBehavior( new ImageRenderer("icon_256") );
        this.setBehavior( new DraggableInteractor() );
    }
}
