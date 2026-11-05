import { describe, expect, it } from "vitest";
import {
  convocados,
  elapsedSeconds,
  emptyLive,
  formatClock,
  goals,
  liveReducer,
  liveSchema,
  minutesLabel,
  playerSeconds,
  score,
  teamStats,
  type LiveAction,
  type LiveState,
} from "./live";

const ids = Array.from({ length: 10 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
const MIN = 60_000;

function run(state: LiveState, ...actions: LiveAction[]) {
  return actions.reduce(liveReducer, state);
}

/** 7 no campo (ids 0–6), 3 no banco (7–9). */
function ready(): LiveState {
  let s = emptyLive();
  for (let i = 0; i < 7; i++) s = liveReducer(s, { type: "assign", slot: i, playerId: ids[i] });
  for (let i = 7; i < 10; i++) s = liveReducer(s, { type: "addBench", playerId: ids[i] });
  return s;
}

describe("convocatória", () => {
  it("não arranca sem 7 no campo", () => {
    const s = run(emptyLive(), { type: "kickoff", now: 0 });
    expect(s.status).toBe("setup");
  });

  it("um jogador só pode estar num sítio", () => {
    let s = ready();
    s = liveReducer(s, { type: "assign", slot: 0, playerId: ids[8] }); // sobe do banco
    expect(s.slots[0]).toBe(ids[8]);
    expect(s.bench).not.toContain(ids[8]);
    s = liveReducer(s, { type: "assign", slot: 3, playerId: ids[8] }); // muda de slot
    expect(s.slots[0]).toBeNull();
    expect(s.slots[3]).toBe(ids[8]);
    s = liveReducer(s, { type: "addBench", playerId: ids[8] }); // volta ao banco
    expect(s.slots[3]).toBeNull();
    expect(s.bench).toContain(ids[8]);
  });

  it("arranca com os titulares guardados e o relógio a andar", () => {
    const s = run(ready(), { type: "kickoff", now: 1000 });
    expect(s.status).toBe("running");
    expect(s.starters).toEqual(s.slots);
    expect(elapsedSeconds(s, 1000 + 90_000)).toBe(90);
  });
});

describe("relógio", () => {
  it("a pausa e o intervalo não contam", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "pause", now: 10 * MIN },
      { type: "resume", now: 12 * MIN }, // 2 min parado
      { type: "endPeriod", now: 17 * MIN }, // 15 min de jogo
      { type: "startSecondHalf", now: 40 * MIN }, // intervalo longo
    );
    expect(s.status).toBe("running");
    expect(s.period).toBe(2);
    expect(elapsedSeconds(s, 40 * MIN)).toBe(15 * 60);
    expect(elapsedSeconds(s, 45 * MIN)).toBe(20 * 60);
  });

  it("formata", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(754)).toBe("12:34");
    expect(minutesLabel(749)).toBe("12′");
    expect(minutesLabel(751)).toBe("13′");
  });
});

describe("substituições e minutos", () => {
  it("conta os minutos de quem saiu e de quem entrou", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "sub", now: 10 * MIN, id: "a", slot: 2, inId: ids[7] }, // sai 2, entra 7 aos 10'
      { type: "finish", now: 20 * MIN },
    );
    const sec = playerSeconds(s, 20 * MIN);
    expect(sec[ids[2]]).toBe(10 * 60);
    expect(sec[ids[7]]).toBe(10 * 60);
    expect(sec[ids[0]]).toBe(20 * 60);
    expect(sec[ids[9]]).toBe(0);
    const total = Object.values(sec).reduce((a, b) => a + b, 0);
    expect(total).toBe(7 * 20 * 60); // sempre 7 em campo
  });

  it("um jogador pode sair e voltar a entrar", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "sub", now: 5 * MIN, id: "a", slot: 1, inId: ids[7] },
      { type: "sub", now: 10 * MIN, id: "b", slot: 1, inId: ids[1] },
      { type: "finish", now: 15 * MIN },
    );
    const sec = playerSeconds(s, 15 * MIN);
    expect(sec[ids[1]]).toBe(5 * 60 + 5 * 60);
    expect(sec[ids[7]]).toBe(5 * 60);
  });

  it("só entra quem está no banco, e o campo tem de ter alguém", () => {
    const s = run(ready(), { type: "kickoff", now: 0 });
    expect(liveReducer(s, { type: "sub", now: 1, id: "x", slot: 0, inId: ids[3] })).toBe(s);
  });

  it("desfazer reverte a substituição", () => {
    const base = run(ready(), { type: "kickoff", now: 0 });
    const s = run(
      base,
      { type: "sub", now: MIN, id: "a", slot: 2, inId: ids[7] },
      { type: "undo" },
    );
    expect(s.slots).toEqual(base.slots);
    expect([...s.bench].sort()).toEqual([...base.bench].sort());
    expect(s.events).toHaveLength(0);
  });
});

describe("golos e estatísticas", () => {
  it("o resultado sai dos golos", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "record", now: MIN, id: "g1", event: { type: "goal", side: "us", playerId: ids[6] } },
      {
        type: "record",
        now: 2 * MIN,
        id: "g2",
        event: { type: "goal", side: "them", playerId: null },
      },
      {
        type: "record",
        now: 3 * MIN,
        id: "g3",
        event: { type: "goal", side: "us", playerId: null },
      },
    );
    expect(score(s)).toEqual({ us: 2, them: 1 });
    expect(goals(s)[0]).toMatchObject({ side: "us", playerId: ids[6], t: 60 });
  });

  it("um remate à baliza também conta como remate", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "record", now: 1, id: "a", event: { type: "shot", side: "us", onTarget: true } },
      { type: "record", now: 2, id: "b", event: { type: "shot", side: "us", onTarget: false } },
      { type: "record", now: 3, id: "c", event: { type: "corner", side: "them" } },
    );
    const st = teamStats(s);
    expect(st.shots.us).toBe(2);
    expect(st.onTarget.us).toBe(1);
    expect(st.corner.them).toBe(1);
  });

  it("o '−' tira o último igual e respeita remate fora/à baliza", () => {
    let s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "record", now: 1, id: "a", event: { type: "shot", side: "us", onTarget: true } },
      { type: "record", now: 2, id: "b", event: { type: "shot", side: "us", onTarget: false } },
      { type: "record", now: 3, id: "c", event: { type: "foul", side: "us" } },
    );
    s = liveReducer(s, { type: "unrecord", event: { type: "shot", side: "us", onTarget: true } });
    expect(teamStats(s).onTarget.us).toBe(0);
    expect(teamStats(s).shots.us).toBe(1);
    expect(teamStats(s).foul.us).toBe(1);
  });

  it("não regista nada antes do jogo nem depois de terminar", () => {
    const pre = ready();
    const ev = { type: "record", now: 1, id: "a", event: { type: "corner", side: "us" } } as const;
    expect(liveReducer(pre, ev)).toBe(pre);
    const done = run(pre, { type: "kickoff", now: 0 }, { type: "finish", now: MIN });
    expect(liveReducer(done, ev)).toBe(done);
    expect(run(done, { type: "reopen" }).status).toBe("paused");
  });
});

describe("persistência", () => {
  it("o estado completo passa no schema e dá o mesmo resultado", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 5 },
      { type: "record", now: 9, id: "g1", event: { type: "goal", side: "us", playerId: ids[6] } },
      { type: "sub", now: 2 * MIN, id: "s1", slot: 2, inId: ids[7] },
      { type: "endPeriod", now: 5 * MIN },
    );
    const parsed = liveSchema.parse(JSON.parse(JSON.stringify(s)));
    expect(parsed).toEqual(s);
    expect(convocados(parsed).sort()).toEqual(ids.slice().sort());
  });

  it("rejeita um jogador repetido", () => {
    const s = ready();
    const bad = { ...s, bench: [...s.bench, ids[0]] };
    expect(liveSchema.safeParse(bad).success).toBe(false);
  });
});
