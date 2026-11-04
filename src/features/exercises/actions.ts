"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { isOwnMediaPath } from "@/lib/media-path";
import { uuid } from "@/lib/schema-helpers";
import { removeMedia } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { variantName } from "./filters";
import { exerciseSchema, type ExerciseInput } from "./schemas";

// Mesmo padrão das outras actions: validar → equipa + permissão → query → refresh() → ActionResult.
// Nunca há "apagar": os exercícios arquivam-se (os treinos passados continuam a referi-los).

export async function createExercise(input: ExerciseInput): Promise<ActionResult<{ id: string }>> {
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ ...parsed.data, team_id: team.id })
    .select("id")
    .single();
  if (error) return dbFail("createExercise", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

/** Atenção: o schema repõe os campos opcionais a null se não vierem, por isso o formulário envia sempre todos. */
export async function updateExercise(id: string, input: ExerciseInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Exercício inválido.");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updateExercise", id, parsed.data);
}

/** Arquivar (true) ou reativar (false). */
export async function setExerciseArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Exercício inválido.");
  return updateRow("setExerciseArchived", id, { is_archived: archived });
}

/** Cria "Nome (variante)" com os mesmos dados (sem a imagem) para se editar a seguir. */
export async function duplicateExercise(id: string): Promise<ActionResult<{ id: string }>> {
  if (!uuid.safeParse(id).success) return fail("Exercício inválido.");

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data: original, error: readError } = await supabase
    .from("exercises")
    .select(
      "name, tags, description, objectives, min_players, max_players, duration_min, space, equipment, organization, rules, variants, coaching_points",
    )
    .eq("id", id)
    .eq("team_id", team.id)
    .single();
  if (readError) return dbFail("duplicateExercise/read", readError);

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      ...(original as { name: string }),
      name: variantName((original as { name: string }).name),
      team_id: team.id,
    })
    .select("id")
    .single();
  if (error) return dbFail("duplicateExercise", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

/** Associa ao exercício uma imagem que o browser acabou de enviar para o Storage. */
export async function setExerciseImage(id: string, path: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Exercício inválido.");
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);
  if (!isOwnMediaPath(path, team.id, "exercises", id)) {
    return fail("Imagem inválida. Tenta outra vez.");
  }
  return replaceImage("setExerciseImage", id, team.id, path);
}

export async function removeExerciseImage(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Exercício inválido.");
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);
  return replaceImage("removeExerciseImage", id, team.id, null);
}

async function replaceImage(
  where: string,
  id: string,
  teamId: string,
  path: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("exercises")
    .select("image_path")
    .eq("id", id)
    .eq("team_id", teamId)
    .maybeSingle();

  const { error } = await supabase
    .from("exercises")
    .update({ image_path: path })
    .eq("id", id)
    .eq("team_id", teamId)
    .select("id")
    .single();
  if (error) return dbFail(where, error);

  const old = (before as { image_path: string | null } | null)?.image_path;
  if (old && old !== path) await removeMedia(old);

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
    .from("exercises")
    .update(values)
    .eq("id", id)
    .eq("team_id", team.id)
    .select("id")
    .single();
  if (error) return dbFail(where, error);

  refresh();
  return ok();
}
