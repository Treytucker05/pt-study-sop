import { useState, useCallback, type KeyboardEvent } from "react";
import { Handle, NodeResizer, Position, MarkerType, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CONCEPT_NODE_COLORS } from "@/lib/colors";

export const MIND_MAP_SHAPES = ["rectangle", "circle", "diamond", "hexagon"] as const;
export type MindMapShape = (typeof MIND_MAP_SHAPES)[number];

export interface MindMapShapeData {
  label: string;
  colorIdx: number;
  shape: MindMapShape;
  [key: string]: unknown;
}

export interface MindMapImageData {
  src: string;
  [key: string]: unknown;
}

const NODE_COLORS = CONCEPT_NODE_COLORS;

const HEXAGON_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

function ShapeWrapper({
  shape,
  className,
  children,
}: {
  shape: MindMapShape;
  className?: string;
  children: React.ReactNode;
}) {
  if (shape === "circle") {
    return (
      <div className={cn("flex items-center justify-center aspect-square rounded-full", className)}>
        {children}
      </div>
    );
  }
  if (shape === "diamond") {
    return (
      <div className={cn("flex items-center justify-center rotate-45", className)}>
        <div className="-rotate-45">{children}</div>
      </div>
    );
  }
  if (shape === "hexagon") {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ clipPath: HEXAGON_CLIP }}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-center rounded-md", className)}>
      {children}
    </div>
  );
}

export function MindMapShapeNode({ data, selected, id }: NodeProps) {
  const { label, colorIdx = 0, shape = "rectangle" } = data as MindMapShapeData;
  const color = NODE_COLORS[colorIdx] || NODE_COLORS[0];
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (editValue.trim() && editValue !== label) {
      const event = new CustomEvent("mindmap:node-label", {
        detail: { id, label: editValue.trim() },
      });
      window.dispatchEvent(event);
    }
  }, [editValue, label, id]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") {
        setEditValue(label);
        setEditing(false);
      }
    },
    [commitEdit, label]
  );

  const handleStyle = "!bg-primary !border-primary !w-2 !h-2";

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={60}
        minHeight={30}
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-primary !w-2 !h-2"
      />
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <Handle type="target" position={Position.Left} className={handleStyle} />
      <ShapeWrapper
        shape={shape}
        className={cn(
          "w-full h-full px-3 py-2 border-2 font-terminal text-xs text-center min-w-[60px]",
          selected
            ? "border-primary text-primary ring-1 ring-primary"
            : `${color.border} ${color.text}`,
          color.bg
        )}
      >
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKeyDown}
            className="bg-transparent border-b border-primary text-center text-xs font-terminal outline-none w-full"
          />
        ) : (
          <span onDoubleClick={() => { setEditValue(label); setEditing(true); }}>
            {label}
          </span>
        )}
      </ShapeWrapper>
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
      <Handle type="source" position={Position.Right} className={handleStyle} />
    </>
  );
}

export function MindMapImageNode({ data, selected }: NodeProps) {
  const { src } = data as MindMapImageData;
  const handleStyle = "!bg-primary !border-primary !w-2 !h-2";

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={50}
        minHeight={50}
        keepAspectRatio
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-primary !w-2 !h-2"
      />
      <Handle type="target" position={Position.Top} className={handleStyle} />
      <Handle type="target" position={Position.Left} className={handleStyle} />
      <img
        src={src}
        alt="pasted"
        className={cn(
          "w-full h-full object-contain border-2 rounded-md",
          selected ? "border-primary ring-1 ring-primary" : "border-secondary/50"
        )}
        draggable={false}
      />
      <Handle type="source" position={Position.Bottom} className={handleStyle} />
      <Handle type="source" position={Position.Right} className={handleStyle} />
    </>
  );
}

export const MIND_MAP_NODE_TYPES = {
  mindmapShape: MindMapShapeNode,
  mindmapImage: MindMapImageNode,
};

export const MIND_MAP_DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep" as const,
  style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
};
