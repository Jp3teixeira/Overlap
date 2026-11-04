import { describe, expect, it } from "vitest";
import { addDays, formatDayLong, formatDayShort, formatTime, seasonOf, todayISO } from "./dates";

describe("dates", () => {
  it("formatDayShort em pt-PT sem pontos", () => {
    expect(formatDayShort("2026-11-05")).toBe("qui, 5 nov");
    expect(formatDayShort("2026-11-04")).toBe("qua, 4 nov");
  });
  it("formatDayLong sem '-feira'", () => {
    expect(formatDayLong("2026-11-04")).toBe("Quarta, 4 nov");
    expect(formatDayLong("2026-11-08")).toBe("Domingo, 8 nov");
  });
  it("todayISO usa o fuso de Lisboa", () => {
    // 23:30 UTC de 31 jul = 00:30 de 1 ago em Lisboa (verão, UTC+1)
    expect(todayISO(new Date("2026-07-31T23:30:00Z"))).toBe("2026-08-01");
    // inverno: Lisboa = UTC
    expect(todayISO(new Date("2026-11-04T23:30:00Z"))).toBe("2026-11-04");
  });
  it("seasonOf: julho a junho", () => {
    expect(seasonOf("2026-11-08")).toBe("2026/27");
    expect(seasonOf("2027-06-30")).toBe("2026/27");
    expect(seasonOf("2027-07-01")).toBe("2027/28");
    expect(seasonOf("2099-09-01")).toBe("2099/00");
  });
  it("formatTime corta os segundos", () => {
    expect(formatTime("19:15:00")).toBe("19:15");
    expect(formatTime(null)).toBe("");
  });

  it("addDays soma dias, passa de mês e de ano, e aceita negativos", () => {
    expect(addDays("2026-11-08", 7)).toBe("2026-11-15");
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
