"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Contador de golos com botões grandes (toque no campo, de luvas ou à pressa). */
export function ScoreStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2" role="group" aria-label={label}>
      <span className="text-muted-foreground max-w-28 truncate text-sm font-medium">{label}</span>
      <Button
        variant="outline"
        size="icon"
        className="size-12"
        aria-label={`Mais um golo (${label})`}
        disabled={value >= 99}
        onClick={() => onChange(Math.min(99, value + 1))}
      >
        <Plus />
      </Button>
      <output
        aria-live="polite"
        className="text-5xl leading-none font-[650] [font-stretch:88%] tabular-nums"
      >
        {value}
      </output>
      <Button
        variant="outline"
        size="icon"
        className="size-12"
        aria-label={`Menos um golo (${label})`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus />
      </Button>
    </div>
  );
}
