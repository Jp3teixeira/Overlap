"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { MinutesStepper } from "@/components/minutes-stepper";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formationLabel } from "@/features/exercises/diagram";
import { ExerciseThumb } from "@/features/exercises/components/exercise-thumb";
import { formatDuration } from "@/features/exercises/filters";
import { EXERCISE_TAGS, TAG_LABEL, type ExerciseTag } from "@/features/exercises/labels";
import type { ExerciseListItem } from "@/features/exercises/types";
import { runAction } from "@/lib/run-action";
import { addSessionItem } from "../actions";
import { suggestedMinutes } from "../minutes";

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Mode = "library" | "free";

/**
 * Juntar ao treino: um exercício da biblioteca (um toque, com os minutos sugeridos) ou um item livre.
 * A folha fica aberta para juntar vários seguidos.
 */
export function AddItemSheet({
  open,
  onOpenChange,
  sessionId,
  library,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  /** Exercícios ativos da biblioteca. */
  library: ExerciseListItem[];
}) {
  const [mode, setMode] = useState<Mode>("library");
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [added, setAdded] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [titleError, setTitleError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMode("library");
      setQuery("");
      setTags([]);
      setAdded({});
      setTitle("");
      setMinutes(10);
      setTitleError(undefined);
    }
  }

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return library.filter(
      (e) =>
        (tags.length === 0 || e.tags.some((t) => tags.includes(t))) &&
        (!q || normalize(e.name).includes(q)),
    );
  }, [library, query, tags]);

  function addExercise(e: ExerciseListItem) {
    startTransition(async () => {
      const result = await runAction<{ id: string }>(() =>
        addSessionItem({
          session_id: sessionId,
          exercise_id: e.id,
          custom_title: "",
          duration_min: suggestedMinutes(e.duration_min, e.series, e.rest_seconds),
          notes: "",
        }),
      );
      if (!result.ok) return void toast.error(result.error);
      setAdded((a) => ({ ...a, [e.id]: (a[e.id] ?? 0) + 1 }));
    });
  }

  function addFree() {
    startTransition(async () => {
      const result = await runAction<{ id: string }>(() =>
        addSessionItem({
          session_id: sessionId,
          exercise_id: "",
          custom_title: title,
          duration_min: minutes,
          notes: "",
        }),
      );
      if (!result.ok) {
        setTitleError(result.fieldErrors?.custom_title?.[0]);
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(`${title.trim()} adicionado`);
      setTitle("");
      setTitleError(undefined);
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar ao treino"
      footer={<Button onClick={() => onOpenChange(false)}>Concluído</Button>}
    >
      <div className="flex flex-col gap-4">
        <Segmented
          aria-label="Origem do item"
          options={[
            { value: "library" as const, label: "Da biblioteca" },
            { value: "free" as const, label: "Item livre" },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === "free" ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              addFree();
            }}
          >
            <Field
              label="Título"
              htmlFor="free-title"
              error={titleError}
              hint="Para o que não está na biblioteca: jogo final, roda inicial, alongamentos…"
            >
              <Input
                id="free-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Jogo final"
                maxLength={80}
                autoComplete="off"
                aria-invalid={titleError ? true : undefined}
              />
            </Field>
            <Field label="Minutos">
              <MinutesStepper label="Minutos do item" value={minutes} onChange={setMinutes} />
            </Field>
            <Button type="submit" variant="outline" disabled={pending}>
              <Plus />
              Adicionar item
            </Button>
          </form>
        ) : library.length === 0 ? (
          <EmptyState message="A biblioteca está vazia. Cria exercícios em Exercícios, ou junta um item livre." />
        ) : (
          <>
            <div className="relative">
              <Search
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar exercício"
                aria-label="Procurar exercício"
                className="pl-10"
              />
            </div>
            <div
              role="group"
              aria-label="Filtrar por etiqueta"
              className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 [&::-webkit-scrollbar]:hidden"
            >
              {EXERCISE_TAGS.map((t) => (
                <div key={t} className="shrink-0">
                  <Chip
                    selected={tags.includes(t)}
                    onClick={() =>
                      setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
                    }
                  >
                    {TAG_LABEL[t]}
                  </Chip>
                </div>
              ))}
            </div>

            {visible.length === 0 ? (
              <EmptyState message="Nenhum exercício encontrado. Experimenta tirar um filtro." />
            ) : (
              <ul className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border">
                {visible.map((e) => {
                  const meta = [
                    formationLabel(e.diagram),
                    formatDuration(e.duration_min, e.series),
                    e.tags.map((t) => TAG_LABEL[t]).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const count = added[e.id] ?? 0;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => addExercise(e)}
                        disabled={pending}
                        className="active:bg-muted focus-visible:bg-muted flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left outline-none disabled:opacity-60"
                      >
                        <ExerciseThumb diagram={e.diagram} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base leading-[22px] font-medium">
                            {e.name}
                          </span>
                          {meta && (
                            <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-[18px]">
                              {meta}
                            </span>
                          )}
                        </span>
                        {count > 0 ? (
                          <span className="text-result-win flex shrink-0 items-center gap-1 text-[13px] font-semibold">
                            <Check className="size-4" />
                            {count > 1 ? `×${count}` : "Adicionado"}
                          </span>
                        ) : (
                          <Plus aria-hidden className="text-primary size-5 shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
