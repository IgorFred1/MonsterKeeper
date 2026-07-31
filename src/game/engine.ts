import { ENEMIES, ITEMS } from "./items";
import { MAPS, isSolid } from "./maps";
import { DIALOGUES } from "./dialogues";
import type { DialogueEffect, Drop, Enemy, GameState, NpcDef } from "./types";

export const SAVE_KEY = "cinzas-de-varlan-save-v1";
const PLAYER_SPEED = 4.4;
const ATTACK_RANGE = 1.25;
const ATTACK_CD = 0.55;
const SPARK_COST = 6;

let uid = 0;
const nextUid = () => `e${++uid}`;

export function xpForLevel(level: number) {
  return level * 80 + (level - 1) * 30;
}

export function log(s: GameState, text: string, kind: GameState["log"][number]["kind"] = "info") {
  s.log.push({ id: ++uid, text, kind });
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

function spawnWorld(): GameState["world"] {
  const world: GameState["world"] = {};
  for (const map of Object.values(MAPS)) {
    world[map.id] = {
      enemies: map.spawns.map<Enemy>((sp) => {
        const def = ENEMIES[sp.def]!;
        return {
          uid: nextUid(),
          def: sp.def,
          x: sp.x + 0.5,
          y: sp.y + 0.5,
          hp: def.hp,
          maxHp: def.hp,
          cooldown: 0,
          hurt: 0,
          dead: false,
          facing: 1,
        };
      }),
      drops: [],
    };
  }
  return world;
}

export function newGame(): GameState {
  const s: GameState = {
    mapId: "cinzavale",
    player: {
      x: 23.5,
      y: 20.5,
      hp: 42,
      maxHp: 42,
      mp: 12,
      maxMp: 12,
      level: 1,
      xp: 0,
      gold: 3,
      baseDamage: 2,
      cooldown: 0,
      hurt: 0,
      facing: 1,
      reputation: 0,
      knowsSpark: false,
      inventory: ["foice_enferrujada", "amuleto_dos_campos", "pocao_menor"],
      weapon: "foice_enferrujada",
      armor: null,
    },
    world: spawnWorld(),
    flags: {},
    quests: {},
    log: [],
    dead: false,
    time: 0,
  };
  log(s, "Você deixa o campo de trigo apodrecido para trás. Ninguém pergunta para onde vai.", "story");
  log(s, "Fale com as pessoas de Cinzavale (E). O sul leva aos Campos Fétidos.", "info");
  return s;
}

export function playerDamage(s: GameState) {
  const w = s.player.weapon ? ITEMS[s.player.weapon] : null;
  return s.player.baseDamage + (w?.damage ?? 0) + Math.floor(s.player.level * 0.8);
}

export function playerArmor(s: GameState) {
  const a = s.player.armor ? ITEMS[s.player.armor] : null;
  return a?.armor ?? 0;
}

function canWalk(s: GameState, x: number, y: number) {
  const r = 0.32;
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
  let bestD = 1.8;
  for (const n of map.npcs) {
    const d = Math.hypot(n.x + 0.5 - s.player.x, n.y + 0.5 - s.player.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function gainXp(s: GameState, amount: number) {
  s.player.xp += amount;
  while (s.player.xp >= xpForLevel(s.player.level)) {
    s.player.xp -= xpForLevel(s.player.level);
    s.player.level += 1;
    s.player.maxHp += 12;
    s.player.maxMp += 5;
    s.player.baseDamage += 1;
    s.player.hp = s.player.maxHp;
    s.player.mp = s.player.maxMp;
    log(s, `Nível ${s.player.level}. Seu corpo aprende a apanhar melhor.`, "story");
  }
}

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

export function attack(s: GameState) {
  if (s.player.cooldown > 0 || s.dead) return;
  s.player.cooldown = ATTACK_CD;
  const target = nearestEnemy(s, ATTACK_RANGE);
  if (!target) return;
  const dmg = playerDamage(s) + Math.floor(Math.random() * 3);
  target.hp -= dmg;
  target.hurt = 0.18;
  log(s, `Você acerta ${ENEMIES[target.def]!.name} (-${dmg}).`, "combat");
  if (target.hp <= 0) killEnemy(s, target);
}

export function castSpark(s: GameState) {
  if (s.dead || !s.player.knowsSpark || s.player.mp < SPARK_COST || s.player.cooldown > 0) return;
  s.player.cooldown = 0.5;
  const target = nearestEnemy(s, 5);
  if (!target) {
    log(s, "A faísca morre no ar. Nada por perto.", "info");
    return;
  }
  s.player.mp -= SPARK_COST;
  const dmg = 10 + s.player.level * 3 + Math.floor(Math.random() * 4);
  target.hp -= dmg;
  target.hurt = 0.25;
  log(s, `Faísca queima ${ENEMIES[target.def]!.name} (-${dmg}).`, "combat");
  if (target.hp <= 0) killEnemy(s, target);
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
    log(s, `Você bebe ${item.name}.`, "loot");
  } else if (item.kind === "weapon") {
    s.player.weapon = s.player.weapon === id ? null : id;
  } else if (item.kind === "armor") {
    s.player.armor = s.player.armor === id ? null : id;
  }
}

export function dropItem(s: GameState, index: number) {
  const id = s.player.inventory[index];
  if (!id) return;
  s.player.inventory.splice(index, 1);
  if (s.player.weapon === id) s.player.weapon = null;
  if (s.player.armor === id) s.player.armor = null;
  s.world[s.mapId]!.drops.push({ uid: nextUid(), x: s.player.x, y: s.player.y + 0.3, item: id });
}

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
    s.player.hp = s.player.maxHp;
    s.player.mp = s.player.maxMp;
    log(s, "Ysolde fecha suas feridas.", "loot");
  }
  if (eff.learnSpark) {
    s.player.knowsSpark = true;
    log(s, "Você aprendeu Faísca (tecla 2).", "story");
  }
  if (eff.xp) gainXp(s, eff.xp);
}

export function startNode(s: GameState, dialogueId: string) {
  const d = DIALOGUES[dialogueId];
  if (!d) return null;
  for (const b of d.branch ?? []) if (s.flags[b.flag]) return b.node;
  return d.start;
}

export function optionAvailable(s: GameState, opt: { requireFlag?: string; requireItem?: string; hideIfFlag?: string }) {
  if (opt.requireFlag && !s.flags[opt.requireFlag]) return false;
  if (opt.hideIfFlag && s.flags[opt.hideIfFlag]) return false;
  if (opt.requireItem && !s.player.inventory.includes(opt.requireItem)) return false;
  return true;
}

let portalLock = 0;

export function tick(s: GameState, dt: number, input: Input): { changedMap: boolean } {
  let changedMap = false;
  if (s.dead) return { changedMap };
  s.time += dt;
  const p = s.player;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  portalLock = Math.max(0, portalLock - dt);
  if (s.time % 1 < dt) p.mp = Math.min(p.maxMp, p.mp + 0.5);

  // movimento por teclado
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx || dy) input.moveTarget = null;
  else if (input.moveTarget) {
    const vx = input.moveTarget.x - p.x;
    const vy = input.moveTarget.y - p.y;
    const d = Math.hypot(vx, vy);
    if (d < 0.2) input.moveTarget = null;
    else {
      dx = vx / d;
      dy = vy / d;
    }
  }
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    const step = (PLAYER_SPEED * dt) / len;
    if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
    moveBody(s, p, dx * step, dy * step);
  }

  const zone = s.world[s.mapId]!;

  // inimigos
  for (const e of zone.enemies) {
    if (e.dead) continue;
    const def = ENEMIES[e.def]!;
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.hurt = Math.max(0, e.hurt - dt);
    const vx = p.x - e.x;
    const vy = p.y - e.y;
    const d = Math.hypot(vx, vy);
    if (d > def.aggro) continue;
    e.facing = vx > 0 ? 1 : -1;
    if (d > def.range * 0.85) {
      const step = (def.speed * dt) / (d || 1);
      moveBody(s, e, vx * step, vy * step);
    } else if (e.cooldown <= 0) {
      e.cooldown = def.attackDelay;
      const dmg = Math.max(1, def.damage - Math.floor(playerArmor(s) * 0.7) + Math.floor(Math.random() * 3) - 1);
      p.hp -= dmg;
      p.hurt = 0.2;
      log(s, `${def.name} te acerta (-${dmg}).`, "combat");
      if (p.hp <= 0) {
        p.hp = 0;
        s.dead = true;
        log(s, "A lama entra na sua boca. Acaba assim, como todos disseram que acabaria.", "story");
      }
    }
  }

  // coletar drops
  for (let i = zone.drops.length - 1; i >= 0; i--) {
    const drop = zone.drops[i] as Drop;
    if (Math.hypot(drop.x - p.x, drop.y - p.y) < 0.75) {
      if (drop.gold) {
        p.gold += drop.gold;
        log(s, `+${drop.gold} moedas.`, "loot");
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
    for (const portal of MAPS[s.mapId]!.portals) {
      if (Math.hypot(portal.x + 0.5 - p.x, portal.y + 0.5 - p.y) < 0.8) {
        s.mapId = portal.to;
        p.x = portal.tx + 0.5;
        p.y = portal.ty + 0.5;
        portalLock = 1;
        changedMap = true;
        log(s, `${MAPS[portal.to]!.name} — ${MAPS[portal.to]!.subtitle}.`, "story");
        break;
      }
    }
  }

  return { changedMap };
}

export function saveGame(s: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.player || !MAPS[parsed.mapId]) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
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
