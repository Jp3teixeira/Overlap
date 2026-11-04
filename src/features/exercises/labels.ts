// Tem de bater certo com o enum public.exercise_tag (migração 0001).
// Nova etiqueta = migração `alter type public.exercise_tag add value '...'` + linha aqui.

export const EXERCISE_TAGS = [
  "aquecimento",
  "guarda_redes",
  "passe_rececao",
  "conducao",
  "finalizacao",
  "duelo_1x1",
  "superioridade_inferioridade",
  "posse",
  "transicoes",
  "org_defensiva",
  "org_ofensiva",
  "bolas_paradas",
  "jogo_reduzido",
] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

export const TAG_LABEL: Record<ExerciseTag, string> = {
  aquecimento: "Aquecimento",
  guarda_redes: "Guarda-redes",
  passe_rececao: "Passe e receção",
  conducao: "Condução",
  finalizacao: "Finalização",
  duelo_1x1: "1x1",
  superioridade_inferioridade: "Superioridade/inferioridade",
  posse: "Posse de bola",
  transicoes: "Transições",
  org_defensiva: "Organização defensiva",
  org_ofensiva: "Organização ofensiva",
  bolas_paradas: "Bolas paradas",
  jogo_reduzido: "Jogo reduzido",
};

export const tagOptions = EXERCISE_TAGS.map((value) => ({ value, label: TAG_LABEL[value] }));
