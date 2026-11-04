"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filtersToUrl, formatPlayers, type ExerciseFilters } from "../filters";
import { EXERCISE_TAGS, TAG_LABEL, type ExerciseTag } from "../labels";
import type { ExerciseListItem } from "../types";
import { ExerciseSheet } from "./exercise-sheet";

/**
 * Biblioteca: pesquisa + etiquetas. Os filtros vivem no URL (a lista vem já filtrada do
 * servidor); o texto escrito é local e só vai para o URL passado um instante.
 */
export function ExerciseBrowser({
  exercises,
  filters,
  canEdit,
  hasAny,
}: {
  exercises: ExerciseListItem[];
  filters: ExerciseFilters;
  canEdit: boolean;
  /** Existe pelo menos um exercício não arquivado na equipa (distingue "vazio" de "sem resultados"). */
  hasAny: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(filters.q);
  const [creating, setCreating] = useState(false);
  const { q, archived } = filters;
  const tagsKey = filters.tags.join(",");

  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => {
      const tags = EXERCISE_TAGS.filter((x) => tagsKey.split(",").includes(x));
      router.replace(filtersToUrl({ q: text, tags, archived }), { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [text, q, tagsKey, archived, router]);

  function go(next: Partial<ExerciseFilters>) {
    router.replace(filtersToUrl({ ...filters, q: text, ...next }), { scroll: false });
  }

  function toggleTag(tag: ExerciseTag) {
    go({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    });
  }

  const filtering = Boolean(filters.q || filters.tags.length);

  return (
    <>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Procurar exercício"
            aria-label="Procurar exercício"
            className="pl-10"
          />
        </div>
        {canEdit && (
          <Button className="hidden lg:inline-flex" onClick={() => setCreating(true)}>
            <Plus />
            Novo exercício
          </Button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filtrar por etiqueta"
        className="-mx-4 mb-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {EXERCISE_TAGS.map((tag) => (
          <div key={tag} className="shrink-0">
            <Chip selected={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
              {TAG_LABEL[tag]}
            </Chip>
          </div>
        ))}
      </div>

      {exercises.length === 0 ? (
        !hasAny && !filters.archived && !filtering ? (
          <EmptyState
            message="A biblioteca está vazia. Adiciona o primeiro exercício: só precisas do nome e de uma etiqueta."
            action={
              canEdit && (
                <Button onClick={() => setCreating(true)}>
                  <Plus />
                  Novo exercício
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            message={
              filters.archived
                ? "Não há exercícios arquivados."
                : "Nenhum exercício encontrado. Experimenta tirar um filtro."
            }
          />
        )
      ) : (
        <GroupedList>
          {exercises.map((e) => {
            const meta = [
              e.tags.map((t) => TAG_LABEL[t]).join(", "),
              e.duration_min ? `${e.duration_min} min` : "",
              formatPlayers(e.min_players, e.max_players)
                ? `${formatPlayers(e.min_players, e.max_players)} jog.`
                : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return <ListRow key={e.id} href={`/exercicios/${e.id}`} title={e.name} meta={meta} />;
          })}
        </GroupedList>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mt-3"
        onClick={() => go({ archived: !filters.archived })}
      >
        {filters.archived ? "Voltar à biblioteca" : "Ver arquivados"}
      </Button>

      {canEdit && (
        <Button
          size="icon"
          aria-label="Novo exercício"
          onClick={() => setCreating(true)}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 size-14 rounded-2xl shadow-lg lg:hidden"
        >
          <Plus className="!size-6" />
        </Button>
      )}

      <ExerciseSheet open={creating} onOpenChange={setCreating} />
    </>
  );
}
