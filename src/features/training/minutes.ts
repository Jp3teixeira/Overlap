export type TimedItem = { id: string; duration_min: number };

export type TimeSegment = {
  id: string;
  /** Largura em % da barra. */
  widthPct: number;
  /** 1–4: tom de navy pela ordem do treino. */
  tone: 1 | 2 | 3 | 4;
};

export function sumMinutes(items: readonly TimedItem[]): number {
  return items.reduce((total, item) => total + item.duration_min, 0);
}

/**
 * Segmentos da barra de tempo. A barra representa o maior entre o alvo e o total,
 * por isso um treino abaixo do alvo deixa espaço vazio e um acima do alvo enche a barra.
 */
export function timeBarSegments(items: readonly TimedItem[], targetMin?: number | null) {
  const total = sumMinutes(items);
  const scale = Math.max(total, targetMin ?? 0);
  const segments: TimeSegment[] =
    scale === 0
      ? []
      : items.map((item, i) => ({
          id: item.id,
          widthPct: (item.duration_min / scale) * 100,
          tone: ((i % 4) + 1) as TimeSegment["tone"],
        }));
  return {
    total,
    target: targetMin ?? null,
    overBy: targetMin ? Math.max(0, total - targetMin) : 0,
    segments,
  };
}

/** Minutos de um exercício novo no treino: duração × séries + descansos entre séries (arredondado). */
export function suggestedMinutes(
  durationMin: number | null,
  series: number | null,
  restSeconds: number | null,
): number {
  if (!durationMin) return 10;
  const n = series && series > 1 ? series : 1;
  const total = durationMin * n + (restSeconds ? ((n - 1) * restSeconds) / 60 : 0);
  return Math.min(120, Math.max(1, Math.round(total)));
}

/** "Faltam 15 min", "Passa 10 min" ou "No alvo", para a barra de tempo. */
export function targetNote(total: number, target: number | null): string | null {
  if (!target || total === 0) return null;
  if (total === target) return "No alvo";
  return total < target ? `Faltam ${target - total} min` : `Passa ${total - target} min`;
}

/**
 * Junta o material (texto livre, "8 cones, 2 mini-balizas e coletes") de vários exercícios
 * numa lista sem repetidos. O mesmo material com quantidades diferentes fica com a maior.
 */
export function mergeMaterial(texts: readonly (string | null | undefined)[]): string[] {
  const found = new Map<string, { name: string; qty: number | null }>();
  for (const text of texts) {
    if (!text) continue;
    for (const part of text.split(/,|;|\se\s|\n/)) {
      const raw = part.trim().replace(/\.$/, "");
      if (!raw) continue;
      const m = raw.match(/^(\d+)\s*x?\s+(.+)$/i);
      const qty = m ? Number(m[1]) : null;
      const name = (m ? m[2] : raw).trim();
      const key = name.toLowerCase();
      const prev = found.get(key);
      if (!prev) found.set(key, { name, qty });
      else if (qty !== null && (prev.qty === null || qty > prev.qty)) prev.qty = qty;
    }
  }
  return [...found.values()].map((x) => (x.qty !== null ? `${x.qty} ${x.name}` : x.name));
}
