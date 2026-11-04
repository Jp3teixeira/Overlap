"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Copy, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, formatDayLong } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
import { deleteSession, duplicateSession, setSessionStatus } from "../actions";
import type { SessionRow } from "../types";

/** Duplicar (outra data), cancelar/reativar e apagar. Só para quem pode editar. */
export function SessionActions({ session, today }: { session: SessionRow; today: string }) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const [date, setDate] = useState(addDays(session.session_date, 7));
  const [dateError, setDateError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const cancelled = session.status === "cancelado";

  function openDuplicate() {
    // Sugere a mesma data da semana seguinte (ou a próxima que ainda não passou).
    const next = addDays(session.session_date, 7);
    setDate(next < today ? today : next);
    setDateError(undefined);
    setDuplicating(true);
  }

  function duplicate() {
    startTransition(async () => {
      const result = await runAction<{ id: string }>(() =>
        duplicateSession({ source_id: session.id, session_date: date }),
      );
      if (!result.ok) {
        setDateError(result.fieldErrors?.session_date?.[0]);
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(`Treino copiado para ${formatDayLong(date)}`);
      setDuplicating(false);
      router.push(`/treinos/${result.data.id}`);
    });
  }

  function toggleCancel() {
    startTransition(async () => {
      const result = await runAction(() =>
        setSessionStatus(session.id, cancelled ? "planeado" : "cancelado"),
      );
      if (!result.ok) return void toast.error(result.error);
      toast.success(cancelled ? "Treino reativado" : "Treino cancelado");
    });
  }

  function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const result = await runAction(() => deleteSession(session.id));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Treino apagado");
      router.push("/treinos");
    });
  }

  return (
    <div className="border-border flex flex-wrap gap-2 border-t pt-4">
      <Button variant="outline" size="sm" onClick={openDuplicate} disabled={pending}>
        <Copy />
        Duplicar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={toggleCancel}
        disabled={pending}
      >
        {cancelled ? <RotateCcw /> : <Ban />}
        {cancelled ? "Reativar" : "Cancelar treino"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={remove}
        disabled={pending}
        onBlur={() => setConfirmDelete(false)}
      >
        <Trash2 />
        {confirmDelete ? "Toca outra vez para apagar" : "Apagar"}
      </Button>

      <ResponsiveSheet
        open={duplicating}
        onOpenChange={setDuplicating}
        title="Duplicar treino"
        footer={
          <Button onClick={duplicate} disabled={pending}>
            {pending ? "A copiar…" : "Copiar treino"}
          </Button>
        }
      >
        <Field
          label="Nova data"
          htmlFor="dup-date"
          error={dateError}
          hint="Copia os exercícios, os minutos e as notas. Fica como planeado."
        >
          <Input
            id="dup-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={dateError ? true : undefined}
          />
        </Field>
      </ResponsiveSheet>
    </div>
  );
}
