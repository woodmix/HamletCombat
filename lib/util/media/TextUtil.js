
/**
 * テキストに関する処理を収めるクラス。
 */
class TextUtil {

    //------------------------------------------------------------------------------------------------------
    /**
     * セクション分けされたテキストを解析して、セクションごとに分割したコレクションを返す。
     *
     * 例)
     *      // chunks は次のような文字列とする。
     *      //
     *      //      this is first section
     *      //
     *      //      [ABC]
     *      //      abcabcabcabcabcabc
     *      //
     *      //      [DEF]
     *      //
     *      //      defdefdefdefdefdef
     *      //      defdefdefdefdefdef
     *      //
     *      var result = TextUtil.splitChunks(chunks);
     *
     *      // result は次のようになる。
     *      //      0:  this is first section
     *      //      ABC: abcabcabcabcabcabc
     *      //      DEF: defdefdefdefdefdef\ndefdefdefdefdefdef
     *
     * @param   解析したいテキスト。
     * @return  分割したコレクション。
     */
    static splitChunks(chunks) {

        // まずは行頭にある [xxxxx] で区切る。xxxxx も結果配列に含まれるようにサブマッチになるようにする。
        // 例えば "abc [def] ghi [jkl] mno" という文字列なら abc, def, ghi, jkl, mno という配列になる。
        var regions = chunks.split(/^\[([^\]]*)\]/m);

        // 戻り値初期化。
        var result = {};
        result[0] = regions[0].trim();

        // あとは2要素ずつ戻り値に追加していく。
        for(var i = 1 ; i < regions.length ; i += 2)
            result[ regions[i] ] = regions[i+1].trim();

        return result;
    }
}
