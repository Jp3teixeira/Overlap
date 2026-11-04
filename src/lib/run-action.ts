"use client";

import type { ActionResult } from "./action-result";

/**
 * Chama uma Server Action sem rebentar a UI se a ligação falhar
 * (rede em baixo no campo, servidor sem configuração, etc.).
 */
export async function runAction<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (e) {
    // Os redirects do Next (ex.: sessão expirada → /login) têm de continuar a propagar.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      String(e.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error(e);
    return { ok: false, error: "Sem ligação. Verifica a rede e tenta outra vez." };
  }
}
