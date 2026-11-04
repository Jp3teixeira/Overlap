"use server";

import { redirect } from "next/navigation";
import { fail, fromZodError, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "./schemas";

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // 400 = credenciais erradas. O resto (rede, Supabase em baixo) é outro problema.
    return fail(
      error.status === 400
        ? "Email ou password errados."
        : "Não foi possível entrar. Verifica a ligação e tenta outra vez.",
    );
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
