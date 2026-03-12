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
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="tutor-layout">{children}</div>,
}));

vi.mock("@/components/ContentFilter", () => ({
  ContentFilter: () => <div data-testid="content-filter" />,
}));

vi.mock("@/components/TutorWizard", () => ({
  TutorWizard: () => <div data-testid="tutor-wizard">wizard</div>,
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
    getCurrentCourseMock.mockResolvedValue({ currentCourse: null });
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
  });

  it("renders the real Tutor workspace tools from the Tutor route without reviving Brain chrome", async () => {
    renderTutor();

    fireEvent.click(await screen.findByRole("button", { name: /workspace/i }));

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
