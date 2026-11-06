import "server-only";
import { liveSchema, type LiveState } from "@/features/matches/live";
import { listPlayers } from "@/features/players/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { summarize, type StatsMatch, type StatsPlayer, type StatsSummary } from "./aggregate";
import { EMPTY_BASE, statsBaseSchema } from "./schemas";

// Leituras das estatísticas. Ler cookies ⇒ chamar só dentro de um <Suspense>.
// Tolera as colunas `matches.live` (0003) e `players.stats_base` (0004) ainda por criar.

const MISSING_COLUMN = "42703";

type MatchRow = Omit<StatsMatch, "live"> & { live?: unknown };

async function fetchMatches(teamId: string): Promise<StatsMatch[]> {
  const supabase = await createClient();
  const columns = "id, match_date, opponent, goals_for, goals_against";
  const withLive = await supabase.from("matches").select(`${columns}, live`).eq("team_id", teamId);
  let rows: unknown[];
  if (withLive.error?.code === MISSING_COLUMN) {
    const without = await supabase.from("matches").select(columns).eq("team_id", teamId);
    if (without.error) throw new Error(`stats/matches: ${without.error.message}`);
    rows = without.data ?? [];
  } else if (withLive.error) {
    throw new Error(`stats/matches: ${withLive.error.message}`);
  } else {
    rows = withLive.data ?? [];
  }
  return (rows as MatchRow[]).map((m) => {
    const parsed = m.live ? liveSchema.safeParse(m.live) : null;
    const live: LiveState | null = parsed?.success ? parsed.data : null;
    return { ...m, live };
  });
}

/** Jogadores com os seus valores de base (todos: ativos e arquivados). */
export async function listStatsPlayers(): Promise<StatsPlayer[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const [players, bases] = await Promise.all([
    listPlayers(),
    supabase.from("players").select("id, stats_base").eq("team_id", team.id),
  ]);
  if (bases.error && bases.error.code !== MISSING_COLUMN) {
    throw new Error(`stats/base: ${bases.error.message}`);
  }
  const baseById = new Map(
    ((bases.data ?? []) as unknown as { id: string; stats_base: unknown }[]).map((r) => {
      const parsed = statsBaseSchema.safeParse(r.stats_base);
      return [r.id, parsed.success ? parsed.data : EMPTY_BASE] as const;
    }),
  );
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    shirt_number: p.shirt_number,
    positions: p.positions,
    is_active: p.is_active,
    photo_url: p.photo_url,
    base: baseById.get(p.id) ?? EMPTY_BASE,
  }));
}

/** Tudo o que a página de estatísticas precisa. */
export async function getStats(): Promise<{ summary: StatsSummary; players: StatsPlayer[] }> {
  const team = await getCurrentTeam();
  const [matches, players] = await Promise.all([fetchMatches(team.id), listStatsPlayers()]);
  return { summary: summarize(matches, players), players };
}
