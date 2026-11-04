"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatScore, ResultBadge } from "@/components/result-badge";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { ScoreStepper } from "@/components/score-stepper";
import { Button } from "@/components/ui/button";
import { formatDayLong, formatTime } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
import { clearMatchResult, setMatchResult } from "../actions";
import { KIND_LABEL, VENUE_LABEL } from "../labels";
import type { MatchRow } from "../types";
import { MatchSheet } from "./match-sheet";

/** Cabeçalho do jogo: adversário, data, resultado (registar/alterar) e links. */
export function MatchHeader({
  match,
  today,
  canEdit,
}: {
  match: MatchRow;
  today: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [scoring, setScoring] = useState(false);
  const hasResult = match.goals_for !== null && match.goals_against !== null;

  const subtitle = [
    [formatDayLong(match.match_date), formatTime(match.kickoff_time)].filter(Boolean).join(", "),
    VENUE_LABEL[match.venue],
    KIND_LABEL[match.kind],
    match.competition,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/jogos"
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          Jogos
        </Link>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="!size-4" />
            Editar
          </Button>
        )}
      </div>

      <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">{match.opponent}</h1>
      <p className="text-muted-foreground mt-1 text-[15px]">{subtitle}</p>

      <div className="border-border bg-card mt-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
        {hasResult ? (
          <>
            <span className="flex items-center gap-3">
              <ResultBadge goalsFor={match.goals_for!} goalsAgainst={match.goals_against!} />
              <span className="text-4xl leading-none font-[650] [font-stretch:88%] tabular-nums">
                {formatScore(match.goals_for!, match.goals_against!)}
              </span>
            </span>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setScoring(true)}>
                Alterar
              </Button>
            )}
          </>
        ) : (
          <>
            <span className="text-muted-foreground text-[15px]">
              {match.match_date < today ? "Falta registar o resultado." : "Ainda não jogado."}
            </span>
            {canEdit && (
              <Button size="sm" onClick={() => setScoring(true)}>
                Registar resultado
              </Button>
            )}
          </>
        )}
      </div>

      {(match.zerozero_url || match.video_url) && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {match.zerozero_url && (
            <li>
              <ExternalLinkChip href={match.zerozero_url}>ZeroZero</ExternalLinkChip>
            </li>
          )}
          {match.video_url && (
            <li>
              <ExternalLinkChip href={match.video_url}>Vídeo do jogo</ExternalLinkChip>
            </li>
          )}
        </ul>
      )}

      {canEdit && (
        <>
          <MatchSheet open={editing} onOpenChange={setEditing} today={today} match={match} />
          <ResultSheet
            open={scoring}
            onOpenChange={setScoring}
            match={match}
            hasResult={hasResult}
          />
        </>
      )}
    </header>
  );
}

function ExternalLinkChip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-card text-primary active:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
    </a>
  );
}

function ResultSheet({
  open,
  onOpenChange,
  match,
  hasResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: MatchRow;
  hasResult: boolean;
}) {
  const [goalsFor, setGoalsFor] = useState(match.goals_for ?? 0);
  const [goalsAgainst, setGoalsAgainst] = useState(match.goals_against ?? 0);
  const [pending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setGoalsFor(match.goals_for ?? 0);
      setGoalsAgainst(match.goals_against ?? 0);
    }
  }

  function save() {
    startTransition(async () => {
      const result = await runAction(() =>
        setMatchResult(match.id, { goals_for: goalsFor, goals_against: goalsAgainst }),
      );
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Resultado guardado: ${formatScore(goalsFor, goalsAgainst)}`);
      onOpenChange(false);
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await runAction(() => clearMatchResult(match.id));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Resultado removido");
      onOpenChange(false);
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Resultado"
      footer={
        <>
          <Button onClick={save} disabled={pending}>
            {pending ? "A guardar…" : "Guardar resultado"}
          </Button>
          {hasResult && (
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={clear}
              disabled={pending}
            >
              Tirar resultado
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-start justify-center gap-8 py-2">
        <ScoreStepper value={goalsFor} onChange={setGoalsFor} label="Nós" />
        <span aria-hidden className="text-muted-foreground mt-[88px] text-3xl">
          –
        </span>
        <ScoreStepper value={goalsAgainst} onChange={setGoalsAgainst} label={match.opponent} />
      </div>
    </ResponsiveSheet>
  );
}
