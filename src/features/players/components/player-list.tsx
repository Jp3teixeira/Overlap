"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupPlayers } from "../grouping";
import { formatPositions } from "../labels";
import type { PlayerListItem } from "../types";
import { PlayerSheet } from "./player-sheet";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista do plantel com pesquisa local (são poucos jogadores; não vale a pena ir à BD). */
export function PlayerList({ players, canEdit }: { players: PlayerListItem[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const archivedCount = players.filter((p) => !p.is_active).length;
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return players.filter(
      (p) =>
        (showArchived ? !p.is_active : p.is_active) &&
        (!q || normalize(p.name).includes(q) || p.shirt_number?.toString() === q),
    );
  }, [players, query, showArchived]);

  return (
    <>
      {players.length > 0 && (
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar por nome ou número"
              aria-label="Procurar jogador"
              className="pl-10"
            />
          </div>
          {canEdit && (
            <Button className="hidden lg:inline-flex" onClick={() => setCreating(true)}>
              <Plus />
              Adicionar jogador
            </Button>
          )}
        </div>
      )}

      {players.length === 0 ? (
        <EmptyState
          message="Ainda não há jogadores. Adiciona o plantel: só o nome é obrigatório."
          action={
            canEdit && (
              <Button onClick={() => setCreating(true)}>
                <Plus />
                Adicionar jogador
              </Button>
            )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          message={
            query ? `Nenhum jogador encontrado para "${query}".` : "Não há jogadores arquivados."
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groupPlayers(visible).map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="text-muted-foreground mb-1.5 px-1 text-[13px] font-semibold tracking-wide uppercase">
                {group.label}
                <span className="ml-1.5 font-normal tabular-nums">{group.players.length}</span>
              </h2>
              <GroupedList>
                {group.players.map((p) => (
                  <ListRow
                    key={p.id}
                    href={`/plantel/${p.id}`}
                    leading={
                      <PlayerAvatar
                        name={p.name}
                        shirtNumber={p.shirt_number}
                        photoUrl={p.photo_url}
                      />
                    }
                    title={p.name}
                    meta={formatPositions(p.positions) || "Sem posição definida"}
                  />
                ))}
              </GroupedList>
            </section>
          ))}
        </div>
      )}

      {archivedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-3"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Voltar ao plantel" : `Ver arquivados (${archivedCount})`}
        </Button>
      )}

      {canEdit && players.length > 0 && (
        <Button
          size="icon"
          aria-label="Adicionar jogador"
          onClick={() => setCreating(true)}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 size-14 rounded-2xl shadow-lg lg:hidden"
        >
          <Plus className="!size-6" />
        </Button>
      )}

      <PlayerSheet open={creating} onOpenChange={setCreating} />
    </>
  );
}
