
/**
 * スーパーバイザーのコマンドキューを表すクラス。内部的には、他のコマンドによって発生して優先的に処理される「割り込みキュー」と、
 * それが空の時に各ユニットにターンを回す「ターン待ちキュー」の二本立てになっている。
 */
class CommandQueue {

    //------------------------------------------------------------------------------------------------------
    /**
     * @param   このキューを持つスーパーバイザー。
     */
    constructor(supervisor) {

        this.supervisor = supervisor;

        // 割り込みキューとターン待ちキュー。
        this.interrupts = [];
        this.waitlist = [];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたコマンドを割り込みキューに追加する。
     *
     * @param   キューに追加するコマンドのデータ構造体。
     */
    push(command) {

        // 引数に指定されたコレクションをコマンドオブジェクトに変換。
        command = StageCommand.createCommand(this.supervisor, command);

        // キューに追加。
        this.interrupts.push(command);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * キューの先頭に位置するコマンドを取得する。取得するだけであり、削除は行わない。
     *
     * @return  キューの先頭に位置するコマンド。キューが空の場合は undefined。
     */
    peek() {

        // 割り込みキューにエントリがあるならそこから取得する。
        if(this.interrupts.length > 0)  return this.interrupts[0];

        // ない場合はターン待ちキューから取り出すがこちらも空になっている場合は再作成する。
        if(this.waitlist.length == 0)  this.recreateTurnWaits();
        this.chopDeadCommand();
        return this.waitlist[0];
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * キューの先頭に位置するコマンドを取り出して、キューから削除する。
     *
     * @return  キューの先頭に位置するコマンド。キューが空の場合は undefined。
     */
    shift() {

        // 要領は peek() と同じ。

        if(this.interrupts.length > 0)  return this.interrupts.shift();

        if(this.waitlist.length == 0)  this.recreateTurnWaits();
        this.chopDeadCommand();
        return this.waitlist.shift();
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * 退出したユニットに対する TurnCommand を削除する。現在のターンの回し方だと必要になる...
     */
    chopDeadCommand() {

        while(this.waitlist.length > 0) {

            if( this.waitlist[0].unit.parent )
                break;

            this.waitlist.shift();
        }
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * ユニットのターン待ちキューを再作成する。
     */
    recreateTurnWaits() {

        // ステージ素子が持つユニットの配列から、そのユニットにアクションを促すコマンドの配列を得る。
        this.waitlist = this.supervisor.host.units.map(
            unit => StageCommand.createCommand(this.supervisor, {type:"turn", unit:unit})
        );
    }
}
