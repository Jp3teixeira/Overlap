"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import {
  closeSessionSchema,
  duplicateSessionSchema,
  reorderSchema,
  sessionItemSchema,
  sessionItemUpdateSchema,
  sessionSchema,
  sessionStatusSchema,
  type SessionInput,
  type SessionItemInput,
  type SessionItemUpdateInput,
} from "./schemas";

// Mesmo padrão das outras actions: validar → equipa + permissão → query → refresh() → ActionResult.

export async function createSession(input: SessionInput): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({ ...parsed.data, team_id: team.id })
    .select("id")
    .single();
  if (error) return dbFail("createSession", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

/** Atenção: o schema repõe os opcionais a null se não vierem, por isso o formulário envia sempre todos. */
export async function updateSession(id: string, input: SessionInput): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Treino inválido.");
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updateSession", "training_sessions", id, parsed.data);
}

/** Planeado, realizado ou cancelado. */
export async function setSessionStatus(id: string, status: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Treino inválido.");
  const parsed = sessionStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Estado inválido.");
  return updateRow("setSessionStatus", "training_sessions", id, { status: parsed.data });
}

/** Fecho do treino: marca como realizado e guarda a nota do que aconteceu. */
export async function closeSession(
  id: string,
  input: { post_notes: string },
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Treino inválido.");
  const parsed = closeSessionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("closeSession", "training_sessions", id, {
    status: "realizado",
    post_notes: parsed.data.post_notes,
  });
}

/** Apaga o treino e os seus itens. As observações ligadas ficam guardadas (perdem só a ligação). */
export async function deleteSession(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Treino inválido.");
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_sessions")
    .delete()
    .eq("id", id)
    .eq("team_id", team.id);
  if (error) return dbFail("deleteSession", error);

  refresh();
  return ok();
}

/** Copia o treino (e os itens, com os minutos) para outra data. Fica sempre como "planeado". */
export async function duplicateSession(input: {
  source_id: string;
  session_date: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = duplicateSessionSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data: source, error: readError } = await supabase
    .from("training_sessions")
    .select("start_time, target_duration_min, objectives, expected_players, space, notes")
    .eq("id", parsed.data.source_id)
    .eq("team_id", team.id)
    .single();
  if (readError) return dbFail("duplicateSession/read", readError);

  const { data: created, error } = await supabase
    .from("training_sessions")
    .insert({
      ...(source as Record<string, unknown>),
      session_date: parsed.data.session_date,
      team_id: team.id,
    })
    .select("id")
    .single();
  if (error) return dbFail("duplicateSession", error);
  const newId = (created as { id: string }).id;

  const { data: items, error: itemsReadError } = await supabase
    .from("training_session_exercises")
    .select("exercise_id, custom_title, position, duration_min, notes")
    .eq("session_id", parsed.data.source_id)
    .eq("team_id", team.id);
  if (itemsReadError) {
    await supabase.from("training_sessions").delete().eq("id", newId).eq("team_id", team.id);
    return dbFail("duplicateSession/items", itemsReadError);
  }

  if ((items ?? []).length > 0) {
    const { error: insertError } = await supabase.from("training_session_exercises").insert(
      (items as Record<string, unknown>[]).map((i) => ({
        ...i,
        session_id: newId,
        team_id: team.id,
      })),
    );
    if (insertError) {
      // Tudo ou nada: não deixar um treino copiado sem os exercícios.
      await supabase.from("training_sessions").delete().eq("id", newId).eq("team_id", team.id);
      return dbFail("duplicateSession/insertItems", insertError);
    }
  }

  refresh();
  return ok({ id: newId });
}

/** Acrescenta um exercício (da biblioteca) ou um item livre ao fim do treino. */
export async function addSessionItem(
  input: SessionItemInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionItemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("training_session_exercises")
    .select("position")
    .eq("team_id", team.id)
    .eq("session_id", parsed.data.session_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = last ? (last as { position: number }).position + 1 : 0;

  const { data, error } = await supabase
    .from("training_session_exercises")
    .insert({ ...parsed.data, position, team_id: team.id })
    .select("id")
    .single();
  if (error) return dbFail("addSessionItem", error);

  refresh();
  return ok({ id: (data as { id: string }).id });
}

/** Minutos e nota de um item. O formulário envia sempre os dois. */
export async function updateSessionItem(
  itemId: string,
  input: SessionItemUpdateInput,
): Promise<ActionResult> {
  if (!uuid.safeParse(itemId).success) return fail("Item inválido.");
  const parsed = sessionItemUpdateSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  return updateRow("updateSessionItem", "training_session_exercises", itemId, parsed.data);
}

export async function removeSessionItem(itemId: string): Promise<ActionResult> {
  if (!uuid.safeParse(itemId).success) return fail("Item inválido.");
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_session_exercises")
    .delete()
    .eq("id", itemId)
    .eq("team_id", team.id);
  if (error) return dbFail("removeSessionItem", error);

  refresh();
  return ok();
}

/** Nova ordem dos itens (ids pela ordem pretendida), numa só chamada à função da base de dados. */
export async function reorderItems(input: {
  session_id: string;
  item_ids: string[];
}): Promise<ActionResult> {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return fail("Ordem inválida.");

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_session_items", {
    p_session_id: parsed.data.session_id,
    p_item_ids: parsed.data.item_ids,
  });
  if (error) return dbFail("reorderItems", error);

  refresh();
  return ok();
}

async function updateRow(
  where: string,
  table: "training_sessions" | "training_session_exercises",
  id: string,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update(values)
    .eq("id", id)
    .eq("team_id", team.id)
    .select("id")
    .single();
  if (error) return dbFail(where, error);

  refresh();
  return ok();
}
