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
  z.object({ ...base, type: z.literal("shot"), side, onTarget: z.boolean() }),
  z.object({ ...base, type: z.enum(STAT_TYPES), side }),
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

/** Minutos arredondados ao mais próximo: "12′". */
export function minutesLabel(seconds: number): string {
  return `${Math.round(Math.max(0, seconds) / 60)}′`;
}

// ---------------------------------------------------------------- reducer

export type StatEventInput =
  | { type: "goal"; side: Side; playerId: string | null; assistId?: string | null }
  | { type: "shot"; side: Side; onTarget: boolean }
  | { type: StatType; side: Side };

export type LiveAction =
  | { type: "setFormation"; formation: FormationId }
  | { type: "setPeriodMinutes"; minutes: number }
  | { type: "assign"; slot: number; playerId: string | null }
  | { type: "addBench"; playerId: string }
  | { type: "removeBench"; playerId: string }
  | { type: "kickoff"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "endPeriod"; now: number }
  | { type: "startSecondHalf"; now: number }
  | { type: "finish"; now: number }
  | { type: "reopen" }
  | { type: "record"; now: number; id: string; event: StatEventInput }
  | {
      type: "unrecord";
      event: { type: "goal" | "shot" | StatType; side: Side; onTarget?: boolean };
    }
  | { type: "sub"; now: number; id: string; slot: number; inId: string }
  | { type: "undo" };

const LIVE_STATUSES_ACTIVE: LiveStatus[] = ["running", "paused", "halftime"];
const UNDOABLE = new Set(["goal", "shot", "corner", "foul", "turnover", "recovery", "sub"]);

function bump(s: LiveState, patch: Partial<LiveState>): LiveState {
  return { ...s, ...patch, rev: s.rev + 1 };
}

function freeze(s: LiveState, now: number): LiveState["clock"] {
  return { baseSeconds: elapsedSeconds(s, now), startedAt: null };
}

export function isStartable(s: LiveState): boolean {
  return s.status === "setup" && s.slots.every((x) => x !== null);
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
        status: "running",
        period: 1,
        starters: [...s.slots],
        clock: { baseSeconds: 0, startedAt: a.now },
        events: [],
      });

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
      return bump(s, { status: "finished", clock: freeze(s, a.now) });

    case "reopen":
      if (s.status !== "finished") return s;
      return bump(s, { status: "paused" });

    case "record": {
      if (!LIVE_STATUSES_ACTIVE.includes(s.status)) return s;
      const event = {
        ...a.event,
        id: a.id,
        t: elapsedSeconds(s, a.now),
        period: s.period,
      } as LiveEvent;
      if (event.type === "goal") {
        // Só há assistência num golo nosso com marcador, e nunca do próprio marcador.
        const assist =
          event.side === "us" && event.playerId
            ? (a.event as { assistId?: string | null }).assistId
            : null;
        event.assistId = assist && assist !== event.playerId ? assist : null;
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

    case "undo": {
      const last = s.events.at(-1);
      if (!last || !UNDOABLE.has(last.type) || s.status === "finished") return s;
      const events = s.events.slice(0, -1);
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
    if (e.type === "shot") {
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

/** Segundos em campo por jogador, a partir dos titulares e das substituições. */
export function playerSeconds(s: LiveState, nowMs: number): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of convocados(s)) totals[id] = 0;
  if (!s.starters) return totals;

  const enteredAt = new Map<string, number>();
  for (const id of s.starters) if (id) enteredAt.set(id, 0);

  for (const e of s.events) {
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
  }
  return [...ids];
}
