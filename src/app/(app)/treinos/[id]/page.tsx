import { Suspense } from "react";
import { MessageSquarePlus } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";
import { SectionTitle } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { listExercises } from "@/features/exercises/queries";
import { ObservationButton } from "@/features/observations/components/observation-button";
import { listPlayerOptions } from "@/features/players/queries";
import { SessionActions } from "@/features/training/components/session-actions";
import { SessionClose } from "@/features/training/components/session-close";
import { SessionHeader } from "@/features/training/components/session-header";
import { SessionObservations } from "@/features/training/components/session-observations";
import { SessionPlan } from "@/features/training/components/session-plan";
import { getSession, listSessionObservations } from "@/features/training/queries";
import { formatDayLong, todayISO } from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

export default function SessionPage({ params }: PageProps<"/treinos/[id]">) {
  return (
    <Suspense fallback={<SessionSkeleton />}>
      <SessionData params={params} />
    </Suspense>
  );
}

async function SessionData({ params }: Pick<PageProps<"/treinos/[id]">, "params">) {
  const { id } = await params;
  const { session, items } = await getSession(id);
  const [team, observations, players, library] = await Promise.all([
    getCurrentTeam(),
    listSessionObservations(session.id),
    listPlayerOptions(),
    listExercises({ q: "", tags: [], archived: false }),
  ]);
  const today = todayISO();

  return (
    <>
      <title>{`Treino ${formatDayLong(session.session_date)} · Overlap`}</title>
      <SessionHeader session={session} today={today} canEdit={team.canEdit} />
      <SessionPlan
        sessionId={session.id}
        items={items}
        targetMin={session.target_duration_min}
        library={library}
        canEdit={team.canEdit}
      />
      <SessionClose session={session} canEdit={team.canEdit} />

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Observações</SectionTitle>
          {team.canEdit && (
            <ObservationButton
              players={players}
              // Aqui o treino é este, não o "de hoje": a observação liga-se a ele.
              context={{ sessionId: session.id, match: null }}
              variant="outline"
              size="sm"
              className="-mt-2"
            >
              <MessageSquarePlus />
              Observação
            </ObservationButton>
          )}
        </div>
        <SessionObservations items={observations} />
      </section>

      {team.canEdit && <SessionActions session={session} today={today} />}
    </>
  );
}

function SessionSkeleton() {
  return (
    <div aria-busy aria-label="A carregar">
      <Skeleton className="mb-4 h-9 w-24" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="mb-6 h-5 w-1/3" />
      <Skeleton className="mb-3 h-16 w-full" />
      <ListSkeleton rows={4} />
    </div>
  );
}
