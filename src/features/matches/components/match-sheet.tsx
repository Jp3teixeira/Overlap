"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { createMatch, deleteMatch, updateMatch } from "../actions";
import { kindOptions, venueOptions, type MatchKind, type MatchVenue } from "../labels";
import type { MatchRow } from "../types";

type Values = {
  match_date: string;
  kickoff_time: string;
  opponent: string;
  venue: MatchVenue;
  kind: MatchKind;
  competition: string;
  zerozero_url: string;
  video_url: string;
};

function emptyValues(today: string): Values {
  return {
    match_date: today,
    kickoff_time: "",
    opponent: "",
    venue: "casa",
    kind: "oficial",
    competition: "",
    zerozero_url: "",
    video_url: "",
  };
}

function fromMatch(m: MatchRow): Values {
  return {
    match_date: m.match_date,
    kickoff_time: m.kickoff_time?.slice(0, 5) ?? "",
    opponent: m.opponent,
    venue: m.venue,
    kind: m.kind,
    competition: m.competition ?? "",
    zerozero_url: m.zerozero_url ?? "",
    video_url: m.video_url ?? "",
  };
}

type MatchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data de hoje (vem do servidor, em Lisboa) para o jogo novo. */
  today: string;
  /** Sem jogo = criar. */
  match?: MatchRow;
};

/** Criar ou editar um jogo. Obrigatórios: data e adversário. */
export function MatchSheet({ open, onOpenChange, today, match }: MatchSheetProps) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(match ? fromMatch(match) : emptyValues(today));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(match);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(match ? fromMatch(match) : emptyValues(today));
      setErrors({});
      setConfirmDelete(false);
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await runAction<unknown>(() =>
        match ? updateMatch(match.id, values) : createMatch(values),
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Jogo guardado" : `Jogo com ${values.opponent.trim()} adicionado`);
      onOpenChange(false);
    });
  }

  function remove() {
    if (!match) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const result = await runAction(() => deleteMatch(match.id));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Jogo apagado");
      onOpenChange(false);
      router.push("/jogos");
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar jogo" : "Novo jogo"}
      footer={
        <Button onClick={save} disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Adversário" htmlFor="match-opponent" error={errors.opponent?.[0]}>
          <Input
            id="match-opponent"
            value={values.opponent}
            onChange={(e) => set("opponent", e.target.value)}
            placeholder="Nome da equipa"
            autoComplete="off"
            aria-invalid={errors.opponent ? true : undefined}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="match-date" error={errors.match_date?.[0]}>
            <Input
              id="match-date"
              type="date"
              value={values.match_date}
              onChange={(e) => set("match_date", e.target.value)}
              aria-invalid={errors.match_date ? true : undefined}
            />
          </Field>
          <Field label="Hora" htmlFor="match-time" error={errors.kickoff_time?.[0]}>
            <Input
              id="match-time"
              type="time"
              value={values.kickoff_time}
              onChange={(e) => set("kickoff_time", e.target.value)}
              aria-invalid={errors.kickoff_time ? true : undefined}
            />
          </Field>
        </div>

        <Field label="Local">
          <Segmented
            aria-label="Local"
            options={venueOptions}
            value={values.venue}
            onChange={(v) => set("venue", v)}
          />
        </Field>

        <Field label="Tipo">
          <Segmented
            aria-label="Tipo de jogo"
            options={kindOptions}
            value={values.kind}
            onChange={(v) => set("kind", v)}
          />
        </Field>

        <Field label="Competição" htmlFor="match-competition" error={errors.competition?.[0]}>
          <Input
            id="match-competition"
            value={values.competition}
            onChange={(e) => set("competition", e.target.value)}
            placeholder="Ex.: Campeonato Distrital"
            maxLength={80}
          />
        </Field>

        <Field label="Link do ZeroZero" htmlFor="match-zz" error={errors.zerozero_url?.[0]}>
          <Input
            id="match-zz"
            type="url"
            inputMode="url"
            value={values.zerozero_url}
            onChange={(e) => set("zerozero_url", e.target.value)}
            placeholder="https://…"
            aria-invalid={errors.zerozero_url ? true : undefined}
          />
        </Field>

        <Field label="Link do vídeo" htmlFor="match-video" error={errors.video_url?.[0]}>
          <Input
            id="match-video"
            type="url"
            inputMode="url"
            value={values.video_url}
            onChange={(e) => set("video_url", e.target.value)}
            placeholder="https://…"
            aria-invalid={errors.video_url ? true : undefined}
          />
        </Field>

        {match && (
          <div className="border-border border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive w-full"
              onClick={remove}
              disabled={pending}
            >
              {confirmDelete ? "Toca outra vez para apagar" : "Apagar jogo"}
            </Button>
            <p className="text-muted-foreground mt-1 text-center text-[13px]">
              As observações feitas neste jogo ficam guardadas.
            </p>
          </div>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ResponsiveSheet>
  );
}
