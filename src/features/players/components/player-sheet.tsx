"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/chip";
import { Field } from "@/components/field";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction } from "@/lib/run-action";
import { createPlayer, setPlayerActive, updatePlayer } from "../actions";
import { footOptions, positionOptions, type DominantFoot, type PlayerPosition } from "../labels";
import type { PlayerRow } from "../types";

type Values = {
  name: string;
  shirt_number: string;
  birth_year: string;
  positions: PlayerPosition[];
  dominant_foot: DominantFoot | null;
  current_focus: string;
};

const empty: Values = {
  name: "",
  shirt_number: "",
  birth_year: "",
  positions: [],
  dominant_foot: null,
  current_focus: "",
};

function fromPlayer(p: PlayerRow): Values {
  return {
    name: p.name,
    shirt_number: p.shirt_number?.toString() ?? "",
    birth_year: p.birth_year?.toString() ?? "",
    positions: p.positions,
    dominant_foot: p.dominant_foot,
    current_focus: p.current_focus ?? "",
  };
}

type PlayerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sem jogador = criar. */
  player?: PlayerRow;
};

/** Criar ou editar um jogador. Só o nome é obrigatório. */
export function PlayerSheet({ open, onOpenChange, player }: PlayerSheetProps) {
  const [values, setValues] = useState<Values>(player ? fromPlayer(player) : empty);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(player);

  // Sempre que abre, começa com os dados atuais (padrão "ajustar estado durante o render").
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(player ? fromPlayer(player) : empty);
      setErrors({});
      setConfirmArchive(false);
    }
  }

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function save(addAnother: boolean) {
    startTransition(async () => {
      const result = await runAction<unknown>(() =>
        player ? updatePlayer(player.id, values) : createPlayer(values),
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Jogador guardado" : `${values.name.trim()} adicionado`);
      if (addAnother) {
        setValues(empty);
        setErrors({});
      } else {
        onOpenChange(false);
      }
    });
  }

  function toggleActive() {
    if (!player) return;
    if (player.is_active && !confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    startTransition(async () => {
      const result = await runAction(() => setPlayerActive(player.id, !player.is_active));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(player.is_active ? "Jogador arquivado" : "Jogador reativado");
      onOpenChange(false);
    });
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar jogador" : "Novo jogador"}
      footer={
        <>
          <Button onClick={() => save(false)} disabled={pending}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
          {!isEdit && (
            <Button variant="outline" onClick={() => save(true)} disabled={pending}>
              Guardar e adicionar outro
            </Button>
          )}
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
      >
        <Field label="Nome" htmlFor="player-name" error={errors.name?.[0]}>
          <Input
            id="player-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Como é chamado no campo"
            autoComplete="off"
            autoFocus={!isEdit}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Número" htmlFor="player-number" error={errors.shirt_number?.[0]}>
            <Input
              id="player-number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={values.shirt_number}
              onChange={(e) => set("shirt_number", e.target.value.replace(/\D/g, "").slice(0, 2))}
              aria-invalid={errors.shirt_number ? true : undefined}
            />
          </Field>
          <Field label="Ano de nascimento" htmlFor="player-year" error={errors.birth_year?.[0]}>
            <Input
              id="player-year"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="2016"
              value={values.birth_year}
              onChange={(e) => set("birth_year", e.target.value.replace(/\D/g, "").slice(0, 4))}
              aria-invalid={errors.birth_year ? true : undefined}
            />
          </Field>
        </div>

        <Field label="Posições" error={errors.positions?.[0]}>
          <ChipGroup
            aria-label="Posições"
            options={positionOptions}
            value={values.positions}
            onChange={(v) => set("positions", v)}
          />
        </Field>

        <Field label="Pé dominante">
          <Segmented
            aria-label="Pé dominante"
            options={footOptions}
            value={values.dominant_foot}
            onChange={(v) => set("dominant_foot", values.dominant_foot === v ? null : v)}
          />
        </Field>

        <Field
          label="Foco atual"
          htmlFor="player-focus"
          error={errors.current_focus?.[0]}
          hint="Uma linha sobre o que está a trabalhar agora."
        >
          <Input
            id="player-focus"
            value={values.current_focus}
            onChange={(e) => set("current_focus", e.target.value)}
            placeholder="Ex.: receber de costas e rodar"
            maxLength={200}
          />
        </Field>

        {player && (
          <div className="border-border border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              className={player.is_active ? "text-destructive w-full" : "w-full"}
              onClick={toggleActive}
              disabled={pending}
            >
              {player.is_active
                ? confirmArchive
                  ? "Toca outra vez para arquivar"
                  : "Arquivar jogador"
                : "Reativar jogador"}
            </Button>
            {player.is_active && (
              <p className="text-muted-foreground mt-1 text-center text-[13px]">
                Arquivar esconde-o do plantel. As observações ficam guardadas.
              </p>
            )}
          </div>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </ResponsiveSheet>
  );
}
