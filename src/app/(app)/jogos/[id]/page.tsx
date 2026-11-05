import { Suspense } from "react";
import Link from "next/link";
import { MessageSquarePlus, Play } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisEditor } from "@/features/matches/components/analysis-editor";
import { MatchHeader } from "@/features/matches/components/match-header";
import { LiveSummary } from "@/features/matches/components/live/live-summary";
import { toPlayerMap } from "@/features/matches/components/live/types";
import { MatchObservations } from "@/features/matches/components/match-observations";
import { getMatch, getMatchLive, listMatchObservations } from "@/features/matches/queries";
import { ObservationButton } from "@/features/observations/components/observation-button";
import { listLivePlayers, listPlayerOptions } from "@/features/players/queries";
import { todayISO } from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

export default function MatchPage({ params }: PageProps<"/jogos/[id]">) {
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchData params={params} />
    </Suspense>
  );
}

async function MatchData({ params }: Pick<PageProps<"/jogos/[id]">, "params">) {
  const { id } = await params;
  const match = await getMatch(id);
  const [team, observations, players, live, livePlayers] = await Promise.all([
    getCurrentTeam(),
    listMatchObservations(match.id),
    listPlayerOptions(),
    getMatchLive(match.id),
    listLivePlayers(),
  ]);
  const liveLabel =
    !live || live.status === "setup"
      ? live && live.slots.some(Boolean)
        ? "Continuar convocatória"
        : "Iniciar jogo ao vivo"
      : live.status === "finished"
        ? "Abrir jogo ao vivo"
        : "Voltar ao jogo ao vivo";

  return (
    <>
      <title>{`${match.opponent} · Overlap`}</title>
      <MatchHeader match={match} today={todayISO()} canEdit={team.canEdit} />
      {team.canEdit && (
        <Button
          asChild
          size="lg"
          variant={live?.status === "finished" ? "outline" : "primary"}
          className="mb-6 w-full"
        >
          <Link href={`/jogos/${match.id}/ao-vivo`}>
            <Play />
            {liveLabel}
          </Link>
        </Button>
      )}
      {live && live.status === "finished" && (
        <div className="mb-6">
          <LiveSummary
            live={live}
            players={toPlayerMap(livePlayers)}
            teamName={team.name}
            opponent={match.opponent}
          />
        </div>
      )}
      <AnalysisEditor match={match} canEdit={team.canEdit} />

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Observações</SectionTitle>
          {team.canEdit && (
            <ObservationButton
              players={players}
              // Aqui o jogo é este, não o "de hoje": a observação liga-se a ele.
              context={{ sessionId: null, match: { id: match.id, opponent: match.opponent } }}
              variant="outline"
              size="sm"
              className="-mt-2"
            >
              <MessageSquarePlus />
              Observação
            </ObservationButton>
          )}
        </div>
        <MatchObservations items={observations} />
      </section>
    </>
  );
}

function MatchSkeleton() {
  return (
    <div aria-busy aria-label="A carregar">
      <Skeleton className="mb-4 h-9 w-24" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="mb-4 h-4 w-1/2" />
      <Skeleton className="mb-8 h-16 w-full" />
      <ListSkeleton rows={3} />
    </div>
  );
}
