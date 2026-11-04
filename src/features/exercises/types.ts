import type { Diagram } from "./diagram";
import type { ExerciseTag } from "./labels";

// Escritos à mão a partir das migrações 0001 e 0002 (tabela public.exercises).

export type ExerciseListItem = {
  id: string;
  name: string;
  tags: ExerciseTag[];
  duration_min: number | null;
  series: number | null;
  min_players: number | null;
  is_archived: boolean;
  diagram: Diagram | null;
};

export type ExerciseRow = ExerciseListItem & {
  team_id: string;
  description: string | null;
  objectives: string | null;
  success_criteria: string | null;
  rest_seconds: number | null;
  space: string | null;
  equipment: string | null;
  rules: string | null;
  variants: string | null;
  image_path: string | null;
  /** URL assinado (1 h) da imagem, gerado no servidor. Nulo sem imagem. */
  image_url: string | null;
};
