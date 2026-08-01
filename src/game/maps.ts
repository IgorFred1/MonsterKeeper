import type { ChestDef, MapDef, Prop, PropKind, ShrineDef, TileStyle } from "./types";

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

function prop(kind: PropKind, x: number, y: number): Prop {
  return { kind, x, y };
}

/* ---------- paletas ---------- */

const OUTDOOR: Record<string, TileStyle> = {
  g: { solid: false, base: "#46522f", speck: "#54633a", speck2: "#38431f" },
  d: { solid: false, base: "#6b5940", speck: "#7d6a4c", speck2: "#584833" },
  m: { solid: false, base: "#4c4130", speck: "#5b4e39", speck2: "#3a3125" },
  T: { solid: true, base: "#26331d", speck: "#31401f", speck2: "#1a2413", tall: true },
  b: { solid: false, base: "#3b4a2b", speck: "#4a5c33", speck2: "#2d3a20" },
  r: { solid: true, base: "#6a6f74", speck: "#7f858b", speck2: "#4f5459", tall: true, height: 0.7 },
  w: { solid: true, base: "#2b3f52", speck: "#375169", speck2: "#213141", liquid: true },
  s: { solid: false, base: "#767a80", speck: "#8a8e95", speck2: "#5f6368" },
  "#": { solid: true, base: "#7d7669", speck: "#8f887a", speck2: "#635d52", tall: true, height: 1.5 },
  "%": { solid: true, base: "#6d543a", speck: "#7d6244", speck2: "#54402b", tall: true, height: 1.5, wood: true },
  f: { solid: false, base: "#7c6544", speck: "#8d7550", speck2: "#665238" },
  "+": { solid: false, base: "#8e7343", speck: "#a08351", speck2: "#755d34" },
};

const CRYPT: Record<string, TileStyle> = {
  ".": { solid: false, base: "#4b4b4f", speck: "#57575c", speck2: "#3c3c40" },
  "#": { solid: true, base: "#33373d", speck: "#41464d", speck2: "#24272c", tall: true, height: 1.6 },
  b: { solid: false, base: "#54483a", speck: "#605343", speck2: "#42392e" },
  w: { solid: true, base: "#3a2c34", speck: "#4a3a44", speck2: "#2a1f26", height: 0.8, tall: true },
  r: { solid: true, base: "#5b5854", speck: "#6b6863", speck2: "#474441", tall: true, height: 0.7 },
};

/* ---------- Cinzavale (aldeia) ---------- */

function buildVillage(): MapDef {
  const W = 48;
  const H = 36;
  const g = grid(W, H, "g");
  const rnd = makeRng(9137);
  const props: Prop[] = [];

  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      if (edge < 2 || (edge < 4 && rnd() < 0.5)) set(g, i, j, "T");
    }

  for (let k = 0; k < 150; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    if (get(g, i, j) === "g") set(g, i, j, rnd() < 0.55 ? "b" : rnd() < 0.6 ? "T" : "r");
  }

  disc(g, 40, 8, 5, "w");

  box(g, 22, 2, 3, H - 3, "d");
  box(g, 6, 17, 36, 2, "d");

  // casas de pedra e madeira
  hut(g, 8, 8, 7, 5, "s");
  hut(g, 30, 9, 8, 6, "s");
  hut(g, 9, 24, 8, 6, "n");
  hut(g, 30, 24, 9, 6, "n");
  // celeiro de madeira
  box(g, 17, 6, 6, 5, "f");
  frame(g, 17, 6, 6, 5, "%");
  set(g, 20, 10, "+");

  // praça de pedra, muro baixo e poço
  box(g, 19, 19, 9, 7, "s");
  frame(g, 19, 19, 9, 7, "r");
  clear(g, 23, 19, 1, "s");
  clear(g, 23, 25, 1, "s");
  set(g, 23, 22, "s");
  props.push(prop("well", 23, 22));

  const clears: [number, number][] = [
    [20, 16],
    [26, 21],
    [14, 27],
    [23, 33],
    [23, 34],
    [36, 8],
  ];
  for (const [x, y] of clears) clear(g, x, y, 1, y > 30 ? "d" : "s");

  // decoração
  props.push(
    prop("torch", 21, 20),
    prop("torch", 26, 20),
    prop("torch", 21, 24),
    prop("torch", 26, 24),
    prop("barrel", 9, 13),
    prop("barrel", 10, 13),
    prop("crate", 12, 13),
    prop("cart", 33, 16),
    prop("barrel", 31, 16),
    prop("crate", 16, 20),
    prop("crate", 16, 21),
    prop("tent", 27, 15),
    prop("tent", 17, 30),
    prop("banner", 22, 18),
    prop("banner", 25, 18),
    prop("barrel", 35, 26),
    prop("crate", 36, 26),
  );
  for (let k = 0; k < 90; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    if (get(g, i, j) === "g") props.push(prop("grass", i, j));
  }

  const chests: ChestDef[] = [
    { id: "vila_celeiro", x: 19, y: 8, loot: ["pocao_menor", "capuz_de_la"], gold: 12 },
    { id: "vila_casa_norte", x: 34, y: 12, loot: ["botas_de_palha"], gold: 8 },
  ];
  const shrines: ShrineDef[] = [{ id: "capela", x: 25, y: 21, name: "Capela de Cinzavale" }];

  return {
    id: "cinzavale",
    name: "Cinzavale",
    subtitle: "Aldeia de meeiros, dívidas e silêncio",
    rows: toRows(g),
    palette: OUTDOOR,
    ambient: "#0d1108",
    props,
    chests,
    shrines,
    spawns: [
      { def: "rato_gordo", x: 36, y: 6 },
      { def: "rato_gordo", x: 38, y: 12 },
    ],
    npcs: [
      { id: "corvin", name: "Sargento Corvin", x: 20, y: 16, robe: "#5b6070", skin: "#c69a76", dialogue: "corvin" },
      { id: "ysolde", name: "Irmã Ysolde", x: 26, y: 21, robe: "#c9c2b0", skin: "#e0b48f", dialogue: "ysolde" },
      {
        id: "jareth",
        name: "Jareth, o Tratante",
        x: 14,
        y: 27,
        robe: "#4a3550",
        skin: "#a67c58",
        dialogue: "jareth",
        shop: [
          "espada_curta",
          "adaga_torta",
          "maça_de_ferro",
          "cajado_de_espinho",
          "escudo_de_tabua",
          "gibao_de_couro",
          "capuz_de_la",
          "botas_de_palha",
          "pocao_menor",
          "pocao_maior",
          "tonico_azul",
          "anel_de_lata",
        ],
      },
    ],
    portals: [
      { x: 23, y: 34, to: "campos", tx: 28, ty: 4, label: "Campos Fétidos" },
      { x: 24, y: 34, to: "campos", tx: 28, ty: 4, label: "Campos Fétidos" },
    ],
  };
}

/* ---------- Campos Fétidos ---------- */

function buildFields(): MapDef {
  const W = 56;
  const H = 42;
  const g = grid(W, H, "m");
  const rnd = makeRng(4471);
  const props: Prop[] = [];

  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      if (edge < 2) set(g, i, j, "T");
      else if (rnd() < 0.3) set(g, i, j, "g");
    }

  disc(g, 14, 12, 6, "w");
  disc(g, 20, 30, 7, "w");
  disc(g, 44, 34, 5, "w");

  for (let k = 0; k < 320; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    const cur = get(g, i, j);
    if (cur === "m" || cur === "g") set(g, i, j, rnd() < 0.45 ? "T" : rnd() < 0.6 ? "b" : "r");
  }

  box(g, 27, 2, 3, 20, "d");
  box(g, 27, 20, 26, 3, "d");

  // acampamento de salteadores
  box(g, 38, 8, 10, 8, "d");
  frame(g, 38, 8, 10, 8, "r");
  clear(g, 43, 12, 2, "d");
  set(g, 43, 8, "d");
  props.push(
    prop("tent", 39, 9),
    prop("tent", 46, 9),
    prop("tent", 39, 14),
    prop("barrel", 45, 14),
    prop("crate", 46, 14),
    prop("torch", 41, 10),
    prop("torch", 45, 10),
    prop("cart", 42, 15),
  );

  // entrada da cripta
  box(g, 49, 17, 6, 9, "s");
  frame(g, 49, 17, 6, 9, "#");
  set(g, 49, 21, "+");
  clear(g, 52, 21, 1, "s");
  props.push(prop("torch", 50, 19), prop("torch", 50, 23), prop("banner", 51, 18));

  for (let k = 0; k < 120; k++) {
    const i = 3 + Math.floor(rnd() * (W - 6));
    const j = 3 + Math.floor(rnd() * (H - 6));
    if (get(g, i, j) === "m" || get(g, i, j) === "g") props.push(prop("grass", i, j));
  }

  const chests: ChestDef[] = [
    { id: "campos_acampamento", x: 44, y: 9, loot: ["cota_de_malha", "pocao_maior"], gold: 40 },
    { id: "campos_tronco", x: 12, y: 24, loot: ["botas_de_batedor"], gold: 15 },
    { id: "campos_pantano", x: 22, y: 37, loot: ["tonico_azul", "anel_de_lata"], gold: 22 },
  ];
  const shrines: ShrineDef[] = [{ id: "marco_estrada", x: 29, y: 24, name: "Marco de Pedra da Estrada" }];

  return {
    id: "campos",
    name: "Campos Fétidos",
    subtitle: "Onde a colheita apodreceu de pé",
    rows: toRows(g),
    palette: OUTDOOR,
    ambient: "#0b0d09",
    props,
    chests,
    shrines,
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
      { id: "harlan", name: "Harlan, o Desertor", x: 29, y: 26, robe: "#3f4a3a", skin: "#b58c66", dialogue: "harlan" },
    ],
    portals: [
      { x: 28, y: 3, to: "cinzavale", tx: 23, ty: 32, label: "Cinzavale" },
      { x: 49, y: 21, to: "cripta", tx: 4, ty: 20, label: "Cripta de Vhalmark" },
    ],
  };
}

/* ---------- Cripta de Vhalmark ---------- */

function buildCrypt(): MapDef {
  const W = 46;
  const H = 40;
  const g = grid(W, H, "#");
  const rnd = makeRng(8823);
  const props: Prop[] = [];

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

  for (let k = 0; k < 110; k++) {
    const i = 2 + Math.floor(rnd() * (W - 4));
    const j = 2 + Math.floor(rnd() * (H - 4));
    if (get(g, i, j) === ".") set(g, i, j, rnd() < 0.5 ? "b" : rnd() < 0.5 ? "r" : "w");
  }
  clear(g, 4, 20, 2, ".");
  clear(g, 35, 20, 4, ".");
  clear(g, 34, 5, 2, ".");

  props.push(
    prop("torch", 4, 17),
    prop("torch", 4, 23),
    prop("torch", 16, 6),
    prop("torch", 23, 6),
    prop("torch", 16, 32),
    prop("torch", 22, 32),
    prop("torch", 30, 14),
    prop("torch", 41, 14),
    prop("torch", 30, 26),
    prop("torch", 41, 26),
    prop("sarcophagus", 18, 7),
    prop("sarcophagus", 21, 7),
    prop("sarcophagus", 17, 25),
    prop("sarcophagus", 20, 29),
    prop("sarcophagus", 33, 18),
    prop("sarcophagus", 38, 18),
    prop("banner", 31, 13),
    prop("banner", 40, 13),
    prop("barrel", 5, 18),
    prop("crate", 6, 22),
  );

  const chests: ChestDef[] = [
    { id: "cripta_sala1", x: 19, y: 12, loot: ["elmo_amassado", "pocao_maior"], gold: 45 },
    { id: "cripta_sala2", x: 22, y: 31, loot: ["escudo_da_ordem"], gold: 60 },
    { id: "cripta_alcova", x: 34, y: 4, loot: ["varinha_de_ossos", "tonico_azul"], gold: 70 },
    { id: "cripta_boss", x: 41, y: 26, loot: ["anel_do_usurario", "coroa_de_cinzas"], gold: 120 },
  ];
  const shrines: ShrineDef[] = [{ id: "altar_cripta", x: 5, y: 20, name: "Altar Rachado" }];

  return {
    id: "cripta",
    name: "Cripta de Vhalmark",
    subtitle: "O juramento apodrece embaixo da terra",
    rows: toRows(g),
    palette: CRYPT,
    ambient: "#07080a",
    indoor: true,
    props,
    chests,
    shrines,
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
}

export const MAPS: Record<string, MapDef> = {
  cinzavale: buildVillage(),
  campos: buildFields(),
  cripta: buildCrypt(),
};

export const WORLD_MAP: { id: string; name: string; desc: string; col: number; row: number }[] = [
  { id: "cinzavale", name: "Cinzavale", desc: "Aldeia, capela e o tratante Jareth.", col: 1, row: 0 },
  { id: "campos", name: "Campos Fétidos", desc: "Pântano, lobos e o acampamento de salteadores.", col: 1, row: 1 },
  { id: "cripta", name: "Cripta de Vhalmark", desc: "Ossos, ouro e a Serpe de Cinzas.", col: 2, row: 2 },
];

export function tileAt(mapId: string, x: number, y: number): TileStyle | null {
  const m = MAPS[mapId];
  const row = m?.rows[y];
  if (!row) return null;
  const ch = row[x];
  if (!ch) return null;
  return m?.palette[ch] ?? null;
}

export function tileChar(mapId: string, x: number, y: number): string | null {
  return MAPS[mapId]?.rows[y]?.[x] ?? null;
}

export function isSolid(mapId: string, x: number, y: number) {
  const t = tileAt(mapId, Math.floor(x), Math.floor(y));
  return !t || t.solid;
}
