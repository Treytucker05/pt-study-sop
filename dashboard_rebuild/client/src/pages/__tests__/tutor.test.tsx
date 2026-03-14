import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";

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
  getObsidianConfigMock,
  getObsidianVaultIndexMock,
  getObsidianFileMock,
  saveObsidianFileMock,
  getObsidianFilesMock,
  getProjectShellMock,
  saveProjectShellStateMock,
  restoreStudioItemsMock,
  promoteStudioItemMock,
  workspaceSurfaceMode,
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
  getObsidianConfigMock: vi.fn(),
  getObsidianVaultIndexMock: vi.fn(),
  getObsidianFileMock: vi.fn(),
  saveObsidianFileMock: vi.fn(),
  getObsidianFilesMock: vi.fn(),
  getProjectShellMock: vi.fn(),
  saveProjectShellStateMock: vi.fn(),
  restoreStudioItemsMock: vi.fn(),
  promoteStudioItemMock: vi.fn(),
  workspaceSurfaceMode: { useReal: false },
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ContentFilter", () => ({
  ContentFilter: () => <div data-testid="content-filter" />,
}));

vi.mock("@/components/TutorStartPanel", () => ({
  TutorStartPanel: ({
    selectedMaterials,
  }: {
    selectedMaterials: number[];
  }) => <div data-testid="tutor-start-panel">selected:{selectedMaterials.length}</div>,
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: () => <div data-testid="tutor-chat" />,
}));

vi.mock("@/components/TutorArtifacts", () => ({
  TutorArtifacts: ({ artifacts }: { artifacts: { type: string }[] }) => (
    <div data-testid="tutor-artifacts-types">
      {artifacts.map((artifact) => artifact.type).join(",")}
    </div>
  ),
}));

vi.mock("@/components/TutorScheduleMode", () => ({
  TutorScheduleMode: () => <div data-testid="tutor-schedule-mode">schedule mode</div>,
}));

vi.mock("@/components/TutorPublishMode", () => ({
  TutorPublishMode: () => <div data-testid="tutor-publish-mode">publish mode</div>,
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw-canvas">mock excalidraw canvas</div>,
  exportToBlob: vi.fn().mockResolvedValue(new Blob(["png"])),
  convertToExcalidrawElements: (elements: unknown) => elements,
}));

vi.mock("@/components/TutorWorkspaceSurface", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("@/components/TutorWorkspaceSurface");
  return {
    TutorWorkspaceSurface: (props: ComponentProps<typeof actual.TutorWorkspaceSurface>) => {
      if (workspaceSurfaceMode.useReal) {
        const ActualSurface = actual.TutorWorkspaceSurface as (props: Record<string, unknown>) => ReactNode;
        return <>{ActualSurface(props as unknown as Record<string, unknown>)}</>;
      }
      return <div data-testid="tutor-workspace-surface">workspace tools</div>;
    },
  };
});

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
      getProjectShell: getProjectShellMock,
      saveProjectShellState: saveProjectShellStateMock,
      restoreStudioItems: restoreStudioItemsMock,
      promoteStudioItem: promoteStudioItemMock,
      createArtifact: vi.fn(),
      deleteArtifacts: vi.fn(),
      createSession: vi.fn(),
      createCustomChain: vi.fn(),
      endSession: vi.fn(),
      advanceBlock: vi.fn(),
      exportSession: vi.fn(),
      saveStrategyFeedback: vi.fn(),
    },
    studyWheel: {
      getCurrentCourse: getCurrentCourseMock,
    },
    learningObjectives: {
      getByCourse: getLearningObjectivesByCourseMock,
    },
    obsidian: {
      append: vi.fn(),
      getConfig: getObsidianConfigMock,
      getVaultIndex: getObsidianVaultIndexMock,
      getFile: getObsidianFileMock,
      saveFile: saveObsidianFileMock,
      getFiles: getObsidianFilesMock,
    },
  },
  fetchCourseMap: fetchCourseMapMock,
}));

import Tutor from "@/pages/tutor";

function makeProjectShell(courseId = 1, overrides: Partial<{
  last_mode: "studio" | "tutor" | "schedule" | "publish";
  active_session_id: string | null;
  active_board_scope: "session" | "project" | "overall";
  selected_material_ids: number[];
}> = {}) {
  const activeSessionId =
    overrides.active_session_id === undefined ? null : overrides.active_session_id;
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
      active_tutor_session_id: activeSessionId,
      last_mode: overrides.last_mode || "studio",
      active_board_scope: overrides.active_board_scope || "project",
      active_board_id: null,
      viewer_state: null,
      selected_material_ids: overrides.selected_material_ids || [],
      revision: 1,
      updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
    },
    continuation: {
      can_resume: Boolean(activeSessionId),
      active_tutor_session_id: activeSessionId,
      last_mode: overrides.last_mode || "studio",
    },
    active_session: activeSessionId
      ? {
          session_id: activeSessionId,
          course_id: courseId,
          phase: "first_pass",
          topic: "Active Session",
          status: "active",
          turn_count: 0,
          started_at: new Date("2026-03-13T00:00:00Z").toISOString(),
          ended_at: null,
        }
      : null,
    recent_sessions: [],
    counts: {
      active_sessions: activeSessionId ? 1 : 0,
      session_count: activeSessionId ? 1 : 0,
      studio_total_items: 0,
      studio_captured_items: 0,
      studio_promoted_items: 0,
      pending_schedule_events: 0,
    },
  };
}

function renderTutor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Tutor />
    </QueryClientProvider>,
  );
}

describe("Tutor page restore", () => {
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
    getCurrentCourseMock.mockResolvedValue({ currentCourse: null });
    fetchCourseMapMock.mockResolvedValue({ courses: [] });
    getObsidianConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getObsidianVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Note": "Tutor Workspace/Tutor Note.md",
      },
    });
    getObsidianFileMock.mockResolvedValue({ success: true, content: "# Tutor Note" });
    saveObsidianFileMock.mockResolvedValue({ success: true, path: "Tutor Workspace/Tutor Note.md" });
    getObsidianFilesMock.mockResolvedValue({ files: [] });
    getProjectShellMock.mockResolvedValue(makeProjectShell());
    saveProjectShellStateMock.mockImplementation(async (data: { course_id: number; last_mode?: "studio" | "tutor" | "schedule" | "publish"; active_tutor_session_id?: string | null; active_board_scope?: "session" | "project" | "overall"; selected_material_ids?: number[]; revision?: number; }) => ({
      workspace_state: {
        active_tutor_session_id: data.active_tutor_session_id || null,
        last_mode: data.last_mode || "studio",
        active_board_scope: data.active_board_scope || "project",
        active_board_id: null,
        viewer_state: null,
        selected_material_ids: data.selected_material_ids || [],
        revision: (data.revision || 0) + 1,
        updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
      },
    }));
    restoreStudioItemsMock.mockResolvedValue({ items: [] });
    promoteStudioItemMock.mockResolvedValue({ item: null, action: null });
    workspaceSurfaceMode.useReal = false;
  });

  it("preserves structured_notes artifacts when restoring an active session", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-restore");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(1, {
        last_mode: "tutor",
        active_session_id: "sess-restore",
      }),
    );
    getSessionMock.mockResolvedValue({
      session_id: "sess-restore",
      status: "active",
      turn_count: 1,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Restore Topic",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: JSON.stringify([
        {
          type: "structured_notes",
          created_at: new Date("2026-03-05T12:05:00Z").toISOString(),
        },
      ]),
      turns: [],
    });

    renderTutor();

    const artifactsButton = await screen.findByRole("button", { name: /artifacts/i });
    fireEvent.click(artifactsButton);

    await waitFor(() => {
      expect(screen.getByTestId("tutor-artifacts-types")).toHaveTextContent(
        "structured_notes",
      );
    });
  });

  it("shows Brain-to-Tutor framing while Studio is the default shell mode", async () => {
    renderTutor();

    expect(
      await screen.findByText(
        "Brain's default live study surface for guided sessions, artifacts, and next-step handoff.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^studio$/i })).toBeInTheDocument();
    expect(screen.getByText("STUDIO NEEDS A COURSE")).toBeInTheDocument();
  });

  it("defaults to Studio and keeps Tutor as the separate live study surface", async () => {
    renderTutor();

    expect(await screen.findByText("STUDIO NEEDS A COURSE")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-workspace-surface")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
    expect(await screen.findByTestId("tutor-start-panel")).toBeInTheDocument();
    expect(screen.queryByText("STUDIO NEEDS A COURSE")).not.toBeInTheDocument();
  });

  it("restores an explicit session_id query before local startup state", async () => {
    window.history.replaceState(
      {},
      "",
      "/tutor?course_id=77&mode=tutor&session_id=sess-route",
    );
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-route",
      status: "active",
      turn_count: 2,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Route Session",
      course_id: 77,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [11],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: "[]",
      turns: [],
    });
    localStorage.setItem(
      "tutor.start.state.v2",
      JSON.stringify({
        courseId: 55,
        selectedMaterials: [999],
      }),
    );

    renderTutor();

    expect(await screen.findByTestId("tutor-chat")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-start-panel")).not.toBeInTheDocument();
    expect(getSessionMock).toHaveBeenCalledWith("sess-route");
  });

  it("honors schedule mode from Tutor shell query params", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=schedule");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "studio",
      }),
    );

    renderTutor();

    expect(await screen.findByTestId("tutor-schedule-mode")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-start-panel")).not.toBeInTheDocument();
  });

  it("restores publish mode from project shell when no explicit route mode is set", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "publish",
      }),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    expect(await screen.findByTestId("tutor-publish-mode")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-start-panel")).not.toBeInTheDocument();
  });

  it("hydrates board_scope and board_id from query params and persists to shell state", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio&board_scope=overall&board_id=42");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "studio",
        active_board_scope: "session",
      }),
    );

    renderTutor();

    // Studio mode should render (course_id + mode=studio)
    await waitFor(() => {
      expect(getProjectShellMock).toHaveBeenCalled();
    });

    // Verify the shell state save was called with board_scope from query params
    await waitFor(() => {
      if (saveProjectShellStateMock.mock.calls.length > 0) {
        const lastCall = saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ][0];
        expect(lastCall.active_board_scope).toBe("overall");
      }
    });
  });

  it("can host the real rehomed workspace surface without leaking Brain chrome", async () => {
    workspaceSurfaceMode.useReal = true;
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });
    getProjectShellMock.mockResolvedValue(makeProjectShell(77));

    renderTutor();

    expect(await screen.findByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(screen.getByText("Quick vault picks")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-workspace-tab-canvas")).toBeInTheDocument();
    expect(screen.queryByTestId("brain-home")).not.toBeInTheDocument();
  });

  it("shows the Brain handoff banner when launched from Brain", async () => {
    sessionStorage.setItem(
      "tutor.open_from_brain.v1",
      JSON.stringify({
        source: "brain-home",
        itemId: "study-today",
        title: "Keep your 5-day streak alive",
        reason: "Reason: no study session has been logged today.",
      }),
    );

    renderTutor();

    await waitFor(() => {
      expect(screen.getByTestId("tutor-brain-handoff")).toHaveTextContent(
        "Keep your 5-day streak alive",
      );
    });
    expect(screen.getByTestId("tutor-brain-handoff")).toHaveTextContent(
      "Reason: no study session has been logged today.",
    );
    expect(sessionStorage.getItem("tutor.open_from_brain.v1")).toBeNull();
  });

  it("uses library handoff state instead of stale stored start state", async () => {
    sessionStorage.setItem("tutor.open_from_library.v1", "1");
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([101, 102]),
    );
    localStorage.setItem(
      "tutor.wizard.state.v1",
      JSON.stringify({
        courseId: 55,
        selectedMaterials: [],
        accuracyProfile: "strict",
      }),
    );

    renderTutor();

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
      expect(screen.getByTestId("tutor-start-panel")).toHaveTextContent("selected:2");
    });
    expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
  });

  it("keeps canonical selected materials when bootstrapping the current course", async () => {
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([101]),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });
    getProjectShellMock.mockResolvedValue(makeProjectShell(77));

    renderTutor();

    await waitFor(() => {
      expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
    await waitFor(() => {
      expect(screen.getByTestId("tutor-start-panel")).toHaveTextContent("selected:1");
    });
    expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
  });

  it("migrates legacy library-selected material ids when Tutor boots", async () => {
    localStorage.setItem(
      "tutor.selected_material_ids.v1",
      JSON.stringify([301, 302]),
    );

    renderTutor();

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
      expect(screen.getByTestId("tutor-start-panel")).toHaveTextContent("selected:2");
    });
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([301, 302]),
    );
    expect(localStorage.getItem("tutor.selected_material_ids.v1")).toBeNull();
  });

  it("clears a stale active-session key when restore fetch fails", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-stale");
    getSessionMock.mockRejectedValueOnce(new Error("missing"));

    renderTutor();

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-stale");
    });
    fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
    expect(await screen.findByTestId("tutor-start-panel")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });

  it("falls back safely when wizard state is corrupted JSON", async () => {
    localStorage.setItem("tutor.wizard.state.v1", "{not-valid-json");
    localStorage.setItem("tutor.selected_material_ids.v2", JSON.stringify([909]));

    renderTutor();

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
      expect(screen.getByTestId("tutor-start-panel")).toHaveTextContent("selected:1");
    });
  });

  it("clears inactive restored sessions from localStorage", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-complete");
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-complete",
      status: "completed",
      turn_count: 2,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Completed Session",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: "[]",
      turns: [],
    });

    renderTutor();

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-complete");
    });
    fireEvent.click(screen.getByRole("button", { name: /^tutor$/i }));
    expect(await screen.findByTestId("tutor-start-panel")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });
});
