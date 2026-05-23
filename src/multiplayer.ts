import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  Unsubscribe,
  arrayUnion,
  query,
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { G, STATE_MULTIPLAYER, STATE_LOBBY, i18n } from "./globals";
import { playSound } from "./audio";

let lobbyUnsubscribe: Unsubscribe | null = null;

// Periodically updates the listing of public lobbies
export async function fetchLobbiesList() {
  if (G.mpLobbiesLoading) return;
  G.mpLobbiesLoading = true;
  try {
    const q = query(collection(db, "lobbies"));
    const querySnapshot = await getDocs(q);
    const lobbies: any[] = [];
    const now = Date.now();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const updatedAtStr = data.updatedAt || data.createdAt || new Date().toISOString();
      const updatedTime = Date.parse(updatedAtStr);
      // Skip stale lobbies (updated more than 40 seconds ago) to keep the list completely clean
      if (now - updatedTime < 40000) {
        lobbies.push({
          id: docSnap.id,
          ...data,
        });
      }
    });
    G.mpLobbies = lobbies;
    G.mpLastRefreshTime = Date.now();
  } catch (error) {
    console.error("Error fetching lobbies", error);
  } finally {
    G.mpLobbiesLoading = false;
  }
}

// Host sends keep-alive heartbeat every ~8 seconds to mark lobby as active
export async function sendHostHeartbeat() {
  if (G.gameState === STATE_LOBBY && G.mpIsHost && G.mpCurrentLobbyId) {
    try {
      const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
      await updateDoc(ref, {
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Heartbeat update failed", e);
    }
  }
}

// Host creates a new lobby in Firestore
export async function createOnlineLobby(username: string) {
  G.mpUsername = username;
  G.mpIsHost = true;
  G.mpConfirmLeaveModal = false;
  G.mpCurrentLobbyId = "lobby_" + Math.random().toString(36).substring(2, 9);
  
  // Pre-generate map RLE
  const { generateTemplateMap, compressMap } = await import("./map");
  generateTemplateMap("HILLY_TEMPLATE");
  G.mpSelectedMapSource = "HILLY_TEMPLATE";
  G.mpUploadedMapName = "";
  G.mpUploadedMapRLE = compressMap(G.terrainMap);
  G.mpUploadedMapSpawns = [];
  
  const lobbyData = {
    hostId: G.mpMyPlayerId,
    hostName: username,
    hostReady: false,
    guestId: null as string | null,
    guestName: null as string | null,
    guestReady: false,
    status: "waiting", // "waiting", "playing", "closed"
    gameMode: G.gameMode,
    mapSource: G.mpSelectedMapSource,
    uploadedMapName: G.mpUploadedMapName,
    mapRLE: G.mpUploadedMapRLE,
    spawns: G.mpUploadedMapSpawns,
    hostLoaded: false,
    guestLoaded: false,
    settings: {
      settingGore: G.settingGore,
      settingBones: G.settingBones,
      settingShadows: G.settingShadows,
      settingDarkness: G.settingDarkness,
      settingKillsToWin: G.settingKillsToWin,
      settingLives: G.settingLives,
      settingSfxVol: G.settingSfxVol,
      settingMusicVol: G.settingMusicVol,
      settingVibration: G.settingVibration,
      winMode: G.winMode,
      timeModeMinutes: G.timeModeMinutes,
      isArenaMode: G.isArenaMode,
    },
    chat: [
      {
        senderName: "System",
        text: G.currentLang === 1 ? `Materiaali luotu! Tervetuloa!` : `Lobby created! Welcome!`,
        time: Date.now(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    await setDoc(ref, lobbyData);
    subscribeToCurrentLobby(G.mpCurrentLobbyId);
    G.gameState = STATE_LOBBY;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, "lobbies/" + G.mpCurrentLobbyId);
  }
}

// Guest joins an existing lobby
export async function joinOnlineLobby(lobbyId: string, username: string) {
  G.mpUsername = username;
  G.mpIsHost = false;
  G.mpConfirmLeaveModal = false;
  G.mpCurrentLobbyId = lobbyId;

  try {
    const ref = doc(db, "lobbies", lobbyId);
    const joinMsg = {
      senderName: "System",
      text: G.currentLang === 1 ? `${username} liittyi peliin!` : `${username} joined the lobby!`,
      time: Date.now(),
    };
    await updateDoc(ref, {
      guestId: G.mpMyPlayerId,
      guestName: username,
      guestReady: false,
      chat: arrayUnion(joinMsg),
      updatedAt: new Date().toISOString(),
    });
    subscribeToCurrentLobby(lobbyId);
    G.gameState = STATE_LOBBY;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, "lobbies/" + lobbyId);
  }
}

// Subscribe to direct updates within the active lobby
function subscribeToCurrentLobby(lobbyId: string) {
  if (lobbyUnsubscribe) {
    lobbyUnsubscribe();
    lobbyUnsubscribe = null;
  }

  const ref = doc(db, "lobbies", lobbyId);
  lobbyUnsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      // Lobby got deleted by host
      if (!G.mpIsHost && G.mpCurrentLobbyId) {
        G.mpAlertMsg = G.currentLang === 1 ? "Isäntä poistui pelistä." : "The host has left the game.";
        leaveCurrentLobby(false);
      }
      return;
    }

    const data = snap.data();
    G.mpCurrentLobby = data;
    G.mpMessages = data.chat || [];

    // Sync host settings to local attributes for the guest
    if (!G.mpIsHost && data.settings) {
      G.gameMode = data.gameMode || G.gameMode;
      G.settingGore = data.settings.settingGore ?? G.settingGore;
      G.settingBones = data.settings.settingBones ?? G.settingBones;
      G.settingShadows = data.settings.settingShadows ?? G.settingShadows;
      G.settingDarkness = data.settings.settingDarkness ?? G.settingDarkness;
      G.settingKillsToWin = data.settings.settingKillsToWin ?? G.settingKillsToWin;
      G.settingLives = data.settings.settingLives ?? G.settingLives;
      G.winMode = data.settings.winMode ?? G.winMode;
      G.timeModeMinutes = data.settings.timeModeMinutes ?? G.timeModeMinutes;
      G.isArenaMode = data.settings.isArenaMode ?? G.isArenaMode;
      
      G.mpSelectedMapSource = data.mapSource || "HILLY_TEMPLATE";
      G.mpUploadedMapName = data.uploadedMapName || "";
      G.mpUploadedMapRLE = data.mapRLE || "";
      G.mpUploadedMapSpawns = data.spawns || [];
    }

    // Sync player ready status locally
    if (G.mpIsHost) {
      G.mpSelfReady = !!data.hostReady;
    } else {
      G.mpSelfReady = !!data.guestReady;
    }

    // Handle game starts triggered by host (loading phase)
    if (data.status === "loading" && G.gameState !== 4 && !G.mpIsLoadingMatch) { // 4 is STATE_LOADING
      G.mpIsLoadingMatch = true;
      import("./main").then((m) => {
        (window as any).startMultiplayerGameLoading?.(data);
      });
    }

    // Transition both players to countdown only when both are loaded!
    if (data.status === "loading" && data.hostLoaded && data.guestLoaded) {
      if (G.gameState !== 18) { // 18 is STATE_COUNTDOWN
        G.gameState = 18;
        G.mpCountdownTimer = 180;
        G.mpCountdownVal = 3;
        G.mpIsLoadingMatch = false;
        import("./audio").then((a) => {
          a.stopMenuMusic();
        });
      }
    }

    // Handle Host returning players to lobby from a live game
    if (G.gameState === 5) { // 5 is STATE_PLAYING
      if (data.status === "waiting") {
        G.gameState = STATE_LOBBY;
        (G as any).mpIsGameActive = false;
        G.mpSelfReady = false;
        if (!G.mpIsHost) {
          G.mpAlertMsg = "Host ended the game for some reason";
        }
      } else if (!data.hostId) {
        G.mpAlertMsg = G.currentLang === 1 ? "Isäntä poistui pelistä." : "The host has left the game.";
        leaveCurrentLobby(false);
      }
    }

    // Direct gameplay coordinates coordination
    if ((G as any).mpIsGameActive) {
      const oppIndex = G.mpIsHost ? 1 : 0;
      const oppState = G.mpIsHost ? data.p2 : data.p1;
      const oppPlayer = G.players[oppIndex];
      
      if (oppPlayer && oppState) {
        // Smooth positioning interpolation to glide nicely
        oppPlayer.x = oppPlayer.x * 0.35 + oppState.x * 0.65;
        oppPlayer.y = oppPlayer.y * 0.35 + oppState.y * 0.65;
        oppPlayer.vx = oppState.vx;
        oppPlayer.vy = oppState.vy;
        oppPlayer.hp = oppState.hp;
        oppPlayer.lives = oppState.lives;
        oppPlayer.score = oppState.score;
        oppPlayer.aimAngle = oppState.aimAngle;
        oppPlayer.activeWeapon = oppState.activeWeapon;
        oppPlayer.deathPhase = oppState.deathPhase;
        
        // Match live weapon firing status
        if (oppState.shooting) {
          oppPlayer.shooting = true;
          if (oppPlayer.cooldown <= 0 && oppPlayer.reloadTimers[oppPlayer.activeWeapon] === 0 && oppPlayer.deathPhase === "alive") {
            oppPlayer.fireWeapon();
          }
        } else {
          oppPlayer.shooting = false;
        }
      }
    }

    // Non-host player left: host gets notified and guest resets
    if (G.mpIsHost && !data.guestId && G.mpMessages.length > 1) {
      const lastMsg = G.mpMessages[G.mpMessages.length - 1];
      if (lastMsg && lastMsg.senderName === "System" && lastMsg.text.includes("left")) {
        G.mpAlertMsg = G.currentLang === 1 ? "Toinen pelaaja poistui." : "Other player has left the game.";
      }
    }
  });
}

// Host updates lobby configuration or settings
export async function sendSettingsUpdate() {
  if (!G.mpCurrentLobbyId || !G.mpIsHost) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    await updateDoc(ref, {
      gameMode: G.gameMode,
      mapSource: G.mpSelectedMapSource,
      uploadedMapName: G.mpUploadedMapName,
      mapRLE: G.mpUploadedMapRLE,
      spawns: G.mpUploadedMapSpawns,
      settings: {
        settingGore: G.settingGore,
        settingBones: G.settingBones,
        settingShadows: G.settingShadows,
        settingDarkness: G.settingDarkness,
        settingKillsToWin: G.settingKillsToWin,
        settingLives: G.settingLives,
        settingSfxVol: G.settingSfxVol,
        settingMusicVol: G.settingMusicVol,
        settingVibration: G.settingVibration,
        winMode: G.winMode,
        timeModeMinutes: G.timeModeMinutes,
        isArenaMode: G.isArenaMode,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error setting configs", err);
  }
}

// Append chat logs to the collection
export async function sendLobbyChatMessage(text: string) {
  if (!G.mpCurrentLobbyId || !text.trim()) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    const newMsg = {
      senderName: G.mpUsername,
      text: text.trim().substring(0, 100),
      time: Date.now(),
    };
    
    // Local copy of chat array union optimization
    const updatedChat = [...(G.mpCurrentLobby?.chat || []), newMsg];
    await updateDoc(ref, {
      chat: updatedChat,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Chat push failed", err);
  }
}

// Host marks game status as active
export async function triggerMultiplayerPlay() {
  if (!G.mpCurrentLobbyId || !G.mpIsHost) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    await updateDoc(ref, {
      status: "playing",
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to start multiplayer game status", err);
  }
}

// Closes connection and cleans up lobby documents depending on role
export async function leaveCurrentLobby(performWriteToDB = true) {
  if (lobbyUnsubscribe) {
    lobbyUnsubscribe();
    lobbyUnsubscribe = null;
  }

  const lobbyId = G.mpCurrentLobbyId;
  const isHost = G.mpIsHost;
  
  // Clear states
  G.mpCurrentLobbyId = null;
  G.mpCurrentLobby = null;
  G.mpMessages = [];
  G.mpChatInput = "";
  G.mpSelfReady = false;

  if (performWriteToDB && lobbyId) {
    try {
      const ref = doc(db, "lobbies", lobbyId);
      if (isHost) {
        // If host leaves, delete the document entirely
        await deleteDoc(ref);
      } else {
        // Guest leaves, remove guest fields and append message
        const exitMsg = {
          senderName: "System",
          text: G.currentLang === 1 ? `${G.mpUsername} poistui pelistä!` : `${G.mpUsername} left the lobby!`,
          time: Date.now(),
        };
        const currentChat = G.mpCurrentLobby?.chat || [];
        await updateDoc(ref, {
          guestId: null,
          guestName: null,
          chat: [...currentChat, exitMsg],
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("Lobby cleanup error", err);
    }
  }

  G.gameState = STATE_MULTIPLAYER;
}

// Toggle player ready status in Firestore
export async function toggleLobbyReady() {
  if (!G.mpCurrentLobbyId) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    G.mpSelfReady = !G.mpSelfReady;
    if (G.mpIsHost) {
      await updateDoc(ref, {
        hostReady: G.mpSelfReady,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        guestReady: G.mpSelfReady,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Error toggling ready status", err);
  }
}

// Host terminates match and redirects players to lobby
export async function hostQuitMatchToLobby() {
  if (!G.mpCurrentLobbyId || !G.mpIsHost) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    await updateDoc(ref, {
      status: "waiting",
      hostReady: false,
      guestReady: false,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to quit match to lobby", err);
  }
}

// Synchronize high-performance real-time player states in gameplay
export async function sendMultiplayerGameState() {
  if (!G.mpCurrentLobbyId) return;
  try {
    const ref = doc(db, "lobbies", G.mpCurrentLobbyId);
    
    // Locate the local player entity
    const myPlayer = G.mpIsHost ? G.players[0] : G.players[1];
    if (!myPlayer) return;

    const myState = {
      x: Math.round(myPlayer.x),
      y: Math.round(myPlayer.y),
      vx: myPlayer.vx,
      vy: myPlayer.vy,
      hp: myPlayer.hp,
      lives: myPlayer.lives,
      score: myPlayer.score,
      aimAngle: myPlayer.aimAngle,
      activeWeapon: myPlayer.activeWeapon,
      deathPhase: myPlayer.deathPhase,
      shooting: myPlayer.shooting,
    };

    if (G.mpIsHost) {
      await updateDoc(ref, {
        p1: myState,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(ref, {
        p2: myState,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("Failed syncing in-game state", err);
  }
}
