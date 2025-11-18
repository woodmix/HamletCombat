/**
 * 非同期にロードするファイル(リソース)のダウンロードを行うユーティリティ(リソースダウンローダー)を納めるファイル。
 * new して start()、promise でダウンロード完了を検知して、art でリソースを参照するのだか、基本的には Asset を通じて利用する。
 */

//==========================================================================================================
/**
 * 基底クラス。
 */
class AssetResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     */
    constructor(path) {

        this.path = path;

        // ロード中かどうか。終了した場合のみfalseになる。まだ開始していない場合でもtrueであることに注意。
        // complete のほうが適切？失敗したときもfalseになるからさ…
        this.loading = true;

        // ダウンロードの完了で解決、失敗で拒否されるプロミス。
        // 解決時ハンドラの引数にはダウンロードされたリソースが、拒否時ハンドラの引数にはリソースに応じたエラーオブジェクトが渡される。
        this.promise = Promise.new();

        // リソースオブジェクト。具体的には Image や Audio などだが、派生クラスによる。
        // 派生クラスのコンストラクタでは、ロード未完了の間の仮オブジェクトがなるべく設定される。
        this.art = null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ダウンロードを開始する。
     */
    start() {

        throw new Error("実装して下さい");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ダウンロードが完了したときの処理を行う。
     */
    loaded() {

        this.loading = false;

        this.promise.resolve(this.art);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ダウンロードが失敗したときの処理を行う。
     */
    failed(error) {

        this.loading = false;

        // なるべく読めるエラーメッセージを取得する。
        var description = (error instanceof Event) ? `${error.message} (${error.constructor.name})` : error;

        // コンソールにエラーを出す。
        console.warn(`リソース ${this.path} のロードに失敗しました。\n${description}`);

        // Promiseを拒否状態にする。
        this.promise.reject(error);
    }
}


//==========================================================================================================
/**
 * Image で表されるリソースのダウンローダー。
 */
class ImageResource extends AssetResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     * @param   ダウンロード後、assumedWidth, assumedHeight プロパティに倍率を適用するなら、その倍率を数値で指定する。
     */
    constructor(path, scale) {
        super(path);

        this.scale = scale;

        // リソースを作成。
        this.art = new Image();

        // ダウンロード結果を loaded, failed に接続する。
        this.art.onload = this.loaded.bind(this);
        this.art.onerror = this.failed.bind(this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。ダウンロードを開始する。
     */
    start() {

        this.art.src = this.path;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ダウンロードが完了したときの処理を行う。
     */
    loaded() {

        // コンストラクタで倍率が指定されているなら適用する。
        if(this.scale) {
            this.art.assumedWidth  *= this.scale;
            this.art.assumedHeight *= this.scale;
        }

        super.loaded();
    }
}


//==========================================================================================================
/**
 * javascriptファイルのダウンローダー。start() 時にDOMツリーの末尾に<script>タグを追加して、this.art でそのノードを指す。
 * 取得して後から参照するより、単にスクリプトを追加読み込みしたいときに使うことが多いだろう。
 */
class ScriptResource extends AssetResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     */
    constructor(path) {
        super(path);

        // <script>タグを作成。
        var script = document.createElement("script");
        script.setAttribute("src", this.path);
        script.async = false;
        script.setAttribute("onload", "this.resource.loaded()");
        script.setAttribute("onerror", "this.resource.failed(event)");

        // このオブジェクトのartプロパティは<script>ノードを指す。と同時に、<script>ノードからはこのオブジェクトを参照出来る。
        this.art = script;
        script.resource = this;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。ダウンロードを開始する。
     */
    start() {

        // DOMツリーの末尾に<script>タグの形で追加する。
        document.body.appendChild(this.art);
    }
}
