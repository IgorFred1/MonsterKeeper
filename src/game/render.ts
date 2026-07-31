import { ENEMIES, ITEMS } from "./items";
import { MAPS } from "./maps";
import type { GameState } from "./types";

export const TILE = 22;

const cache = new Map<string, HTMLCanvasElement>();

function hash(i: number, j: number, salt: number) {
  const n = Math.sin(i * 127.1 + j * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function bakeMap(mapId: string) {
  const map = MAPS[mapId]!;
  const w = map.rows[0]!.length;
  const h = map.rows.length;
  const c = document.createElement("canvas");
  c.width = w * TILE;
  c.height = h * TILE;
  const ctx = c.getContext("2d")!;
  const S = TILE / 4;

  for (let j = 0; j < h; j++) {
    const row = map.rows[j]!;
    for (let i = 0; i < w; i++) {
      const ch = row[i]!;
      const t = map.palette[ch];
      if (!t) continue;
      ctx.fillStyle = t.base;
      ctx.fillRect(i * TILE, j * TILE, TILE, TILE);
      // textura pixelada
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const r = hash(i * 4 + sx, j * 4 + sy, 3);
          if (r > 0.78) {
            ctx.fillStyle = t.speck;
            ctx.fillRect(i * TILE + sx * S, j * TILE + sy * S, S, S);
          } else if (r < 0.16 && t.speck2) {
            ctx.fillStyle = t.speck2;
            ctx.fillRect(i * TILE + sx * S, j * TILE + sy * S, S, S);
          }
        }
      if (t.tall) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(i * TILE, j * TILE + TILE - S, TILE, S);
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(i * TILE, j * TILE, TILE, S / 2);
      }
    }
  }
  // portais brilhando
  for (const p of map.portals) {
    ctx.fillStyle = "rgba(226,178,74,0.22)";
    ctx.fillRect(p.x * TILE, p.y * TILE, TILE, TILE);
    ctx.fillStyle = "rgba(226,178,74,0.6)";
    ctx.fillRect(p.x * TILE + 2, p.y * TILE + TILE - 4, TILE - 4, 2);
  }
  cache.set(mapId, c);
  return c;
}

function humanoid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  body: string,
  accent: string,
  skin: string,
  facing: number,
  bob: number,
) {
  const u = Math.max(2, Math.round((TILE * size) / 8));
  const x = Math.round(cx - u * 2);
  const y = Math.round(cy - u * 6 + bob);
  // sombra
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x - u, cy - u * 0.5, u * 6, u);
  // pernas
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + u * 4, u * 1.5, u * 2);
  ctx.fillRect(x + u * 2.5, y + u * 4, u * 1.5, u * 2);
  // tronco
  ctx.fillStyle = body;
  ctx.fillRect(x, y + u * 2, u * 4, u * 2.4);
  // braços
  ctx.fillStyle = accent;
  ctx.fillRect(facing > 0 ? x + u * 4 : x - u, y + u * 2.2, u, u * 1.8);
  // cabeça
  ctx.fillStyle = skin;
  ctx.fillRect(x + u * 0.8, y, u * 2.6, u * 2);
  // olhos
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(facing > 0 ? x + u * 2.4 : x + u * 1.2, y + u * 0.8, u * 0.6, u * 0.6);
}

function beast(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  body: string,
  accent: string,
  facing: number,
  bob: number,
) {
  const u = Math.max(2, Math.round((TILE * size) / 8));
  const x = Math.round(cx - u * 3);
  const y = Math.round(cy - u * 4 + bob);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x, cy - u * 0.5, u * 6, u);
  ctx.fillStyle = body;
  ctx.fillRect(x, y + u, u * 6, u * 2.6);
  ctx.fillStyle = accent;
  ctx.fillRect(x + u, y + u * 3.4, u, u * 1.2);
  ctx.fillRect(x + u * 4, y + u * 3.4, u, u * 1.2);
  ctx.fillStyle = body;
  const hx = facing > 0 ? x + u * 5 : x - u;
  ctx.fillRect(hx, y, u * 2, u * 2);
  ctx.fillStyle = "#d9483c";
  ctx.fillRect(facing > 0 ? hx + u : hx + u * 0.4, y + u * 0.6, u * 0.6, u * 0.6);
}

export function render(
  canvas: HTMLCanvasElement,
  s: GameState,
  hoverTarget: { x: number; y: number } | null,
) {
  const ctx = canvas.getContext("2d")!;
  const map = MAPS[s.mapId]!;
  const baked = cache.get(s.mapId) ?? bakeMap(s.mapId);
  ctx.imageSmoothingEnabled = false;

  const vw = canvas.width;
  const vh = canvas.height;
  ctx.fillStyle = map.ambient;
  ctx.fillRect(0, 0, vw, vh);

  let camX = s.player.x * TILE - vw / 2;
  let camY = s.player.y * TILE - vh / 2;
  camX = Math.max(0, Math.min(baked.width - vw, camX));
  camY = Math.max(0, Math.min(baked.height - vh, camY));
  camX = Math.round(camX);
  camY = Math.round(camY);

  ctx.drawImage(baked, -camX, -camY);

  const wx = (x: number) => x * TILE - camX;
  const wy = (y: number) => y * TILE - camY;

  // alvo de movimento
  if (hoverTarget) {
    ctx.strokeStyle = "rgba(226,178,74,0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(hoverTarget.x) * TILE - camX + 1, Math.floor(hoverTarget.y) * TILE - camY + 1, TILE - 2, TILE - 2);
  }

  const zone = s.world[s.mapId]!;

  // drops
  for (const d of zone.drops) {
    const item = d.item ? ITEMS[d.item] : null;
    ctx.fillStyle = d.gold ? "#e2b24a" : (item?.tint ?? "#ccc");
    const pulse = Math.sin(s.time * 4 + d.x) * 1;
    ctx.fillRect(Math.round(wx(d.x) - 3), Math.round(wy(d.y) - 3 + pulse), 6, 6);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(Math.round(wx(d.x) - 4), Math.round(wy(d.y) + 4), 8, 2);
  }

  // NPCs
  for (const n of map.npcs) {
    const cx = wx(n.x + 0.5);
    const cy = wy(n.y + 0.9);
    if (cx < -40 || cx > vw + 40 || cy < -40 || cy > vh + 40) continue;
    humanoid(ctx, cx, cy, 0.85, n.robe, "#2b2620", n.skin, 1, Math.sin(s.time * 2 + n.x) * 0.6);
    ctx.fillStyle = "rgba(226,178,74,0.95)";
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(n.name, cx, cy - TILE * 1.5);
  }

  // inimigos
  for (const e of zone.enemies) {
    if (e.dead) continue;
    const def = ENEMIES[e.def]!;
    const cx = wx(e.x);
    const cy = wy(e.y + 0.4);
    if (cx < -60 || cx > vw + 60 || cy < -60 || cy > vh + 60) continue;
    const bob = Math.sin(s.time * 7 + e.x * 3) * 0.8;
    const body = e.hurt > 0 ? "#f2f2f2" : def.body;
    if (e.def === "bandido" || e.def === "esqueleto" || e.def === "carniceiro")
      humanoid(ctx, cx, cy, def.size, body, def.accent, e.def === "esqueleto" ? "#ded7c4" : "#c69a76", e.facing, bob);
    else beast(ctx, cx, cy, def.size, body, def.accent, e.facing, bob);
    // barra de vida
    const w = Math.round(TILE * def.size);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(Math.round(cx - w / 2), Math.round(cy - TILE * def.size - 8), w, 3);
    ctx.fillStyle = "#b8343a";
    ctx.fillRect(Math.round(cx - w / 2), Math.round(cy - TILE * def.size - 8), Math.round((w * e.hp) / e.maxHp), 3);
  }

  // jogador
  const px = wx(s.player.x);
  const py = wy(s.player.y + 0.4);
  humanoid(
    ctx,
    px,
    py,
    0.85,
    s.player.hurt > 0 ? "#f4d0d0" : "#5c6b4a",
    "#3a2f22",
    "#d8a878",
    s.player.facing,
    Math.sin(s.time * 8) * 0.5,
  );
  if (s.player.cooldown > 0.35) {
    ctx.fillStyle = "rgba(255,235,190,0.8)";
    ctx.fillRect(Math.round(px + s.player.facing * 8 - 3), Math.round(py - TILE * 0.9), 6, 3);
  }

  // vinheta
  const grd = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.28, vw / 2, vh / 2, vh * 0.78);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, vw, vh);
}
