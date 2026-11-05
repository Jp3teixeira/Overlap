"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerMap } from "./types";

/** Os do banco, como botões. No jogo, tocar num deles (com um do campo escolhido) faz a substituição. */
export function Bench({
  ids,
  players,
  minutes,
  selectedId,
  onPick,
  onRemove,
}: {
  ids: string[];
  players: PlayerMap;
  minutes?: Record<string, string>;
  selectedId?: string | null;
  onPick?: (id: string) => void;
  /** Só na convocatória: tirar do banco. */
  onRemove?: (id: string) => void;
}) {
  if (ids.length === 0) {
    return <p className="text-muted-foreground text-[15px]">Ninguém no banco.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const p = players.get(id);
        const selected = selectedId === id;
        return (
          <li key={id} className="flex">
            <button
              type="button"
              onClick={() => onPick?.(id)}
              disabled={!onPick}
              aria-pressed={onPick ? selected : undefined}
              className={cn(
                "border-border bg-card flex h-12 items-center gap-2 rounded-lg border pr-3 pl-1.5 text-left outline-none disabled:opacity-100",
                onRemove && "rounded-r-none border-r-0",
                selected && "border-marker ring-marker ring-2",
              )}
            >
              <span className="bg-secondary text-secondary-foreground grid size-9 place-items-center rounded-full text-[15px] font-bold [font-stretch:88%] tabular-nums">
                {p?.shirt_number ?? "–"}
              </span>
              <span className="max-w-[96px] truncate text-[15px] leading-5 font-medium">
                {p?.name ?? "Jogador"}
              </span>
              {minutes && (
                <span className="text-muted-foreground text-[13px] tabular-nums">
                  {minutes[id]}
                </span>
              )}
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                aria-label={`Tirar ${p?.name ?? "jogador"} do banco`}
                className="border-border bg-card text-muted-foreground grid h-12 w-10 place-items-center rounded-r-lg border"
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
