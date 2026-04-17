import type { Edge, Node } from "@xyflow/react";

import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

export const MIND_MAP_BUNDLE_PREFIX = "mmb-";
const MIND_MAP_BUNDLE_EDGE_PREFIX = "mmb-e-";
const MAX_PER_LEVEL = 50;

export function isBundleSeedNodeId(id: string): boolean {
  return typeof id === "string" && id.startsWith(MIND_MAP_BUNDLE_PREFIX);
}

export function isBundleSeedEdgeId(id: string): boolean {
  return typeof id === "string" && id.startsWith(MIND_MAP_BUNDLE_EDGE_PREFIX);
}

type ShapeNodeData = {
  label: string;
  colorIdx: number;
  shape: "rectangle";
  bundleRole?: "root" | "lo" | "concept" | "term";
};

function makeNode(id: string, data: ShapeNodeData): Node {
  return {
    id,
    type: "mindmapShape",
    position: { x: 0, y: 0 },
    data,
    style: { width: 220, height: 72 },
  };
}

function makeEdge(source: string, target: string, index: number): Edge {
  return {
    id: `${MIND_MAP_BUNDLE_EDGE_PREFIX}${index}`,
    source,
    target,
    type: "default",
  };
}

function slug(input: string, max = 48): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function truncate(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

export type MindMapSeedResult = {
  nodes: Node[];
  edges: Edge[];
};

export function buildMindMapFromBundle(bundle: SessionMaterialBundle): MindMapSeedResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let edgeIndex = 0;

  const rootLabel = bundle.topic || bundle.studyUnit || "Study Session";
  const rootId = `${MIND_MAP_BUNDLE_PREFIX}root`;
  nodes.push(
    makeNode(rootId, {
      label: truncate(rootLabel, 56),
      colorIdx: 6, // cyan
      shape: "rectangle",
      bundleRole: "root",
    }),
  );

  const loNodeIds = new Map<string, string>();
  const loSlice = bundle.learningObjectives.slice(0, MAX_PER_LEVEL);
  loSlice.forEach((lo, idx) => {
    const id = `${MIND_MAP_BUNDLE_PREFIX}lo-${idx}-${slug(lo.title)}`;
    loNodeIds.set(lo.title.toLowerCase(), id);
    const labelBase = lo.loCode ? `${lo.loCode} — ${lo.title}` : lo.title;
    nodes.push(
      makeNode(id, {
        label: truncate(labelBase, 80),
        colorIdx: 4, // yellow
        shape: "rectangle",
        bundleRole: "lo",
      }),
    );
    edges.push(makeEdge(rootId, id, edgeIndex++));
  });

  const conceptNodeIds = new Map<string, string>();
  const conceptSlice = bundle.concepts.slice(0, MAX_PER_LEVEL);
  conceptSlice.forEach((conceptEntry, idx) => {
    const id = `${MIND_MAP_BUNDLE_PREFIX}concept-${idx}-${slug(conceptEntry.concept)}`;
    conceptNodeIds.set(conceptEntry.concept.toLowerCase(), id);
    nodes.push(
      makeNode(id, {
        label: truncate(conceptEntry.concept, 72),
        colorIdx: 3, // green
        shape: "rectangle",
        bundleRole: "concept",
      }),
    );

    // Attach concept to first LO that mentions it (substring, case-insensitive);
    // otherwise attach to root.
    const needle = conceptEntry.concept.toLowerCase();
    const parentLoId = loSlice
      .map((lo) => ({ title: lo.title.toLowerCase(), id: loNodeIds.get(lo.title.toLowerCase()) }))
      .find(({ title }) => title.includes(needle))?.id;
    edges.push(makeEdge(parentLoId ?? rootId, id, edgeIndex++));
  });

  const termSlice = bundle.terms.slice(0, MAX_PER_LEVEL);
  termSlice.forEach((termEntry, idx) => {
    const id = `${MIND_MAP_BUNDLE_PREFIX}term-${idx}-${slug(termEntry.term)}`;
    const label = termEntry.definition
      ? `${termEntry.term}: ${termEntry.definition}`
      : termEntry.term;
    nodes.push(
      makeNode(id, {
        label: truncate(label, 100),
        colorIdx: 7, // rose
        shape: "rectangle",
        bundleRole: "term",
      }),
    );

    // Attach term to concept whose label contains the term string, else to root.
    const needle = termEntry.term.toLowerCase();
    const parentConceptId = conceptSlice
      .map((c) => ({ concept: c.concept.toLowerCase(), id: conceptNodeIds.get(c.concept.toLowerCase()) }))
      .find(({ concept }) => concept.includes(needle) || needle.includes(concept))?.id;
    edges.push(makeEdge(parentConceptId ?? rootId, id, edgeIndex++));
  });

  return { nodes, edges };
}
