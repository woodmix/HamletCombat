
/**
 * 行動をプレイヤーに入力してもらうブレイン。
 */
class InputBrain extends UnitBrain {

    //------------------------------------------------------------------------------------------------------
    constructor() {
        super();

        // 入力受付中かどうかのフラグ。
        this._deciding = false;

        // 移動可能なブロックの配列と、攻撃可能なブロックの配列。
        this.travels = [];

        // 移動先・攻撃先として選択したブロック。
        this.destination = null;
        this.pigeon = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。アクション決定中かどうかを表す。
     */
    get deciding() {

        return this._deciding;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * よく参照するのでショートカットを作っておく。
     */
    get map() {
        return this.host.stage.map;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。次のアクションを決定して実行する。
     */
    perform() {

        // 入力受付中フラグをONに。
        this._deciding = true;

        // ステージを探索モードにして、ブロックがタップされたときに blockTapped() が呼ばれるようにする。
        this.host.stage.beginProbe(this);

        // ユニットの所在箇所にカメラを誘引する。
        this.host.stage.attractCamera(this.host.seatblock);

        // 移動可能なブロックを取得。敵ユニットが居るブロックは列挙されない。
        this.travels = this.listTravels();

        // 移動可能なブロックに青いマーカーを表示。状態を保存する。
        this.map.setBlocksMarker(this.travels, "deepskyblue");
        this.map.saveMarkerState("destining");

        // ユニットのモーションを「待機」から「入力待ち」に＆マーカーの上のレイヤーで描画されるようにする。
        this.host.setMotion("ready");
        this.map.setBlocksMarker([this.host.seatblock], "unit");

        // ガイドテキストを表示。
        this.host.getScene().guideText = "移動先を選択";

        // その他初期化。
        this.targets = [];
        this.destination = null;
        this.pigeon = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ブロックがタップされたら呼ばれる。
     *
     * @param   タップされた StageBlock。
     */
    blockTapped(block) {

        // 攻撃予測情報を非表示にする
        this.host.getScene().predictor.hide();

        // 移動先ブロックか攻撃先ブロックを再タップした場合は...
        if(block == this.destination  ||  block == this.pigeon) {

            // 移動先ブロックの場合は移動のみとする。
            if(block == this.destination)  this.pigeon = null;

            // アクション決定。
            this.decideAction();
            Acousmato.strikeSound("tap1-se");
            return;
        }

        // 移動範囲内のブロックをタップした場合は...
        if( this.travels.includes(block) ) {

            // マーカーなどを移動先選択前の状態にリセット。
            this.map.restoreMarkerState("destining");
            this.pigeon = null;

            // そのブロックを移動先に設定する。
            this.setDestination(block);
            Acousmato.strikeSound("tap1-se");
            return;
        }

        // 攻撃可能ブロックをタップした場合は...
        if( this.targets.includes(block) ) {

            // マーカーなどを攻撃先選択前の状態にリセット。
            this.map.restoreMarkerState("targeting");

            // 攻撃予測情報を表示する
            this.host.getScene().predictor.showPrediction(this.host, block.logicalUnit);

            // そのブロックを攻撃先に設定する。
            this.setPigeon(block);
            Acousmato.strikeSound("tap1-se");
            return;
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 移動先を指定されたブロックに設定する。
     *
     * @param   移動先となるブロック。
     */
    setDestination(block) {

        // 指定されたブロックを覚えておく。
        this.destination = block;

        // 移動先ブロックに白いマーカーを表示。
        this.map.setBlocksMarker([block], "white");

        // そのブロックから攻撃可能なブロックを取得してターゲットマーカーを設定。
        var aimables = this.listAimables(block);
        this.map.setBlocksMarker(aimables, "target");

        // マーカーの状態を保存。
        this.map.saveMarkerState("targeting");

        // 敵ユニットが居る攻撃可能なブロックを取得。
        this.targets = aimables.filter(block => block.logicalUnit && block.logicalUnit.unioncode != this.host.unioncode);

        // ガイドテキストを更新。
        this.host.getScene().guideText = (this.targets.length > 0) ? "攻撃相手を選択。しないなら白ブロックをもう一度選択" : "OKならもう一度選択";
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 攻撃先を指定されたブロックに設定する。
     *
     * @param   攻撃先となるブロック。
     */
    setPigeon(block) {

        // 指定されたブロックを覚えておく。
        this.pigeon = block;

        // そのブロックに黄色マーカーを設定。
        this.map.setBlocksMarker([block], "yellow");

        // ガイドテキストを更新。
        this.host.getScene().guideText = "OKならもう一度選択";
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 行動が決定されたら呼ばれる。
     */
    decideAction() {

        var stagequeue = this.host.stage.supervisor.queue;

        // 入力受付中フラグをOFFに。
        this._deciding = false;

        // マーカーを消去。
        this.map.clearBlockMarkers()
        this.map.clearMarkerStates();

        // ステージの探索モードを終了。
        this.host.stage.endProbe();

        // ガイドテキストを消す。
        this.host.getScene().guideText = "";

        // 移動先ブロックへ移動するステージコマンドをプッシュ。
        stagequeue.push({type:"move", unit:this.host, to:this.destination});

        // 攻撃を行っている場合はそれを表すステージコマンドもプッシュする。
        if(this.pigeon)
            stagequeue.push({type:"action", thrower:this.host, catcher:this.pigeon.logicalUnit});
    }
}
