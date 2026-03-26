import { describe, expect, it } from "vitest";

import {
  createStudioExcerptWorkspaceObject,
  getStudioExcerptObjectId,
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
});
