"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronLeft, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAction } from "@/lib/run-action";
import { duplicateExercise, setExerciseArchived } from "../actions";
import { formatPlayers } from "../filters";
import { TAG_LABEL } from "../labels";
import type { ExerciseRow } from "../types";
import { ExerciseSheet } from "./exercise-sheet";

const SECTIONS = [
  { key: "description", label: "Descrição" },
  { key: "objectives", label: "Objetivos" },
  { key: "organization", label: "Organização" },
  { key: "rules", label: "Regras" },
  { key: "variants", label: "Variantes" },
  { key: "coaching_points", label: "Pontos a corrigir" },
] as const;

/** Ficha do exercício: imagem em grande primeiro e só as secções que têm texto. */
export function ExerciseDetail({
  exercise,
  canEdit,
  autoEdit = false,
}: {
  exercise: ExerciseRow;
  canEdit: boolean;
  autoEdit?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(autoEdit && canEdit);
  const [pending, startTransition] = useTransition();

  const facts = [
    exercise.duration_min ? `${exercise.duration_min} min` : "",
    formatPlayers(exercise.min_players, exercise.max_players)
      ? `${formatPlayers(exercise.min_players, exercise.max_players)} jogadores`
      : "",
    exercise.space ?? "",
    exercise.equipment ? `Material: ${exercise.equipment}` : "",
  ].filter(Boolean);

  function duplicate() {
    startTransition(async () => {
      const result = await runAction(() => duplicateExercise(exercise.id));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Cópia criada");
      router.push(`/exercicios/${result.data.id}?editar=1`);
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await runAction(() => setExerciseArchived(exercise.id, !exercise.is_archived));
      if (!result.ok) return void toast.error(result.error);
      toast.success(exercise.is_archived ? "Exercício reativado" : "Exercício arquivado");
    });
  }

  return (
    <article>
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/exercicios"
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          Exercícios
        </Link>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="!size-4" />
            Editar
          </Button>
        )}
      </div>

      {exercise.is_archived && (
        <p className="border-border bg-muted text-muted-foreground mb-3 rounded-lg border px-3 py-2 text-[15px]">
          Arquivado: já não aparece na biblioteca.
        </p>
      )}

      {exercise.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinado de curta duração
        <img
          src={exercise.image_url}
          alt={`Esquema: ${exercise.name}`}
          className="border-border bg-card mb-4 max-h-[70dvh] w-full rounded-lg border object-contain"
        />
      )}

      <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">{exercise.name}</h1>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {exercise.tags.map((t) => (
          <li
            key={t}
            className="border-border bg-card rounded-full border px-2.5 py-0.5 text-[13px] font-medium"
          >
            {TAG_LABEL[t]}
          </li>
        ))}
      </ul>
      {facts.length > 0 && (
        <p className="text-muted-foreground mt-3 text-[15px]">{facts.join(" · ")}</p>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {SECTIONS.map(({ key, label }) =>
          exercise[key]?.trim() ? (
            <section key={key}>
              <h2 className="text-muted-foreground mb-1 text-[13px] font-semibold tracking-wide uppercase">
                {label}
              </h2>
              <p className="text-[17px] leading-[25px] whitespace-pre-wrap">{exercise[key]}</p>
            </section>
          ) : null,
        )}
      </div>

      {canEdit && (
        <div className="border-border mt-8 flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={duplicate} disabled={pending}>
            <Copy />
            Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={toggleArchive}
            disabled={pending}
          >
            {exercise.is_archived ? <ArchiveRestore /> : <Archive />}
            {exercise.is_archived ? "Reativar" : "Arquivar"}
          </Button>
        </div>
      )}

      {canEdit && <ExerciseSheet open={editing} onOpenChange={setEditing} exercise={exercise} />}
    </article>
  );
}
