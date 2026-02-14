import { useCallback, useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CONCEPT_NODE_COLORS } from "@/lib/colors";

export type StructuredShape = "rectangle" | "circle" | "diamond" | "hexagon";

export const STRUCTURED_SHAPES: StructuredShape[] = [
  "rectangle",
  "circle",
  "diamond",
  "hexagon",
];

export const SHAPE_SIZES: Record<StructuredShape, { width: number; height: number }> = {
  rectangle: { width: 200, height: 72 },
  circle: { width: 110, height: 110 },
  diamond: { width: 130, height: 130 },
  hexagon: { width: 180, height: 96 },
};

const DIAMOND_CLIP = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
const HEXAGON_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

interface ShapeWrapperProps {
  shape: StructuredShape;
  selected: boolean;
  color: (typeof CONCEPT_NODE_COLORS)[number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function ShapeWrapper({ shape, selected, color, children, style }: ShapeWrapperProps) {
  const base = cn(
    "w-full h-full flex items-center justify-center p-3 border-2 font-terminal text-xs text-center",
    selected
      ? "border-primary text-primary ring-1 ring-primary"
      : `${color.border} ${color.text}`,
    color.bg
  );

  if (shape === "circle") {
    return (
      <div className={cn(base, "rounded-full")} style={style}>
        {children}
      </div>
    );
  }

  if (shape === "diamond" || shape === "hexagon") {
    const clip = shape === "diamond" ? DIAMOND_CLIP : HEXAGON_CLIP;
    return (
      <div
        className={cn(base, "rounded-none")}
        style={{ ...style, clipPath: clip }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cn(base, "rounded-none")} style={style}>
      {children}
    </div>
  );
}

export function StructuredShapeNode({ data, selected }: NodeProps) {
  const label = (data as { label: string }).label ?? "";
  const colorIdx = (data as { colorIdx?: number }).colorIdx ?? 0;
  const shape: StructuredShape =
    (data as { shape?: StructuredShape }).shape ?? "rectangle";
  const color = CONCEPT_NODE_COLORS[colorIdx] || CONCEPT_NODE_COLORS[0];

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(label);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, label]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      window.dispatchEvent(
        new CustomEvent("structured:node-label", {
          detail: { label: trimmed },
        })
      );
    }
  }, [editValue, label]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [commitEdit]
  );

  const handleClass = "!bg-primary !border-primary !w-3 !h-3 !z-10";

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={shape === "rectangle" ? 110 : 80}
        minHeight={shape === "rectangle" ? 48 : 80}
        keepAspectRatio={shape !== "rectangle"}
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-primary !w-2 !h-2"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="target" position={Position.Left} className={handleClass} />
      <ShapeWrapper shape={shape} selected={!!selected} color={color}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-b border-primary text-primary text-xs font-terminal text-center w-full outline-none"
            autoFocus
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)}>{label}</span>
        )}
      </ShapeWrapper>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <Handle type="source" position={Position.Right} className={handleClass} />
    </>
  );
}
