import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TutorSessionBoard } from "@/components/tutor-stage/TutorSessionBoard";
import { TutorStageShell } from "@/components/tutor-stage/TutorStageShell";

describe("TutorSessionBoard chrome", () => {
  it("renders board toolbar placeholder and layout controls in split mode", () => {
    render(
      <TutorSessionBoard layoutMode="split">
        <div data-testid="mock-workspace">workspace</div>
      </TutorSessionBoard>,
    );

    expect(screen.getByTestId("tutor-board-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "split",
    );
    expect(screen.getByTestId("mock-workspace")).toBeVisible();
    expect(screen.getByTestId("tutor-board-collapse")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-board-fullscreen")).toBeInTheDocument();
  });

  it("collapses to strip layout when Collapse is clicked", async () => {
    const user = userEvent.setup();
    const onLayoutModeChange = vi.fn();

    render(
      <TutorSessionBoard
        layoutMode="split"
        onLayoutModeChange={onLayoutModeChange}
      >
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    await user.click(screen.getByTestId("tutor-board-collapse"));

    expect(onLayoutModeChange).toHaveBeenCalledWith("collapsed");
  });

  it("enters fullscreen when Fullscreen is clicked from split", async () => {
    const user = userEvent.setup();
    const onLayoutModeChange = vi.fn();

    render(
      <TutorSessionBoard
        layoutMode="split"
        onLayoutModeChange={onLayoutModeChange}
      >
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    await user.click(screen.getByTestId("tutor-board-fullscreen"));

    expect(onLayoutModeChange).toHaveBeenCalledWith("fullscreen");
  });

  it("shows collapsed strip with expand and fullscreen actions", () => {
    render(
      <TutorSessionBoard layoutMode="collapsed">
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "collapsed",
    );
    expect(screen.getByTestId("tutor-board-expand")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-board-fullscreen")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-board-toolbar")).not.toBeInTheDocument();
  });

  it("expands back to split from collapsed strip", async () => {
    const user = userEvent.setup();
    const onLayoutModeChange = vi.fn();

    render(
      <TutorSessionBoard
        layoutMode="collapsed"
        onLayoutModeChange={onLayoutModeChange}
      >
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    await user.click(screen.getByTestId("tutor-board-expand"));

    expect(onLayoutModeChange).toHaveBeenCalledWith("split");
  });

  it("shows exit fullscreen control in fullscreen mode", () => {
    render(
      <TutorSessionBoard layoutMode="fullscreen">
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "fullscreen",
    );
    expect(screen.getByTestId("tutor-board-exit-fullscreen")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-board-toolbar")).toBeInTheDocument();
  });

  it("exits fullscreen back to split", async () => {
    const user = userEvent.setup();
    const onLayoutModeChange = vi.fn();

    render(
      <TutorSessionBoard
        layoutMode="fullscreen"
        onLayoutModeChange={onLayoutModeChange}
      >
        <div>workspace</div>
      </TutorSessionBoard>,
    );

    await user.click(screen.getByTestId("tutor-board-exit-fullscreen"));

    expect(onLayoutModeChange).toHaveBeenCalledWith("split");
  });
});

describe("TutorStageShell with session board layout", () => {
  const readStage = <div data-testid="stage-content-read">read</div>;

  it("shows stage and board together in split mode", () => {
    render(
      <TutorStageShell
        stages={{ read: readStage }}
        defaultTab="read"
        sessionBoard={<div data-testid="mock-workspace">workspace</div>}
        defaultBoardLayoutMode="split"
      />,
    );

    expect(screen.getByTestId("tutor-stage-read")).toBeVisible();
    expect(screen.getByTestId("tutor-session-board")).toBeVisible();
    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "split",
    );
  });

  it("hides the stage viewport while board is fullscreen", async () => {
    const user = userEvent.setup();

    render(
      <TutorStageShell
        stages={{ read: readStage }}
        defaultTab="read"
        sessionBoard={<div data-testid="mock-workspace">workspace</div>}
        defaultBoardLayoutMode="split"
      />,
    );

    await user.click(screen.getByTestId("tutor-board-fullscreen"));

    expect(screen.queryByTestId("tutor-stage-read")).not.toBeInTheDocument();
    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "fullscreen",
    );
    expect(screen.getByTestId("mock-workspace")).toBeVisible();
  });
});
