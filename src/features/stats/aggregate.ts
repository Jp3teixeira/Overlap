import { resultOf } from "@/components/result-badge";
import {
  convocados,
  goals,
  playerSeconds,
  teamStats,
  type LiveState,
  type Side,
  type TeamStats,
} from "@/features/matches/live";
import type { PlayerPosition } from "@/features/players/labels";
import { EMPTY_BASE, type StatsBase } from "./schemas";

// Soma tudo o que está guardado: resultados de todos os jogos, jogo ao vivo dos jogos terminados
// e os valores de base de cada jogador. Funções puras: não tocam na BD.

export type StatsMatch = {
  id: string;
  match_date: string;
  opponent: string;
  goals_for: number | null;
  goals_against: number | null;
  live: LiveState | null;
};

export type StatsPlayer = {
  id: string;
  name: string;
  shirt_number: number | null;
  positions: PlayerPosition[];
  is_active: boolean;
  photo_url: string | null;
  base: StatsBase;
};

export type Form = "V" | "E" | "D";
type Pair = Record<Side, number>;

export type TeamSummary = {
  /** Jogos com resultado. */
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Últimos resultados, do mais antigo para o mais recente (máx. 5). */
  form: Form[];
  /** Jogos registados ao vivo e terminados. */
  liveGames: number;
  /** Médias por jogo registado ao vivo (null sem nenhum). */
  averages: TeamStats | null;
};

export type PlayerLine = {
  id: string;
  games: number;
  /** Segundos em campo (jogo ao vivo + base). */
  seconds: number;
  goals: number;
  assists: number;
};

export type StatsSummary = {
  team: TeamSummary;
  players: PlayerLine[];
  /** Jogos ao vivo começados e ainda não terminados: não contam até serem terminados. */
  pending: { id: string; opponent: string }[];
};

const STAT_KEYS = ["shots", "onTarget", "corner", "foul", "turnover", "recovery"] as const;
const zero = (): Pair => ({ us: 0, them: 0 });

export function summarize(matches: StatsMatch[], players: StatsPlayer[]): StatsSummary {
  // --- Equipa
  const withResult = matches
    .filter((m) => m.goals_for !== null && m.goals_against !== null)
    .sort(
      (a, b) => a.match_date.localeCompare(b.match_date) || a.id.localeCompare(b.id),
    ) as (StatsMatch & { goals_for: number; goals_against: number })[];

  const team: TeamSummary = {
    played: withResult.length,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    form: [],
    liveGames: 0,
    averages: null,
  };
  for (const m of withResult) {
    const r = resultOf(m.goals_for, m.goals_against);
    if (r === "V") team.wins += 1;
    else if (r === "E") team.draws += 1;
    else team.losses += 1;
    team.goalsFor += m.goals_for;
    team.goalsAgainst += m.goals_against;
  }
  team.form = withResult.slice(-5).map((m) => resultOf(m.goals_for, m.goals_against));

  // --- Jogos ao vivo terminados
  const finished = matches.flatMap((m) => (m.live?.status === "finished" ? [m.live] : []));
  const pending = matches.flatMap((m) =>
    m.live && ["running", "paused", "halftime"].includes(m.live.status)
      ? [{ id: m.id, opponent: m.opponent }]
      : [],
  );
  team.liveGames = finished.length;

  if (finished.length > 0) {
    const sums: TeamStats = {
      shots: zero(),
      onTarget: zero(),
      corner: zero(),
      foul: zero(),
      turnover: zero(),
      recovery: zero(),
    };
    for (const live of finished) {
      const s = teamStats(live);
      for (const k of STAT_KEYS) {
        sums[k].us += s[k].us;
        sums[k].them += s[k].them;
      }
    }
    for (const k of STAT_KEYS) {
      sums[k].us /= finished.length;
      sums[k].them /= finished.length;
    }
    team.averages = sums;
  }

  // --- Jogadores
  const lines = new Map<string, PlayerLine>(
    players.map((p) => [
      p.id,
      {
        id: p.id,
        games: p.base.games,
        seconds: p.base.minutes * 60,
        goals: p.base.goals,
        assists: p.base.assists,
      },
    ]),
  );
  for (const live of finished) {
    const seconds = playerSeconds(live, 0);
    for (const id of convocados(live)) {
      const line = lines.get(id);
      if (!line) continue;
      line.games += 1;
      line.seconds += seconds[id] ?? 0;
    }
    for (const g of goals(live)) {
      if (g.side !== "us") continue;
      const scorer = g.playerId ? lines.get(g.playerId) : undefined;
      if (scorer) scorer.goals += 1;
      const assister = g.assistId ? lines.get(g.assistId) : undefined;
      if (assister) assister.assists += 1;
    }
  }

  return { team, players: [...lines.values()], pending };
}

export const baseOf = (b: StatsBase | null | undefined): StatsBase => b ?? EMPTY_BASE;

/** Minutos arredondados ao mais próximo. */
export const toMinutes = (seconds: number) => Math.round(seconds / 60);

/** Minutos por jogo (0 sem jogos). */
export const minutesPerGame = (line: Pick<PlayerLine, "games" | "seconds">) =>
  line.games > 0 ? Math.round(line.seconds / 60 / line.games) : 0;
