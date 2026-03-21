import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowLaunchHub } from "@/components/TutorWorkflowLaunchHub";
import type { TutorWorkflowSummary } from "@/lib/api";

const workflowFixture: TutorWorkflowSummary = {
  workflow_id: "wf-1",
  course_id: 101,
  course_name: "Exercise Physiology",
  course_code: "EPHY-101",
  course_event_id: null,
  assignment_title: "Week 7 Study Plan",
  study_unit: "Week 7",
  topic: "Cardiovascular regulation",
  due_date: "2026-03-28T00:00:00Z",
  current_stage: "priming",
  status: "priming_in_progress",
  active_tutor_session_id: null,
  created_at: "2026-03-20T10:00:00Z",
  updated_at: "2026-03-20T11:00:00Z",
};

describe("TutorWorkflowLaunchHub", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("runs the delete callback after confirmation", () => {
    const onDeleteWorkflow = vi.fn();

    render(
      <TutorWorkflowLaunchHub
        workflows={[workflowFixture]}
        totalCount={1}
        courses={[{ id: 101, name: "Exercise Physiology", code: "EPHY-101" }]}
        filters={{
          search: "",
          courseId: "all",
          stage: "all",
          status: "all",
          dueBucket: "all",
        }}
        onFiltersChange={vi.fn()}
        onStartNew={vi.fn()}
        onOpenWorkflow={vi.fn()}
        onDeleteWorkflow={onDeleteWorkflow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete workflow week 7 study plan/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete study plan "Week 7 Study Plan"? This cannot be undone.',
    );
    expect(onDeleteWorkflow).toHaveBeenCalledWith(workflowFixture);
  });

  it("does not run the delete callback when confirmation is cancelled", () => {
    window.confirm = vi.fn(() => false);
    const onDeleteWorkflow = vi.fn();

    render(
      <TutorWorkflowLaunchHub
        workflows={[workflowFixture]}
        totalCount={1}
        courses={[{ id: 101, name: "Exercise Physiology", code: "EPHY-101" }]}
        filters={{
          search: "",
          courseId: "all",
          stage: "all",
          status: "all",
          dueBucket: "all",
        }}
        onFiltersChange={vi.fn()}
        onStartNew={vi.fn()}
        onOpenWorkflow={vi.fn()}
        onDeleteWorkflow={onDeleteWorkflow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /delete workflow week 7 study plan/i }));

    expect(onDeleteWorkflow).not.toHaveBeenCalled();
  });
});
