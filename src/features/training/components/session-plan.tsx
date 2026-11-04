"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { MinutesStepper } from "@/components/minutes-stepper";
import { SectionTitle } from "@/components/page-header";
import { TimeBar } from "@/components/time-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ExerciseThumb } from "@/features/exercises/components/exercise-thumb";
import { formationLabel } from "@/features/exercises/diagram";
import { TAG_LABEL } from "@/features/exercises/labels";
import type { ExerciseListItem } from "@/features/exercises/types";
import { runAction } from "@/lib/run-action";
import { removeSessionItem, reorderItems, updateSessionItem } from "../actions";
import { mergeMaterial, targetNote } from "../minutes";
import type { SessionItemView } from "../types";
import { AddItemSheet } from "./add-item-sheet";

const SAVE_DELAY_MS = 500;

/**
 * O plano do treino: barra de tempo, exercícios numerados (minutos ±5, subir/descer, nota, tirar)
 * e o material que sai deles. Os minutos mudam logo no ecrã e gravam passado meio segundo.
 */
export function SessionPlan({
  sessionId,
  items,
  targetMin,
  library,
  canEdit,
}: {
  sessionId: string;
  items: SessionItemView[];
  targetMin: number | null;
  library: ExerciseListItem[];
  canEdit: boolean;
}) {
  const [local, setLocal] = useState(items);
  const [prev, setPrev] = useState(items);
  if (items !== prev) {
    setPrev(items);
    setLocal(items);
  }
  const latest = useRef(local);
  useEffect(() => {
    latest.current = local;
  }, [local]);

  const [adding, setAdding] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  async function save(id: string, patch: { duration_min?: number; notes?: string | null }) {
    const item = latest.current.find((i) => i.id === id);
    if (!item) return;
    const result = await runAction(() =>
      updateSessionItem(id, {
        duration_min: patch.duration_min ?? item.duration_min,
        notes: (patch.notes === undefined ? item.notes : patch.notes) ?? "",
      }),
    );
    if (!result.ok) {
      toast.error(result.error);
      setLocal(items);
    }
  }

  function changeMinutes(id: string, minutes: number) {
    setLocal((cur) => cur.map((i) => (i.id === id ? { ...i, duration_min: minutes } : i)));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => void save(id, { duration_min: minutes }), SAVE_DELAY_MS),
    );
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= local.length) return;
    const next = [...local];
    [next[index], next[target]] = [next[target], next[index]];
    setLocal(next);
    const result = await runAction(() =>
      reorderItems({ session_id: sessionId, item_ids: next.map((i) => i.id) }),
    );
    if (!result.ok) {
      toast.error(result.error);
      setLocal(items);
    }
  }

  async function remove(item: SessionItemView) {
    setLocal((cur) => cur.filter((i) => i.id !== item.id));
    const result = await runAction(() => removeSessionItem(item.id));
    if (!result.ok) {
      toast.error(result.error);
      setLocal(items);
      return;
    }
    toast.success("Tirado do treino");
  }

  function openNote(item: SessionItemView) {
    setNoteFor(item.id);
    setNoteText(item.notes ?? "");
  }

  async function saveNote(id: string) {
    const text = noteText.trim();
    setLocal((cur) => cur.map((i) => (i.id === id ? { ...i, notes: text || null } : i)));
    setNoteFor(null);
    await save(id, { notes: text || null });
  }

  const material = mergeMaterial(local.map((i) => i.exercise?.equipment));
  const total = local.reduce((sum, i) => sum + i.duration_min, 0);
  const note = targetNote(total, targetMin);

  return (
    <>
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <SectionTitle>Plano</SectionTitle>
          {canEdit && (
            <Button variant="outline" size="sm" className="-mt-2" onClick={() => setAdding(true)}>
              <Plus />
              Exercício
            </Button>
          )}
        </div>

        {local.length > 0 && (
          <div className="border-border bg-card mb-3 rounded-lg border px-4 py-3">
            <TimeBar items={local} targetMin={targetMin} />
            {note && (
              <p
                className={
                  total > (targetMin ?? Infinity)
                    ? "text-destructive mt-1.5 text-[13px] font-medium"
                    : "text-muted-foreground mt-1.5 text-[13px]"
                }
              >
                {note}
              </p>
            )}
          </div>
        )}

        {local.length === 0 ? (
          <EmptyState
            message="Ainda sem exercícios. Junta o primeiro da biblioteca: um toque e já entra com os minutos sugeridos."
            action={
              canEdit && (
                <Button onClick={() => setAdding(true)}>
                  <Plus />
                  Adicionar exercício
                </Button>
              )
            }
          />
        ) : (
          <ol className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border">
            {local.map((item, index) => {
              const ex = item.exercise;
              const title = ex?.name ?? item.custom_title ?? "Item";
              const meta = ex
                ? [
                    formationLabel(ex.diagram),
                    ex.tags
                      .slice(0, 2)
                      .map((t) => TAG_LABEL[t])
                      .join(", "),
                    ex.is_archived ? "Arquivado" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Item livre";
              return (
                <li
                  key={item.id}
                  className="border-l-4 px-3 py-3"
                  style={{ borderLeftColor: `var(--time-${(index % 4) + 1})` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4 shrink-0 text-center text-[13px] font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <ExerciseThumb diagram={ex?.diagram ?? null} />
                    <div className="min-w-0 flex-1">
                      {ex ? (
                        <Link
                          href={`/exercicios/${ex.id}?treino=${sessionId}`}
                          className="text-primary block truncate text-base leading-[22px] font-medium"
                        >
                          {title}
                        </Link>
                      ) : (
                        <span className="block truncate text-base leading-[22px] font-medium">
                          {title}
                        </span>
                      )}
                      <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-[18px]">
                        {meta}
                      </span>
                    </div>
                    {!canEdit && (
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                        {item.duration_min}′
                      </span>
                    )}
                  </div>

                  {canEdit && (
                    <div className="mt-2 flex items-center justify-between gap-2 pl-7">
                      <MinutesStepper
                        label={`Minutos de ${title}`}
                        value={item.duration_min}
                        onChange={(m) => changeMinutes(item.id, m)}
                      />
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Subir ${title}`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Descer ${title}`}
                          disabled={index === local.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Nota em ${title}`}
                          onClick={() => openNote(item)}
                        >
                          <MessageSquareText />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive size-10"
                          aria-label={`Tirar ${title} do treino`}
                          onClick={() => remove(item)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  )}

                  {noteFor === item.id ? (
                    <div className="mt-2 flex flex-col gap-2 pl-7">
                      <Textarea
                        autoFocus
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Nota para este treino (adaptações, o que pedir…)"
                        maxLength={500}
                        className="min-h-20"
                        aria-label={`Nota em ${title}`}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveNote(item.id)}>
                          Guardar nota
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setNoteFor(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    item.notes && (
                      <p className="text-muted-foreground mt-2 pl-7 text-[15px] leading-[22px] whitespace-pre-wrap">
                        {item.notes}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {material.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Material</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {material.map((m) => (
              <li
                key={m}
                className="border-border bg-card rounded-full border px-3 py-1 text-[15px]"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {canEdit && (
        <AddItemSheet
          open={adding}
          onOpenChange={setAdding}
          sessionId={sessionId}
          library={library}
        />
      )}
    </>
  );
}
