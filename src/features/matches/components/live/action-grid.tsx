"use client";

import { useState } from "react";
import { ChevronDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  teamStats,
  type LiveAction,
  type LiveState,
  type PlayerStatLine,
  type Side,
  type StatType,
} from "../../live";

type Dispatch = (a: LiveAction) => void;

export type ActionKey = "goal" | "offTarget" | "onTarget" | StatType;

const LABEL: Record<ActionKey, string> = {
  goal: "Golo",
  offTarget: "Fora",
  onTarget: "À baliza",
  corner: "Canto",
  foul: "Falta",
  turnover: "Perdida",
  recovery: "Recuperada",
};

/** Ordem dos botões: o que mais se toca primeiro. */
const ORDER: ActionKey[] = [
  "goal",
  "onTarget",
  "offTarget",
  "recovery",
  "turnover",
  "corner",
  "foul",
];

export type Counts = Record<ActionKey, number>;

/** Contagens de um jogador como as vê o botão (À baliza e Remate fora não incluem os golos). */
export function countsOfPlayer(line: PlayerStatLine): Counts {
  return {
    goal: line.goals,
    onTarget: line.onTarget - line.goals,
    offTarget: line.shots - line.onTarget,
    corner: line.corner,
    foul: line.foul,
    turnover: line.turnover,
    recovery: line.recovery,
  };
}

/** Contagens de uma equipa inteira (para o adversário). */
export function countsOfSide(state: LiveState, side: Side): Counts {
  const t = teamStats(state);
  const goals = state.events.filter((e) => e.type === "goal" && e.side === side).length;
  return {
    goal: goals,
    onTarget: t.onTarget[side] - goals,
    offTarget: t.shots[side] - t.onTarget[side],
    corner: t.corner[side],
    foul: t.foul[side],
    turnover: t.turnover[side],
    recovery: t.recovery[side],
  };
}

/** O que cada botão faz ao tocar (+1) e ao tirar (−1). `playerId` só nos nossos. */
export function actionFor(
  key: ActionKey,
  side: Side,
  playerId: string | null,
): {
  plus: Extract<LiveAction, { type: "record" }>["event"];
  minus: Extract<LiveAction, { type: "unrecord" }>["event"];
} {
  const who = side === "us" ? playerId : null;
  switch (key) {
    case "goal":
      return {
        plus: { type: "goal", side, playerId: who },
        minus: who ? { type: "goal", side, playerId: who } : { type: "goal", side },
      };
    case "onTarget":
    case "offTarget": {
      const onTarget = key === "onTarget";
      return {
        plus: { type: "shot", side, onTarget, playerId: who },
        minus: who
          ? { type: "shot", side, onTarget, playerId: who }
          : { type: "shot", side, onTarget },
      };
    }
    default:
      return {
        plus: { type: key, side, playerId: who },
        minus: who ? { type: key, side, playerId: who } : { type: key, side },
      };
  }
}

/**
 * Os botões de contagem de um jogador (ou do adversário): tocar soma 1, o − tira o último.
 * O golo abre a escolha da assistência (só nos nossos, em `onGoal`).
 */
export function ActionGrid({
  counts,
  side,
  playerId,
  dispatch,
  newId,
  onGoal,
  hideGoal = false,
  keys: only,
  hints,
  spanGoal = false,
}: {
  counts: Counts;
  side: Side;
  playerId: string | null;
  dispatch: Dispatch;
  newId: () => string;
  /** Golo nosso: o ecrã pergunta a assistência. Sem isto, o golo regista-se logo. */
  onGoal?: () => void;
  hideGoal?: boolean;
  /** Só estes botões (por defeito, todos). */
  keys?: ActionKey[];
  /** Atalho de teclado de cada botão, só se vê no PC. */
  hints?: Partial<Record<ActionKey, string>>;
  /** O botão do golo ocupa a linha toda. */
  spanGoal?: boolean;
}) {
  const keys = (only ?? ORDER).filter((k) => !(hideGoal && k === "goal"));
  return (
    <div className="grid grid-cols-2 gap-2">
      {keys.map((key) => {
        const count = counts[key];
        const { plus, minus } = actionFor(key, side, playerId);
        return (
          <div key={key} className={cn("flex gap-1", spanGoal && key === "goal" && "col-span-2")}>
            <Button
              type="button"
              variant={key === "goal" ? "primary" : "secondary"}
              className="h-14 min-w-0 flex-1 justify-between gap-1 px-3 text-[15px] lg:h-16"
              aria-label={`${LABEL[key]}: ${count}. Tocar para somar um.`}
              onClick={() => {
                if (key === "goal" && side === "us" && onGoal) return onGoal();
                dispatch({ type: "record", now: Date.now(), id: newId(), event: plus });
                navigator.vibrate?.(10);
              }}
            >
              <span className="min-w-0 truncate text-left">
                {LABEL[key]}
                {hints?.[key] && (
                  <kbd className="bg-foreground/10 ml-2 hidden rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold lg:inline-block">
                    {hints[key]}
                  </kbd>
                )}
              </span>
              <span
                className={cn(
                  "text-[22px] leading-none font-[650] [font-stretch:88%] tabular-nums",
                  count === 0 && key !== "goal" && "opacity-50",
                )}
              >
                {count}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-14 w-10 shrink-0 lg:h-16"
              aria-label={`Menos ${LABEL[key].toLowerCase()}`}
              disabled={count === 0}
              onClick={() => dispatch({ type: "unrecord", event: minus })}
            >
              <Minus className="!size-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** O que se toca quase sempre: o resto fica escondido em "Mais contagens". */
const PRIMARY: ActionKey[] = ["goal", "onTarget", "offTarget"];
const SECONDARY: ActionKey[] = ["recovery", "turnover", "corner", "foul"];

/**
 * Botões de um jogador (ou do adversário) em duas camadas: golo e remates sempre à vista,
 * recuperadas, perdidas, cantos e faltas escondidos até serem precisos.
 */
export function ActionPanel({
  counts,
  hints,
  ...rest
}: Omit<Parameters<typeof ActionGrid>[0], "keys" | "spanGoal" | "hideGoal">) {
  const [more, setMore] = useState(false);
  const extra = SECONDARY.reduce((sum, k) => sum + counts[k], 0);
  return (
    <div className="space-y-2">
      <ActionGrid {...rest} counts={counts} hints={hints} keys={PRIMARY} spanGoal />
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className="text-muted-foreground hover:text-foreground flex h-9 items-center gap-1.5 text-[14px] font-medium"
      >
        <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} />
        Mais contagens{extra > 0 && ` (${extra})`}
      </button>
      {more && <ActionGrid {...rest} counts={counts} hints={hints} keys={SECONDARY} />}
    </div>
  );
}
