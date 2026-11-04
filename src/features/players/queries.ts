import "server-only";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import type { PlayerListItem, PlayerOption, PlayerRow } from "./types";

// Leituras do plantel. Ler cookies ⇒ chamar só dentro de um <Suspense>.
// O filtro por team_id é redundante com a RLS de propósito (preparado para várias equipas).

const DETAIL_COLUMNS =
  "id, name, shirt_number, birth_year, positions, dominant_foot, current_focus, photo_path, is_active";

/** Todos os jogadores (ativos e arquivados), por número e depois por nome. */
export async function listPlayers(): Promise<PlayerListItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, name, shirt_number, positions, is_active")
    .eq("team_id", team.id)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`listPlayers: ${error.message}`);
  return (data ?? []) as PlayerListItem[];
}

/** Só os ativos, no formato mínimo para escolher um jogador. */
export async function listPlayerOptions(): Promise<PlayerOption[]> {
  const players = await listPlayers();
  return players
    .filter((p) => p.is_active)
    .map(({ id, name, shirt_number }) => ({ id, name, shirt_number }));
}

/** Ficha de um jogador. Id inválido, de outra equipa ou inexistente → 404. */
export async function getPlayer(id: string): Promise<PlayerRow> {
  if (!uuid.safeParse(id).success) notFound();
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();
  if (error) throw new Error(`getPlayer: ${error.message}`);
  if (!data) notFound();
  return data as PlayerRow;
}
