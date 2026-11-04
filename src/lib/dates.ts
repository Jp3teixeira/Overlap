/**
 * Datas da app: colunas `date` (YYYY-MM-DD, sem hora nem fuso), mostradas em pt-PT.
 * Os nomes de dias e meses estão escritos à mão de propósito: o Intl varia entre
 * Node e browsers ("qui." vs "quinta"), o que dava diferenças entre servidor e cliente.
 */

const TZ = "Europe/Lisbon";
const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** Data de hoje em Lisboa, no formato das colunas `date`. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Soma (ou subtrai) dias a uma data ISO: ("2026-11-08", 7) → "2026-11-15". */
export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "qua, 4 nov" */
export function formatDayShort(iso: string): string {
  const date = parseISODate(iso);
  return `${WEEKDAY_SHORT[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_SHORT[date.getUTCMonth()]}`;
}

/** "Quarta, 4 nov" (cabeçalhos de treino/jogo). */
export function formatDayLong(iso: string): string {
  const date = parseISODate(iso);
  return `${WEEKDAY_LONG[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTH_SHORT[date.getUTCMonth()]}`;
}

/** "19:15:00" → "19:15" */
export function formatTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

/** Época desportiva (julho a junho): "2026-11-08" → "2026/27". */
export function seasonOf(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const start = m >= 7 ? y : y - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}
