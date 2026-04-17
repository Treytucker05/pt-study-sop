import { describe, expect, it } from "vitest";

import { buildConceptMapFromBundle } from "@/lib/conceptMapFromBundle";
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

describe("buildConceptMapFromBundle", () => {
  it("returns an empty string when there are no concepts", () => {
    expect(buildConceptMapFromBundle(bundleWith({}))).toBe("");
  });

  it("emits a flowchart header + node lines when only concepts exist", () => {
    const result = buildConceptMapFromBundle(
      bundleWith({
        concepts: [
          { concept: "Reciprocal inhibition", materialId: null, sourceTitle: null },
          { concept: "Autogenic inhibition", materialId: null, sourceTitle: null },
        ],
      }),
    );
    expect(result).toContain("flowchart LR");
    expect(result).toContain("C1[Reciprocal inhibition]");
    expect(result).toContain("C2[Autogenic inhibition]");
    expect(result).not.toContain("-->");
  });

  it("draws a chain edge between consecutive hits inside a root_explanation", () => {
    const result = buildConceptMapFromBundle(
      bundleWith({
        concepts: [
          { concept: "contract-relax", materialId: null, sourceTitle: null },
          { concept: "hold-relax", materialId: null, sourceTitle: null },
          { concept: "agonist contract", materialId: null, sourceTitle: null },
        ],
        rootExplanations: [
          {
            text: "PNF uses contract-relax followed by hold-relax, then agonist contract.",
            materialId: null,
            sourceTitle: null,
          },
        ],
      }),
    );
    expect(result).toContain("C1 --> C2");
    expect(result).toContain("C2 --> C3");
  });

  it("links a term's defining concept to other mentioned concepts", () => {
    const result = buildConceptMapFromBundle(
      bundleWith({
        concepts: [
          { concept: "reciprocal inhibition", materialId: null, sourceTitle: null },
          { concept: "antagonist muscle", materialId: null, sourceTitle: null },
        ],
        terms: [
          {
            term: "reciprocal inhibition",
            definition: "When the antagonist muscle is relaxed by the CNS.",
            materialId: null,
            sourceTitle: null,
          },
        ],
      }),
    );
    expect(result).toContain("C1 --> C2");
  });

  it("escapes brackets and pipes in concept labels", () => {
    const result = buildConceptMapFromBundle(
      bundleWith({
        concepts: [
          { concept: "[PNF] | stretching", materialId: null, sourceTitle: null },
        ],
      }),
    );
    expect(result).toContain("C1[PNF stretching]");
  });

  it("caps output at MAX_EDGES (80) even with many co-occurrences", () => {
    const concepts = Array.from({ length: 30 }, (_, i) => ({
      concept: `concept${i}`,
      materialId: null,
      sourceTitle: null,
    }));
    const bigText = concepts.map((c) => c.concept).join(" ");
    const result = buildConceptMapFromBundle(
      bundleWith({
        concepts,
        rootExplanations: [
          { text: bigText, materialId: null, sourceTitle: null },
        ],
      }),
    );
    const edgeCount = (result.match(/-->/g) || []).length;
    expect(edgeCount).toBeLessThanOrEqual(80);
  });
});
