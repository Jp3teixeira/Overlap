import { z } from "zod";

// Desenho do campo de um exercício (coluna `exercises.diagram`, jsonb).
// Coordenadas em unidades do próprio campo (ver FIELD_SIZE), com origem no canto superior esquerdo.
// Funções puras: nada aqui depende do browser, para o editor e a vista de leitura partilharem tudo.

export const FIELD_TYPES = ["campo", "meio", "quadrado"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** Futebol de 7: campo 60x40 m (10 unidades por metro), meio campo 30x40, quadrado 20x20 (escala 20). */
export const FIELD_SIZE: Record<FieldType, { w: number; h: number }> = {
  campo: { w: 600, h: 400 },
  meio: { w: 300, h: 400 },
  quadrado: { w: 400, h: 400 },
};

export const FIELD_LABEL: Record<FieldType, string> = {
  campo: "Campo todo",
  meio: "Meio campo",
  quadrado: "Quadrado",
};

/** Raio de um jogador, escolhido para ter ~10 px num telemóvel em qualquer tipo de campo. */
export const PIECE_RADIUS: Record<FieldType, number> = { campo: 16, meio: 9, quadrado: 11 };

export const PIECE_KINDS = ["a", "b", "n", "gk", "cone", "goal", "ball"] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export const ARROW_KINDS = ["pass", "run", "dribble"] as const;
export type ArrowKind = (typeof ARROW_KINDS)[number];

export const PIECE_LABEL: Record<PieceKind, string> = {
  a: "Equipa A",
  b: "Equipa B",
  n: "Neutro",
  gk: "GR",
  cone: "Cone",
  goal: "Baliza",
  ball: "Bola",
};

export const ARROW_LABEL: Record<ArrowKind, string> = {
  pass: "Passe",
  run: "Desmarcação",
  dribble: "Condução",
};

// Cores da ilustração (o campo é um desenho, não faz parte dos tokens da interface).
export const PIECE_FILL: Record<PieceKind, string> = {
  a: "#2f7be5",
  b: "#f08a24",
  n: "#f2cf3a",
  gk: "#111827",
  cone: "#f59e0b",
  goal: "#ffffff",
  ball: "#ffffff",
};

const coord = z.number().min(0).max(1000);
const id = z.string().min(1).max(16);

const pieceSchema = z.object({
  id,
  kind: z.enum(PIECE_KINDS),
  x: coord,
  y: coord,
  /** Ângulo em graus (0-359). Só a baliza roda. */
  r: z.number().min(0).max(359).optional(),
});

const arrowSchema = z.object({
  id,
  kind: z.enum(ARROW_KINDS),
  x1: coord,
  y1: coord,
  x2: coord,
  y2: coord,
});

const zoneSchema = z.object({ id, x: coord, y: coord, w: coord, h: coord });

export const diagramSchema = z
  .object({
    v: z.literal(1),
    field: z.enum(FIELD_TYPES),
    pieces: z.array(pieceSchema).max(40, "Peças a mais no campo."),
    arrows: z.array(arrowSchema).max(30, "Setas a mais no campo."),
    zones: z.array(zoneSchema).max(6, "Zonas a mais no campo."),
  })
  .nullable()
  .default(null);

export type Diagram = NonNullable<z.output<typeof diagramSchema>>;
export type Piece = Diagram["pieces"][number];
export type Arrow = Diagram["arrows"][number];
export type Zone = Diagram["zones"][number];

export function emptyDiagram(field: FieldType): Diagram {
  return { v: 1, field, pieces: [], arrows: [], zones: [] };
}

export function isDiagramEmpty(d: Diagram | null): boolean {
  return !d || (d.pieces.length === 0 && d.arrows.length === 0 && d.zones.length === 0);
}

export const newId = () => Math.random().toString(36).slice(2, 10);

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Mantém um ponto dentro do campo. */
export function clampToField(field: FieldType, x: number, y: number): { x: number; y: number } {
  const { w, h } = FIELD_SIZE[field];
  return { x: clamp(x, 0, w), y: clamp(y, 0, h) };
}

/** Muda o tipo de campo e puxa para dentro tudo o que ficou de fora. */
export function changeField(d: Diagram, field: FieldType): Diagram {
  const { w, h } = FIELD_SIZE[field];
  const cx = (n: number) => clamp(n, 0, w);
  const cy = (n: number) => clamp(n, 0, h);
  return {
    ...d,
    field,
    pieces: d.pieces.map((p) => ({ ...p, x: cx(p.x), y: cy(p.y) })),
    arrows: d.arrows.map((a) => ({ ...a, x1: cx(a.x1), x2: cx(a.x2), y1: cy(a.y1), y2: cy(a.y2) })),
    zones: d.zones.map((z) => {
      const x = cx(z.x);
      const y = cy(z.y);
      return { ...z, x, y, w: Math.min(z.w, w - x), h: Math.min(z.h, h - y) };
    }),
  };
}

/** "3 vs 3" (ou "3 vs 3 + 2" com neutros) quando há as duas equipas; senão null. */
export function formationLabel(d: Diagram | null): string | null {
  if (!d) return null;
  const count = (k: PieceKind) => d.pieces.filter((p) => p.kind === k).length;
  const a = count("a");
  const b = count("b");
  const n = count("n");
  if (a === 0 || b === 0) return null;
  return `${a} vs ${b}${n > 0 ? ` + ${n}` : ""}`;
}

/** O que existe no desenho, para a legenda da vista de leitura. */
export function usedKinds(d: Diagram): {
  pieces: PieceKind[];
  arrows: ArrowKind[];
  zones: boolean;
} {
  return {
    pieces: PIECE_KINDS.filter((k) => d.pieces.some((p) => p.kind === k)),
    arrows: ARROW_KINDS.filter((k) => d.arrows.some((a) => a.kind === k)),
    zones: d.zones.length > 0,
  };
}

/**
 * Geometria de uma seta: linha (reta, ou ondulada na condução) + ponta triangular.
 * `k` escala espessuras e pontas com o tamanho do campo. Seta sem comprimento → null.
 */
export function arrowGeometry(
  a: Pick<Arrow, "kind" | "x1" | "y1" | "x2" | "y2">,
  k: number,
): { line: string; head: string } | null {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const headLen = Math.min(16 * k, len / 2);
  const halfW = 7 * k;
  const baseX = a.x2 - ux * headLen;
  const baseY = a.y2 - uy * headLen;
  const f = (n: number) => Math.round(n * 100) / 100;

  const head = [
    `${f(a.x2)},${f(a.y2)}`,
    `${f(baseX + px * halfW)},${f(baseY + py * halfW)}`,
    `${f(baseX - px * halfW)},${f(baseY - py * halfW)}`,
  ].join(" ");

  const bodyLen = len - headLen * 0.8;
  if (a.kind !== "dribble") {
    const ex = a.x1 + ux * bodyLen;
    const ey = a.y1 + uy * bodyLen;
    return { line: `M${f(a.x1)} ${f(a.y1)} L${f(ex)} ${f(ey)}`, head };
  }

  // Condução: onda sinusoidal ao longo da direção.
  const step = 3 * k;
  const wave = 9 * k;
  const amp = 4 * k;
  const pts: string[] = [];
  for (let t = 0; t <= bodyLen; t += step) {
    const off = Math.sin((t / wave) * Math.PI * 2) * amp;
    pts.push(`${f(a.x1 + ux * t + px * off)} ${f(a.y1 + uy * t + py * off)}`);
  }
  return { line: `M${pts.join(" L")}`, head };
}
