import { MarkerType } from "@xyflow/react";
import { CONCEPT_NODE_COLORS, CONCEPT_EDGE_COLORS } from "@/lib/colors";
import { StructuredShapeNode } from "./StructuredShapeNode";
import { StructuredEdge } from "./StructuredEdge";

export const NODE_COLORS = CONCEPT_NODE_COLORS;
export const EDGE_COLORS = CONCEPT_EDGE_COLORS;

// "arcade" kept as alias so saved canvases with type:"arcade" still render
export const NODE_TYPES = {
  structured: StructuredShapeNode,
  arcade: StructuredShapeNode,
};

export const EDGE_TYPES = {
  structured: StructuredEdge,
};

export const DEFAULT_EDGE_OPTIONS = {
  type: "structured" as const,
  style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
};
