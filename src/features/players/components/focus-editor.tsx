"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { updatePlayerFocus } from "../actions";

/** "Foco atual" editável no sítio: uma linha sobre o que o jogador está a trabalhar. */
export function FocusEditor({
  playerId,
  focus,
  canEdit,
}: {
  playerId: string;
  focus: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(focus ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await runAction(() => updatePlayerFocus(playerId, { current_focus: value }));
      if (!result.ok) {
        toast.error(result.fieldErrors?.current_focus?.[0] ?? result.error);
        return;
      }
      toast.success("Foco atualizado");
      setEditing(false);
    });
  }

  return (
    <section className="mb-6">
      <SectionTitle>Foco atual</SectionTitle>
      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={200}
            placeholder="Ex.: receber de costas e rodar"
            aria-label="Foco atual"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(focus ?? "");
                setEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : canEdit ? (
        <button
          type="button"
          onClick={() => {
            setValue(focus ?? "");
            setEditing(true);
          }}
          className="border-border bg-card active:bg-muted flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left"
        >
          <span className={focus ? "flex-1 text-base" : "text-muted-foreground flex-1 text-[15px]"}>
            {focus || "Sem foco definido. Toca para escrever."}
          </span>
          <Pencil aria-hidden className="text-muted-foreground size-4 shrink-0" />
        </button>
      ) : (
        <p className="text-base">{focus || "Sem foco definido."}</p>
      )}
    </section>
  );
}
