export type Vec = { x: number; y: number };

export type ItemKind = "weapon" | "armor" | "potion" | "quest" | "trinket";

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  desc: string;
  value: number;
  damage?: number;
  armor?: number;
  healHp?: number;
  healMp?: number;
  tint: string;
};

export type EnemyDef = {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  range: number;
  aggro: number;
  attackDelay: number;
  gold: [number, number];
  loot?: { item: string; chance: number }[];
  body: string;
  accent: string;
  size: number;
};

export type Enemy = {
  uid: string;
  def: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  hurt: number;
  dead: boolean;
  facing: number;
};

export type Drop = {
  uid: string;
  x: number;
  y: number;
  item?: string;
  gold?: number;
};

export type NpcDef = {
  id: string;
  name: string;
  x: number;
  y: number;
  robe: string;
  skin: string;
  dialogue: string;
};

export type Portal = {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  label: string;
};

export type MapDef = {
  id: string;
  name: string;
  subtitle: string;
  rows: string[];
  palette: Record<string, TileStyle>;
  spawns: { def: string; x: number; y: number }[];
  npcs: NpcDef[];
  portals: Portal[];
  ambient: string;
};

export type TileStyle = {
  solid: boolean;
  base: string;
  speck: string;
  speck2?: string;
  tall?: boolean;
};

export type DialogueEffect = {
  rep?: number;
  gold?: number;
  item?: string;
  removeItem?: string;
  flag?: string;
  quest?: { id: string; stage: number };
  heal?: boolean;
  learnSpark?: boolean;
  xp?: number;
};

export type DialogueOption = {
  text: string;
  next: string | null;
  effect?: DialogueEffect;
  requireFlag?: string;
  requireItem?: string;
  hideIfFlag?: string;
  tone?: "good" | "evil" | "neutral";
};

export type DialogueNode = {
  text: string;
  options: DialogueOption[];
};

export type Dialogue = {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
  branch?: { flag: string; node: string }[];
};

export type Player = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  gold: number;
  baseDamage: number;
  cooldown: number;
  hurt: number;
  facing: number;
  reputation: number;
  knowsSpark: boolean;
  inventory: string[];
  weapon: string | null;
  armor: string | null;
};

export type QuestState = { stage: number; done: boolean };

export type GameState = {
  mapId: string;
  player: Player;
  world: Record<string, { enemies: Enemy[]; drops: Drop[] }>;
  flags: Record<string, boolean>;
  quests: Record<string, QuestState>;
  log: { id: number; text: string; kind: "info" | "combat" | "loot" | "story" }[];
  dead: boolean;
  time: number;
};
