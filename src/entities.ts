import { G, MAP_W, MAP_H, GRAVITY, TERRAIN_STICKY, FRICTION } from "./globals";
import {
  isSolid,
  jaggedCarve,
  scorchTerrain,
  buildTerrain,
  paintBlood,
} from "./map";
import { playSound } from "./audio";

export class HealthPack {
  x: number;
  y: number;
  life: number;
  vy: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.life = 1200;
    this.vy = 0; // 20 seconds life
  }
  update() {
    this.life--;
    this.vy += GRAVITY;
    if (this.vy > 5) this.vy = 5;
    this.y += this.vy;
    if (isSolid(this.x, this.y + 6)) {
      this.y -= this.vy;
      this.vy = 0;
    }
    for (const p of G.players) {
      if (p.hp > 0 && p.hp < 100 && p.deathPhase === "alive") {
        if (Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 8) {
          p.hp = Math.min(100, p.hp + 50);
          playSound("spawn");
          G.particles.push(
            new Particle(this.x, this.y, 0, -2, "text", "+50 HP"),
          );
          return false;
        }
      }
    }
    return this.life > 0;
  }
  draw(c: CanvasRenderingContext2D) {
    if (this.life < 120 && this.life % 10 < 5) return; // blink before disappear
    c.fillStyle = "#FFF";
    c.fillRect(Math.floor(this.x) - 4, Math.floor(this.y) - 4, 8, 8);
    c.fillStyle = "#F00";
    c.fillRect(Math.floor(this.x) - 3, Math.floor(this.y) - 1, 6, 2);
    c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 3, 2, 6);
  }
}

export class VisualExplosion {
  x: number;
  y: number;
  maxR: number;
  r: number;
  life: number;
  maxLife: number;
  constructor(x: number, y: number, maxR: number) {
    this.x = x;
    this.y = y;
    this.maxR = maxR * 1.2;
    this.r = 0;
    this.life = 25;
    this.maxLife = 25;
  }
  update() {
    this.r += (this.maxR - this.r) * 0.35;
    this.life--;
    return this.life > 0;
  }
  draw(c: CanvasRenderingContext2D) {
    const pct = this.life / this.maxLife;
    // Core fire
    c.fillStyle = `rgba(255,${Math.floor(200 * pct)},0,${pct})`;
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), this.r, 0, Math.PI * 2);
    c.fill();
    // Inner white hot
    c.fillStyle = `rgba(255,255,255,${pct * 0.9})`;
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), this.r * 0.6, 0, Math.PI * 2);
    c.fill();
    // Shockwave ring
    c.strokeStyle = `rgba(220, 240, 255, ${pct * 0.8})`;
    c.lineWidth = 3 + (1 - pct) * 4;
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), this.r * 1.5, 0, Math.PI * 2);
    c.stroke();
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string;
  text: string;
  life: number;
  maxLife: number;
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: string,
    text = "",
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.text = text;
    if (this.type === "blood" && G.settingBones && Math.random() < 0.12)
      this.type = "bone";
    if (this.type === "blood" && G.settingGore === 2) {
      // EXTREME GORE: stays alive much longer, stronger velocity
      this.life = 150 + Math.random() * 100;
      this.vx *= 1.5;
      this.vy *= 1.5;
    } else {
      this.life =
        type === "text"
          ? 65
          : type === "flame_ember"
            ? 10 + Math.random() * 20
            : 45 + Math.random() * 55;
    }
    this.maxLife = this.life;
  }
  update() {
    if (this.type !== "text") {
      this.vy += GRAVITY * 0.5;
      this.x += this.vx;
      this.y += this.vy;
      if (isSolid(this.x, this.y)) {
        if (this.type === "blood") {
          paintBlood(
            this.x,
            this.y,
            G.settingGore === 2 ? 8 : 4,
            G.settingGore === 2 ? 5 : 1,
          );
          if (G.settingGore === 2 && Math.random() < 0.6) {
            // Extreme blood drips down
            this.vx *= 0.1;
            this.vy = 0.5;
            this.y -= 1;
          } else {
            this.life = 0;
            return false;
          }
        } else if (this.type === "flame_ember") {
          this.life = 0;
          return false;
        } else if (this.type === "bone") {
          this.vx *= 0.4;
          this.vy *= -0.3;
          this.y -= 1;
        } else {
          this.vx *= 0.35;
          this.vy *= -0.35;
          this.y -= 1;
        }
      }
    } else {
      this.y += this.vy;
      this.vy *= 0.94;
    }
    this.life--;
    return this.life > 0;
  }
  draw(c: CanvasRenderingContext2D) {
    if (G.settingGore === 0 && (this.type === "blood" || this.type === "bone"))
      return;
    if (this.type === "text") {
      const a = Math.min(1, this.life / 40);
      c.fillStyle = `rgba(255,255,80,${a})`;
      c.font = "18px 'VT323',monospace";
      c.fillText(this.text, Math.floor(this.x) - 15, Math.floor(this.y));
      return;
    }
    if (this.type === "dirt") {
      c.fillStyle = "#A05818";
      c.fillRect(
        Math.floor(this.x),
        Math.floor(this.y),
        1 + Math.random() * 2,
        1 + Math.random() * 2,
      );
      return;
    } else if (this.type === "blood")
      c.fillStyle = `rgba(210,12,12,${this.life / this.maxLife})`;
    else if (this.type === "smoke")
      c.fillStyle = `rgba(160,160,160,${(this.life / this.maxLife) * 0.6})`;
    else if (this.type === "flame_ember") {
      const pct = this.life / this.maxLife;
      c.fillStyle = `rgba(255,${Math.floor(100 + 100 * pct)},0,${pct})`;
    } else if (this.type === "bone") {
      c.fillStyle = "#EED";
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
      return;
    }

    if (this.type === "blood" && G.settingGore === 2) {
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    } else {
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 1, 1);
    }
  }
}

export function triggerStickyBlock(bx: number, by: number, ownerId: number) {
  for (const sb of G.stickyBombs) {
    if (sb.blockX === bx && sb.blockY === by) return;
  }
  G.stickyBombs.push({
    x: bx,
    y: by,
    blockX: bx,
    blockY: by,
    timer: 180,
    stuck: true,
    ownerId: ownerId || 0,
  });
  playSound("sticky_beep");
}

export class Grenade {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  isSub: boolean;
  isDynamite: boolean;
  isChiquita: boolean;
  timer: number;
  stuck: boolean;
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    ownerId: number,
    isSub = false,
    isDynamite = false,
    isChiquita = false,
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.isSub = isSub;
    this.isDynamite = isDynamite;
    this.isChiquita = isChiquita;
    this.timer = isDynamite
      ? 150
      : isChiquita
        ? 55 + Math.random() * 45
        : isSub
          ? 45
          : 95;
    this.stuck = false;
  }
  update() {
    if (!this.stuck) {
      this.vy += GRAVITY * 0.75;
      this.x += this.vx;
      const bM = this.isDynamite ? -0.7 : -0.5;
      if (isSolid(this.x + Math.sign(this.vx) * 2, this.y)) {
        if (this.isDynamite) {
          this.stuck = true;
          this.vx = 0;
          this.vy = 0;
        } else {
          this.x -= this.vx;
          this.vx *= bM;
          playSound("grenade_bounce");
        }
      }
      if (!this.stuck) {
        this.y += this.vy;
        if (isSolid(this.x, this.y + Math.sign(this.vy) * 2)) {
          if (this.isDynamite) {
            this.stuck = true;
            this.vx = 0;
            this.vy = 0;
          } else {
            this.y -= this.vy;
            this.vy *= bM;
            this.vx *= FRICTION;
            if (Math.abs(this.vy) > 1) playSound("grenade_bounce");
          }
        }
      }
    }
    if (!this.isDynamite) {
      for (const p of G.players)
        if (
          p.id !== this.ownerId &&
          p.hp > 0 &&
          !p.godMode &&
          Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 4
        ) {
          this.timer = 0;
          break;
        }
    }
    this.timer--;
    if (this.timer <= 0) {
      this.explode();
      return false;
    }
    return true;
  }
  explode() {
    playSound(
      this.isChiquita
        ? "explosion_bam"
        : this.isSub
          ? "explosion_bam"
          : "explosion_grenade",
    );
    const r = this.isChiquita
      ? 46
      : this.isDynamite
        ? 68
        : this.isSub
          ? 22
          : 38;
    jaggedCarve(this.x, this.y, r - 5);
    if (!this.isChiquita && !this.isSub) {
      G.visualExplosions.push(new VisualExplosion(this.x, this.y, r));
    } else {
      for (let i = 0; i < 20; i++)
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            "smoke",
          ),
        );
      for (let i = 0; i < 10; i++)
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8 - 2,
            "dirt",
          ),
        );
    }
    G.screenShake += this.isChiquita
      ? 15
      : this.isDynamite
        ? 44
        : this.isSub
          ? 12
          : 22;
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
        if (d < r + 8) {
          let dmg = this.isChiquita
            ? (r + 8 - d) * 2.2
            : this.isDynamite
              ? (r + 8 - d) * 1.8
              : (r + 8 - d) * 1.6;
          p.takeDamage(Math.floor(dmg), this.ownerId);
          p.vx +=
            ((p.x - this.x) / d) *
            (this.isChiquita ? 9 : this.isDynamite ? 11 : this.isSub ? 4 : 6);
          p.vy +=
            ((p.y - this.y) / d) *
            (this.isChiquita ? 9 : this.isDynamite ? 11 : this.isSub ? 4 : 6);
          for (let i = 0; i < 20; i++)
            G.particles.push(
              new Particle(
                p.x,
                p.y,
                (Math.random() - 0.5) * 16,
                (Math.random() - 0.5) * 16,
                "blood",
              ),
            );
        }
      }
    }
    const pc = this.isChiquita ? 28 : this.isSub ? 12 : 32;
    for (let i = 0; i < pc; i++)
      G.particles.push(
        new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          "smoke",
        ),
      );
    for (let i = 0; i < pc * 1.5; i++)
      G.particles.push(
        new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          "dirt",
        ),
      );
    paintBlood(this.x, this.y, r, 40);
  }
  draw(c: CanvasRenderingContext2D) {
    if (this.isDynamite) {
      c.fillStyle = "#D22";
      c.fillRect(Math.floor(this.x) - 2, Math.floor(this.y) - 3, 4, 6);
      c.fillStyle = "#FFF";
      c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 2, 2);
      if (this.stuck) {
        c.fillStyle = "rgba(255,100,0,0.7)";
        c.beginPath();
        c.arc(Math.floor(this.x), Math.floor(this.y), 5, 0, Math.PI * 2);
        c.fill();
      }
    } else if (this.isChiquita) {
      c.fillStyle = "#EEEE00";
      c.fillRect(Math.floor(this.x) - 2, Math.floor(this.y) - 2, 4, 3);
    } else {
      c.fillStyle = this.isSub ? "#8B0000" : "#004400";
      c.beginPath();
      c.arc(
        Math.floor(this.x),
        Math.floor(this.y),
        this.isSub ? 2 : 3,
        0,
        Math.PI * 2,
      );
      c.fill();
      if (this.timer % 10 < 5) {
        c.fillStyle = "#FF0000";
        c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 2, 2);
      }
    }
  }
}

export class GravityImploder {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  timer: number;
  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.timer = 150;
  }
  update() {
    this.vy += GRAVITY * 0.75;
    this.x += this.vx;
    this.y += this.vy;
    if (isSolid(this.x, this.y)) {
      this.x -= this.vx;
      this.y -= this.vy;
      this.vx = 0;
      this.vy = 0; // sticks immediately
    }

    // Implode active!
    if (this.timer < 90 && this.timer > 0) {
      if (this.timer === 89) playSound("implode");
      for (const p of G.players) {
        if (p.hp > 0 && !p.godMode) {
          const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
          if (d < 350) {
            p.vx -= ((p.x - this.x) / d) * 1.5;
            p.vy -= ((p.y - this.y) / d) * 1.5;
          }
        }
      }
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 100 + Math.random() * 200;
        G.particles.push(
          new Particle(
            this.x + Math.cos(a) * d,
            this.y + Math.sin(a) * d,
            -Math.cos(a) * 10,
            -Math.sin(a) * 10,
            "smoke",
          ),
        );
      }
    }

    this.timer--;
    if (this.timer <= 0) {
      this.explode();
      return false;
    }
    return true;
  }
  explode() {
    playSound("explosion_huge");
    jaggedCarve(this.x, this.y, 80);
    G.visualExplosions.push(new VisualExplosion(this.x, this.y, 80));
    G.screenShake += 50;
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
        if (d < 100) {
          p.takeDamage(100, this.ownerId); // Lethal if too close
          p.vx += ((p.x - this.x) / d) * 18;
          p.vy += ((p.y - this.y) / d) * 18;
        }
      }
    }
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#331166";
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), 4, 0, Math.PI * 2);
    c.fill();
    if (this.timer < 90) {
      c.fillStyle = "#AA00FF";
      c.beginPath();
      c.arc(
        Math.floor(this.x),
        Math.floor(this.y),
        6 + Math.random() * 4,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
}

export class BouncingChiquita {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  timer: number;
  bounces: number;
  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ownerId = ownerId;
    this.timer = 110;
    this.bounces = 0;
  }
  update() {
    this.vy += GRAVITY * 0.75;
    this.x += this.vx;
    if (isSolid(this.x + Math.sign(this.vx) * 2, this.y)) {
      this.x -= this.vx;
      this.vx *= -0.7;
      this.bounces++;
      playSound("grenade_bounce");
    }
    this.y += this.vy;
    if (isSolid(this.x, this.y + Math.sign(this.vy) * 2)) {
      this.y -= this.vy;
      this.vy *= -0.7;
      this.vx *= FRICTION;
      if (Math.abs(this.vy) > 1) playSound("grenade_bounce");
    }

    this.timer--;
    if (this.timer <= 0) {
      this.explode();
      return false;
    }
    return true;
  }
  explode() {
    // release 6 powerful small grenades
    for (let i = 0; i < 6; i++) {
      const a = ((Math.PI * 2) / 6) * i + Math.random() * 0.5;
      const spd = 6 + Math.random() * 3;
      G.grenades.push(
        new Grenade(
          this.x,
          this.y,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          this.ownerId,
          false,
          false,
          true,
        ),
      );
    }
    playSound("explosion_puff");
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#EEEE00";
    c.beginPath();
    c.ellipse(
      Math.floor(this.x),
      Math.floor(this.y),
      4,
      2,
      Date.now() / 100,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
}

export class ClusterBomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  ownerId: number;
  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.timer = 85;
    this.ownerId = ownerId;
  }
  update() {
    this.vy += GRAVITY * 0.75;
    this.x += this.vx;
    if (isSolid(this.x + Math.sign(this.vx) * 2, this.y)) {
      this.x -= this.vx;
      this.vx *= -0.5;
      playSound("grenade_bounce");
    }
    this.y += this.vy;
    if (isSolid(this.x, this.y + Math.sign(this.vy) * 2)) {
      this.y -= this.vy;
      this.vy *= -0.5;
      this.vx *= FRICTION;
      if (Math.abs(this.vy) > 1) playSound("grenade_bounce");
    }
    this.timer--;
    if (this.timer <= 0) {
      this.explode();
      return false;
    }
    return true;
  }
  explode() {
    for (let i = 0; i < 3; i++) {
      let cx = this.x + (Math.random() - 0.5) * 30,
        cy = this.y + (Math.random() - 0.5) * 30;
      G.grenades.push(new Grenade(cx, cy, 0, 0, this.ownerId, true, false));
    }
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#BB5500";
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), 4, 0, Math.PI * 2);
    c.fill();
    if (this.timer % 10 < 5) {
      c.fillStyle = "#FFFF00";
      c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 2, 2);
    }
  }
}

export class Mine {
  x: number;
  y: number;
  ownerId: number;
  armTimer: number;
  armed: boolean;
  constructor(x: number, y: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.armTimer = 70;
    this.armed = false;
  }
  update() {
    if (this.armTimer > 0) {
      this.armTimer--;
      if (this.armTimer === 0) this.armed = true;
    }
    if (!isSolid(this.x, this.y + 1)) this.y++;
    if (this.armed) {
      for (const p of G.players) {
        if (
          p.hp > 0 &&
          !p.godMode &&
          Math.hypot(p.x - this.x, p.y - this.y) < 18
        ) {
          this.explode();
          return false;
        }
      }
    }
    return true;
  }
  explode() {
    playSound("explosion_bam");
    jaggedCarve(this.x, this.y, 42);
    G.visualExplosions.push(new VisualExplosion(this.x, this.y, 42));
    G.screenShake += 24;
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
        if (d < 52) {
          p.takeDamage(Math.floor((52 - d) * 1.5), this.ownerId);
          p.vx += ((p.x - this.x) / d) * 8;
          p.vy += ((p.y - this.y) / d) * 8;
          for (let i = 0; i < 20; i++)
            G.particles.push(
              new Particle(
                p.x,
                p.y,
                (Math.random() - 0.5) * 18,
                (Math.random() - 0.5) * 18,
                "blood",
              ),
            );
        }
      }
    }
    for (let i = 0; i < 30; i++)
      G.particles.push(
        new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 11,
          "smoke",
        ),
      );
    G.particles.push(new Particle(this.x, this.y, 0, -1.2, "text", "BOOM!"));
    paintBlood(this.x, this.y, 42, 60);
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = this.armed ? "#445544" : "#556655";
    c.fillRect(Math.floor(this.x) - 3, Math.floor(this.y) - 2, 6, 4);
    c.fillStyle = "#AAAAAA";
    c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 4, 2, 2);
    c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) + 2, 2, 2);
  }
}

export class FlameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
  life: number;
  maxLife: number;
  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx + (Math.random() - 0.5) * 3;
    this.vy = vy + (Math.random() - 0.5) * 3;
    this.ownerId = ownerId;
    this.maxLife = 18 + Math.random() * 18;
    this.life = this.maxLife;
  }
  update() {
    const steps = Math.ceil(Math.hypot(this.vx, this.vy));
    const dx = this.vx / steps,
      dy = this.vy / steps;
    for (let i = 0; i < steps; i++) {
      this.x += dx;
      this.y += dy;
      if (isSolid(this.x, this.y)) {
        if (Math.random() < 0.3)
          G.groundFires.push({
            x: Math.floor(this.x),
            y: Math.floor(this.y),
            life: 90 + Math.floor(Math.random() * 60),
            maxLife: 150,
            ownerId: this.ownerId,
          });
        scorchTerrain(this.x, this.y, 5);
        this.life = 0;
        return false;
      }
      for (const p of G.players) {
        if (
          p.id !== this.ownerId &&
          p.hp > 0 &&
          !p.godMode &&
          Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 4
        ) {
          if (!p.shieldActive) {
            p.takeDamage(2, this.ownerId);
            p.onFire = Math.max(p.onFire, 180);
            p.fireAttacker = this.ownerId;
          }
          this.life = 0;
          return false;
        }
      }
    }
    this.vy -= 0.04;
    this.vx *= 0.93;
    this.vy *= 0.93;
    this.life--;
    return this.life > 0;
  }
  draw(c: CanvasRenderingContext2D) {
    const pct = this.life / this.maxLife;
    let r, g, b, a;
    if (pct > 0.7) {
      r = 255;
      g = 255;
      b = 150;
      a = 1.0;
    } else if (pct > 0.4) {
      r = 255;
      g = 120;
      b = 0;
      a = 0.85;
    } else if (pct > 0.15) {
      r = 220;
      g = 40;
      b = 0;
      a = 0.65;
    } else {
      r = 100;
      g = 100;
      b = 100;
      a = 0.4;
    }
    const size = 1 + (1 - pct) * 7.0;
    c.fillStyle = `rgba(${r},${g},${b},${a})`;
    c.beginPath();
    c.arc(Math.floor(this.x), Math.floor(this.y), size, 0, Math.PI * 2);
    c.fill();
  }
}

export class Casing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  angle: number;
  rot: number;
  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = 90 + Math.random() * 60;
    this.angle = Math.random() * Math.PI;
    this.rot = (Math.random() - 0.5) * 0.6;
  }
  update() {
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rot;
    if (isSolid(this.x, this.y)) {
      this.x -= this.vx;
      this.y -= this.vy;
      this.vx *= -0.45;
      this.vy *= -0.45;
      this.rot *= 0.5;
      if (Math.abs(this.vy) > 1) playSound("casing_bounce");
    }
    this.life--;
    return this.life > 0;
  }
  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.translate(Math.floor(this.x), Math.floor(this.y));
    c.rotate(this.angle);
    c.fillStyle = "#FFD700";
    c.fillRect(-1, -2, 2, 4);
    c.restore();
  }
}

export class BigNuke extends Grenade {
  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    super(x, y, vx, vy, ownerId);
    this.timer = 150;
  }
  update() {
    this.timer--;
    if (this.timer % 10 === 0)
      G.particles.push(new Particle(this.x, this.y, 0, -1, "smoke"));
    if (!super.update()) return false;
    return true;
  }
  explode() {
    playSound("explosion_huge");
    jaggedCarve(this.x, this.y, 85);
    G.visualExplosions.push(new VisualExplosion(this.x, this.y, 90));
    G.screenShake += 45;
    G.screenFlash = 8;
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
        if (d < 110) {
          p.takeDamage(120, this.ownerId);
          p.vx += ((p.x - this.x) / d) * 18;
          p.vy += ((p.y - this.y) / d) * 18;
          for (let i = 0; i < 30; i++)
            G.particles.push(
              new Particle(
                p.x,
                p.y,
                (Math.random() - 0.5) * 22,
                (Math.random() - 0.5) * 22,
                "blood",
              ),
            );
        }
      }
    }
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#111";
    c.beginPath();
    c.ellipse(
      this.x,
      this.y,
      6,
      8,
      Math.atan2(this.vy, this.vx),
      0,
      Math.PI * 2,
    );
    c.fill();
    c.fillStyle = "#DD0";
    c.fillRect(this.x - 1, this.y - 1, 2, 2);
  }
}

export class BoobyTrap extends Mine {
  constructor(x: number, y: number, ownerId: number) {
    super(x, y, ownerId);
  }
  explode() {
    playSound("explosion_bam");
    jaggedCarve(this.x, this.y, 55);
    G.visualExplosions.push(new VisualExplosion(this.x, this.y, 55));
    G.screenShake += 30;
    G.screenFlash = 3;
    const count = 5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      G.grenades.push(
        new Grenade(
          this.x,
          this.y,
          Math.cos(a) * 6,
          Math.sin(a) * 6,
          this.ownerId,
          true,
        ),
      );
    }
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - this.x, p.y - this.y), 0.1);
        if (d < 70) {
          p.takeDamage(60, this.ownerId);
          p.vx += ((p.x - this.x) / d) * 12;
          p.vy += ((p.y - this.y) / d) * 12;
        }
      }
    }
    for (let i = 0; i < 30; i++)
      G.particles.push(
        new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 11,
          "smoke",
        ),
      );
  }
  draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#060";
    c.fillRect(this.x - 3, this.y - 3, 6, 6);
    if (this.armed) {
      c.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? "#F00" : "#800";
      c.fillRect(this.x - 1, this.y - 1, 2, 2);
    }
  }
}
