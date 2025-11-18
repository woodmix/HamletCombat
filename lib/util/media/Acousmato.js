
/**
 * 音を管理するための静的クラス。
 *
 * 例)
 *      // ボリューム設定。0.0(最小・無音) ～ 1.0(最大) の範囲で設定する。
 *      Acousmato.masterVolume = 1.0;   // マスターボリューム
 *      Acousmato.musicVolume = 1.0;    // BGMボリューム
 *      Acousmato.soundVolume = 1.0;    // 効果音ボリューム
 *      Acousmato.voiceVolume = 1.0;    // ボイスボリューム
 *
 *      // 現在のボリュームの参照。
 *      console.log(Acousmato.masterVolume);
 *      console.log(Acousmato.musicVolume);
 *      console.log(Acousmato.soundVolume);
 *      console.log(Acousmato.voiceVolume);
 *
 *      // ミュート設定。
 *      //      BGM
 *      //          演奏途中にミュート状態を変更しても反映される。ミュートすれば一時停止するし、解除すれば再開される。
 *      //          ミュート中に playMusic() したものは、ミュート解除すれば自動的に演奏開始される。
 *      //      効果音・ボイス
 *      //          演奏途中にミュート状態を変更しても反映されない。変更後に strikeSound(), speakVoice() したものは反映される。
 *      //          ミュート中に strikeSound(), speakVoice() したものは再生されない。
 *      Acousmato.mute = true;
 *
 *      // BGM演奏。同時に一つしか演奏出来ない。複数演奏しようとすると最後のもののみとなる。
 *      Acousmato.playMusic("bgm1");    // 演奏開始
 *      Acousmato.pauseMusic();         // 一時停止
 *      Acousmato.continueMusic();      // 再開
 *      Acousmato.stopMusic();          // 演奏停止
 *
 *      // 効果音再生。複数同時に再生出来る。
 *      Acousmato.strikeSound("sound1");
 *      Acousmato.strikeSound("sound2");
 *
 *      // 再生によって作成されたAudioBufferSourceNodeを通じて操作を行いたい場合は戻り値を取っておく。
 *      var sound = Acousmato.strikeSound("sound3");
 *      sound.stop();       // 途中で演奏停止。
 *      sound.addEventListener("ended", ()=>console.log("終了"), false);    // 演奏終了したらログ
 *
 *      // ボイス再生。効果音と同様だが、ボリューム設定が異なる。
 *      Acousmato.speakVoice("voice1");
 */
var Acousmato = {

    // 各ボリュームを表すボリュームノード
    masterGain: undefined,
    musicGain: undefined,
    soundGain: undefined,
    voiceGain: undefined,

    // 現在演奏中のBGM。
    currentMusic: undefined,

    //-----------------------------------------------------------------------------------------------------
    /**
     * 初期化を行う。このファイル末尾で呼ばれる。
     */
    initialize: function() {

        // 各ボリュームノードを作成。
        this.masterGain = AudioContext.instance.createGain();
        this.musicGain = AudioContext.instance.createGain();
        this.soundGain = AudioContext.instance.createGain();
        this.voiceGain = AudioContext.instance.createGain();

        // 各ノードを接続。
        this.musicGain.connect(this.masterGain);
        this.soundGain.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.masterGain.connect(AudioContext.instance.destination);

        // 初期値を設定。
        this.masterVolume = 1.0;
        this.musicVolume = 1.0;
        this.soundVolume = 1.0;
        this.voiceVolume = 1.0;
        this.mute = false;
    },

    //----------------------------------------------------------------------------------------------------------
    /**
     * 各音量プロパティ
     */
    get masterVolume() {
        return this.masterGain.gain.value;
    },
    set masterVolume(val) {
        this.masterGain.gain.value = val;
    },

    get musicVolume() {
        return this.musicGain.gain.value;
    },
    set musicVolume(val) {
        this.musicGain.gain.value = val;
    },

    get soundVolume() {
        return this.soundGain.gain.value;
    },
    set soundVolume(val) {
        this.soundGain.gain.value = val;
    },

    get voiceVolume() {
        return this.voiceGain.gain.value;
    },
    set voiceVolume(val) {
        this.voiceGain.gain.value = val;
    },

    //----------------------------------------------------------------------------------------------------------
    /**
     * ミュート状態を表すプロパティ。ミュートにするなら true、解除するなら false。
     */
    get mute() {
        return this._mute;
    },
    set mute(val) {

        this._mute = val;

        if(this.currentMusic)
            val ? this.pauseMusic() : this.continueMusic();
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * playMusic() の呼び出しがいつでも有効になるように準備する。ユーザジェスチャイベント中に呼ぶ必要がある。
     * 基本的に<audio>はユーザジェスチャイベント中でないとplayできないため、このメソッドの呼び出しがないままだとエラーになる場合がある。
     * まあアップデートでコロコロ変わるんですが…
     */
    ready: function() {

        // PCでもAudioContextの resume() が必要になった。
        return AudioContext.instance.resume().then(() => {

            // Android Chrome もPCと同じような挙動なんだけど、アプリの内蔵WebViewはまた違ってて、本当にユーザジェスチャ中にplay()しておく必要がある。
            // ので、play()してすぐpause()しておくという戦略をとる。ただモバイルだと曲の頭がちょっと鳴っちゃうようだが…曲の頭に空白入れておくしかないな。
            var promises = [];

            for(var res of Asset.resources.values()) {
                let art = res.art;
                if(art instanceof Audio)  promises.push( art.play().then(_=>art.pause()) );
            }

            return Promise.all(promises);
        });
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたBGMを鳴らす。すでに鳴っているBGMはストップする。ミュート中の場合は解除したときに自動開始されるBGMとして記憶される。
     * モバイル端末のブラウザではユーザイベント(onclickとか)の中でないと効かないので注意。別のタイミングで開始したい場合はユーザイベントの中で
     * あらかじめ readyMusic() を呼んでおくと良い。
     *
     * @param   Assetのキー名か、Audioオブジェクト。
     */
    playMusic: function(music) {

        // 引数正規化。
        var music = Asset.needAs(music, Audio);

        // 指定されたBGMをすでに演奏中なら何もしない。
        if(this.currentMusic == music)  return;

        // 現在演奏中のBGMをストップ。
        this.stopMusic();

        // 現在演奏中のBGMとして記憶、再生カーソルを先頭に。
        this.currentMusic = music;
        music.currentTime = 0.0;

        // MediaElementAudioSourceNode を作成してBGM用ボリュームノードにつなぐ。
        if(!music._acousmato_musicnode)  music._acousmato_musicnode = AudioContext.instance.createMediaElementSource(music);
        music._acousmato_musicnode.connect(this.musicGain);

        // 非ミュート中なら演奏開始。
        if(!this.mute)  music.play();
    },

    /**
     * 現在鳴らしているBGMをストップする。ストップした箇所から再開は出来ないので、その必要がある場合はpauseMusic()を使う。
     */
    stopMusic: function() {

        // 再生中でないなら何もしない。
        if(!this.currentMusic)  return;

        this.pauseMusic();
        this.currentMusic._acousmato_musicnode.disconnect();
        this.currentMusic = undefined;
    },

    /**
     * 現在鳴らしているBGMを一時停止する。
     */
    pauseMusic: function() {

        if(this.currentMusic)  this.currentMusic.pause();
    },

    /**
     * pauseMusic() したBGMを再開する。
     */
    continueMusic: function() {

        if(this.currentMusic  &&  !this.mute)
            this.currentMusic.play();
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定された効果音を鳴らす。20ms以内に同じ音を鳴らそうとしても無視するので留意。
     *
     * @param   Assetに保持されているサウンドのリソース名か、AudioBufferオブジェクト。
     * @return  再生のために作成した AudioBufferSourceNode。このオブジェクトのstop()を呼ぶことで途中で止めることが出来る。
     *          ミュート中は音が鳴らず、ダミーのノードが返る(この戻り値でstop()等を呼んでもエラーにならないようにするため)。
     */
    strikeSound: function(buffer) {

        return this.chimeSound(this.soundGain, buffer);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * 指定されたボイスを再生する。20ms以内に同じ音を鳴らそうとしても無視するので留意。
     *
     * @param   Assetに保持されているサウンドのリソース名か、AudioBufferオブジェクト。
     * @return  再生のために作成した AudioBufferSourceNode。このオブジェクトのstop()を呼ぶことで途中で止めることが出来る。
     *          ミュート中は音が鳴らず、ダミーのノードが返る(この戻り値でstop()等を呼んでもエラーにならないようにするため)。
     */
    speakVoice: function(buffer) {

        return this.chimeSound(this.voiceGain, buffer);
    },

    //------------------------------------------------------------------------------------------------------
    /**
     * privateメソッド。指定されたオーディオバッファを指定されたノードに接続して再生する。
     */
    chimeSound: function(outputNode, buffer) {

        // ミュートなどで再生しかなった場合のダミーの戻り値作成。
        var source = {
            stop: function(){},
            addEventListener: function(name, callback){
                setTimeout(callback, 0);
            },
        };

        // 引数正規化。
        var buffer = Asset.needAs(buffer, AudioBuffer);

        // ミュートされている場合は再生しない。
        if(this.mute)  return source;

        // 前回鳴らした時刻から規定の時間が経過していないなら無視する。
        var now = performance.now();
        if(now < buffer._acousmato_previousTime + 20)  return source;
        buffer._acousmato_previousTime = now;

        // AudioBufferSourceNode を作成して指定されたバッファを割り当て。
        var source = AudioContext.instance.createBufferSource();
        source.buffer = buffer;

        // 指定されたノードに接続して開始。
        source.connect(outputNode);
        source.start();
        return source;
    },
}

//----------------------------------------------------------------------------------------------------------

// 初期化を行っておく。
Acousmato.initialize();
