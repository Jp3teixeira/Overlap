"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { observationEditSchema, observationSchema, type ObservationInput } from "./schemas";

export async function createObservation(input: ObservationInput): Promise<ActionResult> {
  const parsed = observationSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  // A FK composta (player_id, team_id) garante que o jogador é desta equipa.
  const { error } = await supabase
    .from("player_observations")
    .insert({ ...parsed.data, team_id: team.id, author_id: team.userId });
  if (error) {
    if (error.code === "23503") return fail("Esse jogador, treino ou jogo já não existe.");
    return dbFail("createObservation", error);
  }

  refresh();
  return ok();
}

/** Cada treinador só edita e apaga as suas observações. */
export async function updateObservation(
  id: string,
  input: { body: string },
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Observação inválida.");
  const parsed = observationEditSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_observations")
    .update(parsed.data)
    .eq("id", id)
    .eq("team_id", team.id)
    .eq("author_id", team.userId)
    .select("id")
    .single();
  if (error) return dbFail("updateObservation", error);

  refresh();
  return ok();
}

export async function deleteObservation(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Observação inválida.");

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_observations")
    .delete()
    .eq("id", id)
    .eq("team_id", team.id)
    .eq("author_id", team.userId)
    .select("id")
    .single();
  if (error) return dbFail("deleteObservation", error);

  refresh();
  return ok();
}
