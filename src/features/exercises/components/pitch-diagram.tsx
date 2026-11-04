import { cn } from "@/lib/utils";
import {
  ARROW_LABEL,
  arrowGeometry,
  FIELD_SIZE,
  PIECE_FILL,
  PIECE_LABEL,
  PIECE_RADIUS,
  usedKinds,
  type Arrow,
  type ArrowKind,
  type Diagram,
  type FieldType,
  type Piece,
  type PieceKind,
} from "../diagram";

// Desenho de um campo em SVG. Sem estado nem browser APIs: serve a ficha (grande),
// a lista (miniatura) e o editor (que acrescenta os eventos de ponteiro por cima).

const GRASS = ["#3f9455", "#3a8a4f"];
const LINE = "#ffffff";
const SELECT = "var(--marker)";

type Props = Omit<React.ComponentProps<"svg">, "children"> & {
  diagram: Diagram;
  /** Id da peça, seta ou zona selecionada (editor). */
  selectedId?: string | null;
};

export function PitchDiagram({ diagram, selectedId = null, className, ...svg }: Props) {
  const { w, h } = FIELD_SIZE[diagram.field];
  const r = PIECE_RADIUS[diagram.field];
  const k = r / 16;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Desenho do exercício no campo"
      className={cn("block h-auto w-full select-none", className)}
      {...svg}
    >
      <Pitch field={diagram.field} k={k} />

      {diagram.zones.map((z) => (
        <g key={z.id} data-id={z.id}>
          <rect
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            fill="rgba(255,255,255,0.14)"
            stroke={selectedId === z.id ? SELECT : LINE}
            strokeWidth={(selectedId === z.id ? 4 : 2.5) * k}
            strokeDasharray={`${8 * k} ${6 * k}`}
            style={{ pointerEvents: "stroke" }}
          />
          {/* Área de toque mais larga que o traço. */}
          <rect
            x={z.x}
            y={z.y}
            width={z.w}
            height={z.h}
            fill="none"
            stroke="transparent"
            strokeWidth={22 * k}
            style={{ pointerEvents: "stroke" }}
          />
        </g>
      ))}

      {diagram.arrows.map((a) => (
        <ArrowShape key={a.id} arrow={a} k={k} selected={selectedId === a.id} />
      ))}

      {diagram.pieces.map((p) => (
        <PieceShape key={p.id} piece={p} r={r} k={k} selected={selectedId === p.id} />
      ))}
    </svg>
  );
}

function Pitch({ field, k }: { field: FieldType; k: number }) {
  const { w, h } = FIELD_SIZE[field];
  const sw = 2.5 * k;
  const line = { fill: "none", stroke: LINE, strokeWidth: sw } as const;
  const inset = 6;

  // Riscas de relva: verticais no campo todo, horizontais nos outros.
  const vertical = field === "campo";
  const bands = vertical ? 10 : 8;
  const size = (vertical ? w : h) / bands;

  return (
    <g pointerEvents="none">
      {Array.from({ length: bands }, (_, i) =>
        vertical ? (
          <rect key={i} x={i * size} y={0} width={size} height={h} fill={GRASS[i % 2]} />
        ) : (
          <rect key={i} x={0} y={i * size} width={w} height={size} fill={GRASS[i % 2]} />
        ),
      )}
      <rect x={inset} y={inset} width={w - inset * 2} height={h - inset * 2} {...line} />

      {field === "campo" && (
        <>
          <line x1={w / 2} y1={inset} x2={w / 2} y2={h - inset} {...line} />
          <circle cx={w / 2} cy={h / 2} r={50} {...line} />
          <rect x={inset} y={h / 2 - 110} width={90} height={220} {...line} />
          <rect x={w - inset - 90} y={h / 2 - 110} width={90} height={220} {...line} />
          <rect x={inset} y={h / 2 - 30} width={8} height={60} fill={LINE} />
          <rect x={w - inset - 8} y={h / 2 - 30} width={8} height={60} fill={LINE} />
        </>
      )}

      {field === "meio" && (
        <>
          <rect x={w / 2 - 110} y={inset} width={220} height={90} {...line} />
          <rect x={w / 2 - 30} y={inset} width={60} height={8} fill={LINE} />
          <path
            d={`M${w / 2 - 50} ${h - inset} A50 50 0 0 1 ${w / 2 + 50} ${h - inset}`}
            {...line}
          />
        </>
      )}

      {field === "quadrado" && (
        <path
          d={`M${w / 2} ${inset} V${h - inset} M${inset} ${h / 2} H${w - inset}`}
          {...line}
          strokeOpacity={0.35}
          strokeDasharray={`${6 * k} ${8 * k}`}
        />
      )}
    </g>
  );
}

function ArrowShape({ arrow, k, selected }: { arrow: Arrow; k: number; selected: boolean }) {
  const g = arrowGeometry(arrow, k);
  if (!g) return null;
  const dash = arrow.kind === "pass" ? `${9 * k} ${7 * k}` : undefined;
  return (
    <g data-id={arrow.id}>
      {selected && (
        <>
          <path d={g.line} fill="none" stroke={SELECT} strokeWidth={8 * k} strokeLinecap="round" />
          <polygon
            points={g.head}
            fill={SELECT}
            stroke={SELECT}
            strokeWidth={5 * k}
            strokeLinejoin="round"
          />
        </>
      )}
      <path
        d={g.line}
        fill="none"
        stroke={LINE}
        strokeWidth={3 * k}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points={g.head} fill={LINE} />
      {/* Área de toque mais larga que o traço. */}
      <path
        d={g.line}
        fill="none"
        stroke="transparent"
        strokeWidth={24 * k}
        strokeLinecap="round"
      />
    </g>
  );
}

function PieceShape({
  piece,
  r,
  k,
  selected,
}: {
  piece: Piece;
  r: number;
  k: number;
  selected: boolean;
}) {
  const { kind, x, y } = piece;
  const stroke = LINE;
  return (
    <g data-id={piece.id} transform={`translate(${x} ${y})`}>
      {selected && (
        <circle r={r * 1.75} fill="rgba(226,179,58,0.25)" stroke={SELECT} strokeWidth={2.5 * k} />
      )}
      {(kind === "a" || kind === "b" || kind === "n") && (
        <circle r={r} fill={PIECE_FILL[kind]} stroke={stroke} strokeWidth={2 * k} />
      )}
      {kind === "gk" && (
        <>
          <circle r={r} fill={PIECE_FILL.gk} stroke={stroke} strokeWidth={2 * k} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={r * 0.9}
            fontWeight={700}
            fill="#fff"
          >
            GR
          </text>
        </>
      )}
      {kind === "cone" && (
        <polygon
          points={`0,${-r * 0.9} ${r * 0.8},${r * 0.7} ${-r * 0.8},${r * 0.7}`}
          fill={PIECE_FILL.cone}
          stroke={stroke}
          strokeWidth={1.5 * k}
          strokeLinejoin="round"
        />
      )}
      {kind === "goal" && (
        <rect
          x={-r * 1.6}
          y={-r * 0.55}
          width={r * 3.2}
          height={r * 1.1}
          fill="rgba(255,255,255,0.92)"
          stroke="#111827"
          strokeWidth={1.5 * k}
          transform={piece.r === 90 ? "rotate(90)" : undefined}
        />
      )}
      {kind === "ball" && (
        <circle r={r * 0.55} fill={PIECE_FILL.ball} stroke="#111827" strokeWidth={1.8 * k} />
      )}
      {/* Área de toque generosa para o dedo. */}
      <circle r={r * 2} fill="transparent" />
    </g>
  );
}

/** Legenda do que aparece no desenho: o que cada cor e cada tipo de seta quer dizer. */
export function DiagramLegend({ diagram }: { diagram: Diagram }) {
  const used = usedKinds(diagram);
  const items: { key: string; label: string; icon: React.ReactNode }[] = [
    ...used.pieces.map((kind) => ({
      key: kind,
      label: PIECE_LABEL[kind],
      icon: <PieceDot kind={kind} />,
    })),
    ...used.arrows.map((kind) => ({
      key: kind,
      label: ARROW_LABEL[kind],
      icon: <ArrowSwatch kind={kind} />,
    })),
    ...(used.zones
      ? [
          {
            key: "zone",
            label: "Zona",
            icon: (
              <span className="size-4 rounded-[3px] border border-dashed border-white bg-white/20" />
            ),
          },
        ]
      : []),
  ];
  if (items.length === 0) return null;
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          <span className="grid size-6 place-items-center rounded bg-[#3a8a4f]">{i.icon}</span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function PieceDot({ kind }: { kind: PieceKind }) {
  if (kind === "goal")
    return <span className="h-2 w-4 rounded-[1px] border border-[#111827] bg-white/90" />;
  if (kind === "cone")
    return (
      <span
        className="size-3"
        style={{ background: PIECE_FILL.cone, clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
      />
    );
  return (
    <span
      className={cn("rounded-full border border-white", kind === "ball" ? "size-2.5" : "size-3.5")}
      style={{ background: PIECE_FILL[kind] }}
    />
  );
}

export function ArrowSwatch({ kind }: { kind: ArrowKind }) {
  const g = arrowGeometry({ kind, x1: 2, y1: 12, x2: 22, y2: 12 }, 0.45);
  if (!g) return null;
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path
        d={g.line}
        fill="none"
        stroke="#fff"
        strokeWidth={1.6}
        strokeDasharray={kind === "pass" ? "4 3" : undefined}
        strokeLinecap="round"
      />
      <polygon points={g.head} fill="#fff" />
    </svg>
  );
}
