
/**
 * ゲーム世界を構成する一つの実行素子を表す。Unityで言うところの GameObject。
 */
class Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * 派生クラス上で、基底のコンストラクタを自由な位置で呼べるようにする。
     * 生のコンストラクタは、派生クラス上でthisを使う前に呼ばないといけないので、こうしておくと便利になる。
     */
    constructor(...args) {
        this._constructor(...args);
    }

    _constructor() {

        // この素子が存在するレイヤ。描画時やUIインタラクション時に参照される。
        this.layer = undefined;

        // この素子の位置座標。
        this.position = new Point();

        // ビヘイバーのコレクション。次の名前でセットされるビヘイバーには共通した意味が与えられている。
        //      renderer    この実行素子を描画する「レンダラ」。render() のメソッドが必要。見本は renderers.js を参照。
        //      body        この実行素子の存在領域を示す「ボディビヘイバ」。getRect() のメソッドが必要。見本は bodies.js を参照。
        //      rigid       この実行素子の当たり判定領域を示す「リジッドビヘイバ」。getRect() のメソッドが必要。見本は colliders.js の RigidBehavior を参照。
        //      interactor  この実行素子にUIインタラクションさせる「インタラクションビヘイバ」。見本は interactors.js を参照。
        // 他にも、任意のメソッドを備えたビヘイバーを自由に定義して、任意の名前を与えて管理できる。
        this.behaviors = new BehaviorLeaves(this);

        // 子実行素子のコレクション。
        this.childs = new ChildLeaves(this);

        // 親実行素子。
        this.parent = null;

        // 子孫も含めて、この素子で描画命令が必要なレイヤー番号の配列。makeTribeLayers()で更新される。
        this.tribeLayers = undefined;
    }


    // ライフサイクル・フレームサイクル関連。
    //======================================================================================================
    // 実行素子には次のようなライフサイクルメソッドがある。
    //
    //      activate    素子階層に追加されて最初のアップデードフェーズで呼ばれる。複数回追加される場合はそのたびに呼ばれる。
    //
    // また、素子階層内に存在する間、次のフレームサイクルメソッドが呼ばれ続ける。
    //
    //      update      アップデートフェーズ。移動や当たり判定などのフレームごとの処理を記述する。
    //
    //      after       アフターフェーズ。すべての素子のアップデートフェーズが終了した後に発生する。当たり判定や領域排他処理などを行う。
    //
    //      draw        ドローフェーズ。この実行素子の描画を行う。
    //                  基底ではレンダラビヘイバを使うように実装されているので、普通はこれをオーバーライドせずに、レンダラビヘイバを選択する形で
    //                  描画処理を定義する。

    //------------------------------------------------------------------------------------------------------
    /**
     * 素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト。
     */
    activate(scene) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * アップデートフェーズの処理を行う。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト。
     * @param   親の座標系において、マウスカーソルがどこにあるか(Point)。
     */
    processUpdate(scene, pointer) {

        // activate() をコール。次からは呼ばれないようにする。
        this.activate(scene);
        this.activate = nothing;

        // behaviors, childs の set() で予約されている操作を実行する。
        this.behaviors.germinate();
        this.childs.germinate();

        // マウスカーソル位置をこの素子の座標系のものに直す。
        pointer = this.getCoord(pointer);

        // インタラクションビヘイバーがあるならホバーの管理を行わせる。
        var interactor = this.behaviors.get("interactor");
        if(interactor)  interactor.watchHovering(pointer);

        // 自分のupdate()をコール。
        this.update(scene);

        // ビヘイバの処理。
        this.behaviors.leaves.values().forEach( behavior => behavior.behave(scene) );

        // 子供。
        this.childs.leaves.values().forEach( child => child.processUpdate(scene, pointer) );
    }

    /**
     * フレームごとのアップデートフェーズで呼ばれる。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト。
     */
    update(scene) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * アフターフェーズの処理を行う。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト。
     */
    processAfter(scene) {

        // 自分のafter()をコール。
        this.after(scene);

        // ビヘイバの処理。
        this.behaviors.leaves.values().forEach( behavior => behavior.stay(scene) );

        // 子供。
        this.childs.leaves.values().forEach( child => child.processAfter(scene) );
    }

    /**
     * フレームごとのアフターフェーズで呼ばれる。
     *
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト。
     */
    after(scene) {
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたすべてのレイヤーにおいて、この素子のドローフェーズ処理を呼び出す。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先とキャンバスを管理しているシーンオブジェクト
     * @param   描画したいレイヤーの配列。省略した場合は、子孫も含めてこの素子で必要なすべてのレイヤーが使われる。
     */
    drawLayers(context, scene, layers) {

        // 省略された場合は、必要なすべてのレイヤー。
        if(!layers)  layers = this.tribeLayers;

        // 昇順に並べ替えて１レイヤーずつ呼び出す。
        for( var layer of layers.sort( (a,b)=>a-b ) )
            this.processDraw(layer, context, scene);
    }

    /**
     * 指定されたレイヤーでのドローフェーズの処理を行う。
     *
     * @param   描画するべきレイヤー番号
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先とキャンバスを管理しているシーンオブジェクト
     */
    processDraw(layer, context, scene) {

        // 子孫も含めて、指定のレイヤーでの描画命令が必要ないなら即リターン。
        if( !this.tribeLayers.includes(layer) )  return;

        // 自分の位置座標を原点とする。
        context.translate(this.position.x, this.position.y);

        // 描画実行。
        this.drawFamily(layer, context, scene);

        // 原点を戻す。
        context.translate(-this.position.x, -this.position.y);
    }

    /**
     * ドローフェーズにおけるドロー実行部分。
     */
    drawFamily(layer, context, scene) {

        // 自分を描画。
        if(this.layer == layer)
            this.draw(context, scene);

        // 子供を描画。
        for(var child of this.childs.leaves.values())
            child.processDraw(layer, context, scene);
    }

    /**
     * ドローフェーズにおいて自分を描画する処理を行う。
     */
    draw(context, scene) {

        // 基底としてはレンダラビヘイバを使う。
        var renderer = this.behaviors.get("renderer");
        if(renderer)  renderer.render(context, scene);
    }


    // レイヤについて
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子が存在するレイヤ。描画時やUIインタラクション時に参照される。
     */
    get layer() {
        return this._layer;
    }

    set layer(value) {
        this._layer = value;
        this.layerChanged();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自分や、その子孫のレイヤー所属に変更があった場合に呼ばれる。
     */
    layerChanged() {

        // tribeLayers を破棄して、次の makeTribeLayers() 呼び出しで再構築するようにする。
        this.tribeLayers = undefined;

        // 親に伝播していく。
        if(this.parent)  this.parent.layerChanged();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * メンバ変数 tribeLayers を構築する。
     */
    makeTribeLayers() {

        // 初期化。
        var layers = [];

        // まずは自分のレイヤ。
        if(this.layer != undefined)  layers.push(this.layer);

        // 子供を一つずつ見ていく。
        for(var child of this.childs.leaves.values()) {

            // 子供の tribeLayers を更新して、その結果判明した必要レイヤーを吸収していく。
            if(!child.tribeLayers)  child.makeTribeLayers();
            layers.push(...child.tribeLayers);
        }

        // 重複を排除して完成。
        this.tribeLayers = layers.unique();
    }


    // 子供・階層関連。
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 親実行素子から自身を削除する。
     *
     * @param   省略可能。自身の名前が分かっているなら指定する。
     */
    dropoff(name) {

        if(this.parent)
            this.parent.childs.cut(name || this);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 自身が所属するシーンを返す。
     *
     * @return  シーンとなっている実行素子。見つからない場合は null。
     */
    getScene() {

        if(this instanceof GlassScene)  return this;

        return this.parent ? this.parent.getScene() : null;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ルート素子からこの実行素子へのパスを返す。
     *
     * @return  この実行素子へのパス。
     */
    getPath() {

        if(this.parent == undefined)  return "";

        return this.parent.getPath() + "/" + this.getId();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたIDの子実行素子を返す。
     * "/" で区切って孫以降の実行素子を返すこともできる。
     *
     * @param   子実行素子のID。"aaaa/bbbb/cccc" のように指定すれば孫なども取得できる。
     * @return  指定された子実行素子。見つからない場合は undefined。
     */
    getChild(path) {

        var cursor = this;

        for( var name of path.split("/") ) {
            cursor = cursor.childs.get(name);
            if(!cursor)  return undefined;
        }

        return cursor;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 親実行素子に何という名前で保持されているかを返す。
     *
     * @return  この実行素子の名前。親の下にない場合はnull。
     */
    getId() {

        if(!this.parent)  return null;

        return this.parent.childs.nameOf(this);
    }


    // 座標変換。
    //=========================================================================================================
    // Rectを変換した場合は虚状態になる可能性があるので、必要ならnormalizeすること。

    //------------------------------------------------------------------------------------------------------
    /**
     * 親の座標系におけるPointやRectを、この素子の座標系のものに直す。
     *
     * @param   直したいPoint, Rect
     * @return  修正後のPoint, Rect
     */
    getCoord(coord) {

        return coord.sub(this.position);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子の座標系におけるPointやRectを、親の座標系のものに直す。
     *
     * @param   直したいPoint, Rect
     * @return  修正後のPoint, Rect
     */
    parentCoord(coord) {

        return coord.add(this.position);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * キャンバス上の座標系におけるPointやRectを、この素子の座標系のものに直す。
     * この素子が素子階層に属していない場合は null を返す。
     *
     * @param   直したいPoint, Rect
     * @return  修正後のPoint, Rect。素子階層に属していない場合は null。
     */
    localCoord(coord) {

        // 自分の座標系における単位矩形が、キャンバス上の座標系ではどうなるのかを取得。
        var transform = this.globalCoord( new Rect(0, 0, 1, 1) );
        if(!transform)  return transform;

        // それを逆に適用すれば求められる。
        return coord.sub(transform.lt).divide(transform.size);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子の座標系におけるPointやRectを、キャンバス上の座標系におけるものに直す。
     * この素子が素子階層に属していない場合は null を返す。
     *
     * @param   直したいPoint, Rect
     * @return  修正後のPoint, Rect。素子階層に属していない場合は null。
     */
    globalCoord(coord) {

        coord = this.parentCoord(coord);

        switch(true) {
            case this instanceof GlassScene:    return coord;
            case !this.parent:                  return null;
            default:                            return this.parent.globalCoord(coord);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * この素子の座標系におけるPointやRectを、指定された素子のものに直す。
     * 指定された素子やこの素子が素子階層に属していない場合は null を返す。
     *
     * @param   直したいPoint, Rect
     * @param   対象となる実行素子
     * @return  修正後のPoint, Rect。どらちかが素子階層に属していない場合は null。
     */
    spinCoord(coord, target) {

        return Executant.transCoord(this, target, coord);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された素子の座標系におけるPointやRectを、この素子のものに直す。spinCoord() の逆版。
     */
    takeCoord(coord, target) {

        return Executant.transCoord(target, this, coord);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された素子の領域矩形をこの素子の座標系で取得する。比較的よくある処理なので…
     *
     * @param   対象素子
     * @return  この素子の座標系で取得した対象素子の領域矩形を表すRect。対象素子にボディビヘイバがない場合はnull。
     */
    takeBody(target) {

        var body = target.behaviors.get("body");
        if(!body)  return null;

        var result = this.takeCoord(body.getRect(), target);
        return result ? result.normalize() : result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * staticメソッド。指定された素子の座標系におけるPointやRectを、別の素子のものに直す。
     * 指定された素子が素子階層に属していない場合は null を返す。
     *
     * @param   変換元の座標系を持つ実行素子。nullを指定した場合はキャンバス上の座標系とする。
     * @param   変換先の座標系を持つ実行素子。nullを指定した場合はキャンバス上の座標系となる。
     * @param   直したいPoint, Rect
     * @return  修正後のPoint, Rect。どらちかが素子階層に属していない場合は null。
     */
    static transCoord(from, to, coord) {

        if(from) {
            coord = from.globalCoord(coord);
            if(!coord)  return coord;
        }

        if(to) {
            coord = to.localCoord(coord);
            if(!coord)  return coord;
        }

        return coord;
    }


    // その他
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 文字列化が求められたとき、参考情報も加える。デバッグ用。
     */
    toString() {

        return `[object ${this.constructor.name}]  layer: ${this.layer}  position: ${this.position.explain()}`;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された実行素子以下の階層構造を文字列で返す。デバッグ用。
     *
     * @param   [内部で使用] 現在のインデント幅。
     * @param   [内部で使用] 実行素子の名前として出力する文字列。
     */
    dump(indent, name) {

        // インデント幅初期値。
        if(indent == undefined)
            indent = 0;

        // 名前が省略されている場合は取得。
        if(name == undefined)
            name = "/" + (this.getId() || "");

        // インデント文字列を変数 pile に作成して、まずは自分を出力。
        var pile = " ".repeat(indent);
        var result = `${pile}${name} ${this}\n`;

        // 字下げして...
        pile += "    ";

        // ビヘイバーを列挙。
        for(var [mount, behavior] of this.behaviors.leaves)
            result += `${pile}-${mount} ${behavior}\n`;

        // 子供を再帰して列挙する。
        for(var [fam, child] of this.childs.leaves)
            result += child.dump(pile.length, "/" + fam);

        return result;
    }
}
