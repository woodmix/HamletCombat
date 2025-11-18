
//=========================================================================================================
/**
 * 一定間隔ごとのタイミングを検出して処理(クロック)を行う必要があるときに利用するユーティリティクラス。
 * 経過時間は適宜手動で渡していく必要がある。
 *
 * 例) 1000ms ごとにログを出力する。
 *
 *      // 1000ms 秒毎の間隔とする。
 *      var clocker = new Clocker(1000);
 *
 *      // タイミングが来る毎にログを出す。
 *      clocker.onclock = function(delay) {
 *          console.log('hi');
 *      }
 *
 *      // あとは適宜、経過秒数を渡していく。
 *      clocker.pass(200);
 *      clocker.pass(300);
 *      clocker.pass(600);  // ここで累積が1000msになるため、"hi" と出力される。
 *      clocker.pass(600);
 *      clocker.pass(300);  // ここで累積が2000msになるため、再び "hi" と出力される。
 *      clocker.pass(2000); // クロック二回分の時間が経過したため、"hi" が二回出力される。
 */
class Clocker {

    //---------------------------------------------------------------------------------------------------------
    /**
     * 1000ミリ秒あたりクロックタイミングを何回発生させるかを指定してインスタンスを作成する。
     *
     * @param   1000ミリ秒で何回発生するか。Approxでも可。
     */
    static perMille(clocks) {

        if(clocks instanceof Approx)
            var interval = new Approx(Math.floor(1000 / clocks.max), Math.floor(1000 / clocks.min));
        else
            var interval = Math.floor(1000 / clocks);

        return new this(interval);
    }


    // インスタンスメンバ
    //======================================================================================================

    //---------------------------------------------------------------------------------------------------------
    /**
     * @param   クロックタイミングが発生する間隔(ms)。Approxでも可。
     */
    constructor(interval) {

        this.interval = interval;

        // クロックごとに呼ばれる関数。引数には超過時間が渡される。
        this.onclock = nothing;

        // 一回のタイミングでクロックをいくつ発生させるか。Approxでも可。
        this.multiplier = 1;

        // 動作中かどうか。これをfalseにすると、pass() の呼び出しを無視するようになる。
        this.active = true;

        // 動作終了時間。この時間が来ると active プロパティが false になって時間が進まなくなる。
        // 一度発動するとこのプロパティは null に戻る。
        this.stopper = null;

        // 現在までの経過時間。
        this.time = 0;

        // 次のクロックタイミングの時間。
        this.pin = interval.valueOf();
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定した時間が経過したときの処理を行う。
     *
     * @param   経過した時間(ms)
     */
    pass(delta) {

        // 動作中フラグがOFFになっているなら何もしない。
        if(!this.active)  return;

        // 経過時間を積算。
        this.time += delta;

        // ストッパーが設定されていて、その時刻が来たなら...
        if(this.stopper != null  &&  this.stopper <= this.time) {

            // 経過時間をストッパーの時間に合わせる。
            this.time = this.stopper;

            // 動作中フラグをOFFにして、ストッパーを解除する。
            this.active = false;
            this.stopper = null;
        }

        // クロックタイミングが来ている限り処理する。
        while(this.pin <= this.time) {

            // onclockを起動。
            var kicks = this.multiplier.valueOf();
            for(var i = 0 ; i < kicks ; i++)
                this.onclock(this.time - this.pin);

            // 次のクロックタイミングを得る。
            this.pin += this.next();
        }
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * メンバ変数 interval を参照して、次のクロックタイミングまでの時間を決める。
     *
     * @return  次のクロックタイミングまでの時間
     */
    next() {

        return this.interval.valueOf();
    }
}


//=========================================================================================================
/**
 * 間隔が段々遅くなっていくようにしたもの。
 */
class SlowdownClocker extends Clocker {

    //---------------------------------------------------------------------------------------------------------
    /**
     * @param   クロックタイミングが発生する間隔(ms)。Approxでも可。
     * @param   遅くなっていく速度。一タイミングごとに何ms遅くなるか。
     * @param   減速に加速度を付けたい場合は指定する。指定した場合、一タイミングごとに適用される減速加速度として作用する。
     */
    constructor(interval, downspeed, decelerate = 0) {
        super(interval);

        this.downspeed = downspeed;
        this.decelerate = decelerate;
        this.padding = 0;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。次のクロックタイミングまでの時間を決める。
     */
    next() {

        this.padding += this.downspeed;
        this.downspeed += this.decelerate;

        return this.padding + super.next();
    }
}
