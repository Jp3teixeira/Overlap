"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export type TableRow = {
  id: string;
  name: string;
  shirtNumber: number | null;
  games: number;
  minutes: number;
  perGame: number;
  goals: number;
  assists: number;
};

type SortKey = "games" | "minutes" | "goals" | "assists";

const COLUMNS: { key: SortKey; label: string; title: string; width: string }[] = [
  { key: "games", label: "J", title: "Jogos", width: "w-9" },
  { key: "minutes", label: "Min", title: "Minutos", width: "w-12" },
  { key: "goals", label: "G", title: "Golos", width: "w-9" },
  { key: "assists", label: "A", title: "Assistências", width: "w-9" },
];

/** Tabela dos jogadores. Toca no cabeçalho para ordenar (outra vez para inverter). */
export function PlayersTable({ rows }: { rows: TableRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "goals",
    dir: "desc",
  });

  if (rows.length === 0) {
    return (
      <EmptyState message="Os jogadores aparecem aqui depois do primeiro jogo ao vivo terminado ou com valores de base." />
    );
  }

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sort.key] - b[sort.key];
    const primary = sort.dir === "desc" ? -diff : diff;
    return (
      primary ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.minutes - a.minutes ||
      a.name.localeCompare(b.name, "pt")
    );
  });

  function onSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );
  }

  return (
    <div className="border-border bg-card rounded-lg border">
      <div className="border-border flex items-center gap-1 border-b pr-2 pl-4">
        <span className="text-muted-foreground flex-1 text-[13px] font-medium">Jogador</span>
        {COLUMNS.map((c) => {
          const active = sort.key === c.key;
          const Arrow = sort.dir === "desc" ? ArrowDown : ArrowUp;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSort(c.key)}
              title={c.title}
              aria-label={`Ordenar por ${c.title.toLowerCase()}`}
              aria-pressed={active}
              className={cn(
                "flex h-11 items-center justify-end gap-0.5 text-[13px] font-semibold outline-none",
                c.width,
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {c.label}
              {active && <Arrow className="size-3" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>
      <ul className="divide-border divide-y">
        {sorted.map((r) => (
          <li key={r.id} className="flex items-center gap-1 py-2 pr-2 pl-4">
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="bg-secondary text-secondary-foreground grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold [font-stretch:88%] tabular-nums">
                {r.shirtNumber ?? "–"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] leading-5 font-medium">{r.name}</span>
                {r.games > 0 && (
                  <span className="text-muted-foreground block text-[12px] leading-4 tabular-nums">
                    {r.perGame}′ por jogo
                  </span>
                )}
              </span>
            </span>
            {COLUMNS.map((c) => (
              <span
                key={c.key}
                className={cn(
                  "text-right text-[15px] tabular-nums",
                  c.width,
                  r[c.key] === 0 ? "text-muted-foreground" : "font-semibold",
                )}
              >
                {r[c.key]}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
