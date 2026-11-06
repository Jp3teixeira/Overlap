"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildTimeline, frameAt, HOLD_MS } from "../animation";
import type { Diagram } from "../diagram";
import { PitchDiagram } from "./pitch-diagram";

/**
 * O desenho da ficha com um botão "Ver em movimento": as setas, pela ordem em que foram
 * desenhadas, passam a movimentos (jogadores e bola), em ciclo. Parado, é o desenho normal.
 */
export function AnimatedDiagram({ diagram, className }: { diagram: Diagram; className?: string }) {
  const timeline = useMemo(() => buildTimeline(diagram), [diagram]);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const cycle = timeline.total + HOLD_MS;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      // Depois da pausa do fim, volta ao princípio e repete.
      setT((prev) => {
        const next = prev + dt;
        return next >= cycle ? 0 : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, cycle]);

  const canPlay = timeline.steps.length > 0;
  // `t` fica no fim durante a pausa de repetição: o desenho mostra o resultado final.
  const shown = canPlay ? frameAt(diagram, timeline, Math.min(t, timeline.total)) : diagram;
  const started = t > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="border-border overflow-hidden rounded-lg border bg-[#3a8a4f]">
        <PitchDiagram diagram={shown} className={cn("mx-auto max-h-[70dvh]", className)} />
      </div>
      {canPlay && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause className="!size-4" /> : <Play className="!size-4" />}
            {playing ? "Pausa" : started ? "Continuar" : "Ver em movimento"}
          </Button>
          {started && (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setPlaying(false);
                setT(0);
              }}
            >
              <RotateCcw className="!size-4" />
              Reiniciar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
