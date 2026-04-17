import { describe, expect, it } from "vitest";

import { buildMindMapFromBundle, isBundleSeedNodeId } from "@/lib/mindMapFromBundle";
import {
  emptySessionMaterialBundle,
  type SessionMaterialBundle,
} from "@/lib/sessionMaterialBundle";

function bundleWith(overrides: Partial<SessionMaterialBundle>): SessionMaterialBundle {
  return {
    ...emptySessionMaterialBundle("workflow:test"),
    isReady: true,
    ...overrides,
  };
}

describe("buildMindMapFromBundle", () => {
  it("creates a single root node when bundle is minimal", () => {
    const { nodes, edges } = buildMindMapFromBundle(
      bundleWith({ topic: "Cardiology" }),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("mmb-root");
    expect(edges).toHaveLength(0);
    expect((nodes[0].data as { label: string }).label).toBe("Cardiology");
  });

  it("attaches LOs as children of the root", () => {
    const { nodes, edges } = buildMindMapFromBundle(
      bundleWith({
        topic: "PNF",
        learningObjectives: [
          { loCode: "LO-1", title: "Define PNF", materialId: null, sourceTitle: null },
          { loCode: null, title: "Compare CR and HR", materialId: null, sourceTitle: null },
        ],
      }),
    );

    const loNodes = nodes.filter((n) => (n.data as { bundleRole?: string }).bundleRole === "lo");
    expect(loNodes).toHaveLength(2);
    expect(nodes.every((n) => isBundleSeedNodeId(n.id))).toBe(true);
    // every LO edge should originate at root
    const loEdges = edges.filter((e) => loNodes.some((n) => n.id === e.target));
    expect(loEdges.every((e) => e.source === "mmb-root")).toBe(true);
  });

  it("prefers an LO parent for a concept when the concept string appears in an LO title", () => {
    const { nodes, edges } = buildMindMapFromBundle(
      bundleWith({
        topic: "PNF",
        learningObjectives: [
          {
            loCode: null,
            title: "Differentiate contract-relax and hold-relax",
            materialId: null,
            sourceTitle: null,
          },
          { loCode: null, title: "State the indications", materialId: null, sourceTitle: null },
        ],
        concepts: [
          { concept: "contract-relax", materialId: null, sourceTitle: null },
          { concept: "Unrelated topic", materialId: null, sourceTitle: null },
        ],
      }),
    );

    const contractRelaxNode = nodes.find((n) => (n.data as { label: string }).label.startsWith("contract-relax"));
    expect(contractRelaxNode).toBeTruthy();

    const contractRelaxEdge = edges.find((e) => e.target === contractRelaxNode?.id);
    expect(contractRelaxEdge).toBeTruthy();
    const parentNode = nodes.find((n) => n.id === contractRelaxEdge?.source);
    expect((parentNode?.data as { bundleRole?: string }).bundleRole).toBe("lo");

    // unrelated concept falls back to root
    const unrelated = nodes.find((n) => (n.data as { label: string }).label === "Unrelated topic");
    const unrelatedEdge = edges.find((e) => e.target === unrelated?.id);
    expect(unrelatedEdge?.source).toBe("mmb-root");
  });

  it("attaches a term to a concept when the concept label mentions the term", () => {
    const { nodes, edges } = buildMindMapFromBundle(
      bundleWith({
        concepts: [
          { concept: "Reciprocal inhibition pathway", materialId: null, sourceTitle: null },
        ],
        terms: [
          {
            term: "reciprocal inhibition",
            definition: "antagonist relaxes",
            materialId: null,
            sourceTitle: null,
          },
          {
            term: "Random term",
            definition: null,
            materialId: null,
            sourceTitle: null,
          },
        ],
      }),
    );

    const termNode = nodes.find((n) => (n.data as { label: string }).label.startsWith("reciprocal inhibition"));
    expect(termNode).toBeTruthy();

    const termEdge = edges.find((e) => e.target === termNode?.id);
    expect(termEdge).toBeTruthy();
    const parentNode = nodes.find((n) => n.id === termEdge?.source);
    expect((parentNode?.data as { bundleRole?: string }).bundleRole).toBe("concept");

    // random term -> root
    const randomTermNode = nodes.find((n) => (n.data as { label: string }).label === "Random term");
    const randomEdge = edges.find((e) => e.target === randomTermNode?.id);
    expect(randomEdge?.source).toBe("mmb-root");
  });

  it("caps each level at 50 items", () => {
    const bigConcepts = Array.from({ length: 70 }, (_, i) => ({
      concept: `Concept ${i}`,
      materialId: null,
      sourceTitle: null,
    }));
    const { nodes } = buildMindMapFromBundle(bundleWith({ concepts: bigConcepts }));
    const conceptNodes = nodes.filter((n) => (n.data as { bundleRole?: string }).bundleRole === "concept");
    expect(conceptNodes).toHaveLength(50);
  });

  it("every produced node id starts with the bundle prefix", () => {
    const { nodes } = buildMindMapFromBundle(
      bundleWith({
        topic: "Topic",
        learningObjectives: [{ loCode: "A", title: "One", materialId: null, sourceTitle: null }],
        concepts: [{ concept: "Two", materialId: null, sourceTitle: null }],
        terms: [{ term: "Three", definition: null, materialId: null, sourceTitle: null }],
      }),
    );
    expect(nodes.every((n) => isBundleSeedNodeId(n.id))).toBe(true);
  });
});
