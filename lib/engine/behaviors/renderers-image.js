/**
 * レンダラのうち、渡されたイメージを描画するものを収めたファイル。
 */

//==========================================================================================================
/**
 * 指定されたイメージを宿主のボディ領域に描画するレンダラ。
 */
class ImageRenderer extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画するイメージ。Assetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンス。
     */
    constructor(image) {
        super();

        this.image = image;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * 描画するイメージ。
     * セットするときはAssetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンスを指定する。
     */
    get image() {
        return this._image;
    }
    set image(value) {
        this._image = Asset.needAs(value, CanvasImageSource);
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * メソッド実装。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        this.image.drawTo(context, dest);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自然な描画サイズをオーバーライド。描画するイメージの大きさとする。
     */
    get naturalSize() {

        return new Point(this.image.assumedWidth, this.image.assumedHeight);
    }
}

//=========================================================================================================
/**
 * ImageRendererと同じだが、影を同時に描画できる。
 */
class ShadowDropper extends ImageRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画するイメージ。Assetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンス。
     * @param   影を描画する位置(Point)。本体からどのくらいずらすかで指定する。
     * @param   影となるイメージ。本体を着色するだけの場合はその色指定でも可能。
     */
    constructor(image, offset = 10, shadow = "black") {
        super(image);

        this.offset = new Point(offset);
        this.shadow = CanvasImageSource.classof(shadow) ? shadow : this.image.createSilhouette(shadow);

        // 本体と影を入れ替えて描画する場合は true を指定する。
        this.exchanging = false;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。指定された領域に対して描画する。
     */
    paint(context, dest, scene) {

        // 主と従となるイメージを決定。
        var primary =   this.exchanging ? this.shadow : this.image;
        var secondary = this.exchanging ? this.image : this.shadow;

        // 先に従となるイメージを描画してから...
        var dest2 = dest.add(this.offset);
        secondary.drawTo(context, dest2);

        // 主となるイメージを描画する。
        primary.drawTo(context, dest);
    }
}

//=========================================================================================================
/**
 * 指定されたイメージを宿主のボディ領域に敷き詰めるように描画するレンダラ。
 * イメージの左上頂点が宿主の座標点に位置するように合わせられる。
 */
class TileRenderer extends ImageRenderer {

    //---------------------------------------------------------------------------------------------------------
    /**
     * paint() の実装。
     */
    paint(context, dest, scene) {

        // X, Y軸上でループに回しながらタイル状に描画していく。
        var y = Math.step(dest.top, this.image.assumedHeight);
        for( ; y < dest.bottom ; y += this.image.assumedHeight ) {

            // 描画先Y、描画元Y、描画元高さを取得。
            var dy = y;
            var sy = 0;
            var sh = this.image.assumedHeight;

            // 上端チェック。
            if( dy < dest.top ) {
                sy += dest.top - dy;
                sh -= dest.top - dy;
                dy = dest.top;
            }

            // 下端チェック。
            if( dest.bottom < dy + sh ) {
                sh = dest.bottom - dy;
            }

            // 同様にX軸について処理していく。
            var x = Math.step( dest.left, this.image.assumedWidth );
            for( ; x < dest.right ; x += this.image.assumedWidth ) {

                var dx = x;
                var sx = 0;
                var sw = this.image.assumedWidth;

                // 左端チェック。
                if( dx < dest.left ) {
                    sx += dest.left - dx;
                    sw -= dest.left - dx;
                    dx = dest.left;
                }

                // 右端チェック。
                if( dest.right < dx + sw ) {
                    sw = dest.right - dx;
                }

                // 描画。
                this.image.drawTo(context, new Point(dx, dy), new Rect(sx, sy, sw, sh));
            }
        }
    }
}


//=========================================================================================================
/**
 * 指定されたイメージを9スライスして描画するレンダラ。ImageRenderer から派生している。
 * 宿主のボディを中央エリアで描画してその周辺に残りのエリアを描画するので、実際の描画エリアはボディより大きくなる。
 */
class NineRenderer extends ImageRenderer {

    //---------------------------------------------------------------------------------------------------------
    /**
     * @param   描画するイメージ。Assetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンス。
     * @param   9スライスの左上領域のサイズをPointか、そのコンストラクタに渡せる値で。
     * @param   9スライスの右下領域のサイズをPointか、そのコンストラクタに渡せる値で。
     */
    constructor(image, ltsize, rbsize) {
        super(image);

        // この二つはメンバ変数で保持。
        this.ltsize = new Point(ltsize);
        this.rbsize = new Point(rbsize);

        // 中央エリアを描画するかどうか。
        this.centerPaint = true;
    }

    //---------------------------------------------------------------------------------------------------------
    /**
     * paint() の実装。
     */
    paint(context, dest, scene) {

        // 必要な諸元を取得する。
        var ltpoint = this.ltsize.clone();                                                              // 転送元における、左上領域の右下座標。
        var rbpoint = (new Point(this.image.assumedWidth, this.image.assumedHeight)).sub(this.rbsize);  // 転送元における、右下領域の左上座標。
        var csize = rbpoint.sub(ltpoint);                                                               // 転送元における、中央領域のサイズ。
        var borderlt = dest.lt.sub(this.ltsize);                                                        // 転送先における、左上領域の描画位置。

        // 中央エリア
        if(this.centerPaint)
            this.image.drawTo(context, dest, new Rect(ltpoint.x, ltpoint.y, csize.x, csize.y));

        // 四隅。左上から時計回り。
        this.image.drawTo(context, borderlt, new Rect(0, this.ltsize));
        this.image.drawTo(context, new Point(dest.right, borderlt.y), new Rect(rbpoint.x, 0, this.rbsize.x, this.ltsize.y));
        this.image.drawTo(context, new Point(dest.right, dest.bottom), new Rect(rbpoint, this.rbsize));
        this.image.drawTo(context, new Point(borderlt.x, dest.bottom), new Rect(0, rbpoint.y, this.ltsize.x, this.rbsize.y));

        // 四辺。左辺から時計回り。
        this.image.drawTo(context, new Rect(borderlt.x, dest.top, this.ltsize.x, dest.height), new Rect(0, ltpoint.y, this.ltsize.x, csize.y));
        this.image.drawTo(context, new Rect(dest.left, borderlt.y, dest.width, this.ltsize.y), new Rect(ltpoint.x, 0, csize.x, this.ltsize.y));
        this.image.drawTo(context, new Rect(dest.right, dest.top, this.rbsize.x, dest.height), new Rect(rbpoint.x, ltpoint.y, this.rbsize.x, csize.y));
        this.image.drawTo(context, new Rect(dest.left, dest.bottom, dest.width, this.rbsize.y), new Rect(ltpoint.x, rbpoint.y, csize.x, this.rbsize.y));
    }
}
