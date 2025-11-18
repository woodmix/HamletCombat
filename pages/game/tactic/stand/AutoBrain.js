
/**
 * 自動で行動を決定するブレイン。
 */
class AutoBrain extends UnitBrain {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   特定任務を表す構造体。ない場合は null。
     */
    constructor(mission) {
        super();

        // 特定任務の内容と、その服従度。
        this.mission = mission;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。次のアクションを決定して実行する。
     */
    perform() {

        // 思考ルーチンについては art/data/stages.txt の解説を参照。
        // まず「何をするのか」という "意思" を決定し、その後で具体的な行動を決めるという二段構えになっている。

        // 候補となる意思のリストを初期化。
        var decisions = [];

        // ステージ上に存在するユニットをすべてチェックする。
        for(var unit of this.host.stage.units) {

            // 無効なユニットはスキップ。
            if(!unit.seatblock)  continue;

            // 敵であれば、その敵を攻撃する意思をリストに追加しておく。
            if(unit.unioncode != this.host.unioncode) {

                // 標的ユニットへの最近傍箇所への移動経路を取得。
                var path = this.host.seatblock.getStarRoute(unit.seatblock, this.host);

                // 誘因ptを計算。計算出来たら意思をリストに追加しておく。
                var animus = this.thinkAnimus(unit, path);
                if(animus)
                    decisions.push({"type":"attack", "target":unit, "path":path, "weight":animus});
            }
        }

        // 特定任務の意思ptを計算して追加。
        if(this.mission) {

            // いまのとこ「随伴」しかないし、weightも固定値で考えているので...
            var unit = this.host.stage.supervisor.searchTaggedUnit(this.mission.leader);
            if(unit)  decisions.push({"type":"follow", "target":unit, "weight":3000});
        }

        // 最も重いものを選択して、実行。
        var decision = decisions.max(decision => decision.weight);
        if(decision)  this.executeDecision(decision);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定された敵への攻撃誘因ptを計算する。
     *
     * @param   攻撃対象のユニット
     * @param   対象ユニットへの最近傍箇所への移動経路。省略した場合は、射程圏に収めるために必要なターン数(無駄移動Ｔ数)を計算に入れないようになる。
     * @return  攻撃誘因pt。到達出来ない場合は 0。
     */
    thinkAnimus(unit, path) {

        // デバッグ出力を行うかどうか。
        const trace = (path != undefined) && this.host.debugs["auto_brain"];

        // 対象ユニットに攻撃した場合の命中率等を計算。
        var prediction = ActionCommand.calcAttackPrediction(this.host, unit);

        // 効果pt = 命中率 * ダメージ / 最大HP * 3700
        var weight = prediction.hitrate * prediction.damage * prediction.firecount / unit.specs["hp-max"] * 3700;

        // デバッグ出力。
        if(trace)  console.log(`対象:${unit.unitname}  命中:${prediction.hitrate}  予測ダメ:${prediction.damage*prediction.firecount}  HP-MAX:${unit.specs["hp-max"]}  効果pt:${weight}`);

        // 対象ユニットへの最近傍箇所への移動経路が示されている場合は、無駄移動Ｔ数も計算に入れる。
        if(path != undefined) {

            // 無駄移動Ｔ数を取得。到達不能だと Infinity になる。
            var turn = Math.max(0, this.getCaptureTurns(unit, path) - 1);
            if(turn == Infinity) {
                if(trace)  console.log("射程圏到達不能");
                return 0;
            }

            // 誘因pt = 効果pt / [無駄移動Ｔ数 + 1]
            weight = weight / (turn + 1);
        }

        // ヘイトを実装したら、ここでヘイト値を追加。ここではとりあえずランダム値とする。
        var hate = Math.floor( weight * Math.randomRange(-0.1, +0.1) );

        // デバッグ出力。
        if(trace)  console.log(`無駄移動Ｔ数:${turn}  誘因pt:${weight}  ヘイト:${hate}  意思pt:${weight+hate}`);

        // 誘因ptをリターン。
        return weight + hate;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたユニットを射程圏内に収めるためには何Ｔの移動が必要か。
     * 「無駄移動Ｔ数」はこの戻り値から-1した値となることに留意。だって移動した後即攻撃出来るじゃん？
     *
     * @param   攻撃対象のユニット
     * @param   そのユニットに最も近づくための経路
     * @return  何Ｔの移動で射程圏に入るか。到達不能な場合は Infinity。
     */
    getCaptureTurns(unit, path) {

        // 戻り値初期化。
        var turn = 0;

        // 現在の仮想所在ブロックを初期化。
        var focus = this.host.seatblock;

        // 指定ユニットが射程圏外である限り続ける。
        while(this.host.specs["range"] < unit.seatblock.point.sub(focus.point).manhattan) {

            // 指定された経路を移動力の分だけ辿る。
            var ref = {};
            var block = focus.tracePath(path, this.host, this.host.specs["legs"], ref);

            // 一歩も進めないなら到達は出来ないということ。
            if(ref.cursor == 0)  return Infinity;

            // ターン数を+1して、仮想所在ブロックを進行、残りのパスを辿る。
            turn++;
            focus = block;
            path = path.substr(ref.cursor);
        }

        return turn;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された意思を実践する行動を具体的に決定して実行する。
     *
     * @param   意思に関する構造体。typeキーによって構造が分岐する。いまのとこ攻撃意思しか定義されていない。次のキーを持つ。
     *              攻撃意思
     *                  type    "attack"
     *                  target  対象ユニット
     *                  path    そのユニットに最も近づくための経路
     *                  weight  意思pt
     *              随伴意思
     *                  type    "follow"
     *                  target  対象ユニット
     *                  weight  意思pt
     */
    executeDecision(decision) {

        // 移動可能なブロックをすべて取得。
        var travels = this.listTravels();

        // 意思の種別によって分岐。
        switch(decision.type) {
            case "attack":      var doing = this.fixAttackDoing(decision, travels);     break;
            case "follow":      var doing = this.fixFollowDoing(decision, travels);     break;
        }

        // 決定された行動があるなら実行する。
        if(doing)  this.executeDoing(doing);
    }

    /**
     * 攻撃意思における具体的行動を決定する。
     */
    fixAttackDoing(decision, travels) {

        // 移動可能なブロック一つ一つで、指定された意思の実践を評価していく。
        var doings = [];
        for(var travel of travels) {

            // 移動先ブロックが対象ユニットから離れていればいるほど評価は高いのだが...
            var distance = decision.target.seatblock.point.sub(travel.point).manhattan;

            // 射程圏内でないと意味が無い。
            if(distance <= this.host.specs["range"])
                doings.push({"moveto":travel, "target":decision.target, "weight":distance});
        }

        // 最も評価値の高い行動を取る。
        if(doings.length > 0)  return doings.max(doing => doing.weight);

        // 以下、攻撃出来ない場合。

        // 目標敵への経路を移動力の分だけ辿るのみだが...
        var ref = {};
        var moveto = this.host.seatblock.tracePath(decision.path, this.host, this.host.specs["legs"], ref);

        // 辿った先に別ユニットがいるならそこに移動するわけにはいかない。経路を戻りながら誰も居ないブロックを探す。
        moveto = moveto.searchVacantSeat(decision.path.substr(0, ref.cursor), this.host);

        // そのブロックで可能なすべての行動リストを取得。
        var doings = [{"moveto":moveto, "weight":0}];
        doings.push( this.getAttackingAt(moveto) );

        // 最も重みがあるものを選択する。
        return doings.max(doing => doing.weight);
    }

    /**
     * 随伴意思における具体的行動を決定する。
     */
    fixFollowDoing(decision, travels) {

        var moves = [];

        // 移動可能なブロック一つ一つで、随伴対象への距離を元に評価値を算出する。
        for(var travel of travels) {

            // 随伴対象への距離を取得。到達不能ならマンハッタン距離とする。
            var distance = travel.getMoveCost(decision.target.seatblock, this.host);
            if(distance == Infinity)  distance = travel.getManhattan(decision.target.seatblock, this.host) * 100;

            // 随伴対象から[自分の移動力+1]マス以内なら最高の固定値、それ以上離れている場合は距離が近いほど高い評価値となるようにする。
            var weight = (distance <= this.host.specs.legs + 100) ? 0 : -distance;
            moves.push({"moveto":travel, "weight":weight});
        }

        // 最も高い評価値を取得。
        var highest = moves.reduce( (accumulator, value) => Math.max(accumulator, value.weight), -Infinity );

        // 最も高い評価値を持つ移動先ブロックそれぞれにおいて、攻撃しない行動と、可能な攻撃行動をすべて列挙していく。
        // 攻撃行動は評価値が加算され、有効な攻撃ほど加算値も高い。
        var doings = [];
        for(var move of moves) {

            if(move.weight != highest)  continue;

            // まずは何もしない行動を追加。そのブロックが、護衛対象近くに居る敵に近いほど評価値が高くなるようにする。
            var deduction = 0;
            for(var unit of this.host.stage.units) {

                // 有効な敵で...
                if(unit.seatblock  &&  unit.unioncode != this.host.unioncode) {

                    // 護衛対象から8マス以内にいるなら、引数に指定されたブロックからのマンハッタン距離を減点として累積する。
                    if(decision.target.seatblock.getManhattan(unit.seatblock) < 8)
                        deduction -= unit.seatblock.getManhattan(move.moveto);
                }
            }

            // その累積をマイナスの評価値として行動データとする。
            doings.push({"moveto":move.moveto, "weight":deduction});

            // そのブロックで可能なすべての行動リストを取得。
            doings.push( ...this.getAttackingAt(move.moveto) );
        }

        // 最も重みがあるものを選択する。
        // 「移動だけで何もしない」行動はマイナスの範囲の評価値計算となっているので、「攻撃する」行動が可能ならそちらの中から選択される。
        // 攻撃可能な選択肢がない場合に毎回同じような方向のマスを選択しないよう、シャッフルを入れる。
        return doings.shuffle().max(doing => doing.weight);
    }

    /**
     * 引数に指定されたブロックを基点として可能な行動リストを作成する。
     *
     * @param   基点となるブロック
     * @return  そこから可能なすべての「行動」の配列。「行動」の構造は executeDoing() の引数として渡せるもの。
     */
    getAttackingAt(launchpad) {

        var doings = [];

        // 射程圏内のブロックをすべて取得。
        var aimables = this.listAimables(launchpad);

        // そのブロック上にいる敵ユニットを抽出。
        var targets = aimables.map(block => block.logicalUnit).filter(unit => unit && unit.unioncode != this.host.unioncode);

        // それぞれのユニットに対して攻撃効果ptを計算しながら、攻撃行動を選択肢として追加していく。
        for(var target of targets)
            doings.push({"moveto":launchpad, "target":target, "weight":this.thinkAnimus(target)});

        return doings;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定された行動を実行する。
     *
     * @param   行動構造体。次のキーを持つ。
     *              moveto  移動先のStageBlock
     *              target  攻撃対象ユニット。攻撃しない場合は null。
     *              weight  重み
     */
    executeDoing(doing) {

        var stagequeue = this.host.stage.supervisor.queue;

        // タップされたブロックへ移動する。
        stagequeue.push({"type":"move", "unit":this.host, "to":doing.moveto});

        // 攻撃を行っている場合はそれを表すステージコマンドもプッシュする。
        if(doing.target)
            stagequeue.push({type:"action", thrower:this.host, catcher:doing.target});
    }
}
