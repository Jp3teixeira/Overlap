import "server-only";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import type { ObservationItem, TodayContext } from "./types";

type ObservationRow = {
  id: string;
  body: string;
  observed_on: string;
  author_id: string | null;
  training_session_id: string | null;
  match_id: string | null;
};

/** Cronologia de um jogador: mais recente primeiro, com autor e contexto (treino/jogo). */
export async function listPlayerObservations(playerId: string): Promise<ObservationItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const [obs, members] = await Promise.all([
    supabase
      .from("player_observations")
      .select("id, body, observed_on, author_id, training_session_id, match_id")
      .eq("team_id", team.id)
      .eq("player_id", playerId)
      .order("observed_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("user_id, display_name").eq("team_id", team.id),
  ]);
  if (obs.error) throw new Error(`listPlayerObservations: ${obs.error.message}`);
  if (members.error) throw new Error(`listPlayerObservations/members: ${members.error.message}`);

  const rows = (obs.data ?? []) as ObservationRow[];
  const names = new Map(
    ((members.data ?? []) as { user_id: string; display_name: string }[]).map((m) => [
      m.user_id,
      m.display_name,
    ]),
  );

  // Adversários dos jogos referidos (uma query, sem joins para não depender de nomes de FKs).
  const matchIds = [...new Set(rows.map((r) => r.match_id).filter((v): v is string => !!v))];
  const opponents = new Map<string, string>();
  if (matchIds.length) {
    const { data, error } = await supabase
      .from("matches")
      .select("id, opponent")
      .eq("team_id", team.id)
      .in("id", matchIds);
    if (error) throw new Error(`listPlayerObservations/matches: ${error.message}`);
    for (const m of (data ?? []) as { id: string; opponent: string }[])
      opponents.set(m.id, m.opponent);
  }

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    observed_on: r.observed_on,
    authorName: (r.author_id && names.get(r.author_id)) || "Ex-membro",
    context: r.match_id
      ? `vs ${opponents.get(r.match_id) ?? "jogo"}`
      : r.training_session_id
        ? "no treino"
        : null,
    isMine: r.author_id === team.userId,
  }));
}

/** Há treino ou jogo hoje? A observação rápida liga-se a ele automaticamente. */
export async function getTodayContext(): Promise<TodayContext> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const today = todayISO();

  const [session, match] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id")
      .eq("team_id", team.id)
      .eq("session_date", today)
      .neq("status", "cancelado")
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id, opponent")
      .eq("team_id", team.id)
      .eq("match_date", today)
      .order("kickoff_time", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (session.error) throw new Error(`getTodayContext/session: ${session.error.message}`);
  if (match.error) throw new Error(`getTodayContext/match: ${match.error.message}`);

  return {
    sessionId: (session.data as { id: string } | null)?.id ?? null,
    match: (match.data as { id: string; opponent: string } | null) ?? null,
  };
}
