import { z } from "zod";

/** O que todas as Server Actions devolvem. Erros esperados nunca fazem throw para o cliente. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

/** Converte um erro do Zod num resultado com erros por campo. */
export function fromZodError(error: z.ZodError): ActionResult<never> {
  const { fieldErrors } = z.flattenError(error);
  const clean: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length) clean[key] = messages as string[];
  }
  return fail("Há campos por corrigir.", clean);
}
