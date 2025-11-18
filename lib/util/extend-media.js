/**
 * メディア関連の標準オブジェクトに対する拡張を定義するファイル。
 */

// Canvas や Image に関する拡張
//=========================================================================================================

/**
 * CanvasRenderingContext2Dに explainText プロパティを定義。テキスト描画関連の現在値を返す。デバッグ用。
 */
CanvasRenderingContext2D.prototype.explainWriting = function() {

    return `font: ${this.font}, textBaseline: ${this.textBaseline}, textAlign: ${this.textAlign}, fillStyle: ${this.fillStyle}, strokeStyle: ${this.strokeStyle}`;
}

/**
 * イメージソースに対して、本来のサイズとは違う「想定サイズ」を設定出来るようにする。未設定の場合はwidth, height がそのまま使われる。
 * drawTo() を使って描画するときに反映される。
 */
var assumedSizeProps = {
    assumedWidth: {
        enumerable:true,  configurable:true,
        set: function(val) {
            return this._assumedWidth = val;
        },
        get: function() {
            return this._assumedWidth || this.width;
        },
    },
    assumedHeight: {
        enumerable:true,  configurable:true,
        set: function(val) {
            return this._assumedHeight = val;
        },
        get: function() {
            return this._assumedHeight || this.height;
        },
    },
};
Object.defineProperties(HTMLImageElement.prototype, assumedSizeProps);
Object.defineProperties(HTMLCanvasElement.prototype, assumedSizeProps);
Object.defineProperties(SVGImageElement.prototype, assumedSizeProps);

// ついでに、HTMLCanvasElementでも HTMLImageElement と相互運用出来るように naturalWidth, naturalHeight を参照出来るようにする。
Object.defineProperties(HTMLCanvasElement.prototype, {
    naturalWidth: {
        enumerable:true,  configurable:true,
        get: function() {
            return this.width;
        },
    },
    naturalHeight: {
        enumerable:true,  configurable:true,
        get: function() {
            return this.height;
        },
    },
});

/**
 * 指定された CanvasRenderingContext2D にこのイメージを描画する。
 *
 * @param   描画先のCanvasRenderingContext2D
 * @param   描画先の範囲を表す Rect、あるいは左上位置を表す Point。Pointで指定した場合、サイズは描画元矩形から取得される。
 * @param   描画元矩形を表す Rect。省略した場合はこのイメージ全体が使われる。
 */
HTMLImageElement.prototype.drawTo = function(context, dest, src) {

    // 描画元矩形が省略されている場合はこのイメージ全体。
    if(!src)  src = new Rect(0, 0, this.assumedWidth, this.assumedHeight);

    // 描画先がRectでない場合は...
    if( !(dest instanceof Rect) ) {

        // 描画先左上が示されたと捉えてから...
        if( !(dest instanceof Point) )  dest = new Point(dest);

        // サイズは描画元矩形と同一と解釈する。
        dest = new Rect(dest, src.size);
    }

    // イメージの設定サイズと本来サイズの違いを反映する。
    src = src.multi(this.naturalWidth / this.assumedWidth, this.naturalHeight / this.assumedHeight);

    // 描画。
    context.drawImage(this, src.left, src.top, src.width, src.height, dest.left, dest.top, dest.width, dest.height);
}

SVGImageElement.prototype.drawTo =   HTMLImageElement.prototype.drawTo;
HTMLCanvasElement.prototype.drawTo = HTMLImageElement.prototype.drawTo;
HTMLVideoElement.prototype.drawTo =  HTMLImageElement.prototype.drawTo;

/**
 * このイメージと同じ大きさで同じ内容が描画されたキャンバスを作成する。
 *
 * @param   単なるコピーではなく違う内容を描画したい場合は、それを行う関数を指定する。この関数は次の引数をとる。
 *              ・作成されたキャンバスの描画コンテキスト。
 *              ・このイメージインスタンス。
 * @return  作成されたコピーキャンバス。
 */
HTMLImageElement.prototype.createCopy = function(drawer) {

    // このイメージと同じ大きさを持つキャンバスを作成。
    var canvas = document.createElement("canvas");
    canvas.width  = this.naturalWidth;
    canvas.height = this.naturalHeight;

    // その描画コンテキストを取得。
    var context = canvas.getContext("2d");

    // 引数が指定されているならそれを呼び出す。指定されていないならこのイメージの描画をコピーする。
    if(drawer)  drawer(context, this);
    else        this.drawTo(context);

    return canvas;
}

SVGImageElement.prototype.createCopy =   HTMLImageElement.prototype.createCopy;
HTMLCanvasElement.prototype.createCopy = HTMLImageElement.prototype.createCopy;
HTMLVideoElement.prototype.createCopy =  HTMLImageElement.prototype.createCopy;

/**
 * createCopy() と同じだが、着色されたコピーを作成する。
 *
 * @param   着色する色。CanvasRenderingContext2D.fillStyle に指定出来る値。
 * @param   着色のアルファ(不透明度)の値。0.0-1.0 で指定する。省略時は1.0。
 * @return  作成されたコピーキャンバス。
 */
HTMLImageElement.prototype.createSilhouette = function(color, alpha = 1.0) {

    return this.createCopy((context, image) => {

        // まずオリジナルを描画して...
        image.drawTo(context);

        // アルファと合成方法を調整して、指定色を全面描画すれば出来上がり。
        context.globalAlpha = alpha;
        context.globalCompositeOperation = "source-atop";
        context.fillStyle = color;
        context.fillRect(0, 0, image.naturalWidth, image.naturalHeight);
    });
}

SVGImageElement.prototype.createSilhouette =   HTMLImageElement.prototype.createSilhouette;
HTMLCanvasElement.prototype.createSilhouette = HTMLImageElement.prototype.createSilhouette;
HTMLVideoElement.prototype.createSilhouette =  HTMLImageElement.prototype.createSilhouette;


// Audio拡張
//=========================================================================================================

// AudioContext を統一的に使えるようにする。
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// そのインスタンスを作成しておく。
AudioContext.instance = new AudioContext();

/**
 * 引数に指定された範囲をループするようにする。
 *
 * @param   ループ終端の時間。
 * @param   ループ始端の時間。省略時は0秒。
 */
Audio.prototype.setLoop = function(until, since) {

    this.loopUntil = until;
    this.loopSince = since || 0;
    this.addEventListener("timeupdate", Audio.watchLoop, false);
    this.addEventListener("ended", Audio.watchLoop, false);
}

/**
 * setLoop() で設定されたループを解除する。
 */
Audio.prototype.unsetLoop = function() {

    this.removeEventListener("timeupdate", Audio.watchLoop, false);
    this.removeEventListener("ended", Audio.watchLoop, false);
}

/**
 * setLoop() で使われるイベントリスナ。
 */
Audio.watchLoop = function(event) {

    if(this.loopUntil <= this.currentTime)
        this.currentTime = this.loopSince + (this.currentTime - this.loopUntil);

    if(event.type == "ended")
        this.play();
}

/**
 * フェードイン・アウトを行う。
 * フェードインでの目標ボリュームは現在の volume プロパティから参照されるので、先に volume プロパティをセットしておく必要がある。
 *
 * @param   "in":イン か "out":アウト かのいずれかを指定する。
 * @param   フェードにどのくらいの時間をかけるか(ms)。
 *          フェードアウトなら現在のボリュームから 0.0 まで下がる時間。フェードインなら、0.0 から現在のボリュームに戻る時間を指定する。
 */
Audio.prototype.fade = function(direction, fadeLength = 3000) {

    // 1ms あたりのボリューム変化スピードを算出。
    this.fadeSpeed = (direction == "out" ? -1 : +1) * (this.volume / fadeLength);

    // 前回フェード時の時間を初期化。
    this.fadeReference = performance.now();

    // フェードの目標ボリュームを取得。
    this.fadeGoal = (direction == "out") ? 0.0 : this.volume;

    // フェードインはボリューム 0 から始まる。
    if(direction == "in")  this.volume = 0.0;

    // 以降は watchFade() を進行イベントリスナとして順次処理していく。
    this.addEventListener("timeupdate", Audio.watchFade, false);
}

/**
 * fade() で使われるイベントリスナ。
 */
Audio.watchFade = function(event) {

    // 前回呼び出しからの経過時間を取得。
    var now = performance.now();
    var delta = now - this.fadeReference;
    this.fadeReference = now;

    // 今回のボリューム変化量を計算。
    var slide = this.fadeSpeed * delta;

    // 上限／下限をチェックしてから新たなボリュームをセット。
    var method = (slide > 0) ? "min" : "max";
    this.volume = Math[method](this.volume + slide, this.fadeGoal);

    // 目標ボリュームになった場合は...
    if(this.volume == this.fadeGoal) {

        // イベントリスニングを解除。
        this.removeEventListener("timeupdate", Audio.watchFade, false);

        // フェードアウトした場合はストップする。
        if(this.volume == 0.0)  this.pause();
    }
}
