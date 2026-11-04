"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { formatDayLong, formatTime } from "@/lib/dates";
import { STATUS_LABEL } from "../labels";
import { needsClosing, splitSessions } from "../split";
import type { SessionListItem } from "../types";
import { SessionSheet } from "./session-sheet";

type Tab = "next" | "history";

/** Lista de treinos: Próximos | Histórico. O próximo treino leva o marcador dourado. */
export function SessionList({
  sessions,
  today,
  canEdit,
}: {
  sessions: SessionListItem[];
  today: string;
  canEdit: boolean;
}) {
  const { upcoming, history } = useMemo(() => splitSessions(sessions, today), [sessions, today]);
  // Se não há próximos, abrir logo no histórico.
  const [tab, setTab] = useState<Tab>(
    upcoming.length === 0 && history.length > 0 ? "history" : "next",
  );
  const [creating, setCreating] = useState(false);
  const list = tab === "next" ? upcoming : history;

  return (
    <>
      {sessions.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1">
            <Segmented
              aria-label="Treinos"
              options={[
                { value: "next" as const, label: `Próximos (${upcoming.length})` },
                { value: "history" as const, label: `Histórico (${history.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          {canEdit && (
            <Button className="hidden lg:inline-flex" onClick={() => setCreating(true)}>
              <Plus />
              Novo treino
            </Button>
          )}
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          message="Ainda não há treinos. Cria o próximo: só precisas da data, depois juntas os exercícios da biblioteca."
          action={
            canEdit && (
              <Button onClick={() => setCreating(true)}>
                <Plus />
                Novo treino
              </Button>
            )
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          message={tab === "next" ? "Não há treinos planeados." : "O histórico está vazio."}
        />
      ) : (
        <GroupedList>
          {list.map((s, i) => {
            const meta = [
              formatTime(s.start_time),
              s.item_count > 0
                ? `${s.item_count} ${s.item_count === 1 ? "exercício" : "exercícios"}`
                : "Sem exercícios",
              s.objectives,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <ListRow
                key={s.id}
                href={`/treinos/${s.id}`}
                title={formatDayLong(s.session_date)}
                meta={meta}
                marker={tab === "next" && i === 0}
                trailing={<Trailing s={s} today={today} />}
              />
            );
          })}
        </GroupedList>
      )}

      {canEdit && sessions.length > 0 && (
        <Button
          size="icon"
          aria-label="Novo treino"
          onClick={() => setCreating(true)}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 size-14 rounded-2xl shadow-lg lg:hidden"
        >
          <Plus className="!size-6" />
        </Button>
      )}

      <SessionSheet open={creating} onOpenChange={setCreating} today={today} />
    </>
  );
}

function Trailing({ s, today }: { s: SessionListItem; today: string }) {
  if (s.status === "cancelado")
    return <span className="text-muted-foreground text-[13px]">{STATUS_LABEL.cancelado}</span>;
  if (needsClosing(s, today))
    return <span className="text-muted-foreground text-[13px]">Por fechar</span>;
  if (s.item_count === 0) return null;
  const over = s.target_duration_min !== null && s.total_min > s.target_duration_min;
  return (
    <span className={over ? "text-destructive font-semibold" : "font-semibold"}>
      {s.target_duration_min ? `${s.total_min}/${s.target_duration_min}′` : `${s.total_min}′`}
    </span>
  );
}
