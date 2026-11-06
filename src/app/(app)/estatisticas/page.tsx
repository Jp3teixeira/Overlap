import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { getStats } from "@/features/stats/queries";
import { StatsView } from "@/features/stats/components/stats-view";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Estatísticas" };

// Shell estático; os dados chegam dentro do <Suspense> (cacheComponents).
export default function EstatisticasPage() {
  return (
    <>
      <PageHeader title="Estatísticas" back={{ href: "/jogos", label: "Jogos" }} />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <StatsData />
      </Suspense>
    </>
  );
}

async function StatsData() {
  const [team, { summary, players }] = await Promise.all([getCurrentTeam(), getStats()]);
  return (
    <StatsView summary={summary} players={players} teamName={team.name} canEdit={team.canEdit} />
  );
}
