
/**
 * RGBAで構成される色を表すクラス。
 */
class Rgba {

    //-----------------------------------------------------------------------------------------------------
    /**
     * 指定された開始色と終了色の間で、指定された進捗率における色を返す。
     *
     * @param   開始色。nullの場合は終了色と同じ色の alpha:0.0 と解釈される。
     * @param   終了色。nullの場合は開始色と同じ色の alpha:0.0 と解釈される。
     * @param   進捗率。0.0 ～ 1.0。
     * @return  指定された進捗率における色。
     */
    static lerp(start, end, t) {

        if(!start) {
            start = end.copy();
            start.a = 0.0;
        }

        if(!end) {
            end = start.copy();
            end.a = 0.0;
        }

        return new Rgba(
            Math.lerp(start.r, end.r, t), Math.lerp(start.g, end.g, t),
            Math.lerp(start.b, end.b, t), Math.lerp(start.a, end.a, t)
        );
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 色を指定する引数の正規化を行い、RGBAの各値を含む4要素からなる配列に統一する。
     *
     * (1, 2, 3, 4) =>           (1, 2, 3, 4)
     * (1, 2, 3) =>              (1, 2, 3, 1.0)
     * () =>                     (0, 0, 0, 1.0)
     * ("red") =>                (255, 0, 0, 1.0)
     * ("red", 0.5) =>           (255, 0, 0, 0.5)
     * (new Rgba(1, 2, 3, 4)) => (1, 2, 3, 4)
     */
    static normalizeArgs(args) {

        // 第一引数が配列なのは展開し忘れだ。
        if(args[0] instanceof Array) {
            this.normalizeArgs(...args[0]);
            return;
        }

        // Rgbaインスタンスが指定されているなら値を取り出すだけ。
        if(args[0] instanceof Rgba) {
            args[3] = args[0].a;    args[2] = args[0].b;
            args[1] = args[0].g;    args[0] = args[0].r;
            return;
        }

        // 色名が指定されている場合の処理。
        if(typeof args[0] == "string") {

            var alpha = args[1];

            var vals = this.valuesFromName(args[0])
            args.length = 0;
            args.push( ...vals );

            if(alpha != undefined)  args[4] = alpha;
            return;
        }

        // 色名が指定されていない場合の処理。
        args[0] = args[0] || 0;
        args[1] = args[1] || 0;
        args[2] = args[2] || 0;
        args[3] = (args[3] == undefined) ? 0.0 : args[3];
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に指定された名前の色に対応するRGBAセットを返す。
     *
     * @param   色の名前
     * @return  RGBAの各値を含む4要素からなる配列
     */
    static valuesFromName(name) {

        // "transparent" はここで処理しておく。
        if(name == "transparent")  return [0, 0, 0, 0.0];

        // 色名からRGBのセットを取得。
        var values = {
            "black":                [0, 0, 0],              "silver":               [192, 192, 192],        "gray":                 [128, 128, 128],        "white":                [255, 255, 255],
            "maroon":               [128, 0, 0],            "red":                  [255, 0, 0],            "purple":               [128, 0, 128],          "fuchsia":              [255, 0, 255],
            "green":                [0, 128, 0],            "lime":                 [0, 255, 0],            "olive":                [128, 128, 0],          "yellow":               [255, 255, 0],
            "navy":                 [0, 0, 128],            "blue":                 [0, 0, 255],            "teal":                 [0, 128, 128],          "aqua":                 [0, 255, 255],
            "orange":               [255, 165, 0],          "aliceblue":            [240, 248, 255],        "antiquewhite":         [250, 235, 215],        "aquamarine":           [127, 255, 212],
            "azure":                [240, 255, 255],        "beige":                [245, 245, 220],        "bisque":               [255, 228, 196],        "blanchedalmond":       [255, 235, 205],
            "blueviolet":           [138, 43, 226],         "brown":                [165, 42, 42],          "burlywood":            [222, 184, 135],        "cadetblue":            [95, 158, 160],
            "chartreuse":           [127, 255, 0],          "chocolate":            [210, 105, 30],         "coral":                [255, 127, 80],         "cornflowerblue":       [100, 149, 237],
            "cornsilk":             [255, 248, 220],        "crimson":              [220, 20, 60],          "cyan":                 [0, 255, 255],          "aqua":                 [0, 255, 255],
            "darkblue":             [0, 0, 139],            "darkcyan":             [0, 139, 139],          "darkgoldenrod":        [184, 134, 11],         "darkgray":             [169, 169, 169],
            "darkgreen":            [0, 100, 0],            "darkgrey":             [169, 169, 169],        "darkkhaki":            [189, 183, 107],        "darkmagenta":          [139, 0, 139],
            "darkolivegreen":       [85, 107, 47],          "darkorange":           [255, 140, 0],          "darkorchid":           [153, 50, 204],         "darkred":              [139, 0, 0],
            "darksalmon":           [233, 150, 122],        "darkseagreen":         [143, 188, 143],        "darkslateblue":        [72, 61, 139],          "darkslategray":        [47, 79, 79],
            "darkslategrey":        [47, 79, 79],           "darkturquoise":        [0, 206, 209],          "darkviolet":           [148, 0, 211],          "deeppink":             [255, 20, 147],
            "deepskyblue":          [0, 191, 255],          "dimgray":              [105, 105, 105],        "dimgrey":              [105, 105, 105],        "dodgerblue":           [30, 144, 255],
            "firebrick":            [178, 34, 34],          "floralwhite":          [255, 250, 240],        "forestgreen":          [34, 139, 34],          "gainsboro":            [220, 220, 220],
            "ghostwhite":           [248, 248, 255],        "gold":                 [255, 215, 0],          "goldenrod":            [218, 165, 32],         "greenyellow":          [173, 255, 47],
            "grey":                 [128, 128, 128],        "honeydew":             [240, 255, 240],        "hotpink":              [255, 105, 180],        "indianred":            [205, 92, 92],
            "indigo":               [75, 0, 130],           "ivory":                [255, 255, 240],        "khaki":                [240, 230, 140],        "lavender":             [230, 230, 250],
            "lavenderblush":        [255, 240, 245],        "lawngreen":            [124, 252, 0],          "lemonchiffon":         [255, 250, 205],        "lightblue":            [173, 216, 230],
            "lightcoral":           [240, 128, 128],        "lightcyan":            [224, 255, 255],        "lightgoldenrodyellow": [250, 250, 210],        "lightgray":            [211, 211, 211],
            "lightgreen":           [144, 238, 144],        "lightgrey":            [211, 211, 211],        "lightpink":            [255, 182, 193],        "lightsalmon":          [255, 160, 122],
            "lightseagreen":        [32, 178, 170],         "lightskyblue":         [135, 206, 250],        "lightslategray":       [119, 136, 153],        "lightslategrey":       [119, 136, 153],
            "lightsteelblue":       [176, 196, 222],        "lightyellow":          [255, 255, 224],        "limegreen":            [50, 205, 50],          "linen":                [250, 240, 230],
            "magenta":              [255, 0, 255],          "fuchsia":              [255, 0, 255],          "mediumaquamarine":     [102, 205, 170],        "mediumblue":           [0, 0, 205],
            "mediumorchid":         [186, 85, 211],         "mediumpurple":         [147, 112, 219],        "mediumseagreen":       [60, 179, 113],         "mediumslateblue":      [123, 104, 238],
            "mediumspringgreen":    [0, 250, 154],          "mediumturquoise":      [72, 209, 204],         "mediumvioletred":      [199, 21, 133],         "midnightblue":         [25, 25, 112],
            "mintcream":            [245, 255, 250],        "mistyrose":            [255, 228, 225],        "moccasin":             [255, 228, 181],        "navajowhite":          [255, 222, 173],
            "oldlace":              [253, 245, 230],        "olivedrab":            [107, 142, 35],         "orangered":            [255, 69, 0],           "orchid":               [218, 112, 214],
            "palegoldenrod":        [238, 232, 170],        "palegreen":            [152, 251, 152],        "paleturquoise":        [175, 238, 238],        "palevioletred":        [219, 112, 147],
            "papayawhip":           [255, 239, 213],        "peachpuff":            [255, 218, 185],        "peru":                 [205, 133, 63],         "pink":                 [255, 192, 203],
            "plum":                 [221, 160, 221],        "powderblue":           [176, 224, 230],        "rosybrown":            [188, 143, 143],        "royalblue":            [65, 105, 225],
            "saddlebrown":          [139, 69, 19],          "salmon":               [250, 128, 114],        "sandybrown":           [244, 164, 96],         "seagreen":             [46, 139, 87],
            "seashell":             [255, 245, 238],        "sienna":               [160, 82, 45],          "skyblue":              [135, 206, 235],        "slateblue":            [106, 90, 205],
            "slategray":            [112, 128, 144],        "slategrey":            [112, 128, 144],        "snow":                 [255, 250, 250],        "springgreen":          [0, 255, 127],
            "steelblue":            [70, 130, 180],         "tan":                  [210, 180, 140],        "thistle":              [216, 191, 216],        "tomato":               [255, 99, 71],
            "turquoise":            [64, 224, 208],         "violet":               [238, 130, 238],        "wheat":                [245, 222, 179],        "whitesmoke":           [245, 245, 245],
            "yellowgreen":          [154, 205, 50],         "rebeccapurple":        [102, 51, 153],
        }[name];

        // 見付からない場合は黒として扱う。
        if(!values)  values = [0, 0, 0];

        // Aは1.0とする。
        values.push(1.0);

        return values;
    }


    // インスタンスメンバ
    //=====================================================================================================

    //-----------------------------------------------------------------------------------------------------
    /**
     * 引数に与えられた座標でインスタンスを作成する。
     * 引数規則は normalizeArgs を参照。
     */
    constructor(...args) {

        this.put(...args);
    }

    /**
     * 引数に与えられた座標をセットする。
     * 引数規則は normalizeArgs を参照。
     */
    put(...args) {

        Rgba.normalizeArgs(args);

        [this.r, this.g, this.b, this.a] = args;
        return this;
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * RGBAの各値を正式な名前でもアクセス出来るようにする。
     */

    get red()  { return this.r; }
    set red(v) { this.r = v; }
    get green()  { return this.g; }
    set green(v) { this.g = v; }
    get blue()  { return this.b; }
    set blue(v) { this.b = v; }
    get alpha()  { return this.a; }
    set alpha(v) { this.a = v; }

    //------------------------------------------------------------------------------------------------------
    /**
     * このインスタンスが表す色を #XXXXXXXX 形式で取り出す。
     */
    get style() {

        return "#%02x%02x%02x%02x".format(this.r, this.g, this.b, 255*this.a);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * このインスタンスが表す色を n, n, n, f の形式で取り出す。デバッグ用。
     */
    explain() {

        return "%d, %d, %d, %.2f".format(this.r, this.g, this.b, this.a);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * インスタンスを文字列化するときに色の内容が分かるようにする。デバッグ用。
     */
    toString() {

        return super.toString() + " " + this.explain();
    }
}
