import {
  G,
  MAP_W,
  MAP_H,
  CANVAS_W,
  CANVAS_H,
  VIEW_W,
  VIEW_H,
  HUD_H,
  SCALE,
  STATE_MENU,
  STATE_OPTIONS,
  STATE_CUSTOMIZE,
  STATE_FADING,
  STATE_LOADING,
  STATE_PLAYING,
  STATE_PAUSED,
  STATE_ROUND_OVER,
  STATE_GAMEOVER,
  STATE_JOINING,
  STATE_PAUSE_GFX,
  STATE_WEAPON_LIST,
  STATE_WEAPON_SELECT,
  STATE_VICTORY,
  STATE_LEVEL_PROMPT,
  STATE_LEVEL_EDITOR,
  STATE_MODE_SELECT,
  STATE_WIN_CONFIG,
  STATE_COUNTDOWN,
  TOTAL_WEAPONS,
  WEAPON_NAMES,
  WEAPON_DESC,
  t,
  MAX_AMMO,
  RELOAD_TIMES,
  STATE_HOW_TO_PLAY,
  STATE_CREDITS,
  STATE_EXITED,
  STATE_MULTIPLAYER,
  STATE_LOBBY,
  STATE_USERNAME_INPUT,
} from "./globals";
import { playSound, startMenuMusic, stopMenuMusic } from "./audio";
import { drawSpritePreview } from "./player";
import { renderFullTerrainCanvas } from "./map";
import {
  fetchLobbiesList,
  createOnlineLobby,
  joinOnlineLobby,
  sendSettingsUpdate,
  sendLobbyChatMessage,
  triggerMultiplayerPlay,
  leaveCurrentLobby,
} from "./multiplayer";

const PLAYER_NAMES = ["KingJani", "Poopyfart69", "Mato", "Seppo"];
const PLAYER_COLORS = ["#FFEE22", "#44EE44", "#FF5555", "#5599FF"];

export const mainMenuOptions = [
  "START_GAME",
  "START_4P",
  "START_ARENA",
  "ONLINE_MULTIPLAYER",
  "CUSTOMIZE",
  "WEAPON_LIST",
  "LEVEL_EDITOR",
  "HOW_TO_PLAY",
  "OPTIONS",
  "CREDITS",
  "EXIT",
];
export const pauseMenuOptions = ["RESUME_GAME", "PAUSE_GFX", "QUIT_TO_OS"];
export function getPauseOptions() {
  if ((G as any).mpIsGameActive) {
    if (G.mpIsHost) {
      return ["RESUME_GAME", "PAUSE_GFX", "QUIT_TO_LOBBY"];
    } else {
      return ["RESUME_GAME", "PAUSE_GFX"];
    }
  }
  return ["RESUME_GAME", "PAUSE_GFX", "QUIT_TO_OS"];
}
export const gfxMenuOptions = ["GORE", "BONES", "SHADOWS", "DARKNESS", "BACK"];
export const gameOverOptions = ["PLAY_AGAIN", "MAIN_MENU"];

export let mainMenuSel = 0,
  optionsMenuSel = 0,
  pauseMenuSel = 0,
  gfxMenuSel = 0,
  gameOverSel = 0;
export let wsCursors = [0, 0, 0, 0],
  wsReady = [false, false, false, false],
  wsLastInput = [0, 0, 0, 0],
  wsConfirmExit = false;
export let customizeSel = 0,
  edUnsaved = false,
  edConfirmExit = false,
  modeSel = 0,
  winConfigSel = 0,
  levelPromptSel = 0;

export let weaponListScroll = 0;
export function scrollWeaponList(dir: number) {
  weaponListScroll = Math.max(
    0,
    Math.min(TOTAL_WEAPONS - 6, weaponListScroll + dir),
  );
}

export function cycleWeapon(
  playerIndex: number,
  slotIndex: number,
  dir: number,
) {
  let current = G.wsLoadouts[playerIndex][slotIndex];
  for (let i = 0; i < TOTAL_WEAPONS; i++) {
    current =
      (((current + dir) % TOTAL_WEAPONS) + TOTAL_WEAPONS) % TOTAL_WEAPONS;
    if (current === 3 || current === 11) continue; // Skip shovel and rope
    if (!G.wsLoadouts[playerIndex].includes(current)) {
      G.wsLoadouts[playerIndex][slotIndex] = current;
      break;
    }
  }
}

export function handleMenuInputUI(
  navUp: boolean,
  navDown: boolean,
  navLeft: boolean,
  navRight: boolean,
  select: boolean,
  back: boolean,
) {
  const now = Date.now();

  if (G.gameState === STATE_MENU) {
    startMenuMusic();
    if (navUp) {
      mainMenuSel =
        (mainMenuSel - 1 + mainMenuOptions.length) % mainMenuOptions.length;
      playSound("hover");
    }
    if (navDown) {
      mainMenuSel = (mainMenuSel + 1) % mainMenuOptions.length;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      if (mainMenuSel === 0) {
        G.is4PlayerMode = false;
        G.isArenaMode = false;
        G.gameState = STATE_JOINING;
        G.joinedPlayers.clear();
        G.activeGamepadIndices = [];
      }
      if (mainMenuSel === 1) {
        G.is4PlayerMode = true;
        G.isArenaMode = false;
        G.gameState = STATE_JOINING;
        G.joinedPlayers.clear();
        G.activeGamepadIndices = [];
      }
      if (mainMenuSel === 2) {
        G.is4PlayerMode = false;
        G.isArenaMode = true;
        G.gameState = STATE_JOINING;
        G.joinedPlayers.clear();
        G.activeGamepadIndices = [];
      }
      if (mainMenuSel === 3) {
        G.gameState = STATE_MULTIPLAYER;
        G.mpUIMenuSel = 0;
        G.mpCursorX = CANVAS_W / 2;
        G.mpCursorY = CANVAS_H / 2;
        fetchLobbiesList();
      }
      if (mainMenuSel === 4) G.gameState = STATE_CUSTOMIZE;
      if (mainMenuSel === 5) G.gameState = STATE_WEAPON_LIST;
      if (mainMenuSel === 6) {
        G.gameState = STATE_LEVEL_EDITOR;
        G.terrainMap = new Uint8Array(MAP_W * MAP_H);
        renderFullTerrainCanvas();
      }
      if (mainMenuSel === 7) G.gameState = STATE_HOW_TO_PLAY;
      if (mainMenuSel === 8) G.gameState = STATE_OPTIONS;
      if (mainMenuSel === 9) G.gameState = STATE_CREDITS;
      if (mainMenuSel === 10) {
        G.gameState = STATE_EXITED;
        stopMenuMusic();
        try {
          window.close();
        } catch (e) {}
      }
    }
    return;
  }

  if (G.gameState === STATE_HOW_TO_PLAY || G.gameState === STATE_CREDITS) {
    if (select || back) {
      playSound("click");
      G.gameState = STATE_MENU;
    }
    return;
  }

  if (G.gameState === STATE_MODE_SELECT) {
    if (navLeft || navRight) {
      modeSel = (modeSel + 1) % 2;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      G.gameMode = modeSel === 0 ? "NORMAL" : "GUNGAME";
      G.gameState = STATE_WEAPON_SELECT;
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_JOINING;
      G.joinedPlayers.clear();
      G.activeGamepadIndices = [];
    }
    return;
  }

  if (G.gameState === STATE_WEAPON_SELECT) {
    if (back) {
      wsConfirmExit = true;
      G.gameState = STATE_MENU;
      return;
    }
    if (G.gameMode === "GUNGAME") {
      if (select) {
        playSound("click");
        G.gameState = STATE_WIN_CONFIG;
      }
      return;
    }
    // Real weapon selection uses gp buttons in updates... falling back to enter for now to skip
    if (select) {
      playSound("click");
      G.gameState = STATE_WIN_CONFIG;
    }
    return;
  }

  if (G.gameState === STATE_WIN_CONFIG) {
    if (G.gameMode === "GUNGAME") {
      if (navUp) {
        winConfigSel = (winConfigSel - 1 + 3) % 3;
        playSound("hover");
      }
      if (navDown) {
        winConfigSel = (winConfigSel + 1) % 3;
        playSound("hover");
      }
      if (navLeft || navRight) {
        const dir = navRight ? 1 : -1;
        if (winConfigSel === 0)
          G.settingKillsToWin = Math.max(1, G.settingKillsToWin + dir);
        else if (winConfigSel === 1)
          G.timeModeMinutes = Math.max(1, G.timeModeMinutes + dir);
        playSound("hover");
      }
      if (select) {
        playSound("click");
        if (winConfigSel === 0) G.winMode = "KILLS";
        else if (winConfigSel === 1) G.winMode = "TIME";
        G.gameState = STATE_LEVEL_PROMPT;
      }
      if (back) {
        playSound("click");
        G.gameState = STATE_WEAPON_SELECT;
      }
      return;
    }

    const maxSel = G.is4PlayerMode ? 3 : 2;
    if (navUp) {
      winConfigSel = (winConfigSel - 1 + (maxSel + 1)) % (maxSel + 1);
      playSound("hover");
    }
    if (navDown) {
      winConfigSel = (winConfigSel + 1) % (maxSel + 1);
      playSound("hover");
    }
    if (navLeft || navRight) {
      const dir = navRight ? 1 : -1;
      if (winConfigSel === 0 && G.is4PlayerMode)
        G.settingKillsToWin = Math.max(1, G.settingKillsToWin + dir);
      else if (winConfigSel === (G.is4PlayerMode ? 1 : 0))
        G.settingLives = Math.max(1, G.settingLives + dir);
      else if (winConfigSel === (G.is4PlayerMode ? 2 : 1))
        G.timeModeMinutes = Math.max(1, G.timeModeMinutes + dir);
      playSound("hover");
    }
    if (select) {
      playSound("click");
      if (G.is4PlayerMode) {
        if (winConfigSel === 0) G.winMode = "KILLS";
        else if (winConfigSel === 1) G.winMode = "LIVES";
        else if (winConfigSel === 2) G.winMode = "TIME";
      } else {
        if (winConfigSel === 0) G.winMode = "LIVES";
        else if (winConfigSel === 1) G.winMode = "TIME";
      }
      G.gameState = STATE_LEVEL_PROMPT;
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_WEAPON_SELECT;
    }
    return;
  }

  if (G.gameState === STATE_LEVEL_PROMPT) {
    if (navUp) {
      levelPromptSel = (levelPromptSel - 1 + 2) % 2;
      playSound("hover");
    }
    if (navDown) {
      levelPromptSel = (levelPromptSel + 1) % 2;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      if (levelPromptSel === 0) return "START";
      else return "START_FILE";
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_WIN_CONFIG;
    }
    return;
  }

  if (G.gameState === STATE_PAUSED) {
    const opts = getPauseOptions();
    if (navUp) {
      pauseMenuSel = (pauseMenuSel - 1 + opts.length) % opts.length;
      playSound("hover");
    }
    if (navDown) {
      pauseMenuSel = (pauseMenuSel + 1) % opts.length;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      const targetOpt = opts[pauseMenuSel];
      if (targetOpt === "RESUME_GAME") {
        G.gameState = STATE_PLAYING;
      } else if (targetOpt === "PAUSE_GFX") {
        G.gameState = STATE_PAUSE_GFX;
      } else if (targetOpt === "QUIT_TO_OS") {
        G.gameState = STATE_MENU;
      } else if (targetOpt === "QUIT_TO_LOBBY") {
        import("./multiplayer").then((mp) => {
          mp.hostQuitMatchToLobby();
        });
      }
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_PLAYING;
    }
  }

  if (G.gameState === STATE_PAUSE_GFX) {
    if (navUp) {
      gfxMenuSel =
        (gfxMenuSel - 1 + gfxMenuOptions.length) % gfxMenuOptions.length;
      playSound("hover");
    }
    if (navDown) {
      gfxMenuSel = (gfxMenuSel + 1) % gfxMenuOptions.length;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      if (gfxMenuSel === 0) {
        G.settingGore = (G.settingGore + 1) % 3;
      }
      if (gfxMenuSel === 1) {
        G.settingBones = !G.settingBones;
      }
      if (gfxMenuSel === 2) {
        G.settingShadows = !G.settingShadows;
      }
      if (gfxMenuSel === 3) {
        G.settingDarkness = !G.settingDarkness;
      }
      if (gfxMenuSel === 4) {
        G.gameState = STATE_PAUSED;
      }
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_PAUSED;
    }
  }

  if (G.gameState === STATE_OPTIONS) {
    const opts = [
      "LANGUAGE",
      "GORE",
      "BONES",
      "SHADOWS",
      "DARKNESS",
      "SFX_VOL",
      "MUSIC_VOL",
      "VICTORY_VOL",
      "VIBRATION",
      "BACK",
    ];
    if (navUp) {
      optionsMenuSel = (optionsMenuSel - 1 + opts.length) % opts.length;
      playSound("hover");
    }
    if (navDown) {
      optionsMenuSel = (optionsMenuSel + 1) % opts.length;
      playSound("hover");
    }

    if (navLeft || navRight) {
      const dx = navRight ? 1 : -1;
      if (optionsMenuSel === 5) {
        G.settingSfxVol = Math.max(0, Math.min(10, G.settingSfxVol + dx));
        import("./audio").then((a) => {
          a.updateAudioVolumes();
          a.playSound("hover");
        });
      } else if (optionsMenuSel === 6) {
        G.settingMusicVol = Math.max(0, Math.min(10, G.settingMusicVol + dx));
        import("./audio").then((a) => {
          a.updateAudioVolumes();
        });
      } else if (optionsMenuSel === 7) {
        G.settingVictoryVol = Math.max(
          0,
          Math.min(10, G.settingVictoryVol + dx),
        );
        import("./audio").then((a) => {
          a.updateAudioVolumes();
        });
      } else if (optionsMenuSel === 8) {
        G.settingVibration = (G.settingVibration + dx + 3) % 3;
        playSound("hover");
      }
    }

    if (select) {
      playSound("click");
      if (optionsMenuSel === 0) {
        G.currentLang = G.currentLang === 1 ? 0 : 1;
      }
      if (optionsMenuSel === 1) {
        G.settingGore = (G.settingGore + 1) % 3;
      }
      if (optionsMenuSel === 2) {
        G.settingBones = !G.settingBones;
      }
      if (optionsMenuSel === 3) {
        G.settingShadows = !G.settingShadows;
      }
      if (optionsMenuSel === 4) {
        G.settingDarkness = !G.settingDarkness;
      }
      if (optionsMenuSel === opts.length - 1) {
        G.gameState = STATE_MENU;
      }
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_MENU;
    }
  }

  if (G.gameState === STATE_CUSTOMIZE) {
    if (navUp) {
      customizeSel =
        (customizeSel - 1 + (G.is4PlayerMode ? 4 : 2)) %
        (G.is4PlayerMode ? 4 : 2);
      playSound("hover");
    }
    if (navDown) {
      customizeSel = (customizeSel + 1) % (G.is4PlayerMode ? 4 : 2);
      playSound("hover");
    }
    if (navLeft) {
      G.customizeSkins[customizeSel] = (G.customizeSkins[customizeSel] + 1) % 2;
      playSound("hover");
    }
    if (navRight) {
      G.customizeSkins[customizeSel] = (G.customizeSkins[customizeSel] + 1) % 2;
      playSound("hover");
    }
    if (back) {
      playSound("click");
      G.gameState = STATE_MENU;
    }
    return;
  }

  if (G.gameState === STATE_WEAPON_LIST) {
    if (navUp) {
      weaponListScroll = Math.max(0, weaponListScroll - 2);
      playSound("hover");
    }
    if (navDown) {
      weaponListScroll = Math.min(TOTAL_WEAPONS - 6, weaponListScroll + 2);
      playSound("hover");
    }
    if (select || back) {
      playSound("click");
      G.gameState = STATE_MENU;
    }
    return;
  }

  if (G.gameState === STATE_GAMEOVER) {
    if (navUp) {
      gameOverSel =
        (gameOverSel - 1 + gameOverOptions.length) % gameOverOptions.length;
      playSound("hover");
    }
    if (navDown) {
      gameOverSel = (gameOverSel + 1) % gameOverOptions.length;
      playSound("hover");
    }
    if (select) {
      playSound("click");
      if (gameOverSel === 0) {
        G.gameState = STATE_WEAPON_SELECT;
        wsReady = [false, false, false, false];
      }
      if (gameOverSel === 1) {
        G.joinedPlayers.clear();
        G.activeGamepadIndices = [];
        stopMenuMusic();
        startMenuMusic();
        G.gameState = STATE_MENU;
      }
    }
  }

  if (G.gameState === STATE_MULTIPLAYER) {
    if (G.mpAlertMsg) {
      if (select || back) {
        G.mpAlertMsg = null;
        playSound("click");
      }
      return;
    }

    if (back) {
      playSound("click");
      G.gameState = STATE_MENU;
      return;
    }

    const totalLobbies = G.mpLobbies.length;
    const maxSel = 4 + totalLobbies; // 0=Refresh, 1=Create, 2=Join, 3=Back, 4+=Lobbies
    if (navUp) {
      G.mpUIMenuSel = (G.mpUIMenuSel - 1 + maxSel) % maxSel;
      playSound("hover");
      G.usingMouse = false;
    }
    if (navDown) {
      G.mpUIMenuSel = (G.mpUIMenuSel + 1) % maxSel;
      playSound("hover");
      G.usingMouse = false;
    }

    if (select) {
      playSound("click");
      if (G.mpUIMenuSel === 0) {
        fetchLobbiesList();
      } else if (G.mpUIMenuSel === 1) {
        G.gameState = STATE_USERNAME_INPUT;
        (G as any).mpJoinLobbyId = null; // create mode
        G.mpUsername = "Player";
      } else if (G.mpUIMenuSel === 2) {
        // Find a lobby to join
        let lobbyToJoin = null;
        const highlightedIndex = G.mpUIMenuSel >= 4 ? G.mpUIMenuSel - 4 : -1;
        if (highlightedIndex >= 0 && highlightedIndex < G.mpLobbies.length) {
          lobbyToJoin = G.mpLobbies[highlightedIndex];
        } else {
          lobbyToJoin = G.mpLobbies.find(lob => !lob.guestId && lob.status !== "playing");
        }
        if (lobbyToJoin) {
          G.gameState = STATE_USERNAME_INPUT;
          (G as any).mpJoinLobbyId = lobbyToJoin.id;
          G.mpUsername = "Player";
        } else {
          G.mpJoinLobbyNotImplementedMsg = true;
          setTimeout(() => {
            G.mpJoinLobbyNotImplementedMsg = false;
          }, 2500);
        }
      } else if (G.mpUIMenuSel === 3) {
        G.gameState = STATE_MENU;
      } else {
        const lobbyIdx = G.mpUIMenuSel - 4;
        const lobby = G.mpLobbies[lobbyIdx];
        if (lobby) {
          if (lobby.guestId || lobby.status === "playing") {
            playSound("explosion_puff"); // full/active error noise
          } else {
            G.gameState = STATE_USERNAME_INPUT;
            (G as any).mpJoinLobbyId = lobby.id; // join mode target id
            G.mpUsername = "Player";
          }
        }
      }
    }
    return;
  }

  if (G.gameState === STATE_USERNAME_INPUT) {
    if (back) {
      playSound("click");
      G.gameState = STATE_MULTIPLAYER;
      return;
    }

    // Options: 0 = Username, 1 = Apply, 2 = Cancel
    if (navUp) {
      G.mpUIMenuSel = (G.mpUIMenuSel - 1 + 3) % 3;
      playSound("hover");
      G.usingMouse = false;
    }
    if (navDown) {
      G.mpUIMenuSel = (G.mpUIMenuSel + 1) % 3;
      playSound("hover");
      G.usingMouse = false;
    }

    if (select) {
      playSound("click");
      if (G.mpUIMenuSel === 1 || G.mpUIMenuSel === 0) {
        if (G.mpUsername.trim().length >= 3 && G.mpUsername.trim().length <= 20) {
          const tgtId = (G as any).mpJoinLobbyId;
          if (tgtId) {
            joinOnlineLobby(tgtId, G.mpUsername.trim());
          } else {
            createOnlineLobby(G.mpUsername.trim());
          }
        } else {
          playSound("explosion_puff");
        }
      } else if (G.mpUIMenuSel === 2) {
        G.gameState = STATE_MULTIPLAYER;
      }
    }
    return;
  }

  if (G.gameState === STATE_LOBBY) {
    if (G.mpConfirmLeaveModal) {
      if (navLeft || navRight) {
        G.mpUIMenuSel = G.mpUIMenuSel === 0 ? 1 : 0;
        playSound("hover");
      }
      if (select) {
        playSound("click");
        if (G.mpUIMenuSel === 0) {
          leaveCurrentLobby(true);
        } else {
          G.mpConfirmLeaveModal = false;
        }
      }
      if (back) {
        G.mpConfirmLeaveModal = false;
        playSound("click");
      }
      return;
    }

    const maxSettingsCount = G.mpIsHost ? 9 : 3; // Host: 0-4 settings, 5 chat, 6 ready, 7 start, 8 leave | Guest: 0 chat, 1 ready, 2 leave
    if (navUp) {
      G.mpLobbySettingsSel = (G.mpLobbySettingsSel - 1 + maxSettingsCount) % maxSettingsCount;
      playSound("hover");
      G.usingMouse = false;
    }
    if (navDown) {
      G.mpLobbySettingsSel = (G.mpLobbySettingsSel + 1) % maxSettingsCount;
      playSound("hover");
      G.usingMouse = false;
    }

    if (G.mpIsHost) {
      if (navLeft || navRight) {
        G.usingMouse = false;
        const dir = navLeft ? -1 : 1;
        if (G.mpLobbySettingsSel === 0) {
          const modes = ["NORMAL", "ARENA", "GUNGAME"];
          let cur = modes.indexOf(G.gameMode);
          cur = (cur + dir + modes.length) % modes.length;
          G.gameMode = modes[cur];
          G.isArenaMode = G.gameMode === "ARENA";
          sendSettingsUpdate();
          playSound("hover");
        } else if (G.mpLobbySettingsSel === 1) {
          G.winMode = G.winMode === "KILLS" ? "TIME" : "KILLS";
          sendSettingsUpdate();
          playSound("hover");
        } else if (G.mpLobbySettingsSel === 2) {
          if (G.winMode === "KILLS") {
            G.settingKillsToWin = Math.max(1, Math.min(50, G.settingKillsToWin + dir));
          } else {
            G.timeModeMinutes = Math.max(1, Math.min(15, G.timeModeMinutes + dir));
          }
          sendSettingsUpdate();
          playSound("hover");
        } else if (G.mpLobbySettingsSel === 3) {
          G.settingGore = (G.settingGore + dir + 3) % 3;
          sendSettingsUpdate();
          playSound("hover");
        } else if (G.mpLobbySettingsSel === 4) {
          G.isArenaMode = !G.isArenaMode;
          if (G.isArenaMode) G.gameMode = "ARENA";
          sendSettingsUpdate();
          playSound("hover");
        }
      }
    }

    if (select) {
      playSound("click");
      if (G.mpIsHost) {
        if (G.mpLobbySettingsSel >= 0 && G.mpLobbySettingsSel <= 4) {
          // Enter cycles the settings value as convenient shortcut
          const dir = 1;
          const i = G.mpLobbySettingsSel;
          if (i === 0) {
            const modes = ["NORMAL", "ARENA", "GUNGAME"];
            let cur = modes.indexOf(G.gameMode);
            cur = (cur + dir + modes.length) % modes.length;
            G.gameMode = modes[cur];
            G.isArenaMode = G.gameMode === "ARENA";
          } else if (i === 1) {
            G.winMode = G.winMode === "KILLS" ? "TIME" : "KILLS";
          } else if (i === 2) {
            if (G.winMode === "KILLS") {
              G.settingKillsToWin = G.settingKillsToWin >= 50 ? 5 : G.settingKillsToWin + 5;
            } else {
              G.timeModeMinutes = G.timeModeMinutes >= 15 ? 1 : G.timeModeMinutes + 1;
            }
          } else if (i === 3) {
            G.settingGore = (G.settingGore + 1) % 3;
          } else if (i === 4) {
            G.isArenaMode = !G.isArenaMode;
            if (G.isArenaMode) G.gameMode = "ARENA";
          }
          sendSettingsUpdate();
        } else if (G.mpLobbySettingsSel === 6) {
          // Toggle Ready Check
          import("./multiplayer").then((mp) => {
            mp.toggleLobbyReady();
          });
        } else if (G.mpLobbySettingsSel === 7) {
          // START GAME Validation to deny solo start
          const isGuestJoined = !!G.mpCurrentLobby?.guestId;
          const hostReady = !!G.mpCurrentLobby?.hostReady;
          const guestReady = !!G.mpCurrentLobby?.guestReady;
          if (isGuestJoined && hostReady && guestReady) {
            triggerMultiplayerPlay();
          } else {
            playSound("explosion_puff");
          }
        } else if (G.mpLobbySettingsSel === 8) {
          G.mpConfirmLeaveModal = true;
          G.mpUIMenuSel = 1;
        }
      } else {
        if (G.mpLobbySettingsSel === 1) {
          // TOGGLE READY Call for Guest
          import("./multiplayer").then((mp) => {
            mp.toggleLobbyReady();
          });
        } else if (G.mpLobbySettingsSel === 2) {
          G.mpConfirmLeaveModal = true;
          G.mpUIMenuSel = 1;
        }
      }
    }

    if (back) {
      playSound("click");
      G.mpConfirmLeaveModal = true;
      G.mpUIMenuSel = 1;
    }
    return;
  }
}

export function drawMenuOverlay() {
  if (!G.ctx) return;

  if (G.gameState === 4) { // STATE_LOADING
    drawBgNoise();
    G.ctx.fillStyle = "rgba(10, 5, 2, 0.95)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFDD55";
    G.ctx.font = "32px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      G.currentLang === 1 ? "LADATAAN PELIÄ..." : "LOADING GAME...",
      CANVAS_W / 2,
      CANVAS_H / 2 - 10,
    );
    G.ctx.fillStyle = "#88AAFF";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(
      G.currentLang === 1
        ? "Valmistellaan peliareenaa ja synkronoidaan..."
        : "Preparing match arena and synchronizing...",
      CANVAS_W / 2,
      CANVAS_H / 2 + 25,
    );
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_MENU) {
    if (G.menuMapCanvas) {
      const cx = MAP_W / 2 + Math.cos(Date.now() / 4000) * (MAP_W / 3);
      const cy = MAP_H / 2 + Math.sin(Date.now() / 3000) * (MAP_H / 3);
      const vx = Math.max(0, Math.min(MAP_W - CANVAS_W, cx - CANVAS_W / 2));
      const vy = Math.max(0, Math.min(MAP_H - CANVAS_H, cy - CANVAS_H / 2));
      G.ctx.drawImage(
        G.menuMapCanvas,
        vx,
        vy,
        CANVAS_W,
        CANVAS_H,
        0,
        0,
        CANVAS_W,
        CANVAS_H,
      );

      // Add some random fake activity
      if (Math.random() < 0.05) {
        const ex = vx + Math.random() * CANVAS_W;
        const ey = vy + Math.random() * CANVAS_H;
        G.ctx.fillStyle = Math.random() > 0.5 ? "#F80" : "#F00";
        G.ctx.beginPath();
        G.ctx.arc(ex - vx, ey - vy, Math.random() * 20 + 10, 0, Math.PI * 2);
        G.ctx.fill();
      }
    } else {
      drawBgNoise();
    }
    G.ctx.fillStyle = "rgba(40,15,5,0.7)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFD700";
    G.ctx.font = "46px 'VT323',monospace";
    G.ctx.textAlign = "left";
    G.ctx.fillText(" PunkkiGAME", 18, 55);

    for (let i = 0; i < mainMenuOptions.length; i++) {
      let txt = t(mainMenuOptions[i]);
      if (i === mainMenuSel) {
        G.ctx.fillStyle = "#0F0";
        txt = "> " + txt;
      } else G.ctx.fillStyle = "#88AAFF";
      G.ctx.font = "20px 'VT323',monospace";
      G.ctx.fillText(txt, 25, 76 + i * 22);
    }
    G.ctx.fillStyle = "#555";
    G.ctx.font = "11px 'VT323',monospace";
    G.ctx.fillText(t("COPYRIGHT"), 10, CANVAS_H - 12);
    return;
  }

  if (G.gameState === STATE_EXITED) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(10,5,2,0.95)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FF4444";
    G.ctx.font = "38px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      G.currentLang === 1 ? "POISTUTTU PELISTÄ" : "GAME EXITED",
      CANVAS_W / 2,
      CANVAS_H / 2 - 25,
    );
    G.ctx.fillStyle = "#888";
    G.ctx.font = "18px 'VT323',monospace";
    G.ctx.fillText(
      G.currentLang === 1 ? "Kiitos pelaamisesta!" : "Thank you for playing!",
      CANVAS_W / 2,
      CANVAS_H / 2 + 10,
    );
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillText(
      G.currentLang === 1
        ? "Voit sulkea sovellusikkunan."
        : "You can now close this application window.",
      CANVAS_W / 2,
      CANVAS_H / 2 + 35,
    );
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_MULTIPLAYER) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(15, 8, 3, 0.92)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Header Title
    G.ctx.fillStyle = "#FFAA00";
    G.ctx.font = "34px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      G.currentLang === 1 ? "ONLINE MULTIPLAYER" : "Online multiplayer",
      CANVAS_W / 2,
      42,
    );

    const totalLobbies = G.mpLobbies.length;
    
    // Summary
    G.ctx.fillStyle = "#88AAFF";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.textAlign = "left";
    G.ctx.fillText(
      G.currentLang === 1 
        ? `LÖYTYNYT ${totalLobbies} PELIÄ` 
        : `FOUND ${totalLobbies} LOBBIES`,
      25,
      75,
    );

    G.ctx.textAlign = "right";
    G.ctx.fillStyle = "#888";
    G.ctx.font = "13px 'VT323',monospace";
    G.ctx.fillText(
      G.currentLang === 1 
        ? `Automaattinen päivitys (15s)` 
        : `Auto refresh enabled (15s)`,
      CANVAS_W - 25,
      75,
    );

    // Lobbies Area Table
    G.ctx.fillStyle = "rgba(0,0,0,0.4)";
    G.ctx.fillRect(20, 85, CANVAS_W - 40, 195);
    G.ctx.strokeStyle = "#553311";
    G.ctx.strokeRect(20, 85, CANVAS_W - 40, 195);

    // Table Header Columns
    G.ctx.fillStyle = "#55AA44";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.textAlign = "left";
    G.ctx.fillText(G.currentLang === 1 ? "AULA (HOST)" : "LOBBY (HOST)", 35, 102);
    G.ctx.fillText(G.currentLang === 1 ? "PELIMUOTO" : "MODE", 230, 102);
    G.ctx.fillText(G.currentLang === 1 ? "STATUS" : "STATUS", 360, 102);
    G.ctx.fillText("PING", 480, 102);
    G.ctx.textAlign = "center";
    G.ctx.fillText(G.currentLang === 1 ? "LIITY" : "JOIN", 585, 102);

    // Draw separations line
    G.ctx.strokeStyle = "#553311";
    G.ctx.beginPath();
    G.ctx.moveTo(25, 108);
    G.ctx.lineTo(CANVAS_W - 25, 108);
    G.ctx.stroke();

    if (totalLobbies === 0) {
      G.ctx.fillStyle = "#888";
      G.ctx.font = "18px 'VT323',monospace";
      G.ctx.textAlign = "center";
      G.ctx.fillText(
        G.currentLang === 1 ? "EI LÖYTYNEITÄ AULOJA" : "No lobbies found",
        CANVAS_W / 2,
        180,
      );
    } else {
      for (let i = 0; i < totalLobbies; i++) {
        const lob = G.mpLobbies[i];
        const yCoord = 125 + i * 30;
        const isFocused = G.mpUIMenuSel === (4 + i);

        if (isFocused) {
          G.ctx.fillStyle = "rgba(40, 150, 40, 0.15)";
          G.ctx.fillRect(25, yCoord - 14, CANVAS_W - 50, 24);
        }

        const nameText = `${lob.hostName}'s lobby`;
        G.ctx.fillStyle = isFocused ? "#11FF11" : "#FFDD55";
        G.ctx.font = "16px 'VT323',monospace";
        G.ctx.textAlign = "left";
        G.ctx.fillText(nameText, 35, yCoord + 2);

        // Draw a neat inline connect green indicator label right next to the lobby name!
        const isFull = !!lob.guestId;
        const isPlaying = lob.status === "playing";
        if (!isFull && !isPlaying) {
          const textWidthMeter = G.ctx.measureText(nameText).width;
          const badgeX = 35 + textWidthMeter + 10;
          const badgeY = yCoord - 10;
          const badgeW = 65;
          const badgeH = 16;
          
          const isBadgeHovered = G.mpCursorX >= badgeX && G.mpCursorX <= badgeX + badgeW && G.mpCursorY >= badgeY && G.mpCursorY <= badgeY + badgeH;
          
          G.ctx.fillStyle = (isFocused || isBadgeHovered) ? "#55FF55" : "#00AA00";
          G.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          
          G.ctx.fillStyle = (isFocused || isBadgeHovered) ? "#000000" : "#FFFFFF";
          G.ctx.font = "11px 'VT323',monospace";
          G.ctx.textAlign = "center";
          G.ctx.fillText(G.currentLang === 1 ? "LIITY" : "JOIN", badgeX + badgeW / 2, badgeY + 12);
          
          G.ctx.textAlign = "left"; // reset alignment

          if (G.mouseDown && isBadgeHovered) {
            G.gameState = STATE_USERNAME_INPUT;
            (G as any).mpJoinLobbyId = lob.id;
            G.mpUsername = "Player";
            G.mouseDown = false;
            playSound("click");
          }
        }

        G.ctx.fillStyle = "#88AAFF";
        G.ctx.font = "16px 'VT323',monospace";
        G.ctx.fillText(lob.gameMode || "NORMAL", 230, yCoord + 2);
        
        G.ctx.textAlign = "left";
        if (isPlaying) {
          G.ctx.fillStyle = "#FF5555";
          G.ctx.fillText(G.currentLang === 1 ? "PELAA" : "IN GAME", 360, yCoord + 2);
        } else if (isFull) {
          G.ctx.fillStyle = "#FF7733";
          G.ctx.fillText(G.currentLang === 1 ? "TÄYNNÄ" : "FULL", 360, yCoord + 2);
        } else {
          G.ctx.fillStyle = "#66FF66";
          G.ctx.fillText(G.currentLang === 1 ? "ODOTTAA" : "WAITING", 360, yCoord + 2);
        }

        G.ctx.fillStyle = "#888";
        G.ctx.fillText("35ms", 480, yCoord + 2);

        // Join button bounding box on screen
        const bx = 550, by = yCoord - 10, bw = 70, bh = 18;
        const isHovered = G.mpCursorX >= bx && G.mpCursorX <= bx + bw && G.mpCursorY >= by && G.mpCursorY <= by + bh;
        const rowHovered = G.mpCursorX >= 25 && G.mpCursorX <= CANVAS_W - 25 && G.mpCursorY >= yCoord - 14 && G.mpCursorY <= yCoord + 10;
        
        if (isFull || isPlaying) {
          G.ctx.fillStyle = "#444";
          G.ctx.fillRect(bx, by, bw, bh);
          G.ctx.fillStyle = "#666";
          G.ctx.font = "12px 'VT323',monospace";
          G.ctx.textAlign = "center";
          G.ctx.fillText(G.currentLang === 1 ? "TÄYNNÄ" : "FULL", bx + bw/2, by + 13);
        } else {
          G.ctx.fillStyle = (isFocused || isHovered || rowHovered) ? "#55FF55" : "#00AA00";
          G.ctx.fillRect(bx, by, bw, bh);
          
          G.ctx.fillStyle = (isFocused || isHovered || rowHovered) ? "#000" : "#FFF";
          G.ctx.font = "12px 'VT323',monospace";
          G.ctx.textAlign = "center";
          G.ctx.fillText(G.currentLang === 1 ? "LIITY" : "JOIN", bx + bw/2, by + 13);

          // Handle click trigger for join lobby from mouse or virtual cursor click on row or button
          if (G.mouseDown && (isHovered || rowHovered)) {
            G.gameState = STATE_USERNAME_INPUT;
            (G as any).mpJoinLobbyId = lob.id;
            G.mpUsername = "Player";
            G.mouseDown = false;
            playSound("click");
          }
        }

        // Draw separating lines
        G.ctx.strokeStyle = "rgba(85,51,17,0.3)";
        G.ctx.beginPath();
        G.ctx.moveTo(25, yCoord + 12);
        G.ctx.lineTo(CANVAS_W - 25, yCoord + 12);
        G.ctx.stroke();
      }
    }

    // Bottom Navigation HUD Panel
    const navButtons = [
      { id: 0, text: G.currentLang === 1 ? "[ PÄIVITÄ ]" : "[ REFRESH ]", x: 30, w: 100 },
      { id: 1, text: G.currentLang === 1 ? "[ LUO PELI ]" : "[ CREATE GAME ]", x: 150, w: 140 },
      { id: 2, text: G.currentLang === 1 ? "[ LIITY AULAAN ]" : "[ JOIN LOBBY ]", x: 310, w: 140 },
      { id: 3, text: G.currentLang === 1 ? "[ TAKAISIN ]" : "[ BACK ]", x: 470, w: 100 }
    ];

    navButtons.forEach((btn) => {
      const isFocused = G.mpUIMenuSel === btn.id;
      const isHovered = G.mpCursorX >= btn.x && G.mpCursorX <= btn.x + btn.w && G.mpCursorY >= 295 && G.mpCursorY <= 321;
      
      G.ctx.fillStyle = "rgba(0,0,0,0.6)";
      G.ctx.fillRect(btn.x, 295, btn.w, 26);
      
      G.ctx.strokeStyle = (isFocused || isHovered) ? "#55FF55" : "#553311";
      G.ctx.lineWidth = 1.5;
      G.ctx.strokeRect(btn.x, 295, btn.w, 26);

      G.ctx.fillStyle = (isFocused || isHovered) ? "#55FF55" : "#99BBEF";
      G.ctx.font = "16px 'VT323',monospace";
      G.ctx.textAlign = "center";
      G.ctx.fillText(btn.text, btn.x + btn.w / 2, 313);

      if (G.mouseDown && isHovered) {
        playSound("click");
        if (btn.id === 0) {
          fetchLobbiesList();
        } else if (btn.id === 1) {
          G.gameState = STATE_USERNAME_INPUT;
          (G as any).mpJoinLobbyId = null;
          G.mpUsername = "Player";
        } else if (btn.id === 2) {
          let lobbyToJoin = null;
          const highlightedIndex = G.mpUIMenuSel >= 4 ? G.mpUIMenuSel - 4 : -1;
          if (highlightedIndex >= 0 && highlightedIndex < G.mpLobbies.length) {
            lobbyToJoin = G.mpLobbies[highlightedIndex];
          } else {
            lobbyToJoin = G.mpLobbies.find(lob => !lob.guestId && lob.status !== "playing");
          }
          if (lobbyToJoin) {
            G.gameState = STATE_USERNAME_INPUT;
            (G as any).mpJoinLobbyId = lobbyToJoin.id;
            G.mpUsername = "Player";
          } else {
            G.mpJoinLobbyNotImplementedMsg = true;
            setTimeout(() => { G.mpJoinLobbyNotImplementedMsg = false; }, 2500);
          }
        } else if (btn.id === 3) {
          G.gameState = STATE_MENU;
        }
        G.mouseDown = false;
      }
    });

    if (G.mpJoinLobbyNotImplementedMsg) {
      G.ctx.fillStyle = "rgba(10,5,2,0.95)";
      G.ctx.fillRect(80, 140, 514, 100);
      G.ctx.strokeStyle = "#FF4444";
      G.ctx.lineWidth = 2;
      G.ctx.strokeRect(80, 140, 514, 100);

      G.ctx.fillStyle = "#FF4444";
      G.ctx.font = "28px 'VT323',monospace";
      G.ctx.textAlign = "center";
      G.ctx.fillText(G.currentLang === 1 ? "EI AVOIMIA PELEJÄ LÖYTYNYT!" : "NO ACTIVE LOBBIES FOUND!", CANVAS_W / 2, 182);

      G.ctx.fillStyle = "#888";
      G.ctx.font = "14px 'VT323',monospace";
      G.ctx.fillText(
        G.currentLang === 1 
          ? "Klikkaa 'LUO PELI' aloittaaksesi uuden aulan ja kutsu unelmasi!" 
          : "Start your own online lobby by clicking 'CREATE GAME'!",
        CANVAS_W / 2,
        215,
      );
    }

    if (G.mpAlertMsg) {
      G.ctx.fillStyle = "rgba(10,5,2,0.95)";
      G.ctx.fillRect(100, 130, 474, 120);
      G.ctx.strokeStyle = "#FFAA00";
      G.ctx.lineWidth = 2;
      G.ctx.strokeRect(100, 130, 474, 120);

      G.ctx.fillStyle = "#FFAA00";
      G.ctx.font = "24px 'VT323',monospace";
      G.ctx.textAlign = "center";
      G.ctx.fillText(G.mpAlertMsg, CANVAS_W / 2, 175);

      const isHoverBtn = G.mpCursorX >= 287 && G.mpCursorX <= 387 && G.mpCursorY >= 205 && G.mpCursorY <= 230;
      G.ctx.fillStyle = isHoverBtn ? "#55FF55" : "#444";
      G.ctx.fillRect(287, 205, 100, 25);
      G.ctx.strokeStyle = isHoverBtn ? "#55FF55" : "#999";
      G.ctx.strokeRect(287, 205, 100, 25);
      G.ctx.fillStyle = isHoverBtn ? "#000" : "#FFF";
      G.ctx.font = "16px 'VT323',monospace";
      G.ctx.fillText("OK", 337, 222);

      if (G.mouseDown && isHoverBtn) {
        playSound("click");
        G.mpAlertMsg = null;
        G.mouseDown = false;
      }
    }

    // Render Gamepad / Virtual Mouse Cursor
    drawVirtualCursor();
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_USERNAME_INPUT) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(10, 5, 2, 0.9)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const bx = 187, by = 80, bw = 300, bh = 220;
    G.ctx.fillStyle = "rgba(15,8,3,0.96)";
    G.ctx.fillRect(bx, by, bw, bh);
    G.ctx.strokeStyle = "#FFBF00";
    G.ctx.lineWidth = 2;
    G.ctx.strokeRect(bx, by, bw, bh);

    G.ctx.font = "24px 'VT323',monospace";
    G.ctx.fillStyle = "#FFAA00";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      G.currentLang === 1 ? "KÄYTTÄJÄNIMI" : "ENTER USERNAME",
      bx + bw / 2,
      by + 35,
    );

    // Text box field
    const tbx = bx + 30, tby = by + 65, tbw = bw - 60, tbh = 35;
    const boxHover = G.mpCursorX >= tbx && G.mpCursorX <= tbx + tbw && G.mpCursorY >= tby && G.mpCursorY <= tby + tbh;
    
    G.ctx.fillStyle = "rgba(0,0,0,0.8)";
    G.ctx.fillRect(tbx, tby, tbw, tbh);
    G.ctx.strokeStyle = (G.mpUIMenuSel === 0 || boxHover) ? "#00FF00" : "#553311";
    G.ctx.strokeRect(tbx, tby, tbw, tbh);

    G.ctx.fillStyle = "#00FF00";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.textAlign = "center";
    const cursorStr = Math.floor(Date.now() / 430) % 2 === 0 ? "_" : " ";
    G.ctx.fillText(G.mpUsername + cursorStr, tbx + tbw / 2, tby + 24);

    G.ctx.fillStyle = "#888";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillText(
      G.currentLang === 1 ? "Min 3 - Max 20 merkkiä" : "Min 3 - Max 20 chars",
      bx + bw / 2,
      by + 120,
    );

    // Apply Button
    const applyHover = G.mpCursorX >= tbx && G.mpCursorX <= tbx + tbw && G.mpCursorY >= by + 135 && G.mpCursorY <= by + 165;
    G.ctx.fillStyle = (G.mpUIMenuSel === 1 || applyHover) ? "#00AA00" : "#222";
    G.ctx.fillRect(tbx, by + 135, tbw, 30);
    G.ctx.strokeStyle = (G.mpUIMenuSel === 1 || applyHover) ? "#55FF55" : "#444";
    G.ctx.strokeRect(tbx, by + 135, tbw, 30);
    G.ctx.fillStyle = (G.mpUIMenuSel === 1 || applyHover) ? "#FFF" : "#777";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(G.currentLang === 1 ? "MÄÄRITÄ" : "APPLY", tbx + tbw / 2, by + 155);

    // Cancel Button
    const cancelHover = G.mpCursorX >= tbx && G.mpCursorX <= tbx + tbw && G.mpCursorY >= by + 175 && G.mpCursorY <= by + 205;
    G.ctx.fillStyle = (G.mpUIMenuSel === 2 || cancelHover) ? "#AA0000" : "#222";
    G.ctx.fillRect(tbx, by + 175, tbw, 30);
    G.ctx.strokeStyle = (G.mpUIMenuSel === 2 || cancelHover) ? "#FF5555" : "#444";
    G.ctx.strokeRect(tbx, by + 175, tbw, 30);
    G.ctx.fillStyle = (G.mpUIMenuSel === 2 || cancelHover) ? "#FFF" : "#777";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(G.currentLang === 1 ? "PERUUTA" : "CANCEL", tbx + tbw / 2, by + 195);

    // Handle mouse/cursor click on apply / cancel triggers
    if (G.mouseDown) {
      if (applyHover) {
        playSound("click");
        if (G.mpUsername.trim().length >= 3 && G.mpUsername.trim().length <= 20) {
          const tgtId = (G as any).mpJoinLobbyId;
          if (tgtId) {
            joinOnlineLobby(tgtId, G.mpUsername.trim());
          } else {
            createOnlineLobby(G.mpUsername.trim());
          }
        } else {
          playSound("explosion_puff");
        }
        G.mouseDown = false;
      } else if (cancelHover) {
        playSound("click");
        G.gameState = STATE_MULTIPLAYER;
        G.mouseDown = false;
      }
    }

    drawVirtualCursor();
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_LOBBY) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(10, 5, 2, 0.95)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Header Layout Panel
    G.ctx.fillStyle = "#FFDD55";
    G.ctx.font = "26px 'VT323',monospace";
    G.ctx.textAlign = "left";
    const lobbyNameStr = `${G.mpCurrentLobby?.hostName || "Host"}'s lobby`;
    G.ctx.fillText(`LOBBY: ${lobbyNameStr}`, 20, 42);

    G.ctx.strokeStyle = "rgba(85,51,17,0.5)";
    G.ctx.beginPath();
    G.ctx.moveTo(20, 54);
    G.ctx.lineTo(CANVAS_W - 20, 54);
    G.ctx.stroke();

    // 1st Pane: Configurations (LEFT Side)
    const px = 20, py = 65, pw = 300, ph = 275;
    G.ctx.fillStyle = "rgba(0,0,0,0.5)";
    G.ctx.fillRect(px, py, pw, ph);
    G.ctx.strokeStyle = "#553311";
    G.ctx.strokeRect(px, py, pw, ph);

    G.ctx.fillStyle = "#FFAA00";
    G.ctx.font = "18px 'VT323',monospace";
    G.ctx.fillText(G.currentLang === 1 ? "TILA-ASETUKSET" : "MATCH SETTINGS", px + 15, py + 25);

    // List of settings rows for host
    const rows = [
      { id: 0, label: G.currentLang === 1 ? "Pelikansi:" : "Game Mode:", value: G.gameMode },
      { id: 1, label: G.currentLang === 1 ? "Voittotapa:" : "Win Mode:", value: G.winMode },
      { id: 2, label: G.winMode === "KILLS" ? (G.currentLang === 1 ? "Tapporaja:" : "Kill Limit:") : (G.currentLang === 1 ? "Aikaraja:" : "Time Limit:"), value: G.winMode === "KILLS" ? G.settingKillsToWin : `${G.timeModeMinutes} min` },
      { id: 3, label: G.currentLang === 1 ? "Verisyys:" : "Gore Limit:", value: G.settingGore === 0 ? "OFF" : G.settingGore === 1 ? "NORMAL" : "EXTREME" },
      { id: 4, label: G.currentLang === 1 ? "Arena-palikka:" : "Arena Block:", value: G.isArenaMode ? "ACTIVE" : "INACTIVE" },
      { id: 5, label: G.currentLang === 1 ? "Kartta:" : "Map Selection:", value: G.mpSelectedMapSource === "HILLY_TEMPLATE" ? (G.currentLang === 1 ? "Kukkulat" : "Hilly template") : G.mpSelectedMapSource === "ARENA_TEMPLATE" ? "Arena template" : (G.mpUploadedMapName ? G.mpUploadedMapName : (G.currentLang === 1 ? "Lataa..." : "Load...")) }
    ];

    rows.forEach((row, i) => {
      const isSelected = G.mpLobbySettingsSel === row.id;
      const rowY = py + 40 + i * 22;

      G.ctx.fillStyle = isSelected ? "#00FF00" : "#88AAFF";
      G.ctx.font = "14px 'VT323',monospace";
      G.ctx.fillText(row.label, px + 15, rowY);

      G.ctx.textAlign = "right";
      G.ctx.fillStyle = isSelected ? "#00FF00" : "#FFF";
      
      const valStr = G.mpIsHost && isSelected ? `< ${row.value} >` : `${row.value}`;
      G.ctx.fillText(valStr, px + pw - 15, rowY);
      G.ctx.textAlign = "left";
    });

    // Mouse hover updates selections!
    const isGuestInLobby = !!G.mpCurrentLobby?.guestId;
    const readyHover = G.mpCursorX >= px + 15 && G.mpCursorX <= px + pw - 15 && G.mpCursorY >= py + 185 && G.mpCursorY <= py + 185 + 24;
    const startHover = G.mpIsHost && G.mpCursorX >= px + 15 && G.mpCursorX <= px + pw - 15 && G.mpCursorY >= py + 215 && G.mpCursorY <= py + 215 + 24;
    const leaveHover = G.mpCursorX >= px + 15 && G.mpCursorX <= px + pw - 15 && G.mpCursorY >= py + 245 && G.mpCursorY <= py + 245 + 24;
    const inHover = G.mpCursorX >= 340 + 15 && G.mpCursorX <= CANVAS_W - 20 - 15 && G.mpCursorY >= py + 245 && G.mpCursorY <= py + 245 + 24;

    if (G.mpIsHost) {
      if (readyHover) G.mpLobbySettingsSel = 6;
      else if (startHover) G.mpLobbySettingsSel = 7;
      else if (leaveHover) G.mpLobbySettingsSel = 8;
      else if (inHover) G.mpLobbySettingsSel = 9;
      else {
        rows.forEach((row, i) => {
          const rowY = py + 40 + i * 22;
          if (G.mpCursorX >= px + 15 && G.mpCursorX <= px + pw - 15 && G.mpCursorY >= rowY - 11 && G.mpCursorY <= rowY + 11) {
            G.mpLobbySettingsSel = i;
            if (G.mouseDown) {
              playSound("click");
              const dir = 1;
              if (i === 0) {
                const modes = ["NORMAL", "ARENA", "GUNGAME"];
                let cur = modes.indexOf(G.gameMode);
                cur = (cur + dir + modes.length) % modes.length;
                G.gameMode = modes[cur];
                G.isArenaMode = G.gameMode === "ARENA";
                sendSettingsUpdate();
              } else if (i === 1) {
                G.winMode = G.winMode === "KILLS" ? "TIME" : "KILLS";
                sendSettingsUpdate();
              } else if (i === 2) {
                if (G.winMode === "KILLS") {
                  G.settingKillsToWin = G.settingKillsToWin >= 50 ? 5 : G.settingKillsToWin + 5;
                } else {
                  G.timeModeMinutes = G.timeModeMinutes >= 15 ? 1 : G.timeModeMinutes + 1;
                }
                sendSettingsUpdate();
              } else if (i === 3) {
                G.settingGore = (G.settingGore + 1) % 3;
                sendSettingsUpdate();
              } else if (i === 4) {
                G.isArenaMode = !G.isArenaMode;
                if (G.isArenaMode) G.gameMode = "ARENA";
                sendSettingsUpdate();
              } else if (i === 5) {
                // Map select cycle: "HILLY_TEMPLATE" -> "ARENA_TEMPLATE" -> "LOADED_FILE" -> "HILLY_TEMPLATE"
                const mapSources = ["HILLY_TEMPLATE", "ARENA_TEMPLATE", "LOADED_FILE"];
                let curMapIdx = mapSources.indexOf(G.mpSelectedMapSource);
                curMapIdx = (curMapIdx + 1) % mapSources.length;
                G.mpSelectedMapSource = mapSources[curMapIdx];
                
                if (G.mpSelectedMapSource === "HILLY_TEMPLATE") {
                  G.mpUploadedMapName = "";
                  G.isArenaMode = false;
                  import("./map").then((m) => {
                    m.generateTemplateMap("HILLY_TEMPLATE");
                    G.mpUploadedMapRLE = m.compressMap(G.terrainMap);
                    G.mpUploadedMapSpawns = [];
                    sendSettingsUpdate();
                  });
                } else if (G.mpSelectedMapSource === "ARENA_TEMPLATE") {
                  G.mpUploadedMapName = "";
                  G.isArenaMode = true;
                  import("./map").then((m) => {
                    m.generateTemplateMap("ARENA_TEMPLATE");
                    G.mpUploadedMapRLE = m.compressMap(G.terrainMap);
                    G.mpUploadedMapSpawns = [];
                    sendSettingsUpdate();
                  });
                } else if (G.mpSelectedMapSource === "LOADED_FILE") {
                  G.mpUploadedMapRLE = ""; // Clear until file uploaded
                  G.mpUploadedMapName = "";
                  G.mpUploadedMapSpawns = [];
                  sendSettingsUpdate();
                  
                  // Let host pick JSON
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".json";
                  input.onchange = (ev: any) => {
                    const file = ev.target.files[0];
                    if (!file) return;
                    G.mpUploadedMapName = file.name.substring(0, 18);
                    const reader = new FileReader();
                    reader.onload = (re) => {
                      try {
                        const parsed = JSON.parse(re.target?.result as string);
                        if (parsed && parsed.map) {
                          G.terrainMap = new Uint8Array(parsed.map);
                          G.customSpawns = parsed.spawns || [];
                          import("./map").then((m) => {
                            G.mpUploadedMapRLE = m.compressMap(G.terrainMap);
                            G.mpUploadedMapSpawns = G.customSpawns;
                            m.renderFullTerrainCanvas();
                            sendSettingsUpdate();
                          });
                        }
                      } catch (errX) {
                        console.error(errX);
                      }
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }
              }
              G.mouseDown = false;
            }
          }
        });
      }
    } else {
      if (readyHover) G.mpLobbySettingsSel = 1;
      else if (leaveHover) G.mpLobbySettingsSel = 2;
      else if (inHover) G.mpLobbySettingsSel = 0;
    }

    // --- BUTTON 1: TOGGLE READY ---
    const isReadyFocused = (G.mpIsHost && G.mpLobbySettingsSel === 6) || (!G.mpIsHost && G.mpLobbySettingsSel === 1) || readyHover;
    const selfReadyStatus = G.mpSelfReady;
    
    let readyBtnColor = selfReadyStatus ? "#006400" : "#550000";
    let readyBtnBorder = selfReadyStatus ? "#44EE44" : "#FF4444";
    let readyBtnText = selfReadyStatus ? "#FFF" : "#FFAAAA";
    if (isReadyFocused) {
      readyBtnColor = selfReadyStatus ? "#009900" : "#880000";
      readyBtnBorder = selfReadyStatus ? "#88FF88" : "#FFAAAA";
      readyBtnText = "#FFF";
    }
    
    const readyY = py + 185;
    G.ctx.fillStyle = readyBtnColor;
    G.ctx.fillRect(px + 15, readyY, pw - 30, 24);
    G.ctx.strokeStyle = readyBtnBorder;
    G.ctx.strokeRect(px + 15, readyY, pw - 30, 24);
    G.ctx.fillStyle = readyBtnText;
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.textAlign = "center";
    
    const readyLabel = selfReadyStatus 
      ? (G.currentLang === 1 ? "VALMIS [ READY ]" : "READY [ CLICK TO UNREADY ]") 
      : (G.currentLang === 1 ? "EI VALMIS [ NOT READY ]" : "NOT READY [ CLICK TO READY ]");
    G.ctx.fillText(readyLabel, px + pw / 2, readyY + 16);

    if (G.mouseDown && readyHover) {
      playSound("click");
      import("./multiplayer").then((mp) => {
        mp.toggleLobbyReady();
      });
      G.mouseDown = false;
    }

    // --- BUTTON 2: START GAME (Host only) ---
    if (G.mpIsHost) {
      const isStartFocused = G.mpLobbySettingsSel === 7 || startHover;
      const isGuestJoined = !!G.mpCurrentLobby?.guestId;
      const hostReady = !!G.mpCurrentLobby?.hostReady;
      const guestReady = !!G.mpCurrentLobby?.guestReady;
      
      // Prevent game starting until the map RLE is successfully set (loaded)
      const isMapLoaded = !!G.mpUploadedMapRLE;
      const canStart = isGuestJoined && hostReady && guestReady && isMapLoaded;
      
      let startBtnColor = "#333";
      let startBtnBorders = "#151515";
      let startBtnText = "#555";
      
      if (canStart) {
        if (isStartFocused) {
          startBtnColor = "#00AA00";
          startBtnBorders = "#55FF55";
          startBtnText = "#FFF";
        } else {
          startBtnColor = "#005500";
          startBtnBorders = "#33aa33";
          startBtnText = "#66FF66";
        }
      } else {
        if (isStartFocused) {
          startBtnColor = "#442222";
          startBtnBorders = "#FF4444";
          startBtnText = "#FFaaaa";
        }
      }
      
      G.ctx.fillStyle = startBtnColor;
      G.ctx.fillRect(px + 15, py + 215, pw - 30, 24);
      G.ctx.strokeStyle = startBtnBorders;
      G.ctx.strokeRect(px + 15, py + 215, pw - 30, 24);
      G.ctx.fillStyle = startBtnText;
      G.ctx.font = "14px 'VT323',monospace";
      G.ctx.textAlign = "center";
      
      let actionLabel = G.currentLang === 1 ? "ALOITA PELI" : "START GAME";
      if (!isGuestJoined) {
        actionLabel = G.currentLang === 1 ? "ODOTTAA PELAAJAA..." : "WAITING FOR ENEMY...";
      } else if (!isMapLoaded) {
        actionLabel = G.currentLang === 1 ? "ODOTETAAN KARTTAA..." : "WAITING FOR MAP DATA...";
      } else if (!hostReady) {
        actionLabel = G.currentLang === 1 ? "ASETU VALMIIKSI" : "SET YOURSELF READY";
      } else if (!guestReady) {
        actionLabel = G.currentLang === 1 ? "VASTUSTAJA EI VALMIS" : "WAITING FOR OPPONENT READY";
      }
      G.ctx.fillText(actionLabel, px + pw / 2, py + 231);
      
      if (G.mouseDown && startHover) {
        playSound("click");
        if (canStart) {
          import("./multiplayer").then((mp) => {
            mp.triggerMultiplayerPlay();
          });
        } else {
          playSound("explosion_puff"); // negative feedback
        }
        G.mouseDown = false;
      }
    }

    // --- BUTTON 3: LEAVE LOBBY ---
    const isLeaveFocused = (G.mpIsHost && G.mpLobbySettingsSel === 8) || (!G.mpIsHost && G.mpLobbySettingsSel === 2) || leaveHover;
    
    G.ctx.fillStyle = isLeaveFocused ? "#AA0000" : "#300";
    G.ctx.fillRect(px + 15, py + 245, pw - 30, 24);
    G.ctx.strokeStyle = isLeaveFocused ? "#FF5555" : "#611";
    G.ctx.strokeRect(px + 15, py + 245, pw - 30, 24);
    G.ctx.fillStyle = isLeaveFocused ? "#FFF" : "#F44";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(G.currentLang === 1 ? "POISTU AULASTA" : "LEAVE LOBBY", px + pw / 2, py + 261);
    
    if (G.mouseDown && leaveHover) {
      playSound("click");
      G.mpConfirmLeaveModal = true;
      G.mpUIMenuSel = 1;
      G.mouseDown = false;
    }

    // 2nd Pane: Connected Users & Live Chat (RIGHT Side)
    const rx = 340, ry = py, rw = CANVAS_W - px - rx, rh = ph;
    G.ctx.textAlign = "left";
    G.ctx.fillStyle = "rgba(0,0,0,0.5)";
    G.ctx.fillRect(rx, ry, rw, rh);
    G.ctx.strokeStyle = "#553311";
    G.ctx.strokeRect(rx, ry, rw, rh);

    // Visual Participants list
    G.ctx.fillStyle = "#FFAA00";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(G.currentLang === 1 ? "PELAAJAT (2)" : "PLAYERS (2)", rx + 15, ry + 25);

    const hReady = !!G.mpCurrentLobby?.hostReady;
    const gReady = !!G.mpCurrentLobby?.guestReady;

    G.ctx.fillStyle = "#FFEE22";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillText(`Player 1: ${G.mpCurrentLobby?.hostName || "Waiting..."} (host)`, rx + 20, ry + 40);
    G.ctx.fillStyle = hReady ? "#44EE44" : "#FF5555";
    G.ctx.fillText(hReady ? " [VALMIS / READY]" : " [EI VALMIS / NOT READY]", rx + 195, ry + 40);

    if (isGuestInLobby) {
      G.ctx.fillStyle = "#44EE44";
      G.ctx.fillText(`Player 2: ${G.mpCurrentLobby.guestName || "Guest"}`, rx + 20, ry + 54);
      G.ctx.fillStyle = gReady ? "#44EE44" : "#FF5555";
      G.ctx.fillText(gReady ? " [VALMIS / READY]" : " [EI VALMIS / NOT READY]", rx + 195, ry + 54);
    } else {
      G.ctx.fillStyle = Math.floor(Date.now() / 400) % 2 === 0 ? "#777" : "#F80";
      G.ctx.fillText(G.currentLang === 1 ? "Ladataan toista pelaajaa..." : "Waiting for player 2/2...", rx + 20, ry + 54);
    }

    // MAP LOADING DESCRIPTIVE NOTIFICATION / TEXT
    const isMapLoadedOnFirebase = !!G.mpUploadedMapRLE;
    G.ctx.font = "12px 'VT323',monospace";
    if (!isMapLoadedOnFirebase) {
      if (!G.mpIsHost) {
        // Enforce guest unready status if map is not loaded
        if (G.mpSelfReady) {
          G.mpSelfReady = false;
          import("./multiplayer").then((mp) => { mp.toggleLobbyReady(); });
        }
        G.ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? "#FF3333" : "#FFAAAA";
        G.ctx.fillText(
          G.currentLang === 1 
            ? "Odotetaan hostia kunnes hän on ladannut levelin" 
            : "Waiting for host until he has loaded the level", 
          rx + 20, 
          ry + 74
        );
      } else {
        G.ctx.fillStyle = "#FF5555";
        G.ctx.fillText(
          G.currentLang === 1 
            ? "Lataa tai valitse kartta päästäksesi aloittamaan!" 
            : "Load or select a map template to start!", 
          rx + 20, 
          ry + 74
        );
      }
    } else {
      G.ctx.fillStyle = "#44EE44";
      const mapTypeStr = G.mpSelectedMapSource === "LOADED_FILE" 
        ? (G.mpUploadedMapName || "File loaded") 
        : (G.mpSelectedMapSource === "ARENA_TEMPLATE" ? "Arena Arena" : "Hilly Terrain");
      G.ctx.fillText(
        G.currentLang === 1 
          ? `KARTTA LADATTU: ${mapTypeStr}` 
          : `MAP ACTIVE: ${mapTypeStr}`, 
        rx + 20, 
        ry + 74
      );
    }

    // Live chat boxes feed
    G.ctx.fillStyle = "#FFAA00";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(G.currentLang === 1 ? "CHAT-KESKUSTELU" : "CHAT LOG", rx + 15, ry + 95);

    // Chat scroll panel
    G.ctx.fillStyle = "rgba(0,0,0,0.6)";
    G.ctx.fillRect(rx + 15, ry + 105, rw - 30, 115);
    G.ctx.strokeStyle = "#331805";
    G.ctx.strokeRect(rx + 15, ry + 105, rw - 30, 115);

    // Render up to 5 chat messages
    const msgs = G.mpMessages.slice(-5);
    msgs.forEach((msg, i) => {
      G.ctx.font = "12px 'VT323',monospace";
      const userColor = msg.senderName === "System" ? "#999" : msg.senderName === G.mpUsername ? "#55FF55" : "#FFD700";
      G.ctx.fillStyle = userColor;
      
      const displayTxt = msg.senderName === "System" ? msg.text : `[${msg.senderName}]: ${msg.text}`;
      G.ctx.fillText(displayTxt.substring(0, 42), rx + 25, ry + 124 + i * 20);
    });

    // Chat entry key row
    const isChatFocused = (G.mpIsHost && G.mpLobbySettingsSel === 5) || (!G.mpIsHost && G.mpLobbySettingsSel === 0);
    const inB = rx + 15, inY = ry + 233, inW = rw - 30, inH = 30;
    const inHoverChat = G.mpCursorX >= inB && G.mpCursorX <= inB + inW && G.mpCursorY >= inY && G.mpCursorY <= inY + inH;

    G.ctx.fillStyle = "rgba(0,0,0,0.8)";
    G.ctx.fillRect(inB, inY, inW, inH);
    G.ctx.strokeStyle = (isChatFocused || inHoverChat) ? "#00FF00" : "#311";
    G.ctx.strokeRect(inB, inY, inW, inH);

    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillStyle = isChatFocused ? "#00FF00" : "#777";
    const caret = isChatFocused && (Math.floor(Date.now() / 450) % 2 === 0) ? "_" : "";
    const labelInputStr = G.mpChatInput ? G.mpChatInput : (G.currentLang === 1 ? "Paina kirjaimia kirjoittaaksesi" : "[Type/Press Enter is active]");
    G.ctx.fillText(labelInputStr + caret, inB + 10, inY + 20);

    // If modal confirm leave is open
    if (G.mpConfirmLeaveModal) {
      G.ctx.fillStyle = "rgba(10,5,2,0.96)";
      G.ctx.fillRect(140, 110, 394, 150);
      G.ctx.strokeStyle = "#FF4444";
      G.ctx.lineWidth = 2.5;
      G.ctx.strokeRect(140, 110, 394, 150);

      G.ctx.fillStyle = "#FF4444";
      G.ctx.font = "24px 'VT323',monospace";
      G.ctx.textAlign = "center";
      G.ctx.fillText(
        G.currentLang === 1 ? "POISTUTAANKO AULASTA?" : "LEAVE LOBBY?",
        CANVAS_W / 2,
        148,
      );

      G.ctx.fillStyle = "#888";
      G.ctx.font = "15px 'VT323',monospace";
      G.ctx.fillText(
        G.currentLang === 1 
          ? "Haluatko varmasti poistua aulan ryhmästä?" 
          : "Are you sure you want to leave?",
        CANVAS_W / 2,
        175,
      );

      // NO / YES buttons
      const yesHover = G.mpCursorX >= 220 && G.mpCursorX <= 310 && G.mpCursorY >= 200 && G.mpCursorY <= 230;
      const noHover = G.mpCursorX >= 360 && G.mpCursorX <= 450 && G.mpCursorY >= 200 && G.mpCursorY <= 230;

      G.ctx.fillStyle = (G.mpUIMenuSel === 0 || yesHover) ? "#AA0000" : "#333";
      G.ctx.fillRect(220, 200, 90, 30);
      G.ctx.strokeStyle = (G.mpUIMenuSel === 0 || yesHover) ? "#FF5555" : "#555";
      G.ctx.strokeRect(220, 200, 90, 30);
      G.ctx.fillStyle = "#FFF";
      G.ctx.font = "16px 'VT323',monospace";
      G.ctx.fillText(G.currentLang === 1 ? "KYLLÄ" : "YES", 265, 220);

      G.ctx.fillStyle = (G.mpUIMenuSel === 1 || noHover) ? "#444" : "#1A1A1A";
      G.ctx.fillRect(360, 200, 90, 30);
      G.ctx.strokeStyle = (G.mpUIMenuSel === 1 || noHover) ? "#AAA" : "#555";
      G.ctx.strokeRect(360, 200, 90, 30);
      G.ctx.fillStyle = "#FFF";
      G.ctx.fillText(G.currentLang === 1 ? "EI" : "NO", 405, 220);

      if (G.mouseDown) {
        if (yesHover) {
          playSound("click");
          leaveCurrentLobby(true);
        } else if (noHover) {
          playSound("click");
          G.mpConfirmLeaveModal = false;
        }
        G.mouseDown = false;
      }
    }

    drawVirtualCursor();
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_HOW_TO_PLAY) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(0,0,0,0.85)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#0F0";
    G.ctx.font = "30px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("HOW_TO_PLAY"), CANVAS_W / 2, 40);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.textAlign = "left";
    const lines =
      G.currentLang === 1
        ? [
            "NÄPPÄIMISTÖ 1 (VASEN): WASD = Liiku/Tähtää, SPACE = Ampuu, SHIFT = Vaihda Ase, Q = Köysi",
            "NÄPPÄIMISTÖ 2 (OIKEA): NUOLET = Liiku/Tähtää, ENTER = Ampuu, / = Vaihda Ase, . = Köysi",
            "OHJAIN: D-PAD/L-TATTI = Liiku/Tähtää, X(A) = Ampuu, YMPYRÄ(B) = Köysi, L1/R1 = Vaihda Ase",
            "",
            "Köydellä voi tarttua useimpiin pintoihin. Lapiolla voi kaivaa.",
            "Aseet latautuvat automaattisesti kun ne tyhjenevät tai passiivisesti.",
            "",
            "Paina X tai AMPUMIS-nappia palataksesi.",
          ]
        : [
            "KEYBOARD 1 (LEFT): WASD = Move/Aim, SPACE = Fire, SHIFT = Change Weapon, Q = Rope",
            "KEYBOARD 2 (RIGHT): ARROWS = Move/Aim, ENTER = Fire, / = Change Weapon, . = Rope",
            "GAMEPAD: D-PAD/L-STICK = Move/Aim, X = Fire, CIRCLE = Rope, L1/R1 = Change Weapon",
            "",
            "Rope can attach to most terrain. Shovel digs.",
            "Weapons reload automatically when empty or passively.",
            "",
            "Press X or FIRE to return.",
          ];
    for (let i = 0; i < lines.length; i++)
      G.ctx.fillText(lines[i], 15, 80 + i * 20);
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_CREDITS) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(0,0,0,0.85)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#0EE";
    G.ctx.font = "30px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("CREDITS"), CANVAS_W / 2, 40);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "20px 'VT323',monospace";

    const titleText =
      G.currentLang === 1 ? "PunkkiPELI 2026" : "PunkkiGAME 2026";
    const devText =
      G.currentLang === 1
        ? "Kehittäjä: Eeli Noronen"
        : "Developer: Eeli Noronen";
    const baseText =
      G.currentLang === 1
        ? "Perustuu Lieroon (1998, Joosa Riekkinen)"
        : "Based on Liero (1998, Joosa Riekkinen)";
    const aiText =
      G.currentLang === 1
        ? "Koodausapuna: Google AI Studio"
        : "AI Coding Assistant: Google AI Studio";
    const pressBackText =
      G.currentLang === 1
        ? "Paina X tai AMPUMIS-nappia palataksesi."
        : "Press X or FIRE to return.";

    G.ctx.fillText(titleText, CANVAS_W / 2, 90);
    G.ctx.fillStyle = "#FF0";
    G.ctx.fillText(devText, CANVAS_W / 2, 120);
    G.ctx.fillStyle = "#AAA";
    G.ctx.fillText(baseText, CANVAS_W / 2, 150);
    G.ctx.fillStyle = "#AFA";
    G.ctx.fillText(aiText, CANVAS_W / 2, 180);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillText(pressBackText, CANVAS_W / 2, 230);

    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_JOINING) {
    drawBgNoise();
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "22px 'VT323',monospace";
    G.ctx.textAlign = "center";
    const need = G.is4PlayerMode ? 4 : 2;
    G.ctx.fillText(
      `LIITTYMINEN: ${G.joinedPlayers.size} / ${need}`,
      CANVAS_W / 2,
      CANVAS_H / 2 - 20,
    );
    G.ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? "#0F0" : "#5F5";
    G.ctx.fillText(t("PRESS_JOIN"), CANVAS_W / 2, CANVAS_H / 2 + 10);
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_MODE_SELECT) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(0,0,0,0.75)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "22px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText("VALITSE ASEMOODI", CANVAS_W / 2, 50);
    G.ctx.font = "18px 'VT323',monospace";
    const opts = ["NORMAL", "GUN GAME"];
    for (let i = 0; i < 2; i++) {
      const sel = i === modeSel;
      G.ctx.fillStyle = sel ? "#0F0" : "#6688FF";
      G.ctx.fillText(
        (sel ? "> " : "") + opts[i] + (sel ? " <" : ""),
        CANVAS_W / 2,
        110 + i * 35,
      );
    }
    G.ctx.fillStyle = "#888";
    G.ctx.font = "13px 'VT323',monospace";
    G.ctx.fillText("◄ ► vaihda | X/Enter valitse", CANVAS_W / 2, CANVAS_H - 30);
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_WEAPON_SELECT) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(0,0,0,0.7)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText("WEAPON SELECT", CANVAS_W / 2, 22);
    if (G.gameMode === "GUNGAME") {
      G.ctx.fillStyle = "#FFD700";
      G.ctx.font = "16px 'VT323',monospace";
      G.ctx.fillText(
        "GUN GAME MODE - Weapons are automatic!",
        CANVAS_W / 2,
        45,
      );
      G.ctx.fillStyle = "#0F0";
      G.ctx.fillText("Press X/Enter to continue →", CANVAS_W / 2, 80);
      G.ctx.textAlign = "left";
      return;
    }

    const numPlayers = G.is4PlayerMode ? 4 : 2;
    const w = CANVAS_W / numPlayers;
    G.ctx.font = G.is4PlayerMode
      ? "12px 'VT323',monospace"
      : "18px 'VT323',monospace";

    for (let i = 0; i < numPlayers; i++) {
      let px = i * w + w / 2;
      G.ctx.fillStyle = PLAYER_COLORS[i];
      G.ctx.fillText(PLAYER_NAMES[i], px, 55, w - 8);
      for (let s = 0; s < 5; s++) {
        let wepId = G.wsLoadouts[i][s];
        let wepName = WEAPON_NAMES[wepId][G.currentLang];
        if (wsCursors[i] === s && !wsReady[i]) {
          G.ctx.fillStyle = "#0F0";
          G.ctx.fillText("> " + wepName + " <", px, 82 + s * 22, w - 8);
        } else {
          G.ctx.fillStyle = wsReady[i] ? "#888" : "#FFF";
          G.ctx.fillText(wepName, px, 82 + s * 22, w - 8);
        }
      }
      if (wsReady[i]) {
        G.ctx.fillStyle = "#0F0";
        G.ctx.fillText("READY ✓", px, 230);
      }
    }

    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_WIN_CONFIG) {
    drawBgNoise();
    G.ctx.fillStyle = "rgba(0,0,0,0.75)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText("VALITSE PELIMUOTO", CANVAS_W / 2, 35);

    G.ctx.font = "16px 'VT323',monospace";

    let opts: string[] = [];
    if (G.gameMode === "GUNGAME") {
      opts = [
        `${t("MODE_KILLS")}: ${G.settingKillsToWin}  (◄ ►)`,
        `${t("MODE_TIME")}: ${G.timeModeMinutes} min  (◄ ►)`,
        "[ TAKAISIN ]",
      ];
    } else {
      opts = G.is4PlayerMode
        ? [
            `${t("MODE_KILLS")}: ${G.settingKillsToWin}  (◄ ►)`,
            `${t("MODE_LIVES")}: ${G.settingLives}  (◄ ►)`,
            `${t("MODE_TIME")}: ${G.timeModeMinutes} min  (◄ ►)`,
            "[ TAKAISIN ]",
          ]
        : [
            `${t("MODE_LIVES")}: ${G.settingLives}  (◄ ►)`,
            `${t("MODE_TIME")}: ${G.timeModeMinutes} min  (◄ ►)`,
            "[ TAKAISIN ]",
          ];
    }

    for (let i = 0; i < opts.length; i++) {
      const sel = i === winConfigSel;
      G.ctx.fillStyle = sel ? "#0F0" : "#88AAFF";
      G.ctx.fillText(
        (sel ? "> " : "") + opts[i] + (sel ? " <" : ""),
        CANVAS_W / 2,
        80 + i * 30,
      );
    }
    G.ctx.fillStyle = "#AAA";
    G.ctx.font = "13px 'VT323',monospace";
    G.ctx.fillText(
      "Paina X/Enter valitaksesi pelimuodon",
      CANVAS_W / 2,
      CANVAS_H - 20,
    );
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_LEVEL_PROMPT) {
    G.ctx.fillStyle = "rgba(0,0,0,0.88)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "26px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("LEVEL_PROMPT_TITLE"), CANVAS_W / 2, 80);

    let txtGen = t("LEVEL_PROMPT_GEN");
    let txtFile = "LUE TIEDOSTO (Load file)";
    if (levelPromptSel === 0) {
      G.ctx.fillStyle = "#0F0";
      txtGen = "> " + txtGen;
    } else G.ctx.fillStyle = "#55F";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.fillText(txtGen, CANVAS_W / 2, 140);

    if (levelPromptSel === 1) {
      G.ctx.fillStyle = "#0F0";
      txtFile = "> " + txtFile;
    } else G.ctx.fillStyle = "#55F";
    G.ctx.fillText(txtFile, CANVAS_W / 2, 170);

    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.fillText(t("PRESS_BACK"), CANVAS_W / 2, 260);
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_PAUSED) {
    G.ctx.fillStyle = "rgba(10, 15, 20, 0.85)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Sidebar for match info
    G.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    G.ctx.fillRect(CANVAS_W - 200, 0, 200, CANVAS_H);
    G.ctx.strokeStyle = "#334455";
    G.ctx.lineWidth = 2;
    G.ctx.beginPath();
    G.ctx.moveTo(CANVAS_W - 200, 0);
    G.ctx.lineTo(CANVAS_W - 200, CANVAS_H);
    G.ctx.stroke();

    G.ctx.font = "bold 30px 'VT323',monospace";
    G.ctx.fillStyle = "#FFF";
    const title = t("GAME_PAUSED");
    G.ctx.fillText(title, 50, 70);

    G.ctx.font = "24px 'VT323',monospace";
    const opts = getPauseOptions();
    const sel = pauseMenuSel;
    for (let i = 0; i < opts.length; i++) {
      let txt = t(opts[i]);
      let ox = 0;
      if (i === sel) {
        G.ctx.fillStyle = "#0F0";
        txt = "> " + txt;
        ox = Math.sin(G.menuAnimTime * 0.1) * 5 || 0;
      } else G.ctx.fillStyle = "#7788AA";
      G.ctx.fillText(txt, 50 + ox, 130 + i * 35);
    }

    // Side panel texts
    G.ctx.textAlign = "left";
    G.ctx.fillStyle = "#0AA";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.fillText("OTTELUN TIEDOT", CANVAS_W - 180, 50);

    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.fillText(
      `Pelitila: ${G.gameMode === "GUNGAME" ? "Gun Game" : "Normaali"}`,
      CANVAS_W - 180,
      90,
    );

    const tavoiteText =
      G.winMode === "KILLS"
        ? `${G.settingKillsToWin} Tappoa`
        : `${G.settingLives} Elämää`;
    G.ctx.fillText(`Tavoite: ${tavoiteText}`, CANVAS_W - 180, 115);

    G.ctx.fillStyle = "#8899AA";
    G.ctx.fillText(
      `Pimeys: ${G.settingDarkness ? "Päällä" : "Pois"}`,
      CANVAS_W - 180,
      150,
    );
    G.ctx.fillText(
      `Varjot: ${G.settingShadows ? "Päällä" : "Pois"}`,
      CANVAS_W - 180,
      170,
    );

    let gfxGore = "Normaali";
    if (G.settingGore === 0) gfxGore = "Pois";
    if (G.settingGore === 2) gfxGore = "EXTREME";
    G.ctx.fillText(`Verisyys: ${gfxGore}`, CANVAS_W - 180, 190);
    G.ctx.fillText(
      `Luut: ${G.settingBones ? "Päällä" : "Pois"}`,
      CANVAS_W - 180,
      210,
    );

    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_PAUSE_GFX) {
    G.ctx.fillStyle = "rgba(30,15,5,0.9)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.font = "22px 'VT323',monospace";
    G.ctx.fillStyle = "#FFF";
    const title = t("PAUSE_GFX") || "GFX OPTIONS";
    G.ctx.fillText(title, 80, 40);
    for (let i = 0; i < gfxMenuOptions.length; i++) {
      let txt = t(gfxMenuOptions[i]);
      if (gfxMenuOptions[i] === "GORE") {
        const levels = ["OFF", "NORMAL", "EXTREME"];
        txt += " " + levels[G.settingGore];
      }
      if (gfxMenuOptions[i] === "BONES") txt += G.settingBones ? " ON" : " OFF";
      if (gfxMenuOptions[i] === "SHADOWS")
        txt += G.settingShadows ? " ON" : " OFF";
      if (gfxMenuOptions[i] === "DARKNESS")
        txt += G.settingDarkness ? " ON" : " OFF";

      let ox = 0;
      if (i === gfxMenuSel) {
        G.ctx.fillStyle = "#0F0";
        txt = "> " + txt;
        ox = Math.sin(G.menuAnimTime * 0.1) * 3 || 0;
      } else G.ctx.fillStyle = "#55F";
      G.ctx.fillText(txt, 80 + ox, 70 + i * 24);
    }
    return;
  }

  if (G.gameState === STATE_CUSTOMIZE) {
    G.ctx.fillStyle = "rgba(0,0,0,0.85)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("CUSTOMIZE"), CANVAS_W / 2, 30);

    const count = G.is4PlayerMode ? 4 : 2;
    const skinNames = ["WORMY", "OIKOTIEMIES"];
    const listX = 30,
      listW = 200;
    for (let i = 0; i < count; i++) {
      const y = 70 + i * 40;
      const selected = customizeSel === i;
      G.ctx.fillStyle = selected ? "#FFD700" : PLAYER_COLORS[i];
      G.ctx.font = "16px 'VT323',monospace";
      G.ctx.textAlign = "left";
      G.ctx.fillText(
        `P${i + 1}: ${selected ? "< " : " "}${skinNames[G.customizeSkins[i] || 0]}${selected ? " >" : ""}`,
        listX,
        y,
      );
      if (selected) {
        G.ctx.strokeStyle = "#FFD700";
        G.ctx.strokeRect(listX - 2, y - 14, listW, 20);
      }
    }

    const previewSkin = G.customizeSkins[customizeSel] || 0;
    const previewColor = PLAYER_COLORS[customizeSel];
    G.ctx.fillStyle = "#222";
    G.ctx.fillRect(270, 50, 160, 120);
    G.ctx.strokeStyle = PLAYER_COLORS[customizeSel];
    G.ctx.strokeRect(270, 50, 160, 120);
    drawSpritePreview(G.ctx, previewSkin, previewColor, 310, 65, 8);

    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "13px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText("↑↓: Valitse pelaaja  ◄►: Vaihda skin", CANVAS_W / 2, 220);
    G.ctx.fillText(t("PRESS_BACK"), CANVAS_W / 2, 240);
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_OPTIONS) {
    G.ctx.fillStyle = "rgba(30,15,5,0.9)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.font = "22px 'VT323',monospace";
    G.ctx.fillStyle = "#FFF";
    const title = t("OPTIONS");
    G.ctx.fillText(title, 80, 40);
    const opts = [
      "LANGUAGE",
      "GORE",
      "BONES",
      "SHADOWS",
      "DARKNESS",
      "SFX_VOL",
      "MUSIC_VOL",
      "VICTORY_VOL",
      "VIBRATION",
      "BACK",
    ];
    for (let i = 0; i < opts.length; i++) {
      let txt = t(opts[i]) || opts[i];
      if (opts[i] === "GORE") {
        const levels = ["OFF", "NORMAL", "EXTREME"];
        txt += levels[G.settingGore];
      }
      if (opts[i] === "BONES") txt += G.settingBones ? "ON" : "OFF";
      if (opts[i] === "SHADOWS") txt += G.settingShadows ? "ON" : "OFF";
      if (opts[i] === "DARKNESS") txt += G.settingDarkness ? "ON" : "OFF";
      if (opts[i] === "SFX_VOL") txt += `${G.settingSfxVol * 10}%  (◄ ►)`;
      if (opts[i] === "MUSIC_VOL") txt += `${G.settingMusicVol * 10}%  (◄ ►)`;
      if (opts[i] === "VICTORY_VOL")
        txt += `${G.settingVictoryVol * 10}%  (◄ ►)`;
      if (opts[i] === "VIBRATION") {
        const levels = ["OFF", "NORMAL", "HIGH"];
        txt += levels[G.settingVibration];
      }

      let ox = 0;
      if (i === optionsMenuSel) {
        G.ctx.fillStyle = "#0F0";
        txt = "> " + txt;
        ox = Math.sin(G.menuAnimTime * 0.1) * 3 || 0;
      } else G.ctx.fillStyle = "#55F";
      G.ctx.fillText(txt, 80 + ox, 70 + i * 24);
    }
    return;
  }

  if (G.gameState === STATE_ROUND_OVER) {
    return;
  }

  if (G.gameState === STATE_GAMEOVER) {
    G.ctx.fillStyle = "rgba(0,0,0,0.7)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFD700";
    G.ctx.font = "32px 'VT323',monospace";
    G.ctx.textAlign = "center";
    if (G.matchWinnerId > 0) {
      G.ctx.fillText(
        PLAYER_NAMES[G.matchWinnerId - 1] + t("WINS_MATCH"),
        CANVAS_W / 2,
        CANVAS_H / 2 - 40,
      );
    } else {
      G.ctx.fillText("TASAPELI", CANVAS_W / 2, CANVAS_H / 2 - 40);
    }
    for (let i = 0; i < gameOverOptions.length; i++) {
      let txt = t(gameOverOptions[i]);
      if (i === gameOverSel) {
        G.ctx.fillStyle = "#0F0";
        txt = "> " + txt;
      } else G.ctx.fillStyle = "#88AAFF";
      G.ctx.font = "22px 'VT323',monospace";
      G.ctx.fillText(txt, CANVAS_W / 2, CANVAS_H / 2 + i * 30);
    }
    G.ctx.textAlign = "left";
    return;
  }

  if (G.gameState === STATE_WEAPON_LIST) {
    G.ctx.fillStyle = "rgba(0,0,0,0.88)";
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    G.ctx.fillStyle = "#FFF";
    G.ctx.font = "22px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("WEAPON_LIST"), CANVAS_W / 2, 30);
    G.ctx.font = "12px 'VT323',monospace";
    G.ctx.textAlign = "left";

    const start = weaponListScroll;
    const end = Math.min(TOTAL_WEAPONS, start + 14); // 7 rows * 2 cols = 14

    for (let i = 0; i < end - start; i++) {
      const itemIndex = start + i;
      const col = i < 7 ? 0 : 1;
      const row = i % 7;
      G.ctx.fillStyle = "#0F0";
      G.ctx.fillText(
        WEAPON_NAMES[itemIndex][G.currentLang],
        20 + col * 330,
        60 + row * 30,
      );
      G.ctx.fillStyle = "#AAA";
      G.ctx.fillText(
        WEAPON_DESC[itemIndex][G.currentLang],
        20 + col * 330,
        75 + row * 30,
      );
    }
    G.ctx.fillStyle = "#FFF";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      t("PRESS_BACK") + " | UP/DOWN = Scroll",
      CANVAS_W / 2,
      CANVAS_H - 15,
    );
    G.ctx.textAlign = "left";
    return;
  }

  // Default placeholder for other states like WEAPON_LIST etc
  G.ctx.fillStyle = "rgba(0,0,0,0.85)";
  G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}
export function drawBgNoise() {
  if (!G.ctx || !G.bgNoiseCanvas) return;
  G.ctx.save();
  G.ctx.globalAlpha = 0.4;
  const pat = G.ctx.createPattern(G.bgNoiseCanvas, "repeat");
  if (pat) {
    G.ctx.fillStyle = pat;
    G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  G.ctx.globalAlpha = 1;
  G.ctx.restore();
  G.ctx.fillStyle = "rgba(20,10,4,0.6)";
  G.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

export function drawHUD() {
  if (!G.ctx || !G.mapCanvas || !G.bloodCanvas) return;
  G.ctx.fillStyle = "#0A0602";
  G.ctx.fillRect(0, CANVAS_H - HUD_H, CANVAS_W, HUD_H);
  G.ctx.strokeStyle = "#442200";
  G.ctx.lineWidth = 1;
  G.ctx.strokeRect(0, CANVAS_H - HUD_H, CANVAS_W, HUD_H);

  if (G.winMode === "TIME" && G.gameTimerActive) {
    const sec = Math.ceil(G.gameTimer / 60);
    const mm = Math.floor(sec / 60),
      ss = sec % 60;
    G.ctx.fillStyle = "#FFD700";
    G.ctx.font = "16px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(
      `${t("TIME_LEFT")}${mm}:${ss < 10 ? "0" : ""}${ss}`,
      CANVAS_W / 2,
      CANVAS_H - HUD_H - 4,
    );
    G.ctx.textAlign = "left";
  }

  G.ctx.fillStyle = "rgba(255,255,255,0.4)";
  G.ctx.font = "12px 'VT323',monospace";
  G.ctx.textAlign = "left";
  G.ctx.fillText("[F9] Tallenna Uusinta", 4, CANVAS_H - HUD_H - 12);

  const mmW = 110,
    mmH = 44;
  const mmX = CANVAS_W / 2 - mmW / 2,
    mmY = CANVAS_H - HUD_H + 10;
  G.ctx.strokeStyle = "#664";
  G.ctx.lineWidth = 1;
  G.ctx.strokeRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);
  G.ctx.drawImage(G.mapCanvas, 0, 0, MAP_W, MAP_H, mmX, mmY, mmW, mmH);
  G.ctx.globalAlpha = 0.5;
  G.ctx.drawImage(G.bloodCanvas, 0, 0, MAP_W, MAP_H, mmX, mmY, mmW, mmH);
  G.ctx.globalAlpha = 1;

  if (G.settingDarkness) {
    G.ctx.fillStyle = "rgba(0,0,10,0.6)";
    G.ctx.fillRect(mmX, mmY, mmW, mmH);
  }

  G.players.forEach((p) => {
    if (
      p.deathPhase === "alive" ||
      p.deathPhase === "cinematic" ||
      p.deathPhase === "waiting"
    ) {
      G.ctx!.fillStyle = p.color;
      const mx = p.deathPhase === "alive" ? p.x : p.pendingSpawnX,
        my = p.deathPhase === "alive" ? p.y : p.pendingSpawnY;
      G.ctx!.fillRect(
        mmX + (mx / MAP_W) * mmW - 1,
        mmY + (my / MAP_H) * mmH - 1,
        3,
        3,
      );
    }
  });

  const p1 = G.players[0],
    p2 = G.players[1];
  if (p1) drawPlayerHUD(p1, 8, CANVAS_H - HUD_H + 6);
  if (p2 && !G.is4PlayerMode)
    drawPlayerHUD(p2, mmX + mmW + 12, CANVAS_H - HUD_H + 6);
  else if (G.is4PlayerMode) {
    for (let i = 0; i < 4; i++) {
      const p = G.players[i];
      if (!p) continue;
      const lx = i % 2 === 0 ? 8 : mmX + mmW + 12;
      const ly = i < 2 ? CANVAS_H - HUD_H + 6 : CANVAS_H - HUD_H + 36;
      G.ctx.fillStyle = p.hp > 60 ? "#0DD" : p.hp > 30 ? "#FC0" : "#F22";
      G.ctx.fillRect(lx, ly, p.hp, 5);
      if (
        p.activeWeapon !== 3 &&
        p.activeWeapon !== 11 &&
        p.activeWeapon !== 15
      ) {
        G.ctx.fillStyle = "#24C";
        G.ctx.fillRect(
          lx,
          ly + 6,
          Math.floor((p.ammo[p.activeWeapon] / MAX_AMMO[p.activeWeapon]) * 100),
          3,
        );
      }
      G.ctx.fillStyle = p.color;
      G.ctx.font = "11px 'VT323',monospace";
      const sc = G.winMode === "LIVES" ? `L:${p.lives}` : p.score;
      if (p.deathPhase === "spectator") {
        const specTarget = G.players[p.spectateTarget];
        G.ctx.fillText(
          `${p.name} ${sc} | SPECTATING: ${specTarget ? specTarget.name : ""}`,
          lx,
          ly + 20,
        );
      } else {
        G.ctx.fillText(
          `${p.name} ${sc} | ${WEAPON_NAMES[p.activeWeapon][G.currentLang]}`,
          lx,
          ly + 20,
        );
      }
    }
  }

  // Draw Kill Feed (Top Right)
  if (G.killFeed.length > 0) {
    G.ctx.font = "14px 'VT323',monospace";
    G.ctx.textAlign = "right";
    for (let i = 0; i < G.killFeed.length; i++) {
      const kf = G.killFeed[i];
      const a = Math.min(1, kf.life / 30);
      G.ctx.fillStyle = `rgba(0,0,0,${a * 0.6})`;
      const tw = G.ctx.measureText(kf.text).width;
      G.ctx.fillRect(CANVAS_W - tw - 12, 6 + i * 18, tw + 8, 16);
      G.ctx.fillStyle = `rgba(255,255,255,${a})`;
      G.ctx.fillText(kf.text, CANVAS_W - 8, 18 + i * 18);
      kf.life--;
    }
    // Remove dead
    while (G.killFeed.length > 0 && G.killFeed[0].life <= 0) G.killFeed.shift();
    G.ctx.textAlign = "left";
  }

  if (G.oikotieMessageTimer > 0) {
    const scale = 1 + (120 - G.oikotieMessageTimer) / 120;
    const a = Math.min(1, G.oikotieMessageTimer / 30);
    G.ctx.save();
    G.ctx.translate(CANVAS_W / 2, (CANVAS_H - HUD_H) / 2);
    G.ctx.scale(scale, scale);
    G.ctx.globalAlpha = a;
    G.ctx.fillStyle = "#FF0";
    G.ctx.font = "80px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.shadowColor = "#F00";
    G.ctx.shadowBlur = 10;
    G.ctx.fillText("OIKOTIE!", 0, 20);
    G.ctx.restore();
  }
}

function drawPlayerHUD(p: any, px: number, py: number) {
  const hpColor1 = p.hp > 60 ? "#00DD44" : p.hp > 30 ? "#FFCC00" : "#FF2222";
  G.ctx!.fillStyle = hpColor1;
  G.ctx!.fillRect(px, py, Math.floor((p.hp / 100) * 155), 7);
  G.ctx!.strokeStyle = "#444";
  G.ctx!.strokeRect(px, py, 155, 7);

  // Draw One Big Ammo/Reload Bar for active weapon
  const w = p.activeWeapon;
  const boxY = py + 10;
  G.ctx!.fillStyle = "#111";
  G.ctx!.fillRect(px, boxY, 155, 8);
  G.ctx!.strokeStyle = "#555";
  G.ctx!.strokeRect(px, boxY, 155, 8);

  if (w === 15) {
    // Shield
    const sProg = p.shieldCharged ? 1 : p.shieldChargeTimer / 1500;
    G.ctx!.fillStyle = p.shieldActive ? "#0AA" : "#44A";
    G.ctx!.fillRect(px + 1, boxY + 1, Math.floor(sProg * 153), 6);
  } else if (p.ammo[w] < MAX_AMMO[w]) {
    if (p.reloadTimers[w] > 0) {
      // Actively reloading
      const rTime = RELOAD_TIMES[w] || 1;
      const prog = 1 - p.reloadTimers[w] / rTime;
      G.ctx!.fillStyle = "#A22";
      G.ctx!.fillRect(px + 1, boxY + 1, Math.floor(prog * 153), 6);
    } else {
      // Has partial ammo, but not actively reloading (or background reloading just started/finished)
      const ammoPct = p.ammo[w] / (MAX_AMMO[w] || 1);
      G.ctx!.fillStyle = "#24C";
      G.ctx!.fillRect(px + 1, boxY + 1, Math.floor(ammoPct * 153), 6);
    }
  } else {
    // Full ammo
    const ammoPct = p.ammo[w] / (MAX_AMMO[w] || 1);
    G.ctx!.fillStyle = "#24C";
    G.ctx!.fillRect(px + 1, boxY + 1, Math.floor(ammoPct * 153), 6);
  }

  G.ctx!.fillStyle = p.reloadTimers[p.activeWeapon] > 0 ? "#FF4444" : p.color;
  G.ctx!.font = "14px 'VT323',monospace";
  const p1score =
    G.winMode === "KILLS"
      ? `${p.score}/${G.settingKillsToWin}`
      : G.winMode === "LIVES"
        ? `L:${p.lives}`
        : p.score;
  G.ctx!.fillText(`${p.name}  ${t("SCORE")}${p1score}`, px, py + 31);

  if (p.deathPhase === "spectator") {
    const specTarget = G.players[p.spectateTarget];
    G.ctx!.fillStyle = "#FF4444";
    G.ctx!.fillText(
      `[ SPECTATING: ${specTarget ? specTarget.name : ""} ]`,
      px,
      py + 46,
    );
    return;
  }

  G.ctx!.fillStyle = "#DDD";
  let wn1 = WEAPON_NAMES[p.activeWeapon][G.currentLang];
  if (
    p.activeWeapon === 2 ||
    p.activeWeapon === 7 ||
    p.activeWeapon === 10 ||
    p.activeWeapon === 13 ||
    p.activeWeapon === 16 ||
    p.activeWeapon === 18
  )
    wn1 += ` x${p.ammo[p.activeWeapon]}`;
  if (p.activeWeapon === 15)
    wn1 += p.shieldActive
      ? " [ACTIVE]"
      : p.shieldCharged
        ? " [READY]"
        : ` [${Math.floor(p.shieldChargeTimer / 15)}s]`;
  if (
    p.activeWeapon !== 3 &&
    p.activeWeapon !== 11 &&
    p.activeWeapon !== 15 &&
    p.ammo[p.activeWeapon] >= 0
  )
    wn1 += ` (${p.ammo[p.activeWeapon]}/${MAX_AMMO[p.activeWeapon]})`;

  G.ctx!.fillText(t("WEP") + wn1, px, py + 46);
  if (p.reloadTimers[p.activeWeapon] > 0) {
    G.ctx!.fillStyle = "#FF4444";
    G.ctx!.font = "16px 'VT323',monospace";
    G.ctx!.fillText(
      t("RELOADING") + Math.ceil(p.reloadTimers[p.activeWeapon] / 60) + "s",
      px,
      py + 60,
    );
  }
}

export function drawView(
  viewPlayer: any,
  xOffset: number,
  yOffset: number,
  width: number,
  height: number,
  ctOverride?: any,
  zoomOverride?: number,
) {
  if (!G.ctx || !G.mapCanvas || !G.bloodCanvas) return;
  G.ctx.save();
  G.ctx.translate(xOffset, yOffset);
  G.ctx.beginPath();
  G.ctx.rect(0, 0, width, height);
  G.ctx.clip();

  G.ctx.save();
  G.ctx.globalAlpha = 0.5;
  const pat = G.ctx.createPattern(G.bgNoiseCanvas!, "repeat");
  if (pat) {
    G.ctx.fillStyle = pat;
    G.ctx.fillRect(0, 0, width, height);
  }
  G.ctx.globalAlpha = 1;
  G.ctx.restore();
  if ((G as any).mpIsGameActive) {
    G.ctx.fillStyle = "#4a2a16"; // Earthy solid warm brown
  } else {
    G.ctx.fillStyle = "rgba(40,20,10,0.85)";
  }
  G.ctx.fillRect(0, 0, width, height);

  // Focus
  let ct = { x: viewPlayer.x, y: viewPlayer.y };
  if (viewPlayer.deathPhase === "spectator") {
    const t = G.players[viewPlayer.spectateTarget];
    if (t && t.hp > 0) ct = { x: t.x, y: t.y };
  } else if (
    viewPlayer.deathPhase === "waiting" ||
    viewPlayer.deathPhase === "cinematic"
  ) {
    const p = Math.min(1, viewPlayer.cinematicProgress || 1),
      ep = 1 - Math.pow(1 - p, 2.5);
    ct = {
      x:
        viewPlayer.deathCamX +
        (viewPlayer.pendingSpawnX - viewPlayer.deathCamX) * ep,
      y:
        viewPlayer.deathCamY +
        (viewPlayer.pendingSpawnY - viewPlayer.deathCamY) * ep,
    };
  }
  let zoom = 1;
  const isVictory =
    G.gameState === STATE_ROUND_OVER || G.gameState === STATE_GAMEOVER;
  if (isVictory && G.matchWinnerId > 0) {
    const wp = G.players.find((p) => p.id === G.matchWinnerId);
    if (wp) {
      ct = { x: wp.x, y: wp.y };
      zoom = G.gameState === STATE_GAMEOVER ? 1.6 : 1.4;
    }
  }

  const camW = width / zoom,
    camH = height / zoom;
  const camX = Math.max(0, Math.min(MAP_W - camW, ct.x - camW / 2));
  const camY = Math.max(0, Math.min(MAP_H - camH, ct.y - camH / 2));
  const shX = (Math.random() - 0.5) * G.screenShake,
    shY = (Math.random() - 0.5) * G.screenShake;

  G.ctx.scale(zoom, zoom);
  G.ctx.translate(-camX + shX, -camY + shY);

  // --- PARALLAX START ---
  G.ctx.save();
  G.ctx.globalAlpha = 0.4;
  // Deep layer (stars/dots)
  G.ctx.fillStyle = "#FFF";
  const p1X = camX * 0.9;
  const p1Y = camY * 0.9;
  for (let i = 0; i < 60; i++) {
    const x = ((i * 1234.5) % MAP_W) - (p1X % MAP_W);
    const y = ((i * 5432.1) % MAP_H) - (p1Y % MAP_H);
    // Wrap around for consistent stars
    let drawX = x;
    let drawY = y;
    while (drawX < 0) drawX += MAP_W;
    while (drawY < 0) drawY += MAP_H;
    G.ctx.fillRect(drawX, drawY, 2, 2);
  }

  // Mid layer (distant dark mountains)
  G.ctx.fillStyle = "#150500";
  G.ctx.globalAlpha = 0.7;
  const p2X = camX * 0.6;
  const p2Y = camY * 0.2; // mostly horizontal scroll on mountains
  G.ctx.beginPath();
  let first = true;
  for (let i = 0; i < 20; i++) {
    const mx = i * 200 - (p2X % MAP_W);
    const h = 200 + Math.sin(i * 1.5) * 100;
    if (first) {
      G.ctx.moveTo(mx, MAP_H);
      first = false;
    }
    G.ctx.lineTo(mx, MAP_H - h);
    G.ctx.lineTo(mx + 100, MAP_H - h - 50);
  }
  G.ctx.lineTo(MAP_W, MAP_H);
  G.ctx.fill();
  G.ctx.restore();
  // --- PARALLAX END ---

  G.ctx.drawImage(G.mapCanvas, 0, 0);
  G.ctx.globalAlpha = 0.85;
  G.ctx.drawImage(G.bloodCanvas, 0, 0);
  G.ctx.globalAlpha = 1;

  for (const f of G.groundFires) {
    const a = f.life / f.maxLife;
    G.ctx.fillStyle = `rgba(255,${Math.floor(80 + 80 * a)},0,${a * 0.6})`;
    G.ctx.beginPath();
    G.ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
    G.ctx.fill();
  }

  G.visualExplosions.forEach((v) => v.draw(G.ctx!));
  G.casings.forEach((c2) => c2.draw(G.ctx!));
  G.flames.forEach((f) => f.draw(G.ctx!));
  G.particles.forEach((p) => p.draw(G.ctx!));
  G.mines.forEach((m) => m.draw(G.ctx!));
  G.healthPacks.forEach((h) => h.draw(G.ctx!));
  G.grenades.forEach((g) => g.draw(G.ctx!));
  G.bullets.forEach((b) => b.draw(G.ctx!));
  G.players.forEach((p) => p.draw(G.ctx!));

  G.ctx.restore();

  // Dynamic Lighting / Darkness Overlay
  if (G.settingDarkness || G.settingShadows) {
    G.ctx.save();
    G.ctx.translate(xOffset, yOffset);
    if (G.settingDarkness) {
      // Pitch black with cutouts
      if (G.lightCanvas) {
        G.lightCtx!.fillStyle = "rgba(0,0,0,0.96)";
        G.lightCtx!.fillRect(0, 0, width, height);
        G.lightCtx!.globalCompositeOperation = "destination-out";
        // Light around local player
        let gr = G.lightCtx!.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          200,
        );
        gr.addColorStop(0, "rgba(255,255,255,1)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        G.lightCtx!.fillStyle = gr;
        G.lightCtx!.fillRect(0, 0, width, height);
        // Try light around explosions
        for (const v of G.visualExplosions) {
          const sx = (v.x - camX) * zoom;
          const sy = (v.y - camY) * zoom;
          let egr = G.lightCtx!.createRadialGradient(
            sx,
            sy,
            0,
            sx,
            sy,
            v.r * 3 * zoom,
          );
          egr.addColorStop(0, "rgba(255,255,255,0.8)");
          egr.addColorStop(1, "rgba(255,255,255,0)");
          G.lightCtx!.fillStyle = egr;
          G.lightCtx!.fillRect(0, 0, width, height);
        }
        G.lightCtx!.globalCompositeOperation = "source-over";
        G.ctx.drawImage(G.lightCanvas, 0, 0);
      }
    } else if (G.settingShadows) {
      const gr = G.ctx.createRadialGradient(
        width / 2,
        height / 2,
        40,
        width / 2,
        height / 2,
        width * 0.7,
      );
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, "rgba(0,0,0,0.55)");
      G.ctx.fillStyle = gr;
      G.ctx.fillRect(0, 0, width, height);
    }

    if (G.screenFlash > 0) {
      G.ctx.fillStyle = `rgba(255, 255, 255, ${G.screenFlash * 0.1})`;
      G.ctx.fillRect(0, 0, width, height);
    }
    G.ctx.restore();
  }

  if (viewPlayer.deathPhase === "waiting") {
    G.ctx.save();
    G.ctx.translate(xOffset, yOffset);
    G.ctx.fillStyle = "rgba(0,0,0,0.45)";
    G.ctx.fillRect(0, 0, width, height);
    G.ctx.fillStyle = "#FFEE00";
    G.ctx.font = "20px 'VT323',monospace";
    G.ctx.textAlign = "center";
    G.ctx.fillText(t("SPAWN_PROMPT"), width / 2, height / 2 - 8);
    const s = Math.ceil(viewPlayer.respawnTimer / 60);
    G.ctx.fillStyle = "#FF8800";
    G.ctx.font = "15px 'VT323',monospace";
    G.ctx.fillText(t("AUTO_SPAWN") + s + "s", width / 2, height / 2 + 14);
    G.ctx.textAlign = "left";
    G.ctx.restore();
  } else if (viewPlayer.deathPhase === "spectator" && !isVictory) {
    G.ctx.save();
    G.ctx.translate(xOffset, yOffset);
    const tn = G.players[viewPlayer.spectateTarget];
    G.ctx.fillStyle = "rgba(200,200,200,0.7)";
    G.ctx.font = "12px 'VT323',monospace";
    G.ctx.fillText(t("SPECTATING") + (tn ? tn.name : "?"), 3, 14);
    G.ctx.fillText(t("ELIM"), 3, 27);
    G.ctx.restore();
  }
}

export function drawVirtualCursor() {
  if (!G.ctx) return;
  const gpsRaw = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gpsRaw ? gpsRaw[0] : null;

  // Tateilla liikkuminen on poistettu vapaalta kohdistimelta käyttäjän ohjeiden mukaisesti, jotta ohjaimella valitseminen on sujuvaa ja tarkkaa.
  // G.mpCursorX/Y snapataan suoraan valitun painikkeen päälle.

  if (!G.usingMouse) {
    if (G.gameState === STATE_MULTIPLAYER) {
      if (G.mpUIMenuSel === 0) {
        G.mpCursorX = 30 + 100 / 2;
        G.mpCursorY = 295 + 26 / 2;
      } else if (G.mpUIMenuSel === 1) {
        G.mpCursorX = 150 + 140 / 2;
        G.mpCursorY = 295 + 26 / 2;
      } else if (G.mpUIMenuSel === 2) {
        G.mpCursorX = 310 + 140 / 2;
        G.mpCursorY = 295 + 26 / 2;
      } else if (G.mpUIMenuSel === 3) {
        G.mpCursorX = 470 + 100 / 2;
        G.mpCursorY = 295 + 26 / 2;
      } else {
        const i = G.mpUIMenuSel - 4;
        if (i >= 0 && i < G.mpLobbies.length) {
          const yCoord = 125 + i * 30;
          G.mpCursorX = 550 + 70 / 2;
          G.mpCursorY = yCoord - 10 + 18 / 2;
        }
      }
    } else if (G.gameState === STATE_LOBBY) {
      const sel = G.mpLobbySettingsSel;
      if (G.mpIsHost) {
        if (sel === 0) { G.mpCursorX = 120; G.mpCursorY = 100; }
        else if (sel === 1) { G.mpCursorX = 120; G.mpCursorY = 130; }
        else if (sel === 2) { G.mpCursorX = 120; G.mpCursorY = 160; }
        else if (sel === 3) { G.mpCursorX = 120; G.mpCursorY = 190; }
        else if (sel === 4) { G.mpCursorX = 120; G.mpCursorY = 220; }
        else if (sel === 5) { G.mpCursorX = 480; G.mpCursorY = 270; }
        else if (sel === 6) { G.mpCursorX = 150; G.mpCursorY = 315; }
        else if (sel === 7) { G.mpCursorX = 350; G.mpCursorY = 315; }
      } else {
        if (sel === 0) { G.mpCursorX = 480; G.mpCursorY = 270; }
        else if (sel === 1) { G.mpCursorX = 350; G.mpCursorY = 315; }
      }
    } else if (G.gameState === STATE_USERNAME_INPUT) {
      const sel = G.mpUIMenuSel || 0;
      if (sel === 0) { G.mpCursorX = CANVAS_W / 2; G.mpCursorY = 155; }
      else if (sel === 1) { G.mpCursorX = CANVAS_W / 2 - 80; G.mpCursorY = 215; }
      else if (sel === 2) { G.mpCursorX = CANVAS_W / 2 + 80; G.mpCursorY = 215; }
    }
  }

  G.mpCursorX = Math.max(0, Math.min(CANVAS_W, G.mpCursorX));
  G.mpCursorY = Math.max(0, Math.min(CANVAS_H, G.mpCursorY));

  if (G.usingMouse) {
    G.mpCursorX = G.mouseX;
    G.mpCursorY = G.mouseY;
  }

  G.ctx.strokeStyle = "#FFFFFF";
  G.ctx.lineWidth = 1;
  G.ctx.beginPath();
  G.ctx.arc(G.mpCursorX, G.mpCursorY, 4, 0, Math.PI * 2);
  G.ctx.stroke();

  G.ctx.strokeStyle = "#000000";
  G.ctx.beginPath();
  G.ctx.moveTo(G.mpCursorX - 7, G.mpCursorY); G.ctx.lineTo(G.mpCursorX - 2, G.mpCursorY);
  G.ctx.moveTo(G.mpCursorX + 3, G.mpCursorY); G.ctx.lineTo(G.mpCursorX + 8, G.mpCursorY);
  G.ctx.moveTo(G.mpCursorX, G.mpCursorY - 7); G.ctx.lineTo(G.mpCursorX, G.mpCursorY - 2);
  G.ctx.moveTo(G.mpCursorX, G.mpCursorY + 3); G.ctx.lineTo(G.mpCursorX, G.mpCursorY + 8);
  G.ctx.stroke();

  G.ctx.strokeStyle = "#00FF00";
  G.ctx.beginPath();
  G.ctx.moveTo(G.mpCursorX - 6, G.mpCursorY); G.ctx.lineTo(G.mpCursorX - 1, G.mpCursorY);
  G.ctx.moveTo(G.mpCursorX + 2, G.mpCursorY); G.ctx.lineTo(G.mpCursorX + 7, G.mpCursorY);
  G.ctx.moveTo(G.mpCursorX, G.mpCursorY - 6); G.ctx.lineTo(G.mpCursorX, G.mpCursorY - 1);
  G.ctx.moveTo(G.mpCursorX, G.mpCursorY + 2); G.ctx.lineTo(G.mpCursorX, G.mpCursorY + 7);
  G.ctx.stroke();
}

// Render elegant opponent status card overlay in multiplayer (top-right overlay)
export function drawOpponentOverlayHUD(opp: any) {
  if (!G.ctx) return;
  const ctx = G.ctx;
  
  // Custom font setup matching non-slop style
  ctx.save();
  
  const cardW = 160;
  const cardH = 34;
  const x = CANVAS_W - cardW - 10;
  const y = 10;
  
  // Draw card panel container
  ctx.fillStyle = "rgba(10, 5, 2, 0.75)";
  ctx.strokeStyle = "#5a3a1f";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, cardW, cardH, 4);
  ctx.fill();
  ctx.stroke();
  
  // Draw opponent's name labeled red
  ctx.fillStyle = "#FF5555";
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.textAlign = "left";
  ctx.fillText(opp.name || "Opponent", x + 8, y + 10);
  
  // Draw health bar container background
  const hpW = 144;
  const hpH = 4;
  const hpX = x + 8;
  const hpY = y + 14;
  ctx.fillStyle = "#3a1308";
  ctx.fillRect(hpX, hpY, hpW, hpH);
  
  // Health bar ratio
  const ratio = Math.max(0, Math.min(1.0, opp.hp / 100));
  ctx.fillStyle = ratio > 0.4 ? "#44EE44" : ratio > 0.2 ? "#FFEE22" : "#FF5555";
  ctx.fillRect(hpX, hpY, hpW * ratio, hpH);
  
  // Draw current weapon name localized
  const wep = opp.activeWeapon !== undefined ? WEAPON_NAMES[opp.activeWeapon] : "UNKNOWN";
  const wepName = Array.isArray(wep) ? wep[G.currentLang] : wep;
  
  ctx.fillStyle = "#bbb";
  ctx.font = '500 7px "Inter", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(wepName, x + 8, y + 26);
  
  // Draw current lives indicator
  ctx.fillStyle = "#FFEE22";
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.textAlign = "right";
  ctx.fillText("♥ " + (opp.lives !== undefined ? opp.lives : 0), x + cardW - 8, y + 26);
  
  ctx.restore();
}
