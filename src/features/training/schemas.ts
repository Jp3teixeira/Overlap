import { z } from "zod";
import { SESSION_STATUSES } from "./labels";
import {
  isoDate,
  optionalInt,
  optionalText,
  optionalTime,
  optionalUuid,
  requiredInt,
  uuid,
} from "@/lib/schema-helpers";

// Chaves = colunas de public.training_sessions e public.training_session_exercises.
// team_id e created_by são postos no servidor.

export const sessionSchema = z.object({
  session_date: isoDate,
  start_time: optionalTime.default(null),
  target_duration_min: optionalInt(1, 240, "Entre 1 e 240 minutos.").default(null),
  objectives: optionalText(500).default(null),
  expected_players: optionalInt(1, 40, "Entre 1 e 40 jogadores.").default(null),
  space: optionalText(80).default(null),
  notes: optionalText(2000).default(null),
});

export type SessionInput = z.input<typeof sessionSchema>;
export type SessionValues = z.output<typeof sessionSchema>;

/** Item do treino: da biblioteca (exercise_id) ou livre (custom_title). */
export const sessionItemSchema = z
  .object({
    session_id: uuid,
    exercise_id: optionalUuid.default(null),
    custom_title: optionalText(80).default(null),
    duration_min: requiredInt(1, 120, "Entre 1 e 120 minutos."),
    notes: optionalText(500).default(null),
  })
  .refine((i) => i.exercise_id !== null || i.custom_title !== null, {
    path: ["custom_title"],
    error: "Escolhe um exercício ou escreve um título.",
  });

export type SessionItemInput = z.input<typeof sessionItemSchema>;

/** Nova ordem dos itens (ids pela ordem que aparecem). */
export const reorderSchema = z.object({
  session_id: uuid,
  item_ids: z.array(uuid).min(1),
});

/** Fecho do treino. */
export const closeSessionSchema = z.object({
  post_notes: optionalText(2000),
});

/** Duplicar um treino para outra data. */
export const duplicateSessionSchema = z.object({
  source_id: uuid,
  session_date: isoDate,
});

/** Alterar um item já no treino: minutos e nota. */
export const sessionItemUpdateSchema = z.object({
  duration_min: requiredInt(1, 120, "Entre 1 e 120 minutos."),
  notes: optionalText(500).default(null),
});
export type SessionItemUpdateInput = z.input<typeof sessionItemUpdateSchema>;

export const sessionStatusSchema = z.enum(SESSION_STATUSES, { error: "Estado inválido." });
