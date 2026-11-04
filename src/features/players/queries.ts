import "server-only";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { signMediaUrls } from "@/lib/storage";
import { getCurrentTeam } from "@/lib/team";
import { sortPlayersByPosition } from "./grouping";
import type { PlayerListItem, PlayerOption, PlayerRow } from "./types";

// Leituras do plantel. Ler cookies ⇒ chamar só dentro de um <Suspense>.
// O filtro por team_id é redundante com a RLS de propósito (preparado para várias equipas).

const DETAIL_COLUMNS =
  "id, team_id, name, shirt_number, birth_year, positions, dominant_foot, current_focus, photo_path, is_active";

type ListRow = Omit<PlayerListItem, "photo_url"> & { photo_path: string | null };

/** Linhas do plantel (ativos e arquivados), por número e depois por nome. Sem URLs de fotos. */
async function fetchPlayers(): Promise<ListRow[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, name, shirt_number, positions, is_active, photo_path")
    .eq("team_id", team.id)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`listPlayers: ${error.message}`);
  return (data ?? []) as ListRow[];
}

/** Todos os jogadores, com URL assinado da foto (um só pedido ao Storage para todos). */
export async function listPlayers(): Promise<PlayerListItem[]> {
  const rows = await fetchPlayers();
  const urls = await signMediaUrls(rows.flatMap((p) => (p.photo_path ? [p.photo_path] : [])));
  return rows.map(({ photo_path, ...p }) => ({
    ...p,
    photo_url: photo_path ? (urls.get(photo_path) ?? null) : null,
  }));
}

/** Só os ativos, no formato mínimo para escolher um jogador. Não assina fotos. */
export async function listPlayerOptions(): Promise<PlayerOption[]> {
  const rows = await fetchPlayers();
  return sortPlayersByPosition(rows.filter((p) => p.is_active)).map(
    ({ id, name, shirt_number }) => ({ id, name, shirt_number }),
  );
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
  const row = data as Omit<PlayerRow, "photo_url">;
  const urls = await signMediaUrls(row.photo_path ? [row.photo_path] : []);
  return { ...row, photo_url: row.photo_path ? (urls.get(row.photo_path) ?? null) : null };
}
