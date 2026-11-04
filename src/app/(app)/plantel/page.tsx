import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { PlayerList } from "@/features/players/components/player-list";
import { listPlayers } from "@/features/players/queries";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Plantel" };

// Shell estático; os dados chegam dentro do <Suspense> (cacheComponents).
export default function PlantelPage() {
  return (
    <>
      <PageHeader title="Plantel" />
      <Suspense fallback={<ListSkeleton />}>
        <PlantelData />
      </Suspense>
    </>
  );
}

async function PlantelData() {
  const [team, players] = await Promise.all([getCurrentTeam(), listPlayers()]);
  return <PlayerList players={players} canEdit={team.canEdit} />;
}
