import "./globals"; // ensure loaded
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
  STATE_PLAYING,
  STATE_ROUND_OVER,
  STATE_GAMEOVER,
  STATE_COUNTDOWN,
  STATE_LOADING,
  STATE_JOINING,
  STATE_MODE_SELECT,
  STATE_WEAPON_SELECT,
  STATE_WEAPON_LIST,
  STATE_WIN_CONFIG,
  STATE_LEVEL_PROMPT,
  STATE_PAUSED,
  STATE_LEVEL_EDITOR,
  STATE_MULTIPLAYER,
  STATE_LOBBY,
  STATE_USERNAME_INPUT,
  t,
  TOTAL_WEAPONS,
  MAX_AMMO,
  WEAPON_NAMES,
  RELOAD_TIMES,
  GUN_GAME_ORDER,
  FRICTION,
} from "./globals";
import {
  initAudio,
  playSound,
  startMenuMusic,
  stopMenuMusic,
  playWinMusic,
} from "./audio";
import {
  generateTerrainNoise,
  renderFullTerrainCanvas,
  getTerrainColor,
  isSolid,
  generateTerrain,
  generateArenaTerrain,
} from "./map";
import { VisualExplosion, Particle } from "./entities";
import { Player, getBestSpawnPoint } from "./player";
import { sendLobbyChatMessage } from "./multiplayer";

const MAX_REPLAY_FRAMES = 1800; // 30 sec * 60 fps
let replayBuffer: any[] = [];
(window as any).saveReplay = () => {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(replayBuffer));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "replay_" + Date.now() + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  import("./globals").then((g) => g.addNotification("REPLAY SAVED!"));
};

import {
  drawBgNoise,
  drawHUD,
  drawView,
  drawMenuOverlay,
  handleMenuInputUI,
  wsCursors,
  wsReady,
  wsLastInput,
  wsConfirmExit,
  cycleWeapon,
} from "./ui";
import { updateEditor, drawEditor } from "./editor";
import { scrollWeaponList } from "./ui";

// Bootstrap canvases
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
canvas.style.width = CANVAS_W * SCALE + "px";
canvas.style.height = CANVAS_H * SCALE + "px";
G.canvas = canvas;
G.ctx = canvas.getContext("2d", { alpha: false });

G.mapCanvas = document.createElement("canvas");
G.mapCanvas.width = MAP_W;
G.mapCanvas.height = MAP_H;
G.mapCtx = G.mapCanvas.getContext("2d", { willReadFrequently: true });

G.bloodCanvas = document.createElement("canvas");
G.bloodCanvas.width = MAP_W;
G.bloodCanvas.height = MAP_H;
G.bloodCtx = G.bloodCanvas.getContext("2d");

G.lightCanvas = document.createElement("canvas");
G.lightCanvas.width = VIEW_W;
G.lightCanvas.height = VIEW_H;
G.lightCtx = G.lightCanvas.getContext("2d");

G.bgNoiseCanvas = document.createElement("canvas");
G.bgNoiseCanvas.width = 256;
G.bgNoiseCanvas.height = 256;
(function generateBgNoise() {
  const nc = G.bgNoiseCanvas!.getContext("2d")!;
  const img = nc.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 18 + Math.floor(Math.random() * 22);
    img.data[i] = Math.floor(v * 1.1);
    img.data[i + 1] = Math.floor(v * 0.7);
    img.data[i + 2] = Math.floor(v * 0.4);
    img.data[i + 3] = 255;
  }
  nc.putImageData(img, 0, 0);
})();

// Provide a background map for the menu
generateTerrain();
G.menuMapCanvas = document.createElement("canvas");
G.menuMapCanvas.width = MAP_W;
G.menuMapCanvas.height = MAP_H;
G.menuMapCanvas.getContext("2d")!.drawImage(G.mapCanvas!, 0, 0);

// Input
window.addEventListener("keydown", (e) => {
  initAudio();
  if (e.code === "F9" && !(G as any).mpIsGameActive) {
    (window as any).saveReplay();
  }

  // Intercept characters to log if typing username or chat message
  if (G.gameState === STATE_USERNAME_INPUT) {
    if (e.key === "Backspace") {
      G.mpUsername = G.mpUsername.slice(0, -1);
      playSound("hover");
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      // let keydown bubble to trigger select
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (G.mpUsername.length < 20 && /^[a-zA-Z0-9 _-]$/.test(e.key)) {
        if (G.mpUsername === "Player") G.mpUsername = ""; // reset placeholder
        G.mpUsername += e.key;
        playSound("hover");
      }
      e.preventDefault();
      return;
    }
  }

  if (G.gameState === STATE_LOBBY) {
    const isChatFocused = (G.mpIsHost && G.mpLobbySettingsSel === 5) || (!G.mpIsHost && G.mpLobbySettingsSel === 0);
    if (isChatFocused) {
      if (e.key === "Backspace") {
        G.mpChatInput = G.mpChatInput.slice(0, -1);
        playSound("hover");
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        if (G.mpChatInput.trim().length > 0) {
          sendLobbyChatMessage(G.mpChatInput.trim());
          G.mpChatInput = "";
          playSound("click");
        }
        e.preventDefault();
        return;
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (G.mpChatInput.length < 40) {
          G.mpChatInput += e.key;
          playSound("hover");
        }
        e.preventDefault();
        return;
      }
    }
  }

  (G.keys as any)[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  (G.keys as any)[e.code] = false;
});
window.addEventListener("gamepadconnected", () => {
  initAudio();
});

window.addEventListener("wheel", (e) => {
  if (G.gameState === STATE_WEAPON_LIST) {
    if (e.deltaY < 0) scrollWeaponList(-2);
    if (e.deltaY > 0) scrollWeaponList(2);
  }
});

window.addEventListener("mousemove", (e) => {
  G.usingMouse = true;
  const rect = canvas.getBoundingClientRect();
  G.mouseX = (e.clientX - rect.left) / SCALE;
  G.mouseY = (e.clientY - rect.top) / SCALE;
});
window.addEventListener("mousedown", (e) => {
  G.usingMouse = true;
  if (e.button === 0) G.mouseDown = true;
  if (e.button === 2) G.rightMouseDown = true;
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 0) G.mouseDown = false;
  if (e.button === 2) G.rightMouseDown = false;
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("wheel", (e) => {
  G.mouseWheelDelta = e.deltaY;
});

export function gpIs(gp: any, action: string) {
  if (!gp || !gp.connected) return false;
  const b = (i: number) =>
    gp.buttons && gp.buttons.length > i && gp.buttons[i].pressed;
  const ax = (i: number) => (gp.axes && gp.axes.length > i ? gp.axes[i] : 0);
  const isStd = gp.mapping === "standard";
  switch (action) {
    case "UP":
      return b(12) || ax(1) < -0.5 || (!isStd && ax(5) < -0.5);
    case "DOWN":
      return b(13) || ax(1) > 0.5 || (!isStd && ax(5) > 0.5);
    case "LEFT":
      return b(14) || ax(0) < -0.5 || (!isStd && ax(4) < -0.5);
    case "RIGHT":
      return b(15) || ax(0) > 0.5 || (!isStd && ax(4) > 0.5);
    case "RS_UP":
      return ax(3) < -0.5;
    case "RS_DOWN":
      return ax(3) > 0.5;
    case "SELECT":
      return b(0) || b(9) || (!isStd && (b(1) || b(0)));
    case "BACK":
      return isStd ? b(1) : !isStd && (b(2) || b(1));
  }
  return false;
}

export function getGamepadInput(pi: number) {
  const gpRaw = G.activeGamepadIndices[pi];
  if (typeof gpRaw !== "number") return null; // Keyboard or missing
  const gpsRaw = navigator.getGamepads ? navigator.getGamepads() : [];
  return gpsRaw[gpRaw] || null;
}

export function initGame(fullReset = false, mapData?: any) {
  G.bullets.length = 0;
  G.grenades.length = 0;
  G.particles.length = 0;
  G.casings.length = 0;
  G.mines.length = 0;
  G.flames.length = 0;
  G.healthPacks.length = 0;
  G.notifications.length = 0;
  G.visualExplosions.length = 0;
  G.stickyBombs.length = 0;
  G.groundFires.length = 0;
  G.bloodCtx!.clearRect(0, 0, MAP_W, MAP_H);

  if (mapData && mapData.map) {
    G.terrainMap = new Uint8Array(mapData.map);
    G.customSpawns = mapData.spawns || [];
    renderFullTerrainCanvas();
  } else if (G.isArenaMode) {
    generateArenaTerrain();
  } else {
    generateTerrain();
  }

  G.players = [];
  const pCount = G.is4PlayerMode ? 4 : 2;
  const colors = ["#FFEE22", "#44EE44", "#FF5555", "#5599FF"];
  const names = ["KingJani", "Poopyfart69", "Mato", "Seppo"];

  for (let i = 0; i < pCount; i++) {
    let pName = names[i];
    if ((G as any).mpIsGameActive && G.mpCurrentLobby) {
      if (i === 0) pName = (G.mpCurrentLobby.hostName || "Host") + " (host)";
      if (i === 1) pName = G.mpCurrentLobby.guestName || "Guest";
    }
    let p = new Player(
      i + 1,
      colors[i],
      pName,
      MAP_W / 2,
      MAP_H / 2,
      G.customizeSkins[i],
    );
    let bestPoint = getBestSpawnPoint(p);
    p.x = bestPoint.x;
    p.y = bestPoint.y;
    p.pendingSpawnX = p.x;
    p.pendingSpawnY = p.y;
    G.players.push(p);
  }
  G.gameState = STATE_PLAYING;
  stopMenuMusic();
}

(window as any).startMultiplayerGameLoading = async (data: any) => {
  G.is4PlayerMode = false;
  G.isArenaMode = data.settings?.isArenaMode || false;
  G.joinedPlayers.clear();
  G.activeGamepadIndices = [];
  (G as any).mpIsGameActive = true;
  
  G.gameState = 4; // STATE_LOADING
  stopMenuMusic();

  if (!G.mpIsHost && data.mapRLE) {
    const { decompressMap, renderFullTerrainCanvas } = await import("./map");
    G.terrainMap = decompressMap(data.mapRLE);
    G.customSpawns = data.spawns || [];
    renderFullTerrainCanvas();
  }

  initGame(true, { map: G.terrainMap, spawns: G.customSpawns });

  if (G.mpCurrentLobbyId) {
    const { doc, updateDoc } = await import("firebase/firestore");
    const { db } = await import("./firebase");
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    if (G.mpIsHost) {
      await updateDoc(ref, {
        hostLoaded: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        guestLoaded: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }
};

(window as any).startMultiplayerGame = () => {
  G.gameState = 5; // STATE_PLAYING
};

function handleInputEvents() {
  const now = Date.now();
  let navUp = false,
    navDown = false,
    navLeft = false,
    navRight = false,
    sel = false,
    back = false;
  if (now - G.lastInputTime > 150) {
    const isMultiplayerMenu = G.gameState === 22 || G.gameState === 23 || G.gameState === 24;
    if (isMultiplayerMenu) {
      if (G.keys.ArrowLeft) navUp = true;
      if (G.keys.ArrowRight) navDown = true;
      // Up & Down Arrow keys are strictly ignored for keyboard multiplayer menu/lobby navigation
    } else {
      if (G.keys.ArrowUp) navUp = true;
      if (G.keys.ArrowDown) navDown = true;
      if (G.keys.ArrowLeft) navLeft = true;
      if (G.keys.ArrowRight) navRight = true;
    }
    if (G.keys.Enter) sel = true;
    if (G.keys.Escape) back = true;
  }
  const gpsRaw = navigator.getGamepads ? navigator.getGamepads() : [];
  const gps = gpsRaw || [];
  for (let i = 0; i < gps.length; i++) {
    const gp = gps[i];
    if (!gp || !gp.connected) continue;
    if (now - G.lastInputTime > 150) {
      if (gpIs(gp, "UP")) navUp = true;
      if (gpIs(gp, "DOWN")) navDown = true;
      if (gpIs(gp, "LEFT")) navLeft = true;
      if (gpIs(gp, "RIGHT")) navRight = true;
      if (gpIs(gp, "SELECT")) sel = true;
      if (gpIs(gp, "BACK")) back = true;

      if (G.gameState === STATE_WEAPON_LIST) {
        if (gpIs(gp, "RS_UP")) scrollWeaponList(-2);
        if (gpIs(gp, "RS_DOWN")) scrollWeaponList(2);
      }
    }
  }

  if (navUp || navDown || navLeft || navRight || sel || back) {
    G.usingMouse = false;
  }

  if (G.gameState === STATE_LEVEL_EDITOR) {
    updateEditor();
    return;
  }

  if (
    G.gameState !== STATE_PLAYING &&
    G.gameState !== STATE_ROUND_OVER &&
    G.gameState !== STATE_COUNTDOWN &&
    G.gameState !== STATE_LOADING
  ) {
    if (G.gameState === STATE_JOINING) {
      const needed = G.is4PlayerMode ? 4 : 2;
      if (G.keys.Enter && !G.joinedPlayers.has("KBD")) {
        G.joinedPlayers.add("KBD");
        playSound("spawn");
        G.lastInputTime = now + 250;
      }
      if (G.keys.Escape) {
        playSound("click");
        G.joinedPlayers.clear();
        G.activeGamepadIndices = [];
        G.gameState = STATE_MENU;
        G.lastInputTime = now + 250;
      }

      for (let i = 0; i < gps.length; i++) {
        const gp = gps[i];
        if (!gp || !gp.connected) continue;
        if (gpIs(gp, "SELECT") && !G.joinedPlayers.has(i)) {
          G.joinedPlayers.add(i);
          playSound("spawn");
          G.lastInputTime = now + 250;
        }
        if (gpIs(gp, "BACK")) {
          playSound("click");
          G.joinedPlayers.clear();
          G.activeGamepadIndices = [];
          G.gameState = STATE_MENU;
          G.lastInputTime = now + 250;
        }
      }

      if (G.joinedPlayers.size >= needed) {
        G.activeGamepadIndices = Array.from(G.joinedPlayers).slice(0, needed);
        // fallback initialization to avoid wsCursors undefined
        G.wsLoadouts = Array(4)
          .fill(null)
          .map(() => [0, 8, 9, 12, 14]);
        G.gameMode = "NORMAL";
        G.uiModeSel = 0;
        G.gameState = STATE_MODE_SELECT;
        G.lastInputTime = now + 400;
      }
    } else if (G.gameState === STATE_WEAPON_SELECT) {
      if (G.gameMode === "GUNGAME") {
        if (sel) {
          playSound("click");
          G.gameState = STATE_WIN_CONFIG;
          G.lastInputTime = now + 100;
        }
        if (back) {
          G.gameState = STATE_MENU;
          G.lastInputTime = now;
        }
      } else {
        const numPlayers = G.is4PlayerMode ? 4 : 2;
        let allReady = true;
        for (let i = 0; i < numPlayers; i++) {
          const gpRaw = G.activeGamepadIndices[i];
          let gp = null;
          let up = false,
            down = false,
            left = false,
            right = false,
            tsel = false,
            tback = false;

          if (gpRaw === "KBD") {
            if (now - wsLastInput[i] > 150) {
              if (G.keys.ArrowUp) up = true;
              if (G.keys.ArrowDown) down = true;
              if (G.keys.ArrowLeft) left = true;
              if (G.keys.ArrowRight) right = true;
            }
            if (now - wsLastInput[i] > 200) {
              if (G.keys.Enter) tsel = true;
              if (G.keys.Escape) tback = true;
            }
          } else {
            gp = getGamepadInput(i);
            if (gp) {
              if (now - wsLastInput[i] > 150) {
                if (gpIs(gp, "UP")) up = true;
                if (gpIs(gp, "DOWN")) down = true;
                if (gpIs(gp, "LEFT")) left = true;
                if (gpIs(gp, "RIGHT")) right = true;
              }
              if (now - wsLastInput[i] > 200) {
                if (gpIs(gp, "SELECT")) tsel = true;
                if (gpIs(gp, "BACK")) tback = true;
              }
            }
          }

          if (up || down || left || right || tsel || tback)
            wsLastInput[i] = now;

          if (!wsReady[i]) {
            if (up) {
              wsCursors[i] = (wsCursors[i] - 1 + 5) % 5;
              playSound("hover");
            }
            if (down) {
              wsCursors[i] = (wsCursors[i] + 1) % 5;
              playSound("hover");
            }
            if (left) {
              cycleWeapon(i, wsCursors[i], -1);
              playSound("hover");
            }
            if (right) {
              cycleWeapon(i, wsCursors[i], 1);
              playSound("hover");
            }
            if (tsel) {
              wsReady[i] = true;
              playSound("click");
            }
            if (tback) {
              G.gameState = STATE_MENU;
              playSound("click");
              G.lastInputTime = now;
            }
          } else {
            if (tback) {
              wsReady[i] = false;
              playSound("click");
            }
          }
          if (!wsReady[i]) allReady = false;
        }

        if (allReady) {
          G.gameState = STATE_WIN_CONFIG;
          G.uiWinConfigSel = 0;
          G.lastInputTime = now + 100;
        }
      }
    } else {
      const res = handleMenuInputUI(
        navUp,
        navDown,
        navLeft,
        navRight,
        sel,
        back,
      );
      if (res === "START") {
        initGame();
        G.lastInputTime = now;
      }
      if (res === "START_FILE") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re) => {
            try {
              const data = JSON.parse(re.target?.result as string);
              initGame(false, data);
              G.lastInputTime = Date.now();
            } catch (e) {
              console.error("Failed to load map error", e);
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    }
    if (navUp || navDown || navLeft || navRight || sel || back)
      G.lastInputTime = now;
  } else if (G.gameState === STATE_PLAYING) {
    for (const p of G.players) {
      let moveX = 0,
        jump = false,
        shooting = false,
        switchDir = 0;
      let aimX = 0,
        aimY = 0,
        manualReload = false,
        ropeAction = false;
      const gp = getGamepadInput(p.id - 1);

      const gpRaw = G.activeGamepadIndices[p.id - 1];

      if (gpRaw === "KBD") {
        // Singular keyboard controller: A/D/Left/Right: move, W/Up/Space: jump, Mouse: Aim & Click Actions
        if (G.keys.KeyA || G.keys.ArrowLeft) moveX = -1;
        if (G.keys.KeyD || G.keys.ArrowRight) moveX = 1;
        if (G.keys.KeyW || G.keys.ArrowUp) jump = true;
        if (G.keys.Space || G.keys.Enter || G.mouseDown) shooting = true;
        
        if (G.keys.KeyQ || G.keys.Period) {
          if (p.switchCooldown === 0) switchDir = -1;
        }
        if (G.keys.KeyE || G.keys.ShiftLeft || G.keys.Slash) {
          if (p.switchCooldown === 0) switchDir = 1;
        }
        if (G.keys.KeyR && p.cooldown === 0) manualReload = true;
        if (G.keys.KeyF || G.keys.ShiftRight || G.rightMouseDown) ropeAction = true;

        // Custom mouse-facing aim angle
        const dx = G.mouseX - (CANVAS_W / 2);
        const dy = G.mouseY - ((CANVAS_H - HUD_H) / 2);
        p.aimAngle = Math.atan2(dy, dx);

        if (
          G.keys.Escape &&
          G.gameState === STATE_PLAYING &&
          now - G.lastInputTime > 200
        ) {
          G.gameState = STATE_PAUSED;
          G.lastInputTime = Date.now();
        }
      }

      if (gp) {
        if (gp.axes && gp.axes.length > 0 && Math.abs(gp.axes[0]) > 0.2)
          moveX = gp.axes[0] > 0 ? 1 : -1;
        if (gpIs(gp, "LEFT")) moveX = -1;
        if (gpIs(gp, "RIGHT")) moveX = 1;
        if (gpIs(gp, "SELECT")) jump = true;
        if (
          gp.buttons &&
          gp.buttons.length > 7 &&
          (gp.buttons[7]?.pressed || gp.buttons[1]?.pressed)
        )
          shooting = true;
        if (
          gp.buttons &&
          gp.buttons.length > 4 &&
          gp.buttons[4]?.pressed &&
          p.switchCooldown === 0
        )
          switchDir = -1;
        if (
          gp.buttons &&
          gp.buttons.length > 6 &&
          gp.buttons[6]?.pressed &&
          p.switchCooldown === 0
        )
          switchDir = 1;
        if (
          gp.buttons &&
          gp.buttons.length > 3 &&
          gp.buttons[3]?.pressed &&
          p.cooldown === 0
        )
          manualReload = true;
        if (gp.buttons && gp.buttons.length > 5 && gp.buttons[5]?.pressed)
          ropeAction = true; // R1 for Ninja Rope
        if (
          gp.buttons &&
          gp.buttons.length > 9 &&
          gp.buttons[9]?.pressed &&
          G.gameState === STATE_PLAYING
        ) {
          G.gameState = STATE_PAUSED;
          G.lastInputTime = Date.now();
        }
        if (
          gp.axes &&
          gp.axes.length > 3 &&
          (Math.abs(gp.axes[2]) > 0.18 || Math.abs(gp.axes[3]) > 0.18)
        ) {
          p.aimAngle = Math.atan2(gp.axes[3], gp.axes[2]);
        }
      }

      if (jump && switchDir !== 0) {
        ropeAction = true;
        jump = false;
        switchDir = 0;
      } // Classic combo

      if (switchDir !== 0) {
        p.loadoutIndex =
          (((p.loadoutIndex + switchDir) % p.loadout.length) +
            p.loadout.length) %
          p.loadout.length;
        p.activeWeapon = p.loadout[p.loadoutIndex];
        p.switchCooldown = 20;
        p.cooldown = 4;
        playSound("switch");
      }

      if (
        manualReload &&
        p.reloadTimers[p.activeWeapon] === 0 &&
        p.ammo[p.activeWeapon] < MAX_AMMO[p.activeWeapon]
      ) {
        p.reloadTimers[p.activeWeapon] = RELOAD_TIMES[p.activeWeapon];
        playSound("empty");
      }

      if (moveX !== 0) {
        p.vx += moveX * 0.62;
        if (Math.abs(p.vx) > 3.2) p.vx = 3.2 * Math.sign(p.vx);
      } else p.vx *= FRICTION;

      const onGround = isSolid(p.x, p.y + p.radius + 1);
      if (onGround) p.doubleJumped = false;

      if (jump && !p.jumpPressedLast) {
        if (onGround) {
          p.vy = -5.2;
          import("./globals").then((g) =>
            g.triggerVibration(p.id - 1, "light", 30),
          );
        } else if (!p.doubleJumped && p.ropeCooldown === 0 && !p.rope.active) {
          p.vy = -4.8;
          p.doubleJumped = true;
          import("./globals").then((g) =>
            g.triggerVibration(p.id - 1, "light", 40),
          );
          // little smoke
          for (let i = 0; i < 6; i++) {
            G.particles.push(
              new Particle(
                p.x,
                p.y + p.radius,
                (Math.random() - 0.5) * 4,
                Math.random() * 2,
                "smoke",
              ),
            );
          }
        }
      }
      p.jumpPressedLast = jump;

      if (ropeAction && p.deathPhase === "alive") {
        if (!p.rope.active && p.ropeCooldown === 0 && !p.ropePressedLast)
          p.rope.fire();
      } else {
        if (p.rope.active) p.rope.release();
      }
      p.ropePressedLast = ropeAction;

      if (
        shooting &&
        p.cooldown <= 0 &&
        p.reloadTimers[p.activeWeapon] === 0 &&
        p.deathPhase === "alive"
      ) {
        p.fireWeapon();
      } else if (shooting && p.deathPhase === "waiting") {
        p.doRespawn();
      } else if (
        (shooting || jump || moveX !== 0) &&
        p.deathPhase === "spectator" &&
        p.switchCooldown === 0
      ) {
        p.switchCooldown = 15;
        let alivePlayers = G.players.filter(
          (pl) => pl.lives > 0 && pl.deathPhase === "alive",
        );
        if (alivePlayers.length > 0) {
          let currIdx = alivePlayers.findIndex(
            (pl) => pl.id === G.players[p.spectateTarget]?.id,
          );
          currIdx = (currIdx + 1) % alivePlayers.length;
          p.spectateTarget = G.players.indexOf(alivePlayers[currIdx]);
        }
      }
    }
  }
}

function update() {
  handleInputEvents();

  if (G.screenShake > 0) G.screenShake *= 0.9;
  if (G.screenShake < 0.5) G.screenShake = 0;
  if (G.screenFlash > 0) G.screenFlash -= 0.5;
  if (G.screenFlash < 0) G.screenFlash = 0;
  if (G.oikotieMessageTimer > 0) G.oikotieMessageTimer--;

  // Auto refresh lobbies in matchmaking menu every 15 seconds
  if (G.gameState === STATE_MULTIPLAYER) {
    const now = Date.now();
    if (now - G.mpLastRefreshTime > 15000) {
      import("./multiplayer").then((mp) => {
        mp.fetchLobbiesList();
      });
    }
  }

  // Send keep-alive heartbeats to keep Firestore lobby active while waiting in lobby screen
  if (G.gameState === STATE_LOBBY && G.mpIsHost && G.mpCurrentLobbyId) {
    const now = Date.now();
    if (!(G as any).mpLastHeartbeatTime) (G as any).mpLastHeartbeatTime = 0;
    if (now - (G as any).mpLastHeartbeatTime > 8000) {
      (G as any).mpLastHeartbeatTime = now;
      import("./multiplayer").then((mp) => {
        mp.sendHostHeartbeat();
      });
    }
  }

  const isPlayingOrMPPaused = G.gameState === STATE_PLAYING || 
    G.gameState === STATE_ROUND_OVER || 
    G.gameState === STATE_COUNTDOWN ||
    (G.gameState === STATE_PAUSED && (G as any).mpIsGameActive);

  if (!isPlayingOrMPPaused) return;

  if (G.gameState === STATE_COUNTDOWN) {
    if (G.mpCountdownTimer <= 0) {
      G.mpCountdownTimer = 180;
      G.mpCountdownVal = 3;
    }
    G.mpCountdownTimer--;
    if (G.mpCountdownTimer > 0 && G.mpCountdownTimer % 60 === 0) {
      G.mpCountdownVal = Math.ceil(G.mpCountdownTimer / 60);
      import("./audio").then((a) => a.playSound("countdown_beep"));
    }
    if (G.mpCountdownTimer === 0) {
      G.mpCountdownVal = 0; // GO!
      import("./audio").then((a) => a.playSound("countdown_go"));
      G.gameState = STATE_PLAYING;
      if (G.mpIsHost && G.mpCurrentLobbyId) {
        import("firebase/firestore").then(async ({ doc, updateDoc }) => {
          import("./firebase").then(async ({ db }) => {
            try {
              const ref = doc(db, "lobbies", G.mpCurrentLobbyId!);
              await updateDoc(ref, { status: "playing" });
            } catch (e) {
              console.warn(e);
            }
          });
        });
      }
    }
    return; // Block actual game movement during countdown
  }

  if (G.gameState === STATE_ROUND_OVER) {
    if (G.roundOverTimer > 0) G.roundOverTimer--;
    if (G.roundOverTimer <= 0) G.gameState = STATE_GAMEOVER;
  }

  if (
    G.winMode === "TIME" &&
    G.gameTimerActive &&
    G.gameState === STATE_PLAYING
  ) {
    G.gameTimer--;
    if (G.gameTimer <= 0) {
      G.gameTimerActive = false;
      let highest = -1;
      let winnerId = 0;
      for (const p of G.players) {
        if (p.score > highest) {
          highest = p.score;
          winnerId = p.id;
        }
      }
      G.matchWinnerId = winnerId;
      G.gameState = STATE_ROUND_OVER;
      G.roundOverTimer = 300;
      playWinMusic();
    }
  }

  for (const p of G.players) p.update();
  for (let i = G.bullets.length - 1; i >= 0; i--)
    if (!G.bullets[i].update()) G.bullets.splice(i, 1);
  for (let i = G.grenades.length - 1; i >= 0; i--)
    if (!G.grenades[i].update()) G.grenades.splice(i, 1);
  for (let i = G.particles.length - 1; i >= 0; i--)
    if (!G.particles[i].update()) G.particles.splice(i, 1);
  for (let i = G.casings.length - 1; i >= 0; i--)
    if (!G.casings[i].update()) G.casings.splice(i, 1);
  for (let i = G.mines.length - 1; i >= 0; i--)
    if (!G.mines[i].update()) G.mines.splice(i, 1);
  for (let i = G.flames.length - 1; i >= 0; i--)
    if (!G.flames[i].update()) G.flames.splice(i, 1);
  for (let i = G.healthPacks.length - 1; i >= 0; i--)
    if (!G.healthPacks[i].update()) G.healthPacks.splice(i, 1);

  if (Math.random() < 0.002) {
    // approx every 8 seconds
    // spawn a health pack somewhere open
    const hx = 50 + Math.random() * (MAP_W - 100);
    const hy = 50 + Math.random() * (MAP_H / 2);
    if (!isSolid(hx, hy)) {
      import("./entities").then((m) => {
        G.healthPacks.push(new m.HealthPack(hx, hy));
      });
    }
  }

  for (let i = G.visualExplosions.length - 1; i >= 0; i--)
    if (!G.visualExplosions[i].update()) G.visualExplosions.splice(i, 1);

  for (let i = G.stickyBombs.length - 1; i >= 0; i--) {
    const sb = G.stickyBombs[i];
    if (sb.stuck) {
      sb.timer--;
      if (sb.timer % 20 === 0) playSound("sticky_beep");
      if (sb.timer <= 0) {
        playSound("explosion_bam");
        G.visualExplosions.push(new VisualExplosion(sb.x, sb.y, 45));
        for (const p of G.players) {
          const d = Math.max(Math.hypot(p.x - sb.x, p.y - sb.y), 0.1);
          if (d < 55) {
            p.takeDamage(Math.floor((55 - d) * 1.4), sb.ownerId);
            p.vx += ((p.x - sb.x) / d) * 10;
          }
          if (p.stuckToSticky === i) {
            p.stuckToSticky = -1;
            p.stickyTimer = 0;
          }
        }
        G.stickyBombs.splice(i, 1);
      }
    }
  }

  // Handle ground fires
  for (let i = G.groundFires.length - 1; i >= 0; i--) {
    const f = G.groundFires[i];
    f.life--;
    if (f.life % 4 === 0)
      G.particles.push(
        new Particle(
          f.x + (Math.random() - 0.5) * 4,
          f.y - 1,
          (Math.random() - 0.5) * 1,
          -0.5 - Math.random() * 1,
          "flame_ember",
        ),
      );
    for (const p of G.players) {
      if (
        p.hp > 0 &&
        !p.godMode &&
        !p.shieldActive &&
        Math.hypot(p.x - f.x, p.y - f.y) < 10
      ) {
        if (f.life % 20 === 0) p.takeDamage(1, f.ownerId);
        p.onFire = Math.max(p.onFire, 60);
      }
    }
    if (f.life <= 0) G.groundFires.splice(i, 1);
  }

  // --- MULTIPLAYER IN-GAME REALTIME STATE SYNC ---
  if ((G as any).mpIsGameActive && G.mpCurrentLobbyId && G.gameState === STATE_PLAYING) {
    if (!(G as any).mpSyncTick) (G as any).mpSyncTick = 0;
    (G as any).mpSyncTick++;
    if ((G as any).mpSyncTick % 8 === 0) {
      import("./multiplayer").then((mp) => {
        mp.sendMultiplayerGameState();
      });
    }
  }

  // --- REPLAY RECORDING ---
  if (G.gameState === STATE_PLAYING || G.gameState === STATE_ROUND_OVER) {
    const frameData = {
      players: G.players.map((p) => ({
        x: Math.floor(p.x),
        y: Math.floor(p.y),
        hp: p.hp,
        a: p.aimAngle,
        w: p.activeWeapon,
      })),
      bullets: G.bullets.map((b) => ({
        x: Math.floor(b.x),
        y: Math.floor(b.y),
      })),
      particles: G.particles.length, // just saving length as indicative activity, full state is too big
    };
    replayBuffer.push(frameData);
    if (replayBuffer.length > MAX_REPLAY_FRAMES) replayBuffer.shift();
  }
}

let lastRenderTime = 0;
const fpsInterval = 1000 / 60;

function loop(timestamp: number) {
  requestAnimationFrame(loop);

  if (!lastRenderTime) {
    lastRenderTime = timestamp;
    return;
  }

  let elapsed = timestamp - lastRenderTime;
  if (elapsed > 100) elapsed = 100;

  let didUpdate = false;
  while (elapsed >= fpsInterval) {
    update();
    G.menuAnimTime++;
    elapsed -= fpsInterval;
    lastRenderTime += fpsInterval;
    didUpdate = true;
  }

  if (didUpdate) {
    const menuGif = document.getElementById("menuGif");
    if (menuGif)
      menuGif.style.display = G.gameState === STATE_MENU ? "block" : "none";

    if (
      G.gameState === STATE_PLAYING ||
      G.gameState === STATE_COUNTDOWN ||
      G.gameState === STATE_ROUND_OVER ||
      G.gameState === STATE_GAMEOVER
    ) {
      G.ctx!.fillStyle = "#1A0C05";
      G.ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H);
      if (G.players.length > 0) {
        if ((G as any).mpIsGameActive) {
          const myPlayer = G.mpIsHost ? G.players[0] : G.players[1];
          const oppPlayer = G.mpIsHost ? G.players[1] : G.players[0];
          if (myPlayer) {
            drawView(myPlayer, 0, 0, CANVAS_W, VIEW_H);
          }
          if (oppPlayer) {
            import("./ui").then((ui) => {
              ui.drawOpponentOverlayHUD(oppPlayer);
            });
          }
        } else if (!G.is4PlayerMode) {
          drawView(G.players[0], 0, 0, VIEW_W, VIEW_H);
          G.ctx!.fillStyle = "#1A0C05";
          G.ctx!.fillRect(VIEW_W, 0, 2, VIEW_H);
          drawView(G.players[1], VIEW_W + 2, 0, VIEW_W, VIEW_H);
        } else {
          let hH = Math.floor(VIEW_H / 2);
          drawView(G.players[0], 0, 0, VIEW_W, hH);
          drawView(G.players[1], VIEW_W + 2, 0, VIEW_W, hH);
          drawView(G.players[2], 0, hH + 2, VIEW_W, hH);
          drawView(G.players[3], VIEW_W + 2, hH + 2, VIEW_W, hH);
          G.ctx!.fillStyle = "#1A0C05";
          G.ctx!.fillRect(VIEW_W, 0, 2, VIEW_H);
          G.ctx!.fillRect(0, hH, CANVAS_W, 2);
        }
        drawHUD();

        if (G.gameState === STATE_COUNTDOWN) {
          G.ctx!.fillStyle = "rgba(0,0,0,0.55)";
          G.ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H);
          
          G.ctx!.textAlign = "center";
          G.ctx!.fillStyle = "#FFE211";
          G.ctx!.font = "72px 'VT323',monospace";
          
          let label = G.mpCountdownVal > 0 ? G.mpCountdownVal.toString() : "GO!";
          G.ctx!.fillText(label, CANVAS_W / 2, CANVAS_H / 2 - 10);
          
          G.ctx!.font = "18px 'VT323',monospace";
          G.ctx!.fillStyle = "#FFF";
          G.ctx!.fillText(G.currentLang === 1 ? "VALMISTUDU!" : "GET READY!", CANVAS_W / 2, CANVAS_H / 2 + 25);
          G.ctx!.textAlign = "left";
        }
      }

      if (G.gameState === STATE_ROUND_OVER || G.gameState === STATE_GAMEOVER) {
        drawMenuOverlay();
      }
    } else if (G.gameState === STATE_LEVEL_EDITOR) {
      drawEditor(G.ctx!);
    } else {
      drawMenuOverlay();
    }
  }
}

// Start
requestAnimationFrame(loop);
