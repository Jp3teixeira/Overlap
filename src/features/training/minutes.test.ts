import { describe, expect, it } from "vitest";
import { sumMinutes, timeBarSegments } from "./minutes";

const brief = [
  { id: "a", duration_min: 5 }, // Aquecimento
  { id: "b", duration_min: 10 }, // Jogo do Galo
  { id: "c", duration_min: 15 }, // 1x1 + Transição
  { id: "d", duration_min: 15 }, // Holandês 4x4+3
  { id: "e", duration_min: 15 }, // Jogo final
];

describe("sumMinutes", () => {
  it("soma as durações do treino do brief (60 min)", () => {
    expect(sumMinutes(brief)).toBe(60);
  });
  it("treino vazio = 0", () => {
    expect(sumMinutes([])).toBe(0);
  });
});

describe("timeBarSegments", () => {
  it("abaixo do alvo deixa espaço vazio", () => {
    const r = timeBarSegments(brief.slice(0, 3), 60);
    expect(r.total).toBe(30);
    expect(r.segments.reduce((s, x) => s + x.widthPct, 0)).toBeCloseTo(50);
    expect(r.overBy).toBe(0);
  });
  it("acima do alvo enche a barra e indica o excesso", () => {
    const r = timeBarSegments(brief, 45);
    expect(r.segments.reduce((s, x) => s + x.widthPct, 0)).toBeCloseTo(100);
    expect(r.overBy).toBe(15);
  });
  it("os tons ciclam de 1 a 4 pela ordem", () => {
    expect(timeBarSegments(brief, 60).segments.map((s) => s.tone)).toEqual([1, 2, 3, 4, 1]);
  });
  it("sem itens e sem alvo não rebenta", () => {
    expect(timeBarSegments([], null).segments).toEqual([]);
  });
});
