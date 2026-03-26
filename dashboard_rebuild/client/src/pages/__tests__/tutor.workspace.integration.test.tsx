import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({
    children,
  }: {
    children:
      | ReactNode
      | ((controls: {
        zoomIn: () => void;
        zoomOut: () => void;
        resetTransform: () => void;
      }) => ReactNode);
  }) => (
    <div data-testid="mock-transform-wrapper">
      {typeof children === "function"
        ? children({
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            resetTransform: vi.fn(),
          })
        : children}
    </div>
  ),
  TransformComponent: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-transform-component">{children}</div>
  ),
}));

vi.mock("@/components/ContentFilter", () => ({
  ContentFilter: () => <div data-testid="content-filter" />,
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: () => <div data-testid="tutor-chat">chat</div>,
}));

vi.mock("@/components/TutorWorkflowPrimingPanel", () => ({
  TutorWorkflowPrimingPanel: () => (
    <div data-testid="page-mock-priming-panel">priming panel</div>
  ),
}));

vi.mock("@/components/TutorWorkflowPolishStudio", () => ({
  TutorWorkflowPolishStudio: () => (
    <div data-testid="page-mock-polish-panel">polish panel</div>
  ),
}));

vi.mock("@/components/TutorWorkflowFinalSync", () => ({
  TutorWorkflowFinalSync: () => (
    <div data-testid="page-mock-final-sync-panel">final sync panel</div>
  ),
}));

vi.mock("@/components/TutorArtifacts", () => ({
  TutorArtifacts: () => <div data-testid="tutor-artifacts">artifacts</div>,
}));

vi.mock("@/components/studio/StudioTldrawWorkspaceLazy", () => ({
  StudioTldrawWorkspaceLazy: () => (
    <div data-testid="page-studio-workspace">workspace canvas</div>
  ),
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
      getMaterialFileUrl: (id: number) => `/api/tutor/materials/${id}/file`,
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

function makeProjectShell(
  courseId = 1,
  overrides: Partial<{
    panel_layout: Record<string, unknown>[];
    document_tabs: Record<string, unknown>[];
    active_document_tab_id: string | null;
  }> = {},
) {
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
      panel_layout: overrides.panel_layout || [],
      document_tabs: overrides.document_tabs || [],
      active_document_tab_id: overrides.active_document_tab_id || null,
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
    window.scrollTo = vi.fn();
    Element.prototype.scrollTo = vi.fn();
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
      panel_layout: [],
      document_tabs: [],
      active_document_tab_id: null,
      prime_packet_promoted_objects: [],
      selected_material_ids: [],
      revision: 2,
      updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
      },
    }));
    restoreStudioItemsMock.mockResolvedValue({ items: [] });
  });

  it("lands Studio entry inside the anchored Studio shell frame", async () => {
    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("studio-entry-state")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start priming/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open full studio/i })).toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-run-config")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-tutor-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-memory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-prime-packet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-polish-packet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("brain-tool-profile")).not.toBeInTheDocument();
  });

  it("normalizes explicit Studio mode into the same floating canvas surface", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=studio");
    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-entry-state")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("brain-tool-profile")).not.toBeInTheDocument();
  });

  it("restores a saved floating workspace layout through /tutor", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=studio");
    localStorage.setItem("tutor-studio-last-tab", "workspace");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(1, {
        panel_layout: [
          {
            id: "panel-source-shelf",
            panel: "source_shelf",
            position: { x: 24, y: 88 },
            size: { width: 320, height: 720 },
            zIndex: 1,
            collapsed: false,
          },
          {
            id: "panel-document-dock",
            panel: "document_dock",
            position: { x: 380, y: 88 },
            size: { width: 760, height: 228 },
            zIndex: 2,
            collapsed: false,
          },
          {
            id: "panel-workspace",
            panel: "workspace",
            position: { x: 380, y: 332 },
            size: { width: 760, height: 460 },
            zIndex: 3,
            collapsed: false,
          },
        ],
        document_tabs: [
          {
            id: "doc-material-101",
            kind: "material",
            title: "Cardiac Output Lecture",
            sourceId: 101,
          },
        ],
        active_document_tab_id: "doc-material-101",
      }),
    );

    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-source-shelf")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-document-dock")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-workspace-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("studio-source-shelf")).getByText(/source shelf/i),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId("studio-workspace-panel")
        .querySelector("[data-panel-position='380,332']"),
    ).not.toBeNull();
    expect(
      screen
        .getByTestId("studio-document-dock")
        .querySelector("[data-panel-size='760,228']"),
    ).not.toBeNull();
  });

  it("restores Priming, Tutor, and Polish as floating panels inside the Studio shell", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=studio");
    localStorage.setItem("tutor-studio-last-tab", "workspace");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(1, {
        panel_layout: [
          {
            id: "panel-priming",
            panel: "priming",
            position: { x: 1600, y: 100 },
            size: { width: 680, height: 440 },
            zIndex: 10,
            collapsed: false,
          },
          {
            id: "panel-tutor",
            panel: "tutor",
            position: { x: 1600, y: 560 },
            size: { width: 680, height: 520 },
            zIndex: 11,
            collapsed: false,
          },
          {
            id: "panel-polish",
            panel: "polish",
            position: { x: 2300, y: 100 },
            size: { width: 680, height: 440 },
            zIndex: 12,
            collapsed: false,
          },
        ],
      }),
    );

    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-tutor-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-polish-panel")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("studio-tutor-panel")).getByText(
        "READY TO RUN A STUDY SESSION",
      ),
    ).toBeInTheDocument();
  });

  it("opens the live Workspace stage when entering from the Library handoff", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=9&mode=studio");
    localStorage.setItem("tutor-studio-last-tab", "workspace");
    localStorage.setItem("tutor.selected_material_ids.v2", JSON.stringify([1]));
    localStorage.setItem(
      "tutor.start.state.v2",
      JSON.stringify({
        courseId: 9,
        topic: "",
        selectedMaterials: [1],
        customBlockIds: [],
        accuracyProfile: "strict",
        objectiveScope: "module_all",
        selectedObjectiveId: "",
        selectedObjectiveGroup: "",
        selectedPaths: [],
      }),
    );
    sessionStorage.setItem("tutor.open_from_library.v1", "1");
    getMaterialsMock.mockResolvedValue([
      {
        id: 1,
        title: "Cardiac Output Lecture",
        source_path: "uploads/cardio-output.pdf",
        folder_path: "Uploaded Files",
        file_type: "pdf",
        file_size: 1024,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "abc123",
        created_at: new Date("2026-03-13T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-13T12:00:00Z").toISOString(),
      },
    ]);
    getProjectShellMock.mockResolvedValue(makeProjectShell(9));
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 9 } });

    renderTutor();

    fireEvent.click(
      await screen.findByRole("button", { name: /open source shelf panel/i }),
    );

    const sourceShelf = await screen.findByTestId("studio-source-shelf");
    expect(sourceShelf).toHaveTextContent("1 materials in run");
    expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
  });

  it("normalizes a legacy schedule query into the same floating canvas contract", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=schedule");

    renderTutor();

    expect(screen.queryByRole("tab", { name: /^workspace$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^schedule$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^settings$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("OPEN WORKBENCH")).not.toBeInTheDocument();
    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-entry-state")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
  });

  it("falls back to the floating canvas entry state when the active session restore is stale", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-active");
    getSessionMock.mockRejectedValueOnce(new Error("missing"));

    renderTutor();

    expect(await screen.findByTestId("studio-entry-state")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-launch-hub")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /scholar strategy/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start priming/i })).toBeInTheDocument();
  });
});
