import { z } from "zod";
import { optionalInt, optionalText, requiredText, uniqueList } from "@/lib/schema-helpers";
import { diagramSchema } from "./diagram";
import { EXERCISE_TAGS } from "./labels";

// Chaves = colunas de public.exercises. team_id, created_by e image_path são postos no servidor.
// Obrigatório só nome + pelo menos uma etiqueta. `max_players`, `organization` e
// `coaching_points` existem na tabela mas a app já não os usa (migração 0002).

export const exerciseSchema = z.object({
  name: requiredText(80, "Dá um nome ao exercício."),
  tags: uniqueList(z.enum(EXERCISE_TAGS)).refine(
    (t) => t.length >= 1,
    "Escolhe pelo menos uma etiqueta.",
  ),
  diagram: diagramSchema,
  description: optionalText(2000).default(null),
  objectives: optionalText(1000).default(null),
  success_criteria: optionalText(1000).default(null),
  min_players: optionalInt(1, 40, "Entre 1 e 40 jogadores.").default(null),
  duration_min: optionalInt(1, 120, "Entre 1 e 120 minutos.").default(null),
  series: optionalInt(1, 20, "Entre 1 e 20 séries.").default(null),
  rest_seconds: optionalInt(0, 600, "Entre 0 e 600 segundos.").default(null),
  space: optionalText(80).default(null),
  equipment: optionalText(300).default(null),
  rules: optionalText(2000).default(null),
  variants: optionalText(2000).default(null),
});

export type ExerciseInput = z.input<typeof exerciseSchema>;
export type ExerciseValues = z.output<typeof exerciseSchema>;
