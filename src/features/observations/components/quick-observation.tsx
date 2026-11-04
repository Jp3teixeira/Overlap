"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/chip";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { PlayerOption } from "@/features/players/types";
import { runAction } from "@/lib/run-action";
import { cn } from "@/lib/utils";
import { createObservation } from "../actions";
import type { TodayContext } from "../types";

type Link = "session" | "match" | null;

type QuickObservationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: PlayerOption[];
  context: TodayContext;
  /** Vindo da ficha: o jogador já vem escolhido. */
  initialPlayerId?: string;
};

const defaultLink = (c: TodayContext): Link => (c.match ? "match" : c.sessionId ? "session" : null);

/**
 * Observação rápida: escolher jogador → escrever → guardar. Objetivo: menos de 30 segundos.
 * Se houver treino ou jogo hoje, a observação liga-se a ele sozinha (chip que dá para tirar).
 */
export function QuickObservation({
  open,
  onOpenChange,
  players,
  context,
  initialPlayerId,
}: QuickObservationProps) {
  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId ?? null);
  const [body, setBody] = useState("");
  const [link, setLink] = useState<Link>(defaultLink(context));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPlayerId(initialPlayerId ?? null);
      setBody("");
      setLink(defaultLink(context));
      setError(null);
    }
  }

  const player = players.find((p) => p.id === playerId);

  function save(another: boolean) {
    if (!playerId) return;
    startTransition(async () => {
      const result = await runAction(() =>
        createObservation({
          player_id: playerId,
          body,
          training_session_id: link === "session" ? context.sessionId : null,
          match_id: link === "match" ? (context.match?.id ?? null) : null,
        }),
      );
      if (!result.ok) {
        setError(result.fieldErrors?.body?.[0] ?? result.error);
        return;
      }
      toast.success(`Observação guardada${player ? ` (${player.name})` : ""}`);
      if (another) {
        setPlayerId(null);
        setBody("");
        setError(null);
      } else {
        onOpenChange(false);
      }
    });
  }

  // Passo 1: escolher jogador
  if (!player) {
    return (
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Observação"
        description="Escolhe o jogador."
      >
        {players.length === 0 ? (
          <p className="text-muted-foreground text-[15px]">
            Ainda não há jogadores ativos. Adiciona primeiro o plantel.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {players.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPlayerId(p.id)}
                  className="border-border bg-card active:bg-muted focus-visible:ring-ring flex h-[72px] w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-1 outline-none focus-visible:ring-2"
                >
                  <span className="text-primary text-xl leading-6 font-[650] [font-stretch:88%] tabular-nums">
                    {p.shirt_number ?? "–"}
                  </span>
                  <span className="w-full truncate text-center text-[13px] font-medium">
                    {p.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ResponsiveSheet>
    );
  }

  // Passo 2: escrever
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={player.name}
      footer={
        <>
          <Button onClick={() => save(false)} disabled={pending || !body.trim()}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
          {players.length > 1 && (
            <Button variant="outline" onClick={() => save(true)} disabled={pending || !body.trim()}>
              Guardar e observar outro
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!initialPlayerId && (
          <button
            type="button"
            onClick={() => setPlayerId(null)}
            className="text-primary -mt-1 self-start text-sm font-medium"
          >
            Mudar jogador
          </button>
        )}
        <Textarea
          autoFocus
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (error) setError(null);
          }}
          maxLength={2000}
          placeholder="O que viste? Podes usar o ditado do teclado."
          aria-label={`Observação sobre ${player.name}`}
          aria-invalid={error ? true : undefined}
          className={cn("min-h-32")}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        {(context.sessionId || context.match) && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-[13px]">Ligar a:</span>
            {context.sessionId && (
              <Chip
                selected={link === "session"}
                onClick={() => setLink(link === "session" ? null : "session")}
              >
                Treino de hoje
              </Chip>
            )}
            {context.match && (
              <Chip
                selected={link === "match"}
                onClick={() => setLink(link === "match" ? null : "match")}
              >
                vs {context.match.opponent}
              </Chip>
            )}
          </div>
        )}
      </div>
    </ResponsiveSheet>
  );
}
