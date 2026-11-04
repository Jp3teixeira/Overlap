"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { SectionTitle } from "@/components/page-header";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { closeSession, setSessionStatus } from "../actions";
import type { SessionRow } from "../types";

/** Fecho do treino: marcar como realizado e registar o que aconteceu. */
export function SessionClose({ session, canEdit }: { session: SessionRow; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(session.post_notes ?? "");
  const [pending, startTransition] = useTransition();
  const done = session.status === "realizado";

  if (session.status === "cancelado") return null;
  if (!canEdit && !done) return null;

  function openSheet() {
    setText(session.post_notes ?? "");
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const result = await runAction(() => closeSession(session.id, { post_notes: text }));
      if (!result.ok) return void toast.error(result.error);
      toast.success(done ? "Nota guardada" : "Treino marcado como realizado");
      setOpen(false);
    });
  }

  function reopen() {
    startTransition(async () => {
      const result = await runAction(() => setSessionStatus(session.id, "planeado"));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Treino reaberto");
    });
  }

  return (
    <section className="mb-8">
      <SectionTitle>Depois do treino</SectionTitle>

      {done ? (
        <>
          {session.post_notes ? (
            <p className="text-[17px] leading-[25px] whitespace-pre-wrap">{session.post_notes}</p>
          ) : (
            <p className="text-muted-foreground text-[15px]">Realizado, sem notas.</p>
          )}
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openSheet}>
                Editar nota
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={reopen}
                disabled={pending}
              >
                Reabrir treino
              </Button>
            </div>
          )}
        </>
      ) : (
        <Button onClick={openSheet} className="w-full sm:w-auto">
          Marcar como realizado
        </Button>
      )}

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={done ? "Nota do treino" : "Fechar treino"}
        footer={
          <Button onClick={save} disabled={pending}>
            {pending ? "A guardar…" : done ? "Guardar nota" : "Marcar como realizado"}
          </Button>
        }
      >
        <Field
          label="O que aconteceu?"
          htmlFor="close-notes"
          hint="Opcional. O que correu bem, o que mudaste, quem faltou."
        >
          <Textarea
            id="close-notes"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            className="min-h-32"
          />
        </Field>
      </ResponsiveSheet>
    </section>
  );
}
