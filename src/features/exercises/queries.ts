import "server-only";
import { notFound } from "next/navigation";
import { uuid } from "@/lib/schema-helpers";
import { signMediaUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTeam } from "@/lib/team";
import { searchPattern, type ExerciseFilters } from "./filters";
import type { ExerciseListItem, ExerciseRow } from "./types";

// Leituras da biblioteca. Ler cookies ⇒ chamar só dentro de um <Suspense>.

const LIST_COLUMNS = "id, name, tags, duration_min, series, min_players, is_archived, diagram";
const DETAIL_COLUMNS = `${LIST_COLUMNS}, team_id, description, objectives, success_criteria, rest_seconds, space, equipment, rules, variants, image_path`;

/** Exercícios filtrados: texto (nome e descrição), etiquetas (qualquer uma) e arquivados. */
export async function listExercises(filters: ExerciseFilters): Promise<ExerciseListItem[]> {
  const team = await getCurrentTeam();
  const supabase = await createClient();

  let query = supabase
    .from("exercises")
    .select(LIST_COLUMNS)
    .eq("team_id", team.id)
    .eq("is_archived", filters.archived)
    .order("name", { ascending: true });

  if (filters.tags.length > 0) query = query.overlaps("tags", filters.tags);

  const pattern = searchPattern(filters.q);
  if (pattern) query = query.or(`name.ilike."${pattern}",description.ilike."${pattern}"`);

  const { data, error } = await query;
  if (error) throw new Error(`listExercises: ${error.message}`);
  return (data ?? []) as ExerciseListItem[];
}

/** Ficha de um exercício. Id inválido, de outra equipa ou inexistente → 404. */
export async function getExercise(id: string): Promise<ExerciseRow> {
  if (!uuid.safeParse(id).success) notFound();
  const team = await getCurrentTeam();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();
  if (error) throw new Error(`getExercise: ${error.message}`);
  if (!data) notFound();
  const row = data as Omit<ExerciseRow, "image_url">;
  const urls = await signMediaUrls(row.image_path ? [row.image_path] : []);
  return { ...row, image_url: row.image_path ? (urls.get(row.image_path) ?? null) : null };
}
