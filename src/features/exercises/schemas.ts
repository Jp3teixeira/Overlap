import { z } from "zod";
import { optionalInt, optionalText, requiredText, uniqueList } from "@/lib/schema-helpers";
import { EXERCISE_TAGS } from "./labels";

// Chaves = colunas de public.exercises. team_id, created_by e image_path são postos no servidor.
// Obrigatório só nome + pelo menos uma etiqueta; o resto vive em "Mais detalhes".

const players = optionalInt(1, 40, "Entre 1 e 40 jogadores.");

export const exerciseSchema = z
  .object({
    name: requiredText(80, "Dá um nome ao exercício."),
    tags: uniqueList(z.enum(EXERCISE_TAGS)).refine(
      (t) => t.length >= 1,
      "Escolhe pelo menos uma etiqueta.",
    ),
    description: optionalText(2000).default(null),
    objectives: optionalText(1000).default(null),
    min_players: players.default(null),
    max_players: players.default(null),
    duration_min: optionalInt(1, 120, "Entre 1 e 120 minutos.").default(null),
    space: optionalText(80).default(null),
    equipment: optionalText(300).default(null),
    organization: optionalText(2000).default(null),
    rules: optionalText(2000).default(null),
    variants: optionalText(2000).default(null),
    coaching_points: optionalText(2000).default(null),
  })
  .refine((e) => e.min_players == null || e.max_players == null || e.min_players <= e.max_players, {
    path: ["max_players"],
    error: "O máximo não pode ser menor que o mínimo.",
  });

export type ExerciseInput = z.input<typeof exerciseSchema>;
export type ExerciseValues = z.output<typeof exerciseSchema>;
