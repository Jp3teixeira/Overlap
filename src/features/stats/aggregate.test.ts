import { describe, expect, it } from "vitest";
import { emptyLive, liveReducer, type LiveAction, type LiveState } from "@/features/matches/live";
import { minutesPerGame, summarize, type StatsMatch, type StatsPlayer } from "./aggregate";
import { EMPTY_BASE, saveStatsBaseSchema } from "./schemas";

const ids = Array.from({ length: 10 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
const MIN = 60_000;

const player = (i: number, base = EMPTY_BASE): StatsPlayer => ({
  id: ids[i],
  name: `Jogador ${i}`,
  shirt_number: i + 1,
  positions: [],
  is_active: true,
  photo_url: null,
  base,
});
const squad = () => ids.map((_, i) => player(i));

function started(): LiveState {
  const actions: LiveAction[] = [];
  for (let i = 0; i < 7; i++) actions.push({ type: "assign", slot: i, playerId: ids[i] });
  for (let i = 7; i < 10; i++) actions.push({ type: "addBench", playerId: ids[i] });
  actions.push({ type: "kickoff", now: 0 });
  return actions.reduce(liveReducer, emptyLive());
}

/** Jogo de 10 min: o 7 entra para o lugar do 2 aos 4 min; golo do 6 com assistência do 3; 2 remates. */
function finishedLive(): LiveState {
  return (
    [
      { type: "sub", now: 4 * MIN, id: "s1", slot: 2, inId: ids[7] },
      {
        type: "record",
        now: 5 * MIN,
        id: "g1",
        event: { type: "goal", side: "us", playerId: ids[6], assistId: ids[2] },
      },
      {
        type: "record",
        now: 6 * MIN,
        id: "g2",
        event: { type: "goal", side: "them", playerId: null },
      },
      {
        type: "record",
        now: 6 * MIN,
        id: "a",
        event: { type: "shot", side: "us", onTarget: true },
      },
      {
        type: "record",
        now: 6 * MIN,
        id: "b",
        event: { type: "shot", side: "us", onTarget: false },
      },
      { type: "record", now: 6 * MIN, id: "c", event: { type: "corner", side: "them" } },
      { type: "finish", now: 10 * MIN },
    ] satisfies LiveAction[]
  ).reduce(liveReducer, started());
}

const match = (over: Partial<StatsMatch> & { id: string }): StatsMatch => ({
  match_date: "2026-11-01",
  opponent: "Rivais",
  goals_for: null,
  goals_against: null,
  live: null,
  ...over,
});

describe("equipa", () => {
  it("conta vitórias, empates, derrotas e golos só dos jogos com resultado", () => {
    const { team } = summarize(
      [
        match({ id: "a", match_date: "2026-10-01", goals_for: 3, goals_against: 1 }),
        match({ id: "b", match_date: "2026-10-08", goals_for: 2, goals_against: 2 }),
        match({ id: "c", match_date: "2026-10-15", goals_for: 0, goals_against: 1 }),
        match({ id: "d", match_date: "2026-11-20" }), // sem resultado
      ],
      [],
    );
    expect(team).toMatchObject({
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsFor: 5,
      goalsAgainst: 4,
    });
  });

  it("a forma são os últimos 5, do mais antigo para o mais recente", () => {
    const results: [number, number][] = [
      [1, 0], // V (fora dos últimos 5)
      [0, 1], // D
      [1, 1], // E
      [2, 0], // V
      [0, 3], // D
      [4, 1], // V
    ];
    const { team } = summarize(
      results.map(([gf, ga], i) =>
        match({ id: `m${i}`, match_date: `2026-10-0${i + 1}`, goals_for: gf, goals_against: ga }),
      ),
      [],
    );
    expect(team.form).toEqual(["D", "E", "V", "D", "V"]);
  });

  it("as médias só vêm de jogos ao vivo terminados", () => {
    const live = finishedLive();
    const { team } = summarize(
      [
        match({ id: "a", goals_for: 1, goals_against: 1, live }),
        match({ id: "b", goals_for: 2, goals_against: 0 }), // sem registo ao vivo
      ],
      squad(),
    );
    expect(team.liveGames).toBe(1);
    expect(team.averages?.shots).toEqual({ us: 2, them: 0 });
    expect(team.averages?.onTarget.us).toBe(1);
    expect(team.averages?.corner.them).toBe(1);
  });

  it("sem jogos ao vivo não há médias", () => {
    expect(
      summarize([match({ id: "a", goals_for: 1, goals_against: 0 })], []).team.averages,
    ).toBeNull();
  });
});

describe("jogos ao vivo por terminar", () => {
  it("não contam e aparecem em 'pending'", () => {
    const running = liveReducer(started(), {
      type: "record",
      now: MIN,
      id: "g",
      event: { type: "goal", side: "us", playerId: ids[6], assistId: null },
    });
    const { players, pending, team } = summarize(
      [match({ id: "x", opponent: "Amigos FC", live: running })],
      squad(),
    );
    expect(pending).toEqual([{ id: "x", opponent: "Amigos FC" }]);
    expect(team.liveGames).toBe(0);
    expect(players.every((p) => p.games === 0 && p.goals === 0)).toBe(true);
  });
});

describe("jogadores", () => {
  const { players } = summarize([match({ id: "a", live: finishedLive() })], squad());
  const line = (i: number) => players.find((p) => p.id === ids[i])!;

  it("jogos: convocados contam, os que ficaram de fora do jogo não", () => {
    expect(line(0).games).toBe(1);
    expect(line(7).games).toBe(1); // entrou do banco
    expect(line(8).games).toBe(1); // ficou no banco, estava convocado
  });

  it("minutos saem das substituições", () => {
    expect(line(2).seconds).toBe(4 * 60); // saiu aos 4
    expect(line(7).seconds).toBe(6 * 60); // entrou aos 4, jogo de 10
    expect(line(0).seconds).toBe(10 * 60);
    expect(line(8).seconds).toBe(0);
  });

  it("golos e assistências vão para quem os fez", () => {
    expect(line(6).goals).toBe(1);
    expect(line(2).assists).toBe(1);
    expect(line(2).goals).toBe(0);
    expect(players.reduce((s, p) => s + p.goals, 0)).toBe(1); // o golo deles não conta a ninguém
  });

  it("os valores de base somam-se ao que vem dos jogos", () => {
    const withBase = squad();
    withBase[6] = player(6, { games: 3, minutes: 90, goals: 4, assists: 2 });
    const { players: p } = summarize([match({ id: "a", live: finishedLive() })], withBase);
    const l = p.find((x) => x.id === ids[6])!;
    expect(l).toMatchObject({ games: 4, goals: 5, assists: 2 });
    expect(l.seconds).toBe(90 * 60 + 10 * 60);
  });

  it("a base conta mesmo sem nenhum jogo ao vivo", () => {
    const withBase = [player(1, { games: 2, minutes: 40, goals: 1, assists: 0 })];
    const { players: p } = summarize([], withBase);
    expect(p[0]).toMatchObject({ games: 2, seconds: 2400, goals: 1 });
  });

  it("minutos por jogo", () => {
    expect(minutesPerGame({ games: 0, seconds: 0 })).toBe(0);
    expect(minutesPerGame({ games: 3, seconds: 3 * 60 * 14 })).toBe(14);
  });
});

describe("valores de base (schema)", () => {
  const row = { player_id: ids[0], games: 2, minutes: 40, goals: 1, assists: 0 };

  it("aceita linhas válidas", () => {
    expect(saveStatsBaseSchema.safeParse({ players: [row] }).success).toBe(true);
  });

  it("rejeita negativos, decimais e jogadores repetidos", () => {
    expect(saveStatsBaseSchema.safeParse({ players: [{ ...row, goals: -1 }] }).success).toBe(false);
    expect(saveStatsBaseSchema.safeParse({ players: [{ ...row, games: 1.5 }] }).success).toBe(
      false,
    );
    expect(saveStatsBaseSchema.safeParse({ players: [row, row] }).success).toBe(false);
  });
});
