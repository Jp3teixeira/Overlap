import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ClipboardList, MessageSquarePlus } from "lucide-react";
import { OverlapMark } from "@/components/overlap-mark";
import { TimeBar } from "@/components/time-bar";
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
import { getHomeSession } from "@/features/training/queries";
import {
  formatCountdown,
  formatDayLong,
  formatDayShort,
  formatTime,
  formatTimeUntil,
  todayISO,
} from "@/lib/dates";
import { getCurrentTeam } from "@/lib/team";

const tile = "h-auto flex-col gap-1 py-3 text-sm";
const card =
  "border-border bg-card active:bg-muted relative block overflow-hidden rounded-lg border p-4 outline-none focus-visible:bg-muted";
const marker = <span aria-hidden className="bg-marker absolute inset-y-0 left-0 w-[3px]" />;

// Início: próximo treino, próximo jogo, último resultado e 3 atalhos. Nada mais (F6.1).
export default function HomePage() {
  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-[26px] leading-[30px] font-[650] tracking-tight lg:hidden">
          <OverlapMark className="text-primary h-5 w-8" />
          Overlap
        </h1>
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
        <Suspense fallback={<HomeSessionSkeleton />}>
          <HomeSession />
        </Suspense>
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

/** Próximo treino: dia, hora, nº de exercícios e minutos planeados. Lê a sessão, por isso vive no <Suspense>. */
async function HomeSession() {
  await getCurrentTeam();
  const today = todayISO();
  const next = await getHomeSession(today);

  return (
    <section>
      <SectionTitle>Próximo treino</SectionTitle>
      {next ? (
        <Link href={`/treinos/${next.id}`} className={card}>
          {marker}
          <p className="text-base leading-[22px] font-medium">{formatDayLong(next.session_date)}</p>
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-[18px]">
            {[
              formatCountdown(today, next.session_date),
              formatTime(next.start_time),
              next.item_count > 0
                ? `${next.item_count} ${next.item_count === 1 ? "exercício" : "exercícios"}`
                : "Sem exercícios",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {next.item_count > 0 && (
            <TimeBar items={next.items} targetMin={next.target_duration_min} className="mt-3" />
          )}
        </Link>
      ) : (
        <EmptyState message="Ainda não há treinos planeados. Planeia o próximo em Treinos." />
      )}
    </section>
  );
}

function HomeSessionSkeleton() {
  return (
    <section aria-busy aria-label="A carregar o próximo treino">
      <SectionTitle>Próximo treino</SectionTitle>
      <Skeleton className="h-14 w-full" />
    </section>
  );
}

/** Próximo jogo e último resultado. Lê a sessão, por isso vive no <Suspense>. */
async function HomeMatches() {
  await getCurrentTeam();
  const today = todayISO();
  const { next, last } = await getHomeMatches(today);
  const until = next ? formatTimeUntil(next.match_date, next.kickoff_time) : null;

  return (
    <>
      <section>
        <SectionTitle>Próximo jogo</SectionTitle>
        {next ? (
          <Link href={`/jogos/${next.id}`} className={card}>
            {marker}
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg leading-6 font-semibold">{next.opponent}</p>
              <span className="bg-secondary text-secondary-foreground shrink-0 rounded-md px-2 py-0.5 text-[13px] font-medium">
                {VENUE_LABEL[next.venue]}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[13px] leading-[18px]">
              {[formatDayShort(next.match_date), formatTime(next.kickoff_time)]
                .filter(Boolean)
                .join(", ")}
            </p>
            {until ? (
              <p className="mt-3 text-[44px] leading-none font-[750] tracking-tight [font-stretch:88%] tabular-nums">
                {until}
              </p>
            ) : (
              <p className="mt-3 text-[28px] leading-none font-[750] tracking-tight [font-stretch:88%]">
                {formatCountdown(today, next.match_date)}
              </p>
            )}
          </Link>
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
