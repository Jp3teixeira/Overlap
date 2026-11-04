import "server-only";
import { fail } from "./action-result";

type DbError = { message: string; code?: string };

/** Erro da BD → mensagem útil em PT-PT. O detalhe técnico fica só no log do servidor. */
export function dbFail(where: string, error: DbError) {
  console.error(`[db] ${where}:`, error.code, error.message);
  if (error.code === "42501") return fail("Não tens permissão para fazer isto.");
  if (error.code === "PGRST116") return fail("Este registo já não existe ou não tens acesso.");
  if (error.code === "23514") return fail("Há valores fora dos limites. Revê o formulário.");
  return fail("Não foi possível guardar. Tenta outra vez.");
}

export const NO_PERMISSION = "A tua conta só pode consultar, não pode alterar.";
