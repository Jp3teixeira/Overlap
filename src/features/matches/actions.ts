"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import {
  matchAnalysisSchema,
  matchBulkSchema,
  matchResultSchema,
  matchSchema,
  type MatchInput,
} from "./schemas";

// Mesmo padrão das actions do plantel: validar → equipa + permissão → query → refresh() → ActionResult.

export async function createMatch(input: MatchInput): Promise<ActionResult<{ id: string }>> {
  const parsed = matchSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({ ...parsed.data, team_id: team.id })
    .select("id")
    .single();
  if (error) return dbFail("createMatch", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

/** "Adicionar vários": o calendário da época de uma vez. Tudo ou nada. */
export async function createMatches(input: unknown): Promise<ActionResult<{ count: number }>> {
  const parsed = matchBulkSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Há campos por corrigir.");
  }

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .insert(parsed.data.map((m) => ({ ...m, team_id: team.id })));
  if (error) return dbFail("createMatches", error);

  refresh();
  return ok({ count: parsed.data.length });
}

/** Atenção: o schema repõe os links a null se não vierem, por isso o formulário envia sempre todos os campos. */
export async function updateMatch(id: string, input: MatchInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogo inválido.");
  const parsed = matchSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updateMatch", id, parsed.data);
}

export async function setMatchResult(
  id: string,
  input: { goals_for: number; goals_against: number },
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogo inválido.");
  const parsed = matchResultSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("setMatchResult", id, parsed.data);
}

/** Tirar o resultado (engano): volta a "ainda não jogado". */
export async function clearMatchResult(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogo inválido.");
  return updateRow("clearMatchResult", id, { goals_for: null, goals_against: null });
}

export async function saveMatchAnalysis(
  id: string,
  input: {
    went_well: string;
    went_badly: string;
    to_work_on: string;
    notes: string;
  },
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogo inválido.");
  const parsed = matchAnalysisSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("saveMatchAnalysis", id, parsed.data);
}

/** As observações ligadas ao jogo ficam guardadas (só perdem a ligação). */
export async function deleteMatch(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogo inválido.");

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", id)
    .eq("team_id", team.id)
    .select("id")
    .single();
  if (error) return dbFail("deleteMatch", error);

  refresh();
  return ok();
}

async function updateRow(
  where: string,
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update(values)
    .eq("id", id)
    .eq("team_id", team.id)
    .select("id")
    .single();
  if (error) return dbFail(where, error);

  refresh();
  return ok();
}
