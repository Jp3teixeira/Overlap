import Link from "next/link";
import { ClipboardPen, Play } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { minutesPerGame, toMinutes, type StatsPlayer, type StatsSummary } from "../aggregate";
import { PlayersTable, type TableRow } from "./players-table";
import { TeamStats } from "./team-stats";
import { TopLists } from "./top-lists";

/** Página de estatísticas. Sem hooks: o estado da tabela vive em PlayersTable. */
export function StatsView({
  summary,
  players,
  teamName,
  canEdit,
}: {
  summary: StatsSummary;
  players: StatsPlayer[];
  teamName: string;
  canEdit: boolean;
}) {
  const { team, pending } = summary;
  const byId = new Map(summary.players.map((l) => [l.id, l]));

  // Ativos sempre; arquivados só se tiverem números.
  const shown = players.filter((p) => {
    const l = byId.get(p.id)!;
    return p.is_active || l.games > 0 || l.goals > 0 || l.assists > 0;
  });
  const rows: TableRow[] = shown.map((p) => {
    const l = byId.get(p.id)!;
    return {
      id: p.id,
      name: p.name,
      shirtNumber: p.shirt_number,
      games: l.games,
      minutes: toMinutes(l.seconds),
      perGame: minutesPerGame(l),
      goals: l.goals,
      assists: l.assists,
    };
  });

  const hasAnyData =
    team.played > 0 || team.liveGames > 0 || rows.some((r) => r.games > 0 || r.goals > 0);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="border-marker bg-card rounded-lg border px-4 py-3 text-[15px]">
          <p className="font-medium">
            {pending.length === 1
              ? `Jogo ao vivo por terminar: ${pending[0].opponent}.`
              : `${pending.length} jogos ao vivo por terminar.`}
          </p>
          <p className="text-muted-foreground mt-0.5">
            Só contam para as estatísticas depois de os terminares.
          </p>
          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-2">
              {pending.map((m) => (
                <Button key={m.id} asChild size="sm" variant="outline">
                  <Link href={`/jogos/${m.id}/ao-vivo`}>
                    <Play className="size-4" />
                    {m.opponent}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasAnyData ? (
        <EmptyState
          message="Ainda não há números. As estatísticas enchem com os jogos registados ao vivo; o que já se jogou antes da app mete-se em 'Valores de base'."
          action={
            canEdit && (
              <Button asChild>
                <Link href="/estatisticas/base">
                  <ClipboardPen />
                  Valores de base
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <TeamStats team={team} teamName={teamName} />
          <TopLists players={shown} lines={summary.players} />
        </>
      )}

      <section>
        <SectionTitle>Jogadores</SectionTitle>
        <PlayersTable rows={rows} />
        <p className="text-muted-foreground mt-2 text-[13px]">
          Contam os jogos registados ao vivo e terminados, mais os valores de base. Os minutos vêm
          das substituições.
        </p>
        {canEdit && (
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/estatisticas/base">
              <ClipboardPen />
              Valores de base
            </Link>
          </Button>
        )}
      </section>
    </div>
  );
}
