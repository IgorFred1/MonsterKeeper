import { useMemo, useState } from "react";
import { ITEMS, RARITY_COLOR } from "@/game/items";
import { DIALOGUES } from "@/game/dialogues";
import { MAPS, WORLD_MAP } from "@/game/maps";
import { ATTR_DESC, ATTR_LABEL, CLASSES, SKILLS } from "@/game/classes";
import {
  attackDelay,
  blockChance,
  buyPrice,
  buyItem,
  canEquip,
  critChance,
  dodgeChance,
  dropItem,
  optionAvailable,
  playerArmor,
  playerDamage,
  reputationLabel,
  sellItem,
  sellPrice,
  spendPoint,
  toggleEquip,
  useItem,
  xpForLevel,
} from "@/game/engine";
import type { AttrId, EquipSlot, GameState } from "@/game/types";

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: "Arma",
  shield: "Escudo",
  armor: "Peito",
  helmet: "Elmo",
  boots: "Botas",
  ring: "Anel",
};

export function Panel({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-3">
      <div
        className={`flex max-h-full w-full flex-col border border-accent/40 bg-card/95 ${wide ? "max-w-3xl" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{title}</h2>
          <button
            onClick={onClose}
            className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
          >
            fechar
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function ItemLine({
  id,
  state,
  right,
  onClick,
}: {
  id: string;
  state: GameState;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const item = ITEMS[id];
  if (!item) return null;
  const ok = canEquip(state, id);
  return (
    <li className="border border-border/70 p-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0" style={{ backgroundColor: item.tint }} />
        <button onClick={onClick} className="flex-1 text-left text-sm" style={{ color: RARITY_COLOR[item.rarity] }}>
          {item.name}
        </button>
        {right}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.desc}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] text-muted-foreground">
        {item.damage ? <span>dano {item.damage}</span> : null}
        {item.speed ? <span>vel {item.speed.toFixed(2)}x</span> : null}
        {item.armor ? <span>arm {item.armor}</span> : null}
        {item.block ? <span>bloq {item.block}%</span> : null}
        {item.dodge ? <span>esq {item.dodge}%</span> : null}
        {item.crit ? <span>crit {item.crit}%</span> : null}
        {item.hpBonus ? <span>+{item.hpBonus} vida</span> : null}
        {item.mpBonus ? <span>+{item.mpBonus} éter</span> : null}
        {item.req ? (
          <span className={ok ? "text-chart-2" : "text-destructive"}>
            requer {ATTR_LABEL[item.req.attr]} {item.req.value}
          </span>
        ) : null}
        <span className="text-accent">{item.value} m</span>
      </div>
    </li>
  );
}

export function InventoryPanel({
  state,
  onChange,
  onClose,
}: {
  state: GameState;
  onChange: () => void;
  onClose: () => void;
}) {
  const p = state.player;
  const grouped = useMemo(() => {
    const map = new Map<string, number[]>();
    p.inventory.forEach((id, i) => {
      const arr = map.get(id) ?? [];
      arr.push(i);
      map.set(id, arr);
    });
    return [...map.entries()];
  }, [p.inventory]);

  return (
    <Panel title={`Bolsa · ${p.gold} moedas`} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent">Equipado</h3>
          <ul className="mt-2 space-y-1">
            {(Object.keys(SLOT_LABEL) as EquipSlot[]).map((slot) => {
              const id = p.equip[slot];
              const item = id ? ITEMS[id] : null;
              return (
                <li key={slot} className="flex items-center justify-between border border-border/60 px-2 py-1">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{SLOT_LABEL[slot]}</span>
                  <span className="text-[11px]" style={{ color: item ? RARITY_COLOR[item.rarity] : undefined }}>
                    {item?.name ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <ul className="space-y-2">
          {grouped.length === 0 && <li className="text-xs text-muted-foreground">Vazia.</li>}
          {grouped.map(([id, idxs]) => {
            const item = ITEMS[id]!;
            const i = idxs[0]!;
            const equipped = item.slot && p.equip[item.slot] === id;
            return (
              <ItemLine
                key={id}
                id={id}
                state={state}
                right={
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest">
                    {idxs.length > 1 && <span className="text-accent">x{idxs.length}</span>}
                    {equipped && <span className="text-accent">equipado</span>}
                    {(item.kind === "potion" || item.slot) && (
                      <button
                        onClick={() => {
                          useItem(state, i);
                          onChange();
                        }}
                        className="border border-accent/60 px-2 py-0.5 text-accent"
                      >
                        {item.kind === "potion" ? "usar" : equipped ? "tirar" : "equipar"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        dropItem(state, i);
                        onChange();
                      }}
                      className="border border-border px-2 py-0.5 text-muted-foreground"
                    >
                      largar
                    </button>
                  </span>
                }
                onClick={() => {
                  if (item.slot) {
                    toggleEquip(state, id);
                    onChange();
                  }
                }}
              />
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

export function CharacterPanel({
  state,
  onChange,
  onClose,
}: {
  state: GameState;
  onChange: () => void;
  onClose: () => void;
}) {
  const p = state.player;
  return (
    <Panel title={`${p.name} · ${CLASSES[p.cls].name} nível ${p.level}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Atributos</span>
            <span className={p.points > 0 ? "text-accent" : ""}>{p.points} pontos</span>
          </div>
          <ul className="mt-2 space-y-1">
            {(["str", "dex", "con", "mnd"] as AttrId[]).map((a) => (
              <li key={a} className="flex items-center gap-2 border border-border/60 px-2 py-1">
                <span className="w-28 text-sm">{ATTR_LABEL[a]}</span>
                <span className="font-mono text-sm text-accent">{p.attr[a]}</span>
                <span className="flex-1 text-[10px] text-muted-foreground">{ATTR_DESC[a]}</span>
                {p.points > 0 && (
                  <button
                    onClick={() => {
                      spendPoint(state, a);
                      onChange();
                    }}
                    className="border border-accent/60 px-2 font-mono text-xs text-accent"
                  >
                    +
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span>Vida {Math.floor(p.hp)}/{p.maxHp}</span>
          <span>Éter {Math.floor(p.mp)}/{p.maxMp}</span>
          <span>Dano {playerDamage(state)}</span>
          <span>Armadura {playerArmor(state)}</span>
          <span>Crítico {critChance(state)}%</span>
          <span>Esquiva {dodgeChance(state)}%</span>
          <span>Bloqueio {blockChance(state)}%</span>
          <span>Ataque {attackDelay(state).toFixed(2)}s</span>
          <span className="text-accent">Moedas {p.gold}</span>
          <span>Exp {p.xp}/{xpForLevel(p.level)}</span>
          <span className={p.reputation < 0 ? "text-destructive" : "text-chart-2"}>
            {reputationLabel(p.reputation)} ({p.reputation})
          </span>
        </div>
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent">Habilidades</h3>
          <ul className="mt-2 space-y-1">
            {p.skills.map((id) => {
              const sk = SKILLS[id];
              if (!sk) return null;
              return (
                <li key={id} className="border border-border/60 px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">{sk.icon}</span>
                    <span className="text-sm">{sk.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {sk.cost} éter · {sk.cooldown}s
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{sk.desc}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export function JournalPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const q = state.quests;
  return (
    <Panel title="Diário" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent">Missão principal</h3>
          <p className="mt-1 text-muted-foreground">
            {state.flags["serpe_morta"]
              ? "A Serpe caiu. O selo de Vhalmark está com você — decida a quem entregar."
              : "Descobrir o que apodrece sob a Cripta de Vhalmark e o que restou do juramento da Ordem."}
          </p>
        </section>
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent">Secundárias</h3>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {Object.keys(q).length === 0 && <li>Nada além de fome e estrada.</li>}
            {q["lobos"] && (
              <li className={q["lobos"].stage >= 2 ? "line-through opacity-60" : ""}>
                Lobos-Cinza: reunir 5 dentes para o Sargento Corvin.
              </li>
            )}
            {q["selo"] && (
              <li className={q["selo"].stage >= 3 ? "line-through opacity-60" : ""}>
                {q["selo"].stage >= 4
                  ? "O Selo de Vhalmark: vendido a Jareth."
                  : "O Selo de Vhalmark: recuperar o sinete na cripta."}
              </li>
            )}
          </ul>
        </section>
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-accent">Crônica</h3>
          <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto text-xs">
            {state.log
              .slice(-40)
              .reverse()
              .map((l) => (
                <li
                  key={l.id}
                  className={
                    l.kind === "story"
                      ? "text-foreground"
                      : l.kind === "loot"
                        ? "text-accent"
                        : l.kind === "combat"
                          ? "text-destructive/80"
                          : "text-muted-foreground"
                  }
                >
                  {l.text}
                </li>
              ))}
          </ul>
        </section>
      </div>
    </Panel>
  );
}

export function WorldMapPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <Panel title="Mapa de Varlan" onClose={onClose}>
      <div className="space-y-2">
        {WORLD_MAP.map((m) => {
          const known = state.discovered.includes(m.id);
          const here = state.mapId === m.id;
          return (
            <div
              key={m.id}
              className={`border p-3 ${here ? "border-accent bg-accent/10" : known ? "border-border" : "border-border/40 opacity-50"}`}
              style={{ marginLeft: m.col * 18 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{known ? m.name : "Região desconhecida"}</span>
                {here && <span className="font-mono text-[10px] uppercase text-accent">você está aqui</span>}
              </div>
              {known && <p className="mt-1 text-[11px] text-muted-foreground">{m.desc}</p>}
            </div>
          );
        })}
        <p className="pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Dia {state.day} · {MAPS[state.mapId]!.name}
        </p>
      </div>
    </Panel>
  );
}

export function ShopPanel({
  state,
  stock,
  onChange,
  onClose,
}: {
  state: GameState;
  stock: string[];
  onChange: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const p = state.player;
  return (
    <Panel title={`Comércio · ${p.gold} moedas`} onClose={onClose} wide>
      <div className="mb-3 flex gap-2 font-mono text-[10px] uppercase tracking-widest">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border px-3 py-1 ${tab === t ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
          >
            {t === "buy" ? "comprar" : "vender"}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {tab === "buy"
          ? stock.map((id) => (
              <ItemLine
                key={id}
                id={id}
                state={state}
                right={
                  <button
                    onClick={() => {
                      buyItem(state, id);
                      onChange();
                    }}
                    className="border border-accent/60 px-2 py-0.5 font-mono text-[10px] uppercase text-accent"
                  >
                    {buyPrice(id)} m
                  </button>
                }
              />
            ))
          : p.inventory.map((id, i) => (
              <ItemLine
                key={`${id}-${i}`}
                id={id}
                state={state}
                right={
                  <button
                    onClick={() => {
                      sellItem(state, i);
                      onChange();
                    }}
                    className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
                  >
                    +{sellPrice(id)} m
                  </button>
                }
              />
            ))}
      </ul>
    </Panel>
  );
}

export function DialogueBox({
  state,
  dialogue,
  onPick,
  onClose,
  onShop,
  hasShop,
}: {
  state: GameState;
  dialogue: { id: string; node: string };
  onPick: (next: string | null, effect?: import("@/game/types").DialogueEffect) => void;
  onClose: () => void;
  onShop: () => void;
  hasShop: boolean;
}) {
  const d = DIALOGUES[dialogue.id];
  const node = d?.nodes[dialogue.node];
  const options = useMemo(
    () => (node?.options ?? []).filter((o) => optionAvailable(state, o)),
    [node, state],
  );
  if (!d || !node) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/70 p-4">
      <div className="mx-auto w-full max-w-2xl border border-accent/40 bg-card p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{d.id}</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{node.text}</p>
        <ul className="mt-4 space-y-1">
          {options.map((o, i) => (
            <li key={i}>
              <button
                onClick={() => onPick(o.next, o.effect)}
                className={`w-full border border-transparent px-2 py-1.5 text-left text-sm transition hover:border-border hover:bg-secondary ${
                  o.tone === "evil"
                    ? "text-destructive"
                    : o.tone === "good"
                      ? "text-chart-2"
                      : "text-muted-foreground"
                }`}
              >
                › {o.text}
              </button>
            </li>
          ))}
          {hasShop && (
            <li>
              <button
                onClick={onShop}
                className="w-full border border-transparent px-2 py-1.5 text-left text-sm text-accent hover:border-border hover:bg-secondary"
              >
                › (ver mercadorias)
              </button>
            </li>
          )}
          <li>
            <button
              onClick={onClose}
              className="w-full px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-secondary"
            >
              › (sair)
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
