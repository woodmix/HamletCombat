/**
 * デバッグに使う実行素子を収めるファイル。
 */

//==========================================================================================================
/**
 * キャンバス上にグリッド線を引く実行素子。
 */
class DebugGrid extends Executant {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   グリッド線の間隔。省略時は100。
     */
    _constructor(space) {
        super._constructor();

        this.space = space || 100;

        // 実行素子としての設定。キャンバスに写っている領域をボディとする。
        this.layer = 99998;
        this.behaviors.set( new CanvasBody() );

        // レンダラをセット。
        var renderer = new class extends Renderer {
            paint(context, dest, scene) {

                // グリッド線を引く。
                context.lineWidth = 1;
                DebugGrid.drawGrid(context, dest, this.host.space, "bisque");
                DebugGrid.drawGrid(context, dest, this.host.space*5, "pink");

                // 原点に小さな赤い点を描く。
                context.fillStyle = "red";
                context.fillRect(-3, -3, 7, 7);
            }
        }
        this.behaviors.set(renderer);
    };

    //------------------------------------------------------------------------------------------------------
    /**
     * 静的メソッド。指定された領域にグリッド線を引く。
     *
     * @param   CanvasRenderingContext2Dインスタンス
     * @param   対象領域を表す Rect インスタンス
     * @param   格子の間隔
     * @param   線の色
     */
    static drawGrid(context, dest, interval, color) {

        context.beginPath();

        for(var x = Math.step(dest.left, interval) ; x < dest.right ; x += interval) {
            context.moveTo(x, dest.top);
            context.lineTo(x, dest.bottom);
        }

        for(var y = Math.step(dest.top, interval) ; y < dest.bottom ; y += interval) {
            context.moveTo(dest.left, y);
            context.lineTo(dest.right, y);
        }

        context.strokeStyle = color;
        context.stroke();
    }
}


//=========================================================================================================
/**
 * キャンバス上にパフォーマンス情報を表示する実行素子。
 */
class DebugInfo extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = 99999;

        this.info = {delta:0, delta_avg:0};
        this.samples = new Array(16);
        this.cursor = 0;
    }

    //------------------------------------------------------------------------------------------------------
    update(scene) {

        if(scene.delta == 0)  return;

        // フレームごとの経過時間を一定数保持する。
        this.samples[this.cursor] = scene.delta;
        this.cursor++;
        this.cursor &= 0xF;

        // 一定時間ごとに集計するようにする。
        if(scene.time < this.watched + 2000)  return;

        this.watched = scene.time;

        // 集計。
        this.info["delta"] = scene.delta;
        this.info["delta_avg"] = this.samples.average();
    }

    //------------------------------------------------------------------------------------------------------
    draw(context, scene) {

        // 描画領域を決定。
        var rect = new Rect(0, 0, 400, 90);

        // 背景を描画。
        context.fillStyle = "rgba(0, 0, 0, 0.5)";
        context.fillRect(rect.left, rect.top, rect.width, rect.height);

        // 情報を描画。
        context.font = "18pt monospace";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillStyle = "white";
        context.fillText("delta: " + this.info["delta"].toFixed() + "ms (" + (1000/this.info["delta"]).toFixed(1) + "fps)", 4, 0);
        context.fillText("avg: " + this.info["delta_avg"].toFixed() + "ms (" + (1000/this.info["delta_avg"]).toFixed(1) + "fps)", 4, 30);
        context.fillText("fps: max " + scene.framerate + ", min " + scene.minrate, 4, 60);
    }
}
