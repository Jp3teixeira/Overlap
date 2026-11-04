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

/**
 * Formato de jogo da equipa. O Candal Sub-11 joga futebol de 7, que só tem
 * guarda-redes, defesa, médio e avançado. Laterais e extremos são de futebol de 11:
 * ficam na base de dados (enum), mas a app só os oferece se mudares isto para 11.
 */
export const FOOTBALL_FORMAT: 7 | 11 = 7;

const POSITIONS_BY_FORMAT: Record<7 | 11, readonly PlayerPosition[]> = {
  7: ["gr", "defesa", "medio", "avancado"],
  11: PLAYER_POSITIONS,
};

/** Posições a oferecer no formulário. Mantém as já escolhidas, para dados antigos continuarem editáveis. */
export function positionChoices(selected: readonly PlayerPosition[] = []) {
  const allowed = POSITIONS_BY_FORMAT[FOOTBALL_FORMAT];
  return PLAYER_POSITIONS.filter((p) => allowed.includes(p) || selected.includes(p)).map(
    (value) => ({ value, label: POSITION_LABEL[value] }),
  );
}

/** Grupos do plantel, pela ordem em que aparecem: GR → defesas → médios → avançados. */
export const POSITION_GROUPS = [
  { key: "gr", label: "Guarda-redes" },
  { key: "defesas", label: "Defesas" },
  { key: "medios", label: "Médios" },
  { key: "avancados", label: "Avançados" },
] as const;
export type PositionGroupKey = (typeof POSITION_GROUPS)[number]["key"];

const GROUP_OF: Record<PlayerPosition, PositionGroupKey> = {
  gr: "gr",
  defesa: "defesas",
  lateral: "defesas",
  medio: "medios",
  extremo: "avancados",
  avancado: "avancados",
};

/** Grupo onde o jogador aparece: o da posição principal (a primeira escolhida). Sem posição = null. */
export function primaryGroup(positions: readonly PlayerPosition[]): PositionGroupKey | null {
  return positions.length > 0 ? GROUP_OF[positions[0]] : null;
}
export const footOptions = DOMINANT_FEET.map((value) => ({ value, label: FOOT_LABEL[value] }));

/** "Extremo, médio" */
export function formatPositions(positions: readonly PlayerPosition[]): string {
  const text = positions.map((p) => POSITION_LABEL[p]).join(", ");
  return text ? text[0] + text.slice(1).toLowerCase() : "";
}
