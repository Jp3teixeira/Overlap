import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardList, MessageSquarePlus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { SectionTitle } from "@/components/page-header";
import { formatScore, ResultBadge } from "@/components/result-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { VENUE_LABEL } from "@/features/matches/labels";
import { getHomeMatches } from "@/features/matches/queries";
import { ObservationButton } from "@/features/observations/components/observation-button";
import { getTodayContext } from "@/features/observations/queries";
import { listPlayerOptions } from "@/features/players/queries";
import { formatCountdown, formatDayShort, formatTime, todayISO } from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

const tile = "h-auto flex-col gap-1 py-3 text-sm";

// Início: próximo treino, próximo jogo, último resultado e 3 atalhos. Nada mais (F6.1).
export default function HomePage() {
  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight lg:hidden">Overlap</h1>
        <form action={signOut} className="lg:hidden">
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            Sair
          </Button>
        </form>
        <h1 className="hidden text-[26px] leading-[30px] font-[650] tracking-tight lg:block">
          Início
        </h1>
      </header>

      <div className="flex flex-col gap-6">
        <section>
          <SectionTitle>Próximo treino</SectionTitle>
          <EmptyState message="Ainda não há treinos planeados. Planeia o próximo em Treinos." />
        </section>
        <Suspense fallback={<HomeMatchesSkeleton />}>
          <HomeMatches />
        </Suspense>

        <nav aria-label="Atalhos" className="grid grid-cols-3 gap-2">
          <Suspense
            fallback={
              <Button variant="outline" className={tile} disabled>
                <MessageSquarePlus />
                Observação
              </Button>
            }
          >
            <ObservationShortcut />
          </Suspense>
          <Button asChild variant="outline" className={tile}>
            <Link href="/treinos">
              <ClipboardList />
              Treino
            </Link>
          </Button>
          <Button asChild variant="outline" className={tile}>
            <Link href="/jogos">
              <CalendarDays />
              Jogo
            </Link>
          </Button>
        </nav>
      </div>
    </>
  );
}

/** Atalho de observação: precisa do plantel e do contexto de hoje, por isso vive no <Suspense>. */
async function ObservationShortcut() {
  const [team, players, context] = await Promise.all([
    getCurrentTeam(),
    listPlayerOptions(),
    getTodayContext(),
  ]);
  if (!team.canEdit) {
    return (
      <Button asChild variant="outline" className={tile}>
        <Link href="/plantel">
          <MessageSquarePlus />
          Plantel
        </Link>
      </Button>
    );
  }
  return (
    <ObservationButton players={players} context={context} variant="outline" className={tile}>
      <MessageSquarePlus />
      Observação
    </ObservationButton>
  );
}

/** Próximo jogo e último resultado. Lê a sessão, por isso vive no <Suspense>. */
async function HomeMatches() {
  await getCurrentTeam();
  const today = todayISO();
  const { next, last } = await getHomeMatches(today);

  return (
    <>
      <section>
        <SectionTitle>Próximo jogo</SectionTitle>
        {next ? (
          <GroupedList>
            <ListRow
              href={`/jogos/${next.id}`}
              marker
              title={next.opponent}
              meta={[
                formatCountdown(today, next.match_date),
                [formatDayShort(next.match_date), formatTime(next.kickoff_time)]
                  .filter(Boolean)
                  .join(", "),
                VENUE_LABEL[next.venue],
              ].join(" · ")}
            />
          </GroupedList>
        ) : (
          <EmptyState message="Não há jogos marcados. Adiciona o calendário da época em Jogos." />
        )}
      </section>

      {last && last.goals_for !== null && last.goals_against !== null && (
        <section>
          <SectionTitle>Último resultado</SectionTitle>
          <GroupedList>
            <ListRow
              href={`/jogos/${last.id}`}
              title={last.opponent}
              meta={`${formatDayShort(last.match_date)} · ${VENUE_LABEL[last.venue]}`}
              trailing={
                <span className="flex items-center gap-2 font-semibold">
                  <ResultBadge goalsFor={last.goals_for} goalsAgainst={last.goals_against} />
                  {formatScore(last.goals_for, last.goals_against)}
                </span>
              }
            />
          </GroupedList>
        </section>
      )}
    </>
  );
}

function HomeMatchesSkeleton() {
  return (
    <section aria-busy aria-label="A carregar o próximo jogo">
      <SectionTitle>Próximo jogo</SectionTitle>
      <Skeleton className="h-14 w-full" />
    </section>
  );
}
