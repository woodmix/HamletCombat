
/**
 * アトラス画像の全ピースを横に並べて順次ジャンプさせてウェーブさせる実行素子。
 * プロパティ layer は手動でセットする必要がある。左上を原点としたボディを持つので、配置は AttractAnchor を使うのが良いだろう。
 */
class AtlasWaver extends Executant {

    // このクラス自体は描画要素を持っていないので、実はlayerは必要ないのだが、子供素子がこの素子のlayer値を使うようになっている。

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   表示するImageAtlasか、それを指すAssetのキー名。
     * @param   ピースの表示間隔。詰めたい場合はマイナスの値を指定する。
     */
    _constructor(atlas, spacing = 0) {
        super._constructor();

        // 表示する画像アトラスを取得。
        if(typeof atlas == "string")  atlas = Asset.take(atlas);

        // 左上を原点、表示サイズを大きさとする矩形をボディとする。
        var width = atlas.image.width + (atlas.nums.x-1) * spacing;
        var body = new FreeBody(0, [width, atlas.image.height]);
        this.behaviors.set(body);

        // 一ピースずつバラバラに子供素子として追加する。
        for(var i = 0 ; i < atlas.nums.x ; i++) {
            var piece = new AtlasWaver_Piece(atlas, i, spacing);
            this.childs.set(piece, "piece-"+i);
        }
    }
}


//==========================================================================================================
/**
 * AtlasWaverの子供素子として追加される、一つのピースを表す実行素子。
 */
class AtlasWaver_Piece extends BoingExecutant {

    //-----------------------------------------------------------------------------------------------------
    /**
     * @param   表示するImageAtlas。
     * @param   何ピース目を表示するか。
     * @param   ピースの表示間隔。
     */
    _constructor(atlas, index, spacing = 0) {
        super._constructor();

        // ピースの順序に従って、左上X座標を設定する。
        this.position.x = (atlas.width + spacing) * index;

        // …のだが、BoingExecutantの実装を利用する都合上、ビジュアルの中央が原点になっている必要がある。
        this.position.x += atlas.width/2;
        this.position.y += atlas.height/2;

        // 指定された順番のピースを表示する。
        var renderer = new ImageRenderer( atlas.piece(index, 0) );
        this.behaviors.set(renderer);
        this.layer = AllclearScene.LOGO;

        // ピース順序に従ってずらしたタイマーでジャンプを開始する。
        var timer = new TimerBehavior(100 * index, "jump");
        this.behaviors.set(timer);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。素子階層に追加されるたびに、最初のアップデートフェーズで呼ばれる。
     */
    activate(scene) {
        super.activate(scene);

        // layerは親にセットされている値を使う。
        this.layer = this.parent.layer;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ジャンプする。
     */
    jump() {

        // まずはピコっとジャンプ。
        var piko = new PikoMover([0, -50], 200);
        this.behaviors.set(piko);

        // ジャンプし終わったらプルプルする。
        piko.onfinish = "boing2";

        // 次のジャンプへのタイマーをセットする。
        var timer = new TimerBehavior(2000, "jump");
        this.behaviors.set(timer);
    }
}
