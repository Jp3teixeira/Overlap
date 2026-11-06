"use server";

import { refresh } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { dbFail, NO_PERMISSION } from "@/lib/db-error";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { isEmptyBase, saveStatsBaseSchema, type SaveStatsBaseInput } from "./schemas";

/**
 * Guarda os valores de base de vários jogadores de uma vez (o formulário envia a lista toda).
 * Tudo a zeros apaga a base (null).
 */
export async function saveStatsBase(input: SaveStatsBaseInput): Promise<ActionResult> {
  const parsed = saveStatsBaseSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const team = await getCurrentTeam();
  if (!team.canEdit) return fail(NO_PERMISSION);

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.players.map(({ player_id, ...base }) =>
      supabase
        .from("players")
        .update({ stats_base: isEmptyBase(base) ? null : base })
        .eq("id", player_id)
        .eq("team_id", team.id)
        .select("id")
        .single(),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    if (failed.error.code === "42703") {
      return fail("Falta correr a migração 0004 no Supabase (coluna stats_base).");
    }
    return dbFail("saveStatsBase", failed.error);
  }

  refresh();
  return ok();
}
