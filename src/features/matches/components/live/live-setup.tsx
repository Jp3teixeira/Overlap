"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FORMATION_SLOTS,
  FORMATIONS,
  ROLE_LABEL,
  SLOT_COUNT,
  isStartable,
  type LiveAction,
  type LiveState,
} from "../../live";
import { Bench } from "./bench";
import { LineupPitch } from "./lineup-pitch";
import { PlayerPicker } from "./player-picker";
import { playerName, toPlayerMap, type LivePlayer } from "./types";

/** Antes do apito: formação, os 7 no campo, o banco e a duração das partes. */
export function LiveSetup({
  state,
  dispatch,
  players,
  onStart,
}: {
  state: LiveState;
  dispatch: (a: LiveAction) => void;
  players: LivePlayer[];
  onStart: () => void;
}) {
  const [slotPicker, setSlotPicker] = useState<number | null>(null);
  const [benchPicker, setBenchPicker] = useState(false);

  const map = toPlayerMap(players);
  const active = players.filter((p) => p.is_active);
  const onField = new Set(state.slots.filter((x): x is string => x !== null));
  const placed = onField.size;
  const missing = SLOT_COUNT - placed;

  const forSlot = active.filter((p) => !onField.has(p.id));
  const forBench = active.filter((p) => !onField.has(p.id) && !state.bench.includes(p.id));

  const slotId = slotPicker !== null ? state.slots[slotPicker] : null;
  const slotRole = slotPicker !== null ? FORMATION_SLOTS[state.formation][slotPicker].role : "GR";

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>Formação</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          {FORMATIONS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => dispatch({ type: "setFormation", formation: f })}
              aria-pressed={state.formation === f}
              className={cn(
                "h-11 min-w-[72px] rounded-full border px-4 text-[15px] font-medium tabular-nums",
                state.formation === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium">Duração de cada parte</span>
          <span className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Menos 5 minutos"
              disabled={state.periodMinutes <= 5}
              onClick={() =>
                dispatch({ type: "setPeriodMinutes", minutes: state.periodMinutes - 5 })
              }
            >
              <Minus />
            </Button>
            <output className="w-16 text-center text-lg font-[650] tabular-nums">
              {state.periodMinutes} min
            </output>
            <Button
              variant="outline"
              size="icon"
              aria-label="Mais 5 minutos"
              disabled={state.periodMinutes >= 60}
              onClick={() =>
                dispatch({ type: "setPeriodMinutes", minutes: state.periodMinutes + 5 })
              }
            >
              <Plus />
            </Button>
          </span>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <SectionTitle>Onze inicial</SectionTitle>
          <span className="text-muted-foreground -mt-2 text-[13px]">{placed}/7 no campo</span>
        </div>
        <LineupPitch
          formation={state.formation}
          slots={state.slots}
          players={map}
          onSlotClick={setSlotPicker}
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Banco</SectionTitle>
          <Button
            variant="outline"
            size="sm"
            className="-mt-2"
            onClick={() => setBenchPicker(true)}
          >
            <Plus className="!size-4" />
            Adicionar
          </Button>
        </div>
        <Bench
          ids={state.bench}
          players={map}
          onRemove={(playerId) => dispatch({ type: "removeBench", playerId })}
        />
      </section>

      <div className="space-y-2">
        <Button size="lg" className="w-full" disabled={!isStartable(state)} onClick={onStart}>
          Começar jogo
        </Button>
        {missing > 0 && (
          <p className="text-muted-foreground text-center text-[13px]">
            {missing === 1 ? "Falta 1 jogador" : `Faltam ${missing} jogadores`} no campo.
          </p>
        )}
      </div>

      <PlayerPicker
        open={slotPicker !== null}
        onOpenChange={(open) => !open && setSlotPicker(null)}
        title={
          slotId
            ? `Trocar ${playerName(map, slotId)}`
            : `Escolher ${ROLE_LABEL[slotRole].toLowerCase()}`
        }
        players={forSlot}
        emptyText="Já estão todos no campo."
        footer={
          slotId && slotPicker !== null ? (
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: "addBench", playerId: slotId });
                setSlotPicker(null);
              }}
            >
              Mandar para o banco
            </Button>
          ) : undefined
        }
        onPick={(id) => {
          if (slotPicker !== null) dispatch({ type: "assign", slot: slotPicker, playerId: id });
          setSlotPicker(null);
        }}
      />
      <PlayerPicker
        open={benchPicker}
        onOpenChange={setBenchPicker}
        title="Adicionar ao banco"
        players={forBench}
        emptyText="Não há mais jogadores no plantel."
        onPick={(id) => {
          dispatch({ type: "addBench", playerId: id });
          if (forBench.length <= 1) setBenchPicker(false);
        }}
      />
    </div>
  );
}
