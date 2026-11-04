"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { SectionTitle } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { saveMatchAnalysis } from "../actions";
import type { MatchRow } from "../types";

const BLOCKS = [
  { key: "went_well", label: "Correu bem", placeholder: "O que funcionou?" },
  { key: "went_badly", label: "Correu mal", placeholder: "O que não funcionou?" },
  { key: "to_work_on", label: "O que trabalhar", placeholder: "O que vamos treinar a seguir?" },
  { key: "notes", label: "Notas", placeholder: "Outras notas sobre o jogo" },
] as const;

type Key = (typeof BLOCKS)[number]["key"];
type Values = Record<Key, string>;

const fromMatch = (m: MatchRow): Values => ({
  went_well: m.went_well ?? "",
  went_badly: m.went_badly ?? "",
  to_work_on: m.to_work_on ?? "",
  notes: m.notes ?? "",
});

/** Análise pós-jogo: 3 blocos + notas. Só os treinadores editam; os outros leem. */
export function AnalysisEditor({ match, canEdit }: { match: MatchRow; canEdit: boolean }) {
  const saved = fromMatch(match);
  const [values, setValues] = useState<Values>(saved);
  const [pending, startTransition] = useTransition();
  const dirty = BLOCKS.some((b) => values[b.key] !== saved[b.key]);

  function save() {
    startTransition(async () => {
      const result = await runAction(() => saveMatchAnalysis(match.id, values));
      if (!result.ok) return void toast.error(result.error);
      toast.success("Análise guardada");
    });
  }

  if (!canEdit) {
    const filled = BLOCKS.filter((b) => saved[b.key].trim());
    return (
      <section className="mb-8">
        <SectionTitle>Análise</SectionTitle>
        {filled.length === 0 ? (
          <p className="text-muted-foreground text-[15px]">Ainda sem análise.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {filled.map((b) => (
              <div key={b.key}>
                <h3 className="text-sm font-medium">{b.label}</h3>
                <p className="mt-1 text-[15px] leading-[22px] whitespace-pre-wrap">
                  {saved[b.key]}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-8">
      <SectionTitle>Análise</SectionTitle>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty) save();
        }}
      >
        {BLOCKS.map((b) => (
          <Field key={b.key} label={b.label} htmlFor={`analysis-${b.key}`}>
            <Textarea
              id={`analysis-${b.key}`}
              value={values[b.key]}
              onChange={(e) => setValues((v) => ({ ...v, [b.key]: e.target.value }))}
              placeholder={b.placeholder}
              maxLength={2000}
              className="min-h-24"
            />
          </Field>
        ))}
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "A guardar…" : dirty ? "Guardar análise" : "Guardado"}
        </Button>
      </form>
    </section>
  );
}
