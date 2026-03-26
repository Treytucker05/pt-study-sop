import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/queryClient";

const mockSessionsGetAll = vi.fn();
const mockNotesGetAll = vi.fn();
const mockNotesCreate = vi.fn();
const mockNotesUpdate = vi.fn();
const mockNotesDelete = vi.fn();
const mockNotesReorder = vi.fn();
const mockObsidianStatus = vi.fn();
const mockObsidianConfig = vi.fn();
const mockObsidianVaultIndex = vi.fn();
const mockAnkiStatus = vi.fn();
const mockAnkiDrafts = vi.fn();
const mockAnkiDue = vi.fn();
const mockBrainMetrics = vi.fn();
const mockBrainProfileSummary = vi.fn();
const mockBrainProfileClaims = vi.fn();
const mockBrainProfileQuestions = vi.fn();
const mockBrainProfileHistory = vi.fn();
const mockBrainOrganizePreview = vi.fn();
const mockTutorHubGet = vi.fn();
const mockTutorListWorkflows = vi.fn();
const mockTutorGetContentSources = vi.fn();
const mockTutorDeleteWorkflow = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    sessions: {
      getAll: (...args: unknown[]) => mockSessionsGetAll(...args),
    },
    notes: {
      getAll: (...args: unknown[]) => mockNotesGetAll(...args),
      create: (...args: unknown[]) => mockNotesCreate(...args),
      update: (...args: unknown[]) => mockNotesUpdate(...args),
      delete: (...args: unknown[]) => mockNotesDelete(...args),
      reorder: (...args: unknown[]) => mockNotesReorder(...args),
    },
    obsidian: {
      getStatus: (...args: unknown[]) => mockObsidianStatus(...args),
      getConfig: (...args: unknown[]) => mockObsidianConfig(...args),
      getVaultIndex: (...args: unknown[]) => mockObsidianVaultIndex(...args),
      getFile: vi.fn(),
      saveFile: vi.fn(),
    },
    anki: {
      getStatus: (...args: unknown[]) => mockAnkiStatus(...args),
      getDrafts: (...args: unknown[]) => mockAnkiDrafts(...args),
      getDue: (...args: unknown[]) => mockAnkiDue(...args),
    },
    brain: {
      getMetrics: (...args: unknown[]) => mockBrainMetrics(...args),
      getProfileSummary: (...args: unknown[]) =>
        mockBrainProfileSummary(...args),
      getProfileClaims: (...args: unknown[]) => mockBrainProfileClaims(...args),
      getProfileQuestions: (...args: unknown[]) =>
        mockBrainProfileQuestions(...args),
      getProfileHistory: (...args: unknown[]) =>
        mockBrainProfileHistory(...args),
      organizePreview: (...args: unknown[]) =>
        mockBrainOrganizePreview(...args),
    },
    tutor: {
      getHub: (...args: unknown[]) => mockTutorHubGet(...args),
      listWorkflows: (...args: unknown[]) => mockTutorListWorkflows(...args),
      getContentSources: (...args: unknown[]) =>
        mockTutorGetContentSources(...args),
      deleteWorkflow: (...args: unknown[]) => mockTutorDeleteWorkflow(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/components/brain/LearnerProfilePanel", () => ({
  LearnerProfilePanel: () => (
    <div data-testid="brain-tool-profile">profile tool</div>
  ),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

async function renderAppAtRoute(path: string, readyTestId: string) {
  queryClient.clear();
  window.history.pushState({}, "", path);
  const { default: App } = await import("@/App");
  render(<App />);
  await screen.findByTestId(readyTestId);
  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
}

function seedDefaultMocks() {
  mockNotesGetAll.mockResolvedValue([]);
  mockNotesCreate.mockResolvedValue(null);
  mockNotesUpdate.mockResolvedValue(null);
  mockNotesDelete.mockResolvedValue(null);
  mockNotesReorder.mockResolvedValue(null);
  mockSessionsGetAll.mockResolvedValue([
    {
      id: 1,
      date: "2026-03-20T09:00:00Z",
      topic: "Exercise Physiology",
      mode: "TEACH",
      duration: "55",
      minutes: 55,
      errors: 0,
      cards: 0,
      notes: "Focused on oxygen transport.",
      confusions: JSON.stringify(["Ventilation/perfusion mismatch"]),
      weakAnchors: JSON.stringify(["Fick principle"]),
      concepts: JSON.stringify(["Oxygen transport", "Cardiac output"]),
      issues: JSON.stringify(["source lock dropped"]),
      sourceLock: "",
      createdAt: "2026-03-20T09:00:00Z",
      courseId: null,
    },
    {
      id: 2,
      date: "2026-03-18T08:00:00Z",
      topic: "Neuro",
      mode: "RETRIEVE",
      duration: "35",
      minutes: 35,
      errors: 0,
      cards: 6,
      notes: "Quick retrieval pass.",
      confusions: JSON.stringify(["Basal ganglia loops"]),
      weakAnchors: JSON.stringify(["Direct vs indirect pathway"]),
      concepts: JSON.stringify(["Basal ganglia"]),
      issues: JSON.stringify([]),
      sourceLock: "",
      createdAt: "2026-03-18T08:00:00Z",
      courseId: null,
    },
  ]);
  mockObsidianStatus.mockResolvedValue({ connected: true });
  mockObsidianConfig.mockResolvedValue({ vaultName: "Treys School" });
  mockObsidianVaultIndex.mockResolvedValue({ paths: {} });
  mockAnkiStatus.mockResolvedValue({ connected: true });
  mockAnkiDrafts.mockResolvedValue([{ id: 1, status: "pending" }]);
  mockAnkiDue.mockResolvedValue({ dueCount: 12, cardIds: [1, 2, 3] });
  mockBrainMetrics.mockResolvedValue({
    sessionsPerCourse: [
      { course: "Exercise Physiology", count: 1, minutes: 55 },
      { course: "Neuro", count: 1, minutes: 35 },
    ],
    modeDistribution: [
      { mode: "TEACH", count: 1, minutes: 55 },
      { mode: "RETRIEVE", count: 1, minutes: 35 },
    ],
    recentConfusions: [
      {
        text: "Ventilation/perfusion mismatch",
        count: 1,
        course: "Exercise Physiology",
      },
    ],
    recentWeakAnchors: [
      { text: "Fick principle", count: 1, course: "Exercise Physiology" },
    ],
    conceptFrequency: [{ concept: "Oxygen transport", count: 2 }],
    issuesLog: [
      { issue: "source lock dropped", count: 1, course: "Exercise Physiology" },
    ],
    totalMinutes: 90,
    totalSessions: 2,
    totalCards: 6,
    staleTopics: [
      {
        topic: "Reflex arcs",
        count: 2,
        lastStudied: "2026-03-01",
        daysSince: 19,
      },
    ],
  });
  mockBrainProfileSummary.mockResolvedValue({
    profileSummary: {},
    hybridArchetype: null,
  });
  mockBrainProfileClaims.mockResolvedValue({ claims: [], count: 0 });
  mockBrainProfileQuestions.mockResolvedValue({ questions: [], count: 0 });
  mockBrainProfileHistory.mockResolvedValue({ history: [], count: 0 });
  mockBrainOrganizePreview.mockResolvedValue({
    success: true,
    organized: {
      title: "Organized Session Note",
      markdown: "## Summary\n- Organized",
      checklist: ["Verify terms", "Confirm source lock note"],
      suggested_links: ["Oxygen transport"],
    },
    destination: {
      recommended_path: "Inbox/Organized Session Note.md",
      recommended_label: "Inbox / Organized Session Note.md",
      options: [],
    },
  });
  mockTutorHubGet.mockResolvedValue({
    recommended_action: {
      title: "Resume the next Exercise Physiology block",
      action_label: "Open Tutor from Brain home",
    },
    resume_candidate: {
      can_resume: true,
      session_id: "sess-brain-home",
      course_id: 77,
      course_name: "Exercise Physiology",
      course_code: "EXPH-101",
      topic: "Hemodynamics",
      last_mode: "tutor",
      board_scope: "project",
      board_id: null,
      updated_at: "2026-03-26T08:00:00Z",
      action_label: "Resume Exercise Physiology tutor session",
    },
    upcoming_assignments: [],
    upcoming_tests: [],
    class_projects: [
      {
        course_id: 77,
        course_name: "Exercise Physiology",
        course_code: "EXPH-101",
        wheel_linked: true,
        wheel_active: true,
        wheel_position: 1,
        next_due_event: null,
      },
    ],
    study_wheel: {
      total_active_courses: 1,
      current_course_id: 77,
      next_course_id: null,
    },
  });
  mockTutorListWorkflows.mockResolvedValue({
    items: [
      {
        workflow_id: "wf-brain-home-1",
        course_id: 77,
        course_name: "Exercise Physiology",
        course_code: "EXPH-101",
        assignment_title: "Week 7 Study Plan",
        topic: "Hemodynamics",
        study_unit: "Week 7",
        current_stage: "priming",
        status: "priming_in_progress",
        updated_at: "2026-03-26T07:30:00Z",
        due_date: "2026-03-29",
        active_tutor_session_id: null,
      },
    ],
    count: 1,
  });
  mockTutorGetContentSources.mockResolvedValue({
    courses: [{ id: 77, name: "Exercise Physiology", code: "EXPH-101" }],
  });
  mockTutorDeleteWorkflow.mockResolvedValue({ ok: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
  seedDefaultMocks();
});

afterEach(() => {
  cleanup();
});

describe("Brain page contract", () => {
  it("routes both / and /brain to Brain home and highlights Brain in nav", async () => {
    await import("@/pages/brain");
    await renderAppAtRoute("/", "brain-home");
    expect(screen.getByTestId("nav-brain")).toHaveAttribute(
      "aria-current",
      "page",
    );

    cleanup();
    await renderAppAtRoute("/brain", "brain-home");
    expect(screen.getByTestId("nav-brain")).toHaveAttribute(
      "aria-current",
      "page",
    );
  }, 15000);

  it("renders the evidence-first Brain contract and removes the old dashboard drift", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    const { container } = renderWithClient(<BrainPage />);

    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
    expect(screen.getByTestId("brain-session-evidence")).toBeInTheDocument();
    expect(screen.getByTestId("brain-derived-metrics")).toBeInTheDocument();
    expect(screen.getByTestId("brain-issues-log")).toBeInTheDocument();
    expect(screen.getByTestId("brain-integrations")).toBeInTheDocument();
    expect(screen.getByTestId("brain-llm-organizer")).toBeInTheDocument();

    expect(screen.getByTestId("brain-session-evidence")).toHaveTextContent(
      "Exercise Physiology",
    );
    expect(screen.getByTestId("brain-issue-patterns")).toHaveTextContent(
      "source lock dropped",
    );
    expect(screen.getByTestId("brain-integration-anki")).toHaveTextContent(
      "Review load: 12 due card(s)",
    );

    expect(
      screen.queryByText("WHAT NEEDS ATTENTION NOW"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("PROJECTS DASHBOARD")).not.toBeInTheDocument();
    expect(screen.queryByText("SUPPORT SYSTEMS")).not.toBeInTheDocument();
    expect(screen.queryByText("SYSTEM / SETUP")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-ui="hud-panel"][data-hud-variant="b"]'),
    ).not.toBeNull();
  });

  it("renders the Tutor workflow hub widgets on Brain home", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    expect(await screen.findByTestId("tutor-launch-hub")).toBeInTheDocument();
    expect(screen.getByText("STUDIO HUB")).toBeInTheDocument();
    expect(screen.getByText("STUDY WHEEL")).toBeInTheDocument();
    expect(screen.getByText("RECENT WORKFLOWS")).toBeInTheDocument();
  });

  it("treats /nav-lab as an unshipped route", async () => {
    await renderAppAtRoute("/nav-lab", "nav-brain");

    expect(
      await screen.findByRole("heading", { name: /404 page not found/i }),
    ).toBeInTheDocument();
  });

  it("unmounts the previous route instead of keeping hidden pages alive", async () => {
    await renderAppAtRoute("/", "brain-home");
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();

    await act(async () => {
      window.history.pushState({}, "", "/missing-study-route");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      await screen.findByRole("heading", { name: /404 page not found/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("brain-home")).not.toBeInTheDocument();
  });

  it("uses the organizer as an annotation-only surface", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    fireEvent.change(
      screen.getByPlaceholderText(/Paste raw session evidence/i),
      { target: { value: "Raw WRAP notes about oxygen transport" } },
    );
    fireEvent.change(screen.getByPlaceholderText(/Optional: course hint/i), {
      target: { value: "Exercise Physiology" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /organize \+ annotate/i }),
    );

    await waitFor(() => {
      expect(mockBrainOrganizePreview).toHaveBeenCalledWith(
        "Raw WRAP notes about oxygen transport",
        "Exercise Physiology",
      );
    });
    expect(
      await screen.findByText("Organized Session Note"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Suggested destination:\s*Inbox \/ Organized Session Note\.md/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Verify terms")).toBeInTheDocument();
  });

  it("still allows switching to the profile tab", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    fireEvent.click(screen.getByRole("tab", { name: /profile/i }));
    expect(await screen.findByTestId("brain-tool-profile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /home/i }));
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
  });
});
