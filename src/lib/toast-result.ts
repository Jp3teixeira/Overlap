"use client";

import { toast } from "sonner";
import type { ActionResult } from "./action-result";

/** Mostra o toast certo para o resultado de uma Server Action. Devolve se correu bem. */
export function toastResult<T>(result: ActionResult<T>, successMessage: string): boolean {
  if (result.ok) {
    toast.success(successMessage);
    return true;
  }
  toast.error(result.error);
  return false;
}
