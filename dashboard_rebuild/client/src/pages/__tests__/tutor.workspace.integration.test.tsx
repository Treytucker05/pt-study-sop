import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  getMaterialsMock,
  listSessionsMock,
  configCheckMock,
  getContentSourcesMock,
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
  configCheckMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
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

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      listSessions: listSessionsMock,
      configCheck: configCheckMock,
      getContentSources: getContentSourcesMock,
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

describe("Tutor workspace route integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tutor");
    getMaterialsMock.mockResolvedValue([]);
    listSessionsMock.mockResolvedValue([]);
    configCheckMock.mockResolvedValue({ ok: true });
    getContentSourcesMock.mockResolvedValue({ courses: [] });
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

  it("renders the real Tutor workspace tools from Studio mode without reviving Brain chrome", async () => {
    renderTutor();

    expect(await screen.findByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-rail")).not.toBeInTheDocument();
    expect(screen.queryByTestId("brain-tool-profile")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tutor Note\.md/i }));
    await waitFor(() => {
      expect(getFileMock).toHaveBeenCalledWith("Tutor Workspace/Tutor Note.md");
    });
    expect(screen.getByDisplayValue("# Tutor Note")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutor-workspace-tab-graph"));
    expect(await screen.findByTestId("page-graph-ready")).toBeInTheDocument();
  });
});
