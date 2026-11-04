import { z } from "zod";
import { isoDate, optionalUuid, uuid } from "@/lib/schema-helpers";

// Chaves = colunas de public.player_observations. author_id e team_id são postos no servidor.

export const observationSchema = z.object({
  player_id: uuid,
  body: z
    .string({ error: "Escreve a observação." })
    .trim()
    .min(1, "Escreve a observação.")
    .max(2000, "Máximo de 2000 caracteres."),
  observed_on: isoDate.optional(),
  training_session_id: optionalUuid.default(null),
  match_id: optionalUuid.default(null),
});

export type ObservationInput = z.input<typeof observationSchema>;
export type ObservationValues = z.output<typeof observationSchema>;

export const observationEditSchema = observationSchema.pick({ body: true });
