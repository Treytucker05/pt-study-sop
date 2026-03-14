import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProjectShellMock = vi.fn();
const getByCourseMock = vi.fn();
const getQueueMock = vi.fn();
const getSettingsMock = vi.fn();
const generateMock = vi.fn();
const updateSettingsMock = vi.fn();
const mockToast = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getProjectShell: (...args: unknown[]) => getProjectShellMock(...args),
    },
    scheduleEvents: {
      getByCourse: (...args: unknown[]) => getByCourseMock(...args),
    },
    planner: {
      getQueue: (...args: unknown[]) => getQueueMock(...args),
      getSettings: (...args: unknown[]) => getSettingsMock(...args),
      generate: (...args: unknown[]) => generateMock(...args),
      updateSettings: (...args: unknown[]) => updateSettingsMock(...args),
    },
  },
}));

vi.mock("@/components/PlannerKanban", () => ({
  PlannerKanban: ({ tasks }: { tasks: { anchor_text?: string | null }[] }) => (
    <div data-testid="planner-kanban">{tasks.map((task) => task.anchor_text).join(", ")}</div>
  ),
}));

vi.mock("@/components/SyllabusViewTab", () => ({
  SyllabusViewTab: ({ lockedCourseId }: { lockedCourseId?: number | null }) => (
    <div data-testid="syllabus-view">locked:{lockedCourseId}</div>
  ),
}));

vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { TutorScheduleMode } from "@/components/TutorScheduleMode";

function renderMode(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectShellMock.mockResolvedValue({
    course: { id: 7, name: "Neuro", code: "NEU-101" },
    workspace_state: { revision: 0, last_mode: "schedule" },
    continuation: { can_resume: false, active_tutor_session_id: null, last_mode: "schedule" },
    active_session: null,
    recent_sessions: [{ session_id: "t1", topic: "Brainstem", status: "active", turn_count: 4 }],
    counts: {
      active_sessions: 0,
      session_count: 3,
      studio_total_items: 0,
      studio_captured_items: 0,
      studio_promoted_items: 0,
      pending_schedule_events: 2,
    },
  });
  getByCourseMock.mockResolvedValue([
    { id: 1, title: "Thorax Quiz", type: "quiz", dueDate: "2026-03-20" },
    { id: 2, title: "Neuro Exam", type: "exam", dueDate: "2026-03-25" },
  ]);
  getQueueMock.mockResolvedValue([
    { id: 1, course_id: 7, anchor_text: "Brainstem", status: "pending" },
    { id: 2, course_id: 3, anchor_text: "Should be filtered", status: "pending" },
  ]);
  getSettingsMock.mockResolvedValue({ calendar_source: "google" });
  generateMock.mockResolvedValue({ tasks_created: 2 });
  updateSettingsMock.mockResolvedValue({ ok: true });
});

describe("TutorScheduleMode", () => {
  it("shows a course-gated empty state when no course is selected", async () => {
    renderMode(<TutorScheduleMode />);
    expect(await screen.findByText(/Pick a course in the Tutor shell/i)).toBeInTheDocument();
  });

  it("renders course schedule context and filters planner tasks to the active course", async () => {
    renderMode(<TutorScheduleMode courseId={7} courseName="Neuro" focusTopic="Brainstem repair" />);

    expect(await screen.findByText("SCHEDULE MODE")).toBeInTheDocument();
    expect(screen.getByText("Neuro")).toBeInTheDocument();
    expect(screen.getByText("Brainstem repair")).toBeInTheDocument();
    expect(screen.getByText("Thorax Quiz")).toBeInTheDocument();
    expect(screen.getByText("Neuro Exam")).toBeInTheDocument();
    expect(screen.getByTestId("planner-kanban")).toHaveTextContent("Brainstem");
    expect(screen.getByTestId("planner-kanban")).not.toHaveTextContent("Should be filtered");
    expect(screen.getByTestId("syllabus-view")).toHaveTextContent("locked:7");
  });

  it("reuses planner actions for generation and source toggling", async () => {
    renderMode(<TutorScheduleMode courseId={7} />);

    fireEvent.click(await screen.findByText("Generate Review Tasks"));
    await waitFor(() => expect(generateMock).toHaveBeenCalled());

    fireEvent.click(screen.getByText("Toggle Source"));
    await waitFor(() =>
      expect(updateSettingsMock).toHaveBeenCalledWith({ calendar_source: "local" })
    );
  });
});
