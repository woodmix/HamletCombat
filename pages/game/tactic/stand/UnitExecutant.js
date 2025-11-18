
/**
 * ステージ上のユニットを表す実行素子。
 */
class UnitExecutant extends StandExecutant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   このオブジェクトが配置されるステージ実行素子。
     * @param   ユニットの情報を表す構造体。art/data/stages.txt で説明されている。
     */
    _constructor(stage, data) {
        super._constructor(stage, data);

        // ユニットの各種プロパティを初期化。
        this.unitname = data["name"];
        this.unittags = data["tags"] || [];
        this.unioncode = data["union"];
        this.unitclass = data["class"];
        this.unitlevel = data["level"];

        // specs を初期化。class と level からデフォルト値を計算するのだが、明示的に指定されているキーを優先する。
        var template = this.makeDefaultSpecs(this.unitclass, this.unitlevel);
        this.specs = template.deepmerge(data["specs"]);

        // その他初期化。
        this.specs["hp-max"] = this.specs["hp"];
        this.debugs = data["debugs"] || {};

        // 各種フラグのコレクション。
        this.signals = {};

        // 表示上、所在しているブロック。seatblock は論理状の所在位置として機能するが、こちらは移動途中の所在位置として機能する。
        this.walkblock = this.seatblock;

        // ブレインを作成。
        data["brain"] = data["brain"] || "auto";
        this.brain = (data["brain"] == "input") ? new InputBrain() : new AutoBrain(data["mission"]);
        this.behaviors.set(this.brain, "brain");

        // 初期モーションと向きをセット。
        this.setMotion("wait");
        this.setFaceDirection(data["direction"]);

        // ブロックを移動するときの移動器を作成しておく。セットするのはブロックを移動するとき。
        var walker = new LineWalker({polator:"easein", dest:new Point()});
        this.mover = new WalkMover(walker, 200);

        // マニュアルユニットには旗アイコンを付ける。左右フリップの違和感を少しでも和らげるため左右中央合わせ…
        if(data["brain"] == "input") {
            var flag = new Executant();
            flag.layer = TacticScene.EFFECT;
            flag.behaviors.set( new PositionAnchor(null, [.5, 0]) );
            flag.behaviors.set( new ImageRenderer("leader_flag") );
            this.childs.set(flag, "flag");
        }
    }

    /**
     * 指定されたクラスとレベルから、デフォルトのステータスを計算して返す。
     */
    makeDefaultSpecs(unitclass, unitlevel) {

        // まずはLv1でのステータスを取得。
        var result = {
            "close": {"legs":300, "range":1, "firecount":2, "accuracy":20, "avoidance":25, "attack":35, "hp": 80},
            "mid":   {"legs":200, "range":4, "firecount":4, "accuracy":40, "avoidance":10, "attack":35, "hp":120},
            "long":  {"legs":100, "range":6, "firecount":1, "accuracy":10, "avoidance": 5, "attack":45, "hp":140},
        }[unitclass];

        // あとはLvアップによって増大するステータスにレベルを反映。
        for(var status of ["accuracy", "avoidance", "attack", "hp"]) {
            var r = 0.03;
            result[status] = Math.floor( result[status] * Math.pow(1 + r, unitlevel - 1) );
        }

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。論理上所在しているStageBlockを表す。
     */
    get seatblock() {
        return super.seatblock;
    }
    set seatblock(v) {

        // 以前に所在していたブロックの unit プロパティをクリアしておく。
        if(this._seatblock)  this._seatblock.logicalUnit = undefined;

        // 基底の処理。seatblock プロパティが更新される。
        super.seatblock = v;

        // 新しく所在するブロックの unit プロパティを更新。
        if(v)  v.logicalUnit = this;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 表示上所在しているStageBlockを表す。
     */
    get walkblock() {
        return this._walkblock;
    }
    set walkblock(v) {

        // 以前に所在していたブロックの renderUnits プロパティから退去する。
        if(this._walkblock)  this._walkblock.renderUnits.pickout(this);

        // 新しく所在するブロックの renderUnits に追加。
        this._walkblock = v;
        v.renderUnits.push(this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 特定のタイミングで呼ばれる関数群。シグナルの更新を行う。
     */

    /**
     * 一部モーションが一周したら呼ばれる。
     */
    motionRounded() {

        this.signals["motion-rounded"] = true;
    }

    /**
     * 攻撃モーションのインパクトの瞬間に呼ばれる。
     */
    attackImpacted() {

        this.signals["attack-impacted"] = true;
    }

    /**
     * 攻撃を受けているとき、インパクトの瞬間に呼ばれる。
     */
    imminenceImpacted() {

        this.signals["imminence-impacted"] = true;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * モーションを指定されたものに変更する。
     *
     * @param   モーション名
     */
    setMotion(motion) {

        // 使用するグラフィックを取得。
        var atlas = Asset.take("units");
        var y = {"close":0, "mid":1, "long":2}[this.unitclass]
        var graph = atlas.piece(this.unioncode == "ally" ? 0 : 1, y);

        // 指定のモーションに応じたセットアップ。レンダラの作成が必須の処理だが、付随の処理が必要な場合もある。
        switch(motion) {

            case "wait":
                var renderer = new CustomAnimator([
                    {image:graph, duration:1000, scale:0.95},
                    {image:graph, duration:1000, scale:1.05},
                ]);
                break;

            case "ready":
                var renderer = new CustomAnimator([
                    {image:graph, duration:200, offset:[-15,0]},
                    {image:graph, duration:200, offset:[0,-15]},
                    {image:graph, duration:200, offset:[+15,0]},
                    {image:graph, duration:200, offset:[0,-15]},
                ]);
                break;

            case "move":
                var renderer = new CustomAnimator([
                    {image:graph, duration:200, offset:[0,0]},
                    {image:graph, duration:200, offset:[0,-20]},
                ]);
                break;

            case "attack-close-charge":
                var renderer = new CustomAnimator([
                    {image:graph, duration:150, offset:[0,0]},                              // 原点位置から右へ移動。
                    {image:graph, duration:200, offset:[+30,0], onnext:"motionRounded"},    // その位置で待機したあと "motionRounded"。
                    {image:graph, duration:Infinity, offset:[+30,0]},
                ]);
                break;

            case "attack-close-impact":
                var renderer = new CustomAnimator([
                    {image:graph, duration:100, offset:[+30,0], onnext:"attackImpacted"},   // 右から上に移動。移動が終わったら "attackImpacted"。
                    {image:graph, duration:100, offset:[0,-30]},                            // そこから振り下ろし。左下へ。
                    {image:graph, duration:150, offset:[-30,0], onnext:"motionRounded"},    // 左下位置で一定時間待機したら "motionRounded"。
                    {image:graph, duration:Infinity, offset:[-30,0]},
                ]);
                break;

            case "attack-close-discharge":
                var renderer = new CustomAnimator([
                    {image:graph, duration:150, offset:[-30,0], onnext:"motionRounded"},    // 振り下ろし後の左下位置から原点へ帰る。帰ったら "motionRounded"。
                    {image:graph, duration:Infinity, offset:[0,0]},
                ]);
                break;

            case "attack-mid-charge":
                // 200ms静止してモーション終了。
                var renderer = new ImageRenderer(graph);
                var timer = new TimerBehavior(200, "motionRounded");
                this.behaviors.set(timer);
                break;

            case "attack-mid-impact":

                // 横振動してモーション終了となる。
                var vibrator = new VibrateMover("horizontal", 200, 10, 10);
                vibrator.onfinish = "motionRounded";
                this.behaviors.set(vibrator);

                // attack-impacted は振動の最中。
                var timer = new TimerBehavior(100, "attackImpacted");
                this.behaviors.set(timer);
                break;

            case "attack-mid-discharge":
                // 特にやることないんだが…まあ100ms静止するか。
                var renderer = new ImageRenderer(graph);
                var timer = new TimerBehavior(100, "motionRounded");
                this.behaviors.set(timer);
                break;

            case "attack-long-charge":
                // 200ms静止してモーション終了。
                var renderer = new ImageRenderer(graph);
                var timer = new TimerBehavior(200, "motionRounded");
                this.behaviors.set(timer);
                break;

            case "attack-long-impact":
                // レンダラはそのままで...
                this.attackImpacted();                                              // インパクトはすぐ発生する。
                var mover = new VibrateMover("horizontal", 400, 40, 10, true);      // 横揺れ、時間長さ、振幅、周波数、減衰有り。
                mover.onfinish = "motionRounded";                                   // 揺れ終わったらモーション終了。
                this.behaviors.set(mover);
                break;

            case "attack-long-discharge":
                // impactの余韻が結構長いので、dischargeモーションはなし。
                this.motionRounded();
                break;

            case "imminence":
                var renderer = new ImageRenderer(graph);
                break;

            case "evade":
                var renderer = new CustomAnimator([
                    {image:graph, duration:100, offset:[0,0]},
                    {image:graph, duration:200, offset:[80,-80]},
                    {image:graph, duration:300, offset:[80,-80]},
                ]);
                renderer.autostop = true;
                renderer.onround = "motionRounded";
                break;

            case "damage":
                var renderer = new CustomAnimator([
                    {image:graph, duration:  1},
                    {image:graph, duration:800, color:"red"},
                ]);
                renderer.autostop = true;
                renderer.onround = "motionRounded";
                break;

            case "die":

                // レンダラは単純な黒塗り潰しイメージなのだが...
                graph = graph.createSilhouette("black");
                var renderer = new ShutterClipper(new ImageRenderer(graph), "top");

                // 上から下へ消えていくツイーンを設定。
                var tween = new TweenBehavior("behaviors.leaves.renderer.rate", 1.0, 1000);
                tween.autoremove = true;
                tween.onfinish = "motionRounded";
                this.behaviors.set(tween);

                break;

            default:
                throw new Error(`setMotion() に指定された引数 "${motion}" は未定義です`);
        }

        // 作成したレンダラをセット。
        if(renderer)  this.behaviors.set(renderer);
    }

    /**
     * 描画の右向き・左向きを切り替える。
     *
     * @param   右向きなら "left"、左向きなら "right" と指定する。
     */
    setFaceDirection(dir) {

        this.scale.x = (dir == "right") ? -1 : +1;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたブロックに位置する。
     *
     * @param   移動先ブロックを表すStageBlock。
     */
    moveTo(block) {

        // 指定されたブロックへの移動パスを取得。
        var path = this.seatblock.getStarRoute(block, this);

        // パスを一つずつ隣接移動タスクに変換する。
        for(var i = 0 ; i < path.length ; i++) {
            this.brain.pushTask({type:"step", dir:path.charAt(i)});
            this.brain.pushTask({type:"ring", sound:"step-se"});
        }

        // 論理所在ブロックを変更。
        this.seatblock = block;

        // スーパーバイザーのブロック移動時ギミックチェック。
        this.stage.supervisor.checkGimmicks("into", this);

        // ユニットのモーションを「移動」に。
        this.setMotion("move");

        // 移動が終わったら「待機」モーションにする。
        this.brain.pushTask({type:"motion", change:"wait"});
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたユニットの攻撃演出を行う。攻撃に伴うパラメータ修正や相手ユニットの処理は対象外。
     *
     * @param   攻撃対象のユニット。
     * @param   ダメージの配列。nullのダメージは回避を表す。
     */
    takeAttack(catcher, damages) {

        // 向きの管理。
        var dir = catcher.seatblock.point.x - this.seatblock.point.x;
        if(dir)  this.setFaceDirection(dir > 0 ? "right" : "left");

        // 攻撃エフェクトと効果音を決定。
        var effect = {"close":"swordlag", "mid":"gunfire", "long":"cannonfire"}[this.unitclass];

        // 攻撃を表現する一連のタスクをセット。まずは攻撃手段に応じた attack-charge モーション。
        this.brain.pushTask({type:"motion", change:`attack-${this.unitclass}-charge`});
        this.brain.pushTask({type:"wait", signal:"motion-rounded"});

        // 攻撃回数分繰り返す。
        for(var i = 0 ; i < damages.length ; i++) {
            this.brain.pushTask({type:"motion", change:`attack-${this.unitclass}-impact`});
            this.brain.pushTask({type:"ring", sound:effect+"-se"});
            this.brain.pushTask({type:"wait", signal:"attack-impacted"});
            this.brain.pushTask({type:"kick", func:catcher.imminenceImpacted.bind(catcher)});
            this.brain.pushTask({type:"voila", "effect":effect});
            this.brain.pushTask({type:"wait", signal:"motion-rounded"});
        }

        // 全部終わったら attack-discharge モーションして待機モーションに戻る。
        this.brain.pushTask({type:"motion", change:`attack-${this.unitclass}-discharge`});
        this.brain.pushTask({type:"wait", signal:"motion-rounded"});
        this.brain.pushTask({type:"motion", change:"wait"});
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたユニットの切迫演出を行う。攻撃に伴うパラメータ修正や相手ユニットの処理は対象外。
     *
     * @param   攻撃実行ユニット。
     * @param   ダメージの配列。nullのダメージは回避を表す。
     */
    takeImminence(thrower, damages) {

        // ユニットの所在箇所にカメラを誘引する。
        this.stage.attractCamera(this.seatblock, this);

        // 向きの管理。
        var dir = thrower.seatblock.point.x - this.seatblock.point.x;
        if(dir)  this.setFaceDirection(dir > 0 ? "right" : "left");

        // 切迫を表現する一連のタスクをセット。まずは切迫モーション。
        this.brain.pushTask({type:"motion", change:"imminence"});

        // 攻撃回数分繰り返す。
        for(var i = 0 ; i < damages.length ; i++) {

            // 攻撃のインパクトを待って...
            this.brain.pushTask({type:"wait", signal:"imminence-impacted"});

            // 攻撃手段に応じたエフェクトを再生。
            var effect = {"close":"slash", "mid":"shoteye", "long":"explosion"}[thrower.unitclass];
            this.brain.pushTask({type:"voila", "effect":effect});

            // 命中したなら...
            if(damages[i] != null) {

                // 攻撃手段に応じた命中音を決定
                var sound = {"close":"punch-middle2", "mid":"ricochets1", "long":"bomb1"}[thrower.unitclass];

                // ダメージモーションに移行してダメージを表示。
                this.brain.pushTask({type:"motion", change:"damage"});
                this.brain.pushTask({type:"ring", sound:effect+"-se"});
                this.brain.pushTask({type:"spec", what:"hp", slide:-damages[i]});
                this.brain.pushTask({type:"valpop", value:damages[i], sequence:i});

                // 画面振動をセット。
                var type = {"close":"slash", "mid":"gunshock", "long":"cannonshock"}[thrower.unitclass];
                if(type == "slash"  &&  this.scale.x > 0)  type += "-back";
                this.brain.pushTask({type:"kick", func:this.stage.vibrate.bind(this.stage, type)});

            // 回避したなら回避モーションへの移行とミス表示のみ。
            }else {
                this.brain.pushTask({type:"motion", change:"evade"});
                this.brain.pushTask({type:"valpop", value:null, sequence:i});
            }
        }

        // すべて終わったら、モーションが終了するのを待って待機モーションへ移行する。
        this.brain.pushTask({type:"wait", signal:"motion-rounded"});
        this.brain.pushTask({type:"motion", change:"wait"});
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたユニットの撃破演出を行う。終了時の素子の削除も行う。
     */
    takeDeath() {

        // 味方ユニットが倒された場合はシーン素子に置いてあるカウンターを+１する。
        if(this.unioncode == "ally")  this.getScene().terminated++;

        // 所在ブロックをクリアしておく。これがないとブロックの方から駐留ユニットとして参照されてしまう。
        this.seatblock = null;

        // 死亡を表現する一連のタスクをセット。
        this.brain.pushTask({"type":"voila", "effect":"death"});
        this.brain.pushTask({"type":"ring", "sound":"death-se"});
        this.brain.pushTask({"type":"motion", "change":"die"});
        this.brain.pushTask({"type":"wait", "signal":"motion-rounded"});
        this.brain.pushTask({"type":"kick", "func":"withdraw"});
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ユニットの退出時の処理を行う。
     */
    withdraw() {

        // 先にこれを取っておかないと、抜けた後では取れない。
        var stage = this.stage;

        // 素子階層から抜ける。
        this.dropoff();

        // スーパーバイザーに撤収を通知。抜けた後でないと全滅チェックがうまく働かない。
        stage.supervisor.checkGimmicks("withdraw", this);
    }
}
