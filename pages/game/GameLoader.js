
/**
 * ローディング画面。
 */
class GameLoader extends LoaderScene {

    //-----------------------------------------------------------------------------------------------------
    _constructor(canvas) {
        super._constructor(canvas);

        // 黒背景とする。
        this.layer = 0;
        this.behaviors.set( new FillRenderer("black") );

        // 「Loading...」の文字と残りカウント数を描画する。
        this.childs.set(new LoaderText(), "text");
        this.childs.set(new LoadingRemain(), "remain");

        if(Settings["debug"]) {
            this.childs.set(new DebugGrid(), "debug-grid");
            this.childs.set(new DebugInfo(), "debug-info");
        }
    }

    //-----------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。アセットのロードを行う。
     */
    load() {

        // スクリプトのロード。
        Asset.loadScripts(

            "pages/game/title/TitleScene.js",
            "pages/game/title/TitleLogo.js",
            "pages/game/title/TitleMarch.js",
            "pages/game/title/TitleUnit.js",
//             "pages/game/title/TitleCoronator.js",

            "pages/game/clear/AllclearScene.js",
            "pages/game/clear/ClearPeacer.js",

            "pages/game/tactic/TacticScene.js",
            "pages/game/tactic/StageNameplate.js",
            "pages/game/tactic/GuideTexter.js",
            "pages/game/tactic/ScoutPlate.js",
            "pages/game/tactic/PredictPlate.js",
            "pages/game/tactic/ValuePopper.js",
            "pages/game/tactic/PopupExecutant.js",
            "pages/game/tactic/effects.js",
            "pages/game/tactic/GameoverScreen.js",
            "pages/game/tactic/StageClearScreen.js",
            "pages/game/tactic/stage/StageExecutant.js",
            "pages/game/tactic/stage/StageSupervisor.js",
            "pages/game/tactic/stage/CommandQueue.js",
            "pages/game/tactic/stage/StageCommand.js",
            "pages/game/tactic/stage/commands-unit.js",
            "pages/game/tactic/stage/commands-misc.js",
            "pages/game/tactic/stage/StageMap.js",
            "pages/game/tactic/stage/StageBlock.js",
            "pages/game/tactic/stand/StandExecutant.js",
//             "pages/game/tactic/stand/ornaments.js",
            "pages/game/tactic/stand/UnitExecutant.js",
            "pages/game/tactic/stand/UnitBrain.js",
            "pages/game/tactic/stand/AutoBrain.js",
            "pages/game/tactic/stand/InputBrain.js",
            "pages/game/tactic/stand/UnitTask.js",

//             "pages/game/clear/ClearScene.js",
//             "pages/game/clear/FireworkMist.js",
//             "pages/game/clear/clear-uis.js"
        );

        // アセットのロード。
        Asset.loadAll(

            "art/data/stages.txt",
            "art/data/stage01.json",
            "art/data/stage02.json",
            "art/data/stage03.json",
            "art/data/stage04.json",
            "art/data/stage05.json",
            "art/data/stage06.json",
            "art/data/stage07.json",
            "art/data/stage08.json",
            "art/data/region1.json",
            "art/data/plainfield.json",
            "art/data/tips_b_01_data.json",
            "art/data/tips_b_11_data.json",
            "art/data/tips_d_01_data.json",
            "art/data/tips_e_t01A_data.json",
            "art/data/tips_e_t09_data.json",
            "art/graph/tips_b_01.x3.8&23.jam.png",
            "art/graph/tips_b_11.x3.8&4.png",
            "art/graph/tips_d_01.x3.8&7.jam.png",
            "art/graph/tips_e_t01A.x3.8&26.jam.png",
            "art/graph/tips_e_t09.x3.8&5.jam.png",

            "art/graph/title.svg",
            "art/graph/stage-caption.svg",
            "art/graph/stage-numbers.svg",
            "art/graph/gameover-caption.svg",
            "art/graph/gameclear-caption.8&1.png",
            "art/graph/gameclear-hiyoko.png",
            "art/graph/peacesign.png",
            "art/graph/stage-clear-caption.png",
            "art/graph/stage-clear-ribbon.png",
            "art/graph/twinkle.svg",

            "art/graph/leader_flag.png",
            "art/graph/swordlag.png",
            "art/graph/gunfire.png",
            "art/graph/slash.5&2.png",
            "art/graph/shoteye.1&2.png",
            "art/graph/units.2&3.png",
            "art/graph/window.png",
            "art/graph/targeter.svg",
            "art/graph/numbers.png",
            "art/graph/miss.png",
            "art/graph/explosion.4&2.png",

            "art/graph/tutorial-2.png",
            "art/graph/tutorial-3.png",
            "art/graph/tutorial-4.png",
            "art/graph/tutorial-5.png",
            "art/graph/tutorial-6.png",

            ["art/sound/sword-gesture2.wav", "swordlag-se"],
            ["art/sound/punch-middle2.wav", "slash-se"],
            ["art/sound/machinegun2.wav", "gunfire-se"],
            ["art/sound/ricochets1.wav", "shoteye-se"],
            ["art/sound/cannon2.wav", "cannonfire-se"],
            ["art/sound/bomb1.wav", "explosion-se"],
            ["art/sound/magic-drain2.wav", "death-se"],
            ["art/sound/walk-school1.wav", "step-se"],
            ["art/sound/cursor1.wav", "tap1-se"],
            ["art/sound/chick-cry1.wav", "reply-se"],
            ["art/sound/kotsudumi1.wav", "panel-se"],

            ["art/sound/decision16.wav", "gamestart-se"],
            ["art/sound/gakkarisitayo.wav", "gameover-se"],
            ["art/sound/tonetakameno_opening.wav", "stageclear-se"],

            ["art/music/god_break.mp3", "stage01-mu"],
            ["art/music/nigerarenai.mp3", "stage02-mu"],
            ["art/music/kyouteki_syutugen.mp3", "stage03-mu"],
            ["art/music/hi_voltage.mp3", "stage04-mu"],
            ["art/music/slashmetal.mp3", "stage05-mu"],
            ["art/music/zigg-zagg.mp3", "stage06-mu"],
            ["art/music/combat_frame.mp3", "stage07-mu"],
            ["art/music/rain_and_co_ii.mp3", "stage08-mu"],
        );

        // ステージデータについては ParagraphsResource に変換する。
        var res = new ParagraphsResource( Asset.resources.get("stages") );
        Asset.loadResource(res, "stages", true);
    }

    //------------------------------------------------------------------------------------------------------
    /**
     * オーバーライド。ロードが完了したときの処理を行う。
     */
    loadout(canvas) {

        console.log("load finished");

        return new TitleScene(canvas);
//         return new TacticScene(canvas, 8);
//         return new AllclearScene(canvas);
    }
}


//==========================================================================================================
/**
 * 「Loading...」の文字を描画する実行素子。
 */
class LoaderText extends Executant {

    //------------------------------------------------------------------------------------------------------
    _constructor() {
        super._constructor();

        this.layer = 1;

        // 画面右下を起点とする。
        this.behaviors.set( new PositionAnchor(null, new Point(1,1), new Point(-350,-100)) );

        // 左揃えのテキスト。
        var renderer = new TextRenderer();
        renderer.style = "white";
        renderer.halign = "left";
        renderer.valign = "bottom";
        this.behaviors.set(renderer);
    }

    //------------------------------------------------------------------------------------------------------
    update(scene) {

        // 末尾の「...」を、2.5秒周期の4段階で変化させる。
        var length = Math.floor( (scene.time % 2500) / 2500 * 4 );
        this.text = "Loading" + ".".repeat(length);
    }
}
