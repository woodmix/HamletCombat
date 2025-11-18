
/**
 * ユーザイベント、環境イベントも処理するシーン。TimeSceneから派生する。
 * このシーンや子実行素子は、自身の "interactor" ビヘイバを通じてUIについてのイベントを処理できるようになる。
 *
 * イベントはまだタップとドラッグしか取れない。他のイベントが必要になったときのメモ…
 *      ロングタップ    発生する瞬間はタッチエンドではなくタッチ中なので、いろいろ工夫が必要になるだろう。
 *      スワイプ        ドラッグの移動量積算が閾値を超えたら…というものだが、基盤の実装でその閾値は決められない。
 *                      結局ドラッグと変わらなくなる。各実行素子でそれぞれの方法でdrag()を処理するという方針になりそう。
 *                      共通した処理がある程度散見されるなら、drag() をオーバーライドするトレイトなりExecutant派生クラスなどを作れば良いかな、と。
 *      フリック        「途中までドラッグしてそこからフリック」とかの可能性もあるので、厳密には「閾値を超える速さのドラッグが発生して、かつ、
 *                      それからタッチエンドまでの時間が一定値以下」となる。
 * まあ必要になったらそのときに実装かな…
 *
 * 対象のcanvasにイベントリスナを登録するので、シーン処理が終わったときにオブジェクトを破棄したいなら dispose() する必要がある(canvasごと破棄するなら必要ない)。
 */
class InteractScene extends TimeScene {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     */
    _constructor(canvas) {

        // 最後に検出したマウスカーソルの位置。
        this.follow = new Point(NaN);

        // タッチ開始された時間と座標。
        this.touchTime = 0;     // これについては「タッチ中かどうか」というフラグも兼ねている。0は「タッチ中ではない」という意味になる。
        this.begin = null;

        // ドラッグと判定したかどうか。
        this.dragged = false;

        // 現在実行中のタップイベントとドラッグイベントを受け取る実行素子のコレクション。
        // タップ系のイベントを受け取る素子を tap キー、ドラッグイベントを受け取る素子を drag キーに保持する。
        this.sensors = null;

        // マウスイベントのリスナのthisをバインドしたものを作成。
        this.startListener = this.touchstart.bind(this)
        this.endListener = this.touchend.bind(this)
        this.moveListener = this.touchmove.bind(this)

        super._constructor(canvas);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * canvas プロパティへの代入をオーバーライド。
     */
    set canvas(value) {

        // 古いキャンバスからカップリングを解除する。
        if(this._canvas)  this.decoupleCanvas();

        // 基底の処理。
        super.canvas = value;

        // 新しいキャンバスへカップリング処理。
        if(this._canvas)  this.coupleCanvas();
    }

    // セッターをオーバーライドしたらゲッターもオーバーライドしないといけないらしい。
    get canvas() {
        return super.canvas;
    }

    /**
     * 対象キャンバスのイベント処理を開始する。
     */
    coupleCanvas() {

        // addEventListener() は同じ関数を複数回登録しても無視するので、このメソッドが複数回呼ばれても問題ないようになっていることに留意。

        // スマホだとマウスイベントは300msの遅延があるので、ちゃんとタッチ系を取らなければならない。
        // それは良いとして、どちらかのみを取得していると、今度はタッチ付きPCディスプレイでのタッチがマウスイベントを発火しないという問題に当たる。
        // 遅延がなくなればマウス系のイベントだけを処理していれば良い(Androidは <meta name="viewport"> があると遅延がなくなるらしい)のだが…
        // それまでは結局両方リッスンする必要がある。
        // このままだとスマホでは一度のタッチで二回イベント処理することになるが、preventDefault() するので重複分は発行されない。

        this.canvas.addEventListener("touchstart", this.startListener);
        this.canvas.addEventListener("mousedown", this.startListener);

        this.canvas.addEventListener("touchend", this.endListener);
        this.canvas.addEventListener("mouseup", this.endListener);

        this.canvas.addEventListener("touchmove", this.moveListener);
        this.canvas.addEventListener("mousemove", this.moveListener);
    }

    /**
     * 対象キャンバスのイベント処理を停止する。canvasを保持したままこのオブジェクトだけ破棄したい場合は呼んでおく必要がある。
     */
    decoupleCanvas() {

        this.canvas.removeEventListener("touchstart", this.startListener);
        this.canvas.removeEventListener("mousedown", this.startListener);

        this.canvas.removeEventListener("touchend", this.endListener);
        this.canvas.removeEventListener("mouseup", this.endListener);

        this.canvas.removeEventListener("touchmove", this.moveListener);
        this.canvas.removeEventListener("mousemove", this.moveListener);
    }


    // タッチイベント関連
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * タッチ開始・ボタン押下時にコールされる。
     */
    touchstart(event) {

        // スマホではタッチ系とマウス系で二回実行されるが、このイベントを処理する素子がいるなら途中でpreventDefault()されるから二回目はないし、
        // どの実行素子も反応しないなら二回実行されても問題ない。

        // キャンセル不能なら処理しない。passive:true などでリッスンしてると飛んでくるのだが…なぜか内蔵WebViewでランダムに飛んでくる…
        if(!event.cancelable)  return;

        // 動作中のみ処理する。
        if(!this.playing)  return;

        // スマートデバイスについては...
        if(event["offsetX"] == undefined) {

            // 二本以上の指がタッチされた場合は一本目と二本目の二回 touchstart が発行される。
            // これはピンチイン・アウトと解釈するべきなので、一本目で「タッチ中」となってしまった状態をキャンセルする。
            // ちなみに一本目で preventDefault() するともう(二本目で preventDefault() しなくても)ブラウザはピンチイン・アウトを処理してくれない…
            // これはどうしようもない…
            if(event.touches.length >= 2) {
                this.touchTime = 0;
                return;
            }

            // event.offsetX,Y を確実に使えるようにする。
            var finger = event.touches[0];
            event.offsetX = finger.clientX - finger.target.offsetLeft;
            event.offsetY = finger.clientY - finger.target.offsetTop;
        }

        // タッチ座標をキャンバスの内部スケールで取得。
        var pointer = this.canvasRatio.multi(event.offsetX, event.offsetY);

        // 最後に検出したマウスカーソルの位置を更新。マウス環境なら touchmove でトラックしているが、タッチ環境だとそれは出来ないのでここで更新する必要がある。
        this.follow.put(pointer);

        // イベント関連情報初期化。
        this.touchTime = performance.now();
        this.begin = this.follow.clone();
        this.dragged = false;

        // タッチされた座標におけるインタラクション素子を取得する。
        this.sensors = InteractScene.searchSensor(this, this.begin);

        // 反応する実行素子があるならブラウザのタッチ挙動をキャンセルする。
        // これをやらないとブラウザがタッチを処理して(スクロールとか領域のライトアップとか)、touchmoveも発生しなくなる。
        // 反応する実行素子がない場合は preventDefault() せずにスクロール等をできるようにする。
        if(this.sensors.tap  ||  this.sensors.drag)
            event.preventDefault();

        // タップ系反応素子がいるなら、その素子にタッチイベントを送信する。
        this.fireEvent(this.sensors.tap, "touch", this.begin);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タッチ終了・ボタン解放時にコールされる。
     */
    touchend(event) {

        // 動作中のみ処理する。
        if(!this.playing)  return;

        // ドラッグ判定されておらず、タッチ開始から終了までの時間が規定以内ならタップイベントを発行する。
        if(!this.dragged  &&  performance.now() < this.touchTime + 750)
            this.fireEvent(this.sensors.tap, "tap", this.begin);

        // 後続のtouchmove(mousemove)が処理されないようにする。
        this.touchTime = 0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タッチ移動・マウス移動時にコールされる。マウス移動ではボタン押下していなくても呼ばれるので注意。
     */
    touchmove(event) {

        // 動作中のみ処理する。
        if(!this.playing)  return;

        // スマートデバイスについては...
        if(event["offsetX"] == undefined) {

            // 二本以上の指がタッチされている場合処理しない。
            if(event.touches.length >= 2) return;

            // event.offsetX,Y を確実に使えるようにする。
            var finger = event.touches[0];
            event.offsetX = finger.clientX - finger.target.offsetLeft;
            event.offsetY = finger.clientY - finger.target.offsetTop;
        }

        // タッチ座標をキャンバスの内部スケールで取得。
        var pointer = this.canvasRatio.multi(event.offsetX, event.offsetY);

        // 前回検出からの移動量を取得して、最新のマウス位置を更新。
        var move = pointer.sub(this.follow);
        this.follow.put(pointer);

        // ここから先はドラッグの処理になる。押下中のときのみ処理する。
        if(this.touchTime == 0)  return;

        // まだドラッグ開始判定されていない場合は...
        if(!this.dragged) {

            // マウス移動量を前回検出の位置からではなく、タッチ開始位置からの計算とする。
            var move = this.follow.sub(this.begin);

            // 移動量が規定範囲から出ていない場合はまだドラッグ判定しない。
            if(move.divide(this.canvasRatio).manhattan < InteractScene.DRAG_MARGIN)  return;

            // ここまで来たらドラッグ開始。
            this.dragged = true;
        }

        // ドラッグイベントを発行。
        this.fireEvent(this.sensors.drag, "drag", move);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * staticメソッド。
     * 引数で指定された実行素子とその子供に対して、指定された座標でタップ系・ドラッグ系のイベントに誰が答えるのかを調べさせる。
     *
     * @param   調査させたい実行素子。
     * @param   タッチスタートした座標。
     * @param   内部で使用する。
     * @return  次のキーを持つオブジェクト。
     *              tap         タップ系のイベントに答える実行素子。いない場合は null。
     *              drag        ドラッグ系のイベントに答える実行素子。いない場合は null。
     */
    static searchSensor(ant, point, result) {

        // 最初の呼び出しなら戻り値を初期化する。
        if(!result)  result = {"tap":null, "drag":null};

        // 判定座標にpositionとscaleを反映して…
        point = ant.getCoord(point);

        // まずは指定された実行素子に対して、インタラクションビヘイバを持っているなら調べる。
        var interactor = ant.behaviors.get("interactor");
        if(interactor) {

            // その座標でどの系統のイベントに反応するのか答えさせる。
            var senses = interactor.sense(point);

            // 反応する各系統において、現在保持している素子よりも手前にあるなら戻り値として保持する。
            for(let sense of senses) {
                if(!result[sense]  ||  (result[sense].layer || -1) < ant.layer)
                    result[sense] = ant;
            }
        }

        // 次にその子供に対して調査していく。
        for( let child of ant.childs.leaves.values() )
            InteractScene.searchSensor(child, point, result);

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された実行素子に、指定されたイベントを送信する。
     *
     * @param   送信先の実行素子
     * @param   イベント種別
     * @param   イベント発生地点。dragの場合はドラッグ距離となる。
     */
    fireEvent(sensor, type, point) {

        // 指定された素子にインタラクションビヘイバーがない場合は処理しない。
        if( !sensor  ||  !sensor.behaviors.get("interactor") )  return;

        // 発生地点or距離を送信先素子の座標系に合わせる。その素子まで各階層の座標系を適用していくのだが、ドラッグ距離である場合は親の階層まで、
        // かつ原点が反映されないように注意しないといけない。
        if(type == "drag")
            point = sensor.parent ? sensor.parent.localCoord(new Rect(0, point)).size : point;
        else
            point = sensor.localCoord(point);

        // イベント情報を送信。
        sensor.behaviors.get("interactor").interact(type, point);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * CSS上での1ピクセルに対する、このキャンバスのピクセル数を返す。
     *
     * @return  X, Y 軸におけるピクセル数を表すPoint。
     */
    get canvasRatio() {

        var canvas = this.canvas;
        return new Point(canvas.width / canvas.clientWidth, canvas.height / canvas.clientHeight);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。アップデートフェーズの処理を行う。
     */
    processUpdate(scene, pointer) {

        // 基底クラスではこのメソッドの第二引数は位置不定(NaN)のPointで仮指定されているので、トラッキングしているマウス位置を
        // 使って正しい値を渡すようにする。
        super.processUpdate(scene, this.follow);
    }
}

// ドラッグ判定するまでの振動マージン。押下してからこれ以下の移動量はドラッグ判定されない。
InteractScene.DRAG_MARGIN = 10;
