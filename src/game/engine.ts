import { ENEMIES, ITEMS } from "./items";
import { MAPS, isSolid } from "./maps";
import { DIALOGUES } from "./dialogues";
import { CLASSES, SKILLS } from "./classes";
import { dayNight, isoDir } from "./render";
import type {
  AttrId,
  ChestDef,
  ClassId,
  DialogueEffect,
  Drop,
  Enemy,
  EquipSlot,
  GameState,
  NpcDef,
  Player,
  ShrineDef,
  SkillDef,
} from "./types";

export const SAVE_PREFIX = "cinzas-de-varlan-slot-";
export const SLOTS = [1, 2, 3];
const VERSION = 2;
const BASE_SPEED = 3.9;

let uid = 0;
const nextUid = () => `e${++uid}`;

export function xpForLevel(level: number) {
  return level * 80 + (level - 1) * 40;
}

export function log(s: GameState, text: string, kind: GameState["log"][number]["kind"] = "info") {
  s.log.push({ id: ++uid, text, kind });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

function float(s: GameState, x: number, y: number, text: string, color: string) {
  s.floats.push({ id: ++uid, x, y, text, color, life: 1 });
  if (s.floats.length > 40) s.floats.shift();
}

function makeEnemy(defId: string, x: number, y: number, temporary = false): Enemy {
  const def = ENEMIES[defId]!;
  return {
    uid: nextUid(),
    def: defId,
    x: x + 0.5,
    y: y + 0.5,
    hp: def.hp,
    maxHp: def.hp,
    cooldown: 0,
    hurt: 0,
    dead: false,
    facing: 1,
    poison: 0,
    poisonDmg: 0,
    slow: 0,
    home: { x: x + 0.5, y: y + 0.5 },
    temporary,
  };
}

function spawnWorld(): GameState["world"] {
  const world: GameState["world"] = {};
  for (const map of Object.values(MAPS)) {
    world[map.id] = {
      enemies: map.spawns.map((sp) => makeEnemy(sp.def, sp.x, sp.y)),
      drops: [],
      opened: [],
    };
  }
  return world;
}

export function newGame(name: string, cls: ClassId): GameState {
  const c = CLASSES[cls];
  const player: Player = {
    name: name.trim() || "Órfão",
    cls,
    x: 23.5,
    y: 20.5,
    hp: c.hp,
    maxHp: c.hp,
    mp: c.mp,
    maxMp: c.mp,
    level: 1,
    xp: 0,
    gold: 12,
    cooldown: 0,
    hurt: 0,
    facing: 1,
    reputation: 0,
    knowsSpark: cls === "mago",
    attr: { ...c.attr },
    points: 0,
    skills: [...c.skills],
    skillCd: {},
    buffs: { armor: 0, speed: 0, crit: 0, timer: 0 },
    inventory: [...c.startItems, "amuleto_dos_campos"],
    equip: {
      weapon: c.equip.weapon ?? null,
      shield: c.equip.shield ?? null,
      armor: c.equip.armor ?? null,
      helmet: c.equip.helmet ?? null,
      boots: c.equip.boots ?? null,
      ring: "amuleto_dos_campos",
    },
    quick: "pocao_menor",
  };
  const s: GameState = {
    version: VERSION,
    mapId: "cinzavale",
    player,
    world: spawnWorld(),
    flags: {},
    quests: {},
    log: [],
    dead: false,
    time: 0,
    clock: 8 * 60,
    day: 1,
    discovered: ["cinzavale"],
    respawn: { mapId: "cinzavale", x: 25.5, y: 21.5 },
    floats: [],
  };
  recalcStats(s, true);
  log(s, "Você deixa o campo de trigo apodrecido para trás. Ninguém pergunta para onde vai.", "story");
  log(s, `${CLASSES[cls].name}: ${CLASSES[cls].blurb}`, "story");
  log(s, "Fale com as pessoas de Cinzavale (E). O sul leva aos Campos Fétidos.", "info");
  return s;
}

/* ---------- estatísticas ---------- */

export function equippedItems(s: GameState) {
  return (Object.keys(s.player.equip) as EquipSlot[])
    .map((k) => s.player.equip[k])
    .filter((id): id is string => !!id)
    .map((id) => ITEMS[id])
    .filter((i): i is NonNullable<typeof i> => !!i);
}

function sumStat(s: GameState, key: "armor" | "crit" | "dodge" | "block" | "hpBonus" | "mpBonus") {
  return equippedItems(s).reduce((acc, i) => acc + (i[key] ?? 0), 0);
}

export function maxHp(s: GameState) {
  const c = CLASSES[s.player.cls];
  return Math.round(c.hp + (s.player.level - 1) * 9 + s.player.attr.con * 4 + sumStat(s, "hpBonus"));
}

export function maxMp(s: GameState) {
  const c = CLASSES[s.player.cls];
  return Math.round(c.mp + (s.player.level - 1) * 4 + s.player.attr.mnd * 3 + sumStat(s, "mpBonus"));
}

export function recalcStats(s: GameState, refill = false) {
  s.player.maxHp = maxHp(s);
  s.player.maxMp = maxMp(s);
  if (refill) {
    s.player.hp = s.player.maxHp;
    s.player.mp = s.player.maxMp;
  }
  s.player.hp = Math.min(s.player.hp, s.player.maxHp);
  s.player.mp = Math.min(s.player.mp, s.player.maxMp);
}

export function weaponOf(s: GameState) {
  const id = s.player.equip.weapon;
  return id ? ITEMS[id] : null;
}

export function playerDamage(s: GameState) {
  const w = weaponOf(s);
  const p = s.player;
  const attr = p.cls === "mago" ? p.attr.mnd : p.cls === "ladino" ? p.attr.dex : p.attr.str;
  return Math.round((w?.damage ?? 2) + attr * 0.8 + p.level * 0.6);
}

export function playerArmor(s: GameState) {
  return Math.round(sumStat(s, "armor") + s.player.attr.con * 0.35 + s.player.buffs.armor);
}

export function critChance(s: GameState) {
  return Math.round(4 + s.player.attr.dex * 1.1 + sumStat(s, "crit") + s.player.buffs.crit);
}

export function dodgeChance(s: GameState) {
  return Math.round(s.player.attr.dex * 0.7 + sumStat(s, "dodge"));
}

export function blockChance(s: GameState) {
  return sumStat(s, "block");
}

export function attackDelay(s: GameState) {
  const w = weaponOf(s);
  const spd = (w?.speed ?? 1) * (1 + s.player.attr.dex * 0.018);
  return Math.max(0.22, 0.95 / spd);
}

export function attackReach(s: GameState) {
  return weaponOf(s)?.reach ?? 1.15;
}

export function spellPower(s: GameState) {
  return s.player.attr.mnd + s.player.level;
}

export function moveSpeed(s: GameState) {
  return BASE_SPEED * (1 + s.player.buffs.speed) * (1 + s.player.attr.dex * 0.004);
}

export function canEquip(s: GameState, itemId: string) {
  const item = ITEMS[itemId];
  if (!item?.req) return true;
  return s.player.attr[item.req.attr] >= item.req.value;
}

/* ---------- movimento e colisão ---------- */

function canWalk(s: GameState, x: number, y: number) {
  const r = 0.3;
  return (
    !isSolid(s.mapId, x - r, y - r) &&
    !isSolid(s.mapId, x + r, y - r) &&
    !isSolid(s.mapId, x - r, y + r) &&
    !isSolid(s.mapId, x + r, y + r)
  );
}

function moveBody(s: GameState, body: { x: number; y: number }, dx: number, dy: number) {
  if (dx !== 0 && canWalk(s, body.x + dx, body.y)) body.x += dx;
  if (dy !== 0 && canWalk(s, body.x, body.y + dy)) body.y += dy;
}

export type Input = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  moveTarget: { x: number; y: number } | null;
};

export function nearestEnemy(s: GameState, range: number) {
  const list = s.world[s.mapId]?.enemies ?? [];
  let best: Enemy | null = null;
  let bestD = range;
  for (const e of list) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - s.player.x, e.y - s.player.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export function nearestNpc(s: GameState): NpcDef | null {
  const map = MAPS[s.mapId]!;
  let best: NpcDef | null = null;
  let bestD = 2;
  for (const n of map.npcs) {
    const d = Math.hypot(n.x + 0.5 - s.player.x, n.y + 0.5 - s.player.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function nearestChest(s: GameState): ChestDef | null {
  const map = MAPS[s.mapId]!;
  for (const c of map.chests) {
    if (Math.hypot(c.x + 0.5 - s.player.x, c.y + 0.5 - s.player.y) < 1.5) return c;
  }
  return null;
}

export function nearestShrine(s: GameState): ShrineDef | null {
  const map = MAPS[s.mapId]!;
  for (const sh of map.shrines) {
    if (Math.hypot(sh.x + 0.5 - s.player.x, sh.y + 0.5 - s.player.y) < 1.8) return sh;
  }
  return null;
}

export function gainXp(s: GameState, amount: number) {
  s.player.xp += amount;
  while (s.player.xp >= xpForLevel(s.player.level)) {
    s.player.xp -= xpForLevel(s.player.level);
    s.player.level += 1;
    s.player.points += 3;
    recalcStats(s, true);
    log(s, `Nível ${s.player.level}. 3 pontos de atributo para distribuir.`, "story");
    float(s, s.player.x, s.player.y, "NÍVEL!", "#e2b24a");
  }
}

export function spendPoint(s: GameState, attr: AttrId) {
  if (s.player.points <= 0) return;
  s.player.points -= 1;
  s.player.attr[attr] += 1;
  recalcStats(s);
}

/* ---------- combate ---------- */

function killEnemy(s: GameState, e: Enemy) {
  const def = ENEMIES[e.def]!;
  e.dead = true;
  const zone = s.world[s.mapId]!;
  const gold = def.gold[0] + Math.floor(Math.random() * (def.gold[1] - def.gold[0] + 1));
  if (gold > 0) zone.drops.push({ uid: nextUid(), x: e.x, y: e.y, gold });
  for (const l of def.loot ?? []) {
    if (Math.random() < l.chance)
      zone.drops.push({ uid: nextUid(), x: e.x + (Math.random() - 0.5) * 0.6, y: e.y + 0.3, item: l.item });
  }
  if (e.def === "serpe") {
    zone.drops.push({ uid: nextUid(), x: e.x, y: e.y + 0.5, item: "selo_de_vhalmark" });
    s.flags["serpe_morta"] = true;
    log(s, "A Serpe de Cinzas cai. O selo do capitão brilha entre as brasas.", "story");
  }
  log(s, `${def.name} morreu. +${def.xp} exp.`, "combat");
  gainXp(s, def.xp);
}

function damageEnemy(s: GameState, e: Enemy, raw: number, crit: boolean, color = "#f0d8a8") {
  const def = ENEMIES[e.def]!;
  const dmg = Math.max(1, Math.round(raw - def.armor * 0.6));
  e.hp -= dmg;
  e.hurt = 0.18;
  float(s, e.x, e.y, crit ? `${dmg}!` : `${dmg}`, crit ? "#ffd24a" : color);
  if (e.hp <= 0) killEnemy(s, e);
}

export function attack(s: GameState) {
  const p = s.player;
  if (p.cooldown > 0 || s.dead) return;
  p.cooldown = attackDelay(s);
  const target = nearestEnemy(s, attackReach(s) + 0.35);
  if (!target) return;
  p.facing = isoDir(target.x - p.x, target.y - p.y);
  const crit = Math.random() * 100 < critChance(s);
  const base = playerDamage(s) + Math.floor(Math.random() * 3);
  damageEnemy(s, target, crit ? base * 2 : base, crit);
}

export function useSkill(s: GameState, id: string) {
  const p = s.player;
  const def: SkillDef | undefined = SKILLS[id];
  if (!def || s.dead || !p.skills.includes(id)) return;
  if ((p.skillCd[id] ?? 0) > 0) return;
  if (p.mp < def.cost) {
    log(s, "Éter insuficiente.", "info");
    return;
  }
  const zone = s.world[s.mapId]!;
  const power = spellPower(s);

  if (def.kind === "melee") {
    const target = nearestEnemy(s, attackReach(s) + 0.6);
    if (!target) {
      log(s, "Ninguém ao alcance.", "info");
      return;
    }
    damageEnemy(s, target, (playerDamage(s) + power * 0.4) * def.power, true, "#ffdca8");
  } else if (def.kind === "bolt") {
    const target = nearestEnemy(s, def.range ?? 5);
    if (!target) {
      log(s, "Nenhum alvo à vista.", "info");
      return;
    }
    damageEnemy(s, target, (6 + power * 1.5) * def.power, false, "#9fd8ff");
  } else if (def.kind === "area") {
    const r = def.radius ?? 2.2;
    let hits = 0;
    for (const e of zone.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= r) {
        damageEnemy(s, e, (playerDamage(s) * 0.6 + power) * def.power, false, "#cfe8ff");
        if (def.duration) e.slow = def.duration;
        hits++;
      }
    }
    if (hits === 0) log(s, "O golpe corta apenas o ar.", "info");
  } else if (def.kind === "heal") {
    const heal = Math.round(12 + power * def.power);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    float(s, p.x, p.y, `+${heal}`, "#8ee08a");
  } else if (def.kind === "poison") {
    const target = nearestEnemy(s, attackReach(s) + 0.8);
    if (!target) {
      log(s, "Ninguém ao alcance.", "info");
      return;
    }
    target.poison = def.duration ?? 8;
    target.poisonDmg = Math.max(1, Math.round((playerDamage(s) * def.power) / 2));
    float(s, target.x, target.y, "veneno", "#8fd06a");
  } else if (def.kind === "buff") {
    p.buffs = {
      armor: def.buff?.armor ?? 0,
      speed: def.buff?.speed ?? 0,
      crit: def.buff?.crit ?? 0,
      timer: def.duration ?? 10,
    };
    float(s, p.x, p.y, def.name, "#a8c8ff");
  }

  p.mp -= def.cost;
  p.skillCd[id] = def.cooldown;
  p.cooldown = Math.max(p.cooldown, 0.35);
  log(s, `${def.name} usada.`, "combat");
}

export function castSpark(s: GameState) {
  const id = s.player.skills[0];
  if (id) useSkill(s, id);
}

/* ---------- inventário e equipamento ---------- */

export function countItem(s: GameState, id: string) {
  return s.player.inventory.filter((i) => i === id).length;
}

export function useItem(s: GameState, index: number) {
  const id = s.player.inventory[index];
  if (!id) return;
  const item = ITEMS[id];
  if (!item) return;
  if (item.kind === "potion") {
    if (item.healHp) s.player.hp = Math.min(s.player.maxHp, s.player.hp + item.healHp);
    if (item.healMp) s.player.mp = Math.min(s.player.maxMp, s.player.mp + item.healMp);
    s.player.inventory.splice(index, 1);
    float(s, s.player.x, s.player.y, item.healHp ? `+${item.healHp}` : `+${item.healMp} éter`, "#8ee08a");
    log(s, `Você bebe ${item.name}.`, "loot");
  } else if (item.slot) {
    toggleEquip(s, id);
  }
}

export function toggleEquip(s: GameState, id: string) {
  const item = ITEMS[id];
  if (!item?.slot) return;
  if (s.player.equip[item.slot] === id) {
    s.player.equip[item.slot] = null;
  } else {
    if (!canEquip(s, id)) {
      log(s, `Requer ${item.req!.attr.toUpperCase()} ${item.req!.value}.`, "info");
      return;
    }
    // arma de duas mãos: machado grande ocupa o escudo
    s.player.equip[item.slot] = id;
    if (item.slot === "weapon" && (item.id === "machado_carniceiro" || item.id === "cajado_de_espinho"))
      s.player.equip.shield = null;
  }
  recalcStats(s);
}

export function quickPotion(s: GameState) {
  const idx = s.player.inventory.findIndex((i) => ITEMS[i]?.kind === "potion" && ITEMS[i]?.healHp);
  if (idx >= 0) useItem(s, idx);
  else log(s, "Nenhuma poção de vida na bolsa.", "info");
}

export function dropItem(s: GameState, index: number) {
  const id = s.player.inventory[index];
  if (!id) return;
  s.player.inventory.splice(index, 1);
  for (const slot of Object.keys(s.player.equip) as EquipSlot[])
    if (s.player.equip[slot] === id && !s.player.inventory.includes(id)) s.player.equip[slot] = null;
  s.world[s.mapId]!.drops.push({ uid: nextUid(), x: s.player.x, y: s.player.y + 0.3, item: id });
  recalcStats(s);
}

/* ---------- comércio ---------- */

export function buyPrice(id: string) {
  return Math.max(1, Math.round((ITEMS[id]?.value ?? 1) * 1.25));
}
export function sellPrice(id: string) {
  return Math.max(1, Math.round((ITEMS[id]?.value ?? 1) * 0.45));
}

export function buyItem(s: GameState, id: string) {
  const price = buyPrice(id);
  if (s.player.gold < price) {
    log(s, "Moedas insuficientes.", "info");
    return;
  }
  s.player.gold -= price;
  s.player.inventory.push(id);
  log(s, `Comprou ${ITEMS[id]?.name} por ${price} moedas.`, "loot");
}

export function sellItem(s: GameState, index: number) {
  const id = s.player.inventory[index];
  if (!id) return;
  if (id === "amuleto_dos_campos") {
    log(s, "Você não vende o amuleto da sua mãe.", "story");
    return;
  }
  const price = sellPrice(id);
  s.player.inventory.splice(index, 1);
  for (const slot of Object.keys(s.player.equip) as EquipSlot[])
    if (s.player.equip[slot] === id && !s.player.inventory.includes(id)) s.player.equip[slot] = null;
  s.player.gold += price;
  recalcStats(s);
  log(s, `Vendeu ${ITEMS[id]?.name} por ${price} moedas.`, "loot");
}

/* ---------- baús e santuários ---------- */

export function openChest(s: GameState) {
  const chest = nearestChest(s);
  if (!chest) return false;
  const zone = s.world[s.mapId]!;
  if (zone.opened.includes(chest.id)) {
    log(s, "O baú já está vazio.", "info");
    return false;
  }
  zone.opened.push(chest.id);
  for (const item of chest.loot) {
    s.player.inventory.push(item);
    log(s, `Pegou ${ITEMS[item]?.name ?? item}.`, "loot");
  }
  if (chest.gold) {
    s.player.gold += chest.gold;
    log(s, `+${chest.gold} moedas.`, "loot");
  }
  float(s, s.player.x, s.player.y, "baú aberto", "#e2b24a");
  return true;
}

export function useShrine(s: GameState) {
  const shrine = nearestShrine(s);
  if (!shrine) return false;
  recalcStats(s, true);
  s.respawn = { mapId: s.mapId, x: shrine.x + 1.5, y: shrine.y + 1.5 };
  saveGame(s, currentSlot);
  log(s, `${shrine.name}: você descansa. Vida e éter restaurados, jornada salva.`, "story");
  return true;
}

export function respawn(s: GameState) {
  s.dead = false;
  s.mapId = s.respawn.mapId;
  s.player.x = s.respawn.x;
  s.player.y = s.respawn.y;
  const lost = Math.floor(s.player.gold * 0.1);
  s.player.gold -= lost;
  recalcStats(s, true);
  s.player.buffs = { armor: 0, speed: 0, crit: 0, timer: 0 };
  log(s, `Você acorda no santuário. Perdeu ${lost} moedas no caminho.`, "story");
}

/* ---------- diálogos ---------- */

export function applyEffect(s: GameState, eff: DialogueEffect) {
  if (eff.rep) {
    s.player.reputation = Math.max(-100, Math.min(100, s.player.reputation + eff.rep));
    log(s, eff.rep > 0 ? `Reputação melhora (+${eff.rep}).` : `Reputação piora (${eff.rep}).`, "story");
  }
  if (eff.gold) {
    s.player.gold += eff.gold;
    log(s, `+${eff.gold} moedas.`, "loot");
  }
  if (eff.item) {
    s.player.inventory.push(eff.item);
    log(s, `Recebeu ${ITEMS[eff.item]?.name ?? eff.item}.`, "loot");
  }
  if (eff.removeItem) {
    for (let i = s.player.inventory.length - 1; i >= 0; i--)
      if (s.player.inventory[i] === eff.removeItem) s.player.inventory.splice(i, 1);
  }
  if (eff.flag) s.flags[eff.flag] = true;
  if (eff.quest) s.quests[eff.quest.id] = { stage: eff.quest.stage, done: eff.quest.stage >= 3 };
  if (eff.heal) {
    recalcStats(s, true);
    log(s, "Ysolde fecha suas feridas.", "loot");
  }
  if (eff.learnSpark) {
    s.player.knowsSpark = true;
    if (!s.player.skills.includes("faisca")) s.player.skills.push("faisca");
    log(s, "Você aprendeu Faísca.", "story");
  }
  if (eff.xp) gainXp(s, eff.xp);
  recalcStats(s);
}

export function startNode(s: GameState, dialogueId: string) {
  const d = DIALOGUES[dialogueId];
  if (!d) return null;
  for (const b of d.branch ?? []) if (s.flags[b.flag]) return b.node;
  return d.start;
}

export function optionAvailable(
  s: GameState,
  opt: { requireFlag?: string; requireItem?: string; hideIfFlag?: string },
) {
  if (opt.requireFlag && !s.flags[opt.requireFlag]) return false;
  if (opt.hideIfFlag && s.flags[opt.hideIfFlag]) return false;
  if (opt.requireItem && !s.player.inventory.includes(opt.requireItem)) return false;
  return true;
}

/* ---------- loop ---------- */

let portalLock = 0;
let nightSpawnTimer = 0;

export function tick(s: GameState, dt: number, input: Input): { changedMap: boolean } {
  let changedMap = false;
  const p = s.player;

  // relógio: 1 segundo real = 1 minuto do jogo
  s.time += dt;
  s.clock += dt * 60;
  if (s.clock >= 1440) {
    s.clock -= 1440;
    s.day += 1;
    log(s, `Dia ${s.day} começa.`, "info");
  }

  for (const f of s.floats) f.life -= dt * 0.9;
  s.floats = s.floats.filter((f) => f.life > 0);

  if (s.dead) return { changedMap };

  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.buffs.timer = Math.max(0, p.buffs.timer - dt);
  if (p.buffs.timer === 0 && (p.buffs.armor || p.buffs.speed || p.buffs.crit))
    p.buffs = { armor: 0, speed: 0, crit: 0, timer: 0 };
  for (const k of Object.keys(p.skillCd)) p.skillCd[k] = Math.max(0, (p.skillCd[k] ?? 0) - dt);
  portalLock = Math.max(0, portalLock - dt);
  p.mp = Math.min(p.maxMp, p.mp + dt * (0.5 + p.attr.mnd * 0.08));
  p.hp = Math.min(p.maxHp, p.hp + dt * 0.25);

  // movimento
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx || dy) {
    input.moveTarget = null;
    // teclas em espaço isométrico: cima = norte visual
    const ix = dx * 0.7071 + dy * 0.7071;
    const iy = dy * 0.7071 - dx * 0.7071;
    dx = ix;
    dy = iy;
  } else if (input.moveTarget) {
    const vx = input.moveTarget.x - p.x;
    const vy = input.moveTarget.y - p.y;
    const d = Math.hypot(vx, vy);
    if (d < 0.18) input.moveTarget = null;
    else {
      dx = vx / d;
      dy = vy / d;
    }
  }
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    const step = (moveSpeed(s) * dt) / len;
    p.facing = isoDir(dx, dy);
    moveBody(s, p, dx * step, dy * step);
  }

  const zone = s.world[s.mapId]!;
  const map = MAPS[s.mapId]!;

  // spawn noturno em áreas abertas
  const dark = map.indoor ? 0 : dayNight(s.clock);
  nightSpawnTimer -= dt;
  if (dark > 0.6 && nightSpawnTimer <= 0) {
    nightSpawnTimer = 12;
    const live = zone.enemies.filter((e) => !e.dead && e.temporary).length;
    if (live < 4) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 7 + Math.random() * 4;
      const nx = Math.floor(p.x + Math.cos(ang) * dist);
      const ny = Math.floor(p.y + Math.sin(ang) * dist);
      if (!isSolid(s.mapId, nx + 0.5, ny + 0.5)) {
        zone.enemies.push(makeEnemy("espectro_noturno", nx, ny, true));
        log(s, "Algo se move na névoa. A noite trouxe companhia.", "story");
      }
    }
  }
  // assombros somem de dia
  if (dark < 0.2)
    for (const e of zone.enemies)
      if (e.temporary && !e.dead) {
        e.dead = true;
      }

  // inimigos
  for (const e of zone.enemies) {
    if (e.dead) continue;
    const def = ENEMIES[e.def]!;
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    e.slow = Math.max(0, e.slow - dt);
    if (e.poison > 0) {
      e.poison -= dt;
      e.hp -= e.poisonDmg * dt;
      if (e.hp <= 0) {
        killEnemy(s, e);
        continue;
      }
    }
    const vx = p.x - e.x;
    const vy = p.y - e.y;
    const d = Math.hypot(vx, vy);
    if (d > def.aggro) {
      // volta devagar para o posto
      const hx = e.home.x - e.x;
      const hy = e.home.y - e.y;
      const hd = Math.hypot(hx, hy);
      if (hd > 0.8) {
        const step = (def.speed * 0.4 * dt) / hd;
        moveBody(s, e, hx * step, hy * step);
      }
      continue;
    }
    e.facing = isoDir(vx, vy);
    if (d > def.range * 0.85) {
      const step = (def.speed * (e.slow > 0 ? 0.45 : 1) * dt) / (d || 1);
      moveBody(s, e, vx * step, vy * step);
    } else if (e.cooldown <= 0) {
      e.cooldown = def.attackDelay;
      if (Math.random() * 100 < dodgeChance(s)) {
        float(s, p.x, p.y, "esquiva", "#cfe8ff");
      } else if (Math.random() * 100 < blockChance(s)) {
        float(s, p.x, p.y, "bloqueio", "#c8c8d8");
      } else {
        const dmg = Math.max(1, Math.round(def.damage - playerArmor(s) * 0.55 + (Math.random() * 3 - 1)));
        p.hp -= dmg;
        p.hurt = 0.2;
        float(s, p.x, p.y, `-${dmg}`, "#ff7a6a");
        if (p.hp <= 0) {
          p.hp = 0;
          s.dead = true;
          log(s, "A lama entra na sua boca. Acaba assim, como todos disseram que acabaria.", "story");
        }
      }
    }
  }

  // coletar drops
  for (let i = zone.drops.length - 1; i >= 0; i--) {
    const drop = zone.drops[i] as Drop;
    if (Math.hypot(drop.x - p.x, drop.y - p.y) < 0.8) {
      if (drop.gold) {
        p.gold += drop.gold;
        float(s, p.x, p.y, `+${drop.gold} moedas`, "#e2b24a");
      }
      if (drop.item) {
        p.inventory.push(drop.item);
        log(s, `Pegou ${ITEMS[drop.item]?.name ?? drop.item}.`, "loot");
      }
      zone.drops.splice(i, 1);
    }
  }

  // portais
  if (portalLock <= 0) {
    for (const portal of map.portals) {
      if (Math.hypot(portal.x + 0.5 - p.x, portal.y + 0.5 - p.y) < 0.9) {
        s.mapId = portal.to;
        p.x = portal.tx + 0.5;
        p.y = portal.ty + 0.5;
        portalLock = 1.2;
        changedMap = true;
        if (!s.discovered.includes(portal.to)) s.discovered.push(portal.to);
        log(s, `${MAPS[portal.to]!.name} — ${MAPS[portal.to]!.subtitle}.`, "story");
        break;
      }
    }
  }

  return { changedMap };
}

/* ---------- saves ---------- */

let currentSlot = 1;
export function setSlot(n: number) {
  currentSlot = n;
}
export function getSlot() {
  return currentSlot;
}

export function saveGame(s: GameState, slot = currentSlot) {
  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot = currentSlot): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.player || parsed.version !== VERSION || !MAPS[parsed.mapId]) return null;
    parsed.floats = [];
    return parsed;
  } catch {
    return null;
  }
}

export type SlotInfo = { slot: number; name: string; cls: ClassId; level: number; map: string; day: number } | null;

export function slotInfo(slot: number): SlotInfo {
  const s = loadGame(slot);
  if (!s) return null;
  return {
    slot,
    name: s.player.name,
    cls: s.player.cls,
    level: s.player.level,
    map: MAPS[s.mapId]?.name ?? "?",
    day: s.day,
  };
}

export function deleteSlot(slot: number) {
  try {
    localStorage.removeItem(SAVE_PREFIX + slot);
  } catch {
    /* ignore */
  }
}

export function reputationLabel(rep: number) {
  if (rep <= -60) return "Monstro";
  if (rep <= -25) return "Temido";
  if (rep < 10) return "Desconhecido";
  if (rep < 40) return "Confiável";
  if (rep < 70) return "Defensor";
  return "Herói de Cinzavale";
}
