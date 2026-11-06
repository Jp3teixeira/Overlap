import { z } from "zod";
import { uuid } from "@/lib/schema-helpers";

const count = (max: number) =>
  z
    .number({ error: "Número inválido." })
    .int("Número inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(max, `Máximo ${max}.`);

/** Valores de antes da app, por jogador (coluna `players.stats_base`). */
export const statsBaseSchema = z.object({
  games: count(200),
  minutes: count(20_000),
  goals: count(500),
  assists: count(500),
});
export type StatsBase = z.infer<typeof statsBaseSchema>;

export const EMPTY_BASE: StatsBase = { games: 0, minutes: 0, goals: 0, assists: 0 };

export const isEmptyBase = (b: StatsBase) =>
  b.games === 0 && b.minutes === 0 && b.goals === 0 && b.assists === 0;

/** O que o formulário envia: uma linha por jogador. */
export const saveStatsBaseSchema = z.object({
  players: z
    .array(z.object({ player_id: uuid, ...statsBaseSchema.shape }))
    .max(60)
    .refine((rows) => new Set(rows.map((r) => r.player_id)).size === rows.length, {
      message: "Jogador repetido.",
    }),
});
export type SaveStatsBaseInput = z.infer<typeof saveStatsBaseSchema>;
