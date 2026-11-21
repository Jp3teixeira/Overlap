"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/page-header";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  convocados,
  goals,
  minutesLabel,
  playerSeconds,
  playerStats,
  score,
  type GoalItem,
  type LiveAction,
  type LiveState,
  type Side,
} from "../../live";
import { ActionGrid, countsOfPlayer, countsOfSide } from "./action-grid";
import { playerStatText, TeamStatsTable } from "./live-summary";
import { PlayerPicker } from "./player-picker";
import { playerName, toPlayerMap, type LivePlayer } from "./types";

/** Onde vai a escolha de um golo: a editar um que existe, ou a criar um novo. */
type Dialog =
  | { kind: "menu"; id: string }
  | { kind: "scorer"; id: string }
  | { kind: "assist"; id: string }
  | {
      kind: "new";
      side: Side;
      step: "scorer" | "assist" | "minute";
      scorerId: string | null;
      assistId: string | null;
    }
  | null;

/**
 * Corrigir o jogo depois de acabar: golos (marcador, assistência, apagar, acrescentar),
 * contagens da equipa e minutos de cada jogador. O resultado acompanha os golos.
 */
export function LiveEdit({
  state,
  dispatch,
  players,
  teamName,
  opponent,
  newId,
  onDone,
}: {
  state: LiveState;
  dispatch: (a: LiveAction) => void;
  players: LivePlayer[];
  teamName: string;
  opponent: string;
  newId: () => string;
  onDone: () => void;
}) {
  const map = toPlayerMap(players);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const lines = playerStats(state);

  const result = score(state);
  const goalList = goals(state);
  const squad = convocados(state)
    .flatMap((id) => {
      const p = map.get(id);
      return p ? [p] : [];
    })
    .sort(
      (a, b) =>
        (a.shirt_number ?? 999) - (b.shirt_number ?? 999) || a.name.localeCompare(b.name, "pt"),
    );
  const endSeconds = state.clock.baseSeconds;
  const maxMinutes = Math.round(endSeconds / 60);
  const seconds = playerSeconds(state, 0);

  const editing = dialog && "id" in dialog ? goalList.find((g) => g.id === dialog.id) : undefined;
  const creating = dialog?.kind === "new" ? dialog : null;

  const goalText = (g: GoalItem) => {
    if (g.side === "them") return `Golo do ${opponent}`;
    const who = g.playerId ? playerName(map, g.playerId) : "Golo nosso (sem marcador)";
    return g.assistId ? `${who} · ass. ${playerName(map, g.assistId)}` : who;
  };

  function openNew(side: Side) {
    // Golo deles não tem marcador nem assistência: pede só o minuto.
    setDialog({
      kind: "new",
      side,
      step: side === "us" ? "scorer" : "minute",
      scorerId: null,
      assistId: null,
    });
  }

  function saveNew(minute: number) {
    if (!creating) return;
    dispatch({
      type: "addGoal",
      id: newId(),
      side: creating.side,
      playerId: creating.scorerId,
      assistId: creating.assistId,
      seconds: minute * 60,
    });
    setDialog(null);
    toast.success("Golo acrescentado.");
  }

  return (
    <div className="space-y-6">
      <div className="border-border bg-card rounded-lg border px-4 py-4 text-center">
        <p className="text-muted-foreground text-[13px] font-medium">A editar o jogo</p>
        <p className="mt-1 text-[48px] leading-none font-[750] tracking-tight [font-stretch:88%] tabular-nums">
          {result.us}–{result.them}
        </p>
        <p className="text-muted-foreground mt-2 text-[13px]">
          {teamName} – {opponent}. O resultado acompanha os golos e fica guardado no jogo.
        </p>
      </div>

      <section>
        <SectionTitle>Golos</SectionTitle>
        {goalList.length === 0 ? (
          <p className="text-muted-foreground mb-3 text-[15px]">Sem golos registados.</p>
        ) : (
          <ul className="border-border bg-card divide-border mb-3 divide-y rounded-lg border">
            {goalList.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "menu", id: g.id })}
                  className="hover:bg-muted flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-[15px]"
                >
                  <span className="text-muted-foreground w-9 shrink-0 tabular-nums">
                    {minutesLabel(g.t)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{goalText(g)}</span>
                  <ChevronRight className="text-muted-foreground size-5 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" onClick={() => openNew("us")}>
            <Plus /> Golo nosso
          </Button>
          <Button variant="secondary" onClick={() => openNew("them")}>
            <Plus /> Golo deles
          </Button>
        </div>
      </section>

      <section>
        <SectionTitle>Estatísticas por jogador</SectionTitle>
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {squad.map((p) => {
            const open = openId === p.id;
            const text = playerStatText(lines[p.id]);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : p.id)}
                  className="hover:bg-muted flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.name}</span>
                    <span className="text-muted-foreground block truncate text-[13px]">
                      {text || "Sem estatísticas"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn("text-muted-foreground size-5 shrink-0", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div className="border-border border-t p-3">
                    <ActionGrid
                      counts={countsOfPlayer(lines[p.id])}
                      side="us"
                      playerId={p.id}
                      dispatch={dispatch}
                      newId={newId}
                      hideGoal
                    />
                    <p className="text-muted-foreground mt-2 text-[13px]">
                      Os golos mudam-se na lista de golos, em cima.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <SectionTitle>{opponent}</SectionTitle>
        <ActionGrid
          counts={countsOfSide(state, "them")}
          side="them"
          playerId={null}
          dispatch={dispatch}
          newId={newId}
          hideGoal
        />
      </section>

      <section>
        <SectionTitle>Estatísticas da equipa</SectionTitle>
        <TeamStatsTable live={state} teamName={teamName} opponent={opponent} />
        <p className="text-muted-foreground mt-2 text-[13px]">
          A equipa soma o que registas em cada jogador.
        </p>
      </section>

      <section>
        <SectionTitle>Minutos</SectionTitle>
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {squad.map((p) => {
            const s = seconds[p.id] ?? 0;
            const m = Math.round(s / 60);
            const edited = p.id in state.secondsOverride;
            const set = (next: number) =>
              dispatch({ type: "setMinutes", playerId: p.id, seconds: next * 60 });
            return (
              <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold [font-stretch:88%] tabular-nums">
                  {p.shirt_number ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.name}</span>
                {edited && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    aria-label={`Repor os minutos de ${p.name}`}
                    onClick={() => dispatch({ type: "setMinutes", playerId: p.id, seconds: null })}
                  >
                    <RotateCcw className="!size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  aria-label={`Menos um minuto a ${p.name}`}
                  disabled={m <= 0}
                  onClick={() => set(m - 1)}
                >
                  <Minus className="!size-4" />
                </Button>
                <output className="w-9 text-center text-[18px] font-[650] [font-stretch:88%] tabular-nums">
                  {m}′
                </output>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={`Mais um minuto a ${p.name}`}
                  disabled={m >= maxMinutes}
                  onClick={() => set(m + 1)}
                >
                  <Plus />
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-2 text-[13px]">
          O jogo teve {maxMinutes}′. O ↺ volta ao valor calculado pelas substituições.
        </p>
      </section>

      <Button size="lg" className="w-full" onClick={onDone}>
        Concluir
      </Button>

      {/* Menu de um golo que já existe */}
      {dialog?.kind === "menu" && editing && (
        <GoalMenu
          title={`Golo aos ${minutesLabel(editing.t)}`}
          description={goalText(editing)}
          canEditPlayers={editing.side === "us"}
          hasScorer={!!editing.playerId}
          onScorer={() => setDialog({ kind: "scorer", id: editing.id })}
          onAssist={() => setDialog({ kind: "assist", id: editing.id })}
          onRemove={() => {
            dispatch({ type: "removeGoal", id: editing.id });
            setDialog(null);
            toast.success("Golo apagado.");
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {/* Mudar o marcador de um golo que existe */}
      <PlayerPicker
        open={dialog?.kind === "scorer" && !!editing}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Quem marcou?"
        players={squad}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              if (editing)
                dispatch({ type: "editGoal", id: editing.id, playerId: null, assistId: null });
              setDialog(null);
            }}
          >
            Sem marcador
          </Button>
        }
        onPick={(id) => {
          if (editing) {
            dispatch({
              type: "editGoal",
              id: editing.id,
              playerId: id,
              assistId: editing.assistId === id ? null : editing.assistId,
            });
          }
          setDialog(null);
        }}
      />

      {/* Mudar a assistência de um golo que existe */}
      <PlayerPicker
        open={dialog?.kind === "assist" && !!editing}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Quem fez a assistência?"
        players={squad.filter((p) => p.id !== editing?.playerId)}
        footer={
          <Button
            variant="outline"
            onClick={() => {
              if (editing) {
                dispatch({
                  type: "editGoal",
                  id: editing.id,
                  playerId: editing.playerId,
                  assistId: null,
                });
              }
              setDialog(null);
            }}
          >
            Sem assistência
          </Button>
        }
        onPick={(id) => {
          if (editing) {
            dispatch({
              type: "editGoal",
              id: editing.id,
              playerId: editing.playerId,
              assistId: id,
            });
          }
          setDialog(null);
        }}
      />

      {/* Golo novo, passo 1: marcador */}
      <PlayerPicker
        open={creating?.step === "scorer"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Quem marcou?"
        players={squad}
        footer={
          <Button
            variant="outline"
            onClick={() => creating && setDialog({ ...creating, step: "minute", scorerId: null })}
          >
            Sem marcador
          </Button>
        }
        onPick={(id) => creating && setDialog({ ...creating, step: "assist", scorerId: id })}
      />

      {/* Golo novo, passo 2: assistência */}
      <PlayerPicker
        open={creating?.step === "assist"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Quem fez a assistência?"
        players={squad.filter((p) => p.id !== creating?.scorerId)}
        footer={
          <Button
            variant="outline"
            onClick={() => creating && setDialog({ ...creating, step: "minute", assistId: null })}
          >
            Sem assistência
          </Button>
        }
        onPick={(id) => creating && setDialog({ ...creating, step: "minute", assistId: id })}
      />

      {/* Golo novo, passo 3: minuto */}
      {creating?.step === "minute" && (
        <MinuteSheet max={maxMinutes} onSave={saveNew} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

function GoalMenu({
  title,
  description,
  canEditPlayers,
  hasScorer,
  onScorer,
  onAssist,
  onRemove,
  onClose,
}: {
  title: string;
  description: string;
  canEditPlayers: boolean;
  hasScorer: boolean;
  onScorer: () => void;
  onAssist: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  // Apagar pede um 2.º toque (o estado nasce com o menu e morre quando fecha).
  const [confirm, setConfirm] = useState(false);
  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-2 pb-2">
        {canEditPlayers && (
          <>
            <Button variant="outline" size="lg" onClick={onScorer}>
              Mudar marcador
            </Button>
            <Button variant="outline" size="lg" disabled={!hasScorer} onClick={onAssist}>
              Mudar assistência
            </Button>
          </>
        )}
        <Button
          variant={confirm ? "destructive" : "outline"}
          size="lg"
          onClick={() => (confirm ? onRemove() : setConfirm(true))}
        >
          {confirm ? "Confirmar: apagar golo" : "Apagar golo"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}

function MinuteSheet({
  max,
  onSave,
  onClose,
}: {
  max: number;
  onSave: (minute: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(max));
  const minute = Number.parseInt(value, 10);
  const valid = Number.isFinite(minute) && minute >= 0 && minute <= max;
  return (
    <ResponsiveSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Em que minuto?"
      description={`O jogo teve ${max}′.`}
      footer={
        // Sem tirar o foco do campo ao tocar: senão o pop-up reajusta-se e o toque perde-se.
        <Button
          type="submit"
          form="goal-minute-form"
          size="lg"
          disabled={!valid}
          onMouseDown={(e) => e.preventDefault()}
        >
          Guardar golo
        </Button>
      }
    >
      <form
        id="goal-minute-form"
        className="space-y-2 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(minute);
        }}
      >
        <Label htmlFor="goal-minute">Minuto</Label>
        <Input
          id="goal-minute"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 3))}
          aria-invalid={!valid}
        />
        {!valid && (
          <p className="text-destructive text-[13px]">Escolhe um minuto entre 0 e {max}.</p>
        )}
      </form>
    </ResponsiveSheet>
  );
}
