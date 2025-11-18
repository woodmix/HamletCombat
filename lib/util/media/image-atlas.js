/**
 * 複数のイメージを一つにまとめるImageAtlasと、逆にイメージの一部を表すImagePieceを定義するファイル。
 */

//==========================================================================================================
/**
 * 特定の矩形によってクリップされたImageを表すクラス。ある程度Imageと相互運用出来るようになっている。
 */
class ImagePiece {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   イメージ。<img> や <canvas> など。文字列を指定した場合はそれをキーとしてAssetを参照して取得する。
     * @param   クリップ矩形。省略した場合は全体。
     */
    constructor(image, ...args) {

        // 文字列が指定された場合はそれをキーとしてAssetを参照する。
        image = Asset.needAs(image, CanvasImageSource);

        // クリップ矩形を取得。
        var clip = new Rect(...args);

        // 省略されている場合は全体とする。
        if(clip.width == 0) {
            clip.left = 0;              clip.top = 0;
            clip.width = image.width;   clip.height = image.height;
        }

        // それぞれメンバ変数として保持する。
        this.image = image;
        this.clip = clip;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された CanvasRenderingContext2D にこのイメージを描画する。HTMLImageElement.prototype.drawTo() に対応したもの。
     *
     * @param   描画先のCanvasRenderingContext2D
     * @param   描画先の範囲を表す Rect、あるいは左上位置を表す Point。Pointで指定した場合、サイズは描画元矩形から取得される。
     * @param   描画元矩形を表す Rect。省略した場合はこのイメージ全体が使われる。
     */
    drawTo(context, dest, src) {

        // 描画元矩形が省略されている場合はこのイメージ全体。
        if(!src)  src = new Rect(0, 0, this.assumedWidth, this.assumedHeight);

        // 描画元矩形を、本来のImageにおける矩形に直す。
        src = src.clone();
        src.lt.addInto(this.clip.lt);

        // あとは本来のImageにおける同メソッドに任せる。
        this.image.drawTo(context, dest, src);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * HTMLImageElement.prototype.createCopy() に対応したもの。
     */
    createCopy(drawer) {

        return HTMLImageElement.prototype.createCopy.call(this, drawer);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * HTMLImageElement.prototype.createSilhouette() に対応したもの。
     */
    createSilhouette(color, alpha = 1.0) {

        return HTMLImageElement.prototype.createSilhouette.call(this, color, alpha);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * width, height をエミュレーションのように取得出来るようにする。
     */
    get width() {
        return this.clip.width;
    }

    get height() {
        return this.clip.height;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * assumedWidth, assumedHeight も参照だけは出来るようにする。
     */
    get assumedWidth() {
        return this.clip.width;
    }

    get assumedHeight() {
        return this.clip.height;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * naturalWidth, naturalHeight をエミュレーションする。
     */
    get naturalWidth() {
        return this.clip.width * (this.image.naturalWidth / this.image.width);
    }
    get naturalHeight() {
        return this.clip.height * (this.image.naturalHeight / this.image.height);
    }
}


//==========================================================================================================
/**
 * 同じサイズの複数のイメージが縦横にタイル状に並べられたイメージ(アトラス)を表すクラス。
 */
class ImageAtlas {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   イメージ。<img> や <canvas> など。文字列を指定した場合はそれをキーとしてAssetを参照して取得する。
     * @param   横・縦にそれぞれ何列並べられているか。
     */
    constructor(image, ...args) {

        // 文字列が指定された場合はそれをキーとしてAssetを参照する。
        image = Asset.needAs(image, CanvasImageSource);

        // 使用するImageオブジェクト。
        this.image = image;

        // イメージピースが縦横に何枚並べられているかをPointで保持する。
        this.nums = new Point(...args);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定された箇所のイメージピースを返す。
     *
     * @param   どのピースが欲しいか。PointインスタンスやPointのコンストラクタに渡せる値で指定する。
     * @return  指定された箇所のイメージピースを表す ImagePiece オブジェクト。
     */
    piece(...args) {

        Point.normalizeArgs(args);

        // 指定されたピースを囲う矩形を作成。
        var clip = new Rect(args[0] * this.width, args[1] * this.height, this.width, this.height);

        // 該当箇所を表す ImagePiece を作成。
        return new ImagePiece(this.image, clip);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * アトラスに含まれるイメージピースすべてを配列で取得する。
     *
     * @param   どのような並び順で取得するか。次のいずれか。
     *              horizontal  左から右、次に上から下
     *              vertical    上から下、次に左から右
     * @return  イメージピースすべてを含む配列。
     */
    getAllPieces(order = "horizontal") {

        var result = [];

        switch(order) {

            case "horizontal":
                for(var y = 0 ; y < this.nums.y ; y++) {
                    for(var x = 0 ; x < this.nums.x ; x++) {
                        result.push( this.piece(x, y) );
                    }
                }
                break;

            case "vertical":
                for(var x = 0 ; x < this.nums.x ; x++) {
                    for(var y = 0 ; y < this.nums.y ; y++) {
                        result.push( this.piece(x, y) );
                    }
                }
                break;
        }

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された矩形範囲のタイルを一つのイメージピースで返す。
     *
     * @param   タイル単位での矩形範囲を表すRect。RectインスタンスやRectのコンストラクタに渡せる値で指定する。
     * @return  その範囲全体を表すImagePiece。
     */
    getAreaPiece(...args) {

        Rect.normalizeArgs(args);

        // 指定されたタイルを囲う矩形を作成。
        var clip = new Rect(args[0].x * this.width, args[0].y * this.height, args[1].x * this.width, args[1].y * this.height);

        // 該当箇所を表す ImagePiece を作成。
        return new ImagePiece(this.image, clip);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * width, height をイメージピースの大きさとして取得できるようにする。
     */
    get width() {
        return this.image.assumedWidth / this.nums.x;
    }

    get height() {
        return this.image.assumedHeight / this.nums.y;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * naturalWidth, naturalHeight をエミュレーションする。
     */
    get naturalWidth() {
        return this.image.naturalWidth / this.nums.x;
    }
    get naturalHeight() {
        return this.image.naturalHeight / this.nums.y;
    }
}
