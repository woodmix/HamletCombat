/**
 * 何らかの基準を元に宿主のポジションやボディを束縛するビヘイバ(アンカー)を納める。
 */

//==========================================================================================================
/**
 * 指定された実行素子を位置合わせの基準とするアンカーの基底クラス。SensorBehaviorから派生する点に留意。
 */
class AnchorBehavior extends SensorBehavior {

    // 基準素子がまた別の基準素子に依存していて、それがまた別の...となると、最後の素子がちゃんと位置合わせされるまでに数フレームかかって
    // バタバタしてしまう可能性がある。
    // 対処するなら stay() をオーバーライドして、基準素子に "anchor" ビヘイバーがあったらそのstay()をコールしておく...というところだが、
    // そのままだと stay() のコール数が連鎖数の総和で増えていくんだよなぁ。じゃあbehave()使って一フレームに一回のコールに留まるようにフラグ管理…？
    // そこまでせんでも多少バタバタしても…良くないな。
    // 基準素子が親素子ならstay()のコール順的に1フレームでピシッといくのだが。普通、親素子が基準素子だよね、そーだよね。ってことで様子見。
    // finisher がある限り、こうした試みも完全には築けないしね。

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   位置合わせの基準となる実行素子。宿主の親とする場合はnullを指定する。
     * @param   調整後の終了処理を行う関数。この関数は以下の引数をとる。
     *              @param  基準素子の領域矩形を表す Rect。
     *              @param  宿主のボディビヘイバー。
     */
    constructor(bird, finisher) {
        super(bird);

        this.finisher = finisher;

        // インスタンスが独自に持っている onsense メンバを破棄して、prototype のonsenseが呼ばれるようにする。
        delete this.onsense;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 宿主の座標系において、基準素子の領域矩形が変化したら呼ばれる。
     */
    onsense(newrect, oldrect) {

        // 位置合わせする。
        this.anchor(newrect);

        // 終了関数があるなら実行する。
        if(this.finisher) {
            var body = this.host.behaviors.get("body");
            this.finisher(newrect, body);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 基準素子の領域矩形が変更されたら呼ばれる。
     *
     * @param   基準素子の領域矩形を表す Rect。
     * @return  位置合わせ出来たかどうか。
     */
    anchor(pile) {

        throw new Error("実装してください");
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ビヘイバーのデフォルト名を定義する。
     */
    get defaultKeyName() {
        return "anchor";
    }
}


//==========================================================================================================
/**
 * 指定された基準素子の領域矩形に、指定されたピボットとオフセットを適用した位置に宿主のpositionを合わせるアンカー。
 */
class PositionAnchor extends AnchorBehavior {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   位置合わせの基準となる実行素子。宿主の親とする場合はnullを指定する。
     * @param   基準素子の領域矩形のどこに合わせるかを表すPoint。左上なら(0, 0)、右下なら(1, 1)。省略時は中心。
     *          どちらかにNaNを指定しておくと、そちらの軸は調整されない。
     * @param   そこからずらして調節したい場合は、ずらす量をPointで指定する。
     * @param   調整後の終了処理を行う関数。詳しくは AnchorBehavior.constructor() のコメントを参照。
     */
    constructor(bird, pivot, offset, finisher) {
        super(bird, finisher);

        this.pivot = (pivot == undefined) ? 0.5 : pivot;
        this.offset = (offset == undefined) ? 0 : offset;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * anchor() を実装。基準素子の領域矩形が変更されたら呼ばれる。
     */
    anchor(pile) {

        // ピボットとオフセットを適用した座標を取得。
        var align = pile.getPoint(this.pivot).add(this.offset);

        // 宿主のpositionを合わせる。
        if( !isNaN(align.x) )  this.host.position.x = align.x;
        if( !isNaN(align.y) )  this.host.position.y = align.y;
    }
}


//==========================================================================================================
/**
 * 指定された基準素子の領域矩形を元に、宿主の辺の位置を調整するアンカー(エッジアンカー)の基底。
 * 指定されなかった辺に対しては何もしない。
 */
class EdgeAnchor extends AnchorBehavior {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   位置合わせの基準となる実行素子。宿主の親とする場合はnullを指定する。
     * @param   調整したい辺をキー、調整位置を値とするコレクション。
     *          キーは "left", "center", "right", "top", "middle", "bottom" のいずれかで指定する。
     *          値とするコレクションには次のキーを指定出来る。
     *              pivot   基準素子の領域矩形のどこに合わせるか。左or上なら 0.0、右or下なら 1.0。省略時は辺の指定と同じになる。
     *                      キーワード "left", "center", "right", "top", "middle", "bottom" で指定することも可能。
     *              offset  そこからずらして調節したい場合は、ずらす量を指定する。
     * @param   調整後の終了処理を行う関数。詳しくは AnchorBehavior.constructor() のコメントを参照。
     *
     * 例)
     *      new EdgeAnchor(null, {
     *          left:  {pivot:0.5, offset:-100},        // 左辺を、親矩形の中央から左に100の位置に合わせる。
     *          right: {pivot:"center", offset:+200},   // 右辺を、親矩形の中央から右に200の位置に合わせる。
     *          top:   {offset:-300},                   // 上辺を、親矩形の上辺(省略されているので同じ辺となる)から下に300の位置に合わせる。
     *          top:   -300,                            // さらに、キーがoffsetだけになるならこのように省略出来る。
     *                                                  // 下辺は省略されているので調整されない。
     *      });
     */
    constructor(bird, edges, finisher) {
        super(bird, finisher);

        // 調整位置をメンバ変数に保持する。
        this.edges = edges.clone();

        // …のだが、ちょっと初期化が必要になる。
        this.edges = this.edges.map((order, edge) => {

            // 値のみで指定されている場合は offset のみが指定されたものとして扱う。
            if(typeof order != "object")  order = {offset:order};

            // pivot が省略されている場合は対象辺と同じ辺を使う。
            if(order.pivot == undefined)  order.pivot = edge;

            // pivot がキーワードで指定されている場合は数値に直す。
            if(typeof order.pivot == "string")
                order.pivot = {left:0.0, top:0.0, center:0.5, middle:0.5, right:1.0, bottom:1.0}[order.pivot];

            // offset が省略されている場合は 0 で統一する。
            order.offset = order.offset || 0;

            return order;
        });
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * anchor() を実装。基準素子の領域矩形が変更されたら呼ばれる。
     */
    anchor(pile) {

        // 宿主のボディビヘイバーを得る。
        var body = this.host.behaviors.get("body");

        // 調整指定を一つずつ処理する。
        for(var [edge, order] of this.edges) {

            // 調整する座標軸を取得。
            var axis = ["left", "center", "right"].includes(edge) ? "x" : "y";

            // 基準素子の矩形にピボットとオフセットを適用した点の、該当軸上における値(調整後の値)を取得。
            var pivot = pile.getPoint(order.pivot)[axis];
            var align = pivot + order.offset;

            // 調整を行う。
            this.adjust(body, align, edge, axis);
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された内容で辺の調整を行う。
     *
     * @param   宿主のボディビヘイバー。
     * @param   調整後になっているべき値。
     * @param   調整対象の辺。"left", "center", "right", "top", "middle", "bottom" のいずれか。
     * @param   調整対象の辺の座標軸。"x" か "y"。
     */
    adjust(body, align, edge, axis) {

        throw new Error("実装して下さい");
    }
}


//==========================================================================================================
/**
 * 指定された基準素子の領域矩形を元に、宿主のボディを変えずに宿主のpositionを調整するエッジアンカー。
 * PositionAnchor は基準位置にpositionを直接合わせようとするが、このアンカーは辺を合わせるためにpositionを変更しようとする。
 */
class AttractAnchor extends EdgeAnchor {

    //------------------------------------------------------------------------------------------------------
    /**
     * anchor() を実装。基準素子の領域矩形が変更されたら呼ばれる。
     */
    anchor(pile) {

        // 宿主にボディがない場合は NaturalBody を当てる。
        this.host.behaviors.need("body", NaturalBody);

        super.anchor(pile);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。指定された内容で辺の調整を行う。
     */
    adjust(body, align, edge, axis) {

        // 宿主の矩形を親の座標系で取得する。
        var rect = this.host.parentCoord( body.getRect() );

        // 指定された辺への、宿主のpositionからのベクターを取得。
        var vector = rect[edge] - this.host.position[axis];

        // 調整基準値からベクターを逆算すれば、position の新しい値が分かる。
        this.host.position[axis] = align - vector;
    }
}


//==========================================================================================================
/**
 * 指定された基準素子の領域矩形を元に、宿主のボディを変更して辺の位置を調整するエッジアンカー。
 * AttractAnchor は宿主のボディを変えずにそのpositionを動かすことで辺の位置を合わせていたが、このアンカーはpositionを変えずにボディを変えることで
 * 辺の位置を合わせようとする。従って、宿主のボディは FreeBody である必要がある。
 */
class StretchAnchor extends EdgeAnchor {

    //------------------------------------------------------------------------------------------------------
    /**
     * anchor() を実装。基準素子の領域矩形が変更されたら呼ばれる。
     */
    anchor(pile) {

        // 宿主にボディがない場合は FreeBody を当てる。
        this.host.behaviors.need("body", FreeBody);

        super.anchor(pile);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 実装。指定された内容で辺の調整を行う。
     */
    adjust(body, align, edge, axis) {

        // 親の座標系で渡される調整基準値を自身の座標系に直す。
        var point = new Point();
        point[axis] = align;
        point = this.host.getCoord(point);
        align = point[axis];

        // あとは該当辺をその値にセットすれば良いだけ。
        body.rect[edge] = align;
    }
}
