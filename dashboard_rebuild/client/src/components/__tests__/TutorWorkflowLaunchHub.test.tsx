import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowLaunchHub } from "@/components/TutorWorkflowLaunchHub";
import type { TutorHubResponse, TutorWorkflowSummary } from "@/lib/api";

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

const tutorHubFixture: TutorHubResponse = {
  recommended_action: null,
  resume_candidate: {
    can_resume: true,
    course_id: 101,
    course_name: "Exercise Physiology",
    course_code: "EPHY-101",
    session_id: "sess-101",
    last_mode: "tutor",
    board_scope: "project",
    board_id: null,
    topic: "Cardiovascular regulation",
    updated_at: "2026-03-20T11:00:00Z",
    action_label: "Resume Exercise Physiology tutor",
  },
  upcoming_assignments: [],
  upcoming_tests: [],
  class_projects: [
    {
      course_id: 101,
      course_name: "Exercise Physiology",
      course_code: "EPHY-101",
      material_count: 2,
      recent_session_count: 0,
      last_studied_at: null,
      pending_event_count: 1,
      captured_item_count: 0,
      promoted_item_count: 0,
      wheel_linked: true,
      wheel_active: true,
      wheel_position: 1,
      active_session: null,
      next_due_event: null,
    },
    {
      course_id: 202,
      course_name: "Cardio",
      course_code: "CARD-202",
      material_count: 3,
      recent_session_count: 0,
      last_studied_at: null,
      pending_event_count: 0,
      captured_item_count: 0,
      promoted_item_count: 0,
      wheel_linked: true,
      wheel_active: false,
      wheel_position: 2,
      active_session: null,
      next_due_event: null,
    },
  ],
  study_wheel: {
    current_course_id: 101,
    current_course_name: "Exercise Physiology",
    current_course_code: "EPHY-101",
    current_position: 1,
    total_sessions: 0,
    total_minutes: 0,
    total_active_courses: 2,
    next_course_id: 202,
    next_course_name: "Cardio",
    next_course_code: "CARD-202",
  },
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

  it("runs the resume callback from the launch hub", () => {
    const onResumeCandidate = vi.fn();

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
        onResumeCandidate={onResumeCandidate}
        onOpenWorkflow={vi.fn()}
        onDeleteWorkflow={vi.fn()}
        tutorHub={tutorHubFixture}
        resumeCandidate={tutorHubFixture.resume_candidate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^resume$/i }));

    expect(onResumeCandidate).toHaveBeenCalledWith(tutorHubFixture.resume_candidate);
  });

  it("shows linked study-wheel courses even before session totals exist", () => {
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
        onDeleteWorkflow={vi.fn()}
        tutorHub={tutorHubFixture}
        resumeCandidate={tutorHubFixture.resume_candidate}
      />,
    );

    expect(
      screen.queryByText(/start a tutor session to build your study wheel/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/EPHY-101 • Exercise Physiology/i)).toBeInTheDocument();
    expect(screen.getByText(/CARD-202 • Cardio/i)).toBeInTheDocument();
  });

  it("renders safely without tutor hub data and still shows fallback workflow context", () => {
    const brokenDraft: TutorWorkflowSummary = {
      ...workflowFixture,
      workflow_id: "wf-broken",
      course_id: null,
      course_name: null,
      course_code: null,
      assignment_title: null,
      study_unit: null,
      topic: null,
      updated_at: null,
    };

    render(
      <TutorWorkflowLaunchHub
        workflows={[brokenDraft]}
        totalCount={1}
        courses={[]}
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
        onDeleteWorkflow={vi.fn()}
      />,
    );

    expect(screen.getByText(/link courses into the study wheel/i)).toBeInTheDocument();
    expect(screen.getByText("Class not saved yet")).toBeInTheDocument();
    expect(screen.getByText("Scope not saved yet")).toBeInTheDocument();
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
  });
});
