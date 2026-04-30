import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudioWorkspaceMaterialSidebar } from "@/components/studio/StudioWorkspaceMaterialSidebar";
import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

function buildBundle(
  overrides: Partial<SessionMaterialBundle> = {},
): SessionMaterialBundle {
  return {
    isReady: true,
    sessionKey: "test-session",
    topic: null,
    studyUnit: null,
    courseId: 1,
    courseName: null,
    learningObjectives: [],
    concepts: [],
    terms: [],
    summaries: [],
    rootExplanations: [],
    gaps: [],
    artifacts: [],
    turnCount: 0,
    primePacket: [],
    polishPacket: [],
    notes: [],
    ...overrides,
  };
}

describe("StudioWorkspaceMaterialSidebar", () => {
  it("renders a stage chip on each material item showing which pipeline stage it belongs to", () => {
    const bundle = buildBundle({
      primePacket: [
        {
          id: "promoted-excerpt-1",
          kind: "excerpt",
          title: "Stroke volume modifiers",
          detail: "Pre-load, after-load, contractility, and heart rate.",
          badge: "EXCERPT",
          provenance: {
            materialId: 101,
            sourcePath: "/tmp/cardio.pdf",
            fileType: "pdf",
            sourceTitle: "Cardiac Output",
            selectionLabel: null,
          },
        },
      ],
      concepts: [
        {
          concept: "Stroke volume",
          materialId: null,
          sourceTitle: null,
        },
      ],
    });

    render(<StudioWorkspaceMaterialSidebar bundle={bundle} />);

    const primeItem = screen.getByTestId(
      "studio-workspace-material-item-prime-excerpt-promoted-excerpt-1",
    );
    expect(primeItem).toHaveTextContent(/PRIME/);

    const conceptItem = screen.getByTestId(
      "studio-workspace-material-item-concept-0",
    );
    expect(conceptItem).toHaveTextContent(/TUTOR/);
  });
});
