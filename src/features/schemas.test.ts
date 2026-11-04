import { describe, expect, it } from "vitest";
import { fromZodError } from "@/lib/action-result";
import { exerciseSchema } from "./exercises/schemas";
import {
  matchAnalysisSchema,
  matchBulkSchema,
  matchResultSchema,
  matchSchema,
} from "./matches/schemas";
import { observationSchema } from "./observations/schemas";
import { playerSchema } from "./players/schemas";
import { reorderSchema, sessionItemSchema, sessionSchema } from "./training/schemas";

const id = "a0000000-0000-4000-8000-000000000001";

describe("playerSchema", () => {
  it("aceita o mínimo (só o nome) e converte vazios em null", () => {
    const r = playerSchema.parse({
      name: "  Jogador 7  ",
      shirt_number: "",
      birth_year: "",
      current_focus: "",
    });
    expect(r).toEqual({
      name: "Jogador 7",
      shirt_number: null,
      birth_year: null,
      positions: [],
      dominant_foot: null,
      current_focus: null,
    });
  });
  it("converte números vindos do formulário e tira posições repetidas", () => {
    const r = playerSchema.parse({
      name: "X",
      shirt_number: "7",
      birth_year: "2016",
      positions: ["extremo", "medio", "extremo"],
    });
    expect(r.shirt_number).toBe(7);
    expect(r.birth_year).toBe(2016);
    expect(r.positions).toEqual(["extremo", "medio"]);
  });
  it("rejeita nome vazio e número fora de 1–99, com mensagens em PT", () => {
    const r = playerSchema.safeParse({ name: "   ", shirt_number: "100" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const res = fromZodError(r.error);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.fieldErrors?.name?.[0]).toBe("Escreve o nome do jogador.");
        expect(res.fieldErrors?.shirt_number?.[0]).toBe("O número tem de estar entre 1 e 99.");
      }
    }
  });
  it("rejeita posições que não existem", () => {
    expect(playerSchema.safeParse({ name: "X", positions: ["libero"] }).success).toBe(false);
  });
});

describe("observationSchema", () => {
  it("aceita jogador + texto, ligações vazias ficam null", () => {
    const r = observationSchema.parse({
      player_id: id,
      body: " Boa intensidade no 1x1. ",
      match_id: "",
    });
    expect(r).toMatchObject({
      body: "Boa intensidade no 1x1.",
      training_session_id: null,
      match_id: null,
    });
  });
  it("rejeita texto vazio e ids inválidos", () => {
    expect(observationSchema.safeParse({ player_id: id, body: "  " }).success).toBe(false);
    expect(observationSchema.safeParse({ player_id: "x", body: "ok" }).success).toBe(false);
  });
});

describe("matchSchema", () => {
  it("aplica os valores por defeito", () => {
    const r = matchSchema.parse({ match_date: "2026-11-08", opponent: "FC Infesta" });
    expect(r).toMatchObject({
      kind: "oficial",
      venue: "casa",
      kickoff_time: null,
      zerozero_url: null,
    });
  });
  it("só aceita links https e horas HH:MM", () => {
    expect(
      matchSchema.safeParse({ match_date: "2026-11-08", opponent: "X", video_url: "http://x.pt" })
        .success,
    ).toBe(false);
    expect(
      matchSchema.safeParse({ match_date: "2026-11-08", opponent: "X", kickoff_time: "25:00" })
        .success,
    ).toBe(false);
    expect(
      matchSchema.safeParse({ match_date: "2026-11-08", opponent: "X", kickoff_time: "11:30" })
        .success,
    ).toBe(true);
  });
  it("rejeita datas inválidas", () => {
    expect(matchSchema.safeParse({ match_date: "2026-02-30", opponent: "X" }).success).toBe(false);
  });
  it("adicionar vários: 1 a 40 linhas", () => {
    expect(matchBulkSchema.safeParse([]).success).toBe(false);
    expect(
      matchBulkSchema.parse([{ match_date: "2026-11-15", opponent: "UD Beiriz", venue: "fora" }]),
    ).toHaveLength(1);
  });
  it("resultado exige os dois golos; análise aceita campos vazios", () => {
    expect(matchResultSchema.safeParse({ goals_for: "3" }).success).toBe(false);
    expect(matchResultSchema.parse({ goals_for: "3", goals_against: "1" })).toEqual({
      goals_for: 3,
      goals_against: 1,
    });
    expect(
      matchAnalysisSchema.parse({ went_well: "Reação à perda", went_badly: "" }),
    ).toMatchObject({
      went_well: "Reação à perda",
      went_badly: null,
    });
  });
});

describe("exerciseSchema", () => {
  it("só exige nome e uma etiqueta", () => {
    const r = exerciseSchema.parse({ name: "Jogo do Galo", tags: ["aquecimento"] });
    expect(r.description).toBeNull();
    expect(r.tags).toEqual(["aquecimento"]);
  });
  it("rejeita sem etiquetas", () => {
    const r = exerciseSchema.safeParse({ name: "X", tags: [] });
    expect(r.success).toBe(false);
  });
  it("mínimo de jogadores não pode passar o máximo", () => {
    const r = exerciseSchema.safeParse({
      name: "X",
      tags: ["posse"],
      min_players: "10",
      max_players: "8",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["max_players"]);
  });
});

describe("training schemas", () => {
  it("treino: só a data é obrigatória", () => {
    expect(sessionSchema.parse({ session_date: "2026-11-05" })).toMatchObject({
      target_duration_min: null,
      start_time: null,
    });
  });
  it("item: exercício da biblioteca ou título livre, nunca nenhum", () => {
    expect(sessionItemSchema.safeParse({ session_id: id, duration_min: "15" }).success).toBe(false);
    expect(
      sessionItemSchema.safeParse({
        session_id: id,
        custom_title: "Jogo final",
        duration_min: "15",
      }).success,
    ).toBe(true);
    expect(
      sessionItemSchema.safeParse({ session_id: id, exercise_id: id, duration_min: 0 }).success,
    ).toBe(false);
  });
  it("reordenar precisa de pelo menos um item", () => {
    expect(reorderSchema.safeParse({ session_id: id, item_ids: [] }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normaliza o email e explica o que falta", async () => {
    const { loginSchema } = await import("./auth/schemas");
    expect(loginSchema.parse({ email: " Treinador@Exemplo.PT ", password: "x" }).email).toBe(
      "treinador@exemplo.pt",
    );
    const r = loginSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("Escreve o email.");
      expect(msgs).toContain("Escreve a password.");
    }
  });
});
