import { z } from "zod";
import { optionalInt, optionalText, requiredText, uniqueList } from "@/lib/schema-helpers";
import { DOMINANT_FEET, PLAYER_POSITIONS } from "./labels";

// Chaves = colunas de public.players (snake_case), para ir direto para o insert/update.
// team_id não vem do formulário: é posto pela Server Action a partir de getCurrentTeam().

export const playerSchema = z.object({
  name: requiredText(60, "Escreve o nome do jogador."),
  shirt_number: optionalInt(1, 99, "O número tem de estar entre 1 e 99."),
  birth_year: optionalInt(2000, 2100, "Ano de nascimento inválido."),
  positions: uniqueList(z.enum(PLAYER_POSITIONS)).default([]),
  dominant_foot: z
    .preprocess((v) => (v === "" ? null : v), z.enum(DOMINANT_FEET).nullable())
    .default(null),
  current_focus: optionalText(200),
});

export type PlayerInput = z.input<typeof playerSchema>;
export type PlayerValues = z.output<typeof playerSchema>;

/** Só o foco atual (edição no sítio, na ficha). */
export const playerFocusSchema = playerSchema.pick({ current_focus: true });
