import { describe, expect, it } from "vitest";
import { ANIM_BALL_ID, buildTimeline, frameAt } from "./animation";
import type { Diagram } from "./diagram";

const diagram = (over: Partial<Diagram> = {}): Diagram => ({
  v: 1,
  field: "campo",
  pieces: [
    { id: "p1", kind: "a", x: 100, y: 100 },
    { id: "p2", kind: "a", x: 300, y: 100 },
    { id: "ball", kind: "ball", x: 112, y: 100 },
  ],
  arrows: [],
  zones: [],
  ...over,
});

const pieceOf = (d: Diagram, id: string) => d.pieces.find((p) => p.id === id)!;

describe("buildTimeline", () => {
  it("sem setas não há animação", () => {
    expect(buildTimeline(diagram())).toEqual({ steps: [], total: 0 });
  });

  it("segue a ordem em que as setas foram desenhadas", () => {
    const d = diagram({
      arrows: [
        { id: "a1", kind: "pass", x1: 112, y1: 100, x2: 300, y2: 100 },
        { id: "a2", kind: "run", x1: 300, y1: 100, x2: 300, y2: 200 },
      ],
    });
    const t = buildTimeline(d);
    expect(t.steps.map((s) => s.arrowId)).toEqual(["a1", "a2"]);
    expect(t.steps[1].start).toBeGreaterThan(t.steps[0].start + t.steps[0].duration);
    expect(t.total).toBeCloseTo(t.steps[1].start + t.steps[1].duration, 6);
  });

  it("passe e remate mexem a bola mais próxima", () => {
    const d = diagram({ arrows: [{ id: "a1", kind: "shot", x1: 100, y1: 100, x2: 500, y2: 200 }] });
    const [s] = buildTimeline(d).steps;
    expect(s.moves).toEqual([{ id: "ball", from: { x: 100, y: 100 }, to: { x: 500, y: 200 } }]);
  });

  it("sem bola desenhada, o passe usa uma bola só da animação", () => {
    const d = diagram({
      pieces: [{ id: "p1", kind: "a", x: 100, y: 100 }],
      arrows: [{ id: "a1", kind: "pass", x1: 100, y1: 100, x2: 200, y2: 100 }],
    });
    expect(buildTimeline(d).steps[0].moves[0].id).toBe(ANIM_BALL_ID);
  });

  it("desmarcação mexe a peça que está no início da seta", () => {
    const d = diagram({ arrows: [{ id: "a1", kind: "run", x1: 305, y1: 102, x2: 305, y2: 202 }] });
    const [s] = buildTimeline(d).steps;
    expect(s.moves).toEqual([{ id: "p2", from: { x: 300, y: 100 }, to: { x: 300, y: 200 } }]);
  });

  it("na condução a bola vai com o jogador", () => {
    const d = diagram({ arrows: [{ id: "a1", kind: "dribble", x1: 100, y1: 100, x2: 100, y2: 200 }] });
    const [s] = buildTimeline(d).steps;
    expect(s.moves.map((m) => m.id)).toEqual(["p1", "ball"]);
    expect(s.moves[1].to).toEqual({ x: 112, y: 200 });
  });

  it("ignora linhas, setas sem peça no início e setas sem comprimento", () => {
    const d = diagram({
      arrows: [
        { id: "l", kind: "line", x1: 0, y1: 0, x2: 100, y2: 0 },
        { id: "far", kind: "run", x1: 500, y1: 350, x2: 550, y2: 350 },
        { id: "zero", kind: "pass", x1: 10, y1: 10, x2: 10, y2: 10 },
      ],
    });
    expect(buildTimeline(d).steps).toEqual([]);
  });

  it("uma peça que se mexeu antes é a que sai na seta seguinte", () => {
    const d = diagram({
      arrows: [
        { id: "a1", kind: "run", x1: 100, y1: 100, x2: 200, y2: 200 },
        { id: "a2", kind: "run", x1: 200, y1: 200, x2: 250, y2: 200 },
      ],
    });
    const steps = buildTimeline(d).steps;
    expect(steps[1].moves[0]).toEqual({ id: "p1", from: { x: 200, y: 200 }, to: { x: 250, y: 200 } });
  });
});

describe("frameAt", () => {
  const d = diagram({
    arrows: [
      { id: "a1", kind: "run", x1: 100, y1: 100, x2: 200, y2: 100 },
      { id: "a2", kind: "run", x1: 300, y1: 100, x2: 300, y2: 200 },
      { id: "l", kind: "line", x1: 0, y1: 0, x2: 100, y2: 0 },
    ],
  });
  const tl = buildTimeline(d);

  it("em t=0 devolve o desenho original", () => {
    expect(frameAt(d, tl, 0)).toBe(d);
  });

  it("a meio do 1.º passo a peça está entre o início e o fim", () => {
    const f = frameAt(d, tl, tl.steps[0].duration / 2);
    const x = pieceOf(f, "p1").x;
    expect(x).toBeGreaterThan(100);
    expect(x).toBeLessThan(200);
    expect(pieceOf(f, "p2").y).toBe(100);
  });

  it("as setas só aparecem quando começam; as linhas aparecem sempre", () => {
    const f = frameAt(d, tl, 1);
    expect(f.arrows.map((a) => a.id)).toEqual(["a1", "l"]);
    const end = frameAt(d, tl, tl.total);
    expect(end.arrows.map((a) => a.id)).toEqual(["a1", "a2", "l"]);
  });

  it("no fim as peças estão no destino e nunca passam dele", () => {
    const f = frameAt(d, tl, tl.total + 5000);
    expect(pieceOf(f, "p1")).toMatchObject({ x: 200, y: 100 });
    expect(pieceOf(f, "p2")).toMatchObject({ x: 300, y: 200 });
  });

  it("entre passos a peça fica onde o passo anterior a deixou", () => {
    const gap = tl.steps[0].start + tl.steps[0].duration + 10;
    expect(pieceOf(frameAt(d, tl, gap), "p1").x).toBe(200);
  });

  it("a bola da animação só existe depois de o passe começar", () => {
    const e = diagram({
      pieces: [{ id: "p1", kind: "a", x: 100, y: 100 }],
      arrows: [{ id: "a1", kind: "pass", x1: 100, y1: 100, x2: 200, y2: 100 }],
    });
    const t = buildTimeline(e);
    expect(frameAt(e, t, 0).pieces).toHaveLength(1);
    const f = frameAt(e, t, t.total);
    expect(pieceOf(f, ANIM_BALL_ID)).toMatchObject({ kind: "ball", x: 200, y: 100 });
  });
});
