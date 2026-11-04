import { Suspense } from "react";
import { ListSkeleton } from "@/components/list-skeleton";
import { ExerciseDetail } from "@/features/exercises/components/exercise-detail";
import { getExercise } from "@/features/exercises/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { uuid } from "@/lib/schema-helpers";
import { getCurrentTeam } from "@/lib/team";

export default function ExercisePage({ params, searchParams }: PageProps<"/exercicios/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ExerciseData params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ExerciseData({
  params,
  searchParams,
}: Pick<PageProps<"/exercicios/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { editar, treino } = await searchParams;
  // Vindo de um treino, a seta volta a esse treino (5.9).
  const sessionId = typeof treino === "string" && uuid.safeParse(treino).success ? treino : null;
  const [exercise, team] = await Promise.all([getExercise(id), getCurrentTeam()]);
  return (
    <>
      <title>{`${exercise.name} · Overlap`}</title>
      <ExerciseDetail
        // key: ao duplicar, navega-se para outro id e o estado do formulário recomeça.
        key={exercise.id}
        exercise={exercise}
        canEdit={team.canEdit}
        autoEdit={editar === "1"}
        back={sessionId ? { href: `/treinos/${sessionId}`, label: "Treino" } : undefined}
      />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy aria-label="A carregar">
      <Skeleton className="mb-4 h-9 w-28" />
      <Skeleton className="mb-4 h-48 w-full" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <ListSkeleton rows={2} />
    </div>
  );
}
