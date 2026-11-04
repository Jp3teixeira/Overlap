"use client";

import { cn } from "@/lib/utils";

type ChipProps = {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

export function Chip({ selected = false, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground active:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

type Option<T extends string> = { value: T; label: string };

type ChipGroupProps<T extends string> = {
  options: readonly Option<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
  /** false = escolha única (tocar outra vez desmarca). */
  multiple?: boolean;
  "aria-label"?: string;
};

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = true,
  ...rest
}: ChipGroupProps<T>) {
  function toggle(v: T) {
    const has = value.includes(v);
    if (multiple) onChange(has ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(has ? [] : [v]);
  }

  return (
    <div role="group" aria-label={rest["aria-label"]} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} selected={value.includes(o.value)} onClick={() => toggle(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
