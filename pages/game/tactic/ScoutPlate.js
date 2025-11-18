/**
 * ユニット情報表示ウィンドウやそれに含まれる子要素を収める。
 */

//==========================================================================================================
/**
 * ユニット情報表示ウィンドウを表す実行素子。
 */
class ScoutPlate extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   素子階層で親となる StageExecutant。
     */
    _constructor(screen) {
        super._constructor();

        this.screen = screen;

        // 表示中のユニット。
        this.targetUnit = null;

        // レイヤーの設定。
        this.layer = TacticScene.UI;

        // ボディを当てておく。幅と高さは固定、下辺中央が原点となるようにする。
        var body = new FreeBody( Rect.byPivot(0.5, 1.0, ScoutPlate.WIDTH, ScoutPlate.HEIGHT) );
        this.behaviors.set(body);

        // 画面に対して左右中央、下辺から一定距離の場所に位置するようにする。
        var anchor = new PositionAnchor(null, [0.5, 1.0], [0, -TacticScene.PADDING]);
        this.behaviors.set(anchor);

        // この素子としてはウィンドウを描画する。
        var renderer = new NineRenderer("window", 2, 2);
        this.behaviors.set(renderer);

        // 各表示欄を作成。
        var graph = new ScoutPlate_Graph();
        this.childs.set(graph, "graph");

        var texter1 = new ScoutPlate_Text(graph, "top");
        this.childs.set(texter1, "name");

        var texter2 = new ScoutPlate_Text(graph, "bottom");
        this.childs.set(texter2, "misc");

        var gauge = new ScoutPlate_Gauge(graph, texter1, texter2);
        this.childs.set(gauge, "gauge");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定されたユニットの情報でこのウィンドウを表示する。
     */
    showUnit(unit) {

        // 既に表示しているのなら何もしない。
        if(this.targetUnit == unit)  return;

        // 表示中のユニットとして保持。
        this.targetUnit = unit;

        // 情報を取得。
        this.childs.search("graph").behaviors.search("renderer").target = unit;
        this.childs.search("name").text = `${unit.unitname}  Lv:${unit.unitlevel}  HP:${unit.specs.hp}`;
        this.childs.search("misc").text = `攻撃${unit.specs.attack} 命中${unit.specs.accuracy} 回避${unit.specs.avoidance}`;
        this.childs.search("gauge").renderer.setMeter(unit.specs["hp"], unit.specs["hp-max"]);

        // このウィンドウを実行素子階層に追加する。
        if(!this.parent)  this.screen.childs.set(this, "scouter");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * このウィンドウを隠す。
     */
    hide() {

        // 何も表示していないなら何もしない。
        if(!this.targetUnit)  return;

        this.targetUnit = null;
        this.dropoff("scouter");
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。フレームごとのアップデートフェーズで呼ばれる。
     */
    update(scene) {

        // 対象ユニットがステージから退出したら非表示にする。
        if(!this.targetUnit.parent)  this.hide();
    }
}

// ウィンドウの幅・高さ。
ScoutPlate.WIDTH = 600;
ScoutPlate.HEIGHT = 120;


//==========================================================================================================
/**
 * ユニット画像を表示する実行素子。
 */
class ScoutPlate_Graph extends Executant {

    //-----------------------------------------------------------------------------------------------------
    _constructor(screen) {
        super._constructor();

        // layerは新しいレイヤーを使うほどでもないのでウィンドウと同じ値を使う。この辺は実装に頼っちゃってるね…
        this.layer = TacticScene.UI;

        // ウィンドウ内左端に、上下と左に対して一般マージンを取って位置する。
        var anchor = new StretchAnchor(null, {
            "top":    +TacticScene.PADDING,
            "bottom": -TacticScene.PADDING,
            "left":    TacticScene.PADDING
        });

        // 高さを幅と同一に。また、下辺の中央を原点とする。
        anchor.finisher = function(pile, body) {
            body.rect.width = body.rect.height;
            body.setBasingPivot(0.5, 1.0);
        };

        anchor.oneshot = true;
        this.behaviors.set(anchor);

        // ユニット素子の描画を転写出来るようにする。target は ScoutPlate.showUnit() で動的にセットされる。
        var renderer = new DecalRenderer();
        this.behaviors.set(renderer, "renderer");   // ここで名前を指定しておかないと、アタッチ前に取得することが出来ない。
    }
}


//==========================================================================================================
/**
 * テキストを表示する実行素子。
 */
class ScoutPlate_Text extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   ユニット画像を表示する実行素子。位置合わせで参照される。
     * @param   上側なら "top"、下側なら "bottom" を指定する。
     */
    _constructor(graph, post) {
        super._constructor();

        // layerは新しいレイヤーを使うほどでもないのでウィンドウと同じ値を使う。この辺は実装に頼っちゃってるね…
        this.layer = TacticScene.UI;

        // テキストレンダラを作成。
        var renderer = new TextRenderer(TacticScene.TEXT_SIZE);
        renderer.halign = "left";
        renderer.valign = "middle";
        this.behaviors.set(renderer);

        // 右辺と上下辺のアンカーを作成。
        var edges = {right: -TacticScene.PADDING};

        if(post == "top") {
            edges.top = TacticScene.PADDING;
            edges.bottom = {pivot:"top", offset: +TacticScene.PADDING + TacticScene.TEXT_SIZE};
        }else {
            edges.top = {pivot:"bottom", offset: -TacticScene.PADDING - TacticScene.TEXT_SIZE};
            edges.bottom = -TacticScene.PADDING;
        }

        var anchor = new StretchAnchor(null, edges);
        anchor.oneshot = true;
        this.behaviors.set(anchor);

        // 左辺のアンカーを作成。
        var anchor = new StretchAnchor(graph, {
            left: {pivot:"right", offset:TacticScene.PADDING}
        });
        anchor.oneshot = true;
        this.behaviors.set(anchor, "anchor-left");

        // 左辺の上下中央位置を原点とする。
        anchor.finisher = function(pile, body) {
            body.setBasingPivot(0.0, 0.5);
        };
    }
}


//==========================================================================================================
/**
 * HPゲージを表示する実行素子。
 */
class ScoutPlate_Gauge extends Executant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   ユニット画像を表示する実行素子。位置合わせで参照される。
     * @param   名前欄を表示する実行素子。位置合わせで参照される。
     * @param   その他欄を表示する実行素子。位置合わせで参照される。
     */
    _constructor(graph, texter1, texter2) {
        super._constructor();

        // layerは新しいレイヤーを使うほどでもないのでウィンドウと同じ値を使う。この辺は実装に頼っちゃってるね…
        this.layer = TacticScene.UI;

        // アンカーを作成。
        var anchor = new StretchAnchor(graph, {left:{pivot:"right", offset:TacticScene.PADDING}});
        anchor.oneshot = true;
        this.behaviors.set(anchor, "anchor-left");

        var anchor = new StretchAnchor(null, {right: {pivot:"right", offset:-TacticScene.PADDING}});
        anchor.oneshot = true;
        this.behaviors.set(anchor, "anchor-right");

        var anchor = new StretchAnchor(texter1, {top: {pivot:"bottom", offset:TacticScene.PADDING}});
        anchor.oneshot = true;
        this.behaviors.set(anchor, "anchor-top");

        var anchor = new StretchAnchor(texter2, {bottom: {pivot:"top", offset:-TacticScene.PADDING}});
        anchor.oneshot = true;
        this.behaviors.set(anchor, "anchor-bottom");

        // レンダラを作成。プロパティ renderer で参照出来るようにする。
        this.renderer = new GaugeRenderer("tomato");
        this.behaviors.set(this.renderer);
    }
}
