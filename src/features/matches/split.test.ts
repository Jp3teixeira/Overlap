import { describe, expect, it } from "vitest";
import { isPlayed, needsResult, splitMatches } from "./split";

const m = (
  match_date: string,
  goals_for: number | null = null,
  kickoff_time: string | null = null,
) => ({
  match_date,
  goals_for,
  kickoff_time,
});

describe("splitMatches", () => {
  const today = "2026-11-08";

  it("jogo de hoje sem resultado ainda é próximo", () => {
    expect(isPlayed(m("2026-11-08"), today)).toBe(false);
  });

  it("com resultado é realizado, mesmo que a data seja futura", () => {
    expect(isPlayed(m("2026-11-20", 2), today)).toBe(true);
  });

  it("data passada sem resultado é realizado e pede resultado", () => {
    expect(isPlayed(m("2026-11-01"), today)).toBe(true);
    expect(needsResult(m("2026-11-01"), today)).toBe(true);
    expect(needsResult(m("2026-11-01", 0), today)).toBe(false);
    expect(needsResult(m("2026-11-08"), today)).toBe(false);
  });

  it("ordena próximos por data e hora, realizados do mais recente para o mais antigo", () => {
    const { upcoming, played } = splitMatches(
      [
        m("2026-11-22"),
        m("2026-11-08", null, "11:30"),
        m("2026-11-08", null, "09:00"),
        m("2026-11-08"),
        m("2026-10-25", 1),
        m("2026-11-01", 3),
      ],
      today,
    );
    expect(upcoming.map((x) => `${x.match_date} ${x.kickoff_time ?? "-"}`)).toEqual([
      "2026-11-08 09:00",
      "2026-11-08 11:30",
      "2026-11-08 -",
      "2026-11-22 -",
    ]);
    expect(played.map((x) => x.match_date)).toEqual(["2026-11-01", "2026-10-25"]);
  });
});
