/**
 * キャンバスのCSSサイズと連動してキャンバス内部サイズを変更するシーン挙動を収めたファイル。挙動だけをまとめた FollowSceneTrait と、
 * EngageScene から派生して FollowSceneTrait をミックスインする FollowScene とが定義されている。
 *
 * この挙動をシーンに盛り込むと、キャンバスの内部サイズがユーザの手によって変化するのでそれに対応できる必要がある。
 * ゲーム世界をそのときのキャンバスの大きさの窓から覗いたように表現することになるだろう。大きなPCディスプレイでは世界全体が表示されるし、
 * 小さなスマホディスプレイではわずかな領域のみが表示されることになる。
 *
 * FollowSceneではなく一つ下のEngageSceneを使うなら、キャンバスの内部サイズは常にプログラムが指定した大きさで、固定された表示サイズ(あるいは
 * ユーザがウィンドウを調整するなどしたサイズ)へ伸縮して表示することになる。
 */

//==========================================================================================================
/**
 * 連動するための挙動をまとめたトレイト。
 * 画面上に配置された <canvas> と紐付いているシーンクラスにミックスインして利用する。
 */
class FollowSceneTrait {

    //------------------------------------------------------------------------------------------------------
    /**
     * 初期化を行う。コンストラクタなどから呼ばれておく必要がある。
     */
    initializeFollow() {

        // 前回捕捉したときのキャンバスの内部サイズ。
        this.trapSize = new Point();

        // その他初期化。基底では、内部ピクセルレシオを 2 とする。
        this.internalPixelRatio = 2;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 想定ピクセルレシオ。CSSにおけるキャンバスの大きさ(DP)1に対して、いくつのピクセルを持たせるか。
     * @1x の密度で処理するなら 1、@2x の密度で処理するなら 2 を指定する。
     */
    get internalPixelRatio() {
        return this._internalPixelRatio;
    }

    set internalPixelRatio(value) {
        this._internalPixelRatio = value;

        // キャンバス要素に反映する。
        this.followSize();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実際のピクセルレシオ。internalPixelRatio とデバイスのピクセルレシオのうち小さな方が使われる。
     */
    get canvasPixelRatio() {
        return Math.min(this.internalPixelRatio, window.devicePixelRatio);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * カップリングされているキャンバスの現在の大きさを返す。
     *
     * @return  現在の大きさをPointで。
     */
    get couplingSize() {

        return new Point(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。毎フレーム、キャンバスのCSSサイズが変わっていないかチェックする。
     */
    frame(delta = 0) {

        // 変わっていたら内部サイズ変更。
        var couplingSize = this.couplingSize;
        if( !this.trapSize.equals(couplingSize) )
            this.followSize(couplingSize);

        this.super(FollowSceneTrait.prototype.frame, delta);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * キャンバスの内部ピクセル数を、指定されたCSSサイズに合わせる。
     *
     * @param   キャンバスのCSSサイズをPointで。不明な場合は自動で取得するので省略出来る。
     */
    followSize(size) {

        this.trapSize.put(size || this.couplingSize);

        [this.canvas.width, this.canvas.height] = this.trapSize.multi(this.canvasPixelRatio);

        // 指定されたレシオと、デバイスレシオも加味した最適レシオが異なる(指定レシオよりもデバイスレシオの方が小さい)場合は、ルート要素のスケールを
        // 調整して適合するようにする。例えば、デバイスが @1x で内部は @2x なら、@1x のキャンバスを持ってルート要素を半分に縮小して辻褄を合わせる。
        // こうしているのは、デバイスレシオよりも大きな内部キャンバスを持っていても意味が無いため。
        this.scale.put(this.canvasPixelRatio / this.internalPixelRatio);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。基底の実装でも問題ないが、せっかくメンバ変数に保持しているので…
     */
    get canvasRatio() {

        return new Point(this.canvasPixelRatio);
    }
}

//==========================================================================================================
/**
 * EngageScene を継承して FollowSceneTrait をミックスインしたシーンクラス。
 */
class FollowScene extends mixin(EngageScene, FollowSceneTrait) {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画対象となる <canvas> 要素かそのid値。
     * @param   コンストラクタでエンゲージ処理も行うかどうか。
     */
    _constructor(canvas, engaging = true) {
        super._constructor(canvas, engaging);
        this.initializeFollow();
    }
}
