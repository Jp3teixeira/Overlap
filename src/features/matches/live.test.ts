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
  playerStats,
  referencedPlayerIds,
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

describe("trocas de posição", () => {
  const started = () => run(ready(), { type: "kickoff", now: 0 });

  it("troca os dois jogadores de lugar sem mexer no banco nem nos minutos", () => {
    const s = run(
      started(),
      { type: "swap", now: 5 * MIN, id: "w", a: 1, b: 5 },
      { type: "finish", now: 10 * MIN },
    );
    expect(s.slots[1]).toBe(ids[5]);
    expect(s.slots[5]).toBe(ids[1]);
    expect([...s.bench].sort()).toEqual(ids.slice(7).sort());
    const sec = playerSeconds(s, 10 * MIN);
    for (let i = 0; i < 7; i++) expect(sec[ids[i]]).toBe(10 * 60);
    expect(s.events.at(-1)).toMatchObject({ type: "swap", a: 1, b: 5, aId: ids[1], bId: ids[5] });
  });

  it("ignora trocas inválidas", () => {
    const s = started();
    expect(liveReducer(s, { type: "swap", now: 1, id: "x", a: 2, b: 2 })).toBe(s);
    expect(liveReducer(s, { type: "swap", now: 1, id: "x", a: 2, b: 9 })).toBe(s);
    expect(liveReducer(ready(), { type: "swap", now: 1, id: "x", a: 1, b: 2 }).events).toHaveLength(
      0,
    );
  });

  it("o guarda-redes também pode trocar", () => {
    const s = run(started(), { type: "swap", now: MIN, id: "w", a: 0, b: 6 });
    expect(s.slots[0]).toBe(ids[6]);
    expect(s.slots[6]).toBe(ids[0]);
  });

  it("desfazer repõe as posições", () => {
    const base = started();
    const s = run(base, { type: "swap", now: MIN, id: "w", a: 1, b: 2 }, { type: "undo" });
    expect(s.slots).toEqual(base.slots);
    expect(s.events).toHaveLength(0);
  });

  it("não desfaz se uma substituição mexeu entretanto num dos dois", () => {
    const s = run(
      started(),
      { type: "swap", now: MIN, id: "w", a: 1, b: 2 },
      { type: "sub", now: 2 * MIN, id: "s", slot: 1, inId: ids[7] },
      { type: "undo" }, // desfaz a substituição
      { type: "undo" }, // desfaz a troca
    );
    expect(s.slots).toEqual(ready().slots);
  });

  it("o estado com trocas continua a validar e a referir os jogadores", () => {
    const s = run(started(), { type: "swap", now: MIN, id: "w", a: 1, b: 2 });
    expect(liveSchema.safeParse(JSON.parse(JSON.stringify(s))).success).toBe(true);
    expect(referencedPlayerIds(s)).toEqual(expect.arrayContaining([ids[1], ids[2]]));
  });
});

describe("editar depois do jogo", () => {
  /** Jogo de 20' com 2 golos nossos (ids 1 e 2) e um deles. */
  function finished(): LiveState {
    return run(
      ready(),
      { type: "kickoff", now: 0 },
      {
        type: "record",
        now: 4 * MIN,
        id: "g1",
        event: { type: "goal", side: "us", playerId: ids[1], assistId: ids[2] },
      },
      {
        type: "record",
        now: 8 * MIN,
        id: "g2",
        event: { type: "goal", side: "them", playerId: null },
      },
      {
        type: "record",
        now: 12 * MIN,
        id: "g3",
        event: { type: "goal", side: "us", playerId: ids[2], assistId: null },
      },
      { type: "finish", now: 20 * MIN },
    );
  }

  it("só se edita com o jogo terminado", () => {
    const live = run(ready(), { type: "kickoff", now: 0 });
    for (const a of [
      { type: "editGoal", id: "x", playerId: null, assistId: null },
      { type: "removeGoal", id: "x" },
      { type: "addGoal", id: "x", side: "us", playerId: null, assistId: null, seconds: 10 },
      { type: "setMinutes", playerId: ids[0], seconds: 60 },
    ] as const) {
      expect(liveReducer(live, a)).toBe(live);
    }
  });

  it("muda o marcador e a assistência de um golo", () => {
    const s = liveReducer(finished(), {
      type: "editGoal",
      id: "g1",
      playerId: ids[3],
      assistId: ids[4],
    });
    expect(goals(s)[0]).toMatchObject({ playerId: ids[3], assistId: ids[4], t: 4 * 60 });
  });

  it("a assistência nunca é do marcador, e um golo deles não tem jogadores", () => {
    const a = liveReducer(finished(), {
      type: "editGoal",
      id: "g1",
      playerId: ids[3],
      assistId: ids[3],
    });
    expect(goals(a)[0].assistId).toBeNull();
    const b = liveReducer(finished(), {
      type: "editGoal",
      id: "g2",
      playerId: ids[3],
      assistId: ids[4],
    });
    expect(goals(b)[1]).toMatchObject({ playerId: null, assistId: null });
  });

  it("não aceita jogadores que não foram convocados", () => {
    const s = finished();
    const stranger = "00000000-0000-4000-8000-0000000000ff";
    expect(liveReducer(s, { type: "editGoal", id: "g1", playerId: stranger, assistId: null })).toBe(
      s,
    );
    expect(
      liveReducer(s, {
        type: "addGoal",
        id: "n",
        side: "us",
        playerId: stranger,
        assistId: null,
        seconds: 60,
      }),
    ).toBe(s);
  });

  it("apagar um golo muda o resultado", () => {
    const s = liveReducer(finished(), { type: "removeGoal", id: "g3" });
    expect(score(s)).toEqual({ us: 1, them: 1 });
  });

  it("acrescenta um golo no minuto certo, por ordem, e limita ao tempo de jogo", () => {
    const s = liveReducer(finished(), {
      type: "addGoal",
      id: "n1",
      side: "us",
      playerId: ids[5],
      assistId: null,
      seconds: 6 * 60,
    });
    expect(goals(s).map((g) => g.id)).toEqual(["g1", "n1", "g2", "g3"]);
    expect(score(s)).toEqual({ us: 3, them: 1 });
    const late = liveReducer(finished(), {
      type: "addGoal",
      id: "n2",
      side: "them",
      playerId: null,
      assistId: null,
      seconds: 999 * 60,
    });
    expect(goals(late).at(-1)).toMatchObject({ id: "n2", t: 20 * 60 });
  });

  it("não repete o id de um evento que já existe", () => {
    const s = finished();
    expect(
      liveReducer(s, {
        type: "addGoal",
        id: "g1",
        side: "us",
        playerId: null,
        assistId: null,
        seconds: 5,
      }),
    ).toBe(s);
  });

  it("aceita contagens (remates, cantos...) depois do jogo e dá para as tirar", () => {
    let s = liveReducer(finished(), {
      type: "record",
      now: 0,
      id: "sh",
      event: { type: "shot", side: "us", onTarget: true },
    });
    s = liveReducer(s, {
      type: "record",
      now: 0,
      id: "co",
      event: { type: "corner", side: "them" },
    });
    expect(teamStats(s).onTarget.us).toBe(3); // 2 golos nossos + 1 remate à baliza
    expect(teamStats(s).corner.them).toBe(1);
    s = liveReducer(s, { type: "unrecord", event: { type: "corner", side: "them" } });
    expect(teamStats(s).corner.them).toBe(0);
  });

  it("corrige os minutos de um jogador e volta atrás", () => {
    let s = liveReducer(finished(), { type: "setMinutes", playerId: ids[9], seconds: 8 * 60 });
    expect(playerSeconds(s, 0)[ids[9]]).toBe(8 * 60);
    expect(playerSeconds(s, 0)[ids[0]]).toBe(20 * 60); // os outros não mudam
    s = liveReducer(s, { type: "setMinutes", playerId: ids[9], seconds: null });
    expect(playerSeconds(s, 0)[ids[9]]).toBe(0);
  });

  it("os minutos corrigidos não passam do tempo de jogo nem ficam negativos", () => {
    const s = liveReducer(finished(), { type: "setMinutes", playerId: ids[0], seconds: 99 * 60 });
    expect(playerSeconds(s, 0)[ids[0]]).toBe(20 * 60);
    const n = liveReducer(finished(), { type: "setMinutes", playerId: ids[0], seconds: -5 });
    expect(playerSeconds(n, 0)[ids[0]]).toBe(0);
  });

  it("só se corrigem minutos de convocados", () => {
    const s = finished();
    const stranger = "00000000-0000-4000-8000-0000000000ff";
    expect(liveReducer(s, { type: "setMinutes", playerId: stranger, seconds: 60 })).toBe(s);
  });

  it("reabrir o jogo volta a calcular os minutos pelas substituições", () => {
    const edited = liveReducer(finished(), {
      type: "setMinutes",
      playerId: ids[0],
      seconds: 5 * 60,
    });
    const reopened = liveReducer(edited, { type: "reopen" });
    expect(reopened.secondsOverride).toEqual({});
    expect(playerSeconds(reopened, 20 * MIN)[ids[0]]).toBe(20 * 60);
  });

  it("jogos guardados antes disto continuam a abrir", () => {
    const old = JSON.parse(JSON.stringify(finished()));
    delete old.secondsOverride;
    const parsed = liveSchema.safeParse(old);
    expect(parsed.success && parsed.data.secondsOverride).toEqual({});
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

  it("guarda a assistência de um golo nosso", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      {
        type: "record",
        now: MIN,
        id: "g1",
        event: { type: "goal", side: "us", playerId: ids[6], assistId: ids[2] },
      },
    );
    expect(goals(s)[0]).toMatchObject({ playerId: ids[6], assistId: ids[2] });
    expect(referencedPlayerIds(s)).toContain(ids[2]);
  });

  it("ignora assistências que não fazem sentido", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      // do próprio marcador
      {
        type: "record",
        now: 1,
        id: "a",
        event: { type: "goal", side: "us", playerId: ids[6], assistId: ids[6] },
      },
      // sem marcador
      {
        type: "record",
        now: 2,
        id: "b",
        event: { type: "goal", side: "us", playerId: null, assistId: ids[2] },
      },
      // golo deles
      {
        type: "record",
        now: 3,
        id: "c",
        event: { type: "goal", side: "them", playerId: null, assistId: ids[2] },
      },
      // sem assistência indicada
      { type: "record", now: 4, id: "d", event: { type: "goal", side: "us", playerId: ids[1] } },
    );
    expect(goals(s).map((g) => g.assistId)).toEqual([null, null, null, null]);
  });

  it("jogos guardados antes das assistências continuam válidos", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      { type: "record", now: 1, id: "a", event: { type: "goal", side: "us", playerId: ids[1] } },
    );
    const old = JSON.parse(JSON.stringify(s));
    delete old.events[0].assistId;
    const parsed = liveSchema.parse(old);
    expect(goals(parsed)[0].assistId).toBeNull();
  });

  it("desfazer tira o golo com a assistência", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0 },
      {
        type: "record",
        now: 1,
        id: "a",
        event: { type: "goal", side: "us", playerId: ids[1], assistId: ids[2] },
      },
      { type: "undo" },
    );
    expect(goals(s)).toHaveLength(0);
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

  it("não regista nada antes do jogo (depois de terminar só serve para corrigir)", () => {
    const pre = ready();
    const ev = { type: "record", now: 1, id: "a", event: { type: "corner", side: "us" } } as const;
    expect(liveReducer(pre, ev)).toBe(pre);
    const done = run(pre, { type: "kickoff", now: 0 }, { type: "finish", now: MIN });
    expect(teamStats(liveReducer(done, ev)).corner.us).toBe(1);
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

describe("registar a ver o vídeo", () => {
  const rec = (
    id: string,
    event: Extract<LiveAction, { type: "record" }>["event"],
    now = 0,
  ): LiveAction => ({
    type: "record",
    now,
    id,
    event,
  });

  it("pode começar com o relógio parado e o minuto põe-se à mão", () => {
    let s = run(ready(), { type: "kickoff", now: 5000, running: false });
    expect(s.status).toBe("paused");
    expect(elapsedSeconds(s, 999_999)).toBe(0);
    s = liveReducer(s, { type: "setClock", now: 0, seconds: 12 * 60 });
    s = liveReducer(s, rec("a", { type: "shot", side: "us", onTarget: false, playerId: ids[1] }));
    expect(s.events[0].t).toBe(12 * 60);
  });

  it("com o relógio a andar, o minuto novo continua a contar a partir daí", () => {
    let s = run(ready(), { type: "kickoff", now: 0 });
    s = liveReducer(s, { type: "setClock", now: 10_000, seconds: 600 });
    expect(elapsedSeconds(s, 10_000 + 30_000)).toBe(630);
  });

  it("o relógio só se mexe com o jogo começado e não passa de 24 h nem fica negativo", () => {
    const before = ready();
    expect(liveReducer(before, { type: "setClock", now: 0, seconds: 60 })).toBe(before);
    const s = run(before, { type: "kickoff", now: 0, running: false });
    expect(liveReducer(s, { type: "setClock", now: 0, seconds: -50 }).clock.baseSeconds).toBe(0);
    expect(liveReducer(s, { type: "setClock", now: 0, seconds: 1e9 }).clock.baseSeconds).toBe(
      86_400,
    );
  });

  it("terminar pode fixar a duração do jogo", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      { type: "finish", now: 0, seconds: 50 * 60 },
    );
    expect(s.status).toBe("finished");
    expect(elapsedSeconds(s, 0)).toBe(50 * 60);
  });

  it("um golo conta como remate à baliza, nosso ou deles", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      rec("g1", { type: "goal", side: "us", playerId: ids[1], assistId: null }),
      rec("g2", { type: "goal", side: "them", playerId: null }),
      rec("s1", { type: "shot", side: "us", onTarget: false, playerId: ids[1] }),
    );
    const t = teamStats(s);
    expect(t.shots).toEqual({ us: 2, them: 1 });
    expect(t.onTarget).toEqual({ us: 1, them: 1 });
  });

  it("estatísticas por jogador somam na equipa", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      rec("g1", { type: "goal", side: "us", playerId: ids[1], assistId: ids[2] }),
      rec("a", { type: "shot", side: "us", onTarget: true, playerId: ids[1] }),
      rec("b", { type: "shot", side: "us", onTarget: false, playerId: ids[2] }),
      rec("c", { type: "recovery", side: "us", playerId: ids[3] }),
      rec("d", { type: "recovery", side: "us", playerId: ids[3] }),
      rec("e", { type: "turnover", side: "us", playerId: ids[2] }),
      rec("f", { type: "corner", side: "us", playerId: ids[4] }),
      rec("g", { type: "foul", side: "us" }), // sem jogador: só conta na equipa
    );
    const p = playerStats(s);
    expect(p[ids[1]]).toMatchObject({ goals: 1, shots: 2, onTarget: 2 });
    expect(p[ids[2]]).toMatchObject({ assists: 1, shots: 1, onTarget: 0, turnover: 1 });
    expect(p[ids[3]].recovery).toBe(2);
    expect(p[ids[4]].corner).toBe(1);
    const t = teamStats(s);
    expect(t.recovery.us).toBe(2);
    expect(t.foul.us).toBe(1);
    expect(t.shots.us).toBe(3);
    // Soma dos jogadores nunca passa da equipa.
    const sum = (k: "shots" | "recovery" | "foul") =>
      Object.values(p).reduce((n, l) => n + l[k], 0);
    expect(sum("shots")).toBe(t.shots.us);
    expect(sum("foul")).toBe(0);
  });

  it("jogador desconhecido ou do adversário fica sem jogador", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      rec("a", { type: "recovery", side: "us", playerId: "00000000-0000-4000-8000-0000000000ff" }),
      rec("b", { type: "recovery", side: "them", playerId: ids[1] }),
    );
    expect(s.events.every((e) => e.type === "recovery" && e.playerId === null)).toBe(true);
  });

  it("o − de um jogador tira o último desse jogador", () => {
    let s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      rec("a", { type: "recovery", side: "us", playerId: ids[1] }),
      rec("b", { type: "recovery", side: "us", playerId: ids[2] }),
      rec("c", { type: "recovery", side: "us", playerId: ids[1] }),
    );
    s = liveReducer(s, {
      type: "unrecord",
      event: { type: "recovery", side: "us", playerId: ids[2] },
    });
    expect(s.events.map((e) => e.id)).toEqual(["a", "c"]);
    s = liveReducer(s, { type: "unrecord", event: { type: "recovery", side: "us" } });
    expect(s.events.map((e) => e.id)).toEqual(["a"]);
  });

  it("substituições registadas fora de ordem dão os mesmos minutos", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      { type: "setClock", now: 0, seconds: 20 * 60 },
      { type: "sub", now: 0, id: "s2", slot: 0, inId: ids[8] }, // 20' (registada primeiro)
      { type: "setClock", now: 0, seconds: 10 * 60 },
      { type: "sub", now: 0, id: "s1", slot: 1, inId: ids[7] }, // 10'
      { type: "finish", now: 0, seconds: 30 * 60 },
    );
    const sec = playerSeconds(s, 0);
    expect(sec[ids[7]]).toBe(20 * 60);
    expect(sec[ids[8]]).toBe(10 * 60);
    expect(sec[ids[1]]).toBe(10 * 60);
    expect(sec[ids[0]]).toBe(20 * 60);
  });

  it("jogos antigos (sem playerId nos remates) continuam válidos", () => {
    const old = {
      ...ready(),
      events: [
        { id: "x", t: 5, period: 1, type: "shot", side: "us", onTarget: true },
        { id: "y", t: 6, period: 1, type: "corner", side: "them" },
      ],
    };
    const parsed = liveSchema.parse(old);
    expect(parsed.events[0]).toMatchObject({ playerId: null });
    expect(parsed.events[1]).toMatchObject({ playerId: null });
  });

  it("os jogadores dos remates contam como referenciados", () => {
    const s = run(
      ready(),
      { type: "kickoff", now: 0, running: false },
      rec("a", { type: "shot", side: "us", onTarget: true, playerId: ids[3] }),
    );
    expect(referencedPlayerIds(s)).toContain(ids[3]);
  });
});
