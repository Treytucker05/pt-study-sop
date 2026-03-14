import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TutorPage from "@/pages/tutor";
import {
  writeTutorSelectedMaterialIds,
  writeTutorStartState,
} from "@/lib/tutorClientState";

const mockListSessions = vi.fn();
const mockConfigCheck = vi.fn();
const mockGetMaterials = vi.fn();
const mockGetSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockGetCurrentCourse = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      listSessions: (...args: unknown[]) => mockListSessions(...args),
      configCheck: (...args: unknown[]) => mockConfigCheck(...args),
      getMaterials: (...args: unknown[]) => mockGetMaterials(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
    },
    studyWheel: {
      getCurrentCourse: (...args: unknown[]) => mockGetCurrentCourse(...args),
    },
  },
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock("@/components/TutorStartPanel", () => ({
  TutorStartPanel: ({
    courseId,
    selectedMaterials,
    topic,
    onResumeSession,
  }: {
    courseId?: number;
    selectedMaterials: number[];
    topic: string;
    onResumeSession: (sessionId: string) => void;
  }) => (
    <div
      data-testid="tutor-start-panel"
      data-course-id={courseId ?? ""}
      data-selected-material-count={selectedMaterials.length}
      data-topic={topic}
    >
      <div>{`course:${courseId ?? "none"}`}</div>
      <div>{`materials:${selectedMaterials.join(",")}`}</div>
      <div>{`topic:${topic}`}</div>
      <button onClick={() => onResumeSession("resume-1")}>resume-from-panel</button>
    </div>
  ),
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: ({
    sessionId,
    courseId,
    initialTurns,
  }: {
    sessionId: string;
    courseId?: number;
    initialTurns?: Array<{ question: string; answer: string | null }>;
  }) => (
    <div
      data-testid="tutor-chat"
      data-session-id={sessionId}
      data-course-id={courseId ?? ""}
      data-turn-count={initialTurns?.length ?? 0}
    >
      {`chat:${sessionId}`}
    </div>
  ),
}));

vi.mock("@/components/TutorArtifacts", () => ({
  TutorArtifacts: () => <div data-testid="tutor-artifacts" />,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function makeSession(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    session_id: "sess-1",
    status: "active",
    turn_count: 2,
    started_at: "2026-03-13T00:00:00Z",
    topic: "Restored session",
    course_id: 4,
    method_chain_id: null,
    current_block_index: 0,
    chain_blocks: [],
    content_filter: {
      material_ids: [8],
      accuracy_profile: "strict",
      objective_scope: "module_all",
    },
    artifacts_json: "[]",
    turns: [{ question: "What is this?", answer: "This is a restored answer." }],
    ...overrides,
  };
}

function renderTutorPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TutorPage />
    </QueryClientProvider>,
  );
}

describe("Tutor page launch precedence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/tutor");

    mockListSessions.mockResolvedValue([]);
    mockConfigCheck.mockResolvedValue({ ok: true, checks: [] });
    mockGetMaterials.mockResolvedValue([]);
    mockDeleteSession.mockResolvedValue(undefined);
    mockGetCurrentCourse.mockResolvedValue({ currentCourse: { id: 12 } });
    mockGetSession.mockResolvedValue(makeSession());
  });

  it("prefers explicit course launch over stale active-session restore", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=7");
    window.localStorage.setItem("tutor.active_session.v1", "stale-session");
    writeTutorStartState(7, {
      topic: "Week 7 review",
      selectedMaterialIds: [11, 12],
      objectiveScope: "single_focus",
    });

    renderTutorPage();

    const panel = await screen.findByTestId("tutor-start-panel");
    expect(panel).toHaveAttribute("data-course-id", "7");
    expect(panel).toHaveAttribute("data-selected-material-count", "2");
    expect(panel).toHaveAttribute("data-topic", "Week 7 review");
    expect(screen.queryByTestId("tutor-chat")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^CHAT$/i })).not.toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalledWith("stale-session");
  });

  it("prefers Library handoff over stale active-session restore", async () => {
    window.localStorage.setItem("tutor.active_session.v1", "stale-session");
    window.sessionStorage.setItem("tutor.open_from_library.v1", "1");
    writeTutorSelectedMaterialIds([21, 22, 23]);

    renderTutorPage();

    const panel = await screen.findByTestId("tutor-start-panel");
    await waitFor(() => {
      expect(panel).toHaveAttribute("data-selected-material-count", "3");
    });
    expect(screen.queryByTestId("tutor-chat")).not.toBeInTheDocument();
    expect(mockGetSession).not.toHaveBeenCalledWith("stale-session");
  });

  it("restores an active session when no explicit launch context exists", async () => {
    window.localStorage.setItem("tutor.active_session.v1", "sess-restore");
    mockGetSession.mockResolvedValueOnce(
      makeSession({
        session_id: "sess-restore",
        course_id: 9,
      }),
    );

    renderTutorPage();

    const chat = await screen.findByTestId("tutor-chat");
    expect(chat).toHaveAttribute("data-session-id", "sess-restore");
    expect(chat).toHaveAttribute("data-course-id", "9");
    expect(screen.getByRole("button", { name: /^CHAT$/i })).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-start-panel")).not.toBeInTheDocument();
  });

  it("falls back to the current study-wheel course when no launch context or session exists", async () => {
    writeTutorStartState(12, {
      topic: "Fallback topic",
      selectedMaterialIds: [31],
    });
    mockGetSession.mockRejectedValueOnce(new Error("missing"));

    renderTutorPage();

    const panel = await screen.findByTestId("tutor-start-panel");
    await waitFor(() => {
      expect(mockGetCurrentCourse).toHaveBeenCalled();
    });
    expect(panel).toHaveAttribute("data-course-id", "12");
    expect(panel).toHaveAttribute("data-selected-material-count", "1");
    expect(panel).toHaveAttribute("data-topic", "Fallback topic");
  });
});
