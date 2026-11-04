"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDayShort } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
import { deleteObservation, updateObservation } from "../actions";
import type { ObservationItem } from "../types";

/** Cronologia de observações. Cada um edita e apaga as suas. */
export function ObservationTimeline({ items }: { items: ObservationItem[] }) {
  const [editing, setEditing] = useState<ObservationItem | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState message="Ainda não há observações. Depois do próximo treino, regista a primeira." />
    );
  }

  return (
    <>
      <ol className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border">
        {items.map((o) => {
          const meta = [formatDayShort(o.observed_on), o.authorName, o.context]
            .filter(Boolean)
            .join(", ");
          const content = (
            <>
              <p className="text-muted-foreground flex items-center gap-2 text-[13px] leading-[18px]">
                <span className="flex-1">{meta}</span>
                {o.isMine && <Pencil aria-hidden className="size-3.5" />}
              </p>
              <p className="mt-1 text-[15px] leading-[22px] whitespace-pre-wrap">{o.body}</p>
            </>
          );
          return (
            <li key={o.id}>
              {o.isMine ? (
                <button
                  type="button"
                  onClick={() => setEditing(o)}
                  aria-label={`Editar observação de ${formatDayShort(o.observed_on)}`}
                  className="active:bg-muted focus-visible:bg-muted w-full px-4 py-3 text-left outline-none"
                >
                  {content}
                </button>
              ) : (
                <div className="px-4 py-3">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      <EditObservationSheet item={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function EditObservationSheet({
  item,
  onClose,
}: {
  item: ObservationItem | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState(item?.body ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const [currentId, setCurrentId] = useState(item?.id);
  if (item?.id !== currentId) {
    setCurrentId(item?.id);
    setBody(item?.body ?? "");
    setConfirmDelete(false);
  }

  function save() {
    if (!item) return;
    startTransition(async () => {
      const result = await runAction(() => updateObservation(item.id, { body }));
      if (!result.ok) return void toast.error(result.fieldErrors?.body?.[0] ?? result.error);
      toast.success("Observação guardada");
      onClose();
    });
  }

  function remove() {
    if (!item) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => {
      const result = await runAction(() => deleteObservation(item.id));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Observação apagada");
      onClose();
    });
  }

  return (
    <ResponsiveSheet
      open={item !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Editar observação"
      description={item ? formatDayShort(item.observed_on) : undefined}
      footer={
        <>
          <Button onClick={save} disabled={pending || !body.trim()}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={remove} disabled={pending}>
            {confirmDelete ? "Toca outra vez para apagar" : "Apagar observação"}
          </Button>
        </>
      }
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        aria-label="Observação"
        className="min-h-32"
      />
    </ResponsiveSheet>
  );
}
