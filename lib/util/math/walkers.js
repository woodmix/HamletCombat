/**
 * 与えられた移動の定義に従って、任意の時間における位置を取得するユーティリティ「ウォーカー」を定義するファイル。
 *
 * 例1) 原点から座標 [200,200] に等速で移動する場合の、進行率30%における位置を取り出す。
 *
 *      // 直線軌道ウォーカーの作成。
 *      var walker = new LineWalker({dest:new Point(200, 200)});
 *
 *      // 進行率30%における位置を取り出す。
 *      var position = walker.walk(0.3);    // 60,60
 *
 * 例2) 補間器を調整してイーズインするようにする。
 *
 *      // polator を指定する。例1のように省略した場合は LinearPolator が使われる。
 *      var walker = new LineWalker({dest:new Point(200, 200), polator:new EaseinPolator()});
 *
 *      // 最初は速く、徐々に減速していく。
 *      var position = walker.walk(0.1);    //  54.2,  54.2
 *      var position = walker.walk(0.2);    //  97.6,  97.6
 *      var position = walker.walk(0.3);    // 131.4, 131.4
 *      var position = walker.walk(0.4);    // 156.8, 156.8
 *      var position = walker.walk(0.5);    // 175.0, 175.0
 *      var position = walker.walk(0.6);    // 187.2, 187.2
 *      var position = walker.walk(0.7);    // 194.6, 194.6
 *      var position = walker.walk(0.8);    // 198.4, 198.4
 *      var position = walker.walk(0.9);    // 199.8, 199.8
 *
 * 例3) 進行率が0%～100%から外れている場合もそれに応じた位置が返されるが、補間器を指定することで様々な調整が出来る。
 *
 *      // ストップする。
 *      var walker = new LineWalker({dest:new Point(200, 200), polator:new StopPolator()});
 *      var position = walker.walk(1.3);    // 200,200
 *      var position = walker.walk(-0.3);   // 0,0
 *
 *      // ピンポンのように行ったり来たりする。
 *      var walker = new LineWalker({dest:new Point(200, 200), polator:new PingpongPolator()});
 *      var position = walker.walk(1.1);    // 180,180
 *      var position = walker.walk(-0.1);   // 20,20
 *
 *      // ループする。
 *      var walker = new LineWalker({dest:new Point(200, 200), polator:new LoopPolator()});
 *      var position = walker.walk(1.2);    // 40,40
 *      var position = walker.walk(-0.2);   // 160,160
 */

//==========================================================================================================
/**
 * ウォーカーの基底クラス。普通は派生クラスを利用する。
 * このクラスのままだと、point() が進行率に関わらず不動の座標を返す実装になっているので、位置が動かないウォーカーとなる。
 */
class Walker {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   移動を定義する連想配列。必要なキーは派生クラスごとに定めがあるが、以下のキーは共通して使える。
     *              polator     walk() 呼び出し時に指定された進行率を調整する補間器。
     *                          補間器のインスタンスかクラス名で指定する。クラス名を指定する場合は "LinearPolator" なら "linear" とする。
     *
     *          ここで指定されたキーはインスタンスのプロパティとして参照できる。
     *              例)
     *                  var walker = new LineWalkder({dest:new Point(100, 100), polator:"easein"});
     *                  console.log(walker.dest);       // Point(100, 100)
     *                  console.log(walker.polator);    // EaseinPolator
     */
    constructor(definition) {

        // 指定されたキーを保持する。
        this.merge(definition || {});

        // 補間器の指定を正規化する。
        this.polator = Interpolator.normalize(this.polator);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された進行率における位置を取り出す。
     *
     * @param   進行率。0%を0.0、100%を1.0で表現する。
     * @return  指定された進行率における位置(Pointオブジェクト)。
     */
    walk(progress) {

        // 指定された進捗率に補間器を適用。
        progress = this.polator.elicit(progress);

        // 適用後の進行率における位置を取得。
        return this.point(progress);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された進行率における位置を返す。polator による操作は加味しない。
     *
     * @param   進行率。
     * @return  指定された進行率における位置(Pointオブジェクト)。
     */
    point(progress) {

        // 基底では進行率に関わらず不動の座標を返すので、このウォーカーは位置が動かないウォーカーとなる。
        return Point.ZERO;
    }
}


//==========================================================================================================
/**
 * 直線軌道を処理するウォーカー。
 */
class LineWalker extends Walker {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   基底が定めるプロパティに加えて以下のキーを指定できる。
     *              dest    進行率1.0における座標。Pointかそのコンストラクタに渡せる値で指定する。
     */
    constructor(definition) {
        super(definition);

        this.dest = new Point(this.dest);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された進行率における位置を返す。
     */
    point(progress) {

        return this.dest.multi(progress);
    }
}


//==========================================================================================================
/**
 * 真円軌道を処理するウォーカー。
 */
class ArcWalker extends Walker {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   基底が定めるプロパティに加えて以下のキーを指定する。
     *              center  中心座標(Point)。原点からこの点への距離が半径となる。
     *              rotate  終端における始端からの回転角度。時計回りならプラス、反時計回りならマイナスで指定する。
     */
    constructor(definition) {
        super(definition);

        // 原点から中心点への距離が半径となる。
        this.radius = this.center.distance;

        // 中心から見たときの原点の角度を求める。
        this.angle = this.center.multi(-1).angle;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された進行率における位置を返す。
     */
    point(progress) {

        // 指定された進行率における角度を取得。
        var angle = this.angle + (this.rotate * progress);

        // その角度における単位円上の座標を取得して、半径・中心点から戻り値となる座標を取得する。
        return Point.circle(angle).multi(this.radius).add(this.center);
    }
}


//==========================================================================================================
/**
 * X, Y 座標を独立したルールで取得して組み合わせるウォーカー。
 */
class AxisWalker extends Walker {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   基底が定めるプロパティに加えて以下のキーを指定する。
     *              x       X座標。固定値か補間器を指定する。
     *              x_apex  x に補間器を指定したとき、それが1.0を返すときのX座標を指定する。
     *              y       同様にY座標。
     *              y_apex
     */
    constructor(definition) {

        // 各プロパティのデフォルト値を指定された値で上書きする。
        definition = {x:0, x_apex:1, y:0, y_apex:1}.merge(definition);

        // 補間器の指定を正規化する。
        if(typeof definition.x == "string")  definition.x = Interpolator.normalize(definition.x);
        if(typeof definition.y == "string")  definition.y = Interpolator.normalize(definition.y);

        super(definition);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された進行率における位置を返す。
     */
    point(progress) {

        var x = (this.x instanceof Interpolator) ? this.x.elicit(progress) * this.x_apex : this.x;
        var y = (this.y instanceof Interpolator) ? this.y.elicit(progress) * this.y_apex : this.y;

        return new Point(x, y);
    }
}


//==========================================================================================================
/**
 * 他のウォーカーを直列に並べて進行率によって切り替えながら軌道を決定するウォーカー。
 *
 * 基本的には次のように、他のウォーカーのインスタンスをパラメータとするのだが…
 *
 *      var walker = new CoalesceWalker({
 *          rail: {
 *
 *              // 33%までは右に100px移動。
 *               33: new LineWalker({dest:new Point(100, 0)}),
 *
 *              // 次に66%までは下に100px移動。
 *               66: new LineWalker({dest:new Point(0, 100)}),
 *
 *              // 最後に左に100px移動。
 *              100: new LineWalker({dest:new Point(-100, 0)})
 *          }
 *      });
 *
 * 次のように他のウォーカーのパラメータのみでも初期化できる。ウォーカーのクラス名は "type" プロパティで指定する。
 *
 *      var walker = new CoalesceWalker({
 *          rail: {
 *               33: {type:"line", dest:new Point(100, 0)},
 *               66: {type:"line", dest:new Point(0, 100)},
 *              100: {type:"line", dest:new Point(100, 0)}
 *          }
 *      });
 *
 * ちなみに、直線軌道であれば "dest" となる座標だけで指定できる。
 *
 *      var walker = new CoalesceWalker({
 *          rail: {
 *               33: new Point(100, 0),
 *               66: new Point(0, 100),
 *              100: new Point(100, 0)
 *          }
 *      });
 *
 * このウォーカーを入れ子にすることもできる。
 *
 *      var walker = new CoalesceWalker({
 *          polator: "pingpong",
 *          rail: {
 *               20: {type:"line", dest:new Point(200, 200)},
 *               80: {
 *                  type: "coalesce",
 *                  polator: "easein",
 *                  rail: {
 *                       33: {type:"line", dest:new Point(200, 0)},
 *                       66: {type:"line", dest:new Point(0, 200)},
 *                      100: {type:"line", dest:new Point(200, 0)},
 *                  },
 *              },
 *              100: {type:"line", dest:new Point(200, 200)},
 *          },
 *      });
 *
 * 始端(0%)や終端(最後に指定されているキー)を超えた進捗率も処理出来る。次のようになる。
 *
 *      var walker = new CoalesceWalker({
 *          rail: {
 *               33: new Point(100, 0),
 *               66: new Point(0, 100),
 *              100: new Point(100, 0)
 *          }
 *      });
 *
 *      console.log( walker.walk(-0.2) );   // -60.60, 0
 *      console.log( walker.walk(-0.1) );   // -30.30, 0
 *      console.log( walker.walk( 0.0) );   //   0.00, 0
 *      console.log( walker.walk( 0.1) );   //  30.30, 0
 *      console.log( walker.walk( 0.2) );   //  60.60, 0
 *
 *      console.log( walker.walk(0.8) );    //  58.82, 100.00
 *      console.log( walker.walk(0.9) );    //  29.41, 100.00
 *      console.log( walker.walk(1.0) );    //   0.00, 100.00
 *      console.log( walker.walk(1.1) );    // -29.41, 100.00
 *      console.log( walker.walk(1.2) );    // -58.82, 100.00
 *
 * 始端にマイナスの値を指定することもできるが...
 *
 *      var walker = new CoalesceWalker({
 *          rail: {
 *            "-50": new Point( 50, 0),
 *               50: new Point(100, 0),
 *          }
 *      });
 *
 *      console.log(" 0.2: " + walker.walk( 0.2) );    // 120, 0
 *      console.log(" 0.1: " + walker.walk( 0.1) );    // 110, 0
 *      console.log(" 0.0: " + walker.walk( 0.0) );    // 100, 0
 *      console.log("-0.1: " + walker.walk(-0.1) );    //  90, 0
 *      console.log("-0.2: " + walker.walk(-0.2) );    //  80, 0
 *
 * この場合、始端より前の進捗率は未定義となる。
 *
 *      console.log("-0.3: " + walker.walk(-0.3) );    //  70, 0
 *      console.log("-0.4: " + walker.walk(-0.4) );    //  60, 0
 *      console.log("-0.5: " + walker.walk(-0.5) );    //  50, 0
 *      console.log("-0.6: " + walker.walk(-0.6) );    //  60, 0
 *      console.log("-0.7: " + walker.walk(-0.7) );    //  70, 0
 */
class CoalesceWalker extends Walker {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   基底が定めるプロパティに加えて以下のキーを指定する。
     *              rail    直列に並べる他のウォーカーか、そのパラメータ。
     *                      キーに、そのウォーカーが何パーセントまでを支配するのかを示す。
     */
    constructor(definition) {
        super(definition);

        // "rail" に指定されたキーを一つずつ見ていく。
        for(var k in this.rail) {

            // ウォーカーでないならば…
            if( !(this.rail[k] instanceof Walker) ) {

                // 一旦パラメータを取得。
                var params = this.rail[k];

                // 座標のみで指定されているならば直線軌道のウォーカーを使う。
                if(params instanceof Point  ||  params instanceof Array)
                    params = {"type":"line", "dest":params};

                // ウォーカーの正確なクラス名を取得。
                var type = params.type.ucfirst() + "Walker";
                delete params.type;

                // ウォーカー作成。
                this.rail[k] = new (eval(type))(params);
            }
        }

        // 各ウォーカーの開始地点を start プロパティとして格納しておく。
        var start = Point.ZERO;
        for(var step of this.rail.keys().numsort()) {

            this.rail[step].start = start;

            // 次のウォーカーの開始地点とするため、1.0の時の座標を取得しておく。
            start = this.rail[step].walk(1.0).add(start);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された進行率における位置を返す。
     */
    point(progress) {

        // 例外処理。指定された内部ウォーカーが一つも無い場合は原点を示す。
        if(this.rail.length == 0)  return Point.ZERO;

        // 進行率をパーセンテージに直す。
        progress = progress * 100;

        // 指定の進行率が含まれるエントリのキーを取得する。
        var [prev, next] = this.getStepBound(progress);

        // そのエントリがカバーしている進行率の幅を取得。
        var width = next - prev;

        // その幅において、指定された進行率は何パーセント進行したものかを取得。
        var rate = (width == 0) ? 1.0 : (progress - prev) / width;

        // 該当のウォーカーから座標を得る。
        var worker = this.rail[next];
        return worker.walk(rate).add(worker.start);
    }

    /**
     * メンバ変数 rail に含まれているキーから、指定の進行率が含まれるステップの両端のキーを返す。
     */
    getStepBound(progress) {

        // キーの一覧を数値順として取得。
        var steps = this.rail.keys().numsort();

        // 最初のキーを 0 として、キーを一つずつ見ていく。
        var prev = 0;
        for(var next of steps) {

            // 指定の進行率を超えるキーを見つけた時点で抜ける。
            if(progress <= next)  break;

            // 直前のキーとして覚えておく。
            prev = next;
        }

        // 最後のキーまで見て
        if(prev == next)
            return (steps.length == 1) ? [0, steps[0]] : steps.slice(-2);
        else
            return [prev, next];
    }
}
