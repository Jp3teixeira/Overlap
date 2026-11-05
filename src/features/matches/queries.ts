import "server-only";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { liveSchema, type LiveState } from "./live";
import type { MatchListItem, MatchObservationItem, MatchRow } from "./types";

// Leituras dos jogos. Ler cookies ⇒ chamar só dentro de um <Suspense>.

const LIST_COLUMNS =
  "id, match_date, kickoff_time, opponent, kind, competition, venue, goals_for, goals_against";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, went_well, went_badly, to_work_on, notes, zerozero_url, video_url`;

/** Todos os jogos (uma época tem à volta de 30). A separação em próximos/realizados é feita no cliente. */
export async function listMatches(): Promise<MatchListItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(LIST_COLUMNS)
    .eq("team_id", team.id)
    .order("match_date", { ascending: false });
  if (error) throw new Error(`listMatches: ${error.message}`);
  return (data ?? []) as MatchListItem[];
}

/** Ficha de um jogo. Id inválido, de outra equipa ou inexistente → 404. */
export async function getMatch(id: string): Promise<MatchRow> {
  if (!uuid.safeParse(id).success) notFound();
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();
  if (error) throw new Error(`getMatch: ${error.message}`);
  if (!data) notFound();
  return data as MatchRow;
}

/** Observações ligadas a um jogo, com o nome do jogador e do autor. */
export async function listMatchObservations(matchId: string): Promise<MatchObservationItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("player_observations")
    .select("id, body, author_id, player_id")
    .eq("team_id", team.id)
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listMatchObservations: ${error.message}`);
  const rows = (data ?? []) as {
    id: string;
    body: string;
    author_id: string | null;
    player_id: string;
  }[];
  if (rows.length === 0) return [];

  const playerIds = [...new Set(rows.map((r) => r.player_id))];
  const [players, members] = await Promise.all([
    supabase.from("players").select("id, name").eq("team_id", team.id).in("id", playerIds),
    supabase.from("team_members").select("user_id, display_name").eq("team_id", team.id),
  ]);
  if (players.error) throw new Error(`listMatchObservations/players: ${players.error.message}`);
  if (members.error) throw new Error(`listMatchObservations/members: ${members.error.message}`);

  const playerNames = new Map(
    ((players.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  );
  const authorNames = new Map(
    ((members.data ?? []) as { user_id: string; display_name: string }[]).map((m) => [
      m.user_id,
      m.display_name,
    ]),
  );

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    authorName: (r.author_id && authorNames.get(r.author_id)) || "Ex-membro",
    playerId: r.player_id,
    playerName: playerNames.get(r.player_id) ?? "Jogador",
  }));
}

/** Para o Início: o próximo jogo (hoje conta) e o último com resultado. */
export async function getHomeMatches(today: string): Promise<{
  next: MatchListItem | null;
  last: MatchListItem | null;
}> {
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const [next, last] = await Promise.all([
    supabase
      .from("matches")
      .select(LIST_COLUMNS)
      .eq("team_id", team.id)
      .gte("match_date", today)
      .is("goals_for", null)
      .order("match_date", { ascending: true })
      .order("kickoff_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("matches")
      .select(LIST_COLUMNS)
      .eq("team_id", team.id)
      .not("goals_for", "is", null)
      .order("match_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (next.error) throw new Error(`getHomeMatches/next: ${next.error.message}`);
  if (last.error) throw new Error(`getHomeMatches/last: ${last.error.message}`);

  return {
    next: (next.data as MatchListItem | null) ?? null,
    last: (last.data as MatchListItem | null) ?? null,
  };
}

/**
 * O jogo ao vivo guardado (ou null). Se a coluna ainda não existe (migração 0003 por correr)
 * devolve null em vez de partir a página do jogo.
 */
export async function getMatchLive(matchId: string): Promise<LiveState | null> {
  if (!uuid.safeParse(matchId).success) return null;
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("live")
    .eq("id", matchId)
    .eq("team_id", team.id)
    .maybeSingle();
  if (error) {
    if (error.code === "42703") return null;
    throw new Error(`getMatchLive: ${error.message}`);
  }
  const parsed = liveSchema.safeParse((data as { live: unknown } | null)?.live);
  return parsed.success ? parsed.data : null;
}
