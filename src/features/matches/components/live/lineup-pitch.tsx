"use client";

import { Plus } from "lucide-react";
import { PIECE_FILL } from "@/features/exercises/diagram";
import { cn } from "@/lib/utils";
import { FORMATION_SLOTS, type FormationId } from "../../live";
import { LiveAvatar } from "./live-avatar";
import type { PlayerMap } from "./types";

const GRASS_A = "#3f9356";
const GRASS_B = "#3a8a4f";
const LINE = "rgba(255,255,255,0.85)";

/** Campo na vertical (ataque em cima) com os 7 jogadores. Toca num slot para o escolher. */
export function LineupPitch({
  formation,
  slots,
  players,
  minutes,
  selectedSlot,
  onSlotClick,
}: {
  formation: FormationId;
  slots: (string | null)[];
  players: PlayerMap;
  /** Minutos já formatados por jogador ("12′"); só no jogo. */
  minutes?: Record<string, string>;
  selectedSlot?: number | null;
  onSlotClick: (slot: number) => void;
}) {
  const layout = FORMATION_SLOTS[formation];
  const line = { borderColor: LINE } as const;

  return (
    <div
      className="border-border relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-lg border"
      style={{
        background: `repeating-linear-gradient(to bottom, ${GRASS_A} 0 12.5%, ${GRASS_B} 12.5% 25%)`,
      }}
    >
      {/* Linhas do campo */}
      <div aria-hidden className="pointer-events-none absolute inset-2 border-2" style={line} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 top-1/2 h-0.5 -translate-y-px"
        style={{ background: LINE }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
        style={line}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-2 left-1/2 h-[14%] w-[52%] -translate-x-1/2 border-2 border-t-0"
        style={line}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-1/2 h-[17%] w-[52%] -translate-x-1/2 border-2 border-b-0"
        style={line}
      />

      {layout.map((pos, i) => {
        const id = slots[i];
        const player = id ? players.get(id) : undefined;
        const goalkeeper = i === 0;
        const selected = selectedSlot === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSlotClick(i)}
            aria-pressed={selectedSlot === undefined ? undefined : selected}
            aria-label={player ? `${player.name}, ${pos.role}` : `Escolher ${pos.role}`}
            className="absolute flex w-[78px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 outline-none"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {player ? (
              <>
                <LiveAvatar
                  player={player}
                  size="pitch"
                  background={goalkeeper ? PIECE_FILL.gk : PIECE_FILL.a}
                  className={cn(
                    "border-2 border-white text-white shadow-sm",
                    selected && "ring-marker ring-[3px]",
                  )}
                />
                <span className="max-w-full truncate rounded bg-black/60 px-1.5 text-[12px] leading-[16px] font-medium text-white">
                  {player.name}
                </span>
                {minutes && id && (
                  <span className="text-[11px] leading-3 font-semibold text-white tabular-nums drop-shadow">
                    {minutes[id]}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-white/85 bg-white/10 text-white">
                  <Plus className="size-5" />
                </span>
                <span className="text-[11px] leading-3 font-semibold text-white/90">
                  {pos.role}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
