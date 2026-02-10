import { Handle, MarkerType, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { CONCEPT_NODE_COLORS, CONCEPT_EDGE_COLORS } from "@/lib/colors";

export const NODE_COLORS = CONCEPT_NODE_COLORS;
export const EDGE_COLORS = CONCEPT_EDGE_COLORS;

export function ArcadeNode({ data, selected }: NodeProps) {
  const label = (data as { label: string }).label;
  const colorIdx = (data as { colorIdx?: number }).colorIdx ?? 0;
  const color = NODE_COLORS[colorIdx] || NODE_COLORS[0];
  return (
    <div
      className={cn(
        "px-3 py-2 font-terminal text-xs border-2 rounded-none min-w-[100px] text-center",
        selected ? "border-primary text-primary ring-1 ring-primary" : `${color.border} ${color.text}`,
        color.bg
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !border-primary !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-primary !border-primary !w-2 !h-2" />
      {label}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !border-primary !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-primary !border-primary !w-2 !h-2" />
    </div>
  );
}

export const NODE_TYPES = { arcade: ArcadeNode };

export const DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep" as const,
  style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
};
