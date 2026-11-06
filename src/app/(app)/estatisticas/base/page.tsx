import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { BaseForm } from "@/features/stats/components/base-form";
import { isEmptyBase } from "@/features/stats/schemas";
import { listStatsPlayers } from "@/features/stats/queries";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Valores de base" };

export default function BasePage() {
  return (
    <>
      <PageHeader title="Valores de base" back={{ href: "/estatisticas", label: "Estatísticas" }} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <BaseData />
      </Suspense>
    </>
  );
}

async function BaseData() {
  const [team, players] = await Promise.all([getCurrentTeam(), listStatsPlayers()]);
  // Só quem edita mexe nos números.
  if (!team.canEdit) redirect("/estatisticas");

  const rows = players
    .filter((p) => p.is_active || !isEmptyBase(p.base))
    .map((p) => ({ id: p.id, name: p.name, shirtNumber: p.shirt_number, base: p.base }));
  return <BaseForm rows={rows} />;
}
