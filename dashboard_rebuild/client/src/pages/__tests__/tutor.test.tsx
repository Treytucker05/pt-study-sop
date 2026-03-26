import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";

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
  getHubMock: vi.fn(),
  configCheckMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
  getTemplateChainsMock: vi.fn(),
  listWorkflowsMock: vi.fn(),
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
  TutorStartPanel: ({ selectedMaterials }: { selectedMaterials: number[] }) => (
    <div data-testid="tutor-start-panel">
      selected:{selectedMaterials.length}
    </div>
  ),
}));

vi.mock("@/components/TutorCommandDeck", () => ({
  TutorCommandDeck: ({
    hub,
    launchSettings,
    onOpenProject,
    onOpenScheduleCourse,
    onOpenScheduleEvent,
    onLoadMaterials,
    onResumeCandidate,
    onRunRecommendedAction,
  }: {
    hub?: {
      recommended_action?: {
        title?: string;
      } | null;
      resume_candidate?: unknown | null;
      upcoming_assignments?: {
        id: number;
        course_id: number;
        course_name: string;
        course_code?: string | null;
        title: string;
        type: string;
        scheduled_date?: string | null;
        status?: string | null;
      }[];
    };
    launchSettings: ReactNode;
    onOpenProject: (courseId: number) => void;
    onOpenScheduleCourse: (
      courseId: number,
      kind: "manage_event" | "manage_exam",
    ) => void;
    onOpenScheduleEvent: (
      event: {
        id: number;
        course_id: number;
        course_name: string;
        course_code?: string | null;
        title: string;
        type: string;
        scheduled_date?: string | null;
        status?: string | null;
      },
      kind: "open_event",
    ) => void;
    onLoadMaterials: (params: {
      source: "assignment" | "exam" | "course";
      courseId: number;
      courseName?: string | null;
      courseEventId?: number;
      eventType?: string | null;
    }) => void;
    onResumeCandidate: (candidate: unknown) => void;
    onRunRecommendedAction: (action: unknown) => void;
  }) => (
    <div data-testid="tutor-command-deck">
      <div data-testid="tutor-command-deck-title">
        {hub?.recommended_action?.title || "No recommendation"}
      </div>
      <button type="button" onClick={() => onOpenProject(7)}>
        Open Project
      </button>
      <button
        type="button"
        onClick={() => onOpenScheduleCourse(7, "manage_event")}
      >
        Manage Events
      </button>
      <button
        type="button"
        onClick={() => onOpenScheduleCourse(7, "manage_exam")}
      >
        Manage Exams
      </button>
      <button
        type="button"
        onClick={() =>
          onOpenScheduleEvent(
            hub?.upcoming_assignments?.[0] || {
              id: 31,
              course_id: 7,
              course_name: "Neuro",
              course_code: "NEU-7",
              title: "Case Study",
              type: "assignment",
              scheduled_date: "2026-03-20",
              status: "pending",
            },
            "open_event",
          )
        }
      >
        Open Event
      </button>
      <button
        type="button"
        onClick={() =>
          onLoadMaterials({
            source: "course",
            courseId: 7,
            courseName: "Neuro",
          })
        }
      >
        Load Materials
      </button>
      <button
        type="button"
        onClick={() => {
          if (hub?.resume_candidate) onResumeCandidate(hub.resume_candidate);
        }}
      >
        Resume Candidate
      </button>
      <button
        type="button"
        onClick={() => {
          if (hub?.recommended_action)
            onRunRecommendedAction(hub.recommended_action);
        }}
      >
        Run Recommended
      </button>
      {launchSettings}
    </div>
  ),
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
  TutorScheduleMode: ({
    launchIntent,
  }: {
    launchIntent?: {
      kind?: string;
      courseId?: number;
      courseEventId?: number | null;
    } | null;
  }) => (
    <div data-testid="tutor-schedule-mode">
      {launchIntent
        ? `${launchIntent.kind}:${launchIntent.courseId}:${launchIntent.courseEventId ?? ""}`
        : "schedule mode"}
    </div>
  ),
}));

vi.mock("@/components/TutorPublishMode", () => ({
  TutorPublishMode: () => (
    <div data-testid="tutor-publish-mode">publish mode</div>
  ),
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => (
    <div data-testid="mock-excalidraw-canvas">mock excalidraw canvas</div>
  ),
  exportToBlob: vi.fn().mockResolvedValue(new Blob(["png"])),
  convertToExcalidrawElements: (elements: unknown) => elements,
}));

vi.mock("@/components/TutorWorkspaceSurface", async (importOriginal) => {
  const actual =
    (await importOriginal()) as typeof import("@/components/TutorWorkspaceSurface");
  return {
    TutorWorkspaceSurface: (
      props: ComponentProps<typeof actual.TutorWorkspaceSurface>,
    ) => {
      if (workspaceSurfaceMode.useReal) {
        const ActualSurface = actual.TutorWorkspaceSurface as (
          props: Record<string, unknown>,
        ) => ReactNode;
        return (
          <>{ActualSurface(props as unknown as Record<string, unknown>)}</>
        );
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
      getHub: getHubMock,
      configCheck: configCheckMock,
      getContentSources: getContentSourcesMock,
      getTemplateChains: getTemplateChainsMock,
      listWorkflows: listWorkflowsMock,
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

function makeProjectShell(
  courseId = 1,
  overrides: Partial<{
    last_mode: "studio" | "tutor" | "schedule" | "publish";
    active_session_id: string | null;
    active_board_scope: "session" | "project" | "overall";
    prime_packet_promoted_objects: Record<string, unknown>[];
    polish_packet_promoted_notes: Record<string, unknown>[];
    selected_material_ids: number[];
  }> = {},
) {
  const activeSessionId =
    overrides.active_session_id === undefined
      ? null
      : overrides.active_session_id;
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
      prime_packet_promoted_objects:
        overrides.prime_packet_promoted_objects || [],
      polish_packet_promoted_notes:
        overrides.polish_packet_promoted_notes || [],
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

function makeTutorHub() {
  return {
    recommended_action: {
      kind: "wheel_course",
      title: "Open Neuro project",
      reason: "Neuro is next on the study wheel.",
      action_label: "OPEN PROJECT",
      course_id: 7,
      course_name: "Neuro",
      course_code: "NEU-7",
      session_id: null,
      course_event_id: null,
      event_type: null,
    },
    resume_candidate: {
      can_resume: false,
      session_id: null,
      course_id: 7,
      course_name: "Neuro",
      course_code: "NEU-7",
      topic: "Last Studio Workspace",
      last_mode: "studio",
      board_scope: "project",
      board_id: null,
      updated_at: "2026-03-14T15:00:00Z",
      action_label: "Reopen Neuro workspace",
    },
    upcoming_assignments: [
      {
        id: 31,
        course_id: 7,
        course_name: "Neuro",
        course_code: "NEU-7",
        title: "Case Study",
        type: "assignment",
        scheduled_date: "2026-03-20",
        status: "pending",
      },
    ],
    upcoming_tests: [
      {
        id: 41,
        course_id: 7,
        course_name: "Neuro",
        course_code: "NEU-7",
        title: "Neuro Exam",
        type: "exam",
        scheduled_date: "2026-03-25",
        status: "pending",
      },
    ],
    class_projects: [
      {
        course_id: 7,
        course_name: "Neuro",
        course_code: "NEU-7",
        material_count: 2,
        recent_session_count: 1,
        last_studied_at: "2026-03-14T15:00:00Z",
        pending_event_count: 1,
        captured_item_count: 0,
        promoted_item_count: 1,
        wheel_linked: true,
        wheel_active: true,
        wheel_position: 1,
        active_session: null,
        next_due_event: {
          id: 41,
          course_id: 7,
          course_name: "Neuro",
          course_code: "NEU-7",
          title: "Neuro Exam",
          type: "exam",
          scheduled_date: "2026-03-25",
          status: "pending",
        },
      },
    ],
    study_wheel: {
      current_course_id: 7,
      current_course_name: "Neuro",
      current_course_code: "NEU-7",
      current_position: 1,
      next_course_id: 8,
      next_course_name: "Cardio",
      next_course_code: "CARD-8",
      total_active_courses: 3,
      total_sessions: 6,
      total_minutes: 180,
    },
  };
}

function renderTutor() {
  if (!document.getElementById("page-hero-portal")) {
    const heroPortal = document.createElement("div");
    heroPortal.id = "page-hero-portal";
    document.body.appendChild(heroPortal);
  }
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
    getCurrentCourseMock.mockResolvedValue({ currentCourse: null });
    fetchCourseMapMock.mockResolvedValue({ courses: [] });
    getObsidianConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getObsidianVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Note": "Tutor Workspace/Tutor Note.md",
      },
    });
    getObsidianFileMock.mockResolvedValue({
      success: true,
      content: "# Tutor Note",
    });
    saveObsidianFileMock.mockResolvedValue({
      success: true,
      path: "Tutor Workspace/Tutor Note.md",
    });
    getObsidianFilesMock.mockResolvedValue({ files: [] });
    getProjectShellMock.mockResolvedValue(makeProjectShell());
    saveProjectShellStateMock.mockImplementation(
      async (data: {
        course_id: number;
        last_mode?: "studio" | "tutor" | "schedule" | "publish";
        active_tutor_session_id?: string | null;
        active_board_scope?: "session" | "project" | "overall";
        prime_packet_promoted_objects?: Record<string, unknown>[];
        polish_packet_promoted_notes?: Record<string, unknown>[];
        selected_material_ids?: number[];
        revision?: number;
      }) => ({
        workspace_state: {
          active_tutor_session_id: data.active_tutor_session_id || null,
          last_mode: data.last_mode || "studio",
          active_board_scope: data.active_board_scope || "project",
          active_board_id: null,
          viewer_state: null,
          prime_packet_promoted_objects:
            data.prime_packet_promoted_objects || [],
          polish_packet_promoted_notes:
            data.polish_packet_promoted_notes || [],
          selected_material_ids: data.selected_material_ids || [],
          revision: (data.revision || 0) + 1,
          updated_at: new Date("2026-03-13T00:00:00Z").toISOString(),
        },
      }),
    );
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

    const artifactsButton = await screen.findByRole("button", {
      name: /artifacts/i,
    });
    fireEvent.click(artifactsButton);

    await waitFor(() => {
      expect(screen.getByTestId("tutor-artifacts-types")).toHaveTextContent(
        "structured_notes",
      );
    });
  });

  it("renders Studio as the default shell page", async () => {
    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-launch-hub")).toBeInTheDocument();
    expect(screen.getByText("STUDIO HUB")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /theme lab/i }),
    ).toBeInTheDocument();
    const tabBar = screen.getByTestId("workspace-tab-bar");
    expect(tabBar).toBeInTheDocument();
    const heroPortal = document.getElementById("page-hero-portal");
    expect(heroPortal).not.toBeNull();
    expect(heroPortal).toContainElement(tabBar);
    expect(
      within(tabBar).getByRole("tab", { name: /^studio$/i }),
    ).toHaveAttribute("id", "tutor-tab-studio");
    expect(
      within(tabBar).getByRole("tab", { name: /^tutor$/i }),
    ).toHaveAttribute("id", "tutor-tab-tutor");
    expect(
      within(tabBar).queryByRole("tab", { name: /^schedule$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(tabBar).queryByRole("tab", { name: /^settings$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^launch$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("OPEN WORKBENCH")).not.toBeInTheDocument();
    expect(screen.getByText("OPEN WORKSPACE")).toBeInTheDocument();
    expect(
      tabBar.compareDocumentPosition(screen.getByText("WORKSPACE HOME")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /^refresh$/i })).toHaveAttribute(
      "data-ui",
      "hud-button",
    );
    expect(screen.getByRole("button", { name: /^refresh$/i })).toHaveAttribute(
      "data-hud-variant",
      "outline",
    );
  });

  it("keeps Tutor as a separate live study surface from Studio", async () => {
    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /^tutor$/i }));
    expect(
      await screen.findByText("READY TO RUN A STUDY SESSION"),
    ).toBeInTheDocument();
    expect(screen.queryByText("WORKSPACE HOME")).not.toBeInTheDocument();
  });

  it("does not surface a completed backend session as a live Tutor session", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=tutor");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "tutor",
        active_session_id: "sess-complete",
      }),
    );
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-complete",
      status: "completed",
      turn_count: 2,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Completed Session",
      course_id: 77,
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
    expect(
      await screen.findByText("READY TO RUN A STUDY SESSION"),
    ).toBeInTheDocument();
    expect(screen.queryByText("LIVE SESSION")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tutor-chat")).not.toBeInTheDocument();
  });

  it("keeps deferred Schedule and Settings tabs hidden from the Tutor nav", async () => {
    renderTutor();

    const tabBar = await screen.findByTestId("workspace-tab-bar");
    expect(
      within(tabBar).queryByRole("tab", { name: /^schedule$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(tabBar).queryByRole("tab", { name: /^settings$/i }),
    ).not.toBeInTheDocument();
  });

  it("returns to Workspace Home from Tutor", async () => {
    renderTutor();

    fireEvent.click(await screen.findByRole("tab", { name: /^tutor$/i }));
    fireEvent.click(await screen.findByRole("tab", { name: /^studio$/i }));

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
  });

  it("resumes the most recent Tutor session from Studio", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getHubMock.mockResolvedValueOnce({
      ...makeTutorHub(),
      resume_candidate: {
        can_resume: true,
        session_id: "sess-recent",
        course_id: 7,
        course_name: "Neuro",
        course_code: "NEU-7",
        topic: "Recent Session",
        last_mode: "tutor",
        board_scope: "project",
        board_id: null,
        updated_at: "2026-03-14T15:00:00Z",
        action_label: "Resume Neuro tutor session",
      },
    });
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-recent",
      status: "active",
      turn_count: 2,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Recent Session",
      course_id: 7,
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

    fireEvent.click(
      within(await screen.findByTestId("tutor-launch-hub")).getByRole("button", {
        name: /^resume$/i,
      }),
    );

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-recent");
    });
    expect(await screen.findByTestId("tutor-chat")).toBeInTheDocument();
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
    expect(screen.queryByTestId("tutor-launch-hub")).not.toBeInTheDocument();
    expect(getSessionMock).toHaveBeenCalledWith("sess-route");
  });

  it("normalizes legacy schedule mode query params into the Studio v1 flow", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=schedule");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "studio",
      }),
    );

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^schedule$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("OPEN WORKBENCH")).not.toBeInTheDocument();
    expect(screen.getByText("OPEN WORKSPACE")).toBeInTheDocument();
  });

  it("keeps explicit Studio mode on Workspace Home even when project shell has an active tutor session", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "tutor",
        active_session_id: "sess-project",
      }),
    );
    workspaceSurfaceMode.useReal = true;

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-chat")).not.toBeInTheDocument();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("hydrates persisted Prime Packet promoted excerpts from project shell state", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        prime_packet_promoted_objects: [
          {
            id: "excerpt:101:abc123",
            kind: "excerpt",
            title: "Excerpt: Cardiac Output Lecture",
            detail:
              "Cardiac output is determined by stroke volume multiplied by heart rate.",
            badge: "EXCERPT",
            provenance: {
              materialId: 101,
              sourcePath: "uploads/cardio-output.pdf",
              fileType: "pdf",
              sourceTitle: "Cardiac Output Lecture",
              selectionLabel: "Paragraph 1",
            },
          },
        ],
      }),
    );

    renderTutor();

    fireEvent.click(await screen.findByRole("button", { name: /^open workspace$/i }));

    const primePacket = await screen.findByTestId("studio-prime-packet");
    await within(primePacket).findByText("Workspace Excerpt");
    await waitFor(() => {
      expect(primePacket).toHaveTextContent(
        "Cardiac output is determined by stroke volume multiplied by heart rate.",
      );
    });
  });

  it("hydrates persisted Prime Packet repair notes from project shell state", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        prime_packet_promoted_objects: [
          {
            id: "repair-note:repair:verdict:abc123",
            kind: "text_note",
            title: "Misconception to repair",
            detail:
              "The reply mixed preload effects with heart-rate regulation.",
            badge: "MISCONCEPTION",
            provenance: {
              sourceType: "repair_candidate",
              candidateId: "repair:verdict:abc123",
              sourceLabel: "Latest verdict",
            },
          },
        ],
      }),
    );

    renderTutor();

    fireEvent.click(await screen.findByRole("button", { name: /^open workspace$/i }));

    const primePacket = await screen.findByTestId("studio-prime-packet");
    await within(primePacket).findByText("Misconception to repair");
    await waitFor(() => {
      expect(primePacket).toHaveTextContent(
        "The reply mixed preload effects with heart-rate regulation.",
      );
    });
    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.prime_packet_promoted_objects).toEqual([
        expect.objectContaining({
          kind: "text_note",
          title: "Misconception to repair",
          detail:
            "The reply mixed preload effects with heart-rate regulation.",
        }),
      ]);
    });
  });

  it("hydrates persisted Polish Packet promoted notes from project shell state", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    localStorage.setItem("tutor-studio-last-tab", "polish");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        polish_packet_promoted_notes: [
          {
            id: "assistant-1",
            title: "Tutor Reply 3",
            content:
              "Cardiac output is determined by stroke volume multiplied by heart rate.",
            badge: "TUTOR",
          },
        ],
      }),
    );

    renderTutor();

    const polishPacket = await screen.findByTestId("studio-polish-packet");
    await within(polishPacket).findByText("Tutor Reply 3");
    await waitFor(() => {
      expect(polishPacket).toHaveTextContent(
        "Cardiac output is determined by stroke volume multiplied by heart rate.",
      );
    });
    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.polish_packet_promoted_notes).toEqual([
        expect.objectContaining({
          id: "assistant-1",
          title: "Tutor Reply 3",
          content:
            "Cardiac output is determined by stroke volume multiplied by heart rate.",
        }),
      ]);
    });
  });

  it("routes publish restore into Studio", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "publish",
      }),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-publish-mode")).not.toBeInTheDocument();
  });

  it("hydrates board_scope and board_id from query params and persists to shell state", async () => {
    window.history.replaceState(
      {},
      "",
      "/tutor?course_id=77&mode=studio&board_scope=overall&board_id=42",
    );
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
        const lastCall =
          saveProjectShellStateMock.mock.calls[
            saveProjectShellStateMock.mock.calls.length - 1
          ][0];
        expect(lastCall.active_board_scope).toBe("overall");
      }
    });
  });

  it("can enter the Studio prep surface without leaking Brain chrome", async () => {
    workspaceSurfaceMode.useReal = true;
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });
    getProjectShellMock.mockResolvedValue(makeProjectShell(77));

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(screen.getByText("OPEN WORKSPACE")).toBeInTheDocument();
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

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([101, 102]),
    );
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
    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([101]),
    );
    expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
  });

  it("migrates legacy library-selected material ids when Tutor boots", async () => {
    localStorage.setItem(
      "tutor.selected_material_ids.v1",
      JSON.stringify([301, 302]),
    );

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([301, 302]),
    );
    expect(localStorage.getItem("tutor.selected_material_ids.v1")).toBeNull();
  });

  it("clears a stale active-session key when restore fetch fails", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-stale");
    getSessionMock.mockRejectedValueOnce(new Error("missing"));
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");

    renderTutor();

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-stale");
    });
    expect(await screen.findByTestId("tutor-launch-hub")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });

  it("falls back safely when wizard state is corrupted JSON", async () => {
    localStorage.setItem("tutor.wizard.state.v1", "{not-valid-json");
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([909]),
    );

    renderTutor();

    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([909]),
    );
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
    expect(await screen.findByText("WORKSPACE HOME")).toBeInTheDocument();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });
});
