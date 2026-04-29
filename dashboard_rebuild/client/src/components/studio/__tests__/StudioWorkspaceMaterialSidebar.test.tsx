import { fireEvent, render, screen } from "@testing-library/react";
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

  it("filters items to a single pipeline stage when a stage pill is selected", () => {
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

    expect(
      screen.getByTestId(
        "studio-workspace-material-item-prime-excerpt-promoted-excerpt-1",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("studio-workspace-material-item-concept-0"),
    ).toBeInTheDocument();

    const primePill = screen.getByTestId(
      "studio-workspace-material-stage-filter-prime",
    );
    fireEvent.click(primePill);

    expect(
      screen.getByTestId(
        "studio-workspace-material-item-prime-excerpt-promoted-excerpt-1",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("studio-workspace-material-item-concept-0"),
    ).not.toBeInTheDocument();

    const allPill = screen.getByTestId(
      "studio-workspace-material-stage-filter-all",
    );
    fireEvent.click(allPill);

    expect(
      screen.getByTestId("studio-workspace-material-item-concept-0"),
    ).toBeInTheDocument();
  });
});
