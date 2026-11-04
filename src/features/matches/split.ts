type SplittableMatch = {
  match_date: string;
  kickoff_time: string | null;
  goals_for: number | null;
};

/** Um jogo conta como "realizado" se tem resultado ou se a data já passou. */
export function isPlayed(m: SplittableMatch, today: string): boolean {
  return m.goals_for !== null || m.match_date < today;
}

/** Jogo que já devia ter sido jogado mas ainda não tem resultado registado. */
export function needsResult(m: SplittableMatch, today: string): boolean {
  return m.goals_for === null && m.match_date < today;
}

const byDateTime = (a: SplittableMatch, b: SplittableMatch) =>
  a.match_date === b.match_date
    ? (a.kickoff_time ?? "99:99").localeCompare(b.kickoff_time ?? "99:99")
    : a.match_date.localeCompare(b.match_date);

/** Próximos (do mais próximo para o mais distante) e realizados (do mais recente para o mais antigo). */
export function splitMatches<T extends SplittableMatch>(matches: T[], today: string) {
  const upcoming = matches.filter((m) => !isPlayed(m, today)).sort(byDateTime);
  const played = matches.filter((m) => isPlayed(m, today)).sort((a, b) => byDateTime(b, a));
  return { upcoming, played };
}
