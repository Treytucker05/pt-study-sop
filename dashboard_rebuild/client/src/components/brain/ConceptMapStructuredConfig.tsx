import { Handle, MarkerType, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export const NODE_COLORS = [
  { name: "Default", border: "border-secondary", bg: "bg-black/80", text: "text-secondary-foreground", hex: "" },
  { name: "Red", border: "border-red-500", bg: "bg-red-500/10", text: "text-red-400", hex: "#ef4444" },
  { name: "Blue", border: "border-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", hex: "#3b82f6" },
  { name: "Green", border: "border-green-500", bg: "bg-green-500/10", text: "text-green-400", hex: "#22c55e" },
  { name: "Yellow", border: "border-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-400", hex: "#eab308" },
  { name: "Purple", border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", hex: "#a855f7" },
  { name: "Cyan", border: "border-cyan-400", bg: "bg-cyan-400/10", text: "text-cyan-400", hex: "#22d3ee" },
  { name: "Orange", border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-400", hex: "#f97316" },
  { name: "Pink", border: "border-pink-500", bg: "bg-pink-500/10", text: "text-pink-400", hex: "#ec4899" },
];

export const EDGE_COLORS = [
  { name: "Primary", stroke: "hsl(var(--primary))" },
  { name: "Red", stroke: "#ef4444" },
  { name: "Blue", stroke: "#3b82f6" },
  { name: "Green", stroke: "#22c55e" },
  { name: "Yellow", stroke: "#eab308" },
  { name: "Purple", stroke: "#a855f7" },
  { name: "Cyan", stroke: "#22d3ee" },
  { name: "Orange", stroke: "#f97316" },
  { name: "Pink", stroke: "#ec4899" },
];

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
