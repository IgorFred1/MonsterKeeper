import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS } from "@/game/items";
import { MAPS } from "@/game/maps";
import { DIALOGUES } from "@/game/dialogues";
import { render } from "@/game/render";
import { TILE } from "@/game/render";
import {
  applyEffect,
  attack,
  castSpark,
  dropItem,
  hasSave,
  loadGame,
  nearestNpc,
  newGame,
  optionAvailable,
  playerArmor,
  playerDamage,
  reputationLabel,
  saveGame,
  startNode,
  tick,
  useItem,
  xpForLevel,
  type Input,
} from "@/game/engine";
import type { GameState } from "@/game/types";

const PIXEL = 2;

type Screen = "title" | "play";

export function Game() {
  const [screen, setScreen] = useState<Screen>("title");
  const [saveExists, setSaveExists] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  useEffect(() => setSaveExists(hasSave()), []);

  const begin = (loaded?: GameState | null) => {
    stateRef.current = loaded ?? newGame();
    setScreen("play");
  };

  if (screen === "title")
    return (
      <TitleScreen
        hasSave={saveExists}
        onNew={() => begin(null)}
        onContinue={() => begin(loadGame())}
      />
    );

  return <Playfield stateRef={stateRef} rerender={rerender} onQuit={() => setScreen("title")} />;
}

function TitleScreen({
  hasSave,
  onNew,
  onContinue,
}: {
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(226,178,74,0.10),transparent_60%)]" />
      <div className="relative w-full max-w-2xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-accent">RPG de ação · Varlan</p>
        <h1 className="mt-5 font-display text-5xl leading-[0.95] text-foreground sm:text-7xl">
          Cinzas de Varlan
        </h1>
        <p className="mt-7 text-base leading-relaxed text-muted-foreground">
          Você é um órfão dos campos, sem talento, sem nome e sem futuro. Há dragões nas ruínas,
          cavaleiros que quebraram juramentos e homens que vendem qualquer coisa. O mundo é sujo e
          violento. Ele não vai perguntar se você é bom — só vai registrar o que você fez.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onNew}
            className="w-full rounded-none border border-accent bg-accent/15 px-8 py-3 font-mono text-sm uppercase tracking-widest text-accent transition hover:bg-accent hover:text-accent-foreground sm:w-auto"
          >
            Deixar os campos
          </button>
          {hasSave && (
            <button
              onClick={onContinue}
              className="w-full rounded-none border border-border px-8 py-3 font-mono text-sm uppercase tracking-widest text-muted-foreground transition hover:border-foreground hover:text-foreground sm:w-auto"
            >
              Continuar
            </button>
          )}
        </div>
        <div className="mt-12 grid gap-2 border-t border-border pt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
          <p>WASD ou clique no chão para andar · clique no inimigo ou espaço para atacar</p>
          <p>E fala · 1 poção · 2 faísca · I inventário</p>
        </div>
      </div>
    </div>
  );
}

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
  const [showInv, setShowInv] = useState(false);
  const dialogueRef = useRef(false);
  dialogueRef.current = !!dialogue;
  const s = stateRef.current!;

  const talk = () => {
    const npc = nearestNpc(s);
    if (!npc) return;
    const node = startNode(s, npc.dialogue);
    if (node) setDialogue({ id: npc.dialogue, node });
  };

  const quickPotion = () => {
    const idx = s.player.inventory.findIndex((i) => ITEMS[i]?.kind === "potion" && ITEMS[i]?.healHp);
    if (idx >= 0) {
      useItem(s, idx);
      rerender();
    }
  };

  // loop
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
        if (!dialogueRef.current) tick(s, dt, inputRef.current);
        render(canvas, s, hoverRef.current);
      }
      hudTimer += dt;
      if (hudTimer > 0.12) {
        hudTimer = 0;
        rerender();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s, rerender]);

  // teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const i = inputRef.current;
      if (["w", "arrowup"].includes(k)) i.up = true;
      if (["s", "arrowdown"].includes(k)) i.down = true;
      if (["a", "arrowleft"].includes(k)) i.left = true;
      if (["d", "arrowright"].includes(k)) i.right = true;
      if (k === " ") {
        e.preventDefault();
        if (!dialogueRef.current) attack(s);
      }
      if (k === "e" && !dialogueRef.current) talk();
      if (k === "1") quickPotion();
      if (k === "2" && !dialogueRef.current) castSpark(s);
      if (k === "i") setShowInv((v) => !v);
      if (k === "escape") {
        setShowInv(false);
        setDialogue(null);
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
    const rect = canvas.getBoundingClientRect();
    const cx = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const baked = MAPS[s.mapId]!;
    const mapW = baked.rows[0]!.length * TILE;
    const mapH = baked.rows.length * TILE;
    let camX = s.player.x * TILE - canvas.width / 2;
    let camY = s.player.y * TILE - canvas.height / 2;
    camX = Math.round(Math.max(0, Math.min(mapW - canvas.width, camX)));
    camY = Math.round(Math.max(0, Math.min(mapH - canvas.height, camY)));
    return { x: (cx + camX) / TILE, y: (cy + camY) / TILE };
  };

  const onClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const target = toWorld(ev);
    const enemies = s.world[s.mapId]!.enemies.filter((e) => !e.dead);
    const hit = enemies.find((e) => Math.hypot(e.x - target.x, e.y - target.y) < 0.8);
    const npc = MAPS[s.mapId]!.npcs.find(
      (n) => Math.hypot(n.x + 0.5 - target.x, n.y + 0.9 - target.y) < 0.9,
    );
    if (hit) {
      if (Math.hypot(hit.x - s.player.x, hit.y - s.player.y) <= 1.3) attack(s);
      else inputRef.current.moveTarget = { x: hit.x, y: hit.y };
      return;
    }
    if (npc) {
      if (Math.hypot(npc.x + 0.5 - s.player.x, npc.y + 0.5 - s.player.y) < 1.8) talk();
      else inputRef.current.moveTarget = { x: npc.x + 0.5, y: npc.y + 1.6 };
      return;
    }
    inputRef.current.moveTarget = target;
  };

  const p = s.player;
  const map = MAPS[s.mapId]!;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg leading-none">Cinzas de Varlan</h1>
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {map.name}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
          <button
            onClick={() => {
              saveGame(s);
              rerender();
            }}
            className="border border-border px-3 py-1 text-muted-foreground transition hover:border-accent hover:text-accent"
          >
            Salvar
          </button>
          <button
            onClick={onQuit}
            className="border border-border px-3 py-1 text-muted-foreground transition hover:border-destructive hover:text-destructive"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div ref={wrapRef} className="relative h-[62vh] flex-1 overflow-hidden bg-black lg:h-auto">
          <canvas
            ref={canvasRef}
            onClick={onClick}
            onMouseMove={(e) => (hoverRef.current = toWorld(e))}
            onMouseLeave={() => (hoverRef.current = null)}
            className="h-full w-full cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
          />
          <p className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.3em] text-accent/80">
            {map.subtitle}
          </p>

          {/* controles touch */}
          <div className="absolute bottom-3 right-3 flex gap-2 lg:hidden">
            <button
              onClick={() => attack(s)}
              className="h-14 w-14 border border-accent/70 bg-black/60 font-mono text-[10px] uppercase text-accent"
            >
              Atacar
            </button>
            <button
              onClick={talk}
              className="h-14 w-14 border border-border bg-black/60 font-mono text-[10px] uppercase text-muted-foreground"
            >
              Falar
            </button>
          </div>

          {s.dead && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/85 px-6 text-center">
              <h2 className="font-display text-4xl text-destructive">Você morreu na lama</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                O mundo não guarda luto por órfãos. Só registra a vaga que você abriu.
              </p>
              <div className="flex gap-3 font-mono text-xs uppercase tracking-widest">
                <button
                  onClick={() => {
                    const loaded = loadGame();
                    if (loaded) {
                      stateRef.current = loaded;
                      rerender();
                    }
                  }}
                  className="border border-accent px-5 py-2 text-accent"
                >
                  Carregar
                </button>
                <button onClick={onQuit} className="border border-border px-5 py-2 text-muted-foreground">
                  Menu
                </button>
              </div>
            </div>
          )}

          {dialogue && (
            <DialogueBox
              state={s}
              dialogue={dialogue}
              onPick={(next, effect) => {
                if (effect) applyEffect(s, effect);
                if (next) setDialogue({ ...dialogue, node: next });
                else setDialogue(null);
                rerender();
              }}
              onClose={() => setDialogue(null)}
            />
          )}
        </div>

        <aside className="w-full shrink-0 border-t border-border lg:w-80 lg:border-l lg:border-t-0">
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Órfão dos campos</span>
              <span className="text-accent">Nv {p.level}</span>
            </div>
            <Bar label="Vida" value={p.hp} max={p.maxHp} color="bg-destructive" />
            <Bar label="Éter" value={p.mp} max={p.maxMp} color="bg-chart-2" />
            <Bar label="Exp" value={p.xp} max={xpForLevel(p.level)} color="bg-accent" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono text-[11px] text-muted-foreground">
              <span>Dano {playerDamage(s)}</span>
              <span>Armadura {playerArmor(s)}</span>
              <span className="text-accent">Moedas {p.gold}</span>
              <span className={p.reputation < 0 ? "text-destructive" : "text-chart-2"}>
                {reputationLabel(p.reputation)} ({p.reputation})
              </span>
            </div>
          </div>

          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-accent">Diário</h2>
              <button
                onClick={() => setShowInv((v) => !v)}
                className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Bolsa ({p.inventory.length})
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {Object.entries(s.quests).length === 0 && <li>Nada além de fome e estrada.</li>}
              {s.quests["lobos"] && (
                <li className={s.quests["lobos"].stage >= 2 ? "line-through opacity-60" : ""}>
                  Lobos-Cinza: reunir 5 dentes para o Sargento Corvin.
                </li>
              )}
              {s.quests["selo"] && (
                <li className={s.quests["selo"].stage >= 3 ? "line-through opacity-60" : ""}>
                  {s.quests["selo"].stage >= 4
                    ? "O Selo de Vhalmark: vendido a Jareth."
                    : "O Selo de Vhalmark: recuperar o sinete na cripta."}
                </li>
              )}
            </ul>
          </div>

          {showInv ? (
            <Inventory state={s} onChange={rerender} onClose={() => setShowInv(false)} />
          ) : (
            <LogPanel state={s} />
          )}
        </aside>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span>
          {Math.floor(value)}/{Math.floor(max)}
        </span>
      </div>
      <div className="mt-1 h-2 w-full bg-secondary">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LogPanel({ state }: { state: GameState }) {
  const items = state.log.slice(-40).reverse();
  return (
    <div className="max-h-[34vh] overflow-y-auto p-4 lg:max-h-none">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-accent">Crônica</h2>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed">
        {items.map((l) => (
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
    </div>
  );
}

function Inventory({
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
    <div className="max-h-[40vh] overflow-y-auto p-4 lg:max-h-none">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-accent">Bolsa</h2>
        <button onClick={onClose} className="font-mono text-[10px] uppercase text-muted-foreground">
          fechar
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {p.inventory.length === 0 && <li className="text-xs text-muted-foreground">Vazia.</li>}
        {p.inventory.map((id, i) => {
          const item = ITEMS[id];
          if (!item) return null;
          const equipped = p.weapon === id || p.armor === id;
          return (
            <li key={`${id}-${i}`} className="border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0" style={{ backgroundColor: item.tint }} />
                <span className="flex-1 text-sm">{item.name}</span>
                {equipped && (
                  <span className="font-mono text-[10px] uppercase text-accent">equipado</span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.desc}</p>
              <div className="mt-2 flex gap-2 font-mono text-[10px] uppercase tracking-widest">
                {(item.kind === "potion" || item.kind === "weapon" || item.kind === "armor") && (
                  <button
                    onClick={() => {
                      useItem(state, i);
                      onChange();
                    }}
                    className="border border-accent/60 px-2 py-0.5 text-accent"
                  >
                    {item.kind === "potion" ? "usar" : equipped ? "guardar" : "equipar"}
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
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DialogueBox({
  state,
  dialogue,
  onPick,
  onClose,
}: {
  state: GameState;
  dialogue: { id: string; node: string };
  onPick: (next: string | null, effect?: import("@/game/types").DialogueEffect) => void;
  onClose: () => void;
}) {
  const d = DIALOGUES[dialogue.id];
  const node = d?.nodes[dialogue.node];
  const options = useMemo(
    () => (node?.options ?? []).filter((o) => optionAvailable(state, o)),
    [node, state],
  );
  if (!d || !node) return null;
  return (
    <div className="absolute inset-0 flex items-end bg-black/70 p-4">
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
          {options.length === 0 && (
            <li>
              <button
                onClick={onClose}
                className="w-full px-2 py-1.5 text-left text-sm text-muted-foreground"
              >
                › (sair)
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
