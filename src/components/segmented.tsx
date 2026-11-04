"use client";

import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  "aria-label": string;
};

/** Escolha curta e exclusiva: casa/fora, pé dominante, estado. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className="bg-muted grid auto-cols-fr grid-flow-col gap-1 rounded-lg p-1"
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(o.value)}
            className={cn(
              "focus-visible:ring-ring h-9 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
              checked
                ? "bg-card text-foreground ring-border ring-1"
                : "text-muted-foreground active:bg-card/60",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
