import { describe, expect, it } from "vitest";
import {
  mergeMaterial,
  suggestedMinutes,
  sumMinutes,
  targetNote,
  timeBarSegments,
} from "./minutes";
import { needsClosing, splitSessions } from "./split";

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

describe("suggestedMinutes", () => {
  it("duração × séries + descansos entre séries", () => {
    expect(suggestedMinutes(3, 3, 30)).toBe(10); // 9 + 2 × 0,5
    expect(suggestedMinutes(10, null, null)).toBe(10);
    expect(suggestedMinutes(8, 1, 60)).toBe(8);
  });
  it("sem duração sugere 10 e respeita os limites", () => {
    expect(suggestedMinutes(null, 3, 30)).toBe(10);
    expect(suggestedMinutes(100, 5, null)).toBe(120);
  });
});

describe("targetNote", () => {
  it("diz quanto falta ou quanto passa", () => {
    expect(targetNote(45, 60)).toBe("Faltam 15 min");
    expect(targetNote(70, 60)).toBe("Passa 10 min");
    expect(targetNote(60, 60)).toBe("No alvo");
    expect(targetNote(0, 60)).toBeNull();
    expect(targetNote(30, null)).toBeNull();
  });
});

describe("mergeMaterial", () => {
  it("junta sem repetidos, ignorando maiúsculas, e fica com a maior quantidade", () => {
    expect(
      mergeMaterial(["8 cones, 2 mini-balizas e coletes", "6 Cones; Coletes", null, "bolas."]),
    ).toEqual(["8 cones", "2 mini-balizas", "coletes", "bolas"]);
  });
  it("sem material devolve lista vazia", () => {
    expect(mergeMaterial([null, "", "  "])).toEqual([]);
  });
  it("aceita '10x cones'", () => {
    expect(mergeMaterial(["10x cones"])).toEqual(["10 cones"]);
  });
});

describe("splitSessions", () => {
  const s = (
    session_date: string,
    status: "planeado" | "realizado" | "cancelado",
    start_time: string | null = null,
  ) => ({
    session_date,
    start_time,
    status,
  });
  const list = [
    s("2026-11-03", "realizado"),
    s("2026-11-10", "planeado"),
    s("2026-11-05", "planeado", "19:00"),
    s("2026-11-05", "planeado", "18:00"),
    s("2026-11-02", "planeado"),
    s("2026-11-12", "cancelado"),
  ];
  it("próximos: planeados de hoje em diante, por data e hora", () => {
    const { upcoming } = splitSessions(list, "2026-11-04");
    expect(upcoming.map((x) => `${x.session_date} ${x.start_time}`)).toEqual([
      "2026-11-05 18:00",
      "2026-11-05 19:00",
      "2026-11-10 null",
    ]);
  });
  it("histórico: o resto, do mais recente para o mais antigo", () => {
    const { history } = splitSessions(list, "2026-11-04");
    expect(history.map((x) => x.session_date)).toEqual(["2026-11-12", "2026-11-03", "2026-11-02"]);
  });
  it("needsClosing: planeado com data passada", () => {
    expect(needsClosing(s("2026-11-02", "planeado"), "2026-11-04")).toBe(true);
    expect(needsClosing(s("2026-11-04", "planeado"), "2026-11-04")).toBe(false);
    expect(needsClosing(s("2026-11-02", "realizado"), "2026-11-04")).toBe(false);
  });
});
