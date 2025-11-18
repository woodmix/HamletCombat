/**
 * リソースのダウンローダーにXMLHttpRequestを使うダウンローダーを納める。
 */

//==========================================================================================================
/**
 * 基底クラス。
 */
class FetchResource extends AssetResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     * @param   レスポンスの種別。XMLHttpRequest のプロパティ responseType に渡す値。
     */
    constructor(path, fetchType) {
        super(path);

        this.fetchType = fetchType;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ダウンロードを開始する。
     */
    start() {

        // リクエスト。
        var request = new XMLHttpRequest();
        request.open("GET", this.path, true);
        request.responseType = this.fetchType;
        request.send();

        // そもそもWebサーバに接続出来ない場合。
        request.onerror = this.failed.bind(this);

        // レスポンスを得たなら...
        request.onload = ()=>{

            // 404 とか 503 とか。
            if(Math.floor(request.status / 100) != 2) {
                this.failed(`${request.status} ${request.statusText}`);
                return;
            }

            // 成功したなら parseResponse() をコール。
            if( this.parseResponse(request.response) )
                this.loaded();
        };
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * XMLHttpRequest の処理が完了してレスポンスが得られたら呼ばれる。
     *
     * @param   XMLHttpRequest によって得られたレスポンス。XMLHttpRequest のプロパティ response の値。
     * @return  プロパティ art の準備が完了したかどうか。trueを返せば自動で loaded() が呼ばれるが、返さない場合は手動で呼ぶ必要がある。
     */
    parseResponse(response) {

        throw new Error("実装して下さい");
    }
}


//==========================================================================================================
/**
 * AudioBuffer で表されるリソースのダウンローダー。
 */
class SoundResource extends FetchResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     */
    constructor(path) {
        super(path, "arraybuffer");

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.art = AudioContext.instance.createBuffer(1, 1, 22050);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。XMLHttpRequest の処理が完了してレスポンスが得られたら呼ばれる。
     */
    parseResponse(response) {

        // レスポンスをデコードして AudioBuffer を得る。
        AudioContext.instance.decodeAudioData(response).then(

            // 成功した場合。
            (buffer) => {
                this.art = buffer;
                this.loaded();
            },

            // 失敗した場合。
            this.failed.bind(this)
        );
    }
}


//==========================================================================================================
/**
 * Audio で表されるリソースのダウンローダー。ストリーミングにならないようにレスポンスをまるごと blob で取得する。
 */
class MusicResource extends FetchResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     */
    constructor(path) {
        super(path, "blob");

        // リソースを作成。
        var music = new Audio();
        music.setAttribute("loop", "loop");

        this.art = music;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。XMLHttpRequest の処理が完了してレスポンスが得られたら呼ばれる。
     */
    parseResponse(response) {

        // blob URL を得てAudioインスタンスにセット。
        this.art.src = URL.createObjectURL(response);

        // まあ一応 canplaythrough イベントを待ちましょうか...
        this.art.oncanplaythrough = ()=>{

            // Audioの canplaythrough はなんか知らんが複数回実行されるときがある…
            this.art.oncanplaythrough = undefined;

            this.loaded();
        }
    }
}


//==========================================================================================================
/**
 * String で表されるリソースのダウンローダー。
 */
class TextResource extends FetchResource {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   リソースのパス。
     */
    constructor(path) {
        super(path, "text");

        // ロード未完了の間の仮オブジェクトを設定しておく。
        this.art = new String();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。XMLHttpRequest の処理が完了してレスポンスが得られたら呼ばれる。
     */
    parseResponse(response) {

        // 取得した文字列を String オブジェクトとして得る。
        this.art = new String(response);
        return true;
    }
}
