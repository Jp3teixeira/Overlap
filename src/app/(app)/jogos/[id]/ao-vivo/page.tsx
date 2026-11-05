import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveMatch } from "@/features/matches/components/live/live-match";
import { getMatch, getMatchLive } from "@/features/matches/queries";
import { listLivePlayers } from "@/features/players/queries";
import { getCurrentTeam } from "@/lib/team";

export default function LiveMatchPage({ params }: PageProps<"/jogos/[id]/ao-vivo">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <LiveData params={params} />
    </Suspense>
  );
}

async function LiveData({ params }: Pick<PageProps<"/jogos/[id]/ao-vivo">, "params">) {
  const { id } = await params;
  const match = await getMatch(id);
  const [team, live, players] = await Promise.all([
    getCurrentTeam(),
    getMatchLive(match.id),
    listLivePlayers(),
  ]);
  // Só quem edita regista o jogo; os outros veem o resumo na ficha.
  if (!team.canEdit) redirect(`/jogos/${match.id}`);

  return (
    <>
      <title>{`Ao vivo · ${match.opponent} · Overlap`}</title>
      <LiveMatch
        matchId={match.id}
        opponent={match.opponent}
        teamName={team.name}
        players={players}
        initial={live}
      />
    </>
  );
}
