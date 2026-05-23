import { G, MAP_W, MAP_H, CANVAS_W, CANVAS_H, STATE_MENU, TERRAIN_EMPTY, TERRAIN_DIRT, TERRAIN_ROCK, TERRAIN_INDESTRUCTIBLE, t } from './globals';
import { renderFullTerrainCanvas, getTerrainColor, paintTerrain, paintRoughRock, generateTerrainNoise } from './map';
import { getGamepadInput, gpIs } from './main';

export let editorCursorX = MAP_W/2;
export let editorCursorY = MAP_H/2;
export let cameraX = MAP_W/2;
export let cameraY = MAP_H/2;
export let editorBrushSize = 10;
export let editorZoom = 1;
export let editorBrushShape: 'circle' | 'square' = 'circle';

const edMaterials = [TERRAIN_EMPTY, TERRAIN_DIRT, TERRAIN_ROCK, TERRAIN_INDESTRUCTIBLE, -1, -2];
const edMaterialNames = ["ERASE", "DIRT", "ROCK", "METAL", "RANDOM ROCK", "SPAWN P."];
let edMatIdx = 1;

let actionCooldown = 0;
let edUnsaved = false;
let edShowHelp = true;
let edConfirmExit = false;
let edConfirmSel = 0;

const MAX_HISTORY = 30;
let undoStack: { map: Uint8Array, noise: Int8Array }[] = [];
let redoStack: { map: Uint8Array, noise: Int8Array }[] = [];
let isDrawing = false;

function pushUndo() {
    if (!G.terrainMap || !G.terrainNoise) return;
    undoStack.push({ map: new Uint8Array(G.terrainMap), noise: new Int8Array(G.terrainNoise) });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
}

function performUndo() {
    if (undoStack.length > 0 && G.terrainMap) {
        redoStack.push({ map: new Uint8Array(G.terrainMap), noise: new Int8Array(G.terrainNoise) });
        const state = undoStack.pop()!;
        G.terrainMap = state.map;
        G.terrainNoise = state.noise;
        renderFullTerrainCanvas();
        edUnsaved = true;
    }
}

function performRedo() {
    if (redoStack.length > 0 && G.terrainMap) {
        undoStack.push({ map: new Uint8Array(G.terrainMap), noise: new Int8Array(G.terrainNoise) });
        const state = redoStack.pop()!;
        G.terrainMap = state.map;
        G.terrainNoise = state.noise;
        renderFullTerrainCanvas();
        edUnsaved = true;
    }
}

export function updateEditor() {
  if(actionCooldown > 0) actionCooldown--;
  const speed = G.keys.ShiftLeft ? 10 : 3;

  const gp = getGamepadInput(0);

  if (edConfirmExit) {
      if (G.keys.ArrowLeft || (gp && (gpIs(gp, 'LEFT') || (gp.axes && gp.axes[0] < -0.2)))) {
          if (actionCooldown === 0) { actionCooldown = 15; edConfirmSel = 0; }
      }
      if (G.keys.ArrowRight || (gp && (gpIs(gp, 'RIGHT') || (gp.axes && gp.axes[0] > 0.2)))) {
          if (actionCooldown === 0) { actionCooldown = 15; edConfirmSel = 1; }
      }
      if (G.keys.Enter || G.keys.Space || (gp && gpIs(gp, 'SELECT'))) {
          if (actionCooldown === 0) {
              if (edConfirmSel === 0) {
                  // YES, exit without save
                  G.terrainMap = new Uint8Array(MAP_W * MAP_H); 
                  edConfirmExit = false;
                  edUnsaved = false;
                  G.gameState = STATE_MENU;
                  actionCooldown = 30;
                  G.customSpawns = [];
              } else {
                  // NO, return to editor
                  edConfirmExit = false;
                  actionCooldown = 30;
              }
          }
      }
      return;
  }

  const viewW = CANVAS_W / editorZoom;
  const viewH = CANVAS_H / editorZoom;
  
  if (G.keys.KeyO) { editorZoom = Math.max(0.25, editorZoom - 0.03); }
  if (G.keys.KeyL) { editorZoom = Math.min(2.0, editorZoom + 0.03); }
  
  const moveLeft = G.keys.ArrowLeft || (gp && (gpIs(gp, 'LEFT') || (gp.axes && gp.axes[0] < -0.2)));
  const moveRight = G.keys.ArrowRight || (gp && (gpIs(gp, 'RIGHT') || (gp.axes && gp.axes[0] > 0.2)));
  const moveUp = G.keys.ArrowUp || (gp && (gpIs(gp, 'UP') || (gp.axes && gp.axes[1] < -0.2)));
  const moveDown = G.keys.ArrowDown || (gp && (gpIs(gp, 'DOWN') || (gp.axes && gp.axes[1] > 0.2)));

  if (gp && (moveLeft || moveRight || moveUp || moveDown || gp.buttons?.some((b:any)=>b.pressed))) {
     G.usingMouse = false;
  }

  if (moveLeft) cameraX -= speed / editorZoom;
  if (moveRight) cameraX += speed / editorZoom;
  if (moveUp) cameraY -= speed / editorZoom;
  if (moveDown) cameraY += speed / editorZoom;

  if (cameraX < viewW/2) cameraX = viewW/2;
  if (cameraY < viewH/2) cameraY = viewH/2;
  if (cameraX > MAP_W - viewW/2) cameraX = MAP_W - viewW/2;
  if (cameraY > MAP_H - viewH/2) cameraY = MAP_H - viewH/2;

  let vx = cameraX - viewW/2;
  let vy = cameraY - viewH/2;

  if (G.usingMouse) {
      editorCursorX = vx + Math.max(0, Math.min(CANVAS_W, G.mouseX)) / editorZoom;
      editorCursorY = vy + Math.max(0, Math.min(CANVAS_H, G.mouseY)) / editorZoom;
  } else {
      editorCursorX = cameraX;
      editorCursorY = cameraY;
  }
  
  if (editorCursorX < 0) editorCursorX = 0;
  if (editorCursorX > MAP_W) editorCursorX = MAP_W;
  if (editorCursorY < 0) editorCursorY = 0;
  if (editorCursorY > MAP_H) editorCursorY = MAP_H;
  
  if (G.keys.Digit1) editorBrushSize = 5;
  if (G.keys.Digit2) editorBrushSize = 15;
  if (G.keys.Digit3) editorBrushSize = 30;
  
  if (Math.abs(G.mouseWheelDelta) > 0) {
      editorBrushSize = Math.max(2, Math.min(100, editorBrushSize - Math.sign(G.mouseWheelDelta) * 2));
      G.mouseWheelDelta = 0;
  }
  
  // Dpad up/down for brush size on controller
  if (gp && gp.buttons && gp.buttons[12] && gp.buttons[12].pressed && actionCooldown === 0) { actionCooldown = 5; editorBrushSize = Math.min(100, editorBrushSize+2); }
  if (gp && gp.buttons && gp.buttons[13] && gp.buttons[13].pressed && actionCooldown === 0) { actionCooldown = 5; editorBrushSize = Math.max(2, editorBrushSize-2); }
  
  // Change material (L2 on controller, or Space on keyboard)
  if ((gp && gp.buttons && gp.buttons[6]?.pressed && actionCooldown === 0)) { actionCooldown = 15; edMatIdx = (edMatIdx+1)%edMaterials.length; } // L2 changes item
  if (G.keys.Space && actionCooldown === 0) { actionCooldown = 15; edMatIdx = (edMatIdx+1)%edMaterials.length; } 
  
  // Change shape (X on keyboard or Dpad Left/Right)
  if (G.keys.KeyX && actionCooldown === 0) { actionCooldown = 15; editorBrushShape = editorBrushShape === 'circle' ? 'square' : 'circle'; }
  if (gp && gp.buttons && (gp.buttons[14]?.pressed || gp.buttons[15]?.pressed) && actionCooldown === 0) { actionCooldown = 15; editorBrushShape = editorBrushShape === 'circle' ? 'square' : 'circle'; }

  if (G.keys.KeyH && actionCooldown === 0) { actionCooldown = 15; edShowHelp = !edShowHelp; }
  
  if (G.keys.KeyT && actionCooldown === 0) {
      actionCooldown = 30;
      pushUndo();
      G.customSpawns = [
          {x: 100, y: 100}, {x: MAP_W - 100, y: 100},
          {x: 100, y: MAP_H - 100}, {x: MAP_W - 100, y: MAP_H - 100},
          {x: 100, y: Math.floor(MAP_H/2)}, {x: MAP_W - 100, y: Math.floor(MAP_H/2)},
          {x: Math.floor(MAP_W/2), y: 100}, {x: Math.floor(MAP_W/2), y: MAP_H - 100}
      ];
      edUnsaved = true;
  }

  // Undo / Redo
  if (G.keys.KeyZ && (G.keys.ControlLeft || G.keys.ControlRight) && actionCooldown === 0) {
      actionCooldown = 15;
      if (G.keys.ShiftLeft || G.keys.ShiftRight) {
          performRedo();
      } else {
          performUndo();
      }
  }
  if (G.keys.KeyY && (G.keys.ControlLeft || G.keys.ControlRight) && actionCooldown === 0) {
      actionCooldown = 15;
      performRedo();
  }

  // Fill Background (B on keyboard)
  if (G.keys.KeyB && actionCooldown === 0) {
      actionCooldown = 30;
      pushUndo();
      if (!G.terrainMap || G.terrainMap.length !== MAP_W * MAP_H) {
         G.terrainMap = new Uint8Array(MAP_W * MAP_H);
      }
      G.terrainMap.fill(edMaterials[edMatIdx]);
      if (typeof generateTerrainNoise === 'function') generateTerrainNoise();
      renderFullTerrainCanvas();
      edUnsaved = true;
  }

  if (G.keys.Escape || (gp && gpIs(gp, 'BACK'))) {
     if (edUnsaved) {
         if (actionCooldown === 0) {
            edConfirmExit = true;
            edConfirmSel = 1; // Default NO
            actionCooldown = 30;
         }
     } else {
         G.gameState = STATE_MENU;
         G.customSpawns = [];
     }
  }
  
  // L1 Load map
  if ((G.keys.KeyI || (gp && gp.buttons && gp.buttons[5]?.pressed)) && actionCooldown === 0) {
      actionCooldown = 30;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e: any) => {
         const file = e.target.files[0];
         if(!file) return;
         const reader = new FileReader();
         reader.onload = (re) => {
            try {
               const data = JSON.parse(re.target?.result as string);
               if(data.map) G.terrainMap = new Uint8Array(data.map);
               if(data.spawns && Array.isArray(data.spawns)) {
                   G.customSpawns = data.spawns;
               } else {
                   G.customSpawns = [];
               }
               renderFullTerrainCanvas();
               edUnsaved = false;
            } catch (e) { console.error("Editor load failed", e); }
         };
         reader.readAsText(file);
      };
      input.click();
  }
  
  // L1 Save map
  if ((G.keys.KeyP || (gp && gp.buttons && gp.buttons[4]?.pressed)) && actionCooldown === 0) {
      actionCooldown = 30;
      if (G.terrainMap) {
         // Also save spawn points
         const out = { map: Array.from(G.terrainMap), spawns: G.customSpawns };
         const blob = new Blob([JSON.stringify(out)], {type: "application/json"});
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a'); 
         a.href = url; a.download = "punkkipeli_level.json"; 
         a.click();
         edUnsaved = false;
      }
  }

  // Remove spawn point
  if (G.keys.KeyK && actionCooldown === 0) {
      actionCooldown = 15;
      for (let i = 0; i < G.customSpawns.length; i++) {
          const dx = G.customSpawns[i].x - editorCursorX;
          const dy = G.customSpawns[i].y - editorCursorY;
          if (dx*dx + dy*dy < 400) { // 20 radius hovering
              G.customSpawns.splice(i, 1);
              edUnsaved = true;
              break;
          }
      }
  }
  
  // Left click, Space, R2
  const drawingInput = G.mouseDown || G.rightMouseDown || (gp && (gpIs(gp, 'SELECT') || (gp.buttons && gp.buttons[7]?.pressed)));
  if (drawingInput) {
    if (!isDrawing) {
        isDrawing = true;
        pushUndo();
    }
    if (!G.terrainMap || G.terrainMap.length !== MAP_W * MAP_H) {
      G.terrainMap = new Uint8Array(MAP_W * MAP_H);
    }
    const mat = G.rightMouseDown ? 0 : edMaterials[edMatIdx];
    
    if (mat === -1 && !G.rightMouseDown) {
        // Random Rock generator
        if (actionCooldown === 0) {
            const randomSize = Math.floor(Math.random() * 20) + 10;
            const rx = editorCursorX + (Math.random() * 80 - 40);
            const ry = editorCursorY + (Math.random() * 80 - 40);
            if (paintRoughRock(rx, ry, randomSize)) {
                edUnsaved = true;
            }
            actionCooldown = 10;
        }
    } else if (mat === -2 && !G.rightMouseDown) {
        // Spawn Point
        if (actionCooldown === 0) {
            if (G.customSpawns.length < 12) {
                G.customSpawns.push({x: editorCursorX, y: editorCursorY});
                edUnsaved = true;
            }
            actionCooldown = 60; // 1 second delay
        }
    } else {
        if (paintTerrain(editorCursorX, editorCursorY, editorBrushSize, mat, editorBrushShape)) {
            edUnsaved = true;
        }
    }
  } else {
      isDrawing = false;
  }
}
 
export function drawEditor(ctx: CanvasRenderingContext2D) {
  // Clear screen to avoid ghosting from previous game state
  ctx.fillStyle = '#2f2118';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const viewW = CANVAS_W / editorZoom;
  const viewH = CANVAS_H / editorZoom;
  let vx = cameraX - viewW/2;
  let vy = cameraY - viewH/2;
  if (vx < 0) vx = 0; if (vx > MAP_W - viewW) vx = MAP_W - viewW;
  if (vy < 0) vy = 0; if (vy > MAP_H - viewH) vy = MAP_H - viewH;

  if (G.mapCanvas) {
      ctx.drawImage(G.mapCanvas, vx, vy, viewW, viewH, 0, 0, CANVAS_W, CANVAS_H);
      
      ctx.save();
      ctx.scale(editorZoom, editorZoom);

      // Draw spawn points
      ctx.fillStyle = '#0F0';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      for (let i = 0; i < G.customSpawns.length; i++) {
          const sp = G.customSpawns[i];
          ctx.beginPath();
          ctx.arc(sp.x - vx, sp.y - vy, 10, 0, Math.PI*2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#000';
          ctx.font = "12px 'VT323',monospace";
          ctx.textAlign = 'center';
          ctx.fillText((i+1).toString(), sp.x - vx, sp.y - vy + 4);
          ctx.fillStyle = '#0F0';
          ctx.textAlign = 'left';
      }
      ctx.lineWidth = 1;
      
      ctx.strokeStyle = edMatIdx===0 ? '#F00' : '#0F0';
      ctx.beginPath();
      if (editorBrushShape === 'circle') {
          ctx.arc(editorCursorX - vx, editorCursorY - vy, editorBrushSize, 0, Math.PI*2);
      } else {
          ctx.strokeRect(editorCursorX - vx - editorBrushSize, editorCursorY - vy - editorBrushSize, editorBrushSize*2, editorBrushSize*2);
      }
      ctx.stroke();
      ctx.restore();
  }
  
  const gp = getGamepadInput(0);
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 240, 185);
  ctx.fillStyle='#FFF'; ctx.font="14px 'VT323',monospace";
  const name = !G.usingMouse && gp ? "CONTROLLER" : "MOUSE/KEYBOARD";
  ctx.fillText(t("LEVEL EDITOR - ") + name, 10, 20);
  ctx.fillStyle='#AAA'; ctx.font="12px 'VT323',monospace";
  
  if (edShowHelp) {
      if (!G.usingMouse && gp) {
          ctx.fillText("L-Stick/Dpad: Move cursor", 10, 40);
          ctx.fillText("R2: Draw", 10, 55);
          ctx.fillText("L2: Toggle Item (Dirt/Rock/Erase)", 10, 70);
          ctx.fillText("Dpad Up/Down: Brush Size", 10, 85);
          ctx.fillText("Dpad Left/Right: Brush Shape", 10, 100);
          ctx.fillText("Start: Quit to Menu", 10, 115);
          ctx.fillText("R1: Load map | L1: Save map", 10, 130);
          ctx.fillText("H: Toggle Help | T: Spawn Template", 10, 145);
      } else {
          ctx.fillText("Arrows/Mouse: Move cursor | K: Rem Spawn", 10, 40);
          ctx.fillText("L-Click: Draw | R-Click: Erase", 10, 55);
          ctx.fillText("Space: Cycle Item", 10, 70);
          ctx.fillText("B: Fill Map | Ctrl+Z/Y: Undo/Redo", 10, 85);
          ctx.fillText("Wheel / 1-3: Brush Size | O/L: Zoom", 10, 100);
          ctx.fillText("X: Toggle Brush Shape", 10, 115);
          ctx.fillText("Esc: Quit to Menu", 10, 130);
          ctx.fillText("I/P: Load/Save | H: Help | T: Spawn Template", 10, 145);
      }
  } else {
      ctx.fillText("Press H to show Help", 10, 40);
  }

  ctx.fillStyle = edMatIdx===0?'#F00':'#0F0';
  const showHelpOffset = edShowHelp ? 165 : 60;
  ctx.fillText(`Mode: ${t(edMaterialNames[edMatIdx])} Size: ${editorBrushSize} ${editorBrushShape.toUpperCase()}`, 10, showHelpOffset);
  
  ctx.fillStyle = G.customSpawns.length < 12 ? '#FF0' : '#F00';
  // Laitettu ja Jäljellä
  ctx.fillText(`Spawns placed: ${G.customSpawns.length} | Remaining: ${12 - G.customSpawns.length}`, 10, showHelpOffset + 15);
  
  if (edUnsaved) {
      ctx.fillStyle = '#FFAA00';
      ctx.fillText(t("UNSAVED CHANGES"), 10, showHelpOffset + 30);
  }

  // Minimap
  if (G.mapCanvas) {
     const mmW = 120;
     const mmH = 60;
     const mmX = CANVAS_W - mmW - 10;
     const mmY = 10;
     ctx.strokeStyle = '#444';
     ctx.strokeRect(mmX-1, mmY-1, mmW+2, mmH+2);
     ctx.fillStyle = 'rgba(0,0,0,0.8)';
     ctx.fillRect(mmX, mmY, mmW, mmH);
     ctx.globalAlpha = 0.8;
     ctx.drawImage(G.mapCanvas, 0, 0, MAP_W, MAP_H, mmX, mmY, mmW, mmH);
     ctx.globalAlpha = 1.0;
     
     // cursor pos on minimap
     ctx.fillStyle = '#F00';
     ctx.fillRect(mmX + (editorCursorX/MAP_W)*mmW - 2, mmY + (editorCursorY/MAP_H)*mmH - 2, 4, 4);
     
     // viewport rect
     ctx.strokeStyle = 'rgba(255,255,255,0.5)';
     ctx.strokeRect(mmX + (vx/MAP_W)*mmW, mmY + (vy/MAP_H)*mmH, (viewW/MAP_W)*mmW, (viewH/MAP_H)*mmH);
  }

  if (edConfirmExit) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFF';
      ctx.font = "24px 'VT323',monospace";
      ctx.textAlign = 'center';
      ctx.fillText(t("UNSAVED_TITLE"), CANVAS_W/2, CANVAS_H/2 - 20);
      
      const txtYes = edConfirmSel === 0 ? "> " + t("YES") + " <" : t("YES");
      const txtNo = edConfirmSel === 1 ? "> " + t("NO") + " <" : t("NO");
      
      ctx.fillStyle = edConfirmSel === 0 ? '#0F0' : '#AAA';
      ctx.fillText(txtYes, CANVAS_W/2 - 50, CANVAS_H/2 + 20);
      
      ctx.fillStyle = edConfirmSel === 1 ? '#0F0' : '#AAA';
      ctx.fillText(txtNo, CANVAS_W/2 + 50, CANVAS_H/2 + 20);
      ctx.textAlign = 'left';
  }
}

