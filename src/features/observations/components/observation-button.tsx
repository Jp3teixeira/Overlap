"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PlayerOption } from "@/features/players/types";
import type { TodayContext } from "../types";
import { QuickObservation } from "./quick-observation";

type ObservationButtonProps = {
  players: PlayerOption[];
  context: TodayContext;
  initialPlayerId?: string;
  children: React.ReactNode;
} & Pick<React.ComponentProps<typeof Button>, "variant" | "size" | "className">;

/** Botão que abre a observação rápida. */
export function ObservationButton({
  players,
  context,
  initialPlayerId,
  children,
  ...buttonProps
}: ObservationButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <QuickObservation
        open={open}
        onOpenChange={setOpen}
        players={players}
        context={context}
        initialPlayerId={initialPlayerId}
      />
    </>
  );
}
