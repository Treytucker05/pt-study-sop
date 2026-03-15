import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioClassPicker } from "@/components/StudioClassPicker";

const { getHubMock } = vi.hoisted(() => ({
  getHubMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getHub: getHubMock,
    },
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

function renderPicker(props?: Partial<React.ComponentProps<typeof StudioClassPicker>>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StudioClassPicker
        onSelectCourse={vi.fn()}
        activeSessionId={null}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("StudioClassPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getHubMock.mockResolvedValue({
      recommended_action: null,
      resume_candidate: {
        can_resume: false,
        course_id: null,
        course_name: null,
        course_code: null,
        session_id: null,
        last_mode: null,
        board_scope: null,
        board_id: null,
        topic: null,
        updated_at: null,
        action_label: "Resume Tutor",
      },
      upcoming_assignments: [],
      upcoming_tests: [],
      class_projects: [
        {
          course_id: 101,
          course_name: "Anatomy",
          course_code: "DPT-710",
          material_count: 3,
          recent_session_count: 5,
          last_studied_at: "2026-03-15T12:00:00Z",
          pending_event_count: 0,
          captured_item_count: 0,
          promoted_item_count: 2,
          wheel_linked: true,
          wheel_active: true,
          wheel_position: 0,
          active_session: {
            session_id: "session-101",
            topic: "Thorax",
            status: "active",
            turn_count: 4,
            started_at: "2026-03-15T12:00:00Z",
          },
          next_due_event: null,
        },
        {
          course_id: 202,
          course_name: "Neuro",
          course_code: "DPT-720",
          material_count: 4,
          recent_session_count: 1,
          last_studied_at: "2026-03-10T12:00:00Z",
          pending_event_count: 1,
          captured_item_count: 0,
          promoted_item_count: 1,
          wheel_linked: false,
          wheel_active: false,
          wheel_position: null,
          active_session: null,
          next_due_event: null,
        },
        {
          course_id: 303,
          course_name: "Kinesiology",
          course_code: "DPT-730",
          material_count: 2,
          recent_session_count: 0,
          last_studied_at: null,
          pending_event_count: 0,
          captured_item_count: 0,
          promoted_item_count: 0,
          wheel_linked: false,
          wheel_active: false,
          wheel_position: null,
          active_session: null,
          next_due_event: null,
        },
        {
          course_id: 404,
          course_name: "Histology",
          course_code: "DPT-740",
          material_count: 0,
          recent_session_count: 0,
          last_studied_at: null,
          pending_event_count: 0,
          captured_item_count: 0,
          promoted_item_count: 0,
          wheel_linked: false,
          wheel_active: false,
          wheel_position: null,
          active_session: null,
          next_due_event: null,
        },
      ],
      study_wheel: {
        current_course_id: 101,
        current_course_name: "Anatomy",
        current_course_code: "DPT-710",
        current_position: 0,
        total_sessions: 7,
        total_minutes: 180,
        total_active_courses: 2,
        next_course_id: 202,
        next_course_name: "Neuro",
        next_course_code: "DPT-720",
      },
    });
  });

  it("renders enriched class cards with status badges from the hub", async () => {
    renderPicker();

    expect(await screen.findByText("Anatomy")).toBeInTheDocument();
    expect(screen.getByText("DPT-710")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(screen.getByText("EMPTY")).toBeInTheDocument();
    expect(screen.getAllByText("LAST STUDIED")).toHaveLength(4);
    expect(screen.getAllByText("PROMOTED")).toHaveLength(4);
    expect(screen.getByText("1 PENDING EVENTS")).toBeInTheDocument();
    expect(screen.getAllByText("0 CAPTURED")).toHaveLength(4);
  });

  it("auto-selects the last course when it still exists", async () => {
    const onSelectCourse = vi.fn();
    localStorage.setItem("studio.lastCourseId", "202");

    renderPicker({ onSelectCourse });

    await waitFor(() => {
      expect(onSelectCourse).toHaveBeenCalledWith(202);
    });
  });

  it("stores the selected course id and keeps cards clickable during an active session", async () => {
    const onSelectCourse = vi.fn();
    renderPicker({ onSelectCourse, activeSessionId: "session-live" });

    const card = await screen.findByRole("button", { name: /histology/i });
    fireEvent.click(card);

    expect(onSelectCourse).toHaveBeenCalledWith(404);
    expect(localStorage.getItem("studio.lastCourseId")).toBe("404");
    expect(screen.getByText("SESSION IN PROGRESS")).toBeInTheDocument();
  });

  it("shows the empty state when hub returns no class projects", async () => {
    getHubMock.mockResolvedValue({
      recommended_action: null,
      resume_candidate: {
        can_resume: false,
        course_id: null,
        course_name: null,
        course_code: null,
        session_id: null,
        last_mode: null,
        board_scope: null,
        board_id: null,
        topic: null,
        updated_at: null,
        action_label: "Resume Tutor",
      },
      upcoming_assignments: [],
      upcoming_tests: [],
      class_projects: [],
      study_wheel: {
        current_course_id: null,
        current_course_name: null,
        current_course_code: null,
        current_position: null,
        total_sessions: 0,
        total_minutes: 0,
        total_active_courses: 0,
        next_course_id: null,
        next_course_name: null,
        next_course_code: null,
      },
    });

    renderPicker();

    expect(await screen.findByText("NO COURSES YET")).toBeInTheDocument();
  });
});
