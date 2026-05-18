import { createShapeId, toRichText } from "@tldraw/tlschema";
import dagre from "dagre";

import { buildConceptGraphFromBundle } from "@/lib/conceptMapFromBundle";
import { buildMindMapFromBundle } from "@/lib/mindMapFromBundle";
import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

/**
 * Phase A: convert the existing mind-map node/edge graph into NATIVE tldraw
 * shapes (geo rectangles + arrows), laid out off-canvas with dagre. This is
 * a pure function — no editor/DOM — so it is fully unit-testable. Phase B
 * wires it to `editor.createShapes` from a deck action.
 */

export const MIND_MAP_CANVAS_PREFIX = "mindmap-canvas";

export function getMindMapCanvasShapeId(key: string) {
  return createShapeId(`${MIND_MAP_CANVAS_PREFIX}-${key}`);
}

export function isMindMapCanvasShapeId(id: unknown): boolean {
  return (
    typeof id === "string" &&
    id.startsWith(`shape:${MIND_MAP_CANVAS_PREFIX}-`)
  );
}

const NODE_W = 220;
const NODE_H = 72;

// Map the mind-map bundleRole to a valid tldraw DefaultColorStyle value.
const ROLE_COLOR: Record<string, string> = {
  root: "light-blue",
  lo: "yellow",
  concept: "green",
  term: "light-red",
};

type TldrawShapeSpec =
  | {
      id: ReturnType<typeof createShapeId>;
      type: "geo";
      x: number;
      y: number;
      props: {
        geo: "rectangle";
        w: number;
        h: number;
        color: string;
        fill: "none";
        dash: "solid";
        size: "s";
        font: "mono";
        align: "middle";
        richText: ReturnType<typeof toRichText>;
      };
      meta: { source: "mindmap-canvas"; nodeId: string };
    }
  | {
      id: ReturnType<typeof createShapeId>;
      type: "arrow";
      x: number;
      y: number;
      props: {
        start: { x: number; y: number };
        end: { x: number; y: number };
        color: "grey";
        dash: "solid";
        size: "s";
        fill: "none";
        arrowheadStart: "none";
        arrowheadEnd: "arrow";
        bend: number;
      };
      meta: { source: "mindmap-canvas"; edge: true };
    };

export type MindMapCanvasResult = {
  shapes: TldrawShapeSpec[];
  bounds: { x: number; y: number; w: number; h: number } | null;
};

/**
 * Lay the mind-map graph out left-to-right with dagre and emit native
 * tldraw shapes positioned at (originX, originY) + dagre coords.
 */
export function mindMapToTldrawShapes(
  bundle: SessionMaterialBundle,
  originX = 460,
  originY = 96,
): MindMapCanvasResult {
  // Don't emit a map for a not-ready session (mirrors buildSessionSeedShapes).
  if (!bundle.isReady) return { shapes: [], bounds: null };
  const { nodes, edges } = buildMindMapFromBundle(bundle);
  if (nodes.length === 0) return { shapes: [], bounds: null };

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 110, marginx: 8, marginy: 8 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  }
  dagre.layout(g);

  const shapes: TldrawShapeSpec[] = [];
  const centerById = new Map<string, { cx: number; cy: number }>();
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const n of nodes) {
    const dn = g.node(n.id);
    if (!dn) continue;
    // dagre gives node centers; tldraw geo x/y is top-left.
    const x = originX + dn.x - NODE_W / 2;
    const y = originY + dn.y - NODE_H / 2;
    centerById.set(n.id, { cx: originX + dn.x, cy: originY + dn.y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + NODE_W);
    maxY = Math.max(maxY, y + NODE_H);
    const role = (n.data as { bundleRole?: string }).bundleRole ?? "concept";
    const label = String((n.data as { label?: string }).label ?? "");
    shapes.push({
      id: getMindMapCanvasShapeId(n.id),
      type: "geo",
      x,
      y,
      props: {
        geo: "rectangle",
        w: NODE_W,
        h: NODE_H,
        color: ROLE_COLOR[role] ?? "light-blue",
        fill: "none",
        dash: "solid",
        size: "s",
        font: "mono",
        align: "middle",
        richText: toRichText(label),
      },
      meta: { source: "mindmap-canvas", nodeId: n.id },
    });
  }

  edges.forEach((e, idx) => {
    const a = centerById.get(e.source);
    const b = centerById.get(e.target);
    if (!a || !b) return;
    shapes.push({
      id: getMindMapCanvasShapeId(`edge-${idx}`),
      type: "arrow",
      x: 0,
      y: 0,
      props: {
        start: { x: a.cx, y: a.cy },
        end: { x: b.cx, y: b.cy },
        color: "grey",
        dash: "solid",
        size: "s",
        fill: "none",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        bend: 0,
      },
      meta: { source: "mindmap-canvas", edge: true },
    });
  });

  const bounds =
    minX === Infinity
      ? null
      : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  return { shapes, bounds };
}

export const CONCEPT_MAP_CANVAS_PREFIX = "conceptmap-canvas";

export function getConceptMapCanvasShapeId(key: string) {
  return createShapeId(`${CONCEPT_MAP_CANVAS_PREFIX}-${key}`);
}

export function isConceptMapCanvasShapeId(id: unknown): boolean {
  return (
    typeof id === "string" &&
    id.startsWith(`shape:${CONCEPT_MAP_CANVAS_PREFIX}-`)
  );
}

/**
 * Concept map → native tldraw shapes (geo + arrow), dagre-laid-out.
 * Mirrors mindMapToTldrawShapes; concept nodes use a single colour.
 */
export function conceptMapToTldrawShapes(
  bundle: SessionMaterialBundle,
  originX = 460,
  originY = 96,
): MindMapCanvasResult {
  if (!bundle.isReady) return { shapes: [], bounds: null };
  const { nodes, edges } = buildConceptGraphFromBundle(bundle);
  if (nodes.length === 0) return { shapes: [], bounds: null };

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 110, marginx: 8, marginy: 8 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  }
  dagre.layout(g);

  const shapes: TldrawShapeSpec[] = [];
  const centerById = new Map<string, { cx: number; cy: number }>();
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const n of nodes) {
    const dn = g.node(n.id);
    if (!dn) continue;
    const x = originX + dn.x - NODE_W / 2;
    const y = originY + dn.y - NODE_H / 2;
    centerById.set(n.id, { cx: originX + dn.x, cy: originY + dn.y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + NODE_W);
    maxY = Math.max(maxY, y + NODE_H);
    shapes.push({
      id: getConceptMapCanvasShapeId(n.id),
      type: "geo",
      x,
      y,
      props: {
        geo: "rectangle",
        w: NODE_W,
        h: NODE_H,
        color: "blue",
        fill: "none",
        dash: "solid",
        size: "s",
        font: "mono",
        align: "middle",
        richText: toRichText(n.label),
      },
      meta: { source: "mindmap-canvas", nodeId: n.id },
    });
  }

  edges.forEach((e, idx) => {
    const a = centerById.get(e.from);
    const b = centerById.get(e.to);
    if (!a || !b) return;
    shapes.push({
      id: getConceptMapCanvasShapeId(`edge-${idx}`),
      type: "arrow",
      x: 0,
      y: 0,
      props: {
        start: { x: a.cx, y: a.cy },
        end: { x: b.cx, y: b.cy },
        color: "grey",
        dash: "solid",
        size: "s",
        fill: "none",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        bend: 0,
      },
      meta: { source: "mindmap-canvas", edge: true },
    });
  });

  const bounds =
    minX === Infinity
      ? null
      : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  return { shapes, bounds };
}
