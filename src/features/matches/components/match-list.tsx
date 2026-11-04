"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { formatScore, ResultBadge } from "@/components/result-badge";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { formatDayShort, formatTime } from "@/lib/dates";
import { KIND_LABEL, VENUE_LABEL } from "../labels";
import { needsResult, splitMatches } from "../split";
import type { MatchListItem } from "../types";
import { BulkMatchesSheet } from "./bulk-matches-sheet";
import { MatchSheet } from "./match-sheet";

type Tab = "next" | "played";

/** Lista de jogos: Próximos | Realizados. O próximo jogo leva o marcador dourado. */
export function MatchList({
  matches,
  today,
  canEdit,
}: {
  matches: MatchListItem[];
  today: string;
  canEdit: boolean;
}) {
  const { upcoming, played } = useMemo(() => splitMatches(matches, today), [matches, today]);
  // Se não há próximos, abrir logo nos realizados.
  const [tab, setTab] = useState<Tab>(
    upcoming.length === 0 && played.length > 0 ? "played" : "next",
  );
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);

  const list = tab === "next" ? upcoming : played;

  return (
    <>
      {matches.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1">
            <Segmented
              aria-label="Jogos"
              options={[
                { value: "next" as const, label: `Próximos (${upcoming.length})` },
                { value: "played" as const, label: `Realizados (${played.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          {canEdit && (
            <Button className="hidden lg:inline-flex" onClick={() => setCreating(true)}>
              <Plus />
              Adicionar jogo
            </Button>
          )}
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          message="Ainda não há jogos. Se já tens o calendário da época, mete-o todo de uma vez."
          action={
            canEdit && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setBulk(true)}>
                  <CalendarPlus />
                  Adicionar vários jogos
                </Button>
                <Button variant="outline" onClick={() => setCreating(true)}>
                  <Plus />
                  Adicionar um jogo
                </Button>
              </div>
            )
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          message={tab === "next" ? "Não há jogos marcados." : "Ainda não há jogos realizados."}
        />
      ) : (
        <GroupedList>
          {list.map((m, i) => {
            const meta = [
              [formatDayShort(m.match_date), formatTime(m.kickoff_time)].filter(Boolean).join(", "),
              VENUE_LABEL[m.venue],
              m.kind === "oficial" ? m.competition : KIND_LABEL[m.kind],
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <ListRow
                key={m.id}
                href={`/jogos/${m.id}`}
                title={m.opponent}
                meta={meta}
                marker={tab === "next" && i === 0}
                trailing={
                  m.goals_for !== null && m.goals_against !== null ? (
                    <span className="flex items-center gap-2 font-semibold">
                      <ResultBadge goalsFor={m.goals_for} goalsAgainst={m.goals_against} />
                      {formatScore(m.goals_for, m.goals_against)}
                    </span>
                  ) : needsResult(m, today) ? (
                    <span className="text-muted-foreground text-[13px]">Sem resultado</span>
                  ) : null
                }
              />
            );
          })}
        </GroupedList>
      )}

      {canEdit && matches.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-3"
          onClick={() => setBulk(true)}
        >
          <CalendarPlus />
          Adicionar vários jogos
        </Button>
      )}

      {canEdit && matches.length > 0 && (
        <Button
          size="icon"
          aria-label="Adicionar jogo"
          onClick={() => setCreating(true)}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 size-14 rounded-2xl shadow-lg lg:hidden"
        >
          <Plus className="!size-6" />
        </Button>
      )}

      <MatchSheet open={creating} onOpenChange={setCreating} today={today} />
      <BulkMatchesSheet open={bulk} onOpenChange={setBulk} today={today} />
    </>
  );
}
