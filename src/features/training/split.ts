import type { SessionStatus } from "./labels";

type SplittableSession = { session_date: string; start_time: string | null; status: SessionStatus };

/** Treino planeado cuja data já passou e ainda não foi fechado. */
export function needsClosing(s: SplittableSession, today: string): boolean {
  return s.status === "planeado" && s.session_date < today;
}

const byDateTime = (a: SplittableSession, b: SplittableSession) =>
  a.session_date === b.session_date
    ? (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99")
    : a.session_date.localeCompare(b.session_date);

/**
 * Próximos: planeados de hoje em diante (do mais próximo para o mais distante).
 * Histórico: o resto, do mais recente para o mais antigo.
 */
export function splitSessions<T extends SplittableSession>(sessions: T[], today: string) {
  const upcoming = sessions
    .filter((s) => s.status === "planeado" && s.session_date >= today)
    .sort(byDateTime);
  const history = sessions
    .filter((s) => !(s.status === "planeado" && s.session_date >= today))
    .sort((a, b) => byDateTime(b, a));
  return { upcoming, history };
}
