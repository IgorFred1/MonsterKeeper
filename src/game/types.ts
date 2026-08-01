export type Vec = { x: number; y: number };

export type ItemKind = "weapon" | "armor" | "potion" | "quest" | "trinket";

export type EquipSlot = "weapon" | "shield" | "armor" | "helmet" | "boots" | "ring";

export type Rarity = "comum" | "boa" | "rara" | "lendaria";

export type AttrId = "str" | "dex" | "con" | "mnd";

export type Attributes = Record<AttrId, number>;

export type Item = {
  id: string;
  name: string;
  kind: ItemKind;
  desc: string;
  value: number;
  rarity: Rarity;
  slot?: EquipSlot;
  damage?: number;
  armor?: number;
  speed?: number; // multiplicador de velocidade de ataque (1 = normal)
  reach?: number;
  crit?: number; // % adicional
  dodge?: number;
  block?: number;
  hpBonus?: number;
  mpBonus?: number;
  healHp?: number;
  healMp?: number;
  req?: { attr: AttrId; value: number };
  tint: string;
  stack?: boolean;
};

export type EnemySprite = "humanoid" | "beast" | "skeleton" | "dragon";

export type EnemyDef = {
  id: string;
  name: string;
  level: number;
  hp: number;
  damage: number;
  armor: number;
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
  sprite: EnemySprite;
  night?: boolean;
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
  poison: number;
  poisonDmg: number;
  slow: number;
  home: { x: number; y: number };
  temporary?: boolean;
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
  shop?: string[];
};

export type Portal = {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  label: string;
};

export type ChestDef = { id: string; x: number; y: number; loot: string[]; gold: number };

export type ShrineDef = { id: string; x: number; y: number; name: string };

export type PropKind =
  | "tree"
  | "deadtree"
  | "bush"
  | "rock"
  | "barrel"
  | "crate"
  | "torch"
  | "well"
  | "tent"
  | "cart"
  | "sarcophagus"
  | "banner"
  | "grass";

export type Prop = { kind: PropKind; x: number; y: number };

export type MapDef = {
  id: string;
  name: string;
  subtitle: string;
  rows: string[];
  palette: Record<string, TileStyle>;
  spawns: { def: string; x: number; y: number }[];
  npcs: NpcDef[];
  portals: Portal[];
  props: Prop[];
  chests: ChestDef[];
  shrines: ShrineDef[];
  ambient: string;
  indoor?: boolean;
};

export type TileStyle = {
  solid: boolean;
  base: string;
  speck: string;
  speck2?: string;
  tall?: boolean;
  height?: number;
  wood?: boolean;
  liquid?: boolean;
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
  shop?: boolean;
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

export type SkillId = string;

export type SkillDef = {
  id: SkillId;
  name: string;
  cls: ClassId;
  desc: string;
  cost: number;
  cooldown: number;
  kind: "melee" | "area" | "bolt" | "heal" | "buff" | "poison";
  power: number;
  radius?: number;
  range?: number;
  duration?: number;
  buff?: { armor?: number; speed?: number; crit?: number };
  icon: string;
};

export type ClassId = "guerreiro" | "mago" | "clerigo" | "ladino";

export type ClassDef = {
  id: ClassId;
  name: string;
  blurb: string;
  hp: number;
  mp: number;
  attr: Attributes;
  startItems: string[];
  equip: Partial<Record<EquipSlot, string>>;
  skills: SkillId[];
  robe: string;
};

export type Buffs = { armor: number; speed: number; crit: number; timer: number };

export type Player = {
  name: string;
  cls: ClassId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  gold: number;
  cooldown: number;
  hurt: number;
  facing: number;
  reputation: number;
  knowsSpark: boolean;
  attr: Attributes;
  points: number;
  skills: SkillId[];
  skillCd: Record<string, number>;
  buffs: Buffs;
  inventory: string[];
  equip: Record<EquipSlot, string | null>;
  quick: string | null;
};

export type QuestState = { stage: number; done: boolean };

export type FloatText = { id: number; x: number; y: number; text: string; color: string; life: number };

export type GameState = {
  version: number;
  mapId: string;
  player: Player;
  world: Record<string, { enemies: Enemy[]; drops: Drop[]; opened: string[] }>;
  flags: Record<string, boolean>;
  quests: Record<string, QuestState>;
  log: { id: number; text: string; kind: "info" | "combat" | "loot" | "story" }[];
  dead: boolean;
  time: number;
  clock: number; // minutos do dia (0-1440)
  day: number;
  discovered: string[];
  respawn: { mapId: string; x: number; y: number };
  floats: FloatText[];
};
