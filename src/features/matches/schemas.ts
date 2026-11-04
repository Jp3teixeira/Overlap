import { z } from "zod";
import {
  isoDate,
  optionalHttpsUrl,
  optionalText,
  optionalTime,
  requiredInt,
  requiredText,
} from "@/lib/schema-helpers";
import { MATCH_KINDS, MATCH_VENUES } from "./labels";

// Chaves = colunas de public.matches. team_id é posto no servidor.

export const matchSchema = z.object({
  match_date: isoDate,
  kickoff_time: optionalTime.default(null),
  opponent: requiredText(80, "Escreve o adversário."),
  kind: z.enum(MATCH_KINDS).default("oficial"),
  competition: optionalText(80).default(null),
  venue: z.enum(MATCH_VENUES).default("casa"),
  zerozero_url: optionalHttpsUrl.default(null),
  video_url: optionalHttpsUrl.default(null),
});

export type MatchInput = z.input<typeof matchSchema>;
export type MatchValues = z.output<typeof matchSchema>;

/** "Adicionar vários": uma linha por jornada. */
export const matchBulkSchema = z
  .array(
    matchSchema.pick({
      match_date: true,
      opponent: true,
      venue: true,
      kind: true,
      competition: true,
    }),
  )
  .min(1, "Adiciona pelo menos um jogo.")
  .max(40, "Máximo de 40 jogos de uma vez.");

/** Resultado: os dois golos ou nenhum (a BD também o garante). */
const goals = requiredInt(0, 99, "Golos entre 0 e 99.");
export const matchResultSchema = z.object({ goals_for: goals, goals_against: goals });

/** Análise pós-jogo em 3 campos. */
export const matchAnalysisSchema = z.object({
  went_well: optionalText(2000),
  went_badly: optionalText(2000),
  to_work_on: optionalText(2000),
  notes: optionalText(2000),
});
