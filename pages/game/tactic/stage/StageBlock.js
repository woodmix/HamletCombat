
/**
 * マップ上の一つのマス(ブロック)を表すクラス。普通、StageMapインスタンスの getBlock() を通じて取得する。
 */
class StageBlock {

    //------------------------------------------------------------------------------------------------------
    /**
     * コンストラクタ。
     *
     * @param   このブロックを持つマップ。
     * @param   ブロックのX位置
     * @param   ブロックのY位置
     * @param   グラウンドチップ番号を下レイヤーから順に列挙した配列
     */
    constructor(map, x, y, grounds) {

        this.map = map;

        // ブロックの位置。
        this.point = new Point(x, y);

        // グラウンドのチップ番号を下レイヤー順に列挙した配列。
        this.grounds = grounds;

        // 通常移動コスト。
        this.cragginess = this.parseWalkCragginess();

        // このブロックに設定されているマーカーのコレクション。以下のマーカーが定義されている。
        //      color   値で設定されている色でブロックを塗りつぶす。ただし、半透明を使ったアニメーションが行われる。
        //      target  trueの場合、ターゲットマークを描画する。
        //      unit    trueの場合、このブロックに表示されているユニットを前面レイヤーで描画する。
        this.marks = {};

        // このブロックに論理状駐留するユニット。駐留するユニットがいない場合は undefined。
        this.logicalUnit = undefined;

        // このブロックに表示上所在しているユニットの配列。
        this.renderUnits = [];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ブロックの左上座標を表す。
     */
    get position() {

        return this.point.clone().multi(StageBlock.TIPSIZE);
    }

    /**
     * ブロックの中央座標を表す。
     */
    get center() {

        return this.position.clone().add(StageBlock.TIPSIZE/2);
    }

    /**
     * ブロックの横中央、下端の座標を表す。ユニットのpositionなどがここに合わせられる。
     */
    get anchor() {

        return this.position.clone().add(StageBlock.TIPSIZE/2, StageBlock.TIPSIZE);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された移動手段による、このブロックの移動コストを返す。
     *
     * @param   移動手段。"shoot" か "walk" のどちらか。
     */
    getCragginess(type) {

        if(type == "shoot")  return 1;
        else                 return this.cragginess;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックを基準に、引数に指定された距離だけ移動した先にあるブロックを取得する。
     *
     * @param   移動方向と距離を表すPointかそれに準じる引数セット。
     * @return  その先にあるStageBlock。マップ範囲外の場合は undefined。
     */
    reachout(...vector) {

        return this.map.getBlock( this.point.clone().add(...vector) );
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックから指定されたパスを辿った先にあるブロックを取得する。
     *
     * @param   移動経路を表す文字列。getStarRoute()の戻り値。
     * @param   移動主体となるユニット。主体を考えずに単純に経路を辿るだけならnullを指定出来る。
     * @param   辿るときに消費出来る移動力。
     * @param   移動力を指定した場合に、どこまで辿ったかを示す値を格納するオブジェクト。
     *          例えば 3 ブロックだけ辿ったなら、ここに指定したオブジェクトの cursor キーに 3 が格納される。
     * @return  辿った先にあるStageBlock。
     */
    tracePath(path, unit = null, legs = Infinity, ref = {}) {

        // 戻り値初期化。
        var focus = this;

        // 経路を一つずつ辿る。
        for(ref.cursor = 0 ; ref.cursor < path.length ; ref.cursor++) {

            // 指定された経路から次のブロックを取得。
            var dir = path.charAt(ref.cursor);
            var block = focus.reachout( Point.numpad(dir) );

            // そのブロックへ移動するための移動コストを取得。
            var cost = block.getCragginess(unit ? "walk" : "shoot");

            // 移動コストの分だけ残移動力を減。残移動力ではそのブロックへ踏み込めないならここまで。
            legs -= cost;
            if(legs < 0)  break;

            // フォーカスを移して次へ。
            focus = block;
        }

        return focus;
    }

    /**
     * このブロックから指定されたパスを逆に辿りながら空いているブロックを探す。
     *
     * @param   移動経路を表す文字列。getStarRoute()の戻り値。探索はこの経路を逆に辿りながら行われる。
     * @param   移動主体となるユニット。
     * @return  遡りながら見つけた空いているStageBlock。
     */
    searchVacantSeat(path, unit) {

        // 戻り値初期化。
        var focus = this;

        // 指定されたパスを末尾から逆に辿りながら、空いているブロックを探す。
        for(var cursor = path.length - 1 ; cursor >= 0 ; cursor--) {

            if(!focus.logicalUnit  ||  focus.logicalUnit == unit)  break;

            var dir = path.charAt(cursor);
            focus = focus.reachout( Point.numpad(dir).multi(-1) );
        }

        return focus;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * StageMap.prototype.getArounds()の第一引数をこのブロックに固定したショートハンド。詳細はそちらを参照。
     */
    getArounds(dist = 1) {

        return this.map.getArounds(this.point, dist);
    }

    /**
     * StageMap.prototype.getNeighbors()の第一引数をこのブロックに固定したショートハンド。詳細はそちらを参照。
     */
    getNeighbors() {

        return this.map.getNeighbors(this.point);
    }

    /**
     * StageMap.prototype.getTravelMarks()の第一引数をこのブロックに固定したショートハンド。詳細はそちらを参照。
     */
    getTravels(legs, unit = null) {

        return this.map.getTravels(this.point, legs, unit);
    }

    /**
     * StageMap.prototype.getStarRoute()の第一引数をこのブロックに固定したショートハンド。詳細はそちらを参照。
     */
    getStarRoute(goal, unit = null) {

        return this.map.getStarRoute(this.point, (goal instanceof StageBlock) ? goal.point : goal, unit);
    }

    /**
     * このブロックから、指定したブロックへのマンハッタン距離を返す。
     */
    getManhattan(goal) {

        return goal.point.sub(this.point).manhattan;
    }

    /**
     * このブロックから、指定したブロックへの移動コストを返す。到達不能な場合は Infinity が返る。
     */
    getMoveCost(goal, unit = null) {

        // 指定されたブロックへの経路を取得。
        var path = this.map.getStarRoute(this.point, (goal instanceof StageBlock) ? goal.point : goal, unit);

        // 戻り値初期化。
        var cost = 0;

        // 経路を一つずつ辿って移動コストを変数 cost に累積していく。
        var focus = this;
        for(var i = 0 ; i < path.length ; i++) {

            // 指定された経路から次のブロックを取得。
            var dir = path.charAt(i);
            var focus = focus.reachout( Point.numpad(dir) );

            // そのブロックへ移動するための移動コストを積算。
            cost += focus.getCragginess(unit ? "walk" : "shoot");
        }

        // 指定されたブロックに到達できたなら累積コストを、到達できなかったら Infinity を返す。
        return (focus == goal) ? cost : Infinity;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックに、引数に指定されたマークを設定する。
     *
     * @param   設定したいマーク。色マークを設定したい場合はその色コードを指定する。
     */
    setMarker(mark) {

        const specials = ["unit", "target"];

        if( specials.includes(mark) )  this.marks[mark] = true;
        else                           this.marks["color"] = mark;
    }

    /**
     * このブロックに設定されているマーカーをすべてクリアする。
     */
    clearMarkers() {

        this.marks = {};
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックの移動コストを計算する。
     */
    parseWalkCragginess() {

        // 「地面・主」「地面・副」「地面・下」を上レイヤーからスキャンして、最初に見付かったチップの移動コストを変数 groundCragginess に取得する。
        var groundCragginess = 0;
        for(var i = this.grounds.length - 2 ; i >= 0 ; i--) {
            var ground = this.map.getTip(this.grounds[i]);
            if(ground) {
                groundCragginess = ground.cragginess;
                break;
            }
        }

        // それと「上物」のチップのうち、コストが大きな方をリターン。
        var ornament = this.map.getTip(this.grounds[this.grounds.length - 1]);
        return Math.max(ornament ? ornament.cragginess : 0, groundCragginess);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックの地面を描画する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    drawGround(context, scene) {

        // 地上物(最上位レイヤー)を除いて、レイヤー順に描画していく。
        for(var i = 0 ; i < this.grounds.length - 1 ; i++) {

            var ground = this.grounds[i];

            if(ground) {
                var tip = this.map.getTip(ground);
                tip.image.drawTo(context, this.position);
            }
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックの地上物を描画する。ユニットが存在する場合はユニットも描画する。
     *
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    drawSurface(context, scene) {

        // このブロックに所在するユニットを描画する。ただし、"unit" マーカーが設定されている場合はここではなく後で描画する。
        if(!this.marks["unit"])  this.drawUnits(context, scene);

        // 地上物を描画。地上物レイヤーにチップが置かれていて...
        var ornament = this.grounds[this.grounds.length - 1];
        if(ornament) {

            // そのチップが地上物の基点になっているなら、地上物全体を描画する。
            var tip = this.map.getTip(ornament);
            if(tip.ornament) {
                // 地上物がマップ範囲外に出てるとエラーになるのでデバッグ
                // tip.ornament.image.drawTo(context, this.reachout(tip.ornament.offset).position);
                var [dest, src] = this.getOrnamentDrawing(tip.ornament.image, tip.ornament.offset);
                tip.ornament.image.drawTo(context, dest, src);
            }
        }

        // 地上物は複数のブロックにまたがって配置されているが、各ブロックで一チップごとに描画するのではなく、基点となるブロックでの描画命令時に全体を一括して描画している。
        // こうしないと、他のユニットや地上物とのレイヤー順がおかしくなるためだ。これらはY軸上での順番がそのままレイヤー順となる。
        // 地上物のY軸上での位置は基点ブロックの位置によって決まるためこのような処理にする必要がある。
    }

    /**
     * 地上物全体を描画するにあたって、マップ範囲外になっている領域を検出して、描画先と転送元矩形を補正するための関数。デバッグのため急遽つくったもの。
     *
     * @return  第一要素に描画位置を表すPoint、第二要素に転送元矩形を表すRectを格納した配列。
     */
    getOrnamentDrawing(image, tipoffset) {

        var dest = this.position.add( tipoffset.multi(StageBlock.TIPSIZE) );
        var src = new Rect(0, [image.width, image.height]);
        var stage = new Rect(0, this.map.largeness.multi(StageBlock.TIPSIZE));

        Rect.forAxis((axis, dimension, head, tail) => {

            if(dest[axis] < stage[head]) {
                src[head] += stage[head] - dest[axis];
                dest[axis] = stage[head];
            }
            if(stage[tail] < dest[axis] + src[dimension]) {
                src[tail] -= dest[axis] + src[dimension] - stage[tail];
            }
        });

        return [dest, src];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックのマーカーを描画する。
     *
     * @param   マーカーの透明度。
     * @param   描画先となる CanvasRenderingContext2D
     * @param   描画先キャンバスとタイミングを管理しているシーンオブジェクト
     */
    drawMarkers(alpha, context, scene) {

        // 不透明度適用。
        var prev = context.globalAlpha;
        context.globalAlpha *= alpha;

        // "color" マーカーを描画。
        if(this.marks["color"]) {
            context.fillStyle = this.marks["color"];
            context.fillRect(this.position.x, this.position.y, StageBlock.TIPSIZE, StageBlock.TIPSIZE);
        }

        // "target" マーカーを描画。
        if(this.marks["target"])
            Asset.take("targeter").drawTo(context, this.position);

        // 不透明度を戻す。
        context.globalAlpha = prev;

        // "unit" マーカーが設定されている場合はここで描画する。
        if(this.marks["unit"])  this.drawUnits(context, scene);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このブロックに所在するユニットを描画する。
     */
    drawUnits(context, scene) {

        // 表示上このブロックに所在するユニットを一つずつ描画する。
        for(var unit of this.renderUnits) {

            // 実行素子階層に入っているかどうかチェックする。一番最初はまだ追加されていなかったりするので…
            if(unit.parent)  unit.processDraw(TacticScene.SURFACE, context, scene);
        }
    }
}

// マップチップのサイズ。
StageBlock.TIPSIZE = 96;

// 通常の移動コスト。
StageBlock.NORMAL = 100;

// 進入負荷を表す移動コスト。
StageBlock.IMENTER = 9999;
