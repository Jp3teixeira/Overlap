import { LayoutGrid } from "lucide-react";
import type { Diagram } from "../diagram";
import { PitchDiagram } from "./pitch-diagram";

/** Miniatura do exercício: o campo desenhado, ou um ícone se ainda não tem desenho. */
export function ExerciseThumb({ diagram }: { diagram: Diagram | null }) {
  return (
    <span className="bg-muted grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-md">
      {diagram ? (
        <PitchDiagram diagram={diagram} className="h-12 w-16" aria-hidden />
      ) : (
        <LayoutGrid aria-hidden className="text-muted-foreground size-5" />
      )}
    </span>
  );
}
