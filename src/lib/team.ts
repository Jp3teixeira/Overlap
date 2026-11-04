import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Data Access Layer: quem está autenticado e em que equipa.
 * Chamar no início de qualquer query ou Server Action. Lê cookies, por isso
 * (com cacheComponents) só dentro de um componente que esteja num <Suspense>.
 */

const teamRowSchema = z.object({
  role: z.enum(["owner", "coach", "staff"]),
  display_name: z.string(),
  team: z.object({ id: z.uuid(), name: z.string() }),
});

export type CurrentTeam = {
  id: string;
  name: string;
  role: "owner" | "coach" | "staff";
  displayName: string;
  canEdit: boolean;
  userId: string;
};

/** Converte a linha de team_members (com a equipa) no objeto que a app usa. */
export function toCurrentTeam(row: unknown, userId: string): CurrentTeam | null {
  const parsed = teamRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const { role, display_name, team } = parsed.data;
  return {
    id: team.id,
    name: team.name,
    role,
    displayName: display_name,
    canEdit: role === "owner" || role === "coach",
    userId,
  };
}

/** Id do utilizador autenticado (verificado). Sem sessão → /login. */
export async function getUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) redirect("/login");
  return sub;
}

/** Equipa do utilizador. Sem sessão → /login. Sem equipa → /sem-acesso. */
export async function getCurrentTeam(): Promise<CurrentTeam> {
  const userId = await getUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_members")
    .select("role, display_name, team:teams(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível ler a equipa: ${error.message}`);
  const team = data ? toCurrentTeam(data, userId) : null;
  if (!team) redirect("/sem-acesso");
  return team;
}
