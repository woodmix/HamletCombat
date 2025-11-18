/**
 * その他標準オブジェクトに対する拡張を定義するファイル。
 */

// location拡張
//=========================================================================================================

/**
 * ●第一引数のみを指定する場合
 *
 *      引数で指定されたGET変数の値を返す。引数を指定しなかった場合はすべてのGET変数を返す。
 *
 * ●第一, 第二引数を指定する場合
 *
 *      第一引数で指定されたGET変数の値を、第二引数で指定された値に一時的に書き直す。
 */
location.query = function(name, value) {

    // メンバ変数 params にデコード結果を保存する。
    if(!this.params)
        this.params = this.parse();

    if(value == undefined)
        return (name == undefined) ? this.params : this.params[name];
    else
        this.params[name] = value;
}

/**
 * 引数で指定されたクエリ文字列を解析して返す。
 * 引数を指定しなかった場合は location.search を解析する。
 */
location.parse = function(search) {

    if(search == undefined)
        search = this.search.substring(1);

    var params = {};

    var pairs = search.split('&');
    for(var i = 0, entry ; entry = pairs[i] ; i++) {

        var kv = entry.split('=');
        params[ kv[0] ] = decodeURIComponent(kv[1]);
    }

    return params;
}


// Promise拡張
//=========================================================================================================

/**
 * resolve, failure をメソッドとして持つPromiseオブジェクトを作成する。
 * Promiseを提供する機能を作ろうと思ったときに、Promiseコンストラクタの実装は使いづらすぎるので…
 */
Promise.new = function() {

    var resolver, stopper;
    var promise = new Promise( (resolve, failure) => {
        resolver = resolve;
        stopper = failure;
    });
    promise.resolve = resolver;
    promise.reject = stopper;

    return promise;
}


// Storage拡張
//=========================================================================================================

/**
 * 現在の値を全て取得する。
 *
 * @param   現在保持している全てのキーと値を含む構造体。
 */
Storage.prototype.getAll = function() {

    var result = {};

    for(var i = 0 ; i < this.length ; i++) {
        var name = this.key(i);
        result[name] = this.getItem(name);
    }

    return result;
}


// Map拡張
//=========================================================================================================
// Object で拡張している merge, deepmerge, mime, copy, clone について、Mapでも似たような機能になるようにする。

Object.defineProperty(Map.prototype, "merge", {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        Object.prototype.merge.call(this, source);

        if(source instanceof Map) {
            for(var [k, v] of source)
                this.set(k, v);
        }

        return this;
    }
});

Object.defineProperty(Map.prototype, "deepmerge", {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        Object.prototype.deepmerge.call(this, source);

        if(source instanceof Map) {
            for(var [k, v] of source) {
                if(typeof this.get(k) == "object"  &&  typeof v == "object")
                    this.get(k).deepmerge(v);
                else
                    this.set(k, v);
            }
        }

        return this;
    }
});

Object.defineProperty(Map.prototype, "mime", {
    enumerable:false,  configurable:true,  writable:true,
    value: function(source) {

        Object.prototype.mime.call(this, source);

        if(source) {
            for(var [k, v] of source)
                this.set(k, v);
        }

        return this;
    }
});

Object.defineProperty(Map.prototype, "copy", {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        var copy = new Map();
        copy.mime(this);
        return copy;
    }
});

Object.defineProperty(Map.prototype, "clone", {
    enumerable:false,  configurable:true,  writable:true,
    value: function() {

        var result = Object.prototype.clone.call(this);

        for(var [k, v] of result) {
            if(typeof v == "object")
            this.set(k, v.clone());
        }

        return result;
    }
});
