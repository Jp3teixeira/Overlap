"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChipGroup } from "@/components/chip";
import { Field } from "@/components/field";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { createExercise, updateExercise } from "../actions";
import { isDiagramEmpty, type Diagram } from "../diagram";
import { tagOptions, type ExerciseTag } from "../labels";
import type { ExerciseRow } from "../types";
import { DiagramEditor } from "./diagram-editor";
import { ImageField } from "./image-field";

type Values = {
  name: string;
  tags: ExerciseTag[];
  diagram: Diagram | null;
  duration_min: string;
  series: string;
  rest_seconds: string;
  min_players: string;
  space: string;
  equipment: string;
  description: string;
  objectives: string;
  success_criteria: string;
  rules: string;
  variants: string;
};

const EMPTY: Values = {
  name: "",
  tags: [],
  diagram: null,
  duration_min: "",
  series: "",
  rest_seconds: "",
  min_players: "",
  space: "",
  equipment: "",
  description: "",
  objectives: "",
  success_criteria: "",
  rules: "",
  variants: "",
};

const num = (n: number | null) => (n === null ? "" : String(n));

function fromExercise(e: ExerciseRow): Values {
  return {
    name: e.name,
    tags: e.tags,
    diagram: e.diagram,
    duration_min: num(e.duration_min),
    series: num(e.series),
    rest_seconds: num(e.rest_seconds),
    min_players: num(e.min_players),
    space: e.space ?? "",
    equipment: e.equipment ?? "",
    description: e.description ?? "",
    objectives: e.objectives ?? "",
    success_criteria: e.success_criteria ?? "",
    rules: e.rules ?? "",
    variants: e.variants ?? "",
  };
}

/** Campos que ficam recolhidos em "Mais detalhes". */
const DETAIL_KEYS = ["rules", "variants"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem exercício = criar. */
  exercise?: ExerciseRow;
};

/** Criar ou editar um exercício. Obrigatório: nome + uma etiqueta. O resto fica em "Mais detalhes". */
export function ExerciseSheet({ open, onOpenChange, exercise }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(exercise ? fromExercise(exercise) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [details, setDetails] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(exercise);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(exercise ? fromExercise(exercise) : EMPTY);
      setErrors({});
      setDetails(
        exercise ? DETAIL_KEYS.some((k) => fromExercise(exercise)[k].trim() !== "") : false,
      );
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      // Envia sempre todos os campos: o schema repõe a null o que faltar.
      const input = { ...values, diagram: isDiagramEmpty(values.diagram) ? null : values.diagram };
      const result = exercise
        ? await runAction<unknown>(() => updateExercise(exercise.id, input))
        : await runAction<{ id: string }>(() => createExercise(input));
      if (!result.ok) {
        const fe = result.fieldErrors ?? {};
        setErrors(fe);
        if (DETAIL_KEYS.some((k) => fe[k])) setDetails(true);
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Exercício guardado" : "Exercício adicionado");
      onOpenChange(false);
      if (!exercise) router.push(`/exercicios/${(result.data as { id: string }).id}`);
    });
  }

  const text = (
    key: "description" | "objectives" | "success_criteria" | "rules" | "variants",
    label: string,
    placeholder: string,
    max = 2000,
  ) => (
    <Field label={label} htmlFor={`ex-${key}`} error={errors[key]?.[0]}>
      <Textarea
        id={`ex-${key}`}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="min-h-24"
      />
    </Field>
  );

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar exercício" : "Novo exercício"}
      footer={
        <Button onClick={save} disabled={pending}>
          {pending ? "A guardar…" : "Guardar"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Nome" htmlFor="ex-name" error={errors.name?.[0]}>
          <Input
            id="ex-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex.: Rondo 4x2"
            maxLength={80}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <Field label="Etiquetas" error={errors.tags?.[0]} hint="Escolhe uma ou mais.">
          <ChipGroup
            aria-label="Etiquetas"
            options={tagOptions}
            value={values.tags}
            onChange={(v) => set("tags", v)}
          />
        </Field>

        <Field label="Campo" error={errors.diagram?.[0]}>
          <DiagramEditor value={values.diagram} onChange={(d) => set("diagram", d)} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Duração (min)" htmlFor="ex-duration" error={errors.duration_min?.[0]}>
            <Input
              id="ex-duration"
              inputMode="numeric"
              value={values.duration_min}
              onChange={(e) => set("duration_min", e.target.value)}
            />
          </Field>
          <Field label="Séries" htmlFor="ex-series" error={errors.series?.[0]}>
            <Input
              id="ex-series"
              inputMode="numeric"
              value={values.series}
              onChange={(e) => set("series", e.target.value)}
            />
          </Field>
          <Field label="Descanso (s)" htmlFor="ex-rest" error={errors.rest_seconds?.[0]}>
            <Input
              id="ex-rest"
              inputMode="numeric"
              value={values.rest_seconds}
              onChange={(e) => set("rest_seconds", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Jogadores (mín.)" htmlFor="ex-min" error={errors.min_players?.[0]}>
            <Input
              id="ex-min"
              inputMode="numeric"
              value={values.min_players}
              onChange={(e) => set("min_players", e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Espaço" htmlFor="ex-space" error={errors.space?.[0]}>
              <Input
                id="ex-space"
                value={values.space}
                onChange={(e) => set("space", e.target.value)}
                placeholder="Ex.: 20x20 m"
                maxLength={80}
              />
            </Field>
          </div>
        </div>

        <Field label="Material" htmlFor="ex-equipment" error={errors.equipment?.[0]}>
          <Input
            id="ex-equipment"
            value={values.equipment}
            onChange={(e) => set("equipment", e.target.value)}
            placeholder="Ex.: 8 cones, 2 mini-balizas, coletes"
            maxLength={300}
          />
        </Field>

        {text("description", "Como se joga", "Descreve o exercício em poucas linhas")}
        {text("objectives", "Objetivos", "O que queremos desenvolver?", 1000)}
        {text(
          "success_criteria",
          "Critérios de sucesso",
          "O que queremos ver quando corre bem?",
          1000,
        )}

        {exercise ? (
          <Field label="Foto do quadro ou esquema">
            <ImageField
              exerciseId={exercise.id}
              teamId={exercise.team_id}
              imageUrl={exercise.image_url}
            />
          </Field>
        ) : (
          <p className="text-muted-foreground -mt-2 text-[13px]">
            Depois de guardar, podes juntar uma foto do quadro ou de um esquema.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setDetails((d) => !d)}
          aria-expanded={details}
        >
          {details ? "Esconder detalhes" : "Mais detalhes"}
        </Button>

        {details && (
          <>
            {text("rules", "Regras", "Regras e pontuação")}
            {text("variants", "Variantes", "Como tornar mais fácil ou mais difícil?")}
          </>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ResponsiveSheet>
  );
}
