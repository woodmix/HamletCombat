/**
 * Executant のような高機能が必要なく、かつ大量に生成しなければならない描画素子(パーティクル)を管理する実行素子(ミスト)を収める。
 * 普通はミストは有り物のクラスを使って、パーティクルでオリジナル処理を記述する。
 */

//==========================================================================================================
/**
 * ミストの基底クラス。コンストラクタにパーティクルのクラスを指定して、あとはlayerを手動でセットして使うのが普通。
 * このクラスではパーティクルの生成コールは手動になっているので、自動で行いたい場合は派生クラスを利用する。
 */
class Mistant extends Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   パーティクルのテンプレート。spawn() が基底のままの実装なら、ここに指定されたパーティクルが
     *          clone() されることによって新たなパーティクルが作成される。
     */
    _constructor(generator = null) {
        super._constructor();

        this.generator = generator;

        // 現在アクティブなパーティクルの配列。
        this.particles = [];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ドローフェーズにおいて自分を描画する処理を行う。
     */
    draw(context, scene) {

        // パーティクルを全て描画する。
        for(var i = 0, particle ; particle = this.particles[i] ; i++) {

            // 寿命が来たパーティクルは削除。
            if( particle.flow(context, scene) )
                this.particles.pop(i--);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * パーティクルを一つ生成して、管理対象として加える。
     *
     * @param   生成タイミングからの超過時間(ms)。省略時は 0。
     * @return  生成したパーティクル。
     */
    gush(excess = 0) {

        var particle = this.spawn(excess);
        this.add(particle);

        return particle;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * パーティクルを一つ生成する。複雑なパーティクル生成が必要なミストではこれをオーバーライドする。
     *
     * @param   生成タイミングからの超過時間(ms)。省略時は 0。
     * @return  生成したパーティクル。
     */
    spawn(excess = 0) {

        // 基底としてはgeneratorプロパティで指定されたパーティクルをクローンし、超過時間についてはその passed プロパティに
        // 格納するものとして処理する。
        var particle = this.generator.clone();
        particle.passed = excess;

        return particle;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたパーティクルをこのミストに追加する。
     *
     * @param   追加するParticleインスタンス。
     */
    add(particle) {

        particle.wakeup(this);

        this.particles.push(particle);
    }
}


//==========================================================================================================
/**
 * 引数で指定されたタイマーを使ってパーティクル生成を行うミスト。
 */
class ClockMistant extends Mistant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   パーティクルのテンプレート。
     * @param   パーティクルの生成間隔を管理する Clocker インスタンス。ここで指定したインスタンスがクロックを発生させるたびに gush() が呼ばれる。
     */
    _constructor(generator = null, clock = null) {
        super._constructor(generator);

        this.clock = clock;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * clockプロパティ。生成間隔を管理する Clocker インスタンスを表す。
     */
    get clock() {
        return this._clock;
    }
    set clock(value) {

        // クロッカーが変更されるときは、代入前後のクロックハンドラを連動させるようにする。

        if(this._clock)  this._clock.onclock = undefined;
        this._clock = value;
        if(this._clock)  this._clock.onclock = this.gush.bind(this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレーム毎に呼ばれる。
     */
    update(scene) {
        super.update(scene);

        if(this.clock)  this.clock.pass(scene.delta);
    }
}


//==========================================================================================================
/**
 * パーティクルパラメータのありがちなランダム初期化処理を選択的にサポートするミスト。
 * ランダム値ではなく固定値で初期化したいなら、そのように値をセットしたパーティクルをテンプレートに指定したほうが良い。
 * もっと複雑なパーティクル初期化が必要なら、オリジナルのミストクラスを作成して spawn() をオーバーライドしたほうが良いだろう。
 */
class NanaMistant extends ClockMistant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   パーティクルのテンプレート。
     * @param   パーティクルの生成間隔を管理する Clocker インスタンス。ここで指定したインスタンスがクロックを発生させるたびに gush() が呼ばれる。
     */
    _constructor(generator = null, clock = null) {
        super._constructor(generator, clock);

        // 以下に説明するプロパティを選択的に設定することで対応するパーティクルパラメータがランダム化される。
        // 設定されなかったプロパティに対応するパラメータは変更されない。
        // ランダム値で初期化することを目的としているので、設定する値はその範囲を指定するものになる。

        // this.duration    duration パラメータをランダム化する。Approxで指定する。
        // this.color       brush プロパティの color パラメータをランダム化する。配列で指定する(いずれか一つがランダムに選択される)。
        // this.size        brush プロパティの size パラメータをランダム化する。Approxで指定する。
        // this.field       offset パラメータをランダム化する。Rectで指定する(矩形内に位置する座標がランダムに選択される)。
        // this.emission    walker プロパティの dest パラメータを放射状になるようにランダム化する。
        //                  角度を angle、距離を distance キーをとして持つ構造体で指定する。どちらもApproxで指定できる。
        //                  ただ、angle を Approx にするときは ApproxFloat を使う必要があることに留意。
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。パーティクルを一つ生成する。
     */
    spawn(excess) {

        // まずは基底のメソッドでパーティクルを作成する。
        var particle = super.spawn(excess);

        // 設定されているプロパティごとに、パーティクルのパラメータを修正する。

        if(this.duration != undefined)  particle.duration = this.duration.valueOf();

        if(this.color != undefined)     particle.brush.color = (this.color instanceof Array) ? this.color.random() : this.color;
        if(this.size != undefined)      particle.brush.size = this.size.valueOf();

        if(this.field != undefined)     particle.offset = this.field.random().int();

        if(this.emission != undefined)  particle.walker.dest = Point.circle( this.emission.angle.valueOf() ).multi( this.emission.distance.valueOf() ).int();

        return particle;
    }
}
