import { z } from "zod";

// Jogo ao vivo — lógica pura (sem React, sem BD). O estado vive no telemóvel, é guardado
// em localStorage e sincronizado com `matches.live` (jsonb). Tudo o que é derivado
// (minutos, estatísticas, resultado) calcula-se a partir dos eventos.

export const SLOT_COUNT = 7;

export const FORMATIONS = ["2-3-1", "3-2-1", "2-2-2"] as const;
export type FormationId = (typeof FORMATIONS)[number];

export type SlotRole = "GR" | "DEF" | "MED" | "AVA";
/** Posição no campo em % (ataque em cima). O slot 0 é sempre o guarda-redes. */
export type SlotLayout = { x: number; y: number; role: SlotRole };

export const FORMATION_SLOTS: Record<FormationId, SlotLayout[]> = {
  "2-3-1": [
    { x: 50, y: 88, role: "GR" },
    { x: 30, y: 70, role: "DEF" },
    { x: 70, y: 70, role: "DEF" },
    { x: 18, y: 46, role: "MED" },
    { x: 50, y: 52, role: "MED" },
    { x: 82, y: 46, role: "MED" },
    { x: 50, y: 20, role: "AVA" },
  ],
  "3-2-1": [
    { x: 50, y: 88, role: "GR" },
    { x: 20, y: 70, role: "DEF" },
    { x: 50, y: 74, role: "DEF" },
    { x: 80, y: 70, role: "DEF" },
    { x: 32, y: 47, role: "MED" },
    { x: 68, y: 47, role: "MED" },
    { x: 50, y: 20, role: "AVA" },
  ],
  "2-2-2": [
    { x: 50, y: 88, role: "GR" },
    { x: 30, y: 70, role: "DEF" },
    { x: 70, y: 70, role: "DEF" },
    { x: 30, y: 46, role: "MED" },
    { x: 70, y: 46, role: "MED" },
    { x: 30, y: 20, role: "AVA" },
    { x: 70, y: 20, role: "AVA" },
  ],
};

export const ROLE_LABEL: Record<SlotRole, string> = {
  GR: "Guarda-redes",
  DEF: "Defesa",
  MED: "Meio-campo",
  AVA: "Ataque",
};

export const LIVE_STATUSES = ["setup", "running", "paused", "halftime", "finished"] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

export type Side = "us" | "them";
export const STAT_TYPES = ["corner", "foul", "turnover", "recovery"] as const;
export type StatType = (typeof STAT_TYPES)[number];

// ---------------------------------------------------------------- schema

const side = z.enum(["us", "them"]);
const playerId = z.uuid();
const base = {
  id: z.string().min(1).max(40),
  t: z.number().min(0).max(86_400),
  period: z.union([z.literal(1), z.literal(2)]),
};

export const liveEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("goal"),
    side,
    playerId: playerId.nullable(),
    // Jogos registados antes das assistências não têm este campo: lê-se como "sem assistência".
    assistId: playerId.nullable().default(null),
  }),
  // Remates e contagens por jogador (só nossos). Jogos antigos não têm `playerId`: lê-se como "sem jogador".
  z.object({
    ...base,
    type: z.literal("shot"),
    side,
    onTarget: z.boolean(),
    playerId: playerId.nullable().default(null),
  }),
  z.object({
    ...base,
    type: z.enum(STAT_TYPES),
    side,
    playerId: playerId.nullable().default(null),
  }),
  z.object({
    ...base,
    type: z.literal("sub"),
    slot: z
      .number()
      .int()
      .min(0)
      .max(SLOT_COUNT - 1),
    outId: playerId,
    inId: playerId,
  }),
  // Dois jogadores do campo trocam de posição (não mexe nos minutos).
  z.object({
    ...base,
    type: z.literal("swap"),
    a: z
      .number()
      .int()
      .min(0)
      .max(SLOT_COUNT - 1),
    b: z
      .number()
      .int()
      .min(0)
      .max(SLOT_COUNT - 1),
    /** Quem estava em `a` e em `b` antes da troca. */
    aId: playerId,
    bId: playerId,
  }),
  z.object({ ...base, type: z.literal("period_end") }),
  z.object({ ...base, type: z.literal("period_start") }),
]);
export type LiveEvent = z.infer<typeof liveEventSchema>;

const slotsSchema = z.array(playerId.nullable()).length(SLOT_COUNT);

export const liveSchema = z
  .object({
    v: z.literal(1),
    rev: z.number().int().min(0),
    status: z.enum(LIVE_STATUSES),
    period: z.union([z.literal(1), z.literal(2)]),
    periodMinutes: z.number().int().min(5).max(60),
    formation: z.enum(FORMATIONS),
    slots: slotsSchema,
    bench: z.array(playerId).max(30),
    starters: slotsSchema.nullable(),
    clock: z.object({
      baseSeconds: z.number().min(0).max(86_400),
      startedAt: z.number().nullable(),
    }),
    events: z.array(liveEventSchema).max(800),
    // Minutos corrigidos à mão depois do jogo (segundos por jogador). Só valem com o jogo terminado.
    secondsOverride: z.record(playerId, z.number().min(0).max(86_400)).default({}),
  })
  .refine(
    (s) => {
      const ids = [...s.slots.filter((x) => x !== null), ...s.bench];
      return new Set(ids).size === ids.length;
    },
    { message: "Jogador repetido na convocatória." },
  );
export type LiveState = z.infer<typeof liveSchema>;

export function emptyLive(): LiveState {
  return {
    v: 1,
    rev: 0,
    status: "setup",
    period: 1,
    periodMinutes: 25,
    formation: "2-3-1",
    slots: Array(SLOT_COUNT).fill(null),
    bench: [],
    starters: null,
    clock: { baseSeconds: 0, startedAt: null },
    events: [],
    secondsOverride: {},
  };
}

// ---------------------------------------------------------------- tempo

/** Segundos de jogo (só conta o tempo com o relógio a andar). */
export function elapsedSeconds(s: LiveState, nowMs: number): number {
  const { baseSeconds, startedAt } = s.clock;
  if (startedAt === null) return baseSeconds;
  return baseSeconds + Math.max(0, (nowMs - startedAt) / 1000);
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Lê o minuto do vídeo escrito à mão: "12:40", "12.40", "1240" (12:40), "940" (9:40) ou "12" (12:00).
 * Devolve segundos, ou null se não fizer sentido.
 */
export function parseClock(text: string): number | null {
  const t = text.trim();
  let min: number;
  let sec = 0;
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{1,3})[:.,](\d{1,2})$/))) {
    min = Number(m[1]);
    sec = Number(m[2]);
  } else if ((m = t.match(/^(\d{1,3})(\d{2})$/))) {
    min = Number(m[1]);
    sec = Number(m[2]);
  } else if ((m = t.match(/^(\d{1,2})$/))) {
    min = Number(m[1]);
  } else {
    return null;
  }
  if (sec > 59) return null;
  const total = min * 60 + sec;
  return total <= 86_400 ? total : null;
}

/** Minutos arredondados ao mais próximo: "12′". */
export function minutesLabel(seconds: number): string {
  return `${Math.round(Math.max(0, seconds) / 60)}′`;
}

// ---------------------------------------------------------------- reducer

export type StatEventInput =
  | { type: "goal"; side: Side; playerId: string | null; assistId?: string | null }
  | { type: "shot"; side: Side; onTarget: boolean; playerId?: string | null }
  | { type: StatType; side: Side; playerId?: string | null };

export type LiveAction =
  | { type: "setFormation"; formation: FormationId }
  | { type: "setPeriodMinutes"; minutes: number }
  | { type: "assign"; slot: number; playerId: string | null }
  | { type: "addBench"; playerId: string }
  | { type: "removeBench"; playerId: string }
  /** `running: false` começa com o relógio parado (registar a ver o vídeo). */
  | { type: "kickoff"; now: number; running?: boolean }
  | { type: "pause"; now: number }
  /** Põe o relógio num minuto (o do vídeo). Com o jogo a andar, continua a contar a partir daí. */
  | { type: "setClock"; now: number; seconds: number }
  | { type: "resume"; now: number }
  | { type: "endPeriod"; now: number }
  | { type: "startSecondHalf"; now: number }
  /** `seconds`: duração final do jogo (por defeito, o relógio). */
  | { type: "finish"; now: number; seconds?: number }
  | { type: "reopen" }
  | { type: "record"; now: number; id: string; event: StatEventInput }
  | {
      type: "unrecord";
      // Sem `playerId`: o último evento desse lado, de quem for. Com `playerId`: o último desse jogador.
      event: {
        type: "goal" | "shot" | StatType;
        side: Side;
        onTarget?: boolean;
        playerId?: string | null;
      };
    }
  | { type: "sub"; now: number; id: string; slot: number; inId: string }
  | { type: "swap"; now: number; id: string; a: number; b: number }
  // Edição depois do jogo (só com o jogo terminado).
  | { type: "editGoal"; id: string; playerId: string | null; assistId: string | null }
  | { type: "removeGoal"; id: string }
  | {
      type: "addGoal";
      id: string;
      side: Side;
      playerId: string | null;
      assistId: string | null;
      seconds: number;
    }
  | { type: "setMinutes"; playerId: string; seconds: number | null }
  | { type: "undo" };

const LIVE_STATUSES_ACTIVE: LiveStatus[] = ["running", "paused", "halftime"];
const UNDOABLE = new Set(["goal", "shot", "corner", "foul", "turnover", "recovery", "sub", "swap"]);

const isStatType = (t: string): t is StatType => (STAT_TYPES as readonly string[]).includes(t);

function bump(s: LiveState, patch: Partial<LiveState>): LiveState {
  return { ...s, ...patch, rev: s.rev + 1 };
}

function freeze(s: LiveState, now: number): LiveState["clock"] {
  return { baseSeconds: elapsedSeconds(s, now), startedAt: null };
}

export function isStartable(s: LiveState): boolean {
  return s.status === "setup" && s.slots.every((x) => x !== null);
}

/** Só há marcador/assistência num golo nosso, a assistência nunca é do próprio marcador. */
function cleanGoal(
  side: Side,
  playerId: string | null,
  assistId: string | null,
): { playerId: string | null; assistId: string | null } {
  if (side !== "us" || !playerId)
    return { playerId: side === "us" ? playerId : null, assistId: null };
  return { playerId, assistId: assistId && assistId !== playerId ? assistId : null };
}

export function liveReducer(s: LiveState, a: LiveAction): LiveState {
  switch (a.type) {
    case "setFormation":
      if (s.status !== "setup" || s.formation === a.formation) return s;
      return bump(s, { formation: a.formation });

    case "setPeriodMinutes": {
      const minutes = Math.min(60, Math.max(5, Math.round(a.minutes)));
      if (s.status !== "setup" || minutes === s.periodMinutes) return s;
      return bump(s, { periodMinutes: minutes });
    }

    case "assign": {
      if (s.status !== "setup" || a.slot < 0 || a.slot >= SLOT_COUNT) return s;
      const slots = s.slots.map((x) => (x === a.playerId ? null : x));
      slots[a.slot] = a.playerId;
      const bench = s.bench.filter((x) => x !== a.playerId);
      return bump(s, { slots, bench });
    }

    case "addBench": {
      if (s.status !== "setup" || s.bench.includes(a.playerId)) return s;
      const slots = s.slots.map((x) => (x === a.playerId ? null : x));
      return bump(s, { slots, bench: [...s.bench, a.playerId] });
    }

    case "removeBench":
      if (s.status !== "setup" || !s.bench.includes(a.playerId)) return s;
      return bump(s, { bench: s.bench.filter((x) => x !== a.playerId) });

    case "kickoff":
      if (!isStartable(s)) return s;
      return bump(s, {
        status: a.running === false ? "paused" : "running",
        period: 1,
        starters: [...s.slots],
        clock: { baseSeconds: 0, startedAt: a.running === false ? null : a.now },
        events: [],
      });

    case "setClock": {
      if (!LIVE_STATUSES_ACTIVE.includes(s.status)) return s;
      const baseSeconds = Math.min(86_400, Math.max(0, Math.round(a.seconds)));
      return bump(s, {
        clock: { baseSeconds, startedAt: s.status === "running" ? a.now : null },
      });
    }

    case "pause":
      if (s.status !== "running") return s;
      return bump(s, { status: "paused", clock: freeze(s, a.now) });

    case "resume":
      if (s.status !== "paused") return s;
      return bump(s, { status: "running", clock: { ...s.clock, startedAt: a.now } });

    case "endPeriod": {
      if (s.period !== 1 || (s.status !== "running" && s.status !== "paused")) return s;
      const clock = freeze(s, a.now);
      const event: LiveEvent = {
        id: `pe-${s.rev}`,
        type: "period_end",
        t: clock.baseSeconds,
        period: 1,
      };
      return bump(s, { status: "halftime", clock, events: [...s.events, event] });
    }

    case "startSecondHalf": {
      if (s.status !== "halftime") return s;
      const event: LiveEvent = {
        id: `ps-${s.rev}`,
        type: "period_start",
        t: s.clock.baseSeconds,
        period: 2,
      };
      return bump(s, {
        status: "running",
        period: 2,
        clock: { ...s.clock, startedAt: a.now },
        events: [...s.events, event],
      });
    }

    case "finish":
      if (!LIVE_STATUSES_ACTIVE.includes(s.status)) return s;
      return bump(s, {
        status: "finished",
        clock:
          a.seconds === undefined
            ? freeze(s, a.now)
            : {
                baseSeconds: Math.min(86_400, Math.max(0, Math.round(a.seconds))),
                startedAt: null,
              },
      });

    case "reopen":
      if (s.status !== "finished") return s;
      // Voltar ao jogo: os minutos voltam a vir das substituições.
      return bump(s, { status: "paused", secondsOverride: {} });

    case "record": {
      // Com o jogo terminado também se aceita (corrigir contagens depois): fica no tempo final.
      if (!LIVE_STATUSES_ACTIVE.includes(s.status) && s.status !== "finished") return s;
      const event = {
        ...a.event,
        id: a.id,
        t: elapsedSeconds(s, a.now),
        period: s.period,
      } as LiveEvent;
      if (event.type === "goal") {
        const clean = cleanGoal(
          event.side,
          event.playerId,
          (a.event as { assistId?: string | null }).assistId ?? null,
        );
        event.playerId = clean.playerId;
        event.assistId = clean.assistId;
      } else if (event.type === "shot" || isStatType(event.type)) {
        // Só há jogador nos nossos, e tem de ser da convocatória.
        const counted = event as Extract<LiveEvent, { type: "shot" | StatType }>;
        const own = counted.side === "us" ? counted.playerId : null;
        counted.playerId = own && convocados(s).includes(own) ? own : null;
      }
      return bump(s, { events: [...s.events, event] });
    }

    case "unrecord": {
      // Do mais recente para o mais antigo: tira o último evento igual (golos, remates, cantos...).
      for (let i = s.events.length - 1; i >= 0; i--) {
        const e = s.events[i];
        if (e.type !== a.event.type || !("side" in e) || e.side !== a.event.side) continue;
        if (e.type === "shot" && a.event.onTarget !== undefined && e.onTarget !== a.event.onTarget)
          continue;
        if (a.event.playerId !== undefined && "playerId" in e && e.playerId !== a.event.playerId)
          continue;
        return bump(s, { events: s.events.filter((_, j) => j !== i) });
      }
      return s;
    }

    case "sub": {
      if (!LIVE_STATUSES_ACTIVE.includes(s.status)) return s;
      const outId = s.slots[a.slot];
      if (!outId || !s.bench.includes(a.inId)) return s;
      const slots = [...s.slots];
      slots[a.slot] = a.inId;
      const bench = [...s.bench.filter((x) => x !== a.inId), outId];
      const event: LiveEvent = {
        id: a.id,
        type: "sub",
        slot: a.slot,
        outId,
        inId: a.inId,
        t: elapsedSeconds(s, a.now),
        period: s.period,
      };
      return bump(s, { slots, bench, events: [...s.events, event] });
    }

    case "editGoal": {
      if (s.status !== "finished") return s;
      const i = s.events.findIndex((e) => e.id === a.id && e.type === "goal");
      const e = s.events[i];
      if (!e || e.type !== "goal") return s;
      const known = new Set(convocados(s));
      if ((a.playerId && !known.has(a.playerId)) || (a.assistId && !known.has(a.assistId)))
        return s;
      const clean = cleanGoal(e.side, a.playerId, a.assistId);
      const events = s.events.map((x, j) => (j === i ? { ...e, ...clean } : x));
      return bump(s, { events });
    }

    case "removeGoal": {
      if (s.status !== "finished") return s;
      if (!s.events.some((e) => e.id === a.id && e.type === "goal")) return s;
      return bump(s, { events: s.events.filter((e) => e.id !== a.id) });
    }

    case "addGoal": {
      if (s.status !== "finished" || s.events.length >= 800) return s;
      const known = new Set(convocados(s));
      if ((a.playerId && !known.has(a.playerId)) || (a.assistId && !known.has(a.assistId)))
        return s;
      if (s.events.some((e) => e.id === a.id)) return s;
      const t = Math.min(Math.max(0, a.seconds), s.clock.baseSeconds);
      const clean = cleanGoal(a.side, a.playerId, a.assistId);
      const event: LiveEvent = {
        id: a.id,
        type: "goal",
        side: a.side,
        ...clean,
        t,
        period: s.period === 2 && t > s.periodMinutes * 60 ? 2 : 1,
      };
      // Mantém os eventos por ordem de tempo.
      const at = s.events.findIndex((e) => e.t > t);
      const events =
        at === -1 ? [...s.events, event] : [...s.events.slice(0, at), event, ...s.events.slice(at)];
      return bump(s, { events });
    }

    case "setMinutes": {
      if (s.status !== "finished" || !convocados(s).includes(a.playerId)) return s;
      const { [a.playerId]: _old, ...rest } = s.secondsOverride;
      void _old;
      if (a.seconds === null) return bump(s, { secondsOverride: rest });
      const seconds = Math.min(Math.max(0, Math.round(a.seconds)), Math.floor(s.clock.baseSeconds));
      return bump(s, { secondsOverride: { ...rest, [a.playerId]: seconds } });
    }

    case "swap": {
      if (!LIVE_STATUSES_ACTIVE.includes(s.status)) return s;
      if (a.a === a.b || a.a < 0 || a.b < 0 || a.a >= SLOT_COUNT || a.b >= SLOT_COUNT) return s;
      const aId = s.slots[a.a];
      const bId = s.slots[a.b];
      if (!aId || !bId) return s;
      const slots = [...s.slots];
      slots[a.a] = bId;
      slots[a.b] = aId;
      const event: LiveEvent = {
        id: a.id,
        type: "swap",
        a: a.a,
        b: a.b,
        aId,
        bId,
        t: elapsedSeconds(s, a.now),
        period: s.period,
      };
      return bump(s, { slots, events: [...s.events, event] });
    }

    case "undo": {
      const last = s.events.at(-1);
      if (!last || !UNDOABLE.has(last.type) || s.status === "finished") return s;
      const events = s.events.slice(0, -1);
      if (last.type === "swap") {
        // Só desfaz se os dois ainda estão onde a troca os deixou.
        if (s.slots[last.a] !== last.bId || s.slots[last.b] !== last.aId) return s;
        const slots = [...s.slots];
        slots[last.a] = last.aId;
        slots[last.b] = last.bId;
        return bump(s, { events, slots });
      }
      if (last.type !== "sub") return bump(s, { events });
      if (s.slots[last.slot] !== last.inId) return s;
      const slots = [...s.slots];
      slots[last.slot] = last.outId;
      const bench = [...s.bench.filter((x) => x !== last.outId), last.inId];
      return bump(s, { events, slots, bench });
    }
  }
}

// ---------------------------------------------------------------- derivados

export function score(s: LiveState): Record<Side, number> {
  const out = { us: 0, them: 0 };
  for (const e of s.events) if (e.type === "goal") out[e.side] += 1;
  return out;
}

export type TeamStats = {
  shots: Record<Side, number>;
  onTarget: Record<Side, number>;
  corner: Record<Side, number>;
  foul: Record<Side, number>;
  turnover: Record<Side, number>;
  recovery: Record<Side, number>;
};

export function teamStats(s: LiveState): TeamStats {
  const zero = () => ({ us: 0, them: 0 });
  const out: TeamStats = {
    shots: zero(),
    onTarget: zero(),
    corner: zero(),
    foul: zero(),
    turnover: zero(),
    recovery: zero(),
  };
  for (const e of s.events) {
    if (e.type === "goal") {
      // Um golo é sempre um remate à baliza.
      out.shots[e.side] += 1;
      out.onTarget[e.side] += 1;
    } else if (e.type === "shot") {
      out.shots[e.side] += 1;
      if (e.onTarget) out.onTarget[e.side] += 1;
    } else if (
      e.type === "corner" ||
      e.type === "foul" ||
      e.type === "turnover" ||
      e.type === "recovery"
    ) {
      out[e.type][e.side] += 1;
    }
  }
  return out;
}

/** Quem foi convocado (campo + banco). Depois do apito inicial inclui quem já saiu. */
export function convocados(s: LiveState): string[] {
  const ids = new Set<string>();
  for (const id of s.starters ?? s.slots) if (id) ids.add(id);
  for (const id of s.slots) if (id) ids.add(id);
  for (const id of s.bench) ids.add(id);
  return [...ids];
}

export type PlayerStatLine = {
  goals: number;
  assists: number;
  /** Remates no total (inclui os à baliza e os golos). */
  shots: number;
  /** Remates à baliza (inclui os golos). */
  onTarget: number;
  corner: number;
  foul: number;
  turnover: number;
  recovery: number;
};

export const emptyPlayerLine = (): PlayerStatLine => ({
  goals: 0,
  assists: 0,
  shots: 0,
  onTarget: 0,
  corner: 0,
  foul: 0,
  turnover: 0,
  recovery: 0,
});

/** Estatísticas de cada convocado. Eventos sem jogador só contam na equipa. */
export function playerStats(s: LiveState): Record<string, PlayerStatLine> {
  const out: Record<string, PlayerStatLine> = {};
  for (const id of convocados(s)) out[id] = emptyPlayerLine();
  for (const e of s.events) {
    if (e.type === "goal") {
      const scorer = e.playerId ? out[e.playerId] : undefined;
      if (scorer) {
        scorer.goals += 1;
        scorer.shots += 1;
        scorer.onTarget += 1;
      }
      const assister = e.assistId ? out[e.assistId] : undefined;
      if (assister) assister.assists += 1;
    } else if (e.type === "shot") {
      const line = e.playerId ? out[e.playerId] : undefined;
      if (line) {
        line.shots += 1;
        if (e.onTarget) line.onTarget += 1;
      }
    } else if (isStatType(e.type)) {
      const stat = e as Extract<LiveEvent, { type: StatType }>;
      const line = stat.playerId ? out[stat.playerId] : undefined;
      if (line) line[stat.type] += 1;
    }
  }
  return out;
}

/** Segundos em campo por jogador, a partir dos titulares e das substituições. */
export function playerSeconds(s: LiveState, nowMs: number): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of convocados(s)) totals[id] = 0;
  if (!s.starters) return totals;

  const enteredAt = new Map<string, number>();
  for (const id of s.starters) if (id) enteredAt.set(id, 0);

  // Registar a ver o vídeo pode ser fora de ordem: conta-se pelo minuto, não pela ordem do toque.
  const subs = s.events.filter((e) => e.type === "sub").sort((x, y) => x.t - y.t);
  for (const e of subs) {
    if (e.type !== "sub") continue;
    const since = enteredAt.get(e.outId);
    if (since !== undefined) {
      totals[e.outId] = (totals[e.outId] ?? 0) + Math.max(0, e.t - since);
      enteredAt.delete(e.outId);
    }
    enteredAt.set(e.inId, e.t);
  }
  const end = elapsedSeconds(s, nowMs);
  for (const [id, since] of enteredAt) totals[id] = (totals[id] ?? 0) + Math.max(0, end - since);
  if (s.status === "finished") {
    for (const [id, seconds] of Object.entries(s.secondsOverride)) {
      if (id in totals) totals[id] = seconds;
    }
  }
  return totals;
}

export type GoalItem = {
  id: string;
  t: number;
  side: Side;
  playerId: string | null;
  assistId: string | null;
};

export function goals(s: LiveState): GoalItem[] {
  return s.events.flatMap((e) =>
    e.type === "goal"
      ? [{ id: e.id, t: e.t, side: e.side, playerId: e.playerId, assistId: e.assistId }]
      : [],
  );
}

export function isLive(s: LiveState | null | undefined): s is LiveState {
  return !!s && s.status !== "setup";
}

/** Todos os jogadores a que o estado se refere (para confirmar que são da equipa). */
export function referencedPlayerIds(s: LiveState): string[] {
  const ids = new Set<string>(convocados(s));
  for (const e of s.events) {
    if (e.type === "goal" && e.playerId) ids.add(e.playerId);
    if (e.type === "goal" && e.assistId) ids.add(e.assistId);
    if (e.type === "sub") {
      ids.add(e.outId);
      ids.add(e.inId);
    }
    if (e.type === "swap") {
      ids.add(e.aId);
      ids.add(e.bId);
    }
    if ((e.type === "shot" || isStatType(e.type)) && "playerId" in e && e.playerId) {
      ids.add(e.playerId);
    }
  }
  return [...ids];
}
