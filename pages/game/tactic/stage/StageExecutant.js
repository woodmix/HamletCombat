
/**
 * フロア全体を表す実行素子。
 */
class StageExecutant extends PrimFloat {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   ステージ番号。
     */
    _constructor(stageNo) {
        super._constructor();

        this.layer = TacticScene.GROUND;

        // フロートとしての挙動にマージンを設定する。
        this.floatMargin = 150;

        // キャンバスサイズが変わったとき、自然な位置になるようにする。
        this.behaviors.set( new CenterSizer() );

        // ドラッグ可能、また、タップされたときに tap() が呼ばれるようにする。
        this.behaviors.set( new DraggableInteractor() );

        // ボディビヘイバーを作成。ステージマップ全体をボディ領域とする。
        var body = new class extends BodyBehavior {
            getRect() {
                return new Rect(0, this.host.map.largeness.clone().multi(StageBlock.TIPSIZE));
            }
        };
        this.behaviors.set(body);

        // ステージデータを取得。
        var data = Asset.take("stages");
        data = JSON.parse(data[ "stage%02d".format(stageNo) ]);

        // BGM再生開始
        Acousmato.musicVolume = 0.5;
        Acousmato.playMusic(data.music);

        // 補助ビヘイバー・補助素子を作成。
        this.map = new StageMap(data["map"]);
        this.behaviors.set(this.map, "renderer");

        this.supervisor = new StageSupervisor(data["gimmicks"]);
        this.behaviors.set(this.supervisor, "supervisor");

        // 探索モード時、ブロックをタップしたときの通知を受けるUnitBrain。探索モードかどうかのフラグも兼ねる。
        this.probeWatcher = null;

        // ユーザが最後にカメラを動かした時間。普通 0 で初期化するところだが、最初のユーザ入力に間に合わないので…
        this.lastMotivatedTouch = -Infinity;

        // カメラを誘引した理由がユニットのアクションにある場合に、そのアクションを行っているユニット。
        this.cameraAttractor = null;

        // デバッグ
        if(Settings["debug"]) {
            this.childs.set(new DebugGrid(StageBlock.TIPSIZE), "debug-grid");
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたデータでユニットを作成して追加する。
     *
     * @return  作成されたUnitExecutant。
     */
    addUnit(data) {

        var unit = new UnitExecutant(this, data);
        this.childs.setWith(unit, "unit-");
        return unit;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在ステージ上に存在するユニット素子の配列を表す。
     */
    get units() {

        var units = [];

        for(var [name, ant] of this.childs.leaves)
            if(name.startsWith("unit-"))  units.push(ant);

        return units;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自動でカメラワークを行うかどうかを返す。
     */
    get autoWorkCamera() {

        // ユーザが自主的にカメラを動かしてから一定時間が経過しているかどうか、となる。
        return this.lastMotivatedTouch + 1000 <= this.getScene().time;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 画面を振動させる。
     */
    vibrate(type) {

        switch(type) {
            case "slash":       var mover = new PikoMover([30, 30], 200);   break;
            case "slash-back":  var mover = new PikoMover([-30, 30], 200);  break;
            case "gunshock":    var mover = new VibrateMover("horizontal", 200, 20, 10);    break;      // 200ms、振幅20、周波数10。
            case "cannonshock": var mover = new VibrateMover("xsquare", 800, 30, 10, true); break;      // 800ms、振幅30、周波数10、減衰有り。
        }

        // 移動器をセット。
        this.behaviors.set(mover);

        // ただ、この素子は親素子の領域(画面)に縛られているので、振動中は解放する必要がある。
        this.leashed = false;
        mover.onfinish = () => this.leashed = true;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 探索モードを開始する。
     *
     * @param   ブロックをタップしたときの通知を受けるUnitBrain。
     */
    beginProbe(watcher) {

        this.probeWatcher = watcher;
    }

    /**
     * 探索モードを終了する。
     */
    endProbe() {

        this.probeWatcher = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ステージがタップされたら呼ばれる。
     */
    tap(pos) {

        // タップされたブロックを検出する。
        var tapped = pos.divide(StageBlock.TIPSIZE).int();
        var block = this.map.getBlock(tapped);

        // そのブロックにユニットが居るならその情報を表示する。いないなら情報ウィンドウを消去。
        this.parent.scouter.hide();
        if(block.logicalUnit) {
            this.parent.scouter.showUnit(block.logicalUnit);
            Acousmato.strikeSound("reply-se");
        }

        // 探索モード中なら、ブロックタップを監視しているユニットに通知。
        if(this.probeWatcher)  this.probeWatcher.blockTapped(block);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ステージがドラッグされたら呼ばれる。カメラ位置の移動は DraggableInteractor の働きで既に行われている。
     */
    drag(move) {

        // 最終カメラ接触時間を更新。
        this.lastMotivatedTouch = this.getScene().time;

        // カメラ誘引を行っているなら中止する。
        this.cameraAttractor = null;
        this.behaviors.cut("camera-mover");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたブロックを中心に捉えるようにカメラを誘引する。
     *
     * @param   カメラに捉えるべきStageBlock
     * @param   理由がユニットのアクションにある場合はそのUnitExecutantを指定する。指定した場合、そのユニットのタスクが空になるまで
     *          「アトラクトモード」になって、新たな誘引を無視するようになる。
     */
    attractCamera(block, attractor = null) {

        // オートカメラ中ではない場合や、アトラクトモード中は無視する。
        if(!this.autoWorkCamera)  return;
        if(this.cameraAttractor)  return;

        // アトラクトモードになる場合はその誘引を行っているユニットを保持。
        if(attractor)  this.cameraAttractor = attractor;

        // 指定されたブロックをカメラ内に収めるムーバーをセット。
        this.captureCamera(block);
    }

    /**
     * 指定されたブロックをカメラ内に収めるためのムーバーを作成・セットする。
     */
    captureCamera(block) {

        // ブロックの中央座標を「注目座標」として設定。ここをカメラ内に収める必要がある。
        var attention = block.center;

        // 現在のカメラ矩形を取得。カメラの端っこギリギリに収めてヨシというわけではないので、少し縮める。
        // フロートの移動マージン以上に縮めると収めることが出来なくなるので注意。
        var camera = this.takeBody( this.getScene() );
        camera.swell( -(this.floatMargin-10) );

        // 注目座標がカメラ内のどこに収めるかを決定。現在位置がカメラ外の左側にあるのならカメラ内の左端だし、右側にあるのなら右端となる。
        // すでにカメラ内にある場合は現在の座標をそのまま使う。
        var start = new Point();
        Point.forAxis(axis => {
            if(attention[axis] < camera.lt[axis])       start[axis] = camera.lt[axis];
            else if(attention[axis] < camera.rb[axis])  start[axis] = attention[axis];
            else                                        start[axis] = camera.rb[axis];
        });

        // すでにカメラ内にあるのなら何もする必要は無い。
        if( start.equals(attention) )  return;

        // positionの目標地点を取得して、そこへ移動するムーバーをセット。
        var destination = this.position.add( start.sub(attention) );
        var mover = new DestineMover(destination, 2000);
        this.behaviors.set(mover, "camera-mover");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアップデートフェーズで呼ばれる。
     */
    update(scene) {

        // アトラクトモードの終了を監視する。
        this.watchAttractMode();
    }

    /**
     * アトラクトモードの終了を監視する。
     */
    watchAttractMode() {

        // アトラクトモード中でないならすることはない。
        if(!this.cameraAttractor)  return;

        // アトラクトモードの理由になっているアクションが継続中ならそのまま。
        if( !this.cameraAttractor.brain.undertaking )  return;

        // アクションが終わっているならモード解除。
        this.cameraAttractor = null;

        // そのとき、ユーザ入力待ちになっているならそのユニットのブロックにカメラを向ける。
        if(this.probeWatcher)  this.attractCamera(this.probeWatcher.seatblock);
    }


    // 描画について...
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。メンバ変数 tribeLayers を構築する。
     */
    makeTribeLayers() {
        super.makeTribeLayers();

        // レイヤー TacticScene.SURFACE, TacticScene.MARKERS を強制的に追加する。
        if( !this.tribeLayers.includes(TacticScene.SURFACE) )  this.tribeLayers.push(TacticScene.SURFACE);
        if( !this.tribeLayers.includes(TacticScene.MARKER) )   this.tribeLayers.push(TacticScene.MARKER);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ドローフェーズにおけるドロー実行部分。
     */
    drawFamily(layer, context, scene) {

        // 特定のレイヤーについては独自に処理する。それ以外は通常通り。
        switch(layer) {
            case TacticScene.SURFACE:  this.map.renderSurface(context, scene);  break;
            case TacticScene.MARKER:   this.map.renderMarkers(context, scene);  break;
            default:                   super.drawFamily(layer, context, scene);
        }
    }
}
