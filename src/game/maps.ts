import type { MapDef, TileStyle } from "./types";

/* ---------- helpers ---------- */

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Grid = string[][];

const get = (g: Grid, i: number, j: number): string | undefined => g[j]?.[i];
const set = (g: Grid, i: number, j: number, ch: string) => {
  const row = g[j];
  if (row && i >= 0 && i < row.length) row[i] = ch;
};

function grid(w: number, h: number, fill: string): Grid {
  return Array.from({ length: h }, () => new Array<string>(w).fill(fill));
}

function box(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(g, i, j, ch);
}

function frame(g: Grid, x: number, y: number, w: number, h: number, ch: string) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++)
      if (j === y || j === y + h - 1 || i === x || i === x + w - 1) set(g, i, j, ch);
}

function hut(g: Grid, x: number, y: number, w: number, h: number, doorSide: "s" | "n") {
  box(g, x, y, w, h, "f");
  frame(g, x, y, w, h, "#");
  set(g, x + (w >> 1), doorSide === "s" ? y + h - 1 : y, "+");
}

function disc(g: Grid, cx: number, cy: number, r: number, ch: string) {
  for (let j = Math.floor(cy - r); j <= cy + r; j++)
    for (let i = Math.floor(cx - r); i <= cx + r; i++) {
      const d = Math.hypot(i - cx, (j - cy) * 1.25);
      if (d <= r) set(g, i, j, ch);
    }
}

function clear(g: Grid, cx: number, cy: number, r: number, ch: string) {
  for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) set(g, i, j, ch);
}

function toRows(g: Grid) {
  return g.map((r) => r.join(""));
}

/* ---------- palettes ---------- */

const OUTDOOR: Record<string, TileStyle> = {
  g: { solid: false, base: "#3f4a2f", speck: "#4c5a37", speck2: "#333c26" },
  d: { solid: false, base: "#5b4c38", speck: "#6a5941", speck2: "#4a3d2d" },
  m: { solid: false, base: "#453a2b", speck: "#52452f", speck2: "#332b20" },
  T: { solid: true, base: "#1e2a1a", speck: "#2c3d22", speck2: "#16200f", tall: true },
  b: { solid: false, base: "#33422a", speck: "#41522f", speck2: "#26301f" },
  r: { solid: true, base: "#565b5f", speck: "#6b7176", speck2: "#42464a", tall: true },
  w: { solid: true, base: "#25384a", speck: "#2f465c", speck2: "#1d2b3a" },
  s: { solid: false, base: "#5e6165", speck: "#70747a", speck2: "#4c4f53" },
  "#": { solid: true, base: "#4a3524", speck: "#5b4230", speck2: "#38271a", tall: true },
  f: { solid: false, base: "#6b5335", speck: "#7b6040", speck2: "#57432b" },
  "+": { solid: false, base: "#7a6038", speck: "#8c6f45", speck2: "#634d2d" },
};

const CRYPT: Record<string, TileStyle> = {
  ".": { solid: false, base: "#3a3a3c", speck: "#47474a", speck2: "#2f2f31" },
  "#": { solid: true, base: "#22252a", speck: "#2e3238", speck2: "#171a1e", tall: true },
  b: { solid: false, base: "#4a3f30", speck: "#584b39", speck2: "#3a3126" },
  w: { solid: true, base: "#2a1f26", speck: "#3a2b34", speck2: "#1d151b" },
  r: { solid: true, base: "#4c4a46", speck: "#5c5954", speck2: "#3b3936" },
};

/* ---------- Cinzavale (aldeia) ---------- */

function buildVillage() {
  const W = 48;
  const H = 36;
  const g = grid(W, H, "g");
  const rnd = makeRng(9137);

  // bosque nas bordas
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      if (edge < 2 || (edge < 4 && rnd() < 0.55)) set(g, i, j, "T");
    }

  // vegetação e pedras
  for (let k = 0; k < 150; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    if (get(g, i, j) === "g") set(g, i, j, rnd() < 0.55 ? "b" : rnd() < 0.6 ? "T" : "r");
  }

  // lago ao nordeste
  disc(g, 40, 8, 5, "w");
  disc(g, 40, 8, 3.2, "w");

  // estradas de terra
  box(g, 22, 2, 3, H - 3, "d");
  box(g, 6, 17, 36, 2, "d");

  // casas
  hut(g, 8, 8, 7, 5, "s");
  hut(g, 30, 9, 8, 6, "s");
  hut(g, 9, 24, 8, 6, "n");
  hut(g, 30, 24, 9, 6, "n");
  // praça de pedra e poço
  box(g, 20, 20, 7, 5, "s");
  box(g, 23, 22, 1, 1, "r");

  // limpar pontos importantes
  const clears: [number, number][] = [
    [20, 16],
    [26, 21],
    [14, 27],
    [23, 33],
    [23, 34],
    [36, 8],
  ];
  for (const [x, y] of clears) clear(g, x, y, 1, y > 30 ? "d" : "s");

  const map: MapDef = {
    id: "cinzavale",
    name: "Cinzavale",
    subtitle: "Aldeia de meeiros, dívidas e silêncio",
    rows: toRows(g),
    palette: OUTDOOR,
    ambient: "#0d1108",
    spawns: [
      { def: "rato_gordo", x: 36, y: 6 },
      { def: "rato_gordo", x: 38, y: 12 },
    ],
    npcs: [
      {
        id: "corvin",
        name: "Sargento Corvin",
        x: 20,
        y: 16,
        robe: "#5b6070",
        skin: "#c69a76",
        dialogue: "corvin",
      },
      {
        id: "ysolde",
        name: "Irmã Ysolde",
        x: 26,
        y: 21,
        robe: "#c9c2b0",
        skin: "#e0b48f",
        dialogue: "ysolde",
      },
      {
        id: "jareth",
        name: "Jareth, o Tratante",
        x: 14,
        y: 27,
        robe: "#4a3550",
        skin: "#a67c58",
        dialogue: "jareth",
      },
    ],
    portals: [
      { x: 23, y: 34, to: "campos", tx: 28, ty: 4, label: "Campos Fétidos" },
      { x: 24, y: 34, to: "campos", tx: 28, ty: 4, label: "Campos Fétidos" },
    ],
  };
  return map;
}

/* ---------- Campos Fétidos ---------- */

function buildFields() {
  const W = 56;
  const H = 42;
  const g = grid(W, H, "m");
  const rnd = makeRng(4471);

  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      if (edge < 2) set(g, i, j, "T");
      else if (rnd() < 0.3) set(g, i, j, "g");
    }

  // pântanos
  disc(g, 14, 12, 6, "w");
  disc(g, 20, 30, 7, "w");
  disc(g, 44, 34, 5, "w");

  // árvores mortas e pedras
  for (let k = 0; k < 320; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    const cur = get(g, i, j);
    if (cur === "m" || cur === "g") set(g, i, j, rnd() < 0.45 ? "T" : rnd() < 0.6 ? "b" : "r");
  }

  // trilha do norte até a cripta
  box(g, 27, 2, 3, 20, "d");
  box(g, 27, 20, 26, 3, "d");

  // acampamento de salteadores
  box(g, 38, 8, 10, 8, "d");
  frame(g, 38, 8, 10, 8, "r");
  clear(g, 43, 12, 2, "d");
  set(g, 43, 8, "d");

  // entrada da cripta
  box(g, 49, 17, 6, 9, "s");
  frame(g, 49, 17, 6, 9, "#");
  set(g, 49, 21, "+");
  clear(g, 52, 21, 1, "s");

  const map: MapDef = {
    id: "campos",
    name: "Campos Fétidos",
    subtitle: "Onde a colheita apodreceu de pé",
    rows: toRows(g),
    palette: OUTDOOR,
    ambient: "#0b0d09",
    spawns: [
      { def: "lobo_cinza", x: 24, y: 10 },
      { def: "lobo_cinza", x: 31, y: 14 },
      { def: "lobo_cinza", x: 20, y: 22 },
      { def: "lobo_cinza", x: 34, y: 30 },
      { def: "rato_gordo", x: 16, y: 20 },
      { def: "rato_gordo", x: 12, y: 34 },
      { def: "bandido", x: 41, y: 11 },
      { def: "bandido", x: 45, y: 13 },
      { def: "bandido", x: 43, y: 14 },
      { def: "bandido", x: 36, y: 22 },
      { def: "carniceiro", x: 44, y: 10 },
      { def: "lobo_cinza", x: 47, y: 30 },
    ],
    npcs: [
      {
        id: "harlan",
        name: "Harlan, o Desertor",
        x: 29,
        y: 26,
        robe: "#3f4a3a",
        skin: "#b58c66",
        dialogue: "harlan",
      },
    ],
    portals: [
      { x: 28, y: 3, to: "cinzavale", tx: 23, ty: 32, label: "Cinzavale" },
      { x: 49, y: 21, to: "cripta", tx: 4, ty: 20, label: "Cripta de Vhalmark" },
    ],
  };
  return map;
}

/* ---------- Cripta de Vhalmark ---------- */

function buildCrypt() {
  const W = 46;
  const H = 40;
  const g = grid(W, H, "#");
  const rnd = makeRng(8823);

  const rooms: [number, number, number, number][] = [
    [2, 16, 9, 9],
    [14, 4, 11, 10],
    [14, 22, 10, 12],
    [28, 12, 15, 16],
    [30, 2, 8, 7],
  ];
  for (const [x, y, w, h] of rooms) box(g, x, y, w, h, ".");

  const corr = (x1: number, y1: number, x2: number, y2: number) => {
    box(g, Math.min(x1, x2), y1, Math.abs(x2 - x1) + 2, 2, ".");
    box(g, x2, Math.min(y1, y2), 2, Math.abs(y2 - y1) + 2, ".");
  };
  corr(9, 19, 18, 10);
  corr(9, 21, 18, 26);
  corr(22, 10, 32, 16);
  corr(22, 27, 32, 22);
  corr(33, 12, 33, 6);

  // detritos e sarcófagos
  for (let k = 0; k < 130; k++) {
    const i = 2 + Math.floor(rnd() * (W - 4));
    const j = 2 + Math.floor(rnd() * (H - 4));
    if (get(g, i, j) === ".") set(g, i, j, rnd() < 0.5 ? "b" : rnd() < 0.5 ? "r" : "w");
  }
  clear(g, 4, 20, 2, ".");
  clear(g, 35, 20, 4, ".");
  clear(g, 34, 5, 2, ".");

  const map: MapDef = {
    id: "cripta",
    name: "Cripta de Vhalmark",
    subtitle: "O juramento apodrece embaixo da terra",
    rows: toRows(g),
    palette: CRYPT,
    ambient: "#07080a",
    spawns: [
      { def: "rato_gordo", x: 6, y: 22 },
      { def: "rato_gordo", x: 18, y: 8 },
      { def: "esqueleto", x: 19, y: 10 },
      { def: "esqueleto", x: 17, y: 27 },
      { def: "esqueleto", x: 21, y: 30 },
      { def: "esqueleto", x: 32, y: 16 },
      { def: "esqueleto", x: 39, y: 24 },
      { def: "esqueleto", x: 36, y: 14 },
      { def: "carniceiro", x: 34, y: 4 },
      { def: "serpe", x: 36, y: 21 },
    ],
    npcs: [],
    portals: [{ x: 3, y: 20, to: "campos", tx: 51, ty: 21, label: "Campos Fétidos" }],
  };
  return map;
}

export const MAPS: Record<string, MapDef> = {
  cinzavale: buildVillage(),
  campos: buildFields(),
  cripta: buildCrypt(),
};

export function tileAt(mapId: string, x: number, y: number): TileStyle | null {
  const m = MAPS[mapId];
  const row = m?.rows[y];
  if (!row) return null;
  const ch = row[x];
  if (!ch) return null;
  return m?.palette[ch] ?? null;
}

export function isSolid(mapId: string, x: number, y: number) {
  const t = tileAt(mapId, Math.floor(x), Math.floor(y));
  return !t || t.solid;
}
