import { cn } from "@/lib/utils";

const RESULT = {
  V: { label: "Vitória", className: "bg-result-win" },
  E: { label: "Empate", className: "bg-result-draw" },
  D: { label: "Derrota", className: "bg-result-loss" },
} as const;

export function resultOf(goalsFor: number, goalsAgainst: number): keyof typeof RESULT {
  if (goalsFor > goalsAgainst) return "V";
  if (goalsFor < goalsAgainst) return "D";
  return "E";
}

export function ResultBadge({
  goalsFor,
  goalsAgainst,
}: {
  goalsFor: number;
  goalsAgainst: number;
}) {
  const key = resultOf(goalsFor, goalsAgainst);
  return (
    <span
      aria-label={RESULT[key].label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md text-xs font-bold text-white",
        RESULT[key].className,
      )}
    >
      {key}
    </span>
  );
}

/** Resultado no formato da casa: "3–1" (golos marcados primeiro). */
export function formatScore(goalsFor: number, goalsAgainst: number) {
  return `${goalsFor}–${goalsAgainst}`;
}
