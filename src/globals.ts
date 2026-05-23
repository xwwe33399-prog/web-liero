export const MAP_W = 1200;
export const MAP_H = 600;
export const VIEW_W = 336;
export const VIEW_H = 320;
export const HUD_H = 64;
export const CANVAS_W = VIEW_W * 2 + 2;
export const CANVAS_H = VIEW_H + HUD_H;
export const SCALE = 2;
export const GRAVITY = 0.15;
export const FRICTION = 0.85;

export const TERRAIN_EMPTY = 0;
export const TERRAIN_DIRT = 1;
export const TERRAIN_ROCK = 6;
export const TERRAIN_SCORCHED = 7;
// 8 was WOOD, removed as per instructions
export const TERRAIN_STICKY = 9;
export const TERRAIN_BARREL = 10;
export const TERRAIN_INDESTRUCTIBLE = 11; // Arena 1v1

export const W_HANDGUN = 0;
export const W_MINIGUN = 1;
export const W_GRENADE = 2;
export const W_SHOVEL = 3;
export const W_BAZOOKA = 4;
export const W_DIRTBALL = 5;
export const W_SNIPER = 6;
export const W_CLUSTER = 7;
export const W_SHOTGUN = 8;
export const W_FLAMETHROWER = 9;
export const W_MINE = 10;
export const W_ROPE = 11;
export const W_LASER = 12;
export const W_DYNAMITE = 13;
export const W_HOMING = 14;
export const W_SHIELD = 15;
export const W_GRAVITY_IMPLODER = 16;
export const W_GAUSS = 17;
export const W_CHIQUITA = 18;
export const W_SUPER_SHOTGUN = 19;
export const W_BOOMERANG = 20;
export const W_BLASTER = 21;
export const W_UZI = 22;
export const W_BOOBY_TRAP = 23;
export const W_BIG_NUKE = 24;
export const W_OIKOTIE = 25;
export const W_JETPACK = 26;
export const W_AIRSTRIKE = 27;
export const W_TELEPORT = 28;

export const TOTAL_WEAPONS = 29;

export const WEAPON_NAMES = [
  ["PISTOL", "PISTOOLI"],
  ["MINIGUN", "MINIGUN"],
  ["GRENADE", "KRANAATTI"],
  ["SHOVEL", "LAPIO"],
  ["BAZOOKA", "SINKO"],
  ["DIRTBALL", "MUTAPALLO"],
  ["SNIPER", "TARKKA-AMPUJA"],
  ["CLUSTER", "RYPÄLEPOMMI"],
  ["SHOTGUN", "HAULIKKO"],
  ["FLAMETHROWER", "LIEKINHEITIN"],
  ["MINE", "MIINA"],
  ["NINJA ROPE", "NINJAKÖYSI"],
  ["LASER RIFLE", "LASERKIVÄÄRI"],
  ["DYNAMITE", "DYNAMIITTI"],
  ["HOMING MISSILE", "OHJUS"],
  ["SHIELD", "KILPI"],
  ["GRAVITY IMPLODER", "GRAVITAATIO-IMPLOOJA"],
  ["GAUSS GUN", "GAUSS-KIVÄÄRI"],
  ["CHIQUITA BOMB", "CHIQUITA-POMMI"],
  ["SUPER SHOTGUN", "SUPERHAULIKKO"],
  ["BOOMERANG", "BUMERANGI"],
  ["BLASTER", "BLASTER"],
  ["UZI", "UZI"],
  ["BOOBY TRAP", "ANSA"],
  ["BIG NUKE", "ISO YDINPOMMI"],
  ["OIKOTIEMIES", "OIKOTIEMIES"],
  ["JETPACK", "RAKETTIPAKKAUS"],
  ["AIRSTRIKE", "ILMAISKU"],
  ["TELEPORT", "TELEPORTTI"],
];

export const WEAPON_DESC = [
  ["12 shots, medium dmg", "12 laukausta, keski vahinko"],
  ["100 shots, rapid fire", "100 laukausta, nopea tuli"],
  ["3 grenades, 90 tick", "3 kran., 90 tik. viive"],
  ["1 use, melee+dig", "1 käyttö, lähitaistelu+kaivuu"],
  ["1 rocket, massive", "1 raketti, massiivinen"],
  ["5 shots, build dirt", "5 laukausta, rakentaa maata"],
  ["5 shots, deadly range", "5 laukausta, tappava kantama"],
  ["1 bomb -> 3 subs", "1 pommi -> 3 alipommia"],
  ["8 pellets, deadly close", "8 haulia, tappava läheltä"],
  ["Continuous fire, burns terrain", "Jatkuva tuli, polttaa maastoa"],
  ["3 mines, stealth trigger", "3 miinaa, äänetön laukaisu"],
  ["Grapple terrain", "Tarttuu maastoon"],
  ["Bouncing light beam", "Kimpoava valosäde"],
  ["Sticky dynamite, big jagged blast", "Tarttuva dynamiitti, iso räjähdys"],
  ["Steers towards enemy", "Hakeutuu kohti vihollista"],
  ["5s shield, auto-charges 25s", "5s suoja, latautuu 25s"],
  ["Pulls enemies, huge blast", "Vetää vihollisia, iso räjähdys"],
  ["Instant beam, pierces dirt", "Välitön säde, lävistää maata"],
  ["Bounces, ejects smaller bombs", "Kimpoaa, sylkee pikkupommeja"],
  ["14 pellets, knocks you back", "14 haulia, heittää taaksepäin"],
  ["Piercing return arc", "Lävistävä paluukaari"],
  ["3 shots, plasma", "3 laukausta, plasma"],
  ["20 shots, rapid", "20 laukausta, nopea"],
  ["1 trap, proximity", "1 ansa, lähestyminen"],
  ["1 big nuke, massive", "1 iso ydinpommi, massiivinen"],
  ["Slow walker, massive boom", "Hidas uha, iso pamahdus"],
  ["Fly up", "Lennä ylös"],
  ["Rains destruction", "Sataa tuhoa"],
  ["Instant travel", "Välitön matka"],
];

export const MAX_AMMO = [
  15,
  120,
  4,
  9999,
  1, // Pistol, Minigun, Grenade, Shovel, Bazooka
  8,
  4,
  1,
  8,
  200, // Dirtball, Sniper, Cluster, Shotgun, Flame
  3,
  9999,
  6,
  2,
  2, // Mine, Rope, Laser, Dynamite, Homing
  9999,
  1,
  3,
  2,
  2, // Shield, Gravity, Gauss, Chiquita, Super Shotgun
  1, // Boomerang
  3,
  20,
  1,
  1, // Blaster, Uzi, Booby Trap, Big Nuke
  1, // Oikotie
  200, // Jetpack
  1, // Airstrike
  3, // Teleport
];

export const RELOAD_TIMES = [
  60,
  120,
  110,
  0,
  180, // Pistol, Minigun, Grenade, Shovel, Bazooka
  100,
  150,
  190,
  120,
  140, // Dirtball, Sniper, Cluster, Shotgun, Flame
  130,
  0,
  140,
  160,
  200, // Mine, Rope, Laser, Dynamite, Homing
  0,
  1200,
  220,
  210,
  240, // Shield, Gravity, Gauss, Chiquita, Super Shotgun
  80, // Boomerang
  320,
  150,
  400,
  800, // Blaster, Uzi, Booby Trap, Big Nuke
  2700, // Oikotie
  0, // Jetpack
  300, // Airstrike
  150, // Teleport
];

export const GUN_GAME_ORDER = [
  W_HANDGUN,
  W_MINIGUN,
  W_UZI,
  W_SHOTGUN,
  W_DIRTBALL,
  W_GAUSS,
  W_SNIPER,
  W_BOOMERANG,
  W_FLAMETHROWER,
  W_BLASTER,
  W_GRENADE,
  W_CHIQUITA,
  W_CLUSTER,
  W_SUPER_SHOTGUN,
  W_LASER,
  W_BOOBY_TRAP,
  W_DYNAMITE,
  W_GRAVITY_IMPLODER,
  W_BAZOOKA,
  W_BIG_NUKE,
  W_HOMING,
];

export const STATE_MENU = 0,
  STATE_OPTIONS = 1,
  STATE_CUSTOMIZE = 2,
  STATE_FADING = 3,
  STATE_LOADING = 4,
  STATE_PLAYING = 5,
  STATE_PAUSED = 6,
  STATE_ROUND_OVER = 7,
  STATE_GAMEOVER = 8,
  STATE_JOINING = 9,
  STATE_PAUSE_GFX = 10,
  STATE_WEAPON_LIST = 11,
  STATE_WEAPON_SELECT = 12,
  STATE_VICTORY = 13,
  STATE_LEVEL_PROMPT = 14,
  STATE_LEVEL_EDITOR = 15,
  STATE_MODE_SELECT = 16,
  STATE_WIN_CONFIG = 17,
  STATE_COUNTDOWN = 18,
  STATE_HOW_TO_PLAY = 19,
  STATE_CREDITS = 20,
  STATE_EXITED = 21,
  STATE_MULTIPLAYER = 22,
  STATE_LOBBY = 23,
  STATE_USERNAME_INPUT = 24;

// Shared Game State Object
export const G = {
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  mapCanvas: null as HTMLCanvasElement | null,
  mapCtx: null as CanvasRenderingContext2D | null,
  menuMapCanvas: null as HTMLCanvasElement | null,
  bloodCanvas: null as HTMLCanvasElement | null,
  bloodCtx: null as CanvasRenderingContext2D | null,
  lightCanvas: null as HTMLCanvasElement | null,
  lightCtx: null as CanvasRenderingContext2D | null,
  bgNoiseCanvas: null as HTMLCanvasElement | null,

  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  rightMouseDown: false,
  mouseWheelDelta: 0,
  usingMouse: false,

  gameState: STATE_MENU,
  currentLang: 0, // 0 EN, 1 FI

  // Multiplayer variables
  mpUsername: "Player",
  mpLobbies: [] as any[],
  mpLobbiesLoading: false,
  mpCurrentLobbyId: null as string | null,
  mpCurrentLobby: null as any,
  mpMessages: [] as { senderName: string; text: string; time: number }[],
  mpMyPlayerId: "p_" + Math.random().toString(36).substring(2, 9),
  mpLastRefreshTime: 0,
  mpCursorX: 337,
  mpCursorY: 192,
  mpChatInput: "",
  mpUIMenuSel: 0, 
  mpIsHost: false,
  mpJoinLobbyNotImplementedMsg: false,
  mpLobbySettingsSel: 0,
  mpConfirmLeaveModal: false,
  mpSelfReady: false,
  mpAlertMsg: null as string | null, // General modals e.g. "The host has left"
  mpSelectedMapSource: "HILLY_TEMPLATE",
  mpUploadedMapName: "",
  mpUploadedMapRLE: "",
  mpUploadedMapSpawns: [] as { x: number; y: number }[],
  mpCountdownVal: -1,
  mpCountdownTimer: 0,
  mpIsLoadingMatch: false,

  // Settings
  settingGore: 1, // 0 = Off, 1 = Normal, 2 = Extreme
  settingBones: true,
  settingShadows: true,
  settingDarkness: false, // Fog of war
  settingKillsToWin: 5,
  settingLives: 3,
  settingSfxVol: 10,
  settingMusicVol: 2,
  settingVictoryVol: 8,
  settingVibration: 1, // 0: Off, 1: Normal, 2: High

  gameMode: "NORMAL",
  winMode: "KILLS",
  timeModeMinutes: 3,
  gameTimer: 0,
  gameTimerActive: false,
  roundOverTimer: 0,
  oikotieMessageTimer: 0,
  uiModeSel: 0,
  uiWinConfigSel: 0,

  is4PlayerMode: false,
  isArenaMode: false,

  players: [] as any[],
  bullets: [] as any[],
  grenades: [] as any[],
  particles: [] as any[],
  casings: [] as any[],
  mines: [] as any[],
  flames: [] as any[],
  visualExplosions: [] as any[],
  healthPacks: [] as any[],
  stickyBombs: [] as any[],
  groundFires: [] as any[],
  notifications: [] as any[],
  killFeed: [] as any[], // {text: string, life: number}

  terrainMap: new Uint8Array(MAP_W * MAP_H),
  terrainNoise: new Int8Array(MAP_W * MAP_H),

  keys: {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Enter: false,
    Escape: false,
    KeyL: false,
    KeyQ: false,
    KeyE: false,
  } as Record<string, boolean>,

  lastInputTime: 0,
  matchWinnerId: 0,
  screenShake: 0,
  screenFlash: 0,
  menuAnimTime: 0,

  joinedPlayers: new Set<any>(),
  activeGamepadIndices: [] as any[],

  wsLoadouts: Array(4)
    .fill(null)
    .map(() => [0, 8, 9, 12, 14]),
  customizeSkins: [1, 0, 1, 1],

  customSpawns: [] as { x: number; y: number }[],
};

const LANG_EN = 0,
  LANG_FI = 1;
export const i18n = {
  START_GAME: ["START 2-PLAYER", "ALOITA 2-PELAAJAA"],
  EXIT: ["EXIT", "POISTU PELISTÄ"],
  ONLINE_MULTIPLAYER: ["ONLINE MULTIPLAYER", "NETTIPELI"],
  START_4P: ["START 4-PLAYER", "ALOITA 4 PELAAJAA\n(KOKEELLINEN)"],
  START_ARENA: ["ARENA 1v1", "ARENA 1v1"],
  CUSTOMIZE: ["CUSTOMIZE", "MUKAUTA"],
  WEAPON_LIST: ["WEAPON LIST", "ASELISTA"],
  OPTIONS: ["OPTIONS", "ASETUKSET"],
  LEVEL_EDITOR: ["LEVEL EDITOR (BETA)", "KENTTÄEDITOR (BETA)"],
  BACK: ["BACK", "TAKAISIN"],
  LANGUAGE: ["LANGUAGE: ENGLISH", "KIELI: SUOMI"],
  GORE: ["GORE: ", "VERISYYS: "],
  BONES: ["BONES: ", "LUUT: "],
  SHADOWS: ["SHADOWS: ", "VARJOT: "],
  DARKNESS: ["DARKNESS: ", "PIMEYS: "],
  SFX_VOL: ["SFX VOLUME: ", "ÄÄNITEHOSTEET: "],
  MUSIC_VOL: ["MUSIC VOLUME: ", "MUSIIKKIVOLYYMI: "],
  RESUME_GAME: ["RESUME GAME", "JATKA PELIÄ"],
  PAUSE_GFX: ["GRAPHICS OPTIONS", "GRAFIIKKA-ASETUKSET"],
  QUIT_TO_OS: ["QUIT TO MENU", "LOPETA PELI"],
  QUIT_TO_LOBBY: ["QUIT TO LOBBY", "PALAA LOBBYYN"],
  PLAY_AGAIN: ["PLAY AGAIN", "PELAA UUDELLEEN"],
  MAIN_MENU: ["MAIN MENU", "PÄÄVALIKKO"],
  GAME_PAUSED: ["GAME PAUSED", "PELI KESKEYTETTY"],
  WEBLIERO: ["PunkkiGAME", "PunkkiPELI"],
  GENERATING: ["GENERATING MAP...", "LUODAAN MAASTOA..."],
  PRESS_JOIN: [
    "PRESS X TO JOIN! (O CANCEL)",
    "PAINA X LIITTYÄKSESI! (O PERUU)",
  ],
  SCORE: ["Kills: ", "Tapot: "],
  LIVES: ["Lives: ", "Elämiä: "],
  WEP: ["Wep: ", "Ase: "],
  RELOADING: ["RELOADING...", "LADATAAN..."],
  HOW_TO_PLAY: ["HOW TO PLAY", "OHJEET"],
  CREDITS: ["CREDITS", "TEKIJÄT"],
  WINS_MATCH: [" WON THE GAME!", " VOITTI PELIN!"],
  SKIN_BALL: ["WORMY", "MATO"],
  SKIN_OIKOTIEMIES: ["OIKOTIEMIES", "OIKOTIEMIES"],
  PRESS_BACK: ["PRESS CIRCLE TO RETURN", "PAINA YMPYRÄÄ PALATAKSESI"],
  SPAWN_PROMPT: ["PRESS R2 TO SPAWN", "PAINA R2 SPAWNAAKSESI"],
  AUTO_SPAWN: ["Auto-spawn: ", "Auto-spawn: "],
  SPECTATING: ["SPECTATING: ", "KATSOT: "],
  ELIM: ["ELIMINATED", "ELIMINOITU"],
  RAPID_FIRE: ["RAPID FIRE!", "NOPEA TULI!"],
  GOD_MODE_ON: ["GOD MODE ON", "JUMALA-MOODI PÄÄLLÄ"],
  GOD_MODE_OFF: ["GOD MODE OFF", "JUMALA-MOODI POIS"],
  MORE_COMING: ["MORE WEAPONS COMING SOON", "LISÄÄ ASEITA TULOSSA"],
  COPYRIGHT: ["© Eeli Noronen 2026", "© Eeli Noronen 2026"],
  CONFIRM_EXIT: [
    "Press X: Menu | Circle: Cancel",
    "Paina X: Päävalikko | O: Peruuta",
  ],
  LEVEL_PROMPT_TITLE: ["LEVEL GENERATION", "KENTÄN LUONTI"],
  LEVEL_PROMPT_GEN: ["PRESS X: GENERATE RANDOM", "PAINA X: SATUNNAINEN MAASTO"],
  LEVEL_PROMPT_LOAD: ["PRESS SQUARE: LOAD FILE", "PAINA NELIÖ: LATAA TIEDOSTO"],
  EDITOR_SAVE: ["L1 / CLICK TO SAVE", "L1 / KLIKKAA TALLENTAAKSESI"],
  EDITOR_LOAD: ["LOAD FILE", "LATAA TIEDOSTO"],
  EDITOR_CLEAR: ["CLEAR ALL", "TYHJENNÄ KAIKKI"],
  EDITOR_FILL: ["FILL MAP WITH SOIL", "TÄYTÄ MULLALLA"],
  EDITOR_BLOCK: ["BLOCK (R-CLICK): ", "PALIKKA (OIK. KLIK): "],
  EDITOR_DRAW: ["DRAW: R2 / L-CLICK", "PIIRRÄ: R2 / VAS. KLIK"],
  EDITOR_EXIT: ["EXIT: CIRCLE / ESC", "POISTU: YMPYRÄ / ESC"],
  SHIELD_ACTIVE: ["SHIELD", "KILPI"],
  TIME_LEFT: ["TIME: ", "AIKA: "],
  MODE_NORMAL: ["NORMAL", "NORMAALI"],
  MODE_GUNGAME: ["GUN GAME", "GUN GAME"],
  MODE_LIVES: ["LIVES", "ELÄMIÄ"],
  MODE_TIME: ["TIME MODE", "AIKARAJOITUS"],
  MODE_KILLS: ["KILLS TO WIN", "TAPPOJA VOITTOON"],
  GUN_GAME_KILL: ["GUN GAME: Next weapon!", "GUN GAME: Seuraava ase!"],
  GUN_GAME_RESET: [
    "GUN GAME: Back to pistol!",
    "GUN GAME: Takaisin pistooliin!",
  ],
  ERASE: ["ERASE", "PYYHI"],
  DIRT: ["DIRT", "MULTA"],
  ROCK: ["ROCK", "KIVI"],
  METAL: ["METAL", "METALLI"],
  "RANDOM ROCK": ["RANDOM ROCK", "SATUNN. KIVI"],
  "SPAWN P.": ["SPAWN P.", "SPAWN P."],
  "UNSAVED CHANGES": ["UNSAVED CHANGES", "TALLENTAMATTA"],
  UNSAVED_TITLE: [
    "UNSAVED CHANGES! EXIT WITHOUT SAVING?",
    "TALLENTAMATTOMIA MUUTOKSIA! POISTU TALLENTAMATTA?",
  ],
};

export function t(key: string): string {
  return (i18n as any)[key] ? (i18n as any)[key][G.currentLang] : key;
}

export function addNotification(text: string) {
  G.notifications.push({ text, timer: 140 });
  if (G.notifications.length > 6) G.notifications.shift();
}

export function addKillFeed(text: string) {
  G.killFeed.push({ text, life: 240 });
  if (G.killFeed.length > 5) G.killFeed.shift();
}

export function triggerVibration(
  playerIndex: number,
  power: "light" | "heavy" | "damage",
  durationMs = 100,
) {
  if (G.settingVibration === 0) return;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  const gpRaw = G.activeGamepadIndices[playerIndex];
  if (typeof gpRaw !== "number") return; // Keyboard
  const gp = gps[gpRaw];
  if (!gp) return;

  // Check if standard vibrationActuator is supported
  const actuator = (gp as any).vibrationActuator;
  if (actuator && actuator.type === "dual-rumble") {
    const mult = G.settingVibration === 2 ? 1.0 : 0.6; // HIGH vs NORMAL
    let s = 0.0,
      w = 0.0;

    if (power === "light") {
      s = 0.2 * mult;
      w = 0.7 * mult;
    } else if (power === "heavy") {
      s = 0.8 * mult;
      w = 0.3 * mult;
    } else if (power === "damage") {
      s = 1.0 * mult;
      w = 1.0 * mult;
    }

    actuator
      .playEffect("dual-rumble", {
        startDelay: 0,
        duration: durationMs,
        weakMagnitude: w,
        strongMagnitude: s,
      })
      .catch(() => {});
  }
}
