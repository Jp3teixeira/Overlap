"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { playerFocusSchema, playerSchema, type PlayerInput } from "./schemas";

// Padrão de todas as Server Actions do Overlap (ver AGENTS.md):
// 1. validar  2. equipa + permissão  3. query  4. refresh()  5. ActionResult

export async function createPlayer(input: PlayerInput): Promise<ActionResult<{ id: string }>> {
  const parsed = playerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ ...parsed.data, team_id: team.id })
    .select("id")
    .single();
  if (error) return dbFail("createPlayer", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogador inválido.");
  const parsed = playerSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updatePlayer", id, parsed.data);
}

export async function updatePlayerFocus(
  id: string,
  input: { current_focus: string },
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogador inválido.");
  const parsed = playerFocusSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updatePlayerFocus", id, parsed.data);
}

/** Arquivar (false) ou reativar (true). Jogadores nunca se apagam pela app. */
export async function setPlayerActive(id: string, isActive: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Jogador inválido.");
  return updateRow("setPlayerActive", id, { is_active: isActive });
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
    .from("players")
    .update(values)
    .eq("id", id)
    .eq("team_id", team.id)
    .select("id")
    .single();
  if (error) return dbFail(where, error);

  refresh();
  return ok();
}
