import { PIECE_RADIUS, type Arrow, type Diagram, type Piece } from "./diagram";

// Animação do desenho: as setas, pela ordem em que foram desenhadas, viram movimentos.
// - desmarcação / condução: mexe-se a peça que está no início da seta (na condução leva a bola);
// - passe / remate: mexe-se a bola (a mais próxima, ou uma bola só da animação se o desenho não tiver).
// - linhas não se mexem.
// Tudo puro: o componente só pede "como está o desenho no instante t".

export type Point = { x: number; y: number };

export type Move = { id: string; from: Point; to: Point };

export type Step = {
  arrowId: string;
  kind: Arrow["kind"];
  /** ms desde o início da animação. */
  start: number;
  duration: number;
  moves: Move[];
};

export type Timeline = { steps: Step[]; total: number };

/** Id da bola criada só para a animação (desenhos de passe sem bola desenhada). */
export const ANIM_BALL_ID = "anim-ball";

const MOVABLE = new Set<Piece["kind"]>(["a", "b", "c", "n", "gk", "coach"]);

/** Unidades do campo por ms. */
const SPEED: Partial<Record<Arrow["kind"], number>> = {
  run: 0.12,
  dribble: 0.09,
  pass: 0.35,
  shot: 0.6,
};
const MIN_MS = 400;
const MAX_MS = 1800;
const GAP_MS = 250;
/** Quanto tempo o fim fica parado antes de recomeçar. */
export const HOLD_MS = 1200;

function nearest(pieces: Piece[], pos: Map<string, Point>, to: Point): Piece | null {
  let best: Piece | null = null;
  let bestD = Infinity;
  for (const p of pieces) {
    const at = pos.get(p.id) ?? p;
    const d = Math.hypot(at.x - to.x, at.y - to.y);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function buildTimeline(diagram: Diagram): Timeline {
  const r = PIECE_RADIUS[diagram.field];
  const pos = new Map<string, Point>(diagram.pieces.map((p) => [p.id, { x: p.x, y: p.y }]));
  const players = diagram.pieces.filter((p) => MOVABLE.has(p.kind));
  const balls = diagram.pieces.filter((p) => p.kind === "ball");

  const steps: Step[] = [];
  let time = 0;

  for (const a of diagram.arrows) {
    const speed = SPEED[a.kind];
    if (speed === undefined) continue; // "line"
    const from = { x: a.x1, y: a.y1 };
    const to = { x: a.x2, y: a.y2 };
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    if (len < 1) continue;

    const moves: Move[] = [];

    if (a.kind === "pass" || a.kind === "shot") {
      const ball = nearest(balls, pos, from);
      const id = ball?.id ?? ANIM_BALL_ID;
      moves.push({ id, from, to });
      pos.set(id, to);
    } else {
      const mover = nearest(players, pos, from);
      const at = mover ? (pos.get(mover.id) ?? mover) : null;
      // Só conta se a seta sai de uma peça (ou perto): senão é só uma seta decorativa.
      if (!mover || !at || Math.hypot(at.x - from.x, at.y - from.y) > r * 3) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      moves.push({ id: mover.id, from: { ...at }, to: { x: at.x + dx, y: at.y + dy } });
      pos.set(mover.id, moves[0].to);

      if (a.kind === "dribble") {
        const ball = nearest(balls, pos, at);
        const ballAt = ball ? (pos.get(ball.id) ?? ball) : null;
        // A bola do pé: a que está colada ao jogador antes de ele arrancar.
        if (ball && ballAt && Math.hypot(ballAt.x - at.x, ballAt.y - at.y) <= r * 2.2) {
          const mv = { id: ball.id, from: { ...ballAt }, to: { x: ballAt.x + dx, y: ballAt.y + dy } };
          moves.push(mv);
          pos.set(ball.id, mv.to);
        }
      }
    }

    const duration = Math.min(MAX_MS, Math.max(MIN_MS, len / speed));
    steps.push({ arrowId: a.id, kind: a.kind, start: time, duration, moves });
    time += duration + GAP_MS;
  }

  return { steps, total: steps.length > 0 ? time - GAP_MS : 0 };
}

const easeInOut = (p: number) => p * p * (3 - 2 * p);
const easeOut = (p: number) => 1 - (1 - p) * (1 - p);

/**
 * O desenho no instante `t` (ms). `t = 0` devolve o desenho original.
 * Depois de começar: as peças estão onde as setas já as levaram, e só aparecem as setas
 * que já começaram (as de linha aparecem sempre).
 */
export function frameAt(diagram: Diagram, timeline: Timeline, t: number): Diagram {
  if (t <= 0 || timeline.steps.length === 0) return diagram;

  const pos = new Map<string, Point>();
  const shown = new Set<string>();
  let usesAnimBall = false;

  for (const s of timeline.steps) {
    if (t < s.start) break;
    shown.add(s.arrowId);
    const raw = Math.min(1, (t - s.start) / s.duration);
    const p = s.kind === "pass" || s.kind === "shot" ? easeOut(raw) : easeInOut(raw);
    for (const m of s.moves) {
      if (m.id === ANIM_BALL_ID) usesAnimBall = true;
      pos.set(m.id, {
        x: m.from.x + (m.to.x - m.from.x) * p,
        y: m.from.y + (m.to.y - m.from.y) * p,
      });
    }
  }

  const animated = new Set(timeline.steps.map((s) => s.arrowId));
  const pieces: Piece[] = diagram.pieces.map((pc) => {
    const at = pos.get(pc.id);
    return at ? { ...pc, x: at.x, y: at.y } : pc;
  });
  const ball = pos.get(ANIM_BALL_ID);
  if (usesAnimBall && ball) {
    pieces.push({ id: ANIM_BALL_ID, kind: "ball", x: ball.x, y: ball.y });
  }

  return {
    ...diagram,
    pieces,
    arrows: diagram.arrows.filter((a) => !animated.has(a.id) || shown.has(a.id)),
  };
}
