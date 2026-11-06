import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChartColumn } from "lucide-react";
import { ListSkeleton } from "@/components/list-skeleton";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MatchList } from "@/features/matches/components/match-list";
import { listMatches } from "@/features/matches/queries";
import { todayISO } from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

export const metadata: Metadata = { title: "Jogos" };

// Shell estático; os dados chegam dentro do <Suspense> (cacheComponents).
export default function JogosPage() {
  return (
    <>
      <PageHeader
        title="Jogos"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/estatisticas">
              <ChartColumn className="size-4" />
              Estatísticas
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <JogosData />
      </Suspense>
    </>
  );
}

async function JogosData() {
  // A equipa lê a sessão primeiro: só depois a página é dinâmica e pode saber "hoje".
  const [team, matches] = await Promise.all([getCurrentTeam(), listMatches()]);
  return <MatchList matches={matches} today={todayISO()} canEdit={team.canEdit} />;
}
