/**
 * ユニットを取り扱うステージコマンドを納める。
 * コマンド内の各キーについては art/stages.txt のコマンドに関する説明を参照。
 */

//==========================================================================================================
/**
 * ユニット取扱ステージコマンドの基底クラス。
 */
class UnitCommand extends StageCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * このコマンドが指定された先行コマンドと並列実行出来るかどうかを調べる。
     */
    checkParallelizable(command, now) {

        // 並列する場合の最低確保時間(ms)
        const interval = 200;

        // 最低確保時間が経過していないならどんなコマンドとも並列は出来ない。
        if(now < command.issuedTime + interval)  return false;

        // 一部ユニット系のコマンドとは並列出来るが...
        switch(command.constructor) {

            // 対象ユニットが重複していないことが条件になる。とりあえず対象ユニットを配列として取得。
            case MoveCommand:       // 下と同じ
            case DisappearCommand:  var doingUnits = [command.unit];                        break;
            case ActionCommand:     var doingUnits = [command.thrower, command.catcher];    break;

            // 他のコマンドとは並列出来ない。
            default:                return false;
        }

        // このコマンドの対象ユニットを取得。先行コマンドと対象ユニットが重複していないなら同時実行出来る。
        var ownUnits = [this.unit, this.thrower, this.catcher];
        return !ownUnits.some( unit => unit && doingUnits.includes(unit) );
    }
}


//==========================================================================================================
class AppearCommand extends UnitCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドを実行する。
     */
    run(stage) {

        // 指定されたユニットを出現させる。
        this.makedUnit = stage.addUnit(this.unit);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドが現在実行中かどうかを返す。
     */
    isRunning(stage) {

        // 作成されたユニットが素子階層に組み込まれ、初期化されるまでをコマンドの実行途上とする。
        return this.makedUnit.activate != nothing;
    }
}


//==========================================================================================================
class TurnCommand extends UnitCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドを実行する。
     */
    run(stage) {

        this.unit.brain.perform();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドが現在実行中かどうかを返す。
     */
    isRunning(stage) {

        return this.unit.brain.deciding;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このコマンドが指定された先行コマンドと並列実行出来るかどうかを返す。
     */
    canParallelize(command, now) {

        return this.checkParallelizable(command, now);
    }
}


//==========================================================================================================
class MoveCommand extends UnitCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドを実行する。
     */
    run(stage) {

        this.unit.moveTo(this.to);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドが現在実行中かどうかを返す。
     */
    isRunning(stage) {

        // ユニットがすべてのタスクを実行し終えているかで判断している。
        return this.unit.brain.undertaking;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このコマンドが指定された先行コマンドと並列実行出来るかどうかを返す。
     */
    canParallelize(command, now) {

        return this.checkParallelizable(command, now);
    }
}


//==========================================================================================================
class ActionCommand extends UnitCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドを実行する。
     */
    run(stage) {

        // ダメージを格納する配列を初期化。
        var damages = [];

        // 攻撃予測情報を計算する。
        var prediction = ActionCommand.calcAttackPrediction(this.thrower, this.catcher);

        // 攻撃回数分、命中判定を行ってダメージをセット。
        for(var i = 0 ; i < prediction.firecount ; i++) {
            var damage = (Math.random() < prediction.hitrate) ? Math.ceil(Math.randomSwing(prediction.damage, 0.05)) : null;
            damages.push(damage);
        }

        // 攻撃側・受け側に対応を取らせる。
        this.thrower.takeAttack(this.catcher, damages);
        this.catcher.takeImminence(this.thrower, damages);

        // HPがゼロになるようならdisappearコマンドをプッシュ。
        if(this.catcher.specs["hp"] - damages.sum() <= 0)
            this.supervisor.queue.push({type:"disappear", unit:this.catcher, reason:"die"});
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドが現在実行中かどうかを返す。
     */
    isRunning(stage) {

        // ユニットがすべてのタスクを実行し終えているかで判断している。
        return this.thrower.brain.undertaking  ||  this.catcher.brain.undertaking;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このコマンドが指定された先行コマンドと並列実行出来るかどうかを返す。
     */
    canParallelize(command, now) {

        return this.checkParallelizable(command, now);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたユニットからユニットへの攻撃予測情報を計算する。
     *
     * @param   攻撃側ユニット
     * @param   受け側ユニット
     * @return  攻撃予測情報。次のキーを含む構造体。
     *              hitrate     命中率
     *              evaderate   回避率
     *              damage      予想ダメージ(一回当たり)
     *              firecount   攻撃回数
     */
    static calcAttackPrediction(thrower, catcher) {

        // 回避率を計算。「[1/回避] の確率を [命中] 回試行して1回も当たらない」確率となる。
        var evaderate = Math.pow(1 - 1/catcher.specs.avoidance, thrower.specs.accuracy);

        // 予想ダメージを計算。基本的に攻撃力のままだが...
        var damage = thrower.specs.attack;

        // 一部の組み合わせには特効がある。
        if(thrower.unitclass == "close"  &&  catcher.unitclass == "long")  damage *= 2.70;
        if(thrower.unitclass == "long"   &&  catcher.unitclass == "mid")   damage *= 1.65;

        // あとは予想ダメージを「一回当たり」にすれば完成。
        return {
            "hitrate":1-evaderate, "evaderate":evaderate, "firecount":thrower.specs.firecount,
            "damage": Math.ceil(damage / thrower.specs.firecount),
        };
    }
}


//==========================================================================================================
class DisappearCommand extends UnitCommand {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドを実行する。
     */
    run(stage) {

        // まあ今のとこdieしかないんだけど…
        if(this.reason == "die")
            this.unit.takeDeath();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。コマンドが現在実行中かどうかを返す。
     */
    isRunning(stage) {

        // ユニットが素子階層に残っているかで判断している。
        return !!this.unit.parent;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。このコマンドが指定された先行コマンドと並列実行出来るかどうかを返す。
     */
    canParallelize(command, now) {

        return this.checkParallelizable(command, now);
    }
}
