import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TutorStageShell } from "@/components/tutor-stage/TutorStageShell";
import {
  TUTOR_STAGE_TABS,
  type TutorStageTab,
} from "@/components/tutor-stage/tutorStageTabs";

function stagePlaceholder(tab: TutorStageTab) {
  return <div data-testid={`stage-content-${tab}`}>{tab} stage</div>;
}

const allStages = Object.fromEntries(
  TUTOR_STAGE_TABS.map((definition) => [
    definition.id,
    stagePlaceholder(definition.id),
  ]),
) as Record<TutorStageTab, ReactNode>;

describe("TutorStageShell tabs", () => {
  it("renders the main stage tab bar", () => {
    render(<TutorStageShell stages={allStages} defaultTab="read" />);

    expect(screen.getByTestId("tutor-stage-tab-bar")).toBeInTheDocument();
    for (const tab of TUTOR_STAGE_TABS) {
      expect(screen.getByTestId(tab.testId)).toHaveTextContent(tab.label);
    }
  });

  it("shows the default stage viewport", () => {
    render(<TutorStageShell stages={allStages} defaultTab="read" />);

    expect(screen.getByTestId("tutor-stage-read")).toBeVisible();
    expect(screen.getByTestId("stage-content-read")).toBeVisible();
  });

  it("switches visible stage when a tab is clicked", async () => {
    const user = userEvent.setup();
    render(<TutorStageShell stages={allStages} defaultTab="read" />);

    await user.click(screen.getByTestId("tutor-stage-tab-prime"));

    expect(screen.getByTestId("tutor-stage-prime")).toBeVisible();
    expect(screen.queryByTestId("tutor-stage-read")).not.toBeInTheDocument();
    expect(screen.getByTestId("stage-content-prime")).toBeVisible();
  });

  it("does not mount the session board on Settings", async () => {
    const user = userEvent.setup();
    render(
      <TutorStageShell
        stages={allStages}
        defaultTab="read"
        board={<div data-testid="mock-session-board">board</div>}
      />,
    );

    expect(screen.getByTestId("tutor-session-board")).toBeInTheDocument();

    await user.click(screen.getByTestId("tutor-stage-tab-settings"));

    expect(screen.getByTestId("tutor-stage-settings")).toBeVisible();
    expect(screen.queryByTestId("tutor-session-board")).not.toBeInTheDocument();
  });
});
