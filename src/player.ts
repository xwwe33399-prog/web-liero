import {
  G,
  MAP_W,
  MAP_H,
  GRAVITY,
  FRICTION,
  W_HANDGUN,
  W_MINIGUN,
  W_SHIELD,
  W_DYNAMITE,
  W_GRENADE,
  W_CLUSTER,
  W_SHOVEL,
  W_MINE,
  W_FLAMETHROWER,
  W_ROPE,
  W_BAZOOKA,
  W_DIRTBALL,
  W_SNIPER,
  W_LASER,
  W_SHOTGUN,
  W_HOMING,
  MAX_AMMO,
  RELOAD_TIMES,
  TOTAL_WEAPONS,
  GUN_GAME_ORDER,
  W_GRAVITY_IMPLODER,
  W_GAUSS,
  W_CHIQUITA,
  W_SUPER_SHOTGUN,
  W_BOOMERANG,
  W_BLASTER,
  W_UZI,
  W_BOOBY_TRAP,
  W_BIG_NUKE,
  W_OIKOTIE,
  W_JETPACK,
  W_AIRSTRIKE,
  W_TELEPORT,
  WEAPON_NAMES,
  t,
  addNotification,
  addKillFeed,
} from "./globals";
import { isSolid, jaggedCarve, fastCarve, paintBlood } from "./map";
import { playSound, playExternalSound, playWinMusic } from "./audio";
import { Bullet } from "./weapons";
import {
  Particle,
  Casing,
  FlameParticle,
  Grenade,
  ClusterBomb,
  Mine,
  GravityImploder,
  BouncingChiquita,
  BigNuke,
  BoobyTrap,
} from "./entities";

// ... sprites ...
const SPRITES = {
  WORMY_STAND: [
    "  5555  ",
    " 511115 ",
    "51144115",
    "51444415",
    "51444415",
    "51144115",
    " 511115 ",
    "  5555  ",
    "   11   ",
    "  5555  ",
  ],
  WORMY_WALK: [
    "  5555  ",
    " 511115 ",
    "51144115",
    "51444415",
    "51444415",
    "51144115",
    " 511115 ",
    "  5555  ",
    "  1  1  ",
    " 55 55  ",
  ],
  OIKOTIEMIES_STAND: [
    "  5555  ",
    " 533335 ",
    " 534535 ",
    " 533335 ",
    " 5AAA25 ",
    "5AAAAA25",
    "5AAAA525",
    " 5AAA25 ",
    "  5AA5  ",
    " 5A5A55 ",
    " 55 55  ",
  ],
  OIKOTIEMIES_WALK1: [
    "  5555  ",
    " 533335 ",
    " 534535 ",
    " 533335 ",
    " 5AAA25 ",
    "5AAAAA25",
    "5AAAA525",
    " 5AAA25 ",
    "  5AA5  ",
    " 55A555 ",
    " 5   55 ",
  ],
  OIKOTIEMIES_DANCE1: [
    " 555555 ",
    "55333355",
    "55345355",
    "  53335 ",
    "  5AAA5 ",
    "  5AAA5 ",
    "  5AAA5 ",
    "  5AAA5 ",
    "  5AA5  ",
    " 5A5A55 ",
    " 55 55  ",
  ],
  OIKOTIEMIES_DANCE2: [
    "  5555  ",
    " 533335 ",
    " 534535 ",
    " 53335  ",
    " 55A55  ",
    "  5AA5  ",
    "555AAA55",
    "  5AAA5 ",
    "  5AA5  ",
    " 5A5A55 ",
    " 55 55  ",
  ],
  OIKOTIEMIES_JUMP: [
    "  5555  ",
    " 533335 ",
    " 534535 ",
    " 533335 ",
    " 5AAA25 ",
    "5AAAAA25",
    "5AAAA525",
    " 5AAA25 ",
    " 55AA55 ",
    "55    55",
    "        ",
  ],
};

export function getSpriteColor(c: string, playerColor: string) {
  if (c === " ") return null;
  if (c === "1") return playerColor;
  if (c === "2") return "#1A5B9E";
  if (c === "3") return "#FFCDB2";
  if (c === "4") return "#FFFFFF";
  if (c === "5") return "#000000";
  if (c === "A") return "#C87820"; // clothes warm brown
  if (c === "B") return "#8B4010"; // clothes dark
  return "#FF00FF";
}

export function drawSpritePreview(
  c: CanvasRenderingContext2D,
  skinType: number,
  color: string,
  x: number,
  y: number,
  scale: number,
) {
  const rows = skinType === 0 ? SPRITES.WORMY_STAND : SPRITES.OIKOTIEMIES_STAND;
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      const char = rows[ry][rx];
      const col = getSpriteColor(char, color);
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    }
  }
}

function generatePlayerSpriteFromRows(skinRows: string[], color: string) {
  const sc = document.createElement("canvas");
  sc.width = 8;
  sc.height = 11;
  const sx = sc.getContext("2d")!;
  for (let y = 0; y < skinRows.length; y++) {
    for (let x = 0; x < skinRows[y].length; x++) {
      const c = skinRows[y][x];
      const col = getSpriteColor(c, color);
      if (!col) continue;
      sx.fillStyle = col;
      sx.fillRect(x, y, 1, 1);
    }
  }
  return sc;
}

export class Rope {
  p: Player;
  active: boolean;
  attached: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  grabbedPlayer: any;
  timer: number;
  constructor(player: Player) {
    this.p = player;
    this.active = false;
    this.attached = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.len = 0;
    this.grabbedPlayer = null;
    this.timer = 0;
  }
  fire() {
    if (this.active) return;
    playSound("rope_shoot");
    import("./globals").then((g) =>
      g.triggerVibration(this.p.id - 1, "light", 40),
    );
    this.active = true;
    this.attached = false;
    this.grabbedPlayer = null;
    this.x = this.p.x;
    this.y = this.p.y;
    this.vx = Math.cos(this.p.aimAngle) * 16;
    this.vy = Math.sin(this.p.aimAngle) * 16;
    this.timer = 60;
  }
  release() {
    this.active = false;
    this.attached = false;
    this.grabbedPlayer = null;
  }
  update() {
    if (!this.active) return;
    if (!this.attached) {
      const steps = Math.ceil(Math.hypot(this.vx, this.vy));
      const dx = this.vx / steps,
        dy = this.vy / steps;
      for (let i = 0; i < steps; i++) {
        this.x += dx;
        this.y += dy;
        if (Math.hypot(this.x - this.p.x, this.y - this.p.y) > 320) {
          this.release();
          return;
        }
        if (isSolid(this.x, this.y)) {
          this.attached = true;
          this.len = Math.hypot(this.x - this.p.x, this.y - this.p.y);
          playSound("hit");
          import("./globals").then((g) =>
            g.triggerVibration(this.p.id - 1, "light", 40),
          );
          break;
        }
        for (const op of G.players) {
          if (
            op.id !== this.p.id &&
            op.hp > 0 &&
            Math.hypot(op.x - this.x, op.y - this.y) < op.radius + 4
          ) {
            this.attached = true;
            this.grabbedPlayer = op;
            this.len = Math.hypot(this.x - this.p.x, this.y - this.p.y);
            playSound("hit");
            import("./globals").then((g) =>
              g.triggerVibration(this.p.id - 1, "light", 50),
            );
            import("./globals").then((g) =>
              g.triggerVibration(op.id - 1, "light", 50),
            );
            break;
          }
        }
      }
    } else {
      if (this.grabbedPlayer) {
        this.x = this.grabbedPlayer.x;
        this.y = this.grabbedPlayer.y;
        if (this.grabbedPlayer.hp <= 0) {
          this.release();
          return;
        }
      }

      if (this.len > 10) this.len -= 4.5;
      const dx = this.x - this.p.x,
        dy = this.y - this.p.y,
        dist = Math.max(Math.hypot(dx, dy), 0.1);

      if (dist > this.len) {
        const diff = dist - this.len,
          fx = (dx / dist) * diff * 0.22,
          fy = (dy / dist) * diff * 0.22;
        this.p.vx += fx;
        this.p.vy += fy;
        if (this.grabbedPlayer) {
          this.grabbedPlayer.vx -= fx * 0.5;
          this.grabbedPlayer.vy -= fy * 0.5;
        }
      }
    }
  }
  draw(c: CanvasRenderingContext2D) {
    if (!this.active) return;
    c.strokeStyle = "#BBB";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(this.p.x, this.p.y);
    c.lineTo(this.x, this.y);
    c.stroke();
    c.fillStyle = "#FFF";
    c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 2, 2);
  }
}

export function getBestSpawnPoint(player: Player): { x: number; y: number } {
  let bestPoint = { x: MAP_W / 2, y: MAP_H / 2 },
    bestScore = -1;
  const candidates =
    G.customSpawns && G.customSpawns.length > 0 ? G.customSpawns : [];

  if (candidates.length > 0) {
    for (let i = 0; i < candidates.length; i++) {
      const pt = candidates[i];
      const isUsed = player.usedSpawns.includes(i);
      let minPlayerDist = 9999;
      for (const p of G.players) {
        if (p.id !== player.id && p.hp > 0 && p.deathPhase === "alive") {
          const d = Math.hypot(p.x - pt.x, p.y - pt.y);
          if (d < minPlayerDist) minPlayerDist = d;
        }
      }
      // Give penalty if used
      let score = minPlayerDist;
      if (isUsed) score -= 1000;

      if (score > bestScore) {
        bestScore = score;
        bestPoint = { x: pt.x, y: pt.y };
      }
    }
    const bestIdx = candidates.findIndex(
      (c) => c.x === bestPoint.x && c.y === bestPoint.y,
    );
    if (bestIdx >= 0) player.usedSpawns.push(bestIdx);
  } else {
    for (let i = 0; i < 50; i++) {
      const tx = 60 + Math.random() * (MAP_W - 120),
        ty = 60 + Math.random() * (MAP_H - 120);
      let minPlayerDist = 9999;
      for (const p of G.players) {
        if (p.id !== player.id && p.hp > 0 && p.deathPhase === "alive") {
          const d = Math.hypot(p.x - tx, p.y - ty);
          if (d < minPlayerDist) minPlayerDist = d;
        }
      }
      if (minPlayerDist > bestScore && !isSolid(tx, ty)) {
        bestScore = minPlayerDist;
        bestPoint = { x: tx, y: ty };
      }
    }
  }
  return bestPoint;
}

export class Player {
  id: number;
  color: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  score: number;
  lives: number;
  aimAngle: number;
  skinType: number;
  spriteStand: any;
  spriteWalk1: any;
  spriteWalk2: any;
  spriteJump: any;
  spriteDance1: any;
  spriteDance2: any;
  loadout: number[];
  loadoutIndex: number;
  activeWeapon: number;
  gunGameLevel: number;
  ammo: number[];
  reloadTimers: number[];
  cooldown: number;
  switchCooldown: number;
  ropeCooldown: number;
  rope: Rope;
  walkTimer: number;
  walkFrame: number;
  isOnGround: boolean;
  jumpTimer: number;
  doubleJumped: boolean;
  jumpPressedLast: boolean;
  ropePressedLast: boolean;
  inputSeq: string[];
  godMode: boolean;
  godTimer: number;
  rapidFire: boolean;
  rapidFireTimer: number;
  onFire: number;
  fireAttacker: number;
  lastXTime: number;
  deathPhase: string;
  cinematicProgress: number;
  pendingSpawnX: number;
  pendingSpawnY: number;
  deathCamX: number;
  deathCamY: number;
  respawnTimer: number;
  spectateTarget: number;
  usedSpawns: any[];
  shieldActive: boolean;
  shieldTimer: number;
  shieldChargeTimer: number;
  shieldCharged: boolean;
  stickyTimer: number;
  fireFlashTimer: number;

  constructor(
    id: number,
    color: string,
    name: string,
    sx: number,
    sy: number,
    skinType: number,
  ) {
    this.id = id;
    this.color = color;
    this.name = name;
    this.x = sx;
    this.y = sy;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;
    this.hp = 100;
    this.score = 0;
    this.lives = G.settingLives;
    this.aimAngle = id % 2 === 1 ? 0 : Math.PI;
    this.skinType = G.is4PlayerMode ? 1 : skinType;

    if (this.skinType === 0) {
      this.spriteStand = generatePlayerSpriteFromRows(
        SPRITES.WORMY_STAND,
        this.color,
      );
      this.spriteWalk1 = generatePlayerSpriteFromRows(
        SPRITES.WORMY_WALK,
        this.color,
      );
      this.spriteWalk2 = this.spriteStand;
      this.spriteJump = this.spriteStand;
      this.spriteDance1 = this.spriteStand;
      this.spriteDance2 = this.spriteStand;
    } else {
      this.spriteStand = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_STAND,
        this.color,
      );
      this.spriteWalk1 = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_WALK1,
        this.color,
      );
      this.spriteWalk2 = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_STAND,
        this.color,
      );
      this.spriteJump = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_JUMP,
        this.color,
      );
      this.spriteDance1 = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_DANCE1,
        this.color,
      );
      this.spriteDance2 = generatePlayerSpriteFromRows(
        SPRITES.OIKOTIEMIES_DANCE2,
        this.color,
      );
    }

    if (G.gameMode === "GUNGAME") {
      this.gunGameLevel = 0;
      this.loadout = [GUN_GAME_ORDER[0], W_SHOVEL];
      this.loadoutIndex = 0;
      this.activeWeapon = this.loadout[this.loadoutIndex];
    } else {
      this.loadout = [...G.wsLoadouts[this.id - 1], W_SHOVEL];
      this.loadoutIndex = 0;
      this.activeWeapon = this.loadout[this.loadoutIndex];
      this.gunGameLevel = 0;
    }
    this.ammo = [...MAX_AMMO];
    this.reloadTimers = new Array(TOTAL_WEAPONS).fill(0);
    this.cooldown = 0;
    this.switchCooldown = 0;
    this.ropeCooldown = 0;
    this.rope = new Rope(this);
    this.walkTimer = 0;
    this.walkFrame = 0;
    this.isOnGround = false;
    this.jumpTimer = 0;
    this.doubleJumped = false;
    this.jumpPressedLast = false;
    this.ropePressedLast = false;
    this.inputSeq = [];
    this.godMode = false;
    this.godTimer = 0;
    this.rapidFire = false;
    this.rapidFireTimer = 0;
    this.onFire = 0;
    this.fireAttacker = 0;
    this.lastXTime = 0;
    this.deathPhase = "alive";
    this.cinematicProgress = 0;
    this.pendingSpawnX = 0;
    this.pendingSpawnY = 0;
    this.deathCamX = 0;
    this.deathCamY = 0;
    this.respawnTimer = 0;
    this.spectateTarget = 0;
    this.usedSpawns = [];
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldChargeTimer = 0;
    this.shieldCharged = false;
    this.stickyTimer = 0;
    this.fireFlashTimer = 0;
  }

  takeDamage(amt: number, attackerId: number) {
    if (this.hp <= 0 || G.gameState !== 5 || this.godMode || this.shieldActive)
      return;
    this.hp -= amt;
    playSound("hit");
    playExternalSound("bloodsplatter");
    import("./globals").then((g) =>
      g.triggerVibration(this.id - 1, "damage", 150),
    );

    if (this.hp <= 0) this.die(attackerId);
  }

  die(attackerId: number) {
    this.hp = 0;
    this.rope.release();
    this.onFire = 0;
    this.shieldActive = false;
    this.stickyTimer = 0;
    playSound("hit");
    playSound("rock_hit");
    for (let i = 0; i < 3; i++)
      setTimeout(() => playSound("hitmarker"), i * 50);
    playExternalSound("death");

    if (G.settingGore > 0) {
      for (let i = 0; i < 150; i++)
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 22,
            (Math.random() - 0.5) * 22 - 5,
            "blood",
          ),
        );
      paintBlood(this.x, this.y, 24, 60);
    }

    const isSelfKill = !attackerId || attackerId === this.id;
    const attacker = G.players.find((p) => p.id === attackerId);
    let isGameOver = false;

    // Kill feed
    const finnishKillVerbs = [
      "tuhoutui",
      "räjähti",
      "hajosi",
      "menetti henkensä",
      "kuoli",
    ];
    const finnishSelfKills = [
      "räjäytti itsensä",
      "teki itsemurhan",
      "tuhosi itsensä",
      "leikki tulella",
    ];

    if (!isSelfKill && attacker) {
      const verb =
        finnishKillVerbs[Math.floor(Math.random() * finnishKillVerbs.length)];
      const wIcon =
        attacker.activeWeapon !== undefined
          ? ` [${WEAPON_NAMES[attacker.activeWeapon][1] || WEAPON_NAMES[attacker.activeWeapon][0]}] `
          : ` [${verb}] `;
      addKillFeed(`${attacker.name}${wIcon}${this.name}`);
    } else {
      const verb =
        finnishSelfKills[Math.floor(Math.random() * finnishSelfKills.length)];
      addKillFeed(`${this.name} ${verb}`);
    }

    if (G.gameMode === "GUNGAME" && attacker && !isSelfKill) {
      attacker.gunGameLevel = Math.min(
        attacker.gunGameLevel + 1,
        GUN_GAME_ORDER.length - 1,
      );
      attacker.loadout[0] = GUN_GAME_ORDER[attacker.gunGameLevel];
      attacker.activeWeapon = attacker.loadout[attacker.loadoutIndex];
      attacker.ammo[attacker.loadout[0]] = MAX_AMMO[attacker.loadout[0]];
      addNotification(attacker.name + ": " + t("GUN_GAME_KILL"));
      playSound("reload");
    }
    if (G.gameMode === "GUNGAME") {
      this.gunGameLevel = 0;
      this.loadout[0] = GUN_GAME_ORDER[0];
      this.activeWeapon = this.loadout[this.loadoutIndex];
      this.ammo = [...MAX_AMMO];
    }

    if (G.winMode === "KILLS" && attacker && !isSelfKill) {
      attacker.score++;
      if (attacker.score >= G.settingKillsToWin) {
        G.matchWinnerId = attacker.id;
        G.gameState = 7;
        G.roundOverTimer = 300;
        isGameOver = true;
        playWinMusic();
      }
    }

    if (G.winMode === "LIVES" && !isGameOver) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.deathPhase = "spectator";
        addNotification(`${this.name} on eliminoitu!`);
        const aliveCount = G.players.filter((p) => p.lives > 0).length;
        if (aliveCount <= 1) {
          const winner = G.players.find((p) => p.lives > 0);
          if (winner) {
            G.matchWinnerId = winner.id;
            G.gameState = 7;
            G.roundOverTimer = 300;
            playWinMusic();
            return;
          } else {
            G.matchWinnerId = 0; // Draw
            G.gameState = 7;
            G.roundOverTimer = 300;
            return;
          }
        }
        this.spectateTarget = Math.max(
          0,
          G.players.findIndex((p) => p.lives > 0 && p.deathPhase === "alive"),
        );
        return;
      }
    }

    if (isGameOver) return;
    this.deathCamX = this.x;
    this.deathCamY = this.y;
    this.deathPhase = "cinematic";
    this.cinematicProgress = 0;

    // Spawn point selection
    let bestPoint = getBestSpawnPoint(this);
    this.pendingSpawnX = bestPoint.x;
    this.pendingSpawnY = bestPoint.y;
  }

  doRespawn() {
    this.x = this.pendingSpawnX;
    this.y = this.pendingSpawnY;
    this.hp = 100;
    this.vx = 0;
    this.vy = 0;

    if (G.gameMode === "GUNGAME") {
      // In gungame we keep ammo management localized maybe... wait, we still need to set active weapon.
      this.loadout[0] = GUN_GAME_ORDER[this.gunGameLevel];
      this.activeWeapon = this.loadout[this.loadoutIndex];
    } else {
      this.loadoutIndex = 0;
      this.activeWeapon = this.loadout[this.loadoutIndex];
    }
    this.cooldown = 60;
    this.ropeCooldown = 0;
    this.onFire = 0;
    this.stickyTimer = 0;
    this.rope.release();
    this.deathPhase = "alive";
    playSound("spawn");
  }

  update() {
    if (this.hp <= 0 || this.deathPhase !== "alive") {
      if (this.deathPhase === "cinematic") {
        this.cinematicProgress += 1 / 150;
        if (this.cinematicProgress >= 1) {
          this.deathPhase = "waiting";
          this.respawnTimer = 15 * 60;
        }
      } else if (this.deathPhase === "waiting") {
        this.respawnTimer--;
        if (this.respawnTimer <= 0) this.doRespawn();
      }
      return;
    }

    if (this.stickyTimer > 0) {
      this.stickyTimer--;
      this.vx = 0;
      this.vy = 0;
    }

    if (this.onFire > 0) {
      this.onFire--;
      this.fireFlashTimer = 5;
      if (this.onFire % 15 === 0) {
        if (!this.shieldActive)
          this.takeDamage(1, this.fireAttacker || this.id);
        G.particles.push(
          new Particle(
            this.x,
            this.y - 5,
            (Math.random() - 0.5) * 2,
            -1 - Math.random() * 2,
            "flame_ember",
          ),
        );
      }
    }
    if (this.fireFlashTimer > 0) this.fireFlashTimer--;

    // Dynamic blood drip
    if (this.hp < 20 && Math.random() < 0.05) {
      G.particles.push(new Particle(this.x, this.y, 0, 0, "blood"));
    }

    if (!this.shieldActive && !this.shieldCharged) {
      this.shieldChargeTimer++;
      if (this.shieldChargeTimer >= 1500) {
        this.shieldCharged = true;
        this.shieldChargeTimer = 0;
      }
    }
    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) this.shieldActive = false;
    }

    if (this.cooldown > 0) this.cooldown--;
    if (this.switchCooldown > 0) this.switchCooldown--;
    if (this.ropeCooldown > 0) this.ropeCooldown--;
    if (this.godTimer > 0) this.godTimer--;
    if (this.rapidFireTimer > 0) {
      this.rapidFireTimer--;
      if (this.rapidFireTimer === 0) this.rapidFire = false;
    }

    // Passive Background Reloading!
    for (let i = 0; i < TOTAL_WEAPONS; i++) {
      if (i === W_SHIELD || i === W_ROPE || i === W_SHOVEL) continue;

      const isEmpty = this.ammo[i] <= 0;
      const isActive = this.activeWeapon === i;

      if (
        this.ammo[i] <= 0 &&
        this.reloadTimers[i] === 0 &&
        RELOAD_TIMES[i] > 0
      ) {
        this.reloadTimers[i] = RELOAD_TIMES[i];
      }
      if (this.reloadTimers[i] > 0) {
        this.reloadTimers[i]--;
        if (this.reloadTimers[i] === 0) {
          this.ammo[i] = MAX_AMMO[i];
          if (isActive) playSound("reload");
        }
      }
    }

    this.isOnGround = isSolid(this.x, this.y + this.radius + 1);
    if (!this.isOnGround) this.jumpTimer++;
    else this.jumpTimer = 0;
    if (Math.abs(this.vx) > 0.4 && this.isOnGround) {
      this.walkTimer++;
      if (this.walkTimer >= 8) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 3;
      }
    } else if (this.isOnGround) {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }

    this.applyPhysics();
    this.rope.update();
  }

  applyPhysics() {
    if (this.stickyTimer > 0) return;
    this.vy += GRAVITY;
    if (this.vy > 7 && !this.rope.active) this.vy = 7;
    this.x += this.vx;
    if (isSolid(this.x + Math.sign(this.vx) * this.radius, this.y)) {
      this.x -= this.vx;
      this.vx = 0;
      if (!isSolid(this.x + Math.sign(this.vx) * this.radius, this.y - 7)) {
        this.y -= 4;
        this.x += Math.sign(this.vx) * 2;
      }
    }
    this.y += this.vy;
    if (isSolid(this.x, this.y + Math.sign(this.vy) * this.radius)) {
      this.y -= this.vy;
      this.vy = 0;
      this.vx *= FRICTION;
    }
    this.x = Math.max(this.radius, Math.min(MAP_W - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(MAP_H - this.radius, this.y));
  }

  draw(c: CanvasRenderingContext2D) {
    this.rope.draw(c);

    if (this.hp <= 0 && this.deathPhase !== "alive") return;
    const dX = Math.floor(this.x),
      dY = Math.floor(this.y);

    c.fillStyle = this.color;
    c.font = "11px 'VT323',monospace";
    c.fillText(this.name, dX - Math.floor(this.name.length * 3.5), dY - 16);

    if (this.onFire > 0 && this.fireFlashTimer > 0) {
      c.fillStyle = "rgba(255,100,0,0.6)";
      c.beginPath();
      c.arc(dX, dY, 12, 0, Math.PI * 2);
      c.fill();
    }

    c.save();
    c.translate(dX, dY);
    const facingLeft =
      this.aimAngle > Math.PI / 2 || this.aimAngle < -Math.PI / 2;
    if (facingLeft) c.scale(-1, 1);
    c.imageSmoothingEnabled = false;

    let spr = this.spriteStand;
    if (G.gameState === 7 && this.id === G.matchWinnerId) {
      if (this.skinType === 1)
        spr = Date.now() % 240 > 120 ? this.spriteDance1 : this.spriteDance2;
      else spr = Date.now() % 240 > 120 ? this.spriteWalk1 : this.spriteJump; // Worm dances too
    } else if (!this.isOnGround && this.jumpTimer > 3) spr = this.spriteJump;
    else if (Math.abs(this.vx) > 0.4 && this.isOnGround)
      spr = this.walkFrame === 1 ? this.spriteWalk1 : this.spriteWalk2;

    c.drawImage(spr, -8, -11, 16, 22);

    c.restore();

    c.strokeStyle = "rgba(255,60,60,0.4)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(dX, dY);
    c.lineTo(
      dX + Math.cos(this.aimAngle) * 70,
      dY + Math.sin(this.aimAngle) * 70,
    );
    c.stroke();

    c.save();
    c.translate(dX, dY);
    c.rotate(this.aimAngle);
    if (facingLeft) c.scale(1, -1);
    const w = this.activeWeapon;

    if (w === W_HANDGUN) {
      c.fillStyle = "#AAA";
      c.fillRect(5, -1, 7, 3);
      c.fillStyle = "#666";
      c.fillRect(5, -2, 3, 1);
    } else if (w === W_MINIGUN) {
      c.fillStyle = "#333";
      c.fillRect(4, -3, 12, 6);
      c.fillStyle = "#555";
      c.fillRect(4, -1, 12, 2);
    } else if (w === W_BAZOOKA || w === W_HOMING) {
      c.fillStyle = "#344";
      c.fillRect(-2, -4, 16, 8);
      c.fillStyle = "#F44";
      c.fillRect(12, -3, 2, 6);
    } else if (w === W_SNIPER) {
      c.fillStyle = "#222";
      c.fillRect(4, -1, 20, 2);
      c.fillStyle = "#888";
      c.fillRect(22, -1, 3, 2);
    } else if (w === W_GAUSS) {
      c.fillStyle = "#258";
      c.fillRect(4, -2, 22, 4);
      c.fillStyle = "#0FF";
      c.fillRect(18, -1, 6, 2);
    } else if (w === W_LASER) {
      c.fillStyle = "#CCC";
      c.fillRect(4, -1, 18, 2);
      c.fillStyle = "#0F8";
      c.fillRect(10, -2, 4, 4);
    } else if (w === W_SHOVEL) {
      c.fillStyle = "#8B4513";
      c.fillRect(4, -1, 11, 2);
      c.fillStyle = "#BBB";
      c.fillRect(13, -4, 5, 8);
    } else if (w === W_JETPACK) {
      c.fillStyle = "#55F";
      c.fillRect(-2, -4, 8, 10);
      c.fillStyle = "#F80";
      c.fillRect(0, 6, 4, 4);
    } else if (w === W_AIRSTRIKE) {
      c.fillStyle = "#339";
      c.fillRect(4, -2, 6, 6);
      c.fillStyle = "#F00";
      c.fillRect(6, -4, 2, 2);
    } else if (w === W_TELEPORT) {
      c.fillStyle = "#0FF";
      c.fillRect(4, -1, 10, 2);
      c.fillStyle = "#F0F";
      c.beginPath();
      c.arc(14, 0, 3, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_GRENADE) {
      c.fillStyle = "#334422";
      c.beginPath();
      c.arc(8, 0, 4, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_DYNAMITE) {
      c.fillStyle = "#D22";
      c.fillRect(6, -4, 4, 8);
      c.fillStyle = "#FFF";
      c.fillRect(7, -6, 2, 2);
    } else if (w === W_GRAVITY_IMPLODER) {
      c.fillStyle = "#316";
      c.beginPath();
      c.arc(8, 0, 4, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_CHIQUITA) {
      c.fillStyle = "#EE0";
      c.fillRect(6, -2, 6, 4);
    } else if (w === W_CLUSTER) {
      c.fillStyle = "#664400";
      c.beginPath();
      c.arc(8, 0, 4, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_DIRTBALL) {
      c.fillStyle = "#6B3010";
      c.beginPath();
      c.arc(8, 0, 4, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_SHOTGUN) {
      c.fillStyle = "#554";
      c.fillRect(4, -2, 10, 4);
      c.fillStyle = "#332";
      c.fillRect(4, -1, 10, 2);
    } else if (w === W_SUPER_SHOTGUN) {
      c.fillStyle = "#333";
      c.fillRect(4, -3, 14, 6);
      c.fillStyle = "#555";
      c.fillRect(4, -1, 14, 2);
    } else if (w === W_FLAMETHROWER) {
      c.fillStyle = "#A33";
      c.fillRect(-2, -3, 12, 6);
      c.fillStyle = "#F60";
      c.fillRect(8, -1, 4, 2);
    } else if (w === W_MINE) {
      c.fillStyle = "#556";
      c.fillRect(4, -2, 7, 4);
      c.fillStyle = "#F00";
      c.fillRect(8, -3, 2, 2);
    } else if (w === W_ROPE) {
      c.fillStyle = "#888";
      c.fillRect(4, -1, 5, 2);
      c.fillStyle = "#EEE";
      c.beginPath();
      c.arc(11, 0, 3, 0, Math.PI * 2);
      c.fill();
    } else if (w === W_BOOMERANG) {
      c.fillStyle = "#FFF";
      c.fillRect(5, -1, 8, 2);
      c.fillRect(8, -4, 2, 8);
    } else if (w === W_SHIELD) {
      c.fillStyle = this.shieldCharged ? "#88FFFF" : "#446688";
      c.beginPath();
      c.moveTo(5, -5);
      c.lineTo(13, -5);
      c.lineTo(14, 2);
      c.lineTo(9, 7);
      c.lineTo(4, 2);
      c.closePath();
      c.fill();
    } else if (w === W_BLASTER) {
      c.fillStyle = "#1188FF";
      c.fillRect(4, -2, 10, 4);
      c.fillStyle = "#FFF";
      c.fillRect(12, -1, 3, 2);
    } else if (w === W_UZI) {
      c.fillStyle = "#222";
      c.fillRect(4, -1, 8, 3);
      c.fillRect(6, 2, 2, 4);
    } else if (w === W_BOOBY_TRAP) {
      c.fillStyle = "#262";
      c.fillRect(4, -3, 6, 6);
      c.fillStyle = "#0F0";
      c.fillRect(6, -1, 2, 2);
    } else if (w === W_BIG_NUKE) {
      c.fillStyle = "#111";
      c.beginPath();
      c.arc(8, 0, 5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#FF0";
      c.fillRect(7, -1, 2, 2);
    }
    c.restore();

    if (this.shieldActive) {
      const t2 = this.shieldTimer;
      c.strokeStyle = `rgba(100,220,255,${0.4 + 0.3 * Math.sin(Date.now() / 100)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(dX, dY, 16, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = "rgba(100,220,255,0.8)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(dX, dY, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (t2 / 300));
      c.stroke();
    } else if (this.shieldCharged) {
      c.strokeStyle = "rgba(100,220,255,0.3)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(dX, dY, 14, 0, Math.PI * 2);
      c.stroke();
    } else {
      const pct = this.shieldChargeTimer / 1500;
      if (pct > 0.1) {
        c.strokeStyle = "rgba(60,120,180,0.4)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(dX, dY, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        c.stroke();
      }
    }

    if (this.stickyTimer > 0) {
      c.fillStyle = "rgba(100,0,150,0.4)";
      c.beginPath();
      c.arc(dX, dY, 16, 0, Math.PI * 2);
      c.fill();
    }
  }

  // --- Externalize Input Handling and Firing Actions to Main Loop for clarity,
  // or handle them here if preferred.
  fireWeapon() {
    if (
      this.ammo[this.activeWeapon] <= 0 &&
      MAX_AMMO[this.activeWeapon] !== -1
    ) {
      playSound("empty");
      this.cooldown = 8;
      if (
        RELOAD_TIMES[this.activeWeapon] > 0 &&
        this.reloadTimers[this.activeWeapon] === 0
      ) {
        this.reloadTimers[this.activeWeapon] = RELOAD_TIMES[this.activeWeapon];
      }
      return;
    }
    const type = this.activeWeapon;
    if (MAX_AMMO[type] !== -1) this.ammo[type]--;

    // start loading immediately when running out
    if (
      this.ammo[type] <= 0 &&
      RELOAD_TIMES[type] > 0 &&
      this.reloadTimers[type] === 0
    ) {
      this.reloadTimers[type] = RELOAD_TIMES[type];
    }
    import("./globals").then((g) =>
      g.triggerVibration(this.id - 1, "light", 60),
    );

    let spread = 0,
      speed = 10;
    if (type === W_HANDGUN) {
      this.cooldown = 15;
      playSound("shoot_handgun");
      spread = (Math.random() - 0.5) * 0.05;
      speed = 18;
      this.vx -= Math.cos(this.aimAngle) * 1.5;
      this.vy -= Math.sin(this.aimAngle) * 0.5;
      G.casings.push(
        new Casing(
          this.x,
          this.y - 5,
          -Math.cos(this.aimAngle) * 3,
          -3 - Math.random() * 2,
        ),
      );
    } else if (type === W_MINIGUN) {
      this.cooldown = 3;
      playExternalSound("minigun_" + this.id);
      spread = (Math.random() - 0.5) * 0.15;
      speed = 16;
      this.vx -= Math.cos(this.aimAngle) * 0.5;
      this.vy -= Math.sin(this.aimAngle) * 0.1;
      G.casings.push(
        new Casing(
          this.x,
          this.y - 5,
          -Math.cos(this.aimAngle) * 2,
          -2 - Math.random() * 2,
        ),
      );
    } else if (type === W_SHIELD) {
      this.cooldown = 20;
      if (this.shieldCharged) {
        this.shieldActive = true;
        this.shieldTimer = 300;
        this.shieldCharged = false;
        playSound("hit");
        import("./globals").then((g) =>
          g.triggerVibration(this.id - 1, "heavy", 200),
        );
      } else {
        playSound("empty");
      }
      return;
    } else if (type === W_ROPE) {
      this.cooldown = 20;
      if (!this.rope.active && this.ropeCooldown === 0) this.rope.fire();
      return;
    } else if (type === W_BAZOOKA || type === W_HOMING) {
      this.cooldown = 40;
      playSound("shoot_bazooka");
      speed = type === W_BAZOOKA ? 18 : 12;
      this.vx -= Math.cos(this.aimAngle) * 6;
      this.vy -= Math.sin(this.aimAngle) * 6;
      import("./globals").then((g) =>
        g.triggerVibration(this.id - 1, "heavy", 120),
      );
    } else if (type === W_DIRTBALL) {
      this.cooldown = 20;
      playSound("explosion_puff");
      speed = 11;
      spread = (Math.random() - 0.5) * 0.06;
      this.vx -= Math.cos(this.aimAngle) * 2;
    } else if (type === W_SNIPER) {
      this.cooldown = 45;
      playSound("shoot_sniper");
      speed = 40;
      this.vx -= Math.cos(this.aimAngle) * 8;
      this.vy -= Math.sin(this.aimAngle) * 5;
      G.casings.push(
        new Casing(this.x, this.y - 5, -Math.cos(this.aimAngle) * 4, -4),
      );
      import("./globals").then((g) =>
        g.triggerVibration(this.id - 1, "heavy", 100),
      );
    } else if (type === W_OIKOTIE) {
      this.cooldown = 120;
      playSound("shoot_gauss");
      speed = 2.5;
      import("./globals").then((g) =>
        g.triggerVibration(this.id - 1, "damage", 200),
      );
    } else if (type === W_GAUSS) {
      this.cooldown = 45;
      playSound("shoot_gauss");
      speed = 60;
      this.vx -= Math.cos(this.aimAngle) * 12;
      this.vy -= Math.sin(this.aimAngle) * 8;
      import("./globals").then((g) =>
        g.triggerVibration(this.id - 1, "heavy", 150),
      );
    } else if (type === W_LASER) {
      this.cooldown = 35;
      playSound("shoot_laser");
      speed = 50;
      this.vx -= Math.cos(this.aimAngle) * 4;
      this.vy -= Math.sin(this.aimAngle) * 2;
    } else if (type === W_SHOTGUN || type === W_SUPER_SHOTGUN) {
      this.cooldown = type === W_SHOTGUN ? 35 : 55;
      playSound(type === W_SHOTGUN ? "shoot_shotgun" : "shoot_supershotgun");
      import("./globals").then((g) =>
        g.triggerVibration(
          this.id - 1,
          type === W_SUPER_SHOTGUN ? "heavy" : "light",
          type === W_SUPER_SHOTGUN ? 150 : 100,
        ),
      );
      this.ammo[type]++;
      let count = type === W_SHOTGUN ? 8 : 14;
      for (let i = 0; i < count; i++) {
        const s = (Math.random() - 0.5) * 0.4,
          spd = 14 + Math.random() * 6,
          a = this.aimAngle + s;
        G.bullets.push(
          new Bullet(
            this.x + Math.cos(this.aimAngle) * 14,
            this.y + Math.sin(this.aimAngle) * 14,
            Math.cos(a) * spd,
            Math.sin(a) * spd,
            this.id,
            type,
          ),
        );
      }
      this.ammo[type]--;
      G.casings.push(
        new Casing(this.x, this.y - 5, -Math.cos(this.aimAngle) * 3, -3),
      );
      this.vx -= Math.cos(this.aimAngle) * (type === W_SUPER_SHOTGUN ? 12 : 6);
      this.vy -= Math.sin(this.aimAngle) * (type === W_SUPER_SHOTGUN ? 12 : 6);
      return;
    } else if (type === W_BOOMERANG) {
      this.cooldown = 25;
      playSound("boomerang_throw");
      spread = 0;
      speed = 15;
    } else if (type === W_GRENADE || type === W_DYNAMITE) {
      this.cooldown = 35;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.grenades.push(
        new Grenade(
          sx,
          sy,
          Math.cos(this.aimAngle) * (type === W_DYNAMITE ? 11 : 9),
          Math.sin(this.aimAngle) * (type === W_DYNAMITE ? 11 : 9),
          this.id,
          false,
          type === W_DYNAMITE,
        ),
      );
      return;
    } else if (type === W_GRAVITY_IMPLODER) {
      this.cooldown = 50;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.grenades.push(
        new GravityImploder(
          sx,
          sy,
          Math.cos(this.aimAngle) * 10,
          Math.sin(this.aimAngle) * 10,
          this.id,
        ),
      );
      return;
    } else if (type === W_CHIQUITA) {
      this.cooldown = 40;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.grenades.push(
        new BouncingChiquita(
          sx,
          sy,
          Math.cos(this.aimAngle) * 8,
          Math.sin(this.aimAngle) * 8,
          this.id,
        ),
      );
      return;
    } else if (type === W_CLUSTER) {
      this.cooldown = 35;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.grenades.push(
        new ClusterBomb(
          sx,
          sy,
          Math.cos(this.aimAngle) * 9,
          Math.sin(this.aimAngle) * 9,
          this.id,
        ),
      );
      return;
    } else if (type === W_MINE) {
      this.cooldown = 20;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.mines.push(new Mine(sx, sy + 5, this.id));
      return;
    } else if (type === W_FLAMETHROWER) {
      this.cooldown = 2;
      const spd = 8 + Math.random() * 4,
        a = this.aimAngle + (Math.random() - 0.5) * 0.25;
      G.flames.push(
        new FlameParticle(
          this.x + Math.cos(this.aimAngle) * 12,
          this.y + Math.sin(this.aimAngle) * 12,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          this.id,
        ),
      );
      if (Math.random() < 0.1) playSound("flame");
      return;
    } else if (type === W_BOOBY_TRAP) {
      this.cooldown = 30;
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.mines.push(new BoobyTrap(sx, sy + 5, this.id));
      return;
    } else if (type === W_BLASTER) {
      this.cooldown = 60;
      playSound("shoot_laser");
      speed = 20;
      spread = 0.02;
    } else if (type === W_UZI) {
      this.cooldown = 5;
      playSound("shoot_minigun");
      spread = (Math.random() - 0.5) * 0.25;
      speed = 14;
      G.casings.push(
        new Casing(
          this.x,
          this.y - 5,
          -Math.cos(this.aimAngle) * 2,
          -2 - Math.random() * 2,
        ),
      );
    } else if (type === W_BIG_NUKE) {
      this.cooldown = 60;
      playSound("shoot_bazooka");
      const sx = this.x + Math.cos(this.aimAngle) * 14,
        sy = this.y + Math.sin(this.aimAngle) * 14;
      G.grenades.push(
        new BigNuke(
          sx,
          sy,
          Math.cos(this.aimAngle) * 8,
          Math.sin(this.aimAngle) * 8,
          this.id,
        ),
      );
      return;
    } else if (type === W_SHOVEL) {
      this.cooldown = 12;
      playSound("shovel");
      const tx = this.x + Math.cos(this.aimAngle) * 16,
        ty = this.y + Math.sin(this.aimAngle) * 16;
      jaggedCarve(tx, ty, 18, false, true);
      for (let i = 0; i < 12; i++)
        G.particles.push(
          new Particle(
            tx,
            ty,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 12 - 2,
            "dirt",
          ),
        );
      for (const p of G.players) {
        if (
          p.id !== this.id &&
          p.hp > 0 &&
          !p.shieldActive &&
          Math.hypot(p.x - tx, p.y - ty) < p.radius + 15
        ) {
          p.takeDamage(18, this.id);
          p.vx += Math.cos(this.aimAngle) * 5;
          p.vy += Math.sin(this.aimAngle) * 5;
        }
      }
      return;
    } else if (type === W_JETPACK) {
      this.cooldown = 2;
      playSound("flame");
      this.vy = Math.max(this.vy - 0.6, -5.5);
      this.vx += Math.cos(this.aimAngle) * 0.4;
      for (let i = 0; i < 3; i++)
        G.particles.push(
          new FlameParticle(
            this.x,
            this.y + 10,
            (Math.random() - 0.5) * 2,
            2 + Math.random() * 3,
            this.id,
          ),
        );
      return;
    } else if (type === W_TELEPORT) {
      playSound("oikotie_spawn"); // Or another magic sound
      this.cooldown = 40;
      const dist = 120;
      const tx = this.x + Math.cos(this.aimAngle) * dist;
      const ty = this.y + Math.sin(this.aimAngle) * dist;

      // Add teleport particles at original spot
      for (let i = 0; i < 15; i++) {
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            "smoke",
          ),
        );
      }

      this.x = Math.max(this.radius, Math.min(MAP_W - this.radius, tx));
      this.y = Math.max(this.radius, Math.min(MAP_H - this.radius, ty));

      this.vx = 0;
      this.vy = 0;

      // Add teleport particles at new spot
      for (let i = 0; i < 15; i++) {
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            "smoke",
          ),
        );
      }
      return;
    } else if (type === W_AIRSTRIKE) {
      this.cooldown = 60;
      playSound("bazooka_shoot");
      import("./globals").then((g) => g.addNotification("ILMAISKU TILATTU!"));
      const targetX = this.x + Math.cos(this.aimAngle) * 200; // rough target

      // Spawn some rockets high above
      for (let i = 0; i < 5; i++) {
        const spawnX = targetX + (Math.random() - 0.5) * 150;
        const spawnY = 10 + Math.random() * 20; // high in the sky
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.2; // roughly down
        const spd = 4 + Math.random() * 2;
        G.bullets.push(
          new Bullet(
            spawnX,
            spawnY,
            Math.cos(angle) * spd,
            Math.sin(angle) * spd,
            this.id,
            W_BAZOOKA,
          ),
        );
      }
      return;
    }

    const fa = this.aimAngle + spread;
    G.bullets.push(
      new Bullet(
        this.x + Math.cos(this.aimAngle) * 14,
        this.y + Math.sin(this.aimAngle) * 14,
        Math.cos(fa) * speed,
        Math.sin(fa) * speed,
        this.id,
        type,
      ),
    );
  }
}
