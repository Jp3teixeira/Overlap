"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
import { createMatches } from "../actions";
import { kindOptions, venueOptions, type MatchKind, type MatchVenue } from "../labels";

type Row = { key: number; match_date: string; opponent: string; venue: MatchVenue };

/** A jornada seguinte vem preenchida: uma semana depois, com o local trocado. */
function nextRow(prev: Row | undefined, today: string, key: number): Row {
  return {
    key,
    match_date: prev ? addDays(prev.match_date, 7) : today,
    opponent: "",
    venue: prev ? (prev.venue === "casa" ? "fora" : "casa") : "casa",
  };
}

/** "Adicionar vários": o calendário da época de uma vez, uma linha por jornada. */
export function BulkMatchesSheet({
  open,
  onOpenChange,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const first = nextRow(undefined, today, 0);
    return [first, nextRow(first, today, 1)];
  });
  const [nextKey, setNextKey] = useState(2);
  const [kind, setKind] = useState<MatchKind>("oficial");
  const [competition, setCompetition] = useState("");
  const [pending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const first = nextRow(undefined, today, 0);
      setRows([first, nextRow(first, today, 1)]);
      setNextKey(2);
      setKind("oficial");
      setCompetition("");
    }
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, nextRow(rs[rs.length - 1], today, nextKey)]);
    setNextKey((k) => k + 1);
  }

  function save() {
    // Linhas sem adversário são ignoradas (sobra de "Outra jornada").
    const filled = rows.filter((r) => r.opponent.trim());
    if (filled.length === 0) return void toast.error("Escreve pelo menos um adversário.");
    startTransition(async () => {
      const result = await runAction(() =>
        createMatches(
          filled.map((r) => ({
            match_date: r.match_date,
            opponent: r.opponent,
            venue: r.venue,
            kind,
            competition,
          })),
        ),
      );
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        result.data.count === 1 ? "1 jogo adicionado" : `${result.data.count} jogos adicionados`,
      );
      onOpenChange(false);
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar vários jogos"
      description="Uma linha por jornada. A data e o local da seguinte vêm preenchidos."
      footer={
        <Button onClick={save} disabled={pending}>
          {pending ? "A guardar…" : "Guardar todos"}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Tipo (para todos)">
          <Segmented
            aria-label="Tipo de jogo"
            options={kindOptions}
            value={kind}
            onChange={setKind}
          />
        </Field>
        <Field label="Competição (para todos)" htmlFor="bulk-competition">
          <Input
            id="bulk-competition"
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            placeholder="Ex.: Campeonato Distrital"
            maxLength={80}
          />
        </Field>

        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => (
            <li key={r.key} className="border-border bg-card rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-[13px] font-medium">Jogo {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover jogo ${i + 1}`}
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="text-muted-foreground -m-2 flex size-11 items-center justify-center"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  value={r.opponent}
                  onChange={(e) => update(r.key, { opponent: e.target.value })}
                  placeholder="Adversário"
                  aria-label={`Adversário do jogo ${i + 1}`}
                  autoComplete="off"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={r.match_date}
                    onChange={(e) => update(r.key, { match_date: e.target.value })}
                    aria-label={`Data do jogo ${i + 1}`}
                  />
                  <Segmented
                    aria-label={`Local do jogo ${i + 1}`}
                    options={venueOptions.filter((o) => o.value !== "neutro")}
                    value={r.venue}
                    onChange={(v) => update(r.key, { venue: v })}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" onClick={addRow} disabled={rows.length >= 40}>
          <Plus />
          Outra jornada
        </Button>
      </div>
    </ResponsiveSheet>
  );
}
