import { Suspense } from "react";
import { MessageSquarePlus } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";
import { SectionTitle } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ObservationButton } from "@/features/observations/components/observation-button";
import { ObservationTimeline } from "@/features/observations/components/observation-timeline";
import { getTodayContext, listPlayerObservations } from "@/features/observations/queries";
import { FocusEditor } from "@/features/players/components/focus-editor";
import { PlayerHeader } from "@/features/players/components/player-header";
import { getPlayer, listPlayerOptions } from "@/features/players/queries";
import { getCurrentTeam } from "@/lib/team";

export default function PlayerPage({ params }: PageProps<"/plantel/[id]">) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <PlayerData params={params} />
    </Suspense>
  );
}

async function PlayerData({ params }: Pick<PageProps<"/plantel/[id]">, "params">) {
  const { id } = await params;
  const player = await getPlayer(id);
  const [team, observations, players, context] = await Promise.all([
    getCurrentTeam(),
    listPlayerObservations(player.id),
    listPlayerOptions(),
    getTodayContext(),
  ]);
  const canObserve = team.canEdit && player.is_active;

  return (
    <>
      <title>{`${player.name} · Overlap`}</title>
      <PlayerHeader player={player} canEdit={team.canEdit} />
      <FocusEditor playerId={player.id} focus={player.current_focus} canEdit={team.canEdit} />

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Observações</SectionTitle>
          {canObserve && (
            <ObservationButton
              players={players}
              context={context}
              initialPlayerId={player.id}
              className="-mt-2 hidden lg:inline-flex"
              size="sm"
            >
              <MessageSquarePlus />
              Adicionar observação
            </ObservationButton>
          )}
        </div>
        <ObservationTimeline items={observations} />
      </section>

      {canObserve && (
        <>
          {/* Mobile: botão fixo em baixo, ao alcance do polegar */}
          <div aria-hidden className="h-16 lg:hidden" />
          <div className="border-border bg-background fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-30 border-t px-4 py-3 lg:hidden">
            <ObservationButton
              players={players}
              context={context}
              initialPlayerId={player.id}
              size="lg"
              className="w-full"
            >
              <MessageSquarePlus />
              Adicionar observação
            </ObservationButton>
          </div>
        </>
      )}
    </>
  );
}

function PlayerSkeleton() {
  return (
    <div aria-busy aria-label="A carregar">
      <Skeleton className="mb-4 h-9 w-24" />
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="mb-6 h-12 w-full" />
      <ListSkeleton rows={3} />
    </div>
  );
}
