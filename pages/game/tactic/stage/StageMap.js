
/**
 * ステージのマップの管理を行うビヘイバー(マップマネージャー)。レンダラとしても機能する。StageExecutantのビヘイバーとしてアタッチされる。
 */
class StageMap extends Renderer {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   マップとして参照するリージョンの名前。
     */
    constructor(region) {
        super();

        // マップデータを取得。
        var data = Asset.needAs(region, Object);

        // 使用するチップのマスタを作成。各チップマスタは以下のプロパティを持つ。
        //      cragginess  通常移動コスト。9999は踏み込み不可を表す。
        //      image       チップ画像を表す ImagePiece インスタンス。
        //      ornament    地上物の基点になっている場合にセットされる。
        //          offset      左上チップまでのオフセット
        //          image       地上物全体を表す ImagePiece インスタンス
        this.tips = RegionParser.buildTipMaster(data);

        // blocks プロパティを作成。第一次元にY、第二次元にXを取って各ブロックを格納する二次元配列。
        this.blocks = RegionParser.buildRegionBlocks(data, this);

        // マークされているブロックの配列と、マーク状態を保持するコレクション。
        this.markedBlocks = [];
        this.states = {};

        // マーカーを表示するときに参照するアニメーション周期タイマー。
        this.tweentime = 0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * マップの縦横ブロック数をPointで表す。
     */
    get largeness() {

        return new Point(this.blocks[0].length, this.blocks.length);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された位置のブロックを返す。
     *
     * @param   データが欲しいブロックの位置。Point に変換可能な値で指定する。
     * @return  StageBlock インスタンス。マップ範囲外のブロックを指定された場合は undefined。
     */
    getBlock(...point) {

        point = new Point(...point);

        return this.blocks[ point.y ] && this.blocks[ point.y ][ point.x ];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定された矩形が含まれるブロックの範囲を返す。
     *
     * @param   矩形。Rectインスタンス。
     * @return  矩形が含まれるブロックの範囲。Rectインスタンス。
     */
    getArea(rect) {

        var result = rect.grid(StageBlock.TIPSIZE);

        return result.intersect(new Rect(0, this.largeness));
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定された番号のチップ情報を返す。
     *
     * @param   チップの番号
     * @return  該当チップのマスタ情報。前出のコメントを参照。
     */
    getTip(tipno) {

        return this.tips[tipno];
    }


    // マーカーの管理
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された複数のブロックに、指定されたマークを設定する。
     *
     * @param   マーカーを表示したい StageBlock の配列。
     * @param   設定したいマーク、または色。
     */
    setBlocksMarker(blocks, mark) {

        // 指定されたマークをブロックに適用。
        for(var block of blocks)
            block.setMarker(mark);

        // マークされたブロックを覚えておく。
        this.markedBlocks = this.markedBlocks.concat(blocks).unique();

        // アニメーション周期タイマーをリセット。
        this.tweentime = 0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * マーカーをすべてクリアする。
     */
    clearBlockMarkers() {

        for(var block of this.markedBlocks)
            block.clearMarkers();

        this.markedBlocks.length = 0;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 現在のマーカー設定を指定された名前で保存する。
     *
     * @param   保存名。
     */
    saveMarkerState(name) {

        var state = new Map();

        for(var block of this.markedBlocks)
            state.set(block, block.marks.copy());

        this.states[name] = state;
    }

    /**
     * 現在のマーカー設定を放棄して、指定された名前で保存されたマーカー設定を復元する。
     *
     * @param   保存名。
     */
    restoreMarkerState(name) {

        this.clearBlockMarkers();

        for(var [block, marks] of this.states[name]) {
            block.marks = marks.copy();
            this.markedBlocks.push(block);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 保存されたマーカー設定をすべてクリアする。
     */
    clearMarkerStates() {

        this.states = {};
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアップデートフェーズで呼ばれる。
     */
    behave(scene) {

        // マーカーのアニメーション周期タイマーを管理。
        this.tweentime += scene.delta;
    }


    // 経路探索等
    //======================================================================================================

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定されたブロック位置の周辺のブロックを配列で返す。
     *
     * @param   基準の位置を表すPoint。
     * @param   基準からいくつ離れたブロックが必要か。
     * @return  指定された位置から指定の距離をもつブロックの配列。マップの範囲を超えるブロックは返されない。
     *
     * 例1) 次の位置を基準に距離1でコールすると...
     *         □□□□□□□
     *         □□□■□□□
     *         □□□□□□□
     *         □□□□□□□
     *      次の位置の配列が返る。
     *         □□□■□□□
     *         □□■□■□□
     *         □□□■□□□
     *         □□□□□□□
     * 例2) 距離2でコールすると、次の位置の配列が返る。
     *         □□■□■□□
     *         □■□□□■□
     *         □□■□■□□
     *         □□□■□□□
     */
    getArounds(point, dist = 1) {

        // 戻り値初期化。
        var result = [];

        // X座標で左から追加していく。
        //                          □□□□□□□                □□■□□□□
        // 上の例2で説明すると、まず□■□□□□□を追加して、次に□■□□□□□を追加していく感じ。
        //                          □□□□□□□                □□■□□□□
        //                          □□□□□□□                □□□□□□□
        for(var xdist = -1 * dist ; xdist <= dist ; xdist++) {

            // Y軸における、基準点からの距離を取得。
            var ydist = dist - Math.abs(xdist);

            // まず下側を追加。
            var block = this.getBlock(point.x + xdist, point.y + ydist);
            if(block)  result.push(block);

            // 次に上側を追加。
            if(ydist != 0) {
                var block = this.getBlock(point.x + xdist, point.y - ydist);
                if(block)  result.push(block);
            }
        }

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたブロック位置に隣接するブロックを方向制限も加味して返す。
     *
     * @param   基準の位置を表すPoint。
     * @return  指定された位置に隣接していて、方向制限もクリア出来るブロックの配列。マップの範囲を超えるブロックは返されない。
     */
    getNeighbors(point) {

        // 戻り値初期化。
        var result = [];

        // 基準位置のブロックを取得。
        var base = this.getBlock(point);

        // 上、左、右、下 の順で隣接ブロックを調査していく。
        for(var dir = 0 ; dir < 4 ; dir++) {

            // その方向の隣接ブロックを取得。マップ範囲外ならスキップ。
            var nei = point.add(Point.numpad(dir*2 + 1));
            var neighbor = this.getBlock(nei);
            if(!neighbor)  continue;

            // ここまで来れば戻り値に追加出来る。
            result.push(neighbor);
        }

        return result;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された位置から移動可能なブロックを列挙する。
     *
     * @param   移動元のブロック位置を表すPoint。
     * @param   移動力
     * @param   移動主体となるユニット。移動手段の取得やZOCの判定に使われる。これらを無視する場合はnullを指定する。
     * @return  移動可能なブロックを列挙した配列。移動元のブロックも含まれる。
     */
    getTravels(start, legs, unit = null) {

        // 戻り値初期化。
        var result = [];

        // チェックされたブロック位置のYを第一次元、Xを第二次元に取って移動力残余を格納する二次元コレクション。
        var marks = new Collection2D();

        // 指定されたブロックをまずはチェック。
        var block = this.getBlock(start);
        result.push(block);
        marks.set(block.point.x, block.point.y, legs);

        // 移動可能なブロックを近い順に戻り値に result に追加して、追加されたブロックに隣接するブロックを連鎖的に調べていく。
        // 普通に考えると再帰したいところだが、単純なやり方だと折り返しなどが発生して無駄が多くなる。
        // このループは result を拡張しながら、どこまで連鎖検査したを示すカウンタ変数 cursor が拡張分を追いかけるという流れになっている。
        for(var cursor = 0 ; cursor < result.length ; cursor++) {

            // 連鎖検査するブロックを取得。
            var focus = result[cursor];

            // これ以上移動できないなら隣接ブロックを調べる必要はない。
            var remain = marks.get(focus.point.x, focus.point.y);
            if(remain <= 0)  continue;

            // 隣接ブロックを列挙して一つずつ処理する。
            for( var neighbor of this.getNeighbors(focus.point) ) {

                // ブロックに対して踏み込み検査。
                var check = this.getTravelCheck(neighbor, remain, marks, unit);

                // チェック出来るなら処理する。
                if(0 <= check) {
                    result.push(neighbor);
                    marks.set(neighbor.point.x, neighbor.point.y, check);
                }
            }
        }

        // これで完成だが、一度列挙したブロックにより有利に踏み込める経路が後から判明すると列挙が重複するので...
        return result.unique();
    }

    /**
     * getTravels() のサブルーチン。指定されたブロックを新たにチェックするか調べる。
     */
    getTravelCheck(block, legs, marks, unit) {

        // 移動手段に応じた移動コストを取得。
        var cragginess = block.getCragginess(unit ? "walk" : "shoot");

        // 踏み込めないならチェックできない。
        var check = legs - cragginess;
        if(check < 0)  return check;

        // すでにチェックしたことがある場合、より大きな移動力残余で踏み込めないなら新たにチェックしない。
        // このifはまだチェックしたことがない(original == undefined)のときに適切に振る舞う(成り立たない)ことに留意。
        var original = marks.get(block.point.x, block.point.y);
        if(check <= original)
            return -1;

        // ZOC判定の必要がある場合...
        if(unit) {

            // 所属が違うユニットがいる場合は踏み込めない(ZOC)。
            if(block.logicalUnit  &&  block.logicalUnit.unioncode != unit.unioncode)
                return -1;
        }

        // ここまでくればチェック可能。
        return check;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数で指定されたブロック間の移動パスを返す。到達不能であっても、最も近い点までの移動経路が返される。
     * ゴールブロック自体が侵入不可でも、その隣までが侵入可能ならゴールまでの移動経路が返されるので注意(これは、
     * 敵ユニットを目標地点とするときに役に立つ)。
     *
     * @param   移動元のブロック位置を表すPoint。
     * @param   移動先のブロック位置を表すPoint。
     * @param   移動主体となるユニット。移動手段の取得やZOCの判定に使われる。これらを無視する場合はnullを指定する。
     * @return  移動経路を表す文字列。1マスの移動について数字一文字の文字列で表現されている。文字は 1:上, 3:左, 5:右, 7:下 のいずれか。
     *              例) 55511137    右右右上上上左下
     *          到達不能な場合でも、マンハッタン距離が最も小さくなる座標までの経路が格納される。
     */
    getStarRoute(start, goal, unit = null) {

        // 実装は「A*」。用語等はインターネットを参照。

        // 移動元と先が同じという特殊ケースを処理する。
        if( start.equals(goal) )  return "";

        // オープンしたマスの情報を格納する配列を初期化。
        var scans = [];

        // 経路探索。最も肉薄したマスを変数 cursor で保持する。
        var cursor = this.buildStarMap(scans, start, goal, unit);

        // そのマスから親マスをたどって、変数 route に経路を逆順で作成していく。
        var route = "";
        for( ; cursor.prev ; cursor = cursor.prev)
            route += cursor.pos.clone().sub(cursor.prev.pos).padnum().toString();

        // 逆順で作成したルートをひっくり返して正順にする。
        return route.split("").reverse().join("");
    }

    /**
     * A*の考え方に従って、ゴールに辿り着くまで必要なマスをオープンする。
     *
     * @param   オープンしたマスの情報が、Yを第一次元、Xを第二次元に取って格納される二次元配列。
     * @param   出発点を表すPoint。
     * @param   目標点を表すPoint。
     * @param   移動主体となるユニット。地形コストやZOCを無視する場合はNULLを指定する。
     * @return  第一引数にセットしたマスのうち、最も肉薄したマスの情報。ゴールに到達できたならゴールのマスとなる。
     */
    buildStarMap(scans, start, goal, unit) {

        // 現在オープンしているマスのリストを初期化。
        var opens = [];

        // 移動元を無条件にオープンする。ここのヒューリスティック距離は参照されないので何でも良い。
        var starblock = {
            pos:start, prev:null, cost:0, heur:0,
        };
        scans[start.y] = [];  scans[start.y][start.x] = starblock;
        opens.push(starblock);

        // ゴールにたどり着くまでループ。
        while(true) {

            // オープンマスがなくなってしまったら到達はできない。最も肉薄したマスをリターン。
            if(opens.length == 0)  return this.closestStarBlock(scans);

            // オープンリストの中から最もスコアが低くて、後に追加されたものを取得。
            // そのマスはクローズする(オープンリストから削除する)。
            var focus = this.nearestStarBlock(opens, true);

            // そのマスに隣接するマスを取得。
            var neighbors = this.getNeighbors(focus.pos);

            // 最短経路が複数ある場合に、なるべくユニットごとに選択経路が異なるようにする。
            // if($unit->getNo() % 2)
            //     $neighbors = array_reverse($neighbors);

            // 隣接マスを一つずつ処理する。
            for(var neighbor of neighbors) {

                // オープン。ゴールにたどり着いたらリターン。
                if( this.openStarBlock(scans, opens, focus, neighbor, goal, unit) )
                    return scans[goal.y][goal.x];
            }
        }
    }

    /**
     * 指定されたマスがオープンできるかどうか調べて、できるならオープンする。
     * ゴール地点は無条件でオープンされることに注意。戻り値はそこがゴールだったかどうか。
     */
    openStarBlock(scans, opens, focus, target, goal, unit) {

        var pos = target.point;
        var cragginess = target.getCragginess(unit ? "walk" : "shoot");

        // すでにオープンしたことがある場合、それよりも低いコストで踏み込めないなら再オープンしない。
        var opened = scans[pos.y] && scans[pos.y][pos.x];
        if(opened  &&  opened.cost <= focus.cost + cragginess)  return false;

        // オープンするかどうか判断する。ただし、到達点である場合は無条件でオープンするのでスキップ。
        if( !pos.equals(goal) ) {

            // 踏み込めないマスならオープンしない。
            if(cragginess == StageBlock.IMENTER)  return false;

            // 所属が違うユニットがいる場合は踏み込めない(ZOC)。
            if(target.logicalUnit  &&  unit  &&  target.logicalUnit.unioncode != unit.unioncode)
                return false;
        }

        // ここまで来たらオープンする。ヒューリスティック距離を求めるときに平均コストを重く見積もっているのは最初に選択した経路にある程度拘らせるため。
        // そのほうが早い場合が多いんじゃないかなーと思ってるんだけど…
        var starblock = {
            pos: pos, prev: focus,  cost: focus.cost + cragginess,
            heur: focus.cost + cragginess + goal.sub(pos).manhattan*150,
        };

        if(!scans[pos.y])  scans[pos.y] = [];
        scans[pos.y][pos.x] = starblock;
        opens.push(starblock);

        // 踏み込んだマスはゴールかどうかを返す。
        return pos.equals(goal);
    }

    /**
     * オープンブロックの配列の中からゴールまで最も近くて、最も後に追加されたものを探して閉じる。
     * 戻り値はそのスターブロック。
     */
    nearestStarBlock(blocks) {

        var cursor;

        for(var index = 0, block ; block = blocks[index] ; index++) {
            if(cursor == undefined  ||  blocks[index].heur <= blocks[cursor].heur)
                cursor = index;
        }

        return blocks.pop(cursor);
    }

    /**
     * スキャン済みスターブロックを格納した二次元配列から、最も肉薄したものを返す。
     */
    closestStarBlock(scans) {

        var result;

        for(var y of scans.sparseKeys()) {
            for(var x of scans[y].sparseKeys()) {
                if(result == undefined  ||  scans[y][x].heur <= result.heur)
                    result = scans[y][x];
            }
        }

        return result;
    }


    // レンダリング
    //======================================================================================================

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。描画を実行する。
     */
    render(context, scene) {

        // 描画範囲を取得。
        var sight = this.host.localCoord(scene.drawingSight);

        // 範囲内ブロックの drawGround() を呼び出す。
        this.renderBy(sight, "drawGround", context, scene);
    }

    /**
     * レイヤー TacticScene.SURFACE での描画を実行する。
     */
    renderSurface(context, scene) {

        // 描画範囲を取得。
        var sight = this.host.localCoord(scene.drawingSight);

        // 基点が画面外にあるとその地上物は描画されない。基点が描画領域の境界線を出入りするような状況だと、突然地上物が消えたりする。
        // この問題をなるべく緩和するため、上と左右に1、下に5ブロックほど広げて範囲選択する。
        sight.swell(StageBlock.TIPSIZE);
        sight.bottom += 4 * StageBlock.TIPSIZE;

        // 範囲内ブロックの drawSurface() を呼び出す。
        this.renderBy(sight, "drawSurface", context, scene);
    }

    /**
     * レイヤー TacticScene.MARKER での描画を実行する。
     */
    renderMarkers(context, scene) {

        // アニメーション周期タイマーを参照して不透明度を決める。
        var alpha = Math.lerp(0.8, 0.0, (this.tweentime % StageMap.DURATION) / StageMap.DURATION);

        // マーカーを持つブロックにマーカーを描画させる。
        for(var block of this.markedBlocks)
            block.drawMarkers(alpha, context, scene);
    }

    /**
     * 指定された描画領域に含まれる StageBlock の指定されたメソッドを、Y軸順に呼び出す。
     *
     * @param   描画範囲を表すRect
     * @param   呼び出すべき StageBlock のメソッド
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    renderBy(sight, method, context, scene) {

        // 描画対象のブロック範囲を取得。
        var area = this.getArea(sight);

        // 範囲内の各ブロックの指定されたメソッドを呼び出す。
        for(var y = area.top ; y < area.bottom ; y++) {
            for(var x = area.left ; x < area.right ; x++) {
                var block = this.blocks[y][x];
                block[method](context, scene);
            }
        }
    }
}

// マーカーアニメーション一周の時間(ms)
StageMap.DURATION = 1500;


//==========================================================================================================
/**
 * Tiled Map Editor が出力するJSONデータを解析するユーティリティ。
 */
var RegionParser = {

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたリージョンデータから、使用するチップのマスタを作成する。
     *
     * @param   リージョンデータを表す構造体。
     * @return  チップインデックスをキー、そのマスタデータを値とする配列。
     */
    buildTipMaster(data) {

        // 戻り値を作成。0番はチップなしを意味する。
        var result = [];
        result.push(null);

        // tilesetsにリストされているタイルセット名を一つずつ処理する。
        for(var tileset of data["tilesets"]) {
            var tipsname = tileset["source"].pathinfo().basename;
            var tipsset = this.parseTileset(tipsname);
            result = result.concat(tipsset);
        }

        return result;
    },

    /**
     * 引数に指定された名前のタイルセットに含まれる各チップをマスタ化する。
     *
     * @param   タイルセット名
     * @return  指定されたタイルセットに含まれるチップを順番にマスタ化した配列。
     */
    parseTileset(tipsname) {

        // 戻り値初期化。
        var tipsset = [];

        // タイルセット名からチップ画像のアトラスとデータを取得。
        var tipsatlas = Asset.take(tipsname);
        var tipsdata = Asset.take(tipsname + "_data");

        // nums, walls, cover マークセットの firstgid をそれぞれ取得する。
        var numsgid = this.getFirstgid(tipsdata["tilesets"], "nums") - 1;
        var covergid = this.getFirstgid(tipsdata["tilesets"], "cover") - 1;

        // タイルセットのピースを一つずつ戻り値に追加していく。
        for(var y = 0 ; y < tipsatlas.nums.y ; y++) {
            for(var x = 0 ; x < tipsatlas.nums.x ; x++) {

                // チップのマスタを作成。
                var record = {};

                // cragginess プロパティの値を取得。
                var tileindex = tipsdata["layers"][1]["data"][y * tipsdata["width"] + x];
                record.cragginess = (tileindex == 0) ? StageBlock.NORMAL : tileindex - numsgid;

                // image プロパティの値を取得。
                record.image = tipsatlas.piece(x, y);

                // ornament プロパティの値を取得。
                var ornalayer = tipsdata["layers"][3]["data"].segment(tipsdata["width"]);
                record.ornament = this.getOrnamentData(x, y, tipsatlas, ornalayer, covergid);

                // 移動コスト1000は踏み込み不可とする。
                if(record.cragginess == 1000)  record.cragginess = StageBlock.IMENTER;

                tipsset.push(record);
            }
        }

        return tipsset;
    },

    /**
     * 指定されたタイルセットの firstgid を返す。
     */
    getFirstgid(tilesets, setname) {

        var entry = tilesets.find(set => {
            var info = set["source"].pathinfo();
            return info["basename"] == setname;
        });

        return entry["firstgid"];
    },

    /**
     * 指定されたチップの地上物定義を解析する。
     */
    getOrnamentData(x, y, tipsatlas, ornalayer, covergid) {

        // 指定されたチップの「地上物定義」レイヤーの値を取得。何もないなら null リターン。
        var mark = ornalayer[y][x];
        if(mark == 0)  return null;

        // 描画色のインデックスを取得。偶数(薄い方の色)の場合は null リターン。
        mark -= covergid;
        if(mark % 2 == 0)  return null;

        // ここからは濃い方の色、つまり地上物の基点になっている場合の処理。

        // その地上物の左上・右下までのオフセットを取得。
        var ltoffset = this.measureCoveringDistance(ornalayer, x, y, covergid+mark+1, -1);
        var rtoffset = this.measureCoveringDistance(ornalayer, x, y, covergid+mark+1, +1);

        // 取得したオフセットから、その地上物の範囲を表す矩形を取得。
        var area = Rect.byCorner(ltoffset, rtoffset.add(1));
        area.addInto(x, y);

        // 地上物の定義を返す。
        return {
            offset: ltoffset,
            image: tipsatlas.getAreaPiece(area),
        };
    },

    /**
     * 指定された基点から、指定された色がどこまで広がっているかを計測する。
     */
    measureCoveringDistance(ornalayer, x, y, mark, direction) {

        // 戻り値初期化。
        var result = new Point();

        // まずはY軸上での計測。
        for(var cursor = y + direction ; ornalayer[cursor] ; cursor += direction) {

            if(ornalayer[cursor][x] != mark)  break;

            result.y += direction;
        }

        // 次にX軸。
        for(var cursor = x + direction ; ornalayer[y][cursor] ; cursor += direction) {

            if(ornalayer[y][cursor] != mark)  break;

            result.x += direction;
        }

        return result;
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたリージョンデータを解析して、各ブロックを StageBlock でインスタンス化した二次元配列を返す。
     *
     * @param   リージョンデータを表す構造体。
     * @param   StageMapインスタンス。
     * @return  第一次元にY、第二次元にXを取って各ブロックを格納する二次元配列。
     */
    buildRegionBlocks(data, map) {

        // 左から右、上から下へインスタンス化していく。
        var blocks = new Array(data.height);
        for(var y = 0 ; y < data.height ; y++) {
            blocks[y] = new Array(data.width);

            for(var x = 0 ; x < data.width ; x++) {

                // layers.data の何番目の要素を参照するかを決定。
                var index = data.width * y + x;

                // layers の各要素に置かれている該当ブロックのチップ番号を配列として取得。
                var grounds = data.layers.map(layer => layer.data[index]);

                // ブロックインスタンスを作成。
                blocks[y][x] = new StageBlock(map, x, y, grounds);
            }
        }

        return blocks;
    },
};
