
/**
 * ステージ内でのギミックやコマンドの管理を行うビヘイバー(スーパーバイザー)。StageExecutantのビヘイバーとしてアタッチされる。
 */
class StageSupervisor extends Behavior {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   ギミックデータを保持する構造体。
     */
    constructor(gimmicks) {
        super();

        // 発効待ちのコマンドのキュー。
        this.queue = new CommandQueue(this);

        // 現在処理中のコマンド
        this.runningCommands = [];

        // デフォルトのギミックを追加。
        gimmicks = {
            "stage-clear": {
                "trigger": {"type":"withdraw", "union":"foe"},
                "command": {"type":"goal"}
            },
            "stage-miss": {
                "trigger": {"type":"withdraw", "union":"ally"},
                "command": {"type":"miss"}
            }
        }.merge(gimmicks);

        // ギミックを初期化する。
        this.gimmicks = {};
        for(var [name, gim] of gimmicks) {
            var gimmick = this.initializeGimmick(gim, name);
            if(gimmick)  this.gimmicks[name] = gimmick;
        }

        // 最初のコマンドをセット。シーンが開始されるまで待機する。
        this.queue.push({type:"start"});
        this.queue.push({type:"call", target:this, method:"checkGimmicks", args:["started"]});
    }

    /**
     * 引数に指定されたギミック定義を初期化する。
     */
    initializeGimmick(gim, name) {

        // ショートハンドによるテンプレートを戻り値として取得。
        var result = this.makeTemplate(gim, name);

        // 明示されているキーを上書きコピー。
        result.deepmerge(gim);

        // 名前を格納する。
        result.name = name;

        // trigger キーが文字列で指定されている場合は構造体に直す。
        if(typeof result.trigger == "string")
            result.trigger = {type:result.trigger};

        return result;
    }

    /**
     * ギミック定義のショートハンドを検査して、それに応じたギミック構造体を作成する。
     */
    makeTemplate(gim, name) {

        switch(gim.shorthand) {
//             case "scorepoint":
//                 return {
//                     "trigger": {"into":gim.pos.clone(), "unit":"player"},
//                     "ornament": "fruit",
//                     "oneshot": true,
//                     "command": {"type":"score", "value":MainScene.FRUIT, "point":gim.pos.clone()}
//                 };
//             case "cannon":
//                 return {
//                     "trigger": {"into":gim.pos.clone(), "unit":"player"},
//                     "ornament": "cannon-" + gim.dir,
//                     "command": {"type":"call", "target":name, "method":"act"}
//                 };
//             case "downstairs":
//                 return {
//                     "trigger": {"into":gim.pos.clone(), "unit":"player"},
//                     "ornament": "stair-downward",
//                     "command": {"type":"stair", "updown":"down", "port":name}
//                 }
//             case "upstairs":
//                 return {
//                     "trigger": {"into":gim.pos.clone(), "unit":"player"},
//                     "ornament": "stair-upward",
//                     "command": {"type":"stair", "updown":"up", "port":name}
//                 }
            default:
                return {};
        }
    }


    // ギミックの管理
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された条件でギミックの発動チェックを行う。
     *
     * @param   発動条件種別。art/data/stages.txt で説明する「発動条件」のtypeキーの値。
     * @param   発動条件種別に従って指定される追加の引数。
     *              type: into          移動したユニット。
     *              type: withdraw      退出したユニット。
     */
    checkGimmicks(type, arg1) {

        // ギミックを一つずつ見ていく。
        for(var [key, gimmick] of this.gimmicks) {

            // トリガー条件がないものは無視。
            var trigger = gimmick.trigger;
            if( !trigger )  continue;

            // type キーが指定のものではないなら無視。
            if(trigger.type != type)  continue;

            // 発動条件種別に従って必要になる追加のチェック。
            switch(type) {

                case "into":

                    // トリガー条件に "union" が指定されている場合、イベント起動者がその指定と一致しているかチェック。
                    if(trigger.union  &&  trigger.union != arg1.unioncode)  continue;

                    // イベント起動者の移動先のマスが "block" で指定されているマスと一致するかチェック。
                    if( !arg1.seatbox.point.equals(trigger.block) )  continue;

                    break;

                case "withdraw":

                    // トリガー条件に "unit" が指定されている場合に、退出者がそのユニットかチェック。
                    if(trigger.unit  &&  trigger.unit != arg1)  continue;

                    // トリガー条件に "tag" が指定されている場合に、退出者が該当するかチェック。
                    // if(trigger.tag  &&  !arg1.unittags.includes(trigger.tag))  continue;

                    // トリガー条件に "union" が指定されている場合に、その勢力が全滅しているかチェック。
                    if(trigger.union) {
                        var units = this.host.units;
                        if( units.find(unit => unit.unioncode == trigger.union) )  continue;
                    }

                    break;
            }

            // ここまでくればギミックを発動。
            this.igniteGimmick(key);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたキーのギミックを発動する。
     *
     * @param   ギミックのキー。
     */
    igniteGimmick(key) {

        this.fireGimmick(this.gimmicks[key]);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたギミックを発動する。
     */
    fireGimmick(gimmick) {

        // ギミックが格納しているコマンドをコマンドキューへ格納する。
        this.queue.push(gimmick.command);
    }


    // コマンドキューの管理
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * フレームごとのアップデートフェーズで呼ばれる。
     */
    behave(scene) {

        // 現在実行中コマンドの状況を見て、終了しているようならプロパティ runningCommands から削除する。
        this.runningCommands = this.runningCommands.filter( command => command.isRunning(this.host) );

        // 現在実行中のコマンドがある場合に...
        if(this.runningCommands.length > 0) {

            // 次に実行するコマンドを覗く。なかったらすることはない。
            var next = this.queue.peek();
            if(!next)  return;

            // 現在実行中コマンドと一つでも並列不可なら、コマンドが終了するまで待つ必要がある。
            var parallelizable = this.runningCommands.every( command => next.canParallelize(command, scene.time) );
            if(!parallelizable)  return;
        }

        // 以降、次のコマンドの実行。現在実行中コマンドがない、あるいは、現在コマンドと次コマンドが並列可能な場合が該当する。

        // キューの先頭に格納されているコマンドを取得してキューから削除する。
        // コマンドの実行によってキューの状態が変化するため、必ず実行の前に削除を行っておく必要がある。
        var command = this.queue.shift();
        if(!command)  return;

        // そのコマンドを実行。
        command.issue(this.host, scene.time);

        // 現在処理中のコマンドとして保持する。
        this.runningCommands.push(command);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 文字列化が求められたとき、参考情報も加える。デバッグ用。
     */
    toString() {

        var running = this.runningCommands.map(command => command.constructor.name);
        var queue = this.queue.interrupts.concat(this.queue.waitlist).map(command => command.constructor.name);

        return `${super.toString()}  running:[${running}]  queue:[${queue}]`;
    }


    // その他の処理
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたタグを持つユニットを探して、最初に見つけたものを返す。
     *
     * @param   探したいタグ
     * @return  最初に見つけた UnitExecutant。見付からなかった場合は null。
     */
    searchTaggedUnit(tag) {

        for(var unit of this.host.units)
            if( unit.unittags.includes(tag) )  return unit;

        return null;
    }
}
