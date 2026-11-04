"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { FOOT_LABEL, POSITION_LABEL } from "../labels";
import type { PlayerRow } from "../types";
import { PlayerSheet } from "./player-sheet";

/** Cabeçalho da ficha: avatar, nome, número/pé/ano, posições e botão Editar. */
export function PlayerHeader({ player, canEdit }: { player: PlayerRow; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const facts = [
    player.shirt_number != null ? `N.º ${player.shirt_number}` : null,
    player.dominant_foot ? `pé ${FOOT_LABEL[player.dominant_foot].toLowerCase()}` : null,
    player.birth_year ? `nascido em ${player.birth_year}` : null,
  ].filter(Boolean);

  return (
    <header className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/plantel"
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          Plantel
        </Link>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="!size-4" />
            Editar
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <PlayerAvatar
          name={player.name}
          shirtNumber={player.shirt_number}
          photoUrl={player.photo_url}
          size="lg"
        />
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">{player.name}</h1>
          {facts.length > 0 && (
            <p className="text-muted-foreground mt-1 text-[15px]">
              {facts.join(", ").charAt(0).toUpperCase() + facts.join(", ").slice(1)}
            </p>
          )}
        </div>
      </div>

      {player.positions.length > 0 && (
        <ul aria-label="Posições" className="mt-3 flex flex-wrap gap-1.5">
          {player.positions.map((p) => (
            <li
              key={p}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-[13px] font-medium"
            >
              {POSITION_LABEL[p]}
            </li>
          ))}
        </ul>
      )}

      {!player.is_active && (
        <p className="border-border bg-muted text-muted-foreground mt-4 rounded-lg border px-3 py-2 text-sm">
          Jogador arquivado. Para o voltar a pôr no plantel: Editar → Reativar.
        </p>
      )}

      {canEdit && <PlayerSheet open={editing} onOpenChange={setEditing} player={player} />}
    </header>
  );
}
