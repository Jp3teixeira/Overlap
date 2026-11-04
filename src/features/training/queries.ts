import "server-only";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/schema-helpers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import type { TimedItem } from "./minutes";
import type {
  ItemExercise,
  SessionItemView,
  SessionListItem,
  SessionObservationItem,
  SessionRow,
} from "./types";

// Leituras dos treinos. Ler cookies ⇒ chamar só dentro de um <Suspense>.

const LIST_COLUMNS = "id, session_date, start_time, target_duration_min, objectives, status";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, expected_players, space, notes, post_notes`;

type ListRow = Omit<SessionListItem, "total_min" | "item_count">;

/** Soma e contagem dos itens por treino (em lotes, para o URL do `in` não crescer sem limite). */
async function itemTotals(teamId: string, sessionIds: string[]) {
  const supabase = await createClient();
  const totals = new Map<string, { total_min: number; item_count: number }>();
  const chunks: string[][] = [];
  for (let i = 0; i < sessionIds.length; i += 50) chunks.push(sessionIds.slice(i, i + 50));

  const results = await Promise.all(
    chunks.map((ids) =>
      supabase
        .from("training_session_exercises")
        .select("session_id, duration_min")
        .eq("team_id", teamId)
        .in("session_id", ids),
    ),
  );
  for (const { data, error } of results) {
    if (error) throw new Error(`itemTotals: ${error.message}`);
    for (const r of (data ?? []) as { session_id: string; duration_min: number }[]) {
      const t = totals.get(r.session_id) ?? { total_min: 0, item_count: 0 };
      t.total_min += r.duration_min;
      t.item_count += 1;
      totals.set(r.session_id, t);
    }
  }
  return totals;
}

const withTotals = (
  rows: ListRow[],
  totals: Map<string, { total_min: number; item_count: number }>,
) => rows.map((r) => ({ ...r, ...(totals.get(r.id) ?? { total_min: 0, item_count: 0 }) }));

/** Todos os treinos (os 300 mais recentes). A separação em próximos/histórico é feita no cliente. */
export async function listSessions(): Promise<SessionListItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .select(LIST_COLUMNS)
    .eq("team_id", team.id)
    .order("session_date", { ascending: false })
    .limit(300);
  if (error) throw new Error(`listSessions: ${error.message}`);
  const rows = (data ?? []) as ListRow[];
  return withTotals(
    rows,
    await itemTotals(
      team.id,
      rows.map((r) => r.id),
    ),
  );
}

/** Treino com os seus itens, já com os dados dos exercícios. Id inválido ou de outra equipa → 404. */
export async function getSession(
  id: string,
): Promise<{ session: SessionRow; items: SessionItemView[] }> {
  if (!uuid.safeParse(id).success) notFound();
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const [sessionRes, itemsRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .eq("team_id", team.id)
      .maybeSingle(),
    supabase
      .from("training_session_exercises")
      .select("id, position, duration_min, notes, custom_title, exercise_id")
      .eq("team_id", team.id)
      .eq("session_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (sessionRes.error) throw new Error(`getSession: ${sessionRes.error.message}`);
  if (itemsRes.error) throw new Error(`getSession/items: ${itemsRes.error.message}`);
  if (!sessionRes.data) notFound();

  const rows = (itemsRes.data ?? []) as {
    id: string;
    position: number;
    duration_min: number;
    notes: string | null;
    custom_title: string | null;
    exercise_id: string | null;
  }[];

  const exerciseIds = [...new Set(rows.map((r) => r.exercise_id).filter((v): v is string => !!v))];
  const exercises = new Map<string, ItemExercise>();
  if (exerciseIds.length) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, tags, diagram, equipment, is_archived")
      .eq("team_id", team.id)
      .in("id", exerciseIds);
    if (error) throw new Error(`getSession/exercises: ${error.message}`);
    for (const e of (data ?? []) as ItemExercise[]) exercises.set(e.id, e);
  }

  return {
    session: sessionRes.data as SessionRow,
    items: rows.map((r) => ({
      id: r.id,
      position: r.position,
      duration_min: r.duration_min,
      notes: r.notes,
      custom_title: r.custom_title,
      exercise: (r.exercise_id && exercises.get(r.exercise_id)) || null,
    })),
  };
}

/** Observações ligadas a um treino, com o nome do jogador e do autor. */
export async function listSessionObservations(
  sessionId: string,
): Promise<SessionObservationItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("player_observations")
    .select("id, body, author_id, player_id")
    .eq("team_id", team.id)
    .eq("training_session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listSessionObservations: ${error.message}`);
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
  if (players.error) throw new Error(`listSessionObservations/players: ${players.error.message}`);
  if (members.error) throw new Error(`listSessionObservations/members: ${members.error.message}`);

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

/** Para o Início: o próximo treino planeado (hoje conta). */
export async function getHomeSession(
  today: string,
): Promise<(SessionListItem & { items: TimedItem[] }) | null> {
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_sessions")
    .select(LIST_COLUMNS)
    .eq("team_id", team.id)
    .eq("status", "planeado")
    .gte("session_date", today)
    .order("session_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getHomeSession: ${error.message}`);
  if (!data) return null;
  const row = data as ListRow;
  const { data: items, error: itemsError } = await supabase
    .from("training_session_exercises")
    .select("id, duration_min")
    .eq("team_id", team.id)
    .eq("session_id", row.id)
    .order("position", { ascending: true });
  if (itemsError) throw new Error(`getHomeSession items: ${itemsError.message}`);
  const timed = (items ?? []) as TimedItem[];
  return {
    ...row,
    total_min: timed.reduce((sum, i) => sum + i.duration_min, 0),
    item_count: timed.length,
    items: timed,
  };
}
