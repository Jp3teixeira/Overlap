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
  score,
  type LiveAction,
  type LiveEvent,
  type LiveState,
  type Side,
} from "../../live";
import { Bench } from "./bench";
import { LineupPitch } from "./lineup-pitch";
import { LiveStats } from "./live-stats";
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
      return e.side === "us" && e.playerId
        ? `Golo de ${playerName(map, e.playerId)}`
        : `Golo ${SIDE_LABEL[e.side]}`;
    case "shot":
      return `Remate${e.onTarget ? " à baliza" : ""} ${SIDE_LABEL[e.side]}`;
    case "sub":
      return `Entrou ${playerName(map, e.inId)}`;
    case "period_end":
    case "period_start":
      return "";
    default:
      return `${STAT_LABEL[e.type]} ${SIDE_LABEL[e.side]}`;
  }
}

const UNDOABLE = new Set(["goal", "shot", "corner", "foul", "turnover", "recovery", "sub"]);

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
  const [goalOpen, setGoalOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

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

  function onSlot(slot: number) {
    if (selected?.kind === "bench") return substitute(slot, selected.id);
    setSelected(
      selected?.kind === "slot" && selected.slot === slot ? null : { kind: "slot", slot },
    );
  }

  function onBench(id: string) {
    if (selected?.kind === "slot") return substitute(selected.slot, id);
    setSelected(selected?.kind === "bench" && selected.id === id ? null : { kind: "bench", id });
  }

  function onGoal(side: Side) {
    if (side === "us") {
      setGoalOpen(true);
      return;
    }
    dispatch({
      type: "record",
      now: timestamp(),
      id: newId(),
      event: { type: "goal", side, playerId: null },
    });
    navigator.vibrate?.(15);
  }

  const scorers = players.filter((p) => state.slots.includes(p.id));
  const scorersSorted = state.slots.flatMap((id) => scorers.filter((p) => p.id === id));

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
        <div className="mt-1 flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[22px] leading-7 font-[650] [font-stretch:88%] tabular-nums",
              overtime && "text-marker",
            )}
          >
            {formatClock(elapsed)}
            <span className="text-muted-foreground ml-1 text-[13px] font-medium">
              / {String(periodEnd / 60).padStart(2, "0")}:00
            </span>
          </span>
          <span className="text-muted-foreground text-[13px] font-medium">
            {periodLabel}
            {state.status === "paused" && " · Pausa"}
          </span>
          <SyncBadge sync={sync} onRetry={onRetry} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {running && (
          <Button
            size="lg"
            className="flex-1"
            onClick={() => dispatch({ type: "pause", now: timestamp() })}
          >
            <Pause /> Pausa
          </Button>
        )}
        {state.status === "paused" && (
          <Button
            size="lg"
            className="flex-1"
            onClick={() => dispatch({ type: "resume", now: timestamp() })}
          >
            <Play /> Retomar
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
            dispatch({ type: "finish", now: timestamp() });
            toast.success("Jogo terminado.");
          }}
        >
          {confirmFinish ? "Confirmar: terminar" : "Terminar"}
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
          Para substituir, toca num jogador do campo e depois num do banco.
        </p>
      </section>

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

      <LiveStats state={state} dispatch={dispatch} disabled={false} onGoal={onGoal} newId={newId} />

      <PlayerPicker
        open={goalOpen}
        onOpenChange={setGoalOpen}
        title="Quem marcou?"
        players={scorersSorted}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              dispatch({
                type: "record",
                now: timestamp(),
                id: newId(),
                event: { type: "goal", side: "us", playerId: null },
              });
              setGoalOpen(false);
            }}
          >
            Sem marcador
          </Button>
        }
        onPick={(id) => {
          dispatch({
            type: "record",
            now: timestamp(),
            id: newId(),
            event: { type: "goal", side: "us", playerId: id },
          });
          setGoalOpen(false);
          navigator.vibrate?.(15);
        }}
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
