/**
 * ユニットが実行すべきタスクを表すクラスを納める。これらのオブジェクトを作成するときは、直接newするよりも UnitTask.createTask() に
 * タスクを表す構造体を渡すのが普通。
 * タスク内の各キーについては art/map.txt のユニットタスクに関する説明を参照されたい。
 */

//==========================================================================================================
/**
 * ユニットタスクの基底クラス。
 */
class UnitTask {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   指示対象のUnitExecutant。
     * @param   タスクを表す構造体。
     */
    static createTask(unit, task) {

        // typeキーから、指定されたタスクを取り扱うクラスを決める。
        var classname = task.type.ucfirst() + "Task";

        // タスクオブジェクトを作成。
        return new (eval(classname))(unit, task);
    }


    // インスタンスメンバー
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   指示対象のUnitExecutant。
     * @param   タスクを表す構造体。
     */
    constructor(unit, props) {

        this.unit = unit;

        // 指定されたタスクについての情報を自身のキーとして取り込む。
        this.merge(props);

        // タスクの発効を行った時間。
        this.issuedTime = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タスクを実行する。
     *
     * @param   現在時間。タスクの開始時間として格納される。
     */
    issue(now) {

        this.issuedTime = now;
        this.run();
    }

    /**
     * タスクを処理する。
     */
    run() {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * タスクを現在実行中かどうかを返す。
     */
    isRunning() {

        // 基底としては即座に終了するものとする。
        return false;
    }
}


//==========================================================================================================
class StepTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        // 指定された方向をPointで取得。
        var vector = Point.numpad(this.dir);

        // 移動先のブロックを取得。
        var to = this.unit.walkblock.reachout(vector);
        this.unit.walkblock = to;

        // 移動器に実際の移動量をセットしてユニットにアタッチする。
        this.unit.mover.walker.dest.put( to.anchor.sub(this.unit.position) );
        this.unit.behaviors.set(this.unit.mover, "mover");

        // ユニットの描画向きの制御。
        if(vector.x > 0)    this.unit.setFaceDirection("right");
        if(vector.x < 0)    this.unit.setFaceDirection("left");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。タスクを現在実行中かどうかを返す。
     */
    isRunning() {

        // ムーバーが作動中かどうかで判断する。behaviors の予約操作まで見ているのは、ムーバーのアタッチまで１フレーム必要で、
        // 予約操作まで見ないとアタッチの瞬間が「移動終了」になってしまうため。
        return !!this.unit.behaviors.get("mover")  ||  this.unit.behaviors.buds.length > 0;
    }
}


//==========================================================================================================
class VoilaTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        // 指定されたエフェクトを再生する素子を作成。
        switch(this.effect) {
            case "swordlag":    var effect = new SwordlagExecutant();   break;
            case "gunfire":     var effect = new GunfireExecutant();    break;
            case "cannonfire":  var effect = new CannonfireExecutant(); break;
            case "slash":       var effect = new SlashExecutant();      break;
            case "shoteye":     var effect = new ShoteyeExecutant();    break;
            case "explosion":   var effect = new ExplosionExecutant();  break;
            case "death":       var effect = new DeathMist();           break;
            default:            throw new Error(`VoilaTask に指定された種別 "${this.effect}" は未定義です`);
        }

        // 自ユニットの子供素子として追加する。これは斬撃エフェクトのように、ユニットの向きに合わせる必要があるものがあるため。
        // (本当にその必要があるのかは置いておいて…)
        var pos = this.unit.getCoord(this.unit.walkblock.center);
        if(this.effect != "death") {
            effect.position.put(pos);
            this.unit.childs.setWith(effect, "effect-");

        // でも DeathMist だけは別。途中でユニット消えちゃうからね。
        }else {
            pos = this.unit.parentCoord(pos);
            effect.position.put(pos);
            this.unit.parent.childs.setWith(effect, "effect-");
        }
    }
}


//==========================================================================================================
class RingTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        if(this.sound)
            Acousmato.strikeSound(this.sound);
    }
}


//==========================================================================================================
class ValpopTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        var popper = new ValuePopper(this.value, this.sequence);
        this.unit.childs.setWith(popper, "val-");

        // ブロック右側中央を初期位置とする。
        popper.position.put(StageBlock.TIPSIZE/2, -StageBlock.TIPSIZE/2);
    }
}


//==========================================================================================================
class SpecTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        this.unit.specs[this.what] += this.slide;
    }
}


//==========================================================================================================
class MotionTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        // ユニットのモーションを変更。
        this.unit.setMotion(this.change);
    }
}


//==========================================================================================================
class WaitTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。タスクを現在実行中かどうかを返す。
     */
    isRunning() {

        // 指定されたシグナルがONになるまでを実行中とする。
        if( !this.unit.signals[this.signal] )  return true;

        // シグナルがONになるのを見たら、OFFに戻しておく。
        this.unit.signals[this.signal] = false;
        return false;
    }
}


//==========================================================================================================
class KickTask extends UnitTask {

    //------------------------------------------------------------------------------------------------------
    run() {

        if(typeof this.func == "string")  this.unit[this.func]();
        else                              this.func();
    }
}
