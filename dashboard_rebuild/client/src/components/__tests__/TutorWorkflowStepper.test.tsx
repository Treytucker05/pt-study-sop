import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TutorWorkflowStepper } from "@/components/TutorWorkflowStepper";

describe("TutorWorkflowStepper", () => {
  it("surfaces previous and next workflow movement above the stage rail", () => {
    const onStageClick = vi.fn();

    render(
      <TutorWorkflowStepper
        activeWorkflowId="wf-1"
        currentStage="tutor_in_progress"
        shellMode="tutor"
        workflowView="priming"
        hasActiveSession
        hasPolishBundle={false}
        onStageClick={onStageClick}
      />,
    );

    expect(screen.getByText(/Workflow Navigator/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to priming/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /next: polish/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^launch$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to priming/i }));
    fireEvent.click(screen.getByRole("button", { name: /next: polish/i }));

    expect(onStageClick).toHaveBeenNthCalledWith(1, "priming");
    expect(onStageClick).toHaveBeenNthCalledWith(2, "polish");
  });

  it("keeps tutor progression disabled until that stage is actually available", () => {
    render(
      <TutorWorkflowStepper
        activeWorkflowId="wf-1"
        currentStage="priming_in_progress"
        shellMode="dashboard"
        workflowView="priming"
        hasActiveSession={false}
        hasPolishBundle={false}
        onStageClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /back to launch/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /next: tutor/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^tutor$/i })).toBeDisabled();
  });

  it("stays visible in live tutor mode even if the workflow id drops out temporarily", () => {
    render(
      <TutorWorkflowStepper
        activeWorkflowId={null}
        currentStage={null}
        shellMode="tutor"
        workflowView="launch"
        hasActiveSession
        hasPolishBundle={false}
        onStageClick={vi.fn()}
      />,
    );

    expect(screen.getByText(/Workflow Navigator/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^tutor$/i })).toBeEnabled();
  });
});
