import {
  G,
  MAP_W,
  MAP_H,
  TERRAIN_EMPTY,
  TERRAIN_DIRT,
  TERRAIN_ROCK,
  TERRAIN_SCORCHED,
  TERRAIN_STICKY,
  TERRAIN_BARREL,
  TERRAIN_INDESTRUCTIBLE,
} from "./globals";
import { playSound } from "./audio";
import { Particle, VisualExplosion } from "./entities";

// Return RGBA array for terrain type at index
export function getTerrainColor(
  type: number,
  idx: number,
): [number, number, number, number] {
  const n = G.terrainNoise[idx] || 0;
  if (type === TERRAIN_DIRT) {
    if (n >= 120) return [220, 220, 200, 255]; // Bone
    if (n >= 100) return [130, 130, 130, 255]; // Gray rock edge
    if (n >= 90) return [150, 150, 150, 255]; // Gray rock core
    if (n >= 50) return [100, 60, 20, 255]; // Dark pebble
    return [
      Math.min(255, 150 + n),
      Math.min(255, 75 + Math.floor(n * 0.5)),
      Math.min(255, 15 + Math.floor(n * 0.2)),
      255,
    ];
  }
  if (type === TERRAIN_ROCK)
    return [
      Math.min(255, 140 + n),
      Math.min(255, 140 + n),
      Math.min(255, 150 + n),
      255,
    ];
  if (type === TERRAIN_SCORCHED)
    return [
      Math.min(255, 45 + n),
      Math.min(255, 40 + n),
      Math.min(255, 40 + n),
      255,
    ];
  if (type === TERRAIN_STICKY) {
    return [
      Math.min(255, 45 + Math.abs(n)),
      Math.min(255, 30 + Math.abs(n) * 0.5),
      Math.min(255, 55 + Math.abs(n)),
      255,
    ];
  }
  if (type === TERRAIN_BARREL) {
    // Reddish explosive barrel
    const isBright = idx % 7 === 0;
    return [isBright ? 200 : 150, 40 + n, 40 + n, 255];
  }
  if (type === TERRAIN_INDESTRUCTIBLE) {
    // Arena block - sleek tech metal
    return [
      Math.min(255, 80 + n * 0.8),
      Math.min(255, 90 + n * 0.8),
      Math.min(255, 100 + n * 0.8),
      255,
    ];
  }
  if (type === 4)
    return [
      Math.min(255, 118 + n),
      Math.min(255, 122 + n),
      Math.min(255, 128 + n),
      255,
    ];
  if (type === 5) return [Math.min(255, 18 + Math.abs(n) * 0.3), 16, 18, 255];
  return [0, 0, 0, 0];
}

export function generateTerrainNoise() {
  for (let i = 0; i < G.terrainNoise.length; i++) {
    G.terrainNoise[i] = Math.floor(Math.random() * 30) - 15;
  }
  // Add pebbles
  for (let j = 0; j < 6000; j++) {
    const idx = Math.floor(Math.random() * G.terrainNoise.length);
    if (G.terrainNoise[idx] < 50) G.terrainNoise[idx] = 50;
  }
  // Add larger rocks / bones
  for (let j = 0; j < 1200; j++) {
    let x = Math.floor(Math.random() * MAP_W);
    let y = Math.floor(Math.random() * MAP_H);
    const isBone = Math.random() < 0.1;
    let val = isBone ? 120 : 90;
    let rw = Math.floor(Math.random() * 4) + 2;
    for (let dy = 0; dy < rw; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        // make it pseudo-circular
        if ((dx - rw / 2) ** 2 + (dy - rw / 2) ** 2 <= (rw / 2) ** 2 + 0.5) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx >= 0 && cx < MAP_W && cy >= 0 && cy < MAP_H) {
            const idx = cy * MAP_W + cx;
            // Give rock a core and edge
            if (!isBone) {
              // if center gives 90, edge gives 100
              const dist = Math.sqrt((dx - rw / 2) ** 2 + (dy - rw / 2) ** 2);
              G.terrainNoise[idx] = dist > rw / 2 - 1 ? 100 : 90;
            } else {
              G.terrainNoise[idx] = 120;
            }
          }
        }
      }
    }
  }
}

export function renderFullTerrainCanvas() {
  if (!G.mapCtx) return;
  const img = G.mapCtx.createImageData(MAP_W, MAP_H);
  for (let i = 0; i < G.terrainMap.length; i++) {
    if (G.terrainMap[i] > 0) {
      const c = getTerrainColor(G.terrainMap[i], i);
      const p = i * 4;
      img.data[p] = c[0];
      img.data[p + 1] = c[1];
      img.data[p + 2] = c[2];
      img.data[p + 3] = 255;
    }
  }
  G.mapCtx.putImageData(img, 0, 0);
}

export function isSolid(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return true;
  return G.terrainMap[Math.floor(y) * MAP_W + Math.floor(x)] > 0;
}

export function fastCarve(
  cx: number,
  cy: number,
  radius: number,
  val: number,
  forceErase = false,
) {
  cx = Math.floor(cx);
  cy = Math.floor(cy);
  const rSq = radius * radius;
  const x0 = Math.max(0, cx - radius),
    x1 = Math.min(MAP_W - 1, cx + radius);
  const y0 = Math.max(0, cy - radius),
    y1 = Math.min(MAP_H - 1, cy + radius);
  for (let y = y0; y <= y1; y++) {
    const dy2 = (y - cy) ** 2,
      row = y * MAP_W;
    for (let x = x0; x <= x1; x++) {
      if (dy2 + (x - cx) ** 2 <= rSq) {
        if (!forceErase && G.terrainMap[row + x] === TERRAIN_ROCK) continue;
        if (!forceErase && G.terrainMap[row + x] === TERRAIN_INDESTRUCTIBLE)
          continue;
        G.terrainMap[row + x] = val;
      }
    }
  }
}

function processBarrelExplosion(startX: number, startY: number) {
  // BFS to find all connected barrel pixels
  const queue = [[startX, startY]];
  const visited = new Set<number>();
  const idx = startY * MAP_W + startX;
  visited.add(idx);

  let count = 0;
  let sumX = 0,
    sumY = 0;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    count++;
    sumX += cx;
    sumY += cy;
    // Mark empty so we don't process again
    G.terrainMap[cy * MAP_W + cx] = TERRAIN_EMPTY;

    // Fast inline neighbors
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = cx + dx,
        ny = cy + dy;
      if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
        const nidx = ny * MAP_W + nx;
        if (G.terrainMap[nidx] === TERRAIN_BARREL && !visited.has(nidx)) {
          visited.add(nidx);
          queue.push([nx, ny]);
        }
      }
    }
  }

  // Calculate explosion size based on pixel count
  const cx = sumX / count;
  const cy = sumY / count;
  const radius = Math.min(120, 15 + Math.sqrt(count) * 2);

  // Trigger blast next frame to avoid recursive deep stack
  setTimeout(() => {
    playSound("explosion_huge");
    jaggedCarve(cx, cy, radius, true);
    G.visualExplosions.push(new VisualExplosion(cx, cy, radius));
    G.screenShake += radius * 0.8;
    // Damage players
    for (const p of G.players) {
      if (p.hp > 0 && !p.godMode && !p.shieldActive) {
        const d = Math.max(Math.hypot(p.x - cx, p.y - cy), 0.1);
        if (d < radius + 15) {
          p.takeDamage(Math.floor((radius + 15 - d) * 1.5), 0);
          p.vx += ((p.x - cx) / d) * 15;
          p.vy += ((p.y - cy) / d) * 15;
        }
      }
    }
  }, 10);
}

export function jaggedCarve(
  cx: number,
  cy: number,
  baseRadius: number,
  skipBarrels = false,
  smooth = false,
): boolean {
  cx = Math.floor(cx);
  cy = Math.floor(cy);
  const maxR = baseRadius + 15;
  const x0 = Math.max(0, cx - maxR),
    x1 = Math.min(MAP_W - 1, cx + maxR);
  const y0 = Math.max(0, cy - maxR),
    y1 = Math.min(MAP_H - 1, cy + maxR);

  if (x0 >= x1 || y0 >= y1 || !G.mapCtx) return false;

  const imgData = G.mapCtx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  let changed = false;
  let hitRock = false;

  const barrelsToTrigger: [number, number][] = [];

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx,
        dy = y - cy;
      const dist = Math.hypot(dx, dy);

      const angle = Math.atan2(dy, dx);
      const noiseVal = smooth
        ? 0
        : Math.sin(angle * 7) * 4 +
          Math.sin(angle * 3 + 1.2) * 3 +
          Math.sin(angle * 13 + 2.5) * 2;
      const effectiveR =
        baseRadius +
        noiseVal +
        (smooth ? 0 : (G.terrainNoise[y * MAP_W + x] || 0) * 0.3);

      if (dist <= effectiveR) {
        const idx = y * MAP_W + x;
        const val = G.terrainMap[idx];

        if (val === TERRAIN_ROCK || val === TERRAIN_INDESTRUCTIBLE) {
          hitRock = true;
          continue;
        }

        if (val > 0) {
          if (val === TERRAIN_DIRT && Math.random() < 0.08) {
            G.particles.push(
              new Particle(
                x,
                y,
                (Math.random() - 0.5) * 15,
                (Math.random() - 0.5) * 15 - 5,
                "dirt",
              ),
            );
          } else if (val === TERRAIN_BARREL && !skipBarrels) {
            barrelsToTrigger.push([x, y]);
          }

          G.terrainMap[idx] = 0;
          G.terrainNoise[idx] = Math.floor(Math.random() * 30) - 15;
          changed = true;
          const lx = x - x0,
            ly = y - y0;
          imgData.data[(ly * (x1 - x0 + 1) + lx) * 4 + 3] = 0;
        }
      }
    }
  }

  if (changed && G.mapCtx) {
    G.mapCtx.putImageData(imgData, x0, y0);
    if (G.bloodCtx) {
      G.bloodCtx.save();
      G.bloodCtx.globalCompositeOperation = "destination-out";
      G.bloodCtx.beginPath();
      // approximate jagged destruction on blood canvas
      G.bloodCtx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      G.bloodCtx.fill();
      G.bloodCtx.restore();
    }
  }

  if (hitRock) playSound("rock_hit");

  // Trigger all hit barrels
  if (barrelsToTrigger.length > 0) {
    for (const [bx, by] of barrelsToTrigger) {
      // Check if still barrel (a previous iteration in this loop might have cleared it,
      // but wait, we already set it to 0. We need to process from this seed point!)
      processBarrelExplosion(bx, by);
      break; // Only need one seed per frame usually for the same chunk, but BFS handles it
    }
  }

  return changed;
}

export function scorchTerrain(cx: number, cy: number, radius: number) {
  cx = Math.floor(cx);
  cy = Math.floor(cy);
  const rSq = radius * radius;
  let changed = false;

  if (cx - radius < 0 || cy - radius < 0 || !G.mapCtx) return;
  const imgData = G.mapCtx.getImageData(
    cx - radius,
    cy - radius,
    radius * 2 + 1,
    radius * 2 + 1,
  );

  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (
        x >= 0 &&
        x < MAP_W &&
        y >= 0 &&
        y < MAP_H &&
        (x - cx) ** 2 + (y - cy) ** 2 <= rSq
      ) {
        const idx = y * MAP_W + x;
        if (G.terrainMap[idx] === TERRAIN_DIRT) {
          G.terrainMap[idx] = TERRAIN_SCORCHED;
          changed = true;
          const c = getTerrainColor(TERRAIN_SCORCHED, idx);
          const lx = x - (cx - radius),
            ly = y - (cy - radius),
            p = (ly * (radius * 2 + 1) + lx) * 4;
          imgData.data[p] = c[0];
          imgData.data[p + 1] = c[1];
          imgData.data[p + 2] = c[2];
          imgData.data[p + 3] = 255;
        }
      }
    }
  }
  if (changed && G.mapCtx)
    G.mapCtx.putImageData(imgData, cx - radius, cy - radius);
}

export function paintRoughRock(cx: number, cy: number, radius: number) {
  if (!G.mapCtx) return false;
  let changed = false;

  // basic noise points for blob
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const rad = radius * (0.6 + Math.random() * 0.4);
    pts.push({ ang, rad });
  }

  const rSq = radius * radius * 1.5;
  const vx = Math.max(0, Math.floor(cx - radius * 1.5));
  const vy = Math.max(0, Math.floor(cy - radius * 1.5));
  const vw = Math.min(MAP_W - vx, Math.ceil(radius * 3));
  const vh = Math.min(MAP_H - vy, Math.ceil(radius * 3));
  if (vw <= 0 || vh <= 0) return false;

  const imgData = G.mapCtx.getImageData(vx, vy, vw, vh);

  for (let y = vy; y < vy + vh; y++) {
    for (let x = vx; x < vx + vw; x++) {
      const dx = x - cx,
        dy = y - cy;
      const ang = Math.atan2(dy, dx);

      // interpolate radius
      const a = (ang + Math.PI * 2) % (Math.PI * 2);
      const seg = (a / (Math.PI * 2)) * 8;
      const idx1 = Math.floor(seg) % 8;
      const idx2 = (idx1 + 1) % 8;
      const fract = seg - Math.floor(seg);
      const rLimit = pts[idx1].rad * (1 - fract) + pts[idx2].rad * fract;

      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= rLimit) {
        const idx = y * MAP_W + x;
        if (G.terrainMap[idx] !== TERRAIN_ROCK) {
          G.terrainMap[idx] = TERRAIN_ROCK;
          changed = true;
        }
        // Highlight top-left (-dx, -dy)
        const nx = dx / rLimit;
        const ny = dy / rLimit;
        // sunlight from top-left: nx < 0, ny < 0
        const light = -(nx * 0.707 + ny * 0.707); // dot product with (-0.7, -0.7)
        const shadowVal = Math.floor(light * 30); // roughly -30 to 30
        G.terrainNoise[idx] = shadowVal;

        const lx = x - vx,
          ly = y - vy,
          p = (ly * vw + lx) * 4;
        const c = getTerrainColor(TERRAIN_ROCK, idx);
        imgData.data[p] = c[0];
        imgData.data[p + 1] = c[1];
        imgData.data[p + 2] = c[2];
        imgData.data[p + 3] = 255;
      }
    }
  }

  if (changed) G.mapCtx.putImageData(imgData, vx, vy);
  return changed;
}

export function paintTerrain(
  cx: number,
  cy: number,
  radius: number,
  material: number,
  shape: "circle" | "square" = "circle",
) {
  cx = Math.floor(cx);
  cy = Math.floor(cy);
  const rSq = radius * radius;
  if (!G.mapCtx) return false;

  const vx = Math.max(0, cx - radius);
  const vy = Math.max(0, cy - radius);
  const vw = Math.min(MAP_W - vx, radius * 2 + 1);
  const vh = Math.min(MAP_H - vy, radius * 2 + 1);
  if (vw <= 0 || vh <= 0) return false;

  const imgData = G.mapCtx.getImageData(vx, vy, vw, vh);
  let changed = false;

  for (let y = vy; y < vy + vh; y++) {
    for (let x = vx; x < vx + vw; x++) {
      let inside = false;
      if (shape === "circle") inside = (x - cx) ** 2 + (y - cy) ** 2 <= rSq;
      else inside = Math.abs(x - cx) <= radius && Math.abs(y - cy) <= radius;

      if (inside) {
        const idx = y * MAP_W + x;
        if (G.terrainMap[idx] !== material) {
          G.terrainMap[idx] = material;
          // Reset noise when overwriting so old rocks/bones don't leave ghosts
          G.terrainNoise[idx] = Math.floor(Math.random() * 30) - 15;
          changed = true;
          const lx = x - vx,
            ly = y - vy,
            p = (ly * vw + lx) * 4;
          if (material === 0) {
            imgData.data[p + 3] = 0; // erase
          } else {
            const c = getTerrainColor(material, idx);
            imgData.data[p] = c[0];
            imgData.data[p + 1] = c[1];
            imgData.data[p + 2] = c[2];
            imgData.data[p + 3] = 255;
          }
        }
      }
    }
  }
  if (changed) G.mapCtx.putImageData(imgData, vx, vy);
  return changed;
}

export function buildTerrain(cx: number, cy: number, radius: number) {
  cx = Math.floor(cx);
  cy = Math.floor(cy);
  const rSq = radius * radius;
  if (!G.mapCtx) return;
  const imgData = G.mapCtx.getImageData(
    cx - radius,
    cy - radius,
    radius * 2 + 1,
    radius * 2 + 1,
  );
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rSq) {
          const idx = y * MAP_W + x;
          if (G.terrainMap[idx] === 0) {
            G.terrainMap[idx] = TERRAIN_DIRT;
            const c = getTerrainColor(TERRAIN_DIRT, idx);
            const lx = x - (cx - radius),
              ly = y - (cy - radius),
              p = (ly * (radius * 2 + 1) + lx) * 4;
            imgData.data[p] = c[0];
            imgData.data[p + 1] = c[1];
            imgData.data[p + 2] = c[2];
            imgData.data[p + 3] = 255;
          }
        }
      }
    }
  }
  G.mapCtx.putImageData(imgData, cx - radius, cy - radius);
}

export function generateTerrain() {
  G.terrainMap.fill(TERRAIN_DIRT);
  generateTerrainNoise();

  // Bottom boundary
  for (let y = 0; y < MAP_H; y++) {
    const row = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      if (y > MAP_H - 22) G.terrainMap[row + x] = 5;
      else if (x < 5 || x > MAP_W - 6 || y < 5) G.terrainMap[row + x] = 4;
    }
  }

  const numRocks = 120 + Math.random() * 80;
  for (let i = 0; i < numRocks; i++) {
    const rx = 50 + Math.random() * (MAP_W - 100),
      ry = 50 + Math.random() * (MAP_H - 100),
      rr = 8 + Math.random() * 18;
    fastCarve(rx, ry, rr, TERRAIN_ROCK, true);
    for (let j = 0; j < 3 + Math.random() * 4; j++)
      fastCarve(
        rx + (Math.random() - 0.5) * rr,
        ry + (Math.random() - 0.5) * rr,
        rr * 0.6,
        TERRAIN_ROCK,
        true,
      );
  }

  // Worm tunnels
  for (let i = 0; i < 40; i++) {
    let wx = Math.random() * MAP_W,
      wy = Math.random() * (MAP_H - 60),
      angle = Math.random() * Math.PI * 2,
      r = 4 + Math.random() * 6,
      life = 40 + Math.random() * 80;
    while (life > 0) {
      fastCarve(wx, wy, r, TERRAIN_EMPTY, true);
      wx += Math.cos(angle) * 6;
      wy += Math.sin(angle) * 6;
      angle += (Math.random() - 0.5) * 1.8;
      r += (Math.random() - 0.5) * 1.0;
      r = Math.max(3, Math.min(10, r));
      if (wx < 25 || wx > MAP_W - 25) angle = Math.PI - angle;
      if (wy < 25 || wy > MAP_H - 55) angle = -angle;
      life--;
    }
  }

  // Open caves
  for (let i = 0; i < 30; i++)
    fastCarve(
      50 + Math.random() * (MAP_W - 100),
      50 + Math.random() * (MAP_H - 100),
      10 + Math.random() * 15,
      TERRAIN_EMPTY,
      true,
    );

  // Surface grass/indent
  for (let x = 0; x < MAP_W; x++) {
    const depth = 12 + Math.sin(x * 0.004) * 6 + Math.sin(x * 0.012) * 4;
    for (let y = 0; y < depth; y++)
      if (G.terrainMap[y * MAP_W + x] === TERRAIN_DIRT)
        G.terrainMap[y * MAP_W + x] = TERRAIN_EMPTY;
  }

  renderFullTerrainCanvas();
}

export function generateArenaTerrain() {
  G.terrainMap.fill(TERRAIN_EMPTY);
  generateTerrainNoise();

  // Build symmetrical blocks
  // Frame
  for (let x = 0; x < MAP_W; x++) {
    fastCarve(x, 10, 10, TERRAIN_INDESTRUCTIBLE, true);
    fastCarve(x, MAP_H - 10, 10, TERRAIN_INDESTRUCTIBLE, true);
  }
  for (let y = 0; y < MAP_H; y++) {
    fastCarve(10, y, 10, TERRAIN_INDESTRUCTIBLE, true);
    fastCarve(MAP_W - 10, y, 10, TERRAIN_INDESTRUCTIBLE, true);
  }

  // Floating platforms
  const pWidth = 150;
  const pHeight = 25;
  for (let x = MAP_W / 2 - pWidth / 2; x < MAP_W / 2 + pWidth / 2; x++) {
    for (let y = MAP_H / 2 - pHeight / 2; y < MAP_H / 2 + pHeight / 2; y++) {
      G.terrainMap[y * MAP_W + x] = TERRAIN_INDESTRUCTIBLE;
    }
  }

  for (let x = MAP_W / 4 - pWidth / 2; x < MAP_W / 4 + pWidth / 2; x++) {
    for (let y = MAP_H / 3 - pHeight / 2; y < MAP_H / 3 + pHeight / 2; y++) {
      G.terrainMap[y * MAP_W + x] = TERRAIN_INDESTRUCTIBLE;
      G.terrainMap[y * MAP_W + (MAP_W - x)] = TERRAIN_INDESTRUCTIBLE;
    }
  }

  for (let x = MAP_W / 5 - pWidth / 2; x < MAP_W / 5 + pWidth / 2; x++) {
    for (
      let y = MAP_H / 1.5 - pHeight / 2;
      y < MAP_H / 1.5 + pHeight / 2;
      y++
    ) {
      G.terrainMap[y * MAP_W + x] = TERRAIN_INDESTRUCTIBLE;
      G.terrainMap[y * MAP_W + (MAP_W - x)] = TERRAIN_INDESTRUCTIBLE;
    }
  }

  renderFullTerrainCanvas();
}

export function paintBlood(
  x: number,
  y: number,
  radius: number,
  count: number,
  forceBones = false,
) {
  if (!G.bloodCtx || G.settingGore === 0) return;
  const mult = G.settingGore === 2 ? 5 : 1;
  const drawBones = forceBones && G.settingBones;

  for (let i = 0; i < count * mult; i++) {
    const angle = Math.random() * Math.PI * 2,
      dist = Math.random() * radius;
    const bx = Math.floor(x + Math.cos(angle) * dist),
      by = Math.floor(y + Math.sin(angle) * dist);
    if (!isSolid(bx, by + 1)) continue;

    if (drawBones && Math.random() < 0.15) {
      G.bloodCtx.fillStyle = `rgba(240,240,240,0.9)`;
      G.bloodCtx.fillRect(bx, by, 3, 3);
    } else {
      const r = 150 + Math.floor(Math.random() * 80),
        g = Math.floor(Math.random() * 15),
        b = Math.floor(Math.random() * 15),
        a = 0.7 + Math.random() * 0.3;
      G.bloodCtx.fillStyle = `rgba(${r},${g},${b},${a})`;
      G.bloodCtx.fillRect(bx, by, 2, 2);
    }
  }
}

export function compressMap(map: Uint8Array): string {
  let result = "";
  let currentVal = map[0];
  let runLength = 1;
  const len = map.length;

  for (let i = 1; i < len; i++) {
    const val = map[i];
    if (val === currentVal) {
      runLength++;
    } else {
      result += currentVal.toString(36) + "x" + runLength.toString(36) + ",";
      currentVal = val;
      runLength = 1;
    }
  }
  result += currentVal.toString(36) + "x" + runLength.toString(36);
  return result;
}

export function decompressMap(rleStr: string): Uint8Array {
  const map = new Uint8Array(1200 * 600);
  let idx = 0;
  const parts = rleStr.split(",");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const sub = part.split("x");
    if (sub.length !== 2) continue;
    const val = parseInt(sub[0], 36);
    const count = parseInt(sub[1], 36);
    for (let j = 0; j < count; j++) {
      if (idx < map.length) {
        map[idx++] = val;
      }
    }
  }
  return map;
}

export function generateTemplateMap(source: string) {
  if (source === "ARENA_TEMPLATE") {
    generateArenaTerrain();
  } else {
    generateTerrain();
  }
}
