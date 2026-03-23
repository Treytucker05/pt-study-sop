import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  getMaterialsMock,
  listSessionsMock,
  getHubMock,
  configCheckMock,
  getContentSourcesMock,
  getTemplateChainsMock,
  listWorkflowsMock,
  preflightSessionMock,
  getLearningObjectivesByCourseMock,
  getCurrentCourseMock,
  fetchCourseMapMock,
  getConfigMock,
  getVaultIndexMock,
  getFileMock,
  getFilesMock,
  saveFileMock,
  getProjectShellMock,
  saveProjectShellStateMock,
  restoreStudioItemsMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getMaterialsMock: vi.fn(),
  listSessionsMock: vi.fn(),
  getHubMock: vi.fn(),
  configCheckMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
  getTemplateChainsMock: vi.fn(),
  listWorkflowsMock: vi.fn(),
  preflightSessionMock: vi.fn(),
  getLearningObjectivesByCourseMock: vi.fn(),
  getCurrentCourseMock: vi.fn(),
  fetchCourseMapMock: vi.fn(),
  getConfigMock: vi.fn(),
  getVaultIndexMock: vi.fn(),
  getFileMock: vi.fn(),
  getFilesMock: vi.fn(),
  saveFileMock: vi.fn(),
  getProjectShellMock: vi.fn(),
  saveProjectShellStateMock: vi.fn(),
  restoreStudioItemsMock: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="tutor-layout">{children}</div>,
}));

vi.mock("@/components/ContentFilter", () => ({
  ContentFilter: () => <div data-testid="content-filter" />,
}));

vi.mock("@/components/TutorStartPanel", () => ({
  TutorStartPanel: () => <div data-testid="tutor-start-panel">start panel</div>,
}));

vi.mock("@/components/TutorCommandDeck", () => ({
  TutorCommandDeck: ({ launchSettings }: { launchSettings: ReactNode }) => (
    <div data-testid="tutor-command-deck">{launchSettings}</div>
  ),
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: () => <div data-testid="tutor-chat">chat</div>,
}));

vi.mock("@/components/TutorArtifacts", () => ({
  TutorArtifacts: () => <div data-testid="tutor-artifacts">artifacts</div>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/ObsidianRenderer", () => ({
  ObsidianRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({
    excalidrawAPI,
  }: {
    excalidrawAPI?: (api: {
      getSceneElements: () => unknown[];
      getAppState: () => { viewBackgroundColor: string };
      getFiles: () => Record<string, never>;
      updateScene: (scene: { elements?: unknown[] }) => void;
      scrollToContent: () => void;
    }) => void;
  }) => {
    const api = {
      getSceneElements: () => [{ id: "shape-1", isDeleted: false }],
      getAppState: () => ({ viewBackgroundColor: "transparent" }),
      getFiles: () => ({}),
      updateScene: vi.fn(),
      scrollToContent: vi.fn(),
    };
    useEffect(() => {
      excalidrawAPI?.(api);
    }, [excalidrawAPI]);
    return <div data-testid="page-excalidraw">mock excalidraw</div>;
  },
  exportToBlob: vi.fn(async () => new Blob(["png"])),
  convertToExcalidrawElements: vi.fn((elements: unknown[]) => elements),
}));

vi.mock("@/components/brain/UnifiedBrainCanvas", () => ({
  UnifiedBrainCanvas: () => <div data-testid="page-graph-ready">graph ready</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="structured-map-preview">structured map</div>,
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      listSessions: listSessionsMock,
      getHub: getHubMock,
      configCheck: configCheckMock,
      getContentSources: getContentSourcesMock,
      getTemplateChains: getTemplateChainsMock,
      listWorkflows: listWorkflowsMock,
      preflightSession: preflightSessionMock,
      getSession: getSessionMock,
      getProjectShell: getProjectShellMock,
      saveProjectShellState: saveProjectShellStateMock,
      restoreStudioItems: restoreStudioItemsMock,
      getSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      saveSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      createArtifact: vi.fn(),
      deleteArtifacts: vi.fn(),
      createSession: vi.fn(),
      createCustomChain: vi.fn(),
      endSession: vi.fn(),
      advanceBlock: vi.fn(),
    },
    studyWheel: {
      getCurrentCourse: getCurrentCourseMock,
    },
    learningObjectives: {
      getByCourse: getLearningObjectivesByCourseMock,
    },
    obsidian: {
      append: vi.fn(),
      getConfig: getConfigMock,
      getVaultIndex: getVaultIndexMock,
      getFile: getFileMock,
      getFiles: getFilesMock,
      saveFile: saveFileMock,
    },
  },
  fetchCourseMap: fetchCourseMapMock,
}));

import Tutor from "@/pages/tutor";

function makeProjectShell(courseId = 1) {
  return {
    course: {
      id: courseId,
      name: `Course ${courseId}`,
      code: `COURSE-${courseId}`,
      term: null,
      instructor: null,
      default_study_mode: null,
      delivery_format: null,
    },
    workspace_state: {
      active_tutor_session_id: null,
      last_mode: "studio",
      active_board_scope: "project",
      active_board_id: null,
      viewer_state: null,
      selected_material_ids: [],
      revision: 1,
      updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
    },
    continuation: {
      can_resume: false,
      active_tutor_session_id: null,
      last_mode: "studio",
    },
    active_session: null,
    recent_sessions: [],
    counts: {
      active_sessions: 0,
      session_count: 0,
      studio_total_items: 0,
      studio_captured_items: 0,
      studio_promoted_items: 0,
      pending_schedule_events: 0,
    },
  };
}

function makeTutorHub() {
  return {
    recommended_action: null,
    resume_candidate: null,
    upcoming_assignments: [],
    upcoming_tests: [],
    class_projects: [],
    study_wheel: {
      current_course_name: "Course 1",
      current_position: 1,
      total_sessions: 0,
      total_minutes: 0,
    },
  };
}

function makeActiveSession(sessionId = "sess-active", courseId = 1) {
  return {
    session_id: sessionId,
    status: "active",
    turn_count: 2,
    started_at: new Date("2026-03-13T12:00:00Z").toISOString(),
    topic: "Launch leak repro",
    course_id: courseId,
    method_chain_id: null,
    current_block_index: 0,
    chain_blocks: [],
    content_filter: {
      material_ids: [],
      accuracy_profile: "strict",
      objective_scope: "module_all",
    },
    scholar_strategy: {
      summary: "Keep retrieval tight and mechanism-first.",
      profileSnapshotId: "profile-1",
      hybridArchetype: {
        label: "Precision Builder",
      },
      boundedBy: {
        note: "Bound to the active tutor session only.",
        allowedFields: ["pace"],
        forbiddenFields: ["launch"],
      },
      fields: {},
      activeInvestigation: null,
    },
    strategy_feedback: null,
    artifacts_json: "[]",
    turns: [],
  };
}

function renderTutor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Tutor />
    </QueryClientProvider>,
  );
}

describe("Tutor studio route integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tutor");
    getMaterialsMock.mockResolvedValue([]);
    listSessionsMock.mockResolvedValue([]);
    getHubMock.mockResolvedValue(makeTutorHub());
    configCheckMock.mockResolvedValue({ ok: true });
    getContentSourcesMock.mockResolvedValue({ courses: [] });
    getTemplateChainsMock.mockResolvedValue([]);
    listWorkflowsMock.mockResolvedValue({ items: [], count: 0 });
    preflightSessionMock.mockResolvedValue({
      ok: true,
      preflight_id: "preflight-test",
      course_id: 1,
      material_ids: [],
      resolved_learning_objectives: [],
      map_of_contents: null,
      vault_ready: false,
      recommended_mode_flags: {
        materials: false,
        obsidian: true,
        gemini_vision: false,
        web_search: false,
        deep_think: false,
      },
      blockers: [],
    });
    getLearningObjectivesByCourseMock.mockResolvedValue([]);
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 1 } });
    fetchCourseMapMock.mockResolvedValue({ courses: [] });
    getConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Note": "Tutor Workspace/Tutor Note.md",
      },
    });
    getFileMock.mockResolvedValue({ success: true, content: "# Tutor Note" });
    getFilesMock.mockResolvedValue({ files: [] });
    saveFileMock.mockResolvedValue({ success: true, path: "Tutor Workspace/Tutor Note.md" });
    getProjectShellMock.mockResolvedValue(makeProjectShell(1));
    saveProjectShellStateMock.mockImplementation(async () => ({
      workspace_state: {
        active_tutor_session_id: null,
        last_mode: "studio",
        active_board_scope: "project",
        active_board_id: null,
        viewer_state: null,
        selected_material_ids: [],
        revision: 2,
        updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
      },
    }));
    restoreStudioItemsMock.mockResolvedValue({ items: [] });
  });

  it("renders the Studio prep surface from Studio mode without reviving Brain chrome", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=studio");
    renderTutor();

    expect(await screen.findByText("NO CHAIN SELECTED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open studio/i })).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("brain-tool-profile")).not.toBeInTheDocument();
  });

  it("falls back to the Studio hub when the active session restore is stale", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-active");
    getSessionMock.mockRejectedValueOnce(new Error("missing"));

    renderTutor();

    expect(await screen.findByTestId("tutor-launch-hub")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /scholar strategy/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start new/i })).toBeInTheDocument();
  });
});
