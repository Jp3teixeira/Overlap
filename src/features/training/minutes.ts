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
