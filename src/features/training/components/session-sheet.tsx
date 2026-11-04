"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { MinutesStepper } from "@/components/minutes-stepper";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { runAction } from "@/lib/run-action";
import { createSession, updateSession } from "../actions";
import { DEFAULT_TARGET_MIN } from "../labels";
import type { SessionRow } from "../types";

type Values = {
  session_date: string;
  start_time: string;
  target_duration_min: number;
  objectives: string;
  expected_players: string;
  space: string;
  notes: string;
};

const emptyValues = (today: string): Values => ({
  session_date: today,
  start_time: "",
  target_duration_min: DEFAULT_TARGET_MIN,
  objectives: "",
  expected_players: "",
  space: "",
  notes: "",
});

const fromSession = (s: SessionRow): Values => ({
  session_date: s.session_date,
  start_time: s.start_time?.slice(0, 5) ?? "",
  target_duration_min: s.target_duration_min ?? DEFAULT_TARGET_MIN,
  objectives: s.objectives ?? "",
  expected_players: s.expected_players === null ? "" : String(s.expected_players),
  space: s.space ?? "",
  notes: s.notes ?? "",
});

/** Título de bloco dentro de um formulário. */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-muted-foreground text-[13px] font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data de hoje (vem do servidor, em Lisboa) para o treino novo. */
  today: string;
  /** Sem treino = criar. */
  session?: SessionRow;
};

/** Criar ou editar um treino. Obrigatória só a data; ao criar, abre logo a ficha para juntar exercícios. */
export function SessionSheet({ open, onOpenChange, today, session }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(session ? fromSession(session) : emptyValues(today));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(session);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(session ? fromSession(session) : emptyValues(today));
      setErrors({});
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      // Envia sempre todos os campos: o schema repõe a null o que faltar.
      const input = { ...values, target_duration_min: String(values.target_duration_min) };
      const result = session
        ? await runAction<unknown>(() => updateSession(session.id, input))
        : await runAction<{ id: string }>(() => createSession(input));
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Treino guardado" : "Treino criado");
      onOpenChange(false);
      if (!session) router.push(`/treinos/${(result.data as { id: string }).id}`);
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar treino" : "Novo treino"}
      footer={
        <Button onClick={save} disabled={pending}>
          {pending ? "A guardar…" : isEdit ? "Guardar" : "Criar e juntar exercícios"}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FormSection title="Quando">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" htmlFor="ses-date" error={errors.session_date?.[0]}>
              <Input
                id="ses-date"
                type="date"
                value={values.session_date}
                onChange={(e) => set("session_date", e.target.value)}
                aria-invalid={errors.session_date ? true : undefined}
              />
            </Field>
            <Field label="Hora" htmlFor="ses-time" error={errors.start_time?.[0]}>
              <Input
                id="ses-time"
                type="time"
                value={values.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Duração do treino" error={errors.target_duration_min?.[0]}>
            <MinutesStepper
              label="Duração do treino em minutos"
              value={values.target_duration_min}
              onChange={(n) => set("target_duration_min", n)}
              min={5}
              max={240}
            />
          </Field>
        </FormSection>

        <FormSection title="O treino">
          <Field label="Objetivo" htmlFor="ses-obj" error={errors.objectives?.[0]}>
            <Textarea
              id="ses-obj"
              value={values.objectives}
              onChange={(e) => set("objectives", e.target.value)}
              placeholder="O que queremos trabalhar neste treino?"
              maxLength={500}
              className="min-h-20"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Jogadores esperados"
              htmlFor="ses-players"
              error={errors.expected_players?.[0]}
            >
              <Input
                id="ses-players"
                inputMode="numeric"
                value={values.expected_players}
                onChange={(e) => set("expected_players", e.target.value)}
              />
            </Field>
            <Field label="Espaço" htmlFor="ses-space" error={errors.space?.[0]}>
              <Input
                id="ses-space"
                value={values.space}
                onChange={(e) => set("space", e.target.value)}
                placeholder="Ex.: meio campo"
                maxLength={80}
              />
            </Field>
          </div>
          <Field label="Notas" htmlFor="ses-notes" error={errors.notes?.[0]}>
            <Textarea
              id="ses-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Lembretes antes do treino (material, faltas, etc.)"
              maxLength={2000}
              className="min-h-20"
            />
          </Field>
        </FormSection>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ResponsiveSheet>
  );
}
