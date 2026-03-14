import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/queryClient";

function isoDateOffsetFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

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
const mockBrainMetrics = vi.fn();
const mockBrainProfileSummary = vi.fn();
const mockBrainProfileClaims = vi.fn();
const mockBrainProfileQuestions = vi.fn();
const mockBrainProfileHistory = vi.fn();
const mockBrainSubmitProfileFeedback = vi.fn();
const mockBrainExportProfile = vi.fn();
const mockStudyWheelCurrentCourse = vi.fn();
const mockTodaySessions = vi.fn();
const mockStreakGet = vi.fn();
const mockPlannerQueue = vi.fn();
const mockAcademicDeadlines = vi.fn();
const mockWeaknessQueue = vi.fn();
const mockScholarInvestigations = vi.fn();
const mockScholarQuestions = vi.fn();
const mockScholarCreateInvestigation = vi.fn();
const mockScholarExportResearch = vi.fn();
const mockProductAnalytics = vi.fn();
const mockProductPrivacy = vi.fn();
const mockProductUpdatePrivacy = vi.fn();
const mockProductResetPersonalization = vi.fn();
const mockProductOutcomeReport = vi.fn();
const mockProductLogEvent = vi.fn();
const mockMasteryDashboard = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
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
    },
    brain: {
      getMetrics: (...args: unknown[]) => mockBrainMetrics(...args),
      getProfileSummary: (...args: unknown[]) => mockBrainProfileSummary(...args),
      getProfileClaims: (...args: unknown[]) => mockBrainProfileClaims(...args),
      getProfileQuestions: (...args: unknown[]) => mockBrainProfileQuestions(...args),
      getProfileHistory: (...args: unknown[]) => mockBrainProfileHistory(...args),
      submitProfileFeedback: (...args: unknown[]) => mockBrainSubmitProfileFeedback(...args),
      exportProfile: (...args: unknown[]) => mockBrainExportProfile(...args),
    },
    studyWheel: {
      getCurrentCourse: (...args: unknown[]) => mockStudyWheelCurrentCourse(...args),
    },
    todaySessions: {
      get: (...args: unknown[]) => mockTodaySessions(...args),
    },
    streak: {
      get: (...args: unknown[]) => mockStreakGet(...args),
    },
    planner: {
      getQueue: (...args: unknown[]) => mockPlannerQueue(...args),
    },
    academicDeadlines: {
      getAll: (...args: unknown[]) => mockAcademicDeadlines(...args),
    },
    weaknessQueue: {
      get: (...args: unknown[]) => mockWeaknessQueue(...args),
    },
    scholar: {
      getInvestigations: (...args: unknown[]) => mockScholarInvestigations(...args),
      getQuestions: (...args: unknown[]) => mockScholarQuestions(...args),
      createInvestigation: (...args: unknown[]) => mockScholarCreateInvestigation(...args),
      exportResearch: (...args: unknown[]) => mockScholarExportResearch(...args),
    },
    product: {
      getAnalytics: (...args: unknown[]) => mockProductAnalytics(...args),
      getPrivacySettings: (...args: unknown[]) => mockProductPrivacy(...args),
      updatePrivacySettings: (...args: unknown[]) => mockProductUpdatePrivacy(...args),
      resetPersonalization: (...args: unknown[]) => mockProductResetPersonalization(...args),
      getOutcomeReport: (...args: unknown[]) => mockProductOutcomeReport(...args),
      logEvent: (...args: unknown[]) => mockProductLogEvent(...args),
    },
    mastery: {
      getDashboard: (...args: unknown[]) => mockMasteryDashboard(...args),
    },
  },
}));

vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("@/components/brain/VaultSidebar", () => ({
  VaultSidebar: () => <div data-testid="vault-sidebar">vault sidebar</div>,
}));

vi.mock("@/components/brain/SidebarRail", () => ({
  SidebarRail: () => <div data-testid="sidebar-rail">sidebar rail</div>,
}));

vi.mock("@/components/brain/ChatSidePanel", () => ({
  ChatSidePanel: () => <div data-testid="chat-side-panel">chat panel</div>,
}));

vi.mock("@/components/brain/BrainModals", () => ({
  BrainModals: () => null,
}));

vi.mock("@/components/brain/LearnerProfilePanel", () => ({
  LearnerProfilePanel: () => <div data-testid="brain-tool-profile">profile tool</div>,
}));

vi.mock("@/pages/tutor", () => ({
  default: () => <div data-testid="tutor-page-stub">Tutor page</div>,
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
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
  mockNotesCreate.mockResolvedValue({ id: 1 });
  mockNotesUpdate.mockResolvedValue({ id: 1 });
  mockNotesDelete.mockResolvedValue({});
  mockNotesReorder.mockResolvedValue({});
  mockObsidianStatus.mockResolvedValue({ connected: true });
  mockObsidianConfig.mockResolvedValue({ vaultName: "Treys School" });
  mockObsidianVaultIndex.mockResolvedValue({ paths: {} });
  mockAnkiStatus.mockResolvedValue({ connected: true });
  mockAnkiDrafts.mockResolvedValue([]);
  mockBrainMetrics.mockResolvedValue({
    sessionsPerCourse: [
      { course: "Movement Science", count: 8, minutes: 320 },
      { course: "Anatomy", count: 4, minutes: 140 },
    ],
    modeDistribution: [],
    recentConfusions: [],
    recentWeakAnchors: [],
    conceptFrequency: [],
    issuesLog: [],
    totalMinutes: 460,
    totalSessions: 12,
    totalCards: 84,
    averages: { understanding: 0.72, retention: 0.68 },
  });
  mockBrainProfileSummary.mockResolvedValue({
    userId: "trey",
    snapshotId: 12,
    generatedAt: "2026-03-12T10:00:00Z",
    modelVersion: "v1",
    hybridArchetype: {
      slug: "calibration-builder",
      label: "Calibration Builder",
      summary: "Strong follow-through when the next action is explicit.",
      supportingTraits: [],
      confidence: "medium",
    },
    profileSummary: {
      headline: "You do best when urgency is visible and the next move is concrete.",
      strengths: ["Follow-through rises when the next action is explicit."],
      watchouts: ["Neglected courses drift when there is no visible trigger."],
      nextBestActions: ["Run a Tutor block for Movement Science before the deadline stack grows."],
      backfillMode: "live",
    },
    claimsOverview: {
      count: 3,
      highConfidence: 1,
      needsCalibration: 1,
      watchouts: 1,
    },
    sourceWindow: { start: "2026-03-01", end: "2026-03-12" },
    backfillMode: "live",
    reliabilityTiers: [],
    evidenceSummary: {},
  });
  mockBrainProfileClaims.mockResolvedValue({ claims: [], count: 0 });
  mockBrainProfileQuestions.mockResolvedValue({ questions: [], count: 0 });
  mockBrainProfileHistory.mockResolvedValue({ history: [], count: 0 });
  mockBrainSubmitProfileFeedback.mockResolvedValue({ ok: true });
  mockBrainExportProfile.mockResolvedValue({ ok: true });
  mockStudyWheelCurrentCourse.mockResolvedValue({
    currentCourse: { id: 4, name: "Movement Science", code: "PHYT 6314" },
  });
  mockTodaySessions.mockResolvedValue([]);
  mockStreakGet.mockResolvedValue({
    currentStreak: 5,
    longestStreak: 9,
    lastStudyDate: "2026-03-11",
  });
  mockPlannerQueue.mockResolvedValue([
    {
      id: 101,
      scheduled_date: isoDateOffsetFromToday(-1),
      status: "pending",
      anchor_text: "Finish lower quarter retrieval set",
      course_name: "Movement Science",
    },
    {
      id: 102,
      scheduled_date: isoDateOffsetFromToday(1),
      status: "pending",
      anchor_text: "Review gait notes",
      course_name: "Movement Science",
    },
  ]);
  mockAcademicDeadlines.mockResolvedValue([
    {
      id: 1,
      title: "Movement Science quiz",
      type: "quiz",
      dueDate: isoDateOffsetFromToday(-1),
      course: "Movement Science",
      notes: "",
      completed: false,
    },
    {
      id: 2,
      title: "Anatomy lab practical",
      type: "exam",
      dueDate: isoDateOffsetFromToday(1),
      course: "Anatomy",
      notes: "",
      completed: false,
    },
  ]);
  mockWeaknessQueue.mockResolvedValue([
    { id: 301, topic: "Basal ganglia loops", reason: "high forgetting risk" },
  ]);
  mockScholarInvestigations.mockResolvedValue([
    {
      investigation_id: "scholar-1",
      title: "Check whether Brain is overestimating retention",
      query_text: "Check whether Brain is overestimating retention",
      rationale: "Recent Tutor blocks are stalling during retrieval.",
      audience_type: "system",
      mode: "brain",
      status: "blocked",
      confidence: "medium",
      open_question_count: 1,
      findings_count: 0,
    },
  ]);
  mockScholarQuestions.mockResolvedValue([
    {
      id: 22,
      question_id: "scholar-q-1",
      question_text: "Did the last Tutor block feel too guided?",
      question: "Did the last Tutor block feel too guided?",
      status: "pending",
      rationale: "Scholar needs learner input to continue the investigation.",
      evidence_needed: "Brief learner confirmation or contradiction.",
      linked_investigation_id: "scholar-1",
      is_blocking: true,
    },
  ]);
  mockScholarCreateInvestigation.mockResolvedValue({ investigation_id: "created" });
  mockScholarExportResearch.mockResolvedValue({ ok: true });
  mockProductAnalytics.mockResolvedValue({
    generatedAt: "2026-03-12T10:00:00Z",
    userId: "trey",
    workspaceId: "default",
    activation: {
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-03-11T08:00:00Z",
      brainProfileReady: true,
      firstArchetypeLabel: "Calibration Builder",
    },
    engagement: {
      brainTrustInteractions30d: 3,
      scholarInvestigations: 4,
      scholarPendingQuestions: 1,
      scholarAnsweredQuestions: 6,
      scholarQuestionResponseRate: 0.86,
      tutorSessionsStarted30d: 9,
      tutorSessionsCompleted30d: 8,
      tutorCompletionRate30d: 0.89,
      strategyFeedbackCount: 3,
      exportsTriggered: 0,
    },
    valueProof: {
      clearerDiagnosis: true,
      betterFollowThrough: 5,
      strongerRetrieval: 3,
      betterSelfUnderstanding: 4,
    },
    nextBestActions: ["Stay on Movement Science until the quiz is cleared."],
  });
  mockProductPrivacy.mockResolvedValue({
    userId: "trey",
    workspaceId: "default",
    retentionDays: 180,
    allowTier2Signals: true,
    allowVaultSignals: true,
    allowCalendarSignals: true,
    allowScholarPersonalization: true,
    allowOutcomeReports: true,
    updatedAt: "2026-03-12T10:00:00Z",
  });
  mockProductUpdatePrivacy.mockResolvedValue({});
  mockProductResetPersonalization.mockResolvedValue({});
  mockProductOutcomeReport.mockResolvedValue({ ok: true });
  mockProductLogEvent.mockResolvedValue({ ok: true });
  mockMasteryDashboard.mockResolvedValue({
    skills: [
      { skill_id: "m1", name: "Basal ganglia", effective_mastery: 0.15, status: "locked" },
      { skill_id: "m2", name: "Reflex arcs", effective_mastery: 0.62, status: "available" },
      { skill_id: "m3", name: "Lower quarter overview", effective_mastery: 0.91, status: "mastered" },
    ],
    count: 3,
  });
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

describe("Brain home recenter", () => {
  it("routes both / and /brain to Brain home and highlights Brain in nav", async () => {
    await import("@/pages/brain");
    await renderAppAtRoute("/", "brain-home");
    expect(screen.getByTestId("nav-brain").className).toContain("active");

    cleanup();
    await renderAppAtRoute("/brain", "brain-home");
    expect(screen.getByTestId("nav-brain").className).toContain("active");
  }, 15000);

  it("treats / and /brain as one canonical Brain instance inside the live shell", async () => {
    await import("@/pages/brain");
    const { default: App } = await import("@/App");

    render(<App />);
    await screen.findByTestId("brain-home");
    expect(screen.getAllByTestId("brain-home")).toHaveLength(1);

    await act(async () => {
      window.history.pushState({}, "", "/brain");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("nav-brain").className).toContain("active");
    });
    expect(screen.getAllByTestId("brain-home")).toHaveLength(1);
  });

  it("defaults to home, orders the attention queue, and places utilities last", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    const home = await screen.findByTestId("brain-home");
    expect(home).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.queryByRole("tab", { name: /canvas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /notes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /graph/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /table/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /data/i })).not.toBeInTheDocument();

    const queueItems = await screen.findAllByTestId("brain-queue-item");
    expect(queueItems.map((item) => item.textContent || "")).toEqual([
      expect.stringContaining("Movement Science quiz"),
      expect.stringContaining("Finish lower quarter retrieval set"),
      expect.stringContaining("Keep your 5-day streak alive"),
      expect.stringContaining("Run a Tutor block for Movement Science"),
      expect.stringContaining("Basal ganglia loops"),
      expect.stringContaining("Did the last Tutor block feel too guided?"),
      expect.stringContaining("Anatomy lab practical"),
      expect.stringContaining("Review gait notes"),
    ]);
    expect(within(queueItems[0]).getByText(/Reason:/i)).toBeInTheDocument();

    const queue = screen.getByTestId("brain-attention-queue");
    const performance = screen.getByTestId("brain-stats-performance");
    const activity = screen.getByTestId("brain-stats-activity");
    const courseBreakdown = screen.getByTestId("brain-course-breakdown");
    const studyRotation = screen.getByTestId("brain-study-rotation");
    const supportLaunches = screen.getByTestId("brain-support-launches");
    const system = screen.getByTestId("brain-system-setup");

    expect(queue.compareDocumentPosition(performance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(performance.compareDocumentPosition(activity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(activity.compareDocumentPosition(courseBreakdown) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(courseBreakdown.compareDocumentPosition(studyRotation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(studyRotation.compareDocumentPosition(supportLaunches) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(supportLaunches.compareDocumentPosition(system) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(activity.compareDocumentPosition(system) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(supportLaunches).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open library/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open tutor/i }).length).toBeGreaterThan(1);
    expect(screen.getByText("Stay on Movement Science until the next block is complete.")).toBeInTheDocument();
    expect(screen.getByText("Keep the Tutor cadence")).toBeInTheDocument();
  });

  it("dedupes repeated queue titles while preserving the highest-priority entry", async () => {
    const today = isoDateOffsetFromToday(0);
    mockAcademicDeadlines.mockResolvedValue([
      {
        id: 1,
        title: "Movement Science quiz",
        type: "quiz",
        dueDate: today,
        course: "Movement Science",
        notes: "",
        completed: false,
      },
    ]);
    mockPlannerQueue.mockResolvedValue([
      {
        id: 101,
        scheduled_date: today,
        status: "pending",
        anchor_text: "Movement Science quiz",
        course_name: "Movement Science",
      },
    ]);
    mockBrainProfileSummary.mockResolvedValue({
      userId: "trey",
      snapshotId: 12,
      generatedAt: "2026-03-12T10:00:00Z",
      modelVersion: "v1",
      hybridArchetype: {
        slug: "calibration-builder",
        label: "Calibration Builder",
        summary: "Strong follow-through when the next action is explicit.",
        supportingTraits: [],
        confidence: "medium",
      },
      profileSummary: {
        headline: "You do best when urgency is visible and the next move is concrete.",
        strengths: ["Follow-through rises when the next action is explicit."],
        watchouts: ["Neglected courses drift when there is no visible trigger."],
        nextBestActions: ["Movement Science quiz"],
        backfillMode: "live",
      },
      claimsOverview: {
        count: 3,
        highConfidence: 1,
        needsCalibration: 1,
        watchouts: 1,
      },
      sourceWindow: { start: "2026-03-01", end: "2026-03-12" },
      backfillMode: "live",
      reliabilityTiers: [],
      evidenceSummary: {},
    });

    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    const queueItems = await screen.findAllByTestId("brain-queue-item");
    const queue = screen.getByTestId("brain-attention-queue");
    expect(within(queue).getAllByText("Movement Science quiz")).toHaveLength(1);
    const duplicateItem = within(queue)
      .getByText("Movement Science quiz")
      .closest("[data-testid='brain-queue-item']");
    expect(duplicateItem).not.toBeNull();
    expect(within(duplicateItem as HTMLElement).getByText("Reason: due today.")).toBeInTheDocument();
    expect(queueItems.length).toBeGreaterThan(0);
  });

  it("renders mastery live counts when the dashboard query succeeds", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    expect(screen.getByTestId("brain-mastery-headline")).toHaveTextContent(
      "1 locked / 1 available / 1 mastered",
    );
    expect(screen.getByTestId("brain-mastery-detail")).toHaveTextContent("3 tracked skill(s)");
  });

  it("keeps the mastery card stable while the dashboard query is loading", async () => {
    mockMasteryDashboard.mockImplementation(
      () => new Promise(() => {
        // hold query in loading state for this render
      }),
    );

    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    expect(screen.getByTestId("brain-mastery-headline")).toHaveTextContent("Loading mastery state...");
    expect(screen.getByTestId("brain-mastery-detail")).toHaveTextContent(
      "Brain is waiting on the mastery dashboard response.",
    );
  });

  it("shows a non-collapsing mastery fallback when the dashboard query fails", async () => {
    mockMasteryDashboard.mockRejectedValue(new Error("mastery unavailable"));

    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    await waitFor(() => {
      expect(screen.getByTestId("brain-mastery-headline")).toHaveTextContent(
        "Mastery state unavailable right now",
      );
    });
    expect(screen.getByTestId("brain-mastery-detail")).toHaveTextContent(
      "Brain kept the home layout stable while the mastery API failed.",
    );
  });

  it("keeps shell nav grouped for core triad and support systems once the Brain route is ready", async () => {
    await renderAppAtRoute("/", "brain-home");

    const coreGroup = screen.getByTestId("nav-core-group");
    const supportGroup = screen.getByTestId("nav-support-group");
    expect(coreGroup).toBeInTheDocument();
    expect(supportGroup).toBeInTheDocument();
    expect(within(coreGroup).getAllByRole("button").map((button) => button).length).toBe(3);
    expect(within(supportGroup).getAllByRole("button").map((button) => button).length).toBe(5);

    const desktopNav = screen.getByTestId("nav-desktop-groups");
    expect(within(desktopNav).getByText("STUDY TRIAD")).toBeInTheDocument();
    expect(within(desktopNav).getByText("SUPPORT SYSTEMS")).toBeInTheDocument();

    expect(coreGroup.compareDocumentPosition(supportGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("nav-brain").className).toContain("active");
  });

  it("keeps Scholar active in the grouped shell nav once the Scholar route is ready", async () => {
    await import("@/pages/scholar");
    await renderAppAtRoute("/scholar", "nav-desktop-groups");

    expect(screen.getByTestId("nav-desktop-groups")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("nav-scholar").className).toContain("active");
    });
    expect(screen.queryByTestId("brain-home")).not.toBeInTheDocument();
  });

  it("closes the mobile nav drawer when the route changes outside the drawer", async () => {
    const { default: App } = await import("@/App");

    queryClient.clear();
    render(<App />);
    await screen.findByTestId("brain-home");

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Toggle navigation"));
    });
    expect(screen.getByText("SUPPORT")).toBeInTheDocument();

    await act(async () => {
      window.history.pushState({}, "", "/scholar");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen
          .getAllByTestId("nav-scholar")
          .some((button) => button.className.includes("active")),
      ).toBe(true);
    });
    expect(screen.queryByText("SUPPORT")).not.toBeInTheDocument();
  });

  it("falls back to HOME when persisted main-mode state is invalid", async () => {
    localStorage.setItem("brain-main-mode", "{bad-json");
    const { default: BrainPage } = await import("@/pages/brain");

    renderWithClient(<BrainPage />);
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /home/i })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to HOME when persisted main-mode has a valid but unsupported value", async () => {
    localStorage.setItem("brain-main-mode", JSON.stringify("unsupported"));
    const { default: BrainPage } = await import("@/pages/brain");

    renderWithClient(<BrainPage />);
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /home/i })).toHaveAttribute("aria-selected", "true");
  });

  it("recovers the persisted Brain profile mode, then allows returning home through the tab bar", async () => {
    localStorage.setItem("brain-main-mode", JSON.stringify("profile"));
    const { default: BrainPage } = await import("@/pages/brain");

    renderWithClient(<BrainPage />);

    expect(await screen.findByTestId("brain-tool-profile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /home/i }));
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
  });

  it("opens the Brain profile from home and persists the new mode", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    fireEvent.click(screen.getByTestId("brain-open-profile-primary"));

    expect(await screen.findByTestId("brain-tool-profile")).toBeInTheDocument();
    expect(localStorage.getItem("brain-main-mode")).toBe(JSON.stringify("profile"));

    fireEvent.click(screen.getByRole("tab", { name: /home/i }));
    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
  });

  it("treats legacy workspace modes as unsupported and falls back to HOME", async () => {
    localStorage.setItem("brain-main-mode", JSON.stringify("canvas"));
    const { default: BrainPage } = await import("@/pages/brain");

    renderWithClient(<BrainPage />);

    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /home/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("brain-tool-profile")).not.toBeInTheDocument();
  });

  it("writes destination context when Brain launches Calendar, Tutor, and Scholar", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");

    fireEvent.click(screen.getByTestId("brain-queue-action-deadline-1"));
    expect(JSON.parse(sessionStorage.getItem("calendar.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "deadline-1",
        title: "Movement Science quiz",
      }),
    );

    fireEvent.click(screen.getByTestId("brain-queue-action-study-today"));
    expect(JSON.parse(sessionStorage.getItem("tutor.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "study-today",
        title: "Keep your 5-day streak alive",
      }),
    );

    fireEvent.click(screen.getByTestId("brain-queue-action-scholar-question-scholar-q-1"));
    expect(JSON.parse(sessionStorage.getItem("scholar.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "scholar-question-scholar-q-1",
        title: "Did the last Tutor block feel too guided?",
        investigationId: "scholar-1",
        questionId: "scholar-q-1",
      }),
    );
  });

  it("renders the Brain projects dashboard and deep-links Tutor with course-backed query params", async () => {
    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    await screen.findByTestId("brain-home");
    expect(screen.getByText("PROJECTS DASHBOARD")).toBeInTheDocument();
    expect(screen.getByTestId("brain-project-launch-item-current-course")).toBeInTheDocument();
    expect(screen.getByTestId("brain-project-launch-item-planner")).toBeInTheDocument();
    expect(screen.getByTestId("brain-project-launch-item-deadline")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("brain-project-launch-action-current-course"));
    expect(window.location.pathname).toBe("/tutor");
    expect(window.location.search).toBe("?course_id=4");
    expect(JSON.parse(sessionStorage.getItem("tutor.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "project-current-course",
        title: "Open Movement Science course shell",
        courseName: "Movement Science",
      }),
    );

    fireEvent.click(screen.getByTestId("brain-project-launch-action-planner"));
    expect(window.location.pathname).toBe("/tutor");
    expect(window.location.search).toBe("?course_id=4&mode=tutor");
    expect(JSON.parse(sessionStorage.getItem("tutor.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "project-planner-follow-through",
        title: "Finish lower quarter retrieval set",
        courseName: "Movement Science",
      }),
    );

    fireEvent.click(screen.getByTestId("brain-project-launch-action-deadline"));
    expect(window.location.pathname).toBe("/tutor");
    expect(window.location.search).toBe("?course_id=4&mode=schedule");
    expect(JSON.parse(sessionStorage.getItem("tutor.open_from_brain.v1") || "{}")).toEqual(
      expect.objectContaining({
        source: "brain-home",
        itemId: "project-deadline-pressure",
        title: "Movement Science quiz",
        courseName: "Movement Science",
        dueDate: expect.any(String),
      }),
    );
  });

  it("shows empty-state fallbacks for both stats bands when the underlying data is sparse", async () => {
    mockBrainMetrics.mockResolvedValue({
      sessionsPerCourse: [],
      modeDistribution: [],
      recentConfusions: [],
      recentWeakAnchors: [],
      conceptFrequency: [],
      issuesLog: [],
      totalMinutes: 0,
      totalSessions: 0,
      totalCards: 0,
    });
    mockWeaknessQueue.mockResolvedValue([]);
    mockAcademicDeadlines.mockResolvedValue([]);
    mockMasteryDashboard.mockResolvedValue({ skills: [], count: 0 });

    const { default: BrainPage } = await import("@/pages/brain");
    renderWithClient(<BrainPage />);

    expect(await screen.findByTestId("brain-home")).toBeInTheDocument();
    expect(screen.getByText("0 active weak points")).toBeInTheDocument();
    expect(screen.getByText("0 cards captured")).toBeInTheDocument();
  });
});
