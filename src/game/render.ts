import { ENEMIES, ITEMS } from "./items";
import { MAPS } from "./maps";
import type { GameState, MapDef, Prop, TileStyle } from "./types";

export const TW = 32; // largura do losango
export const TH = 16; // altura do losango
export const HZ = 16; // altura de uma unidade vertical

const floorCache = new Map<string, HTMLCanvasElement>();

function hash(i: number, j: number, salt: number) {
  const n = Math.sin(i * 127.1 + j * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function originX(map: MapDef) {
  return map.rows.length * (TW / 2);
}
const PAD_TOP = 96;

export function isoX(map: MapDef, x: number, y: number) {
  return (x - y) * (TW / 2) + originX(map);
}
export function isoY(_map: MapDef, x: number, y: number) {
  return (x + y) * (TH / 2) + PAD_TOP;
}

/** converte um ponto na tela (já somado ao camera offset) para coordenadas de tile */
export function screenToTile(map: MapDef, sx: number, sy: number) {
  const a = (sx - originX(map)) / (TW / 2);
  const b = (sy - PAD_TOP) / (TH / 2);
  return { x: (b + a) / 2, y: (b - a) / 2 };
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, w = TW, h = TH) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/* ---------- chão pré-renderizado ---------- */

function bakeFloor(mapId: string) {
  const map = MAPS[mapId]!;
  const W = map.rows[0]!.length;
  const H = map.rows.length;
  const c = document.createElement("canvas");
  c.width = (W + H) * (TW / 2) + TW;
  c.height = (W + H) * (TH / 2) + PAD_TOP + TH * 4;
  const ctx = c.getContext("2d")!;

  for (let sum = 0; sum <= W + H; sum++) {
    for (let j = 0; j < H; j++) {
      const i = sum - j;
      if (i < 0 || i >= W) continue;
      const ch = map.rows[j]![i]!;
      const t = map.palette[ch];
      if (!t) continue;
      const cx = isoX(map, i + 0.5, j + 0.5);
      const cy = isoY(map, i + 0.5, j + 0.5);
      const base = t.tall ? shade(t.base, -14) : t.base;
      diamond(ctx, cx, cy, base);
      // textura
      for (let k = 0; k < 5; k++) {
        const r1 = hash(i, j, k);
        const r2 = hash(j, i, k + 9);
        const px = cx + (r1 - 0.5) * TW * 0.6;
        const py = cy + (r2 - 0.5) * TH * 0.6;
        ctx.fillStyle = r1 > 0.5 ? t.speck : (t.speck2 ?? t.speck);
        ctx.fillRect(Math.round(px), Math.round(py), 2, 1);
      }
      // contorno sutil
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - TH / 2);
      ctx.lineTo(cx + TW / 2, cy);
      ctx.stroke();
    }
  }

  // portais e santuários no chão
  for (const p of map.portals) {
    const cx = isoX(map, p.x + 0.5, p.y + 0.5);
    const cy = isoY(map, p.x + 0.5, p.y + 0.5);
    diamond(ctx, cx, cy, "rgba(226,178,74,0.25)");
  }
  floorCache.set(mapId, c);
  return c;
}

/* ---------- blocos e props ---------- */

function block(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  h: number,
  t: TileStyle,
  w = TW,
  d = TH,
) {
  const top = cy - h * HZ;
  // face esquerda
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx, cy + d / 2);
  ctx.lineTo(cx, top + d / 2);
  ctx.lineTo(cx - w / 2, top);
  ctx.closePath();
  ctx.fillStyle = shade(t.base, -34);
  ctx.fill();
  // face direita
  ctx.beginPath();
  ctx.moveTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + d / 2);
  ctx.lineTo(cx, top + d / 2);
  ctx.lineTo(cx + w / 2, top);
  ctx.closePath();
  ctx.fillStyle = shade(t.base, -62);
  ctx.fill();
  // topo
  diamond(ctx, cx, top, shade(t.base, 16), w, d);
  // textura de pedra/madeira
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  if (t.wood) {
    for (let k = 1; k < 4; k++) {
      ctx.fillRect(cx - w / 2, top + (h * HZ * k) / 4 + 3, w / 2, 1);
      ctx.fillRect(cx, top + (h * HZ * k) / 4 + d / 2 + 1, w / 2, 1);
    }
  } else {
    for (let k = 0; k < 4; k++) {
      const r = hash(cx, cy, k);
      ctx.fillRect(cx - w / 2 + r * (w * 0.4), top + 4 + r * h * HZ * 0.6, 3, 1);
    }
  }
}

function tree(ctx: CanvasRenderingContext2D, cx: number, cy: number, dead: boolean, seed: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW * 0.7, TH * 0.7);
  ctx.fillStyle = dead ? "#4b4034" : "#4a3626";
  ctx.fillRect(cx - 2, cy - 24, 4, 24);
  if (dead) {
    ctx.strokeStyle = "#4b4034";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx - 9, cy - 28);
    ctx.moveTo(cx, cy - 22);
    ctx.lineTo(cx + 8, cy - 32);
    ctx.stroke();
    return;
  }
  const r = hash(cx, cy, seed);
  const layers = [
    { dy: 26, w: 20, c: "#2c4023" },
    { dy: 33, w: 16, c: "#365027" },
    { dy: 39, w: 11, c: "#41602d" },
  ];
  for (const l of layers) {
    ctx.beginPath();
    ctx.ellipse(cx + (r - 0.5) * 2, cy - l.dy, l.w / 2, l.w / 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = l.c;
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.ellipse(cx - 4, cy - 40, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rock(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW * 0.6, TH * 0.6);
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 2);
  ctx.lineTo(cx - 6, cy - 9);
  ctx.lineTo(cx + 2, cy - 12);
  ctx.lineTo(cx + 10, cy - 3);
  ctx.lineTo(cx + 6, cy + 4);
  ctx.closePath();
  ctx.fillStyle = "#6c7176";
  ctx.fill();
  ctx.fillStyle = "#868c92";
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 9);
  ctx.lineTo(cx + 2, cy - 12);
  ctx.lineTo(cx + 4, cy - 6);
  ctx.lineTo(cx - 3, cy - 4);
  ctx.closePath();
  ctx.fill();
}

function bushDraw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = "#33452a";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 4, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f5531";
  ctx.beginPath();
  ctx.ellipse(cx - 3, cy - 7, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function grassTuft(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  ctx.strokeStyle = "#5b6d38";
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    const sway = Math.sin(t * 1.5 + cx * 0.1 + k) * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + k * 2, cy);
    ctx.lineTo(cx + k * 2 + sway, cy - 6 - Math.abs(k));
    ctx.stroke();
  }
}

function barrel(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW * 0.5, TH * 0.5);
  ctx.fillStyle = "#6b4a29";
  ctx.fillRect(cx - 6, cy - 16, 12, 16);
  ctx.fillStyle = "#7d5931";
  ctx.fillRect(cx - 6, cy - 16, 6, 16);
  ctx.fillStyle = "#3e2c1a";
  ctx.fillRect(cx - 6, cy - 12, 12, 2);
  ctx.fillRect(cx - 6, cy - 5, 12, 2);
  ctx.beginPath();
  ctx.ellipse(cx, cy - 16, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8a6539";
  ctx.fill();
}

function crate(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW * 0.55, TH * 0.55);
  const t: TileStyle = { solid: true, base: "#8a6a3f", speck: "#9d7a49", wood: true };
  block(ctx, cx, cy, 0.85, t, TW * 0.62, TH * 0.62);
}

function torch(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  ctx.fillStyle = "#4a3a2a";
  ctx.fillRect(cx - 1, cy - 22, 3, 22);
  const f = 3 + Math.sin(time * 9 + cx) * 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 25, f, f * 1.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(226,140,40,0.9)";
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 26, f * 0.5, f * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,226,150,0.95)";
  ctx.fill();
}

function well(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const t: TileStyle = { solid: true, base: "#7b7268", speck: "#8b8278" };
  block(ctx, cx, cy, 0.6, t, TW * 0.85, TH * 0.85);
  diamond(ctx, cx, cy - 0.6 * HZ, "#1c2226", TW * 0.5, TH * 0.5);
  ctx.strokeStyle = "#5b4630";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - 12);
  ctx.lineTo(cx - 9, cy - 30);
  ctx.lineTo(cx + 9, cy - 30);
  ctx.lineTo(cx + 9, cy - 12);
  ctx.stroke();
  ctx.fillStyle = "#4a3a26";
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 30);
  ctx.lineTo(cx, cy - 38);
  ctx.lineTo(cx + 14, cy - 30);
  ctx.closePath();
  ctx.fill();
}

function tent(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW, TH);
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy + 4);
  ctx.lineTo(cx, cy - 26);
  ctx.lineTo(cx + 16, cy + 4);
  ctx.closePath();
  ctx.fillStyle = "#8d8069";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx + 16, cy + 4);
  ctx.lineTo(cx + 8, cy + 6);
  ctx.closePath();
  ctx.fillStyle = "#6f6453";
  ctx.fill();
  ctx.fillStyle = "#2b2620";
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 4);
  ctx.lineTo(cx, cy - 12);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.closePath();
  ctx.fill();
}

function cart(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.3)", TW, TH * 0.8);
  ctx.fillStyle = "#6a4c2c";
  ctx.fillRect(cx - 14, cy - 14, 28, 8);
  ctx.fillStyle = "#523a21";
  ctx.fillRect(cx - 14, cy - 6, 28, 3);
  ctx.fillStyle = "#3a2b1a";
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 2, 5, 0, Math.PI * 2);
  ctx.arc(cx + 9, cy - 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function sarcophagus(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const t: TileStyle = { solid: true, base: "#6f6a63", speck: "#7d786f" };
  block(ctx, cx, cy, 0.5, t, TW * 0.9, TH * 0.9);
  diamond(ctx, cx, cy - 0.5 * HZ, "#8b857c", TW * 0.6, TH * 0.6);
}

function banner(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  ctx.fillStyle = "#3b3128";
  ctx.fillRect(cx - 1, cy - 34, 2, 34);
  const sway = Math.sin(time * 1.6 + cx * 0.05) * 2;
  ctx.beginPath();
  ctx.moveTo(cx + 1, cy - 32);
  ctx.lineTo(cx + 12 + sway, cy - 30);
  ctx.lineTo(cx + 11 + sway, cy - 12);
  ctx.lineTo(cx + 1, cy - 14);
  ctx.closePath();
  ctx.fillStyle = "#7a2e2c";
  ctx.fill();
  ctx.fillStyle = "#c9a84c";
  ctx.fillRect(cx + 5, cy - 25, 3, 6);
}

function chestDraw(ctx: CanvasRenderingContext2D, cx: number, cy: number, opened: boolean) {
  diamond(ctx, cx, cy, "rgba(0,0,0,0.35)", TW * 0.6, TH * 0.6);
  ctx.fillStyle = "#6b4a26";
  ctx.fillRect(cx - 9, cy - 11, 18, 11);
  ctx.fillStyle = "#8a6231";
  ctx.fillRect(cx - 9, cy - 11, 9, 11);
  ctx.fillStyle = opened ? "#3a2a17" : "#57401f";
  if (opened) {
    ctx.fillRect(cx - 9, cy - 20, 18, 6);
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 11, 9, 6, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#d8b45a";
  ctx.fillRect(cx - 2, cy - 9, 4, 5);
}

function shrineDraw(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  const t: TileStyle = { solid: true, base: "#8d8577", speck: "#9c9486" };
  block(ctx, cx, cy, 1.1, t, TW * 0.7, TH * 0.7);
  const pulse = 0.5 + Math.sin(time * 2.2) * 0.25;
  ctx.beginPath();
  ctx.arc(cx, cy - 1.1 * HZ - 8, 5 + pulse * 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(226,178,74,${0.35 + pulse * 0.3})`;
  ctx.fill();
  ctx.fillStyle = "#f0dca8";
  ctx.fillRect(cx - 1, cy - 1.1 * HZ - 14, 2, 12);
  ctx.fillRect(cx - 5, cy - 1.1 * HZ - 10, 10, 2);
}

/* ---------- personagens ---------- */

type Dir = 0 | 1 | 2 | 3; // 0 = frente-direita, 1 = frente-esquerda, 2 = costas-esquerda, 3 = costas-direita

export function isoDir(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 0 : 2;
  return dy > 0 ? 1 : 3;
}

function character(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opts: {
    scale: number;
    body: string;
    accent: string;
    skin: string;
    hair?: string;
    dir: Dir;
    walk: number;
    attack: number;
    flash?: boolean;
  },
) {
  const u = 3 * opts.scale;
  const back = opts.dir >= 2;
  const swing = Math.sin(opts.walk * 9) * u * 0.9;
  const bob = Math.abs(Math.sin(opts.walk * 9)) * u * 0.25;
  const y = cy - bob;

  // sombra
  ctx.beginPath();
  ctx.ellipse(cx, cy, u * 2.2, u * 1.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fill();

  const body = opts.flash ? "#ffe0e0" : opts.body;
  const accent = opts.flash ? "#ffd0d0" : opts.accent;

  // pernas
  ctx.fillStyle = accent;
  ctx.fillRect(cx - u * 1.3, y - u * 2.6 + swing * 0.2, u * 1.1, u * 2.6);
  ctx.fillRect(cx + u * 0.2, y - u * 2.6 - swing * 0.2, u * 1.1, u * 2.6);
  // tronco
  ctx.fillStyle = body;
  ctx.fillRect(cx - u * 1.6, y - u * 6, u * 3.2, u * 3.6);
  ctx.fillStyle = shade("#000000", 0);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(cx + u * 0.6, y - u * 6, u * 1, u * 3.6);
  ctx.globalAlpha = 1;
  // braços
  ctx.fillStyle = opts.skin;
  const armY = y - u * 5.4 + (opts.attack > 0 ? -u : 0);
  ctx.fillRect(cx - u * 2.3, armY - swing * 0.15, u * 0.9, u * 2.6);
  ctx.fillRect(cx + u * 1.4, armY + swing * 0.15, u * 0.9, u * 2.6);
  // cabeça
  ctx.fillStyle = opts.skin;
  ctx.fillRect(cx - u * 1.2, y - u * 8.6, u * 2.4, u * 2.6);
  // cabelo / capuz
  ctx.fillStyle = opts.hair ?? "#2e2418";
  ctx.fillRect(cx - u * 1.3, y - u * 8.9, u * 2.6, u * 1.1);
  if (!back) {
    ctx.fillStyle = "rgba(20,14,10,0.85)";
    ctx.fillRect(cx - u * 0.8, y - u * 7.4, u * 0.5, u * 0.5);
    ctx.fillRect(cx + u * 0.35, y - u * 7.4, u * 0.5, u * 0.5);
  } else {
    ctx.fillStyle = opts.hair ?? "#2e2418";
    ctx.fillRect(cx - u * 1.2, y - u * 8.6, u * 2.4, u * 2);
  }
  // arma no ataque
  if (opts.attack > 0) {
    ctx.strokeStyle = "rgba(255,240,200,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const a = (1 - opts.attack) * Math.PI;
    ctx.arc(cx, y - u * 4, u * 3.4, -a, -a + 1.1);
    ctx.stroke();
  }
}

function beastDraw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  body: string,
  accent: string,
  dir: Dir,
  walk: number,
  flash: boolean,
) {
  const u = 3.4 * scale;
  const face = dir === 0 || dir === 3 ? 1 : -1;
  const swing = Math.sin(walk * 10) * u * 0.6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, u * 2.6, u * 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fill();
  const b = flash ? "#ffe0e0" : body;
  ctx.fillStyle = accent;
  ctx.fillRect(cx - u * 1.6, cy - u * 1.8 + swing * 0.2, u * 0.8, u * 1.8);
  ctx.fillRect(cx + u * 0.8, cy - u * 1.8 - swing * 0.2, u * 0.8, u * 1.8);
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.ellipse(cx, cy - u * 2.6, u * 2.2, u * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + face * u * 2.1, cy - u * 3.3, u * 1.1, u * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9483c";
  ctx.fillRect(cx + face * u * 2.4, cy - u * 3.6, u * 0.4, u * 0.4);
  ctx.strokeStyle = b;
  ctx.lineWidth = u * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx - face * u * 2, cy - u * 3);
  ctx.lineTo(cx - face * u * 3.2, cy - u * 4);
  ctx.stroke();
}

function dragonDraw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  body: string,
  accent: string,
  dir: Dir,
  time: number,
  flash: boolean,
) {
  const u = 4.4 * scale;
  const face = dir === 0 || dir === 3 ? 1 : -1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, u * 3.4, u * 1.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fill();
  const b = flash ? "#ffe0e0" : body;
  // asas
  const flap = Math.sin(time * 3) * u * 0.8;
  ctx.fillStyle = shade(b, -25);
  ctx.beginPath();
  ctx.moveTo(cx, cy - u * 4);
  ctx.lineTo(cx - u * 4, cy - u * 6 - flap);
  ctx.lineTo(cx - u * 1.2, cy - u * 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - u * 4);
  ctx.lineTo(cx + u * 4, cy - u * 6 + flap);
  ctx.lineTo(cx + u * 1.2, cy - u * 2.6);
  ctx.closePath();
  ctx.fill();
  // corpo
  ctx.fillStyle = b;
  ctx.beginPath();
  ctx.ellipse(cx, cy - u * 2.6, u * 2.4, u * 1.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // pescoço e cabeça
  ctx.beginPath();
  ctx.ellipse(cx + face * u * 2.4, cy - u * 4.6, u * 1.3, u * 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(cx + face * u * 2.6, cy - u * 4.9, u * 0.5, u * 0.5);
  // espinhos
  ctx.fillStyle = accent;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(cx + k * u * 0.8, cy - u * 4.2);
    ctx.lineTo(cx + k * u * 0.8 + u * 0.3, cy - u * 5.1);
    ctx.lineTo(cx + k * u * 0.8 + u * 0.6, cy - u * 4.2);
    ctx.closePath();
    ctx.fill();
  }
}

/* ---------- dia e noite ---------- */

export function dayNight(clock: number) {
  // clock em minutos (0-1440)
  const h = clock / 60;
  let dark = 0;
  if (h < 5) dark = 1;
  else if (h < 7) dark = 1 - (h - 5) / 2;
  else if (h < 18) dark = 0;
  else if (h < 20.5) dark = (h - 18) / 2.5;
  else dark = 1;
  return dark;
}

export function clockLabel(clock: number) {
  const h = Math.floor(clock / 60);
  const m = Math.floor(clock % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ---------- render principal ---------- */

type Layer = { depth: number; draw: () => void };

export function render(
  canvas: HTMLCanvasElement,
  s: GameState,
  hoverTile: { x: number; y: number } | null,
) {
  const ctx = canvas.getContext("2d")!;
  const map = MAPS[s.mapId]!;
  const floor = floorCache.get(s.mapId) ?? bakeFloor(s.mapId);
  ctx.imageSmoothingEnabled = false;

  const vw = canvas.width;
  const vh = canvas.height;
  ctx.fillStyle = map.ambient;
  ctx.fillRect(0, 0, vw, vh);

  const p = s.player;
  let camX = isoX(map, p.x, p.y) - vw / 2;
  let camY = isoY(map, p.x, p.y) - vh / 2;
  camX = Math.round(Math.max(0, Math.min(floor.width - vw, camX)));
  camY = Math.round(Math.max(0, Math.min(floor.height - vh, camY)));

  ctx.drawImage(floor, -camX, -camY);

  const sx = (x: number, y: number) => isoX(map, x, y) - camX;
  const sy = (x: number, y: number) => isoY(map, x, y) - camY;

  // marcador de mouse
  if (hoverTile) {
    const hx = Math.floor(hoverTile.x) + 0.5;
    const hy = Math.floor(hoverTile.y) + 0.5;
    ctx.save();
    ctx.globalAlpha = 0.5;
    diamond(ctx, sx(hx, hy), sy(hx, hy), "rgba(226,178,74,0.35)");
    ctx.restore();
  }

  const layers: Layer[] = [];
  const zone = s.world[s.mapId]!;

  // limites visíveis
  const corners = [
    screenToTile(map, camX, camY),
    screenToTile(map, camX + vw, camY),
    screenToTile(map, camX, camY + vh + 80),
    screenToTile(map, camX + vw, camY + vh + 80),
  ];
  const minX = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.x))) - 2);
  const maxX = Math.min(map.rows[0]!.length - 1, Math.ceil(Math.max(...corners.map((c) => c.x))) + 3);
  const minY = Math.max(0, Math.floor(Math.min(...corners.map((c) => c.y))) - 2);
  const maxY = Math.min(map.rows.length - 1, Math.ceil(Math.max(...corners.map((c) => c.y))) + 3);

  const lights: { x: number; y: number; r: number; c: string }[] = [];

  for (let j = minY; j <= maxY; j++) {
    for (let i = minX; i <= maxX; i++) {
      const ch = map.rows[j]![i]!;
      const t = map.palette[ch];
      if (!t) continue;
      const cx = sx(i + 0.5, j + 0.5);
      const cy = sy(i + 0.5, j + 0.5);
      const depth = i + j;
      if (t.liquid) {
        layers.push({
          depth: depth - 0.4,
          draw: () => {
            const wave = Math.sin(s.time * 1.6 + i * 0.7 + j * 0.4) * 1.2;
            diamond(ctx, cx, cy + wave * 0.3, "rgba(80,140,170,0.28)", TW * 0.9, TH * 0.9);
            ctx.fillStyle = "rgba(190,225,240,0.16)";
            ctx.fillRect(cx - 5, cy + wave, 10, 1);
          },
        });
        continue;
      }
      if (!t.tall) continue;
      if (ch === "T") {
        const dead = map.id !== "cinzavale" && hash(i, j, 5) > 0.45;
        layers.push({ depth, draw: () => tree(ctx, cx, cy, dead, i * 7 + j) });
      } else if (ch === "r") {
        layers.push({ depth, draw: () => rock(ctx, cx, cy) });
      } else {
        const h = t.height ?? 1;
        layers.push({ depth, draw: () => block(ctx, cx, cy, h, t) });
      }
    }
    // arbustos (não sólidos)
    for (let i = minX; i <= maxX; i++) {
      if (map.rows[j]![i] === "b") {
        const cx = sx(i + 0.5, j + 0.5);
        const cy = sy(i + 0.5, j + 0.5);
        layers.push({ depth: i + j - 0.1, draw: () => bushDraw(ctx, cx, cy) });
      }
    }
  }

  // props
  const drawProp = (pr: Prop) => {
    const cx = sx(pr.x + 0.5, pr.y + 0.5);
    const cy = sy(pr.x + 0.5, pr.y + 0.5);
    switch (pr.kind) {
      case "barrel":
        return barrel(ctx, cx, cy);
      case "crate":
        return crate(ctx, cx, cy);
      case "torch":
        lights.push({ x: cx, y: cy - 24, r: 90, c: "rgba(240,170,70," });
        return torch(ctx, cx, cy, s.time);
      case "well":
        return well(ctx, cx, cy);
      case "tent":
        return tent(ctx, cx, cy);
      case "cart":
        return cart(ctx, cx, cy);
      case "sarcophagus":
        return sarcophagus(ctx, cx, cy);
      case "banner":
        return banner(ctx, cx, cy, s.time);
      case "grass":
        return grassTuft(ctx, cx, cy, s.time);
      default:
        return bushDraw(ctx, cx, cy);
    }
  };
  for (const pr of map.props) {
    if (pr.x < minX - 1 || pr.x > maxX + 1 || pr.y < minY - 1 || pr.y > maxY + 1) continue;
    layers.push({ depth: pr.x + pr.y + 0.05, draw: () => drawProp(pr) });
  }

  // baús e santuários
  for (const c of map.chests) {
    const cx = sx(c.x + 0.5, c.y + 0.5);
    const cy = sy(c.x + 0.5, c.y + 0.5);
    const opened = zone.opened.includes(c.id);
    layers.push({ depth: c.x + c.y + 0.06, draw: () => chestDraw(ctx, cx, cy, opened) });
  }
  for (const sh of map.shrines) {
    const cx = sx(sh.x + 0.5, sh.y + 0.5);
    const cy = sy(sh.x + 0.5, sh.y + 0.5);
    lights.push({ x: cx, y: cy - 20, r: 110, c: "rgba(240,200,110," });
    layers.push({ depth: sh.x + sh.y + 0.06, draw: () => shrineDraw(ctx, cx, cy, s.time) });
  }

  // drops
  for (const d of zone.drops) {
    const cx = sx(d.x, d.y);
    const cy = sy(d.x, d.y);
    const item = d.item ? ITEMS[d.item] : null;
    layers.push({
      depth: d.x + d.y + 0.02,
      draw: () => {
        const pulse = Math.sin(s.time * 4 + d.x) * 1.5;
        diamond(ctx, cx, cy, "rgba(226,178,74,0.18)", TW * 0.5, TH * 0.5);
        ctx.fillStyle = d.gold ? "#e2b24a" : (item?.tint ?? "#ccc");
        ctx.fillRect(Math.round(cx - 3), Math.round(cy - 7 + pulse), 6, 6);
      },
    });
  }

  // NPCs
  for (const n of map.npcs) {
    const cx = sx(n.x + 0.5, n.y + 0.5);
    const cy = sy(n.x + 0.5, n.y + 0.5);
    layers.push({
      depth: n.x + n.y + 0.1,
      draw: () => {
        character(ctx, cx, cy, {
          scale: 1,
          body: n.robe,
          accent: "#2b2620",
          skin: n.skin,
          dir: 1,
          walk: s.time * 0.15,
          attack: 0,
        });
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(n.name, cx + 1, cy - 33);
        ctx.fillStyle = "#e5d5a8";
        ctx.fillText(n.name, cx, cy - 34);
      },
    });
  }

  // inimigos
  for (const e of zone.enemies) {
    if (e.dead) continue;
    if (e.x < minX - 3 || e.x > maxX + 3 || e.y < minY - 3 || e.y > maxY + 3) continue;
    const def = ENEMIES[e.def]!;
    const cx = sx(e.x, e.y);
    const cy = sy(e.x, e.y);
    const dir = isoDir(p.x - e.x, p.y - e.y);
    const flash = e.hurt > 0;
    layers.push({
      depth: e.x + e.y + 0.1,
      draw: () => {
        if (def.sprite === "beast") beastDraw(ctx, cx, cy, def.size, def.body, def.accent, dir, s.time, flash);
        else if (def.sprite === "dragon")
          dragonDraw(ctx, cx, cy, def.size, def.body, def.accent, dir, s.time, flash);
        else
          character(ctx, cx, cy, {
            scale: def.size * 1.15,
            body: def.body,
            accent: def.accent,
            skin: def.sprite === "skeleton" ? "#ded7c4" : "#c69a76",
            hair: def.sprite === "skeleton" ? "#cfc7b0" : "#241c14",
            dir,
            walk: s.time,
            attack: e.cooldown > def.attackDelay - 0.25 ? 0.6 : 0,
            flash,
          });
        if (e.poison > 0) {
          ctx.fillStyle = "rgba(120,200,90,0.6)";
          ctx.fillRect(cx - 8, cy - 44, 3, 3);
          ctx.fillRect(cx + 4, cy - 48, 3, 3);
        }
        // nome + nível + barra
        const w = 30 * def.size;
        const barY = cy - 34 * def.size - 8;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(cx - w / 2 - 1, barY - 1, w + 2, 5);
        ctx.fillStyle = "#b8343a";
        ctx.fillRect(cx - w / 2, barY, (w * Math.max(0, e.hp)) / e.maxHp, 3);
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillText(`${def.name} ${def.level}`, cx + 1, barY - 3);
        ctx.fillStyle = "#e08a7a";
        ctx.fillText(`${def.name} ${def.level}`, cx, barY - 4);
      },
    });
  }

  // jogador
  const pcx = sx(p.x, p.y);
  const pcy = sy(p.x, p.y);
  lights.push({ x: pcx, y: pcy - 16, r: 120, c: "rgba(255,220,160," });
  layers.push({
    depth: p.x + p.y + 0.12,
    draw: () => {
      character(ctx, pcx, pcy, {
        scale: 1.05,
        body: p.hurt > 0 ? "#f4d0d0" : bodyColor(s),
        accent: "#3a2f22",
        skin: "#d8a878",
        hair: "#2b1f14",
        dir: p.facing as Dir,
        walk: s.time,
        attack: p.cooldown > 0.25 ? Math.min(1, p.cooldown) : 0,
      });
      if (p.buffs.timer > 0) {
        ctx.strokeStyle = "rgba(150,200,255,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(pcx, pcy - 14, 14, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  });

  layers.sort((a, b) => a.depth - b.depth);
  for (const l of layers) l.draw();

  // ---- iluminação / dia e noite ----
  const dark = map.indoor ? 0.78 : dayNight(s.clock) * 0.72;
  if (dark > 0.01) {
    ctx.save();
    ctx.fillStyle = map.indoor ? `rgba(6,8,12,${dark})` : `rgba(10,16,34,${dark})`;
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) {
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
      g.addColorStop(0, `${l.c}${0.5 * dark})`);
      g.addColorStop(1, `${l.c}0)`);
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.restore();
  }

  // textos flutuantes
  ctx.textAlign = "center";
  ctx.font = "9px monospace";
  for (const f of s.floats) {
    const fx = sx(f.x, f.y);
    const fy = sy(f.x, f.y) - 30 - (1 - f.life) * 22;
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(f.text, fx + 1, fy + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, fx, fy);
    ctx.globalAlpha = 1;
  }

  // vinheta
  const grd = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.85);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, vw, vh);
}

function bodyColor(s: GameState) {
  switch (s.player.cls) {
    case "mago":
      return "#3f3a63";
    case "clerigo":
      return "#a89c82";
    case "ladino":
      return "#3c4442";
    default:
      return "#6a5136";
  }
}
