import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { ExerciseBrowser } from "@/features/exercises/components/exercise-browser";
import { parseFilters } from "@/features/exercises/filters";
import { listExercises } from "@/features/exercises/queries";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Exercícios" };

// Shell estático; searchParams e dados só dentro do <Suspense> (cacheComponents).
export default function ExerciciosPage({ searchParams }: PageProps<"/exercicios">) {
  return (
    <>
      <PageHeader title="Exercícios" />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <ExerciciosData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ExerciciosData({ searchParams }: Pick<PageProps<"/exercicios">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const [team, exercises] = await Promise.all([getCurrentTeam(), listExercises(filters)]);
  // Para distinguir "biblioteca vazia" de "filtros sem resultados".
  const hasAny =
    exercises.length > 0 ||
    (filters.q || filters.tags.length || filters.archived
      ? (await listExercises({ q: "", tags: [], archived: false })).length > 0
      : false);
  return (
    <ExerciseBrowser
      exercises={exercises}
      filters={filters}
      canEdit={team.canEdit}
      hasAny={hasAny}
    />
  );
}
