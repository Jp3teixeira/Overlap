// Têm de bater certo com os enums public.player_position e public.dominant_foot (migração 0001).

export const PLAYER_POSITIONS = [
  "gr",
  "defesa",
  "lateral",
  "medio",
  "extremo",
  "avancado",
] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const POSITION_LABEL: Record<PlayerPosition, string> = {
  gr: "Guarda-redes",
  defesa: "Defesa",
  lateral: "Lateral",
  medio: "Médio",
  extremo: "Extremo",
  avancado: "Avançado",
};

export const DOMINANT_FEET = ["direito", "esquerdo", "ambos"] as const;
export type DominantFoot = (typeof DOMINANT_FEET)[number];

export const FOOT_LABEL: Record<DominantFoot, string> = {
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambos: "Ambos",
};

export const positionOptions = PLAYER_POSITIONS.map((value) => ({
  value,
  label: POSITION_LABEL[value],
}));
export const footOptions = DOMINANT_FEET.map((value) => ({ value, label: FOOT_LABEL[value] }));

/** "Extremo, médio" */
export function formatPositions(positions: readonly PlayerPosition[]): string {
  const text = positions.map((p) => POSITION_LABEL[p]).join(", ");
  return text ? text[0] + text.slice(1).toLowerCase() : "";
}
