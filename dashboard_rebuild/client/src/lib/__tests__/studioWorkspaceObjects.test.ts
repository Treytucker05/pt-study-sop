import { describe, expect, it } from "vitest";

import {
  createStudioPrimingResultWorkspaceObject,
  createStudioExcerptWorkspaceObject,
  getStudioExcerptObjectId,
  normalizeStudioWorkspaceObjects,
} from "@/lib/studioWorkspaceObjects";

describe("studioWorkspaceObjects", () => {
  it("creates excerpt workspace objects with stable provenance", () => {
    const excerpt = createStudioExcerptWorkspaceObject({
      materialId: 101,
      sourcePath: "uploads/cardio-output.pdf",
      fileType: "pdf",
      sourceTitle: "Cardiac Output Lecture",
      excerptText:
        "Cardiac output is determined by stroke volume multiplied by heart rate.",
      selectionLabel: "Paragraph 1",
    });

    expect(excerpt).toMatchObject({
      id: getStudioExcerptObjectId({
        materialId: 101,
        excerptText:
          "Cardiac output is determined by stroke volume multiplied by heart rate.",
        selectionLabel: "Paragraph 1",
      }),
      kind: "excerpt",
      title: "Excerpt: Cardiac Output Lecture",
      detail:
        "Cardiac output is determined by stroke volume multiplied by heart rate.",
      badge: "EXCERPT",
      provenance: {
        materialId: 101,
        sourcePath: "uploads/cardio-output.pdf",
        fileType: "pdf",
        sourceTitle: "Cardiac Output Lecture",
        selectionLabel: "Paragraph 1",
      },
    });
  });

  it("normalizes image, diagram, and link workspace object types", () => {
    const normalized = normalizeStudioWorkspaceObjects([
      {
        id: "image:source-1",
        kind: "image",
        title: "Screenshot: Frank-Starling graph",
        detail: "Pressure-volume loop screenshot for the current study unit.",
        badge: "SCREENSHOT",
        asset: {
          url: "https://example.com/pv-loop.png",
          mimeType: "image/png",
        },
      },
      {
        id: "diagram:source-1",
        kind: "diagram_sketch",
        title: "PV loop sketch",
        detail: "Manual sketch of ventricular phases.",
        badge: "SKETCH",
        content: {
          format: "text/markdown",
          data: "A -> B -> C -> D",
        },
      },
      {
        id: "link:source-1",
        kind: "link_reference",
        title: "Frank-Starling review",
        detail: "External review article for follow-up reading.",
        badge: "REFERENCE",
        href: "https://example.com/frank-starling",
      },
    ]);

    expect(normalized).toEqual([
      expect.objectContaining({
        kind: "image",
        badge: "SCREENSHOT",
        asset: expect.objectContaining({
          url: "https://example.com/pv-loop.png",
        }),
      }),
      expect.objectContaining({
        kind: "diagram_sketch",
        badge: "SKETCH",
        content: expect.objectContaining({
          data: "A -> B -> C -> D",
        }),
      }),
      expect.objectContaining({
        kind: "link_reference",
        badge: "REFERENCE",
        href: "https://example.com/frank-starling",
      }),
    ]);
  });

  it("creates and normalizes priming result workspace notes", () => {
    const primingResult = createStudioPrimingResultWorkspaceObject({
      resultKey: "learning-objectives",
      title: "Learning Objectives",
      detail: "1. Explain cardiac output regulation",
      badge: "OBJECTIVES",
      sourceLabel: "Cardiac Output Lecture",
    });

    expect(primingResult).toMatchObject({
      kind: "text_note",
      title: "Learning Objectives",
      badge: "OBJECTIVES",
      provenance: {
        sourceType: "priming_result",
        resultKey: "learning-objectives",
        sourceLabel: "Cardiac Output Lecture",
      },
    });

    expect(normalizeStudioWorkspaceObjects([primingResult])).toEqual([
      expect.objectContaining({
        kind: "text_note",
        provenance: expect.objectContaining({
          sourceType: "priming_result",
        }),
      }),
    ]);
  });
});
