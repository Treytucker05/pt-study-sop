import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutorStageRead } from "@/components/tutor-stage/TutorStageRead";
import { TutorStageShell } from "@/components/tutor-stage/TutorStageShell";

describe("TutorStageRead", () => {
  it("renders source shelf rail and document dock in a row", () => {
    render(
      <TutorStageRead
        sourceShelf={<div data-testid="mock-source-shelf">shelf</div>}
        documentDock={<div data-testid="mock-document-dock">dock</div>}
      />,
    );

    expect(screen.getByTestId("tutor-stage-read-layout")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-stage-read-shelf-rail")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-stage-read-dock")).toBeInTheDocument();
    expect(screen.getByTestId("mock-source-shelf")).toBeVisible();
    expect(screen.getByTestId("mock-document-dock")).toBeVisible();
  });

  it("keeps the shelf rail within the narrow width band", () => {
    render(
      <TutorStageRead
        sourceShelf={<div>shelf</div>}
        documentDock={<div>dock</div>}
      />,
    );

    const rail = screen.getByTestId("tutor-stage-read-shelf-rail");
    expect(rail.className).toMatch(/w-\[240px\]/);
    expect(rail.className).toMatch(/max-w-\[280px\]/);
  });
});

describe("TutorStageShell Read tab", () => {
  it("shows read layout with shelf rail and dock under the Read tab", () => {
    render(
      <TutorStageShell
        defaultTab="read"
        stages={{
          read: (
            <TutorStageRead
              sourceShelf={<div data-testid="mock-source-shelf">shelf</div>}
              documentDock={<div data-testid="mock-document-dock">dock</div>}
            />
          ),
        }}
        sessionBoard={<div data-testid="mock-workspace">workspace</div>}
        defaultBoardLayoutMode="split"
      />,
    );

    expect(screen.getByTestId("tutor-stage-read")).toBeVisible();
    expect(screen.getByTestId("mock-source-shelf")).toBeVisible();
    expect(screen.getByTestId("mock-document-dock")).toBeVisible();
    expect(screen.getByTestId("tutor-session-board")).toBeVisible();
  });
});
