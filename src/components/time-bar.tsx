import { timeBarSegments, type TimedItem } from "@/features/training/minutes";
import { cn } from "@/lib/utils";

const TONE = {
  1: "bg-[var(--time-1)]",
  2: "bg-[var(--time-2)]",
  3: "bg-[var(--time-3)]",
  4: "bg-[var(--time-4)]",
} as const;

type TimeBarProps = {
  items: readonly TimedItem[];
  targetMin?: number | null;
  /** Mostrar "45/60 min" à direita. */
  showLabel?: boolean;
  className?: string;
};

/** A barra de tempo do treino: um segmento por exercício, proporcional aos minutos. */
export function TimeBar({ items, targetMin, showLabel = true, className }: TimeBarProps) {
  const { total, target, overBy, segments } = timeBarSegments(items, targetMin);
  const label = target ? `${total}/${target} min` : `${total} min`;
  const description = target
    ? `${total} de ${target} minutos planeados${overBy ? `, ${overBy} a mais` : ""}`
    : `${total} minutos planeados`;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="img"
        aria-label={description}
        className="bg-muted flex h-3 flex-1 gap-[2px] overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <span
            key={s.id}
            className={cn("h-full", TONE[s.tone])}
            style={{ width: `${s.widthPct}%` }}
          />
        ))}
      </div>
      {showLabel && (
        <span
          className={cn(
            "shrink-0 text-[13px] font-medium tabular-nums",
            overBy ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
