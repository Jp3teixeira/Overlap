import { describe, expect, it } from "vitest";
import {
  arrowGeometry,
  changeField,
  clampToField,
  diagramSchema,
  emptyDiagram,
  formationLabel,
  isDiagramEmpty,
  usedKinds,
  type Diagram,
} from "./diagram";

const base = (): Diagram => ({
  v: 1,
  field: "campo",
  pieces: [
    { id: "1", kind: "a", x: 100, y: 100 },
    { id: "2", kind: "a", x: 120, y: 100 },
    { id: "3", kind: "b", x: 500, y: 300 },
    { id: "4", kind: "n", x: 10, y: 10 },
    { id: "5", kind: "gk", x: 590, y: 200 },
  ],
  arrows: [{ id: "6", kind: "pass", x1: 100, y1: 100, x2: 580, y2: 390 }],
  zones: [{ id: "7", x: 400, y: 300, w: 200, h: 100 }],
});

describe("diagramSchema", () => {
  it("aceita um desenho válido e null", () => {
    expect(diagramSchema.safeParse(base()).success).toBe(true);
    expect(diagramSchema.parse(null)).toBeNull();
    expect(diagramSchema.parse(undefined)).toBeNull();
  });

  it("a baliza aceita qualquer ângulo entre 0 e 359", () => {
    const withGoal = (r: number) => ({
      ...base(),
      pieces: [{ id: "g", kind: "goal" as const, x: 10, y: 10, r }],
    });
    expect(diagramSchema.safeParse(withGoal(45)).success).toBe(true);
    expect(diagramSchema.safeParse(withGoal(135)).success).toBe(true);
    expect(diagramSchema.safeParse(withGoal(400)).success).toBe(false);
    expect(diagramSchema.safeParse(withGoal(-1)).success).toBe(false);
  });

  it("recusa peças desconhecidas, coordenadas fora de limites e excesso de peças", () => {
    const bad = base();
    expect(
      diagramSchema.safeParse({ ...bad, pieces: [{ id: "x", kind: "dragao", x: 1, y: 1 }] })
        .success,
    ).toBe(false);
    expect(
      diagramSchema.safeParse({ ...bad, pieces: [{ id: "x", kind: "a", x: -5, y: 1 }] }).success,
    ).toBe(false);
    const many = Array.from({ length: 41 }, (_, i) => ({
      id: `${i}`,
      kind: "a" as const,
      x: 1,
      y: 1,
    }));
    expect(diagramSchema.safeParse({ ...bad, pieces: many }).success).toBe(false);
    expect(diagramSchema.safeParse({ ...bad, v: 2 }).success).toBe(false);
  });
});

describe("helpers do desenho", () => {
  it("isDiagramEmpty", () => {
    expect(isDiagramEmpty(null)).toBe(true);
    expect(isDiagramEmpty(emptyDiagram("meio"))).toBe(true);
    expect(isDiagramEmpty(base())).toBe(false);
  });

  it("formationLabel só aparece com as duas equipas", () => {
    expect(formationLabel(base())).toBe("2 vs 1 + 1");
    expect(formationLabel(emptyDiagram("campo"))).toBeNull();
    expect(formationLabel(null)).toBeNull();
  });

  it("usedKinds lista só o que existe, pela ordem fixa", () => {
    expect(usedKinds(base())).toEqual({
      pieces: ["a", "b", "n", "gk"],
      arrows: ["pass"],
      zones: true,
    });
  });

  it("clampToField e changeField mantêm tudo dentro do campo", () => {
    expect(clampToField("quadrado", 999, -3)).toEqual({ x: 400, y: 0 });
    const meio = changeField(base(), "meio");
    expect(meio.field).toBe("meio");
    expect(meio.pieces.every((p) => p.x <= 300 && p.y <= 400)).toBe(true);
    expect(meio.arrows[0]).toMatchObject({ x2: 300, y2: 390 });
    expect(meio.zones[0]).toMatchObject({ x: 300, w: 0 });
  });
});

describe("arrowGeometry", () => {
  it("seta sem comprimento não desenha nada", () => {
    expect(arrowGeometry({ kind: "run", x1: 5, y1: 5, x2: 5, y2: 5 }, 1)).toBeNull();
  });

  it("a ponta fica no destino e a linha termina antes dela", () => {
    const g = arrowGeometry({ kind: "run", x1: 0, y1: 0, x2: 100, y2: 0 }, 1)!;
    expect(g.head.startsWith("100,0")).toBe(true);
    expect(g.line).toBe("M0 0 L87.2 0");
  });

  it("a condução é uma linha ondulada (muitos pontos)", () => {
    const g = arrowGeometry({ kind: "dribble", x1: 0, y1: 0, x2: 100, y2: 0 }, 1)!;
    expect(g.line.split("L").length).toBeGreaterThan(20);
  });
});
