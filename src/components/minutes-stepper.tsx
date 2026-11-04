"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type MinutesStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
};

export function MinutesStepper({
  value,
  onChange,
  min = 1,
  max = 120,
  step = 5,
  label,
}: MinutesStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        aria-label={`Menos ${step} minutos`}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus />
      </Button>
      <output
        aria-live="polite"
        className="w-11 text-center text-[15px] font-semibold tabular-nums"
      >
        {value}&prime;
      </output>
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        aria-label={`Mais ${step} minutos`}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus />
      </Button>
    </div>
  );
}
