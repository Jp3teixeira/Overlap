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

/** Dias entre duas datas ISO (negativo se `iso` já passou). */
export function daysBetween(today: string, iso: string): number {
  return Math.round((parseISODate(iso).getTime() - parseISODate(today).getTime()) / 86_400_000);
}

/** "Hoje", "Amanhã", "Daqui a 5 dias". */
export function formatCountdown(today: string, iso: string): string {
  const days = daysBetween(today, iso);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days > 1) return `Daqui a ${days} dias`;
  return days === -1 ? "Ontem" : `Há ${-days} dias`;
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

/** Hora de parede em Lisboa como minutos "UTC" (só serve para subtrair duas horas de Lisboa). */
function lisbonWallMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) / 60_000;
}

/**
 * Tempo até um jogo à hora marcada: "2d 16h", "5h 20min" ou "40 min".
 * `null` se não houver hora ou se já começou (o chamador mostra então o texto simples).
 */
export function formatTimeUntil(
  iso: string,
  time: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const [y, mo, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, mo - 1, d, h, m) / 60_000;
  const diff = Math.floor(target - lisbonWallMinutes(now));
  if (diff <= 0) return null;
  const days = Math.floor(diff / 1440);
  const hours = Math.floor((diff % 1440) / 60);
  const minutes = diff % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
}
