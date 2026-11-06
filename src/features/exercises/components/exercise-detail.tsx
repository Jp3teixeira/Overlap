"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronLeft, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAction } from "@/lib/run-action";
import { duplicateExercise, setExerciseArchived } from "../actions";
import { formationLabel } from "../diagram";
import { formatDuration, formatPlayers, formatRest } from "../filters";
import { TAG_LABEL } from "../labels";
import type { ExerciseRow } from "../types";
import { ExerciseSheet } from "./exercise-sheet";
import { AnimatedDiagram } from "./animated-diagram";
import { DiagramLegend } from "./pitch-diagram";

const SECTIONS = [
  { key: "description", label: "Como se joga" },
  { key: "objectives", label: "Objetivos" },
  { key: "success_criteria", label: "Critérios de sucesso" },
] as const;

const EXTRAS = [
  { key: "rules", label: "Regras" },
  { key: "variants", label: "Variantes" },
] as const;

/**
 * Ficha do exercício, feita para se perceber em 5 minutos: campo primeiro, depois os números
 * (duração, descanso, jogadores, espaço, material) e os três textos que interessam.
 */
export function ExerciseDetail({
  exercise,
  canEdit,
  autoEdit = false,
  back = { href: "/exercicios", label: "Exercícios" },
}: {
  exercise: ExerciseRow;
  canEdit: boolean;
  autoEdit?: boolean;
  /** Para onde volta a seta (ex.: o treino de onde se veio). */
  back?: { href: string; label: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(autoEdit && canEdit);
  const [pending, startTransition] = useTransition();

  const facts: { label: string; value: string; wide?: boolean }[] = [
    { label: "Duração", value: formatDuration(exercise.duration_min, exercise.series) },
    { label: "Descanso", value: formatRest(exercise.rest_seconds) },
    { label: "Jogadores", value: formatPlayers(exercise.min_players) },
    { label: "Espaço", value: exercise.space ?? "" },
    { label: "Material", value: exercise.equipment ?? "", wide: true },
  ].filter((f) => f.value);

  const formation = formationLabel(exercise.diagram);
  const extras = EXTRAS.filter((x) => exercise[x.key]?.trim());

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

  const photo = exercise.image_url && (
    // eslint-disable-next-line @next/next/no-img-element -- URL assinado de curta duração
    <img
      src={exercise.image_url}
      alt={`Foto do exercício: ${exercise.name}`}
      className="border-border bg-card max-h-[70dvh] w-full rounded-lg border object-contain"
    />
  );

  return (
    <article>
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={back.href}
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          {back.label}
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

      <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">{exercise.name}</h1>
      <p className="text-muted-foreground mt-1 text-[15px]">
        {[formation, exercise.tags.map((t) => TAG_LABEL[t]).join(", ")].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-3">
          {exercise.diagram ? (
            <>
              <AnimatedDiagram diagram={exercise.diagram} />
              <DiagramLegend diagram={exercise.diagram} />
            </>
          ) : (
            photo
          )}
        </div>

        <div className="flex flex-col gap-5">
          {facts.length > 0 && (
            <dl className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
              {facts.map((f) => (
                <div key={f.label} className={`bg-card px-3 py-2.5 ${f.wide ? "col-span-2" : ""}`}>
                  <dt className="text-muted-foreground text-[13px]">{f.label}</dt>
                  <dd className="text-[17px] leading-6 font-semibold">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

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

          {extras.length > 0 && (
            <details className="border-border rounded-lg border">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-[15px] font-medium">
                Regras e variantes
              </summary>
              <div className="border-border flex flex-col gap-4 border-t px-3 py-3">
                {extras.map(({ key, label }) => (
                  <section key={key}>
                    <h3 className="text-muted-foreground mb-1 text-[13px] font-semibold">
                      {label}
                    </h3>
                    <p className="text-[17px] leading-[25px] whitespace-pre-wrap">
                      {exercise[key]}
                    </p>
                  </section>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {exercise.diagram && photo && (
        <section className="mt-6">
          <h2 className="text-muted-foreground mb-1.5 text-[13px] font-semibold tracking-wide uppercase">
            Foto
          </h2>
          {photo}
        </section>
      )}

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
