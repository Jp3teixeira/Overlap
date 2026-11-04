import { EXERCISE_TAGS, type ExerciseTag } from "./labels";

// Filtros da biblioteca, guardados nos search params do URL (?q=…&tags=posse,transicoes&arq=1).
// Funções puras, para testar sem browser nem base de dados.

export type ExerciseFilters = { q: string; tags: ExerciseTag[]; archived: boolean };

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

/** Lê os search params de forma segura: etiquetas inválidas desaparecem, texto fica aparado. */
export function parseFilters(params: { q?: Param; tags?: Param; arq?: Param }): ExerciseFilters {
  const wanted = (first(params.tags) ?? "").split(",");
  return {
    q: (first(params.q) ?? "").trim().slice(0, 80),
    tags: EXERCISE_TAGS.filter((t) => wanted.includes(t)),
    archived: first(params.arq) === "1",
  };
}

/** O inverso: "/exercicios?q=…". Sem filtros devolve só o caminho. */
export function filtersToUrl(f: ExerciseFilters): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.tags.length) sp.set("tags", f.tags.join(","));
  if (f.archived) sp.set("arq", "1");
  const qs = sp.toString();
  return qs ? `/exercicios?${qs}` : "/exercicios";
}

/**
 * Texto de pesquisa → padrão para `ilike`. Tira os caracteres que o PostgREST usa na
 * sintaxe de filtros (vírgulas, parênteses, * e \) e os que o LIKE trata como curingas (% e _),
 * para a pesquisa nunca partir nem dar resultados estranhos.
 */
export function searchPattern(q: string): string | null {
  const clean = q
    .replace(/[%_,()*\\"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean ? `%${clean}%` : null;
}

/** "6+" (mínimo de jogadores) ou "" se não há dados. */
export function formatPlayers(min: number | null): string {
  return min === null ? "" : `${min}+`;
}

/** "3 min × 3", "3 min", "3 séries" ou "" se não há dados. */
export function formatDuration(minutes: number | null, series: number | null): string {
  if (minutes !== null)
    return series && series > 1 ? `${minutes} min × ${series}` : `${minutes} min`;
  return series && series > 1 ? `${series} séries` : "";
}

/** "30 s", "1 min", "1 min 30 s" ou "" se não há dados. */
export function formatRest(seconds: number | null): string {
  if (seconds === null) return "";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

const VARIANT_SUFFIX = " (variante)";

/** Nome da cópia ao duplicar, sempre dentro do limite de 80 caracteres da base de dados. */
export function variantName(name: string): string {
  return `${name.slice(0, 80 - VARIANT_SUFFIX.length).trimEnd()}${VARIANT_SUFFIX}`;
}
