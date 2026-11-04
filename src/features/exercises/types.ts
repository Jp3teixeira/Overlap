import type { ExerciseTag } from "./labels";

// Escritos à mão a partir da migração 0001 (tabela public.exercises).

export type ExerciseListItem = {
  id: string;
  name: string;
  tags: ExerciseTag[];
  duration_min: number | null;
  min_players: number | null;
  max_players: number | null;
  is_archived: boolean;
};

export type ExerciseRow = ExerciseListItem & {
  team_id: string;
  description: string | null;
  objectives: string | null;
  space: string | null;
  equipment: string | null;
  organization: string | null;
  rules: string | null;
  variants: string | null;
  coaching_points: string | null;
  image_path: string | null;
  /** URL assinado (1 h) da imagem, gerado no servidor. Nulo sem imagem. */
  image_url: string | null;
};
