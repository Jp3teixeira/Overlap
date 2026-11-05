"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { teamStats, type LiveAction, type Side, type StatType } from "../../live";
import type { LiveState } from "../../live";

type Dispatch = (a: LiveAction) => void;

/** Um contador "nós / eles", com − e + grandes. */
function StatRow({
  label,
  hint,
  us,
  them,
  onPlus,
  onMinus,
}: {
  label: string;
  hint?: string;
  us: number;
  them: number;
  onPlus: (side: Side) => void;
  onMinus: (side: Side) => void;
}) {
  const cell = (side: Side, value: number) => (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground size-11"
        aria-label={`Menos ${label} (${side === "us" ? "nós" : "eles"})`}
        disabled={value === 0}
        onClick={() => onMinus(side)}
      >
        <Minus className="!size-4" />
      </Button>
      <output className="w-7 text-center text-[22px] leading-none font-[650] [font-stretch:88%] tabular-nums">
        {value}
      </output>
      <Button
        variant="secondary"
        size="icon"
        className="size-11"
        aria-label={`Mais ${label} (${side === "us" ? "nós" : "eles"})`}
        onClick={() => onPlus(side)}
      >
        <Plus />
      </Button>
    </div>
  );

  return (
    <div className="border-border grid grid-cols-[1fr_auto_auto] items-center gap-x-1 border-t px-3 first:border-t-0">
      <div className="min-w-0 py-1">
        <p className="text-[15px] leading-5 font-medium">{label}</p>
        {hint && <p className="text-muted-foreground text-[12px] leading-4">{hint}</p>}
      </div>
      {cell("us", us)}
      {cell("them", them)}
    </div>
  );
}

const SECONDARY: { type: StatType; label: string }[] = [
  { type: "corner", label: "Cantos" },
  { type: "foul", label: "Faltas" },
  { type: "turnover", label: "Bolas perdidas" },
  { type: "recovery", label: "Bolas recuperadas" },
];

/**
 * Golos e remates em destaque; cantos, faltas e perdas/recuperações numa zona recolhida.
 * Nada é obrigatório: quem não toca, fica a zero.
 */
export function LiveStats({
  state,
  dispatch,
  disabled,
  onGoal,
  newId,
}: {
  state: LiveState;
  dispatch: Dispatch;
  disabled: boolean;
  /** Golo nosso abre a escolha do marcador; golo deles regista logo. */
  onGoal: (side: Side) => void;
  newId: () => string;
}) {
  const [more, setMore] = useState(false);
  const stats = teamStats(state);
  const goals = {
    us: state.events.filter((e) => e.type === "goal" && e.side === "us").length,
    them: state.events.filter((e) => e.type === "goal" && e.side === "them").length,
  };

  const record = (event: Parameters<typeof dispatchRecord>[1]) =>
    dispatchRecord(dispatch, event, newId);

  return (
    <section aria-label="Estatísticas do jogo" className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {(["us", "them"] as const).map((side) => (
          <div key={side} className="flex gap-1">
            <Button
              size="lg"
              variant={side === "us" ? "primary" : "secondary"}
              className="h-14 flex-1 text-base"
              disabled={disabled}
              onClick={() => onGoal(side)}
            >
              <Plus />
              Golo {side === "us" ? "nosso" : "deles"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-14 w-10"
              aria-label={`Tirar o último golo ${side === "us" ? "nosso" : "deles"}`}
              disabled={goals[side] === 0}
              onClick={() => dispatch({ type: "unrecord", event: { type: "goal", side } })}
            >
              <Minus className="!size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-border bg-card rounded-lg border">
        <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-1 px-3 pt-2 text-[12px] font-medium">
          <span />
          <span className="w-[134px] text-center">Nós</span>
          <span className="w-[134px] text-center">Eles</span>
        </div>
        <StatRow
          label="Remates"
          us={stats.shots.us}
          them={stats.shots.them}
          onPlus={(side) => record({ type: "shot", side, onTarget: false })}
          onMinus={(side) =>
            dispatch({ type: "unrecord", event: { type: "shot", side, onTarget: false } })
          }
        />
        <StatRow
          label="À baliza"
          hint="Conta também como remate."
          us={stats.onTarget.us}
          them={stats.onTarget.them}
          onPlus={(side) => record({ type: "shot", side, onTarget: true })}
          onMinus={(side) =>
            dispatch({ type: "unrecord", event: { type: "shot", side, onTarget: true } })
          }
        />
      </div>

      <div className="border-border bg-card rounded-lg border">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-expanded={more}
          className="text-muted-foreground flex h-11 w-full items-center justify-between px-3 text-[15px] font-medium"
        >
          Mais estatísticas
          <ChevronDown className={cn("size-5 transition-transform", more && "rotate-180")} />
        </button>
        {more && (
          <div className="border-border border-t">
            {SECONDARY.map(({ type, label }) => (
              <StatRow
                key={type}
                label={label}
                us={stats[type].us}
                them={stats[type].them}
                onPlus={(side) => record({ type, side })}
                onMinus={(side) => dispatch({ type: "unrecord", event: { type, side } })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function dispatchRecord(
  dispatch: Dispatch,
  event: Extract<LiveAction, { type: "record" }>["event"],
  newId: () => string,
) {
  dispatch({ type: "record", now: Date.now(), id: newId(), event });
}
