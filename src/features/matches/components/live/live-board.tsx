"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CloudOff, Loader2, Pause, Play, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  elapsedSeconds,
  formatClock,
  minutesLabel,
  parseClock,
  playerSeconds,
  playerStats,
  score,
  type LiveAction,
  type LiveEvent,
  type LiveState,
  type Side,
} from "../../live";
import {
  ActionPanel,
  actionFor,
  countsOfPlayer,
  countsOfSide,
  type ActionKey,
} from "./action-grid";
import { Bench } from "./bench";
import { LineupPitch } from "./lineup-pitch";
import { TeamStatsTable } from "./live-summary";
import { PlayerPicker } from "./player-picker";
import { playerName, toPlayerMap, type LivePlayer, type PlayerMap } from "./types";

export type SyncState = { kind: "saved" | "saving" } | { kind: "offline"; error: string };

type Selection = { kind: "slot"; slot: number } | { kind: "bench"; id: string } | null;

/** Hora do toque. Só se chama em handlers de eventos, nunca a desenhar. */
const timestamp = () => Date.now();

const SIDE_LABEL: Record<Side, string> = { us: "nosso", them: "deles" };
const STAT_LABEL = {
  corner: "Canto",
  foul: "Falta",
  turnover: "Bola perdida",
  recovery: "Bola recuperada",
} as const;

/** Atalhos de teclado (PC). Nos nossos jogadores é a tecla; no adversário, Shift + a tecla. */
const KEY_ACTION: Record<string, ActionKey> = {
  g: "goal",
  b: "onTarget",
  f: "offTarget",
  r: "recovery",
  p: "turnover",
  c: "corner",
  l: "foul",
};
const HINTS: Partial<Record<ActionKey, string>> = {
  goal: "G",
  onTarget: "B",
  offTarget: "F",
  recovery: "R",
  turnover: "P",
  corner: "C",
  foul: "L",
};
const THEIR_HINTS: Partial<Record<ActionKey, string>> = {
  goal: "⇧G",
  onTarget: "⇧B",
  offTarget: "⇧F",
  recovery: "⇧R",
  turnover: "⇧P",
  corner: "⇧C",
  foul: "⇧L",
};

function describe(e: LiveEvent, map: PlayerMap): string {
  switch (e.type) {
    case "goal":
      if (e.side === "us" && e.playerId) {
        const assist = e.assistId ? ` (ass. ${playerName(map, e.assistId)})` : "";
        return `Golo de ${playerName(map, e.playerId)}${assist}`;
      }
      return `Golo ${SIDE_LABEL[e.side]}`;
    case "shot": {
      const what = `Remate${e.onTarget ? " à baliza" : " fora"}`;
      return e.playerId
        ? `${what} de ${playerName(map, e.playerId)}`
        : `${what} ${SIDE_LABEL[e.side]}`;
    }
    case "sub":
      return `Entrou ${playerName(map, e.inId)}`;
    case "swap":
      return `Trocaram ${playerName(map, e.aId)} e ${playerName(map, e.bId)}`;
    case "period_end":
    case "period_start":
      return "";
    default:
      return e.playerId
        ? `${STAT_LABEL[e.type]} de ${playerName(map, e.playerId)}`
        : `${STAT_LABEL[e.type]} ${SIDE_LABEL[e.side]}`;
  }
}

const UNDOABLE = new Set(["goal", "shot", "corner", "foul", "turnover", "recovery", "sub", "swap"]);

/** O jogo a decorrer: marcador, relógio, campo, banco e contagens. No PC usa a largura toda. */
export function LiveBoard({
  state,
  dispatch,
  players,
  teamName,
  opponent,
  nowMs,
  sync,
  onRetry,
  newId,
}: {
  state: LiveState;
  dispatch: (a: LiveAction) => void;
  players: LivePlayer[];
  teamName: string;
  opponent: string;
  nowMs: number;
  sync: SyncState;
  onRetry: () => void;
  newId: () => string;
}) {
  const map = toPlayerMap(players);
  const [selected, setSelected] = useState<Selection>(null);
  // Golo nosso: o marcador é o jogador escolhido; falta a assistência (opcional). `at` é a hora do toque.
  const [goalFlow, setGoalFlow] = useState<{ at: number; scorerId: string } | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const lines = playerStats(state);

  useEffect(() => {
    if (!confirmFinish) return;
    const t = setTimeout(() => setConfirmFinish(false), 4000);
    return () => clearTimeout(t);
  }, [confirmFinish]);

  const result = score(state);
  const elapsed = elapsedSeconds(state, nowMs);
  const periodEnd = state.periodMinutes * 60 * state.period;
  const overtime = state.status === "running" && elapsed >= periodEnd;
  const seconds = playerSeconds(state, nowMs);
  const minutes = Object.fromEntries(
    Object.entries(seconds).map(([id, s]) => [id, minutesLabel(s)]),
  );
  const running = state.status === "running";
  const lastEvent = state.events.at(-1);
  const canUndo = !!lastEvent && UNDOABLE.has(lastEvent.type);
  const recent = state.events
    .filter((e) => UNDOABLE.has(e.type))
    .slice(-6)
    .reverse();

  const periodLabel =
    state.status === "halftime" ? "Intervalo" : state.period === 1 ? "1.ª parte" : "2.ª parte";

  function substitute(slot: number, inId: string) {
    const outId = state.slots[slot];
    dispatch({ type: "sub", now: timestamp(), id: newId(), slot, inId });
    setSelected(null);
    navigator.vibrate?.(15);
    toast.success(`Entrou ${playerName(map, inId)}, saiu ${playerName(map, outId)}`);
  }

  function swapSlots(a: number, b: number) {
    const aId = state.slots[a];
    const bId = state.slots[b];
    dispatch({ type: "swap", now: timestamp(), id: newId(), a, b });
    setSelected(null);
    navigator.vibrate?.(15);
    toast.success(`Trocaram: ${playerName(map, aId)} e ${playerName(map, bId)}`);
  }

  function onSlot(slot: number) {
    if (selected?.kind === "bench") return substitute(slot, selected.id);
    if (selected?.kind === "slot" && selected.slot !== slot) return swapSlots(selected.slot, slot);
    setSelected(
      selected?.kind === "slot" && selected.slot === slot ? null : { kind: "slot", slot },
    );
  }

  function onBench(id: string) {
    if (selected?.kind === "slot") return substitute(selected.slot, id);
    setSelected(selected?.kind === "bench" && selected.id === id ? null : { kind: "bench", id });
  }

  /** Golo deles regista logo; golo nosso pergunta a assistência (o marcador é o jogador escolhido). */
  function onTheirGoal() {
    dispatch({
      type: "record",
      now: timestamp(),
      id: newId(),
      event: { type: "goal", side: "them", playerId: null },
    });
    navigator.vibrate?.(15);
  }

  /** Põe o relógio mais `delta` segundos à frente (ou atrás), o minuto do vídeo. */
  function nudge(delta: number) {
    const now = timestamp();
    dispatch({
      type: "setClock",
      now,
      seconds: Math.max(0, elapsedSeconds(state, now) + delta),
    });
  }

  function jumpTo(target: number) {
    dispatch({ type: "setClock", now: timestamp(), seconds: target });
  }

  /** Terminar fixa o jogo no tempo regulamentar, a não ser que o relógio já tenha passado disso. */
  const fullTime = state.periodMinutes * 2 * 60;

  const selectedId = selected?.kind === "slot" ? state.slots[selected.slot] : null;
  const onPitch = state.slots.flatMap((id) => players.filter((p) => p.id === id));

  /** Regista o golo nosso (a hora é a do 1.º toque, não a de quando acabam de escolher). */
  function recordGoal(at: number, playerId: string, assistId: string | null) {
    dispatch({
      type: "record",
      now: at,
      id: newId(),
      event: { type: "goal", side: "us", playerId, assistId },
    });
    setGoalFlow(null);
    navigator.vibrate?.(15);
  }

  /** Teclado (PC): 1–7 escolhe o jogador, G/B/F/R/P/C/L contam, ⇧ conta para o adversário, K relógio, T minuto, Z desfaz. */
  function onKey(e: KeyboardEvent) {
    if (goalFlow || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (document.querySelector("[role='dialog']")) return;

    const key = e.key.toLowerCase();
    if (key === "escape") return setSelected(null);
    if (key === "k") {
      if (running) dispatch({ type: "pause", now: timestamp() });
      else if (state.status === "paused") dispatch({ type: "resume", now: timestamp() });
      return;
    }
    if (key === "z") {
      if (canUndo) dispatch({ type: "undo" });
      return;
    }
    if (key === "t") {
      e.preventDefault();
      document.getElementById("clock-jump")?.focus();
      return;
    }
    if (/^[1-7]$/.test(key)) return onSlot(Number(key) - 1);

    const action = KEY_ACTION[key];
    if (!action) return;
    if (e.shiftKey) {
      if (action === "goal") return onTheirGoal();
      dispatch({
        type: "record",
        now: timestamp(),
        id: newId(),
        event: actionFor(action, "them", null).plus,
      });
      return;
    }
    if (!selectedId) return;
    if (action === "goal") return setGoalFlow({ at: timestamp(), scorerId: selectedId });
    dispatch({
      type: "record",
      now: timestamp(),
      id: newId(),
      event: actionFor(action, "us", selectedId).plus,
    });
  }

  // O handler é sempre o mais recente sem voltar a registar o listener a cada toque.
  const keyHandler = useRef(onKey);
  useEffect(() => {
    keyHandler.current = onKey;
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  /** Relógio, intervalo e terminar. Aparecem no cabeçalho (PC) ou numa linha por baixo (telemóvel). */
  const controls = (
    <>
      {running && (
        <Button
          size="lg"
          variant="outline"
          className="flex-1 lg:flex-none"
          onClick={() => dispatch({ type: "pause", now: timestamp() })}
        >
          <Pause /> Relógio
        </Button>
      )}
      {state.status === "paused" && (
        <Button
          size="lg"
          variant="outline"
          className="flex-1 lg:flex-none"
          onClick={() => dispatch({ type: "resume", now: timestamp() })}
        >
          <Play /> Relógio
        </Button>
      )}
      {state.status === "halftime" && (
        <Button
          size="lg"
          className="flex-1 lg:flex-none"
          onClick={() => dispatch({ type: "startSecondHalf", now: timestamp() })}
        >
          <Play /> Começar 2.ª parte
        </Button>
      )}
      {state.period === 1 && (running || state.status === "paused") && (
        <Button
          size="lg"
          variant="outline"
          onClick={() => dispatch({ type: "endPeriod", now: timestamp() })}
        >
          Intervalo
        </Button>
      )}
      <Button
        size="lg"
        variant={confirmFinish ? "destructive" : "outline"}
        onClick={() => {
          if (!confirmFinish) return setConfirmFinish(true);
          const now = timestamp();
          dispatch({
            type: "finish",
            now,
            seconds: Math.max(elapsedSeconds(state, now), fullTime),
          });
          toast.success("Jogo terminado.");
        }}
      >
        {confirmFinish
          ? `Confirmar: terminar aos ${Math.round(Math.max(elapsed, fullTime) / 60)}′`
          : "Terminar"}
      </Button>
    </>
  );

  return (
    <div className="space-y-5">
      {/* Marcador e relógio ficam sempre à vista */}
      <div className="bg-background/95 border-border sticky top-0 z-20 -mx-4 border-b px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8 lg:py-3">
        <div className="lg:flex lg:items-center lg:gap-4">
          <div className="flex items-center justify-between gap-2 lg:flex-1 lg:justify-start lg:gap-5">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold lg:max-w-[130px] lg:flex-none lg:text-[18px]">
              {teamName}
            </span>
            <span className="text-[40px] leading-none font-[750] tracking-tight [font-stretch:88%] tabular-nums lg:text-[44px]">
              {result.us}–{result.them}
            </span>
            <span className="min-w-0 flex-1 truncate text-right text-[15px] font-semibold lg:max-w-[130px] lg:flex-none lg:text-left lg:text-[18px]">
              {opponent}
            </span>
          </div>

          <div className="lg:shrink-0">
            <div className="mt-1 flex items-center justify-between gap-1 lg:mt-0 lg:justify-center">
              <ClockStep label="−5′" aria="Recuar 5 minutos" onClick={() => nudge(-300)} />
              <ClockStep label="−1′" aria="Recuar 1 minuto" onClick={() => nudge(-60)} />
              <span
                className={cn(
                  "min-w-[92px] text-center text-[24px] leading-7 font-[650] [font-stretch:88%] tabular-nums lg:min-w-[104px] lg:text-[34px] lg:leading-10",
                  overtime && "text-marker",
                )}
                aria-label="Minuto do jogo"
              >
                {formatClock(elapsed)}
              </span>
              <ClockStep label="+1′" aria="Avançar 1 minuto" onClick={() => nudge(60)} />
              <ClockStep label="+5′" aria="Avançar 5 minutos" onClick={() => nudge(300)} />
              <ClockJump onJump={jumpTo} />
            </div>
            <div className="flex items-center justify-between gap-2 lg:justify-center lg:gap-4">
              <span className="text-muted-foreground text-[13px] font-medium">
                {periodLabel} · até {String(periodEnd / 60).padStart(2, "0")}:00
                {running && " · relógio a andar"}
              </span>
              <SyncBadge sync={sync} onRetry={onRetry} />
            </div>
          </div>

          <div className="hidden flex-1 flex-wrap justify-end gap-2 lg:flex">{controls}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:hidden">{controls}</div>

      {/* Telemóvel: uma coluna (campo, jogador, banco, adversário, números). PC: campo e banco à
          esquerda, contagens à direita, e a 2.ª coluna parte-se em duas nos ecrãs largos. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <section className="order-1 lg:order-none">
            <div className="mb-2 flex items-center justify-between gap-3">
              <SectionTitle>Campo</SectionTitle>
              <Button
                variant="ghost"
                size="sm"
                className="-mt-2 min-w-0"
                disabled={!canUndo}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 className="!size-4 shrink-0" />
                <span className="truncate">
                  {canUndo && lastEvent ? `Desfazer: ${describe(lastEvent, map)}` : "Desfazer"}
                </span>
              </Button>
            </div>
            <LineupPitch
              formation={state.formation}
              slots={state.slots}
              players={map}
              minutes={minutes}
              selectedSlot={selected?.kind === "slot" ? selected.slot : null}
              onSlotClick={onSlot}
              showKeys
            />
            <p className="text-muted-foreground mt-2 text-[13px]">
              Toca num jogador para registar o que fez. Para substituir, com ele escolhido toca num
              do banco; para trocar de posição, toca noutro do campo.
            </p>
          </section>

          <section className="order-3 lg:order-none">
            <SectionTitle>Banco</SectionTitle>
            <Bench
              ids={state.bench}
              players={map}
              minutes={minutes}
              selectedId={selected?.kind === "bench" ? selected.id : null}
              onPick={onBench}
            />
          </section>
        </div>

        <div className="contents lg:grid lg:[grid-template-columns:repeat(auto-fit,minmax(340px,1fr))] lg:items-start lg:gap-5">
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            {selectedId ? (
              <section
                aria-label={`Ações de ${playerName(map, selectedId)}`}
                className="order-2 lg:order-none"
              >
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <SectionTitle>{playerName(map, selectedId)}</SectionTitle>
                  <span className="text-muted-foreground text-[13px] tabular-nums">
                    {minutes[selectedId] ?? "0′"} em campo
                  </span>
                </div>
                <ActionPanel
                  counts={countsOfPlayer(lines[selectedId])}
                  side="us"
                  playerId={selectedId}
                  dispatch={dispatch}
                  newId={newId}
                  hints={HINTS}
                  onGoal={() => setGoalFlow({ at: timestamp(), scorerId: selectedId })}
                />
                <p className="text-muted-foreground mt-1 text-[13px]">
                  Um golo conta como remate à baliza. O − tira o último.
                </p>
              </section>
            ) : (
              <section className="border-border text-muted-foreground order-2 hidden rounded-lg border border-dashed px-4 py-6 text-center text-[15px] lg:order-none lg:block">
                Escolhe um jogador no campo (ou carrega de 1 a 7) para registar golos e remates.
              </section>
            )}

            <section className="order-4 lg:order-none">
              <SectionTitle>{opponent}</SectionTitle>
              <ActionPanel
                counts={countsOfSide(state, "them")}
                side="them"
                playerId={null}
                dispatch={dispatch}
                newId={newId}
                hints={THEIR_HINTS}
                onGoal={onTheirGoal}
              />
            </section>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <section className="order-5 lg:order-none">
              <SectionTitle>Estatísticas</SectionTitle>
              <TeamStatsTable live={state} teamName={teamName} opponent={opponent} />
            </section>

            <section className="hidden lg:block">
              <SectionTitle>Últimos registos</SectionTitle>
              {recent.length === 0 ? (
                <p className="text-muted-foreground text-[15px]">Ainda nada registado.</p>
              ) : (
                <ul className="border-border bg-card divide-border divide-y rounded-lg border">
                  {recent.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-[15px]">
                      <span className="text-muted-foreground w-12 tabular-nums">
                        {formatClock(e.t)}
                      </span>
                      <span className="min-w-0 truncate">{describe(e, map)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-muted-foreground mt-3 text-[13px] leading-5">
                Atalhos: 1–7 escolhe o jogador · G golo · B à baliza · F fora · ⇧ + tecla conta para
                o adversário · K relógio · T ir ao minuto · Z desfaz · Esc limpa a escolha.
              </p>
            </section>
          </div>
        </div>
      </div>

      <PlayerPicker
        open={!!goalFlow}
        // Fechar sem escolher não perde o golo: fica sem assistência.
        onOpenChange={(open) => {
          if (!open && goalFlow) recordGoal(goalFlow.at, goalFlow.scorerId, null);
        }}
        title="Quem fez a assistência?"
        description={goalFlow ? `Golo de ${playerName(map, goalFlow.scorerId)}` : undefined}
        players={onPitch.filter((p) => p.id !== goalFlow?.scorerId)}
        footer={
          <Button
            variant="outline"
            onClick={() => goalFlow && recordGoal(goalFlow.at, goalFlow.scorerId, null)}
          >
            Sem assistência
          </Button>
        }
        onPick={(id) => goalFlow && recordGoal(goalFlow.at, goalFlow.scorerId, id)}
      />
    </div>
  );
}

function SyncBadge({ sync, onRetry }: { sync: SyncState; onRetry: () => void }) {
  if (sync.kind === "offline") {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={sync.error}
        className="text-marker flex items-center gap-1 text-[13px] font-medium"
      >
        <CloudOff className="size-4" />
        Sem sinal
      </button>
    );
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-[13px] font-medium">
      {sync.kind === "saving" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check className="size-4" />
      )}
      {sync.kind === "saving" ? "A guardar" : "Guardado"}
    </span>
  );
}

function ClockStep({ label, aria, onClick }: { label: string; aria: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-11 min-w-[52px] px-2 text-[15px] tabular-nums lg:min-w-11 lg:px-1.5"
      aria-label={aria}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** PC: escreve o minuto do vídeo ("12:40" ou "1240") e carrega Enter. */
function ClockJump({ onJump }: { onJump: (seconds: number) => void }) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  return (
    <form
      className="ml-2 hidden items-center gap-1 lg:flex"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        const seconds = parseClock(text);
        setInvalid(seconds === null);
        if (seconds === null) return;
        onJump(seconds);
        setText("");
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <input
        id="clock-jump"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        inputMode="numeric"
        autoComplete="off"
        placeholder="mm:ss"
        aria-label="Ir para o minuto do vídeo (mm:ss)"
        aria-invalid={invalid}
        className={cn(
          "bg-card border-border placeholder:text-muted-foreground h-11 w-[5.5rem] rounded-md border px-3 text-base tabular-nums outline-none focus-visible:ring-2",
          invalid && "border-destructive",
        )}
      />
    </form>
  );
}
