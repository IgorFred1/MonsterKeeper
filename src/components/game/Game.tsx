import { useEffect, useRef, useState } from "react";
import { MAPS } from "@/game/maps";
import { CLASSES, SKILLS } from "@/game/classes";
import { render, screenToTile, isoX, isoY, clockLabel, dayNight } from "@/game/render";
import {
  applyEffect,
  attack,
  countItem,
  deleteSlot,
  loadGame,
  nearestChest,
  nearestNpc,
  nearestShrine,
  newGame,
  openChest,
  playerArmor,
  playerDamage,
  quickPotion,
  respawn,
  saveGame,
  setSlot,
  slotInfo,
  startNode,
  tick,
  useShrine,
  useSkill,
  xpForLevel,
  SLOTS,
  type Input,
} from "@/game/engine";
import type { ClassId, GameState } from "@/game/types";
import {
  CharacterPanel,
  DialogueBox,
  InventoryPanel,
  JournalPanel,
  ShopPanel,
  WorldMapPanel,
} from "./Hud";

const PIXEL = 2;
type Screen = "title" | "create" | "play";

export function Game() {
  const [screen, setScreen] = useState<Screen>("title");
  const stateRef = useRef<GameState | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const begin = (s: GameState) => {
    stateRef.current = s;
    setScreen("play");
  };

  if (screen === "title")
    return (
      <TitleScreen
        onNew={() => setScreen("create")}
        onLoad={(slot) => {
          const s = loadGame(slot);
          if (s) {
            setSlot(slot);
            begin(s);
          }
        }}
      />
    );

  if (screen === "create")
    return (
      <CreateScreen
        onBack={() => setScreen("title")}
        onStart={(name, cls, slot) => {
          setSlot(slot);
          const s = newGame(name, cls);
          saveGame(s, slot);
          begin(s);
        }}
      />
    );

  return <Playfield stateRef={stateRef} rerender={rerender} onQuit={() => setScreen("title")} />;
}

/* ---------------- título ---------------- */

function TitleScreen({ onNew, onLoad }: { onNew: () => void; onLoad: (slot: number) => void }) {
  const [slots, setSlots] = useState<ReturnType<typeof slotInfo>[]>([]);
  useEffect(() => setSlots(SLOTS.map((n) => slotInfo(n))), []);
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(226,178,74,0.10),transparent_60%)]" />
      <div className="relative w-full max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-accent">RPG isométrico · Varlan</p>
        <h1 className="mt-5 font-display text-5xl leading-[0.95] text-foreground sm:text-7xl">Cinzas de Varlan</h1>
        <p className="mt-7 text-base leading-relaxed text-muted-foreground">
          Escolha uma classe, cruze os campos apodrecidos e desça na Cripta de Vhalmark. O mundo é sujo e violento —
          ele não pergunta se você é bom, só registra o que você fez.
        </p>
        <div className="mt-10 space-y-2 text-left">
          {SLOTS.map((n, i) => {
            const info = slots[i];
            return (
              <div key={n} className="flex items-center gap-3 border border-border px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Slot {n}</span>
                <span className="flex-1 text-sm">
                  {info
                    ? `${info.name} · ${CLASSES[info.cls].name} nv ${info.level} · ${info.map} · Dia ${info.day}`
                    : "vazio"}
                </span>
                {info && (
                  <>
                    <button
                      onClick={() => onLoad(n)}
                      className="border border-accent px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-accent"
                    >
                      continuar
                    </button>
                    <button
                      onClick={() => {
                        deleteSlot(n);
                        setSlots(SLOTS.map((k) => slotInfo(k)));
                      }}
                      className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground"
                    >
                      apagar
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={onNew}
          className="mt-8 w-full rounded-none border border-accent bg-accent/15 px-8 py-3 font-mono text-sm uppercase tracking-widest text-accent transition hover:bg-accent hover:text-accent-foreground sm:w-auto"
        >
          Nova jornada
        </button>
        <div className="mt-10 grid gap-2 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
          <p>WASD ou clique no chão para andar · clique no inimigo ou espaço para atacar</p>
          <p>E interagir · 1 poção · 2/3/4 habilidades · I bolsa · C ficha · J diário · M mapa</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- criação ---------------- */

function CreateScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (name: string, cls: ClassId, slot: number) => void;
}) {
  const [name, setName] = useState("");
  const [cls, setCls] = useState<ClassId>("guerreiro");
  const [slot, setSlot2] = useState(1);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-14">
      <div className="w-full max-w-3xl">
        <h1 className="font-display text-3xl text-foreground">Quem você vai ser</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(Object.keys(CLASSES) as ClassId[]).map((id) => {
            const c = CLASSES[id];
            const active = cls === id;
            return (
              <button
                key={id}
                onClick={() => setCls(id)}
                className={`border p-4 text-left transition ${active ? "border-accent bg-accent/10" : "border-border hover:border-foreground/40"}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-xl">{c.name}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {c.hp} vida · {c.mp} éter
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-accent">
                  FOR {c.attr.str} · DES {c.attr.dex} · CON {c.attr.con} · MEN {c.attr.mnd}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {c.skills.map((s) => SKILLS[s]?.name).join(" · ")}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do órfão"
            maxLength={18}
            className="border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            {SLOTS.map((n) => (
              <button
                key={n}
                onClick={() => setSlot2(n)}
                className={`border px-3 py-2 ${slot === n ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
              >
                slot {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => onStart(name, cls, slot)}
            className="border border-accent bg-accent/15 px-6 py-2 font-mono text-xs uppercase tracking-widest text-accent"
          >
            começar
          </button>
          <button onClick={onBack} className="px-3 py-2 font-mono text-xs uppercase text-muted-foreground">
            voltar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- jogo ---------------- */

function Playfield({
  stateRef,
  rerender,
  onQuit,
}: {
  stateRef: React.MutableRefObject<GameState | null>;
  rerender: () => void;
  onQuit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<Input>({ up: false, down: false, left: false, right: false, moveTarget: null });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const [dialogue, setDialogue] = useState<{ id: string; node: string } | null>(null);
  const [shop, setShop] = useState<string[] | null>(null);
  const [panel, setPanel] = useState<"inv" | "char" | "journal" | "map" | null>(null);
  const blockedRef = useRef(false);
  const s = stateRef.current!;
  blockedRef.current = !!dialogue || !!shop || !!panel;

  const talk = () => {
    const npc = nearestNpc(s);
    if (npc) {
      const node = startNode(s, npc.dialogue);
      if (node) setDialogue({ id: npc.dialogue, node });
      return true;
    }
    return false;
  };

  const interact = () => {
    if (talk()) return;
    if (nearestShrine(s)) {
      useShrine(s);
      rerender();
      return;
    }
    if (nearestChest(s)) {
      openChest(s);
      rerender();
    }
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let hudTimer = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (canvas && wrap) {
        const w = Math.floor(wrap.clientWidth / PIXEL);
        const h = Math.floor(wrap.clientHeight / PIXEL);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        if (!blockedRef.current) tick(s, dt, inputRef.current);
        render(canvas, s, hoverRef.current);
      }
      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        rerender();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s, rerender]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const i = inputRef.current;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (["w", "arrowup"].includes(k)) i.up = true;
      if (["s", "arrowdown"].includes(k)) i.down = true;
      if (["a", "arrowleft"].includes(k)) i.left = true;
      if (["d", "arrowright"].includes(k)) i.right = true;
      if (k === " ") {
        e.preventDefault();
        if (!blockedRef.current) attack(s);
      }
      if (k === "e" && !blockedRef.current) interact();
      if (k === "1") quickPotion(s);
      if (["2", "3", "4"].includes(k) && !blockedRef.current) {
        const id = s.player.skills[Number(k) - 2];
        if (id) useSkill(s, id);
      }
      if (k === "i") setPanel((p) => (p === "inv" ? null : "inv"));
      if (k === "c") setPanel((p) => (p === "char" ? null : "char"));
      if (k === "j") setPanel((p) => (p === "journal" ? null : "journal"));
      if (k === "m") setPanel((p) => (p === "map" ? null : "map"));
      if (k === "escape") {
        setPanel(null);
        setDialogue(null);
        setShop(null);
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const i = inputRef.current;
      if (["w", "arrowup"].includes(k)) i.up = false;
      if (["s", "arrowdown"].includes(k)) i.down = false;
      if (["a", "arrowleft"].includes(k)) i.left = false;
      if (["d", "arrowright"].includes(k)) i.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  const toWorld = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const map = MAPS[s.mapId]!;
    const rect = canvas.getBoundingClientRect();
    const cx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const floorW = (map.rows[0]!.length + map.rows.length) * 16 + 32;
    const floorH = (map.rows[0]!.length + map.rows.length) * 8 + 96 + 64;
    let camX = isoX(map, s.player.x, s.player.y) - canvas.width / 2;
    let camY = isoY(map, s.player.x, s.player.y) - canvas.height / 2;
    camX = Math.round(Math.max(0, Math.min(floorW - canvas.width, camX)));
    camY = Math.round(Math.max(0, Math.min(floorH - canvas.height, camY)));
    return screenToTile(map, cx + camX, cy + camY);
  };

  const onClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const target = toWorld(ev);
    const enemies = s.world[s.mapId]!.enemies.filter((e) => !e.dead);
    const hit = enemies.find((e) => Math.hypot(e.x - target.x, e.y - target.y) < 0.9);
    const npc = MAPS[s.mapId]!.npcs.find((n) => Math.hypot(n.x + 0.5 - target.x, n.y + 0.5 - target.y) < 1);
    if (hit) {
      if (Math.hypot(hit.x - s.player.x, hit.y - s.player.y) <= 1.4) attack(s);
      else inputRef.current.moveTarget = { x: hit.x, y: hit.y };
      return;
    }
    if (npc) {
      if (Math.hypot(npc.x + 0.5 - s.player.x, npc.y + 0.5 - s.player.y) < 2) talk();
      else inputRef.current.moveTarget = { x: npc.x + 0.5, y: npc.y + 1.2 };
      return;
    }
    inputRef.current.moveTarget = target;
  };

  const p = s.player;
  const map = MAPS[s.mapId]!;
  const potions = countItem(s, "pocao_menor") + countItem(s, "pocao_maior");
  const night = !map.indoor && dayNight(s.clock) > 0.5;
  const shopNpc = nearestNpc(s);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div ref={wrapRef} className="relative min-h-screen flex-1 overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          onClick={onClick}
          onMouseMove={(e) => (hoverRef.current = toWorld(e))}
          onMouseLeave={() => (hoverRef.current = null)}
          className="h-full w-full cursor-crosshair"
          style={{ imageRendering: "pixelated" }}
        />

        {/* retrato e barras */}
        <div className="pointer-events-none absolute left-2 top-2 flex items-start gap-2">
          <div className="relative h-16 w-14 border border-accent/60 bg-card/80">
            <div className="absolute inset-x-0 top-0 border-b border-accent/40 bg-accent/20 text-center font-mono text-[10px] text-accent">
              {p.level}
            </div>
            <div
              className="absolute inset-x-2 bottom-2 top-6"
              style={{ background: CLASSES[p.cls].robe, opacity: 0.85 }}
            />
          </div>
          <div className="w-40 space-y-1 sm:w-56">
            <MiniBar value={p.hp} max={p.maxHp} color="bg-destructive" label={`${Math.floor(p.hp)}/${p.maxHp}`} />
            <MiniBar value={p.mp} max={p.maxMp} color="bg-chart-2" label={`${Math.floor(p.mp)}/${p.maxMp}`} />
            <MiniBar value={p.xp} max={xpForLevel(p.level)} color="bg-accent" label="exp" thin />
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {p.name} · {CLASSES[p.cls].name} · dano {playerDamage(s)} · arm {playerArmor(s)} · {p.gold} m
            </p>
          </div>
        </div>

        {/* botões de menu */}
        <div className="absolute right-2 top-2 flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest">
          {(
            [
              ["inv", "bolsa"],
              ["char", "ficha"],
              ["journal", "diário"],
              ["map", "mapa"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPanel((v) => (v === id ? null : id))}
              className="border border-border bg-black/60 px-2 py-1 text-muted-foreground hover:border-accent hover:text-accent"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              saveGame(s);
              rerender();
            }}
            className="border border-border bg-black/60 px-2 py-1 text-muted-foreground hover:border-accent hover:text-accent"
          >
            salvar
          </button>
          <button
            onClick={onQuit}
            className="border border-border bg-black/60 px-2 py-1 text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            sair
          </button>
        </div>

        {/* poção rápida */}
        <button
          onClick={() => {
            quickPotion(s);
            rerender();
          }}
          className="absolute left-2 top-24 flex h-12 w-12 flex-col items-center justify-center border border-accent/60 bg-black/60 font-mono text-[10px] text-accent"
        >
          <span className="text-lg leading-none">✚</span>
          <span>x{potions}</span>
        </button>

        {/* barra de ações */}
        <div className="absolute bottom-10 right-3 flex items-end gap-2">
          {p.skills.map((id, i) => {
            const sk = SKILLS[id];
            if (!sk) return null;
            const cd = p.skillCd[id] ?? 0;
            return (
              <button
                key={id}
                onClick={() => {
                  useSkill(s, id);
                  rerender();
                }}
                className="relative flex h-12 w-12 flex-col items-center justify-center border border-border bg-black/65 font-mono text-[9px] text-muted-foreground"
              >
                <span className="text-base leading-none text-accent">{sk.icon}</span>
                <span>{cd > 0 ? cd.toFixed(1) : `${i + 2}`}</span>
                {cd > 0 && <span className="absolute inset-0 bg-black/60" />}
              </button>
            );
          })}
          <button
            onClick={() => {
              attack(s);
              rerender();
            }}
            className="flex h-16 w-16 items-center justify-center border border-accent/70 bg-black/65 font-mono text-2xl text-accent"
          >
            ⚔
          </button>
          <button
            onClick={() => {
              interact();
              rerender();
            }}
            className="flex h-12 w-12 items-center justify-center border border-border bg-black/65 font-mono text-lg text-muted-foreground"
          >
            ☞
          </button>
        </div>

        {/* rodapé */}
        <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[11px] tracking-wide text-foreground/90">
          {map.name}: Dia {s.day}, {clockLabel(s.clock)}
          {night ? " · noite" : ""}
        </p>
        <p className="pointer-events-none absolute bottom-2 right-3 max-w-[45%] truncate font-mono text-[10px] text-muted-foreground">
          {s.log[s.log.length - 1]?.text ?? ""}
        </p>

        {p.points > 0 && (
          <button
            onClick={() => setPanel("char")}
            className="absolute left-2 top-40 border border-accent bg-accent/20 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent"
          >
            {p.points} pontos
          </button>
        )}

        {s.dead && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/85 px-6 text-center">
            <h2 className="font-display text-4xl text-destructive">Você morreu na lama</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              O santuário mais próximo ainda lembra do seu nome. Ele cobra 10% das suas moedas.
            </p>
            <div className="flex gap-3 font-mono text-xs uppercase tracking-widest">
              <button
                onClick={() => {
                  respawn(s);
                  rerender();
                }}
                className="border border-accent px-5 py-2 text-accent"
              >
                acordar no santuário
              </button>
              <button onClick={onQuit} className="border border-border px-5 py-2 text-muted-foreground">
                menu
              </button>
            </div>
          </div>
        )}

        {dialogue && (
          <DialogueBox
            state={s}
            dialogue={dialogue}
            hasShop={!!shopNpc?.shop}
            onShop={() => {
              setShop(shopNpc?.shop ?? []);
              setDialogue(null);
            }}
            onPick={(next, effect) => {
              if (effect) applyEffect(s, effect);
              if (effect?.shop && shopNpc?.shop) {
                setShop(shopNpc.shop);
                setDialogue(null);
              } else if (next) setDialogue({ ...dialogue, node: next });
              else setDialogue(null);
              rerender();
            }}
            onClose={() => setDialogue(null)}
          />
        )}

        {shop && <ShopPanel state={s} stock={shop} onChange={rerender} onClose={() => setShop(null)} />}
        {panel === "inv" && <InventoryPanel state={s} onChange={rerender} onClose={() => setPanel(null)} />}
        {panel === "char" && <CharacterPanel state={s} onChange={rerender} onClose={() => setPanel(null)} />}
        {panel === "journal" && <JournalPanel state={s} onClose={() => setPanel(null)} />}
        {panel === "map" && <WorldMapPanel state={s} onClose={() => setPanel(null)} />}
      </div>
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
  label,
  thin,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  thin?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`relative w-full border border-border/70 bg-black/70 ${thin ? "h-1.5" : "h-3"}`}>
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      {!thin && (
        <span className="absolute inset-0 text-center font-mono text-[9px] leading-3 text-foreground/90">{label}</span>
      )}
    </div>
  );
}
