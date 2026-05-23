import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TutorStageShell } from "@/components/tutor-stage/TutorStageShell";
import { TUTOR_STAGE_TABS_WITH_BOARD } from "@/components/tutor-stage/tutorStageTabs";

const stageFor = (tab: string) => (
  <div data-testid={`stage-content-${tab}`}>{tab}</div>
);

const productiveStages = Object.fromEntries(
  TUTOR_STAGE_TABS_WITH_BOARD.map((tab) => [tab, stageFor(tab)]),
) as Record<string, ReactNode>;

describe("TutorStageShell session board mount", () => {
  it.each(TUTOR_STAGE_TABS_WITH_BOARD)(
    "mounts session board under %s",
    (tab) => {
      render(
        <TutorStageShell
          defaultTab={tab}
          stages={productiveStages}
          sessionBoard={<div data-testid="mock-workspace">workspace</div>}
          defaultBoardLayoutMode="split"
        />,
      );

      expect(screen.getByTestId(`tutor-stage-${tab}`)).toBeVisible();
      expect(screen.getByTestId("tutor-session-board")).toBeVisible();
      expect(screen.getByTestId("mock-workspace")).toBeVisible();
    },
  );

  it("does not mount session board on Settings", async () => {
    const user = userEvent.setup();

    render(
      <TutorStageShell
        defaultTab="read"
        stages={{
          ...productiveStages,
          settings: stageFor("settings"),
        }}
        sessionBoard={<div data-testid="mock-workspace">workspace</div>}
      />,
    );

    await user.click(screen.getByTestId("tutor-stage-tab-settings"));

    expect(screen.getByTestId("tutor-stage-settings")).toBeVisible();
    expect(screen.queryByTestId("tutor-session-board")).not.toBeInTheDocument();
  });
});
