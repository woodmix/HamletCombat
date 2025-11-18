
class Test extends FollowScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        console.log("asset loaded");

        this.layer = 0;
        this.setBehavior( new FillRenderer("aliceblue") );
        this.setChild(new DebugGrid(), "debug-grid");
        this.setChild(new DebugInfo(), "debug-info");

        this.foo = new Fooant();
        this.setChild(this.foo, "foo");

        this.bar = new Barant();
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
        this.position.put(500, 500);
        this.setBehavior( new FreeBody(0, 0, 1000, 1000) );
        this.setBehavior( new FillRenderer("darkred") );
    }
}


class Barant extends Executant {

    _constructor() {
        super._constructor();

        this.layer = 2;
//         this.position.put(1000, 1000);
        // this.scale.put(2);

        this.setBehavior( new FreeBody(500, 500, 1000, 1000) );
//         this.setBehavior( new NaturalBody() );

        var renderer = new BodyTextRenderer();
        renderer.style = "turquoise";
        renderer.halign = "center";
        renderer.valign = "middle";
        var renderer = new ReadableRenderer(renderer);
        this.setBehavior(renderer);

        this.text = "laala\nらぁら\nあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ";
    }
}
