
/**
 * 数字ビットマップを使って数値を描画する実行素子。
 * 描画する数字の桁数に従ってボディ矩形の大きさが変化する。
 *
 * 例)
 *      // インスタンスを作成。数字ビットマップは "numbers" を使用。
 *      // ピボットを指定して、素子の座標が左下に位置するようにする。
 *      var num = new NumberExecutant("numbers", new Point(0, 1));
 *
 *      // レイヤーを設定するのを忘れないように。
 *      num.layer = 10;
 *
 *      // 表示したい数値
 *      num.value = 124680;
 *
 *      // 字間を設定できる。開けるならプラス、詰めるならマイナス。
 *      num.space = -10;
 *
 *      // ピボットを後から調整する場合はボディビヘイバへ設定する。ついでにスケールも設定できる。
 *      num.behaviors.get("body").pivot.put(1, 0);  // 素子の座標が右上に位置するようにする。
 *      num.behaviors.get("body").scale.x = 2;      // 横に2倍に伸ばす。
 */
class NumberExecutant extends Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   描画に使う数字ビットマップ。Assetのキー名か、<img> や <canvas>、あるいは ImagePiece インスタンス。
     *          全ての数字が同じ幅で等間隔に並んでいる必要がある。一つ一つの数字の幅はこのイメージを /10 することで自動計算される。
     * @param   ピボットの位置を指定するPoint。描画矩形のうち素子の座標がどこに位置するかを 0.0-1.0 で表す。省略時は中央。
     * @param   描画倍率(Point)。描画イメージの倍率で指定する。半分にするなら0.5、倍サイズにするなら2.0。省略時はそのまま。
     */
    _constructor(image, pivot, scale) {
        super._constructor();

        // 表示したい数値。
        this.value = 0;

        // 字間。
        this.space = 0;

        // value がnullの場合に代替として表示する画像。
        this.missImage = null;

        // カスタムされたボディビヘイバとレンダラをセット。
        this.behaviors.set( new NumberBody(pivot, scale) );
        this.behaviors.set( new ReadableRenderer(new NumberRenderer(image)) );
    }
}


//==========================================================================================================
/**
 * NumberExecutant のボディビヘイバ。RevisionBody から派生している。
 */
class NumberBody extends RevisionBody {

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画サイズを使用イメージからではなく、宿主にセットされている数値から求めるようにする。
     */
    laydown(size) {

        // 値がnullの場合を処理しておく。
        if(this.host.value == null) {
            size = new Point(this.host.missImage.assumedWidth, this.host.missImage.assumedHeight);
            return super.laydown(size);
        }

        // 宿主にセットされている数値の文字列長を取得。
        var length = (new String(this.host.value)).length;

        // 幅を修正する。
        if(length == 0)  var width = 0;
        else             var width = size.x/10 * length + this.host.space * (length-1);

        // あとは基底に任せる。
        return super.laydown(new Point(width, size.y));
    }
}


//==========================================================================================================
/**
 * NumberExecutant のレンダラ。ImageRenderer から派生している。
 */
class NumberRenderer extends ImageRenderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * paint() をオーバーライド。
     */
    paint(context, dest, scene) {

        // 値がnullの場合を処理しておく。
        if(this.host.value == null) {
            this.host.missImage.drawTo(context, dest);
            return;
        }

        // 宿主にセットされている数値を文字列として取得。
        var value = new String(this.host.value);

        // 数字一つ当たりの幅を取得。
        var unitwidth = this.image.assumedWidth / 10;

        // 描画先の矩形幅を、描画する数値の文字数で割って、一文字当たりの描画先の幅を求める。
        var destunit = (dest.width - this.host.space * (value.length-1)) / value.length;

        // 一の位から順に描画していく。
        for(var i = value.length - 1 ; i >= 0 ; i--) {
            this.image.drawTo(context,
                new Rect(dest.left + (destunit + this.host.space) * i, dest.top, destunit, dest.height),
                new Rect(unitwidth * value[i], 0, unitwidth, this.image.assumedHeight)
            );
        }
    }
}