import {
  G,
  MAP_W,
  MAP_H,
  GRAVITY,
  TERRAIN_STICKY,
  W_MINIGUN,
  W_HANDGUN,
  W_DIRTBALL,
  W_SHOTGUN,
  W_HOMING,
  W_LASER,
  W_BAZOOKA,
  W_SNIPER,
  W_GAUSS,
  W_CHIQUITA,
  W_SUPER_SHOTGUN,
  W_BOOMERANG,
  W_GRAVITY_IMPLODER,
  W_OIKOTIE,
} from "./globals";
import {
  jaggedCarve,
  isSolid,
  scorchTerrain,
  buildTerrain,
  paintBlood,
} from "./map";
import { playSound } from "./audio";
import { VisualExplosion, Particle, triggerStickyBlock } from "./entities";

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ownerId: number;
  type: number;
  lastX: number;
  lastY: number;
  bounces: number;
  target: any;
  startX: number;
  startY: number;
  returning: boolean = false;
  hitPlayers: Set<number> = new Set();

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    ownerId: number,
    type: number,
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.startX = x;
    this.startY = y;
    this.life =
      type === W_GAUSS
        ? 2
        : type === W_LASER
          ? 300
          : type === W_BOOMERANG
            ? 250
            : type === W_OIKOTIE
              ? 1800
              : 160;
    this.ownerId = ownerId;
    this.type = type;
    this.lastX = x;
    this.lastY = y;
    this.bounces = 0;
    this.target = null;
    if (this.type === W_HOMING) {
      let minDist = 300;
      for (const p of G.players) {
        if (p.id !== this.ownerId && p.hp > 0 && !p.godMode) {
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d < minDist) {
            minDist = d;
            this.target = p;
          }
        }
      }
    }
  }
  update(): boolean {
    this.lastX = this.x;
    this.lastY = this.y;

    if (this.type === W_BOOMERANG) {
      this.vx *= 0.98;
      this.vy *= 0.98;
      // Accelerate back owner
      const owner = G.players.find((p) => p.id === this.ownerId);
      if (owner && owner.hp > 0 && this.life < 220) {
        if (!this.returning) {
          this.returning = true;
          this.hitPlayers.clear();
        }
        const oDx = owner.x - this.x;
        const oDy = owner.y - this.y;
        const oDist = Math.hypot(oDx, oDy);
        if (oDist > 0) {
          this.vx += (oDx / oDist) * 1.5;
          this.vy += (oDy / oDist) * 1.5 - GRAVITY; // negate gravity
        }
        // Catch
        if (oDist < owner.radius + 10 && this.life < 200) {
          return false; // caught
        }
      }
    }

    if (
      this.type === W_MINIGUN ||
      this.type === W_HANDGUN ||
      this.type === W_DIRTBALL ||
      this.type === W_SHOTGUN ||
      this.type === W_SUPER_SHOTGUN
    )
      this.vy += GRAVITY * 0.12;
    if (this.type === W_HOMING && this.target && this.target.hp > 0) {
      const dx = this.target.x - this.x,
        dy = this.target.y - this.y,
        dist = Math.hypot(dx, dy);
      if (dist > 0) {
        this.vx += (dx / dist) * 0.4;
        this.vy += (dy / dist) * 0.4;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 12) {
          this.vx = (this.vx / spd) * 12;
          this.vy = (this.vy / spd) * 12;
        }
      }
      G.particles.push(
        new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 1,
          "smoke",
        ),
      );
    }

    let steps =
      this.type === W_GAUSS ? 800 : Math.ceil(Math.hypot(this.vx, this.vy));
    let dx = this.vx / steps,
      dy = this.vy / steps;
    if (this.type === W_GAUSS) {
      dx = Math.cos(Math.atan2(this.vy, this.vx));
      dy = Math.sin(Math.atan2(this.vy, this.vx));
    }

    for (let i = 0; i < steps; i++) {
      this.x += dx;
      this.y += dy;
      if (this.type === W_BAZOOKA && i % 3 === 0)
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            "smoke",
          ),
        );
      if (this.type === W_BOOMERANG && i % 3 === 0)
        G.particles.push(
          new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 1,
            "smoke",
          ),
        );

      const tx = Math.floor(this.x),
        ty = Math.floor(this.y);
      if (
        tx >= 0 &&
        tx < MAP_W &&
        ty >= 0 &&
        ty < MAP_H &&
        G.terrainMap[ty * MAP_W + tx] === TERRAIN_STICKY
      ) {
        triggerStickyBlock(tx, ty, this.ownerId);
        this.onHit(null);
        return false;
      }

      let hitSolid = isSolid(this.x, this.y),
        hitPlayer = null;

      // GAUSS ignores terrain up to 300px
      if (this.type === W_GAUSS) {
        const dFromStart = Math.hypot(
          this.x - this.startX,
          this.y - this.startY,
        );
        if (hitSolid) {
          if (dFromStart < 300) {
            hitSolid = false;
            // Carve path
            if (i % 5 === 0) jaggedCarve(this.x, this.y, 10);
          }
        }
      }

      if (this.type === W_BOOMERANG && hitSolid) {
        // Boomerang carves and bounces
        jaggedCarve(this.x, this.y, 8);
        hitSolid = false;
        if (i === steps - 1) {
          this.x -= this.vx;
          this.y -= this.vy;
          this.vx *= -0.8;
          this.vy *= -0.8;
        }
      }

      if (!hitSolid) {
        for (const p of G.players) {
          if (
            p.id !== this.ownerId &&
            p.hp > 0 &&
            !p.godMode &&
            Math.hypot(p.x - this.x, p.y - this.y) < p.radius + 4 &&
            !this.hitPlayers.has(p.id)
          ) {
            if (p.shieldActive) {
              playSound("shield_on");
              G.particles.push(
                new Particle(
                  p.x,
                  p.y,
                  (Math.random() - 0.5) * 6,
                  (Math.random() - 0.5) * 6,
                  "smoke",
                ),
              );
              return false;
            }
            hitPlayer = p;
            this.hitPlayers.add(p.id);
            break;
          }
        }
      }
      if (hitSolid || hitPlayer) {
        if (hitSolid) {
          this.x -= dx;
          this.y -= dy;
          if (this.type === W_LASER) {
            let tx = Math.floor(this.x + dx * 2),
              ty = Math.floor(this.y + dy * 2);
            let tType = 0;
            if (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H)
              tType = G.terrainMap[ty * MAP_W + tx];
            if (isSolid(this.x + dx * 2, this.y)) this.vx *= -1;
            if (isSolid(this.x, this.y + dy * 2)) this.vy *= -1;
            dx = this.vx / steps;
            dy = this.vy / steps;
            if (tType === 1 || tType === 7 || tType === 9 || tType === 10) {
              // dirt-like
              jaggedCarve(tx, ty, 5);
              G.visualExplosions.push(new VisualExplosion(tx, ty, 8));
            }
            this.bounces++;
            continue;
          }
        }
        this.onHit(hitPlayer);
        return false;
      }
    }
    this.life--;
    return this.life > 0;
  }

  onHit(hitPlayer: any) {
    const x = this.x,
      y = this.y;
    if (hitPlayer) playSound("hitmarker");
    if (this.type === W_HANDGUN) {
      jaggedCarve(x, y, 7);
      for (let i = 0; i < 2; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 3 - 1,
            "smoke",
          ),
        );
      for (let i = 0; i < 4; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6 - 2,
            "dirt",
          ),
        );
      if (hitPlayer) {
        for (let i = 0; i < 15; i++)
          G.particles.push(
            new Particle(
              x,
              y,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              "blood",
            ),
          );
        hitPlayer.takeDamage(26, this.ownerId);
      }
    } else if (this.type === W_MINIGUN) {
      jaggedCarve(x, y, 9);
      for (let i = 0; i < 3; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4 - 1,
            "smoke",
          ),
        );
      for (let i = 0; i < 4; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6 - 2,
            "dirt",
          ),
        );
      if (hitPlayer) {
        if (Math.random() < 0.8)
          for (let i = 0; i < 8; i++)
            G.particles.push(
              new Particle(
                x,
                y,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                "blood",
              ),
            );
        hitPlayer.takeDamage(5, this.ownerId);
      }
    } else if (this.type === W_SNIPER) {
      jaggedCarve(x, y, 14);
      for (let i = 0; i < 6; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 7 - 2,
            "smoke",
          ),
        );
      if (hitPlayer) {
        for (let i = 0; i < 30; i++)
          G.particles.push(
            new Particle(
              x,
              y,
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 12,
              "blood",
            ),
          );
        hitPlayer.takeDamage(65, this.ownerId);
        hitPlayer.vx += this.vx * 0.45;
        hitPlayer.vy += this.vy * 0.45;
        paintBlood(x, y, 20, 10, true);
      }
    } else if (this.type === W_GAUSS) {
      G.visualExplosions.push(new VisualExplosion(x, y, 20));
      if (hitPlayer) {
        hitPlayer.takeDamage(85, this.ownerId);
      }
    } else if (this.type === W_LASER) {
      jaggedCarve(x, y, 8);
      G.visualExplosions.push(new VisualExplosion(x, y, 15));
      if (hitPlayer) {
        for (let i = 0; i < 15; i++)
          G.particles.push(
            new Particle(
              x,
              y,
              (Math.random() - 0.5) * 12,
              (Math.random() - 0.5) * 12,
              "blood",
            ),
          );
        hitPlayer.takeDamage(45, this.ownerId);
      }
    } else if (this.type === W_SHOTGUN) {
      jaggedCarve(x, y, 8);
      if (hitPlayer) {
        for (let i = 0; i < 12; i++)
          G.particles.push(
            new Particle(
              x,
              y,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              "blood",
            ),
          );
        hitPlayer.takeDamage(20, this.ownerId);
        paintBlood(x, y, 10, 5, true);
      }
    } else if (this.type === W_SUPER_SHOTGUN) {
      jaggedCarve(x, y, 9);
      if (hitPlayer) {
        for (let i = 0; i < 20; i++)
          G.particles.push(
            new Particle(
              x,
              y,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              "blood",
            ),
          );
        hitPlayer.takeDamage(18, this.ownerId);
        paintBlood(x, y, 12, 8, true);
        hitPlayer.vx += this.vx * 0.5;
        hitPlayer.vy += this.vy * 0.5;
      }
    } else if (
      this.type === W_BAZOOKA ||
      this.type === W_HOMING ||
      this.type === W_OIKOTIE
    ) {
      playSound("explosion_bam");
      const isOikotie = this.type === W_OIKOTIE;
      const carveR = isOikotie ? 85 : 48;
      jaggedCarve(x, y, carveR);
      G.visualExplosions.push(new VisualExplosion(x, y, carveR));
      if (isOikotie) {
        G.oikotieMessageTimer = 120;
        G.screenFlash = 0.8;
      }
      G.screenShake += isOikotie ? 60 : 28;
      for (let i = 0; i < (isOikotie ? 60 : 35); i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * (isOikotie ? 18 : 12),
            (Math.random() - 0.5) * (isOikotie ? 18 : 12),
            "smoke",
          ),
        );
      if (isOikotie) {
        G.particles.push(new Particle(x, y, 0, -1.2, "text", "OIKOTIE!"));
      }
      for (const p of G.players) {
        if (p.hp > 0 && !p.godMode && !p.shieldActive) {
          const d = Math.max(Math.hypot(p.x - x, p.y - y), 0.1);
          const dmgR = isOikotie ? 120 : 55;
          if (d < dmgR) {
            let dmg = Math.floor((dmgR - d) * (isOikotie ? 2.5 : 1.3));
            if (isOikotie && d < 40) dmg = 100; // instant kill near center
            p.takeDamage(dmg, this.ownerId);
            p.vx += ((p.x - x) / d) * (isOikotie ? 14 : 9);
            p.vy += ((p.y - y) / d) * (isOikotie ? 14 : 9);
            for (let i = 0; i < (isOikotie ? 40 : 25); i++)
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
      paintBlood(x, y, carveR, 40);
    } else if (this.type === W_DIRTBALL) {
      playSound("explosion_puff");
      buildTerrain(x, y, 22);
      for (let i = 0; i < 12; i++)
        G.particles.push(
          new Particle(
            x,
            y,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            "dirt",
          ),
        );
      G.particles.push(new Particle(x, y, 0, -1, "text", "PUFF"));
      if (hitPlayer) {
        hitPlayer.vx += this.vx * 0.6;
        hitPlayer.vy += this.vy * 0.6;
      }
    } else if (this.type === W_BOOMERANG) {
      if (hitPlayer) hitPlayer.takeDamage(35, this.ownerId);
    }
  }

  draw(c: CanvasRenderingContext2D) {
    if (this.type === W_MINIGUN) {
      c.fillStyle = "#FFA500";
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    } else if (this.type === W_HANDGUN) {
      c.fillStyle = "#FFE500";
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    } else if (this.type === W_SHOTGUN || this.type === W_SUPER_SHOTGUN) {
      c.fillStyle = "#FFC040";
      c.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    } else if (this.type === W_SNIPER) {
      c.strokeStyle = "rgba(255,255,200,0.9)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(this.lastX, this.lastY);
      c.lineTo(this.x, this.y);
      c.stroke();
    } else if (this.type === W_GAUSS) {
      c.strokeStyle = "rgba(100,150,255,0.9)";
      c.lineWidth = 4.0;
      c.beginPath();
      c.moveTo(this.startX, this.startY);
      c.lineTo(this.x, this.y);
      c.stroke();
      c.strokeStyle = "#FFF";
      c.lineWidth = 2.0;
      c.beginPath();
      c.moveTo(this.startX, this.startY);
      c.lineTo(this.x, this.y);
      c.stroke();
    } else if (this.type === W_LASER) {
      c.strokeStyle = "rgba(0,255,100,0.9)";
      c.lineWidth = 3.0;
      c.beginPath();
      c.moveTo(this.lastX, this.lastY);
      c.lineTo(this.x, this.y);
      c.stroke();
      c.strokeStyle = "#FFF";
      c.lineWidth = 1.0;
      c.beginPath();
      c.moveTo(this.lastX, this.lastY);
      c.lineTo(this.x, this.y);
      c.stroke();
    } else if (this.type === W_BAZOOKA) {
      c.fillStyle = "#FF8800";
      c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 3, 3);
    } else if (this.type === W_OIKOTIE) {
      c.fillStyle = "#FF00FF";
      c.beginPath();
      c.arc(Math.floor(this.x), Math.floor(this.y), 4, 0, Math.PI * 2);
      c.fill();
    } else if (this.type === W_HOMING) {
      c.fillStyle = "#FF4444";
      c.fillRect(Math.floor(this.x) - 1, Math.floor(this.y) - 1, 4, 3);
    } else if (this.type === W_DIRTBALL) {
      c.fillStyle = "#8B4513";
      c.beginPath();
      c.arc(Math.floor(this.x), Math.floor(this.y), 3, 0, Math.PI * 2);
      c.fill();
    } else if (this.type === W_BOOMERANG) {
      c.save();
      c.translate(this.x, this.y);
      c.rotate(Date.now() / 50);
      c.fillStyle = "#FFF";
      c.fillRect(-4, -1, 8, 2);
      c.fillRect(-1, -4, 2, 8);
      c.restore();
    }
  }
}
