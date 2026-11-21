"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, Loader2, Pause, Play, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  elapsedSeconds,
  formatClock,
  minutesLabel,
  playerSeconds,
  playerStats,
  score,
  type LiveAction,
  type LiveEvent,
  type LiveState,
  type Side,
} from "../../live";
import { ActionGrid, countsOfPlayer, countsOfSide } from "./action-grid";
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

/** O jogo a decorrer: marcador, relógio, campo, banco e contagens. */
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

  return (
    <div className="space-y-5">
      {/* Marcador e relógio ficam sempre à vista */}
      <div className="bg-background/95 border-border sticky top-0 z-20 -mx-4 border-b px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{teamName}</span>
          <span className="text-[40px] leading-none font-[750] tracking-tight [font-stretch:88%] tabular-nums">
            {result.us}–{result.them}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-[15px] font-semibold">
            {opponent}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-1">
          <ClockStep label="−5′" aria="Recuar 5 minutos" onClick={() => nudge(-300)} />
          <ClockStep label="−1′" aria="Recuar 1 minuto" onClick={() => nudge(-60)} />
          <span
            className={cn(
              "min-w-[92px] text-center text-[24px] leading-7 font-[650] [font-stretch:88%] tabular-nums",
              overtime && "text-marker",
            )}
            aria-label="Minuto do jogo"
          >
            {formatClock(elapsed)}
          </span>
          <ClockStep label="+1′" aria="Avançar 1 minuto" onClick={() => nudge(60)} />
          <ClockStep label="+5′" aria="Avançar 5 minutos" onClick={() => nudge(300)} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[13px] font-medium">
            {periodLabel} · até {String(periodEnd / 60).padStart(2, "0")}:00
            {running && " · relógio a andar"}
          </span>
          <SyncBadge sync={sync} onRetry={onRetry} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {running && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => dispatch({ type: "pause", now: timestamp() })}
          >
            <Pause /> Relógio
          </Button>
        )}
        {state.status === "paused" && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={() => dispatch({ type: "resume", now: timestamp() })}
          >
            <Play /> Relógio
          </Button>
        )}
        {state.status === "halftime" && (
          <Button
            size="lg"
            className="flex-1"
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
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Campo</SectionTitle>
          <Button
            variant="ghost"
            size="sm"
            className="-mt-2"
            disabled={!canUndo}
            onClick={() => dispatch({ type: "undo" })}
          >
            <Undo2 className="!size-4" />
            {canUndo && lastEvent ? `Desfazer: ${describe(lastEvent, map)}` : "Desfazer"}
          </Button>
        </div>
        <LineupPitch
          formation={state.formation}
          slots={state.slots}
          players={map}
          minutes={minutes}
          selectedSlot={selected?.kind === "slot" ? selected.slot : null}
          onSlotClick={onSlot}
        />
        <p className="text-muted-foreground mt-2 text-[13px]">
          Toca num jogador para registar o que fez. Para substituir, com ele escolhido toca num do
          banco; para trocar de posição, toca noutro do campo.
        </p>
      </section>

      {selectedId && (
        <section aria-label={`Ações de ${playerName(map, selectedId)}`}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <SectionTitle>{playerName(map, selectedId)}</SectionTitle>
            <span className="text-muted-foreground text-[13px] tabular-nums">
              {minutes[selectedId] ?? "0′"} em campo
            </span>
          </div>
          <ActionGrid
            counts={countsOfPlayer(lines[selectedId])}
            side="us"
            playerId={selectedId}
            dispatch={dispatch}
            newId={newId}
            onGoal={() => setGoalFlow({ at: timestamp(), scorerId: selectedId })}
          />
          <p className="text-muted-foreground mt-2 text-[13px]">
            Um golo conta como remate à baliza. O − tira o último.
          </p>
        </section>
      )}

      <section>
        <SectionTitle>Banco</SectionTitle>
        <Bench
          ids={state.bench}
          players={map}
          minutes={minutes}
          selectedId={selected?.kind === "bench" ? selected.id : null}
          onPick={onBench}
        />
      </section>

      <section>
        <SectionTitle>{opponent}</SectionTitle>
        <ActionGrid
          counts={countsOfSide(state, "them")}
          side="them"
          playerId={null}
          dispatch={dispatch}
          newId={newId}
          onGoal={onTheirGoal}
        />
      </section>

      <section>
        <SectionTitle>Estatísticas</SectionTitle>
        <TeamStatsTable live={state} teamName={teamName} opponent={opponent} />
      </section>

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
      className="h-11 min-w-[52px] px-2 text-[15px] tabular-nums"
      aria-label={aria}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
