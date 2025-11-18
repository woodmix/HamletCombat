/**
 * 別のリソースダウンローダーによって得られたリソースを変換して別のリソースを得るダウンローダー(コンバートリソースダウンローダー)を納める。
 */

//==========================================================================================================
/**
 * コンバートリソースダウンローダーの基底クラス。
 */
class ConvertResource extends AssetResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   前提となるリソースダウンローダー。
     */
    constructor(matter) {
        super(null);

        // 前提となるリソースダウンローダー。ダウンロードが完了するとnullになる。
        this.matter = matter;

        // path プロパティは前提となるダウンローダーの値を使う。
        this.path = this.matter.path;

        // 変換して得たリソース。具体的な型は派生クラスによる。
        // 派生クラスのコンストラクタでは、ロード未完了の間の仮オブジェクトがなるべく設定される。
        this.sublimate = null;

        // 前提ダウンローダーの完了をこのクラスの loaded に接続すると同時に、このインスタンスのpromiseプロパティをそれに依存したものに変換する。
        this.promise = this.matter.promise.then( this.loaded.bind(this) );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このインスタンスからの loading プロパティ取得を、前提となるダウンローダーからの取得に転送する。
     */
    get loading() {
        return this.matter  &&  this.matter.loading;
    }
    set loading(val) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このインスタンスからの art プロパティ取得をオーバーライドして、変換後のリソースを取得出来るようにする。
     */
    get art() {
        return this.sublimate;
    }
    set art(val) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ダウンロードを開始する。
     */
    start() {

        this.matter.start();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したときの変換処理を行う。
     *
     * @param   前提ダウンローダーがダウンロードしたリソース。
     * @return  それを変換して得られたリソース。
     */
    ready(art) {

        // 基底としては特に何もしない。派生クラスはだいたいこれをオーバーライドすることになる。
        return art;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ダウンロードが完了したときの処理を行う。
     * 基底からの完全書き換え。…なので別にloadedでなくても良いんだけど、なんとなく。
     */
    loaded() {

        // ready() で派生クラスによる変換処理。
        this.sublimate = this.ready(this.matter.art);

        // 前提ダウンローダーは不要になるので解放する。
        this.matter = null;

        // これが promise の解決時引数になる。
        return this.art;
    }
}


//==========================================================================================================
/**
 * 着色されたイメージを準備するダウンローダー。
 */
class SilhouetteResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   元画像のイメージダウンローダー。
     * @param   着色する色。CanvasRenderingContext2D.fillStyle に指定出来る値。
     * @param   着色のアルファ(不透明度)の値。0.0-1.0 で指定する。省略時は1.0。
     */
    constructor(matter, color, alpha = 1.0) {
        super(matter);

        this.color = color;
        this.alpha = alpha;

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.sublimate = new Image();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // 指定された内容で着色したイメージを作成する。
        return art.createSilhouette(this.color, this.alpha);
    }
}


//==========================================================================================================
/**
 * ImageAtlas で表されるリソースのダウンローダー。
 */
class AtlasResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   アトラス画像のイメージダウンローダー。
     * @param   横に何列並べられているか。
     * @param   縦に何列並べられているか。
     */
    constructor(matter, cols, rows) {
        super(matter);

        this.cols = cols;
        this.rows = rows;

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.sublimate = new ImageAtlas(new Image(), NaN);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // イメージファイルを元に ImageAtlas を作成。
        return new ImageAtlas(art, this.cols, this.rows);
    }
}


//==========================================================================================================
/**
 * Web状にそのまま配置できないリソースを一定の規則に従って組み替えたリソース(ジャミングイメージ)のダウンローダー。
 */
class JammedResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   ジャミングイメージのダウンローダー。
     */
    constructor(matter) {
        super(matter);

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.sublimate = new Image();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // イメージファイルのジャミングを解除する。
        return JammedResource.dejamRegularly(art);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたイメージに標準的ジャミングをかける。
     *
     * @param   もとになるイメージ。
     * @return  ジャミングを掛けた後のイメージ(HTMLCanvasElement)。
     */
    static jamRegularly(image) {

        image = this.jamImage(image, "x", 3);  image = this.jamImage(image, "y", 3);
        image = this.jamImage(image, "x", 5);  image = this.jamImage(image, "y", 5);
        image = this.jamImage(image, "x", 7);  image = this.jamImage(image, "y", 7);

        return image;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたイメージの標準的ジャミングを解除する。
     *
     * @param   ジャミングを掛けた後のイメージ
     * @return  もとになったイメージ。(HTMLCanvasElement)。
     */
    static dejamRegularly(image) {

        image = this.jamImage(image, "y", 7);  image = this.jamImage(image, "x", 7);
        image = this.jamImage(image, "y", 5);  image = this.jamImage(image, "x", 5);
        image = this.jamImage(image, "y", 3);  image = this.jamImage(image, "x", 3);

        return image;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたイメージに指定の内容でジャミングをかけた画像を生成する。
     *
     * @param   もとになるイメージ。
     * @param   ジャミングの方向軸。"x" か "y" のいずれか。
     * @param   ジャミングの幅。
     * @return  ジャミングを掛けた後のイメージ(HTMLCanvasElement)。
     */
    static jamImage(image, axis, broadness) {

        // 結果となるイメージを描画をするキャンバスを作成。
        var canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext("2d");

        // 指定された方向において、指定された幅ごとに画像を入れ替える。最後の余りは後で処理する。
        var dimension = (axis == "x") ? "width" : "height";
        for(var cursor = 0 ; cursor + broadness*2 <= image[dimension] ; cursor += broadness*2) {

            if(axis == "x") {
                context.drawImage(image, cursor, 0, broadness, image.height, cursor + broadness, 0);
                context.drawImage(image, cursor + broadness, 0, broadness, image.height, cursor, 0);
            }else {
                context.drawImage(image, 0, cursor, image.width, broadness, 0, cursor + broadness);
                context.drawImage(image, 0, cursor + broadness, image.width, broadness, 0, cursor);
            }
        }

        // 最後の余りはそのまま転送。
        if(cursor < image[dimension]) {
            if(axis == "x")
                context.drawImage(image, cursor, 0, image.width - cursor, image.height, cursor, 0);
            else
                context.drawImage(image, 0, cursor, image.width, image.height - cursor, 0, cursor);
        }

        // 設定サイズを反映してリターン。
        canvas.assumedWidth =  image.assumedWidth;
        canvas.assumedHeight = image.assumedHeight;
        return canvas;
    }
}


//==========================================================================================================
/**
 * JSONファイルのダウンローダー。デコードしてオブジェクトに変換するところまで行う。
 */
class JsonResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   テキストデータのダウンローダー。
     */
    constructor(matter) {
        super(matter);

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.sublimate = new Object();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // デコード。
        return JSON.parse(art);
    }
}


//==========================================================================================================
/**
 * 複数のセクションに分けて記載されているテキストファイルのダウンローダー。
 */
class ParagraphsResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   テキストデータのダウンローダー。
     */
    constructor(matter) {
        super(matter);

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.sublimate = new Object();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // セクション別に分けておく。
        return TextUtil.splitChunks(art);
    }
}


//==========================================================================================================
/**
 * あるリソースがダウンロード不能だった場合に、代わりのリソースをダウンロードするダウンローダー。
 */
class AltResource extends ConvertResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   最初にダウンロードを試みるダウンローダー(アーリーダウンローダー)。
     * @param   それが失敗したら始動させるダウンローダー(レイターダウンローダー)。
     */
    constructor(matter, alt) {

        // アーリーダウンローダーで基底コンストラクタの処理を行う。
        super(matter);

        // レイターダウンローダーを保持しておく。
        this.alt = alt;

        // 基底のコンストラクタで作成されたプロミスはアーリーの成否しか見ていないので、新しいプロミスを作成する。
        var early = this.promise;
        this.promise = Promise.new();

        // アーリーの成否に対して...
        early.then(

            // 基底のコンストラクタで loaded へのバインドが行われているが、追加で本プロミスの解決も行う。
            () => this.promise.resolve(this.art),

            // 失敗した場合は...
            () => {

                // 前提ダウンローダーをレイターに変更してダウンロードをスタートさせる。
                this.matter = alt;
                this.alt.start();
            }
        );

        // レイターの成否に対して...
        alt.promise.then(

            // 成功した場合は loaded() の呼び出しと、本プロミスの解決。
            () => {
                this.loaded();
                this.promise.resolve(this.art);
            },

            // 失敗した場合は本プロミスの失敗とする。
            (error) => {
                this.promise.reject(error);
            }
        );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 前提ダウンローダーがリソースの準備を完了したら...
     */
    ready(art) {

        // 不要になるレイターダウンローダーを解放する。
        this.alt = null;

        return art;
    }
}
