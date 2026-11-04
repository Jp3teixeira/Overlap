"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { formatDayLong, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type SessionStatus } from "../labels";
import { needsClosing } from "../split";
import type { SessionRow } from "../types";
import { SessionSheet } from "./session-sheet";

const STATUS_STYLE: Record<SessionStatus, string> = {
  planeado: "border-border bg-card text-foreground",
  realizado: "border-transparent bg-[var(--result-win)] text-white",
  cancelado: "border-transparent bg-muted text-muted-foreground",
};

/** Cabeçalho do treino: dia, hora, estado, números do treino e objetivo. */
export function SessionHeader({
  session,
  today,
  canEdit,
}: {
  session: SessionRow;
  today: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const facts = [
    {
      label: "Duração",
      value: session.target_duration_min ? `${session.target_duration_min} min` : "",
    },
    { label: "Jogadores", value: session.expected_players ? String(session.expected_players) : "" },
    { label: "Espaço", value: session.space ?? "" },
  ].filter((f) => f.value);

  return (
    <header className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/treinos"
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          Treinos
        </Link>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="!size-4" />
            Editar
          </Button>
        )}
      </div>

      <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">
        {formatDayLong(session.session_date)}
      </h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[15px]">
        {session.start_time && (
          <span className="text-muted-foreground">{formatTime(session.start_time)}</span>
        )}
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[13px] font-medium",
            STATUS_STYLE[session.status],
          )}
        >
          {needsClosing(session, today) ? "Por fechar" : STATUS_LABEL[session.status]}
        </span>
      </p>

      {facts.length > 0 && (
        <dl className="bg-border border-border mt-4 grid auto-cols-fr grid-flow-col gap-px overflow-hidden rounded-lg border">
          {facts.map((f) => (
            <div key={f.label} className="bg-card px-3 py-2.5">
              <dt className="text-muted-foreground text-[13px]">{f.label}</dt>
              <dd className="text-[17px] leading-6 font-semibold break-words">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {session.objectives && (
        <section className="mt-5">
          <h2 className="text-muted-foreground mb-1 text-[13px] font-semibold tracking-wide uppercase">
            Objetivo
          </h2>
          <p className="text-[17px] leading-[25px] whitespace-pre-wrap">{session.objectives}</p>
        </section>
      )}
      {session.notes && (
        <section className="mt-5">
          <h2 className="text-muted-foreground mb-1 text-[13px] font-semibold tracking-wide uppercase">
            Notas
          </h2>
          <p className="text-[17px] leading-[25px] whitespace-pre-wrap">{session.notes}</p>
        </section>
      )}

      {canEdit && (
        <SessionSheet open={editing} onOpenChange={setEditing} today={today} session={session} />
      )}
    </header>
  );
}
