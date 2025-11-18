/**
 * レンダラのうち、テキストを描画するものを収めたファイル。
 */

//==========================================================================================================
/**
 * 宿主が text プロパティで持つ文字列を、宿主のpositionを起点に描画するレンダラ。
 * 宿主のボディは無視される。横揃えや縦揃えの起点はpositionのみだし、クリップなどもされない。ボディを加味したい場合はBodyTexterを使われたい。
 */
class TextRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   サイズ(px)。一行の行高さともなる。省略時は 36。
     * @param   描画時のfillStyleの値。省略時は "black"。
     * @param   行間。マイナスも可能。省略時は 0。
     * @param   フォント名。省略時は "monospace"。
     *          複数のフォントでフォールバックを組みたいときはCSSの@font-faceを使うのが良いだろう。
     */
    constructor(size, style, space, font) {
        super();

        this.size = size || 36;
        this.style = style || "black";
        this.space = space || 0;
        this.font = font || "monospace";

        // 横揃え(left, center, right)と縦揃え(top, middle, bottom)。それぞれ宿主のpositionを基準にする。
        // フォントによって(レンダリングエンジンによっても) textBaseline の効果が一定しない。例えば...
        //      ＭＳ ゴシック + top         WebKit:ばっちり                                                 Fox:ばっちり
        //      ＭＳ ゴシック + hanging     WebKit:ちょっと上が出るが標準に忠実                             Fox:ばっちり…なので標準ではない
        //      monospace + top             WebKit:上に変な隙間がある                                       Fox:英字はばっちりだが、日本語の上が出る
        //      monospace + hanging         WebKit:ばっちり…なので標準ではない。上記の隙間が生きてる？     Fox:topと変わらない
        // なので、特に小さなフォントでは valign が少しずれて描画される可能性がある。
        this.halign = "left";
        this.valign = "top";

        // 上記のような現象をどうしても調整したい場合の上下方向調整量。だが、ブラウザによってずれは異なるので「あちら立てればこちらが立たず」…
        this.yoffset = 0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアップデートフェーズで呼ばれる。
     */
    behave(scene) {

        // このクラスはテキストの解析が比較的重い。一方でそのテキストは不変な場合も多い。なので複数のキャッシュ機構が設けられる。
        // これはその有効期間処理。
        if(this._currentText != this.statementText) {
            this.textChanged();
            this._currentText = this.statementText;
        }
    }

    /**
     * テキストが変更された場合に呼ばれる。
     */
    textChanged() {

        // キャッシュを破棄する。
        this._statementLines = undefined;
        this._naturalSize = undefined;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実際に描画するテキスト。
     */
    get statementText() {

        // アタッチされていないと処理しようがない...
        if( !this.host )  return "";

        // セットし忘れているのはよくあることなので、undefined はその旨表示する。
        if(this.host.text === undefined)  return "undefined";

        // でもnullは空文字とする。
        if(this.host.text === null)  return "";

        // 基本はもちろんセットされているまま。
        return "" + this.host.text;
    }

    /**
     * statementText を改行で区切った配列。
     */
    get statementLines() {

        // よく参照されるのでキャッシュする。
        if( !this._statementLines )
            this._statementLines = this.statementText.split("\n");

        return this._statementLines;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自然な描画サイズをオーバーライド。宿主のテキストを参照して求める。
     */
    get naturalSize() {

        // 重い処理となる割に、毎フレーム参照される可能性があるし、テキストも変わらない可能性があるのでキャッシュしておく。
        if( !this._naturalSize ) {

            // 幅を求めるのに2dコンテキストが必要なのでなんとか取得する。
            var context = this.host.getScene().context;
            context.font = `${this.size}px "${this.font}"`;

            // 行ごとに幅を求めて最大値を取る。
            var widths = this.statementLines.map( (val) => context.measureText(val).width );
            var width = Math.max( ...widths )

            // 高さを求める。
            var height = this.measureHeight(this.statementLines.length);

            // これが描画サイズとなる。
            this._naturalSize = new Point(width, height);
        }

        return this._naturalSize;
    }

    /**
     * 指定された行数における描画高さを求める。
     */
    measureHeight(lines) {

        return lines * (this.size + this.space) - this.space;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * render() をオーバーライド。
     */
    render(context, scene) {

        // 描画位置を決定。とりあえずは宿主のポジションなのだが...
        var cursor = this.host.getCoord(this.host.position);

        // 縦揃えによっては、y を調節する。
        if(this.valign != "top") {

            var height = this.naturalSize.y;
            switch(this.valign) {
                case "middle":  cursor.y -= height/2;   break;
                case "bottom":  cursor.y -= height;     break;
            }
        }

        // テキストを描画。
        this.renderText(context, cursor, this.statementLines);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された位置を起点に文字列を描画する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   起点となるPoint
     * @param   描画するテキストを改行で区切った配列
     */
    renderText(context, cursor, lines) {

        cursor = cursor.clone();

        // プロパティ yoffset の反映。
        cursor.y += this.yoffset;

        // canvasコンテキストの設定。
        context.font = `${this.size}px "${this.font}"`;
        context.fillStyle = this.style;
        context.textBaseline = "top";
        context.textAlign = this.halign;

        // 一行ずつ描画する。
        for(var line of lines) {
            context.fillText(line, cursor.x, cursor.y);
            cursor.y += this.size + this.space;
        }
    }
}


//==========================================================================================================
/**
 * 宿主が text プロパティで持つ文字列をそのボディ領域に描画するレンダラ。
 * 横揃えや縦揃えがボディに対して作用するようになり、ボディ領域でのクリッピングや自動改行も行われる。
 */
class BodyTexter extends TextRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * 自動改行も加味した上での実際に描画するテキストを返す。
     *
     * @param   描画領域の幅。
     * @return  実際に描画するテキストを改行で区切った配列。
     */
    getRenderingLines(drawWidth) {

        // 重い処理となる割に、毎フレーム参照されるし、テキストも変わらない可能性があるので、幅と共にキャッシュしておく。
        if( !this._renderingLines  ||  this._drawWidth != drawWidth ) {

            // テキスト幅を求めるのに2dコンテキストが必要なのでなんとか取得する。
            var context = this.host.getScene().context;
            context.font = `${this.size}px "${this.font}"`;

            // 戻り値初期化。
            var result = [];

            // 命題となっているテキスト配列のコピーを取得。
            var lines = Array.from(this.statementLines);

            // 一行ずつ処理する。
            for(var line = lines.shift() ; line != undefined ; ) {

                // 一文字ずつ減らしながら、描画幅に収まる行先頭からの文字列を調べる。
                for(var i = 0 ;  ; i++) {

                    var s = i ? line.slice(0, -i) : line;
                    // と言っても、カラ行や最後の一文字ならOK出さないと仕方ない。
                    if(s.length <= 1)  break;

                    if(context.measureText(s).width <= drawWidth)  break;
                }

                // 描画幅に収まる行先頭からの文字列を戻り値に追加。
                result.push(s);

                // 次に処理する文字列を取得。行全体が収まったなら次の文字列、収まらなかったなら残りの文字列。
                if(i == 0)  line = lines.shift();
                else        line = line.slice(-i);
            }

            // キャッシュ。
            this._renderingLines = result;
            this._drawWidth = drawWidth;
        }

        return this._renderingLines;
    }

    /**
     * オーバーライド。テキストが変更された場合に呼ばれる。
     */
    textChanged() {
        super.textChanged();

        // 追加のキャッシュを破棄する。
        this._renderingLines = undefined;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * render() については TextRenderer でオーバーライドしている内容を迂回する必要がある。
     */
    render(context, scene) {

        return Renderer.prototype.render.call(this, context, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // 描画領域の幅から、自動改行を加味した描画テキストを取得。
        var lines = this.getRenderingLines(dest.width);

        // 描画高さを求める。
        var height = this.measureHeight(lines.length);

        // 描画位置を初期化。
        var cursor = new Point();

        // そのX軸。
        switch(this.halign) {
            case "left":    cursor.x = dest.left;       break;
            case "center":  cursor.x = dest.center;     break;
            case "right":   cursor.x = dest.right;      break;
        }

        // Y軸。
        switch(this.valign) {
            case "top":     cursor.y = dest.top;                    break;
            case "middle":  cursor.y = dest.middle - height/2;      break;
            case "bottom":  cursor.y = dest.bottom - height;        break;
        }

        // 描画先の領域でクリップを設定。
        context.save();
        context.beginPath();
        context.rect( ...dest.int().spec() );
        context.clip();

        // テキストを描画。
        this.renderText(context, cursor, lines);

        // クリップを解除。
        context.restore();
    }
}
