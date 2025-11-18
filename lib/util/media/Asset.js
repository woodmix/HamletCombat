
/**
 * 非同期にロードするファイル(リソース)を取り扱うユーティリティ。
 * load() や loadResource() でロードして、take() や needAs() で取得するのが基本的使い方。
 */
var Asset = {

    // 管理しているリソースの名前をキー、リソースを値とするコレクション。
    resources: new Map(),

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたリソースをすべてロードする。リソース名や種類は load() と同じロジックで決定される。
     *
     * @param   リソースのパス。複数指定可能。
     *          引数に配列が含まれる場合、その引数は第0要素がパス、第1要素が登録リソース名として解釈される。
     */
    loadAll(...args) {

        for(var arg of args)
            (arg instanceof Array) ? this.load(...arg) : this.load(arg);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたパスのリソースをロードする。リソースの種類はファイルの拡張子などで判断される。
     *
     * @param   リソースのパス。
     * @param   take() や needAs() で必要になるリソース名。省略した場合はファイルのベース名から決定される。
     * @return  作成したリソースダウンローダーを表す AssetResource インスタンス。
     */
    load(path, name) {

        // リソースダウンローダの作成と省略時の名前の取得。
        var [resource, suggest] = this.resourceFromPath(path);

        // 省略されているならその名前を使用する。
        if(name == undefined)  name = suggest;

        // 後はこちらで処理する。
        this.loadResource(resource, name);
        return resource;
    },

    /**
     * 引数で指定されたリソースパスを解析して、リソースダウンローダの作成や、リソース名の推奨を行う。
     *
     * @param   リソースのパス。
     * @return  第0要素にリソースダウンローダ、第1要素にリソース推奨名を格納した配列。
     */
    resourceFromPath(path) {

        var opts = {};

        // まずはパスを解析。
        var info = path.pathinfo();

        // ファイルベース名に含まれているオプション指定を解析する。ファイルベース名を "." で区切って後ろから見ていく。
        var aparts = info["basename"].split(".");
        for(var i = aparts.length - 1 ; 0 <= i ; i--) {

            var apart = aparts[i];

            // "x3" などの区画がある場合はイメージスケールが指定されているものと解釈する。
            var matches;
            if( matches = /^x(\d+)$/.exec(apart) ) {
                opts.scale = matches[1];

            // "4&3" などの区画がある場合はイメージアトラスの列数・行数が指定されているものと解釈する。
            }else if( matches = /^(\d+)&(\d+)$/.exec(apart) ) {
                opts.cols = matches[1];
                opts.rows = matches[2];

            // "jam" という区画がある場合はジャミングイメージが指定されているものと解釈する。
            }else if(apart == "jam") {
                opts.jam = true;

            // いずれにも該当しないならループを抜ける。
            }else {
                break;
            }
        }

        // ファイルベース名からオプション指定として処理した部分を除く。
        var name = aparts.slice(0, i+1).join(".");

        // パスの拡張子からリソース種別を推理してダウンローダーを作成する。
        switch( info["extension"].toLowerCase() ) {
            case "bmp":  case "jpg":  case "png":  case "gif":  case "svg":
                                                        var resource = new ImageResource(path, opts.scale);     break;
            case "wav":                                 var resource = new SoundResource(path);                 break;
            case "mp3":  case "ogg":                    var resource = new MusicResource(path);                 break;
            case "txt":  case "data":  case "json":     var resource = new TextResource(path);                  break;
        }

        // JSONファイルはデコードまで行う。
        if(info["extension"].toLowerCase() == "json")  resource = new JsonResource(resource);

        // ジャミングイメージが指定されている場合は復号イメージに変換する。
        if(opts.jam)  resource = new JammedResource(resource);

        // イメージアトラスの列数・行数が指定されている場合は、イメージアトラスに変換する。
        if(opts.cols && opts.rows)
            resource = new AtlasResource(resource, opts.cols, opts.rows);

        // ジャミングイメージが指定されている場合、ジャミングされていない画像がないかを先に確かめる。
        if(opts.jam) {

            // ファイル名の .jam を取り除いたパスを取得。
            var plain = "%s%s.%s".format(info.dirpath, info.basename.replace(/\.jam\b/g, ""), info.extension);

            // まずはそのパスをダウンロードしてみて、失敗したら .jam 付きをダウンロードするようにする。
            resource = new AltResource(this.resourceFromPath(plain)[0], resource);
        }

        if(!resource)  throw new Error( "リソースの種別が不明な拡張子(%s)です。".format(info["extension"]) );

        return [resource, name];
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたリソースダウンローダーを登録してダウンロードをスタートする。
     *
     * @param   リソースダウンローダーを表す AssetResource インスタンス。
     * @param   take() や needAs() で必要になるリソース名。省略は出来ない。
     * @param   同名の既存リソースがあるときに暗黙的に置き換えるかどうか。
     */
    loadResource(resource, name, replace = false) {

        // 指定されたリソースを保持する。
        this.storeResource(resource, name, replace);

        // ロードを開始。
        resource.start();
    },

    /**
     * 引数で指定されたリソースダウンローダーを登録してこのクラスで管理するようにする。
     *
     * @param   リソースダウンローダーを表す AssetResource インスタンス。
     * @param   take() や needAs() で必要になるリソース名。省略は出来ない。
     * @param   同名の既存リソースがあるときに暗黙的に置き換えるかどうか。
     */
    storeResource(resource, name, replace = false) {

        // 既存のnameを指定された場合は警告。
        if( !replace  &&  this.resources.has(name) ) {
            this.erase(name);
            console.warn(`"${name}" のリソースを置き換えました。`);
        }

        // 指定されたリソースを保持する。
        this.resources.set(name, resource);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたスクリプトをすべてロードする。
     *
     * @param   スクリプトのパス。複数指定可能。
     */
    loadScripts(...args) {

        for(var arg of args)
            (arg instanceof Array) ? this.loadScripts(...arg) : this.loadScript(arg);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたパスのスクリプトをロードする。
     *
     * @param   スクリプトのパス。
     * @return  作成したリソースダウンローダーを表す AssetResource インスタンス。
     */
    loadScript(path) {

        // リソースダウンローダを作成。
        var resource = new ScriptResource(path);

        // リソースライブラリにおける名前を決定。
        var name = "script:" + path;

        // あとは他のリソースと同じに扱うが...
        this.loadResource(resource, name);

        // ロードが完了したらライブラリから削除する。削除しなくても問題ないが、持っていても仕方ないので...
        resource.promise.then( ()=>this.erase(name) );
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * ロード中のリソースの数を保持するカウンター。
     */
    get loadingCounter() {

        var result = 0;
        for(var res of this.resources.values())
            if(res.loading)  result++;

        return result;
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在のロード作業がすべて終了したら成功するPromiseを返す。ロードの成否には関わらないので拒否されることはない。
     * 現在ロードしていない場合は直ちに成功する。
     *
     * @return  ロード作業の終了をモニタするPromise
     */
    getFinishPromise() {

        // 現在作業中のローディングをモニタするプロミスをすべて取得。
        var promises = this.getCurrentPromises();

        // 取得したすべてのプロミスを、失敗をもみ消すようにしたプロミスに変更する。
        for(var i = 0 ; i < promises.length ; i++)
            promises[i] = promises[i].catch( ()=>{} );

        return Promise.all(promises);
    },

    /**
     * getFinishPromise() と同じだが、一つでもロード作業に失敗したら直ちに失敗する。
     *
     * @return  現在ロード中のリソースすべての成功・失敗をモニタするPromise
     */
    getCompletePromise() {

        var promises = this.getCurrentPromises();

        return Promise.all(promises);
    },

    /**
     * 上二つのメソッドのヘルパ。現在ダウンロード中リソースのプロミスを配列で返す。
     * 現在ダウンロード中リソースが一つもない場合は空の配列を返す。
     */
    getCurrentPromises() {

        var result = [];
        for(var res of this.resources.values())
            if(res.loading)  result.push(res.promise);

        return result;
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたキーのリソースを返す。存在しないキーを指定した場合は undefined が返る。
     *
     * @param   リソースのキー。
     * @return  指定されたキーのリソース。<img> や <audio>、AudioBuffer など。
     */
    take(name) {

        var resource = this.resources.get(name);
        return resource ? resource.art : undefined;
    },

    /**
     * 指定されたリソースが指定されたクラスのものであればそのまま、そうでないならリソース名と解釈してその名前のリソースを返す。
     * 最終的に指定のクラスリソースが得られないならエラーになる。
     *
     * @param   指定されたクラスのオブジェクト、あるいはリソース名
     * @param   何のクラスでなければならないのか
     * @return  第一引数が指定のクラスであればそのまま、そうでないならその名前のリソース。
     */
    needAs(art, as) {

        if( art instanceof as  ||  (as == CanvasImageSource  &&  as.classof(art)) )
            return art;

        var stored = this.take(art);
        if( stored instanceof as  ||  (as == CanvasImageSource  &&  as.classof(stored)) )
            return stored;

        if(stored)  stored = stored.constructor.name;
        throw new Error(`指定された ${art} (${art.constructor.name}) は ${as.name} ではないし、その名前のリソースも ${stored} です`);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたキーのリソースを削除する。
     *
     * @param   削除したいリソースのキー。
     */
    erase(name) {

        this.resources.delete(name);
    },
}
