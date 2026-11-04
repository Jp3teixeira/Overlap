import type { Metadata } from "next";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { SessionList } from "@/features/training/components/session-list";
import { listSessions } from "@/features/training/queries";
import { todayISO } from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Treinos" };

// Shell estático; os dados chegam dentro do <Suspense> (cacheComponents).
export default function TreinosPage() {
  return (
    <>
      <PageHeader title="Treinos" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <TreinosData />
      </Suspense>
    </>
  );
}

async function TreinosData() {
  // A equipa lê a sessão primeiro: só depois a página é dinâmica e pode saber "hoje".
  const [team, sessions] = await Promise.all([getCurrentTeam(), listSessions()]);
  return <SessionList sessions={sessions} today={todayISO()} canEdit={team.canEdit} />;
}
