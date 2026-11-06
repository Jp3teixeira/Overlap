"use client";

import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { POSITION_LABEL } from "@/features/players/labels";
import { LiveAvatar } from "./live-avatar";
import type { LivePlayer } from "./types";

/** Lista de jogadores para escolher um (slot do campo, banco, marcador do golo). */
export function PlayerPicker({
  open,
  onOpenChange,
  title,
  description,
  players,
  onPick,
  emptyText = "Não há mais jogadores para escolher.",
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  players: LivePlayer[];
  onPick: (id: string) => void;
  emptyText?: string;
  footer?: React.ReactNode;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
    >
      {players.length === 0 ? (
        <p className="text-muted-foreground py-2 text-[15px]">{emptyText}</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {players.map((p) => (
            <li key={p.id}>
              <Button
                variant="ghost"
                onClick={() => onPick(p.id)}
                className="h-14 w-full justify-start gap-3 px-2 font-medium"
              >
                <LiveAvatar
                  player={p}
                  size="chip"
                  className="bg-secondary text-secondary-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-left text-base">{p.name}</span>
                {p.positions[0] && (
                  <span className="text-muted-foreground text-[13px] font-normal">
                    {POSITION_LABEL[p.positions[0]]}
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveSheet>
  );
}
