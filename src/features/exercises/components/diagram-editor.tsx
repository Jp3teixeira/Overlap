"use client";

import { useRef, useState } from "react";
import { Eraser, Move, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ARROW_KINDS,
  ARROW_LABEL,
  changeField,
  clampToField,
  emptyDiagram,
  FIELD_LABEL,
  FIELD_TYPES,
  newId,
  PIECE_KINDS,
  PIECE_LABEL,
  type ArrowKind,
  type Diagram,
  type FieldType,
  type PieceKind,
} from "../diagram";
import { ArrowSwatch, PieceDot, PitchDiagram } from "./pitch-diagram";

type Tool = "move" | PieceKind | ArrowKind | "zone";

type Draft =
  | { type: "arrow"; kind: ArrowKind; x1: number; y1: number; x2: number; y2: number }
  | { type: "zone"; x0: number; y0: number; x: number; y: number };

const MIN_DRAW = 20;
const fieldOptions = FIELD_TYPES.map((value) => ({ value, label: FIELD_LABEL[value] }));

const HINT: Record<"move" | "piece" | "arrow" | "zone", string> = {
  move: "Toca numa peça, seta ou zona para a selecionar. Arrasta as peças para as mover.",
  piece: "Toca no campo para pôr a peça. Arrasta uma peça para a mover.",
  arrow: "Arrasta no campo, do início ao fim da seta.",
  zone: "Arrasta no campo para marcar a zona (espaço do exercício).",
};

/**
 * Editor do campo. Toque para pôr peças, arrastar para mover, arrastar para desenhar setas e zonas.
 * Tudo com ponteiros (dedo ou rato), sem bibliotecas.
 */
export function DiagramEditor({
  value,
  onChange,
}: {
  value: Diagram | null;
  onChange: (next: Diagram | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; before: Diagram; moved: boolean } | null>(null);
  const [tool, setTool] = useState<Tool>("a");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [past, setPast] = useState<Diagram[]>([]);
  const [confirm, setConfirm] = useState<"clear" | "remove" | null>(null);

  if (!value) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-[13px]">
          Escolhe o espaço para desenhar o exercício.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {FIELD_TYPES.map((f) => (
            <Button
              key={f}
              type="button"
              variant="outline"
              onClick={() => onChange(emptyDiagram(f))}
            >
              {FIELD_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const diagram = value;
  const view: Diagram = draft ? withDraft(diagram, draft) : diagram;
  const selectedPiece = diagram.pieces.find((p) => p.id === selected);
  const isPieceTool = (PIECE_KINDS as readonly string[]).includes(tool);
  const isArrowTool = (ARROW_KINDS as readonly string[]).includes(tool);
  const hint =
    HINT[tool === "move" ? "move" : tool === "zone" ? "zone" : isArrowTool ? "arrow" : "piece"];

  function commit(next: Diagram, snapshot: Diagram = diagram) {
    setPast((p) => [...p.slice(-29), snapshot]);
    setConfirm(null);
    onChange(next);
  }

  function toField(e: React.PointerEvent): { x: number; y: number } | null {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return clampToField(diagram.field, p.x, p.y);
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const pt = toField(e);
    if (!pt) return;
    const hitId = (e.target as Element).closest("[data-id]")?.getAttribute("data-id") ?? null;
    setConfirm(null);

    if (isArrowTool) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelected(null);
      setDraft({ type: "arrow", kind: tool as ArrowKind, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      return;
    }
    if (tool === "zone") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelected(null);
      setDraft({ type: "zone", x0: pt.x, y0: pt.y, x: pt.x, y: pt.y });
      return;
    }

    if (hitId) {
      setSelected(hitId);
      if (diagram.pieces.some((p) => p.id === hitId)) {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { id: hitId, before: diagram, moved: false };
      }
      return;
    }

    if (isPieceTool) {
      if (diagram.pieces.length >= 40) return void toast.error("O campo já tem 40 peças.");
      const kind = tool as PieceKind;
      const id = newId();
      commit({
        ...diagram,
        pieces: [
          ...diagram.pieces,
          { id, kind, x: pt.x, y: pt.y, ...(kind === "goal" ? { r: 0 } : {}) },
        ],
      });
      setSelected(id);
    } else {
      setSelected(null);
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const pt = toField(e);
    if (!pt) return;
    if (draft?.type === "arrow") return setDraft({ ...draft, x2: pt.x, y2: pt.y });
    if (draft?.type === "zone") return setDraft({ ...draft, x: pt.x, y: pt.y });

    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) {
      drag.moved = true;
      setPast((p) => [...p.slice(-29), drag.before]);
    }
    onChange({
      ...diagram,
      pieces: diagram.pieces.map((p) => (p.id === drag.id ? { ...p, x: pt.x, y: pt.y } : p)),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
    if (!draft) return;
    setDraft(null);

    if (draft.type === "arrow") {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) < MIN_DRAW) return;
      if (diagram.arrows.length >= 30) return void toast.error("O campo já tem 30 setas.");
      const id = newId();
      const { type: _type, ...arrow } = draft;
      void _type;
      commit({ ...diagram, arrows: [...diagram.arrows, { id, ...arrow }] });
      setSelected(id);
      return;
    }

    const x = Math.min(draft.x0, draft.x);
    const y = Math.min(draft.y0, draft.y);
    const w = Math.abs(draft.x - draft.x0);
    const h = Math.abs(draft.y - draft.y0);
    if (w < MIN_DRAW || h < MIN_DRAW) return;
    if (diagram.zones.length >= 6) return void toast.error("O campo já tem 6 zonas.");
    const id = newId();
    commit({ ...diagram, zones: [...diagram.zones, { id, x, y, w, h }] });
    setSelected(id);
  }

  function cancelPointer() {
    dragRef.current = null;
    setDraft(null);
  }

  function undo() {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast(past.slice(0, -1));
    setSelected(null);
    setConfirm(null);
    onChange(prev);
  }

  function removeSelected() {
    if (!selected) return;
    commit({
      ...diagram,
      pieces: diagram.pieces.filter((p) => p.id !== selected),
      arrows: diagram.arrows.filter((a) => a.id !== selected),
      zones: diagram.zones.filter((z) => z.id !== selected),
    });
    setSelected(null);
  }

  /** Roda a baliza selecionada para `angle` graus. `record` guarda um passo no "Desfazer". */
  function rotateSelected(angle: number, record: boolean) {
    if (!selectedPiece || selectedPiece.kind !== "goal") return;
    const next = {
      ...diagram,
      pieces: diagram.pieces.map((p) => (p.id === selectedPiece.id ? { ...p, r: angle } : p)),
    };
    if (record) commit(next);
    else onChange(next);
  }

  function clearAll() {
    if (confirm !== "clear") return setConfirm("clear");
    setSelected(null);
    commit(emptyDiagram(diagram.field));
  }

  function removeField() {
    if (confirm !== "remove") return setConfirm("remove");
    setSelected(null);
    setPast([]);
    setConfirm(null);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        aria-label="Tipo de campo"
        options={fieldOptions}
        value={diagram.field}
        onChange={(f: FieldType) => commit(changeField(diagram, f))}
      />

      <div className="bg-muted overflow-hidden rounded-lg border">
        <PitchDiagram
          ref={svgRef}
          diagram={view}
          selectedId={selected}
          className="max-h-[55dvh] touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelPointer}
        />
      </div>
      <p className="text-muted-foreground text-[13px]">{hint}</p>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Peças</span>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          <ToolButton active={tool === "move"} onClick={() => setTool("move")} label="Mover">
            <Move className="!size-4" />
          </ToolButton>
          {PIECE_KINDS.map((k) => (
            <ToolButton
              key={k}
              active={tool === k}
              onClick={() => setTool(k)}
              label={PIECE_LABEL[k]}
            >
              <span className="grid size-6 place-items-center rounded bg-[#3a8a4f]">
                <PieceDot kind={k} />
              </span>
            </ToolButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Desenhar</span>
        <div className="grid grid-cols-4 gap-1.5">
          {ARROW_KINDS.map((k) => (
            <ToolButton
              key={k}
              active={tool === k}
              onClick={() => setTool(k)}
              label={ARROW_LABEL[k]}
            >
              <span className="grid size-6 place-items-center rounded bg-[#3a8a4f]">
                <ArrowSwatch kind={k} />
              </span>
            </ToolButton>
          ))}
          <ToolButton active={tool === "zone"} onClick={() => setTool("zone")} label="Zona">
            <span className="grid size-6 place-items-center rounded bg-[#3a8a4f]">
              <span className="size-4 rounded-[3px] border border-dashed border-white bg-white/20" />
            </span>
          </ToolButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={past.length === 0}
        >
          <Undo2 />
          Desfazer
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={removeSelected}
          disabled={!selected}
        >
          <Trash2 />
          Apagar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={clearAll}
          disabled={view.pieces.length + view.arrows.length + view.zones.length === 0}
        >
          <Eraser />
          {confirm === "clear" ? "Toca outra vez" : "Limpar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={removeField}
        >
          {confirm === "remove" ? "Toca outra vez" : "Tirar campo"}
        </Button>
      </div>

      {selectedPiece?.kind === "goal" && (
        <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <label htmlFor="goal-angle" className="text-sm font-medium">
            Ângulo da baliza: {Math.round((selectedPiece.r ?? 0) % 180)}°
          </label>
          <input
            id="goal-angle"
            type="range"
            min={0}
            max={175}
            step={5}
            value={Math.round((selectedPiece.r ?? 0) % 180)}
            onPointerDown={() => setPast((p) => [...p.slice(-29), diagram])}
            onChange={(e) => rotateSelected(Number(e.target.value), false)}
            className="accent-primary h-11 w-full"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 45, 90, 135].map((deg) => (
              <Button
                key={deg}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => rotateSelected(deg, true)}
              >
                {deg}°
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-[12px] leading-none font-medium outline-none focus-visible:ring-2",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground active:bg-muted",
      )}
    >
      {children}
      {label}
    </button>
  );
}

/** O desenho com o gesto em curso (seta ou zona a ser desenhada) acrescentado, só para mostrar. */
function withDraft(d: Diagram, draft: Draft): Diagram {
  if (draft.type === "arrow") {
    const { type: _type, ...arrow } = draft;
    void _type;
    return { ...d, arrows: [...d.arrows, { id: "draft", ...arrow }] };
  }
  return {
    ...d,
    zones: [
      ...d.zones,
      {
        id: "draft",
        x: Math.min(draft.x0, draft.x),
        y: Math.min(draft.y0, draft.y),
        w: Math.abs(draft.x - draft.x0),
        h: Math.abs(draft.y - draft.y0),
      },
    ],
  };
}
