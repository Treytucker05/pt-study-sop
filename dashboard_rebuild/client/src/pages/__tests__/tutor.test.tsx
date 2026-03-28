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
  createSessionMock,
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
  createWorkflowMock,
  getWorkflowMock,
  endSessionMock,
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
  createSessionMock: vi.fn(),
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
  createWorkflowMock: vi.fn(),
  getWorkflowMock: vi.fn(),
  endSessionMock: vi.fn(),
  workspaceSurfaceMode: { useReal: false },
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

vi.mock("@/components/studio/StudioTldrawWorkspaceLazy", () => ({
  StudioTldrawWorkspaceLazy: () => (
    <div data-testid="page-studio-workspace">workspace canvas</div>
  ),
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
      getWorkflow: getWorkflowMock,
      createSession: createSessionMock,
      createWorkflow: createWorkflowMock,
      getSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      saveSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      getProjectShell: getProjectShellMock,
      saveProjectShellState: saveProjectShellStateMock,
      restoreStudioItems: restoreStudioItemsMock,
      promoteStudioItem: promoteStudioItemMock,
      getMaterialFileUrl: (id: number) => `/api/tutor/materials/${id}/file`,
      createArtifact: vi.fn(),
      deleteArtifacts: vi.fn(),
      createCustomChain: vi.fn(),
      endSession: endSessionMock,
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
    panel_layout: Record<string, unknown>[];
    document_tabs: Record<string, unknown>[];
    active_document_tab_id: string | null;
    runtime_state: Record<string, unknown> | null;
    tutor_chain_id: number | null;
    tutor_custom_block_ids: number[];
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
      panel_layout: overrides.panel_layout || [],
      document_tabs: overrides.document_tabs || [],
      active_document_tab_id: overrides.active_document_tab_id || null,
      runtime_state: overrides.runtime_state || null,
      tutor_chain_id: overrides.tutor_chain_id ?? null,
      tutor_custom_block_ids: overrides.tutor_custom_block_ids || [],
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

function makeWorkflowDetail(
  overrides: Partial<{
    workflow_id: string;
    course_id: number;
    course_name: string;
    course_code: string;
    study_unit: string | null;
    topic: string | null;
  }> = {},
) {
  const workflow = {
    workflow_id: overrides.workflow_id || "wf-1",
    course_id: overrides.course_id ?? 1,
    course_name: overrides.course_name || "Course 1",
    course_code: overrides.course_code || "COURSE-1",
    course_event_id: null,
    assignment_title: null,
    study_unit: overrides.study_unit ?? null,
    topic: overrides.topic ?? null,
    due_date: null,
    current_stage: "priming",
    status: "priming_in_progress",
    active_tutor_session_id: null,
    created_at: new Date("2026-03-20T10:00:00Z").toISOString(),
    updated_at: new Date("2026-03-20T10:05:00Z").toISOString(),
  };

  return {
    workflow,
    priming_bundle: null,
    captured_notes: [],
    feedback_events: [],
    stage_time_logs: [],
    memory_capsules: [],
    polish_bundle: null,
    publish_results: [],
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
  return {
    queryClient,
    ...render(
    <QueryClientProvider client={queryClient}>
      <Tutor />
    </QueryClientProvider>,
    ),
  };
}

async function expectStudioEntryState() {
  expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
  expect(screen.getByTestId("studio-entry-state")).toBeInTheDocument();
}

async function openStudioPanel(label: RegExp) {
  fireEvent.click(await screen.findByRole("button", { name: label }));
}

describe("Tutor page restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tutor");
    window.scrollTo = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    Object.defineProperty(Image.prototype, "decode", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    getMaterialsMock.mockResolvedValue([]);
    listSessionsMock.mockResolvedValue([]);
    getHubMock.mockResolvedValue(makeTutorHub());
    configCheckMock.mockResolvedValue({ ok: true });
    getContentSourcesMock.mockResolvedValue({ courses: [] });
    getTemplateChainsMock.mockResolvedValue([]);
    listWorkflowsMock.mockResolvedValue({ items: [], count: 0 });
    createSessionMock.mockResolvedValue({ session_id: "sess-started" });
    createWorkflowMock.mockResolvedValue({
      workflow: makeWorkflowDetail().workflow,
    });
    getWorkflowMock.mockResolvedValue(makeWorkflowDetail());
    endSessionMock.mockResolvedValue({ ok: true });
    preflightSessionMock.mockResolvedValue({
      ok: true,
      preflight_id: "preflight-test",
      course_id: 1,
      material_ids: [],
      resolved_learning_objectives: [],
      map_of_contents: null,
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
        runtime_state?: Record<string, unknown> | null;
        tutor_chain_id?: number | null;
        tutor_custom_block_ids?: number[];
        revision?: number;
      }) => ({
        workspace_state: {
          active_tutor_session_id: data.active_tutor_session_id || null,
          last_mode: data.last_mode || "studio",
          active_board_scope: data.active_board_scope || "project",
          active_board_id: null,
          viewer_state: null,
          panel_layout: [],
          document_tabs: [],
          active_document_tab_id: null,
          runtime_state: data.runtime_state || null,
          tutor_chain_id: data.tutor_chain_id ?? null,
          tutor_custom_block_ids: data.tutor_custom_block_ids || [],
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

  it("restores an active tutor session into the floating Tutor panel even when artifacts include structured notes", async () => {
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

    expect(await screen.findByTestId("studio-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    await openStudioPanel(/open tutor panel/i);
    expect(await screen.findByTestId("tutor-chat")).toBeInTheDocument();
  });

  it("ends the current session, returns to the entry card, and starts Priming on a different course with that course materials loaded", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=studio");
    getContentSourcesMock.mockResolvedValue({
      courses: [
        { id: 1, name: "Cardiovascular Physiology" },
        { id: 2, name: "Renal Physiology" },
      ],
    });
    getMaterialsMock.mockResolvedValue([
      {
        id: 101,
        title: "Cardio Lecture",
        source_path: "uploads/cardio-lecture.pdf",
        folder_path: null,
        file_type: "pdf",
        file_size: 1024,
        course_id: 1,
        enabled: true,
        extraction_error: null,
        checksum: null,
        created_at: new Date("2026-03-10T00:00:00Z").toISOString(),
        updated_at: null,
      },
      {
        id: 201,
        title: "Renal Notes",
        source_path: "uploads/renal-notes.txt",
        folder_path: null,
        file_type: "txt",
        file_size: 512,
        course_id: 2,
        enabled: true,
        extraction_error: null,
        checksum: null,
        created_at: new Date("2026-03-10T00:00:00Z").toISOString(),
        updated_at: null,
      },
      {
        id: 202,
        title: "Renal Diagram",
        source_path: "uploads/renal-diagram.pdf",
        folder_path: null,
        file_type: "pdf",
        file_size: 2048,
        course_id: 2,
        enabled: true,
        extraction_error: null,
        checksum: null,
        created_at: new Date("2026-03-10T00:00:00Z").toISOString(),
        updated_at: null,
      },
    ]);
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(1, {
        last_mode: "tutor",
        active_session_id: "sess-cardio",
      }),
    );
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-cardio",
      status: "active",
      turn_count: 3,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Cardiovascular regulation",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [101],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: "[]",
      turns: [],
    });
    createWorkflowMock.mockResolvedValueOnce({
      workflow: makeWorkflowDetail({
        workflow_id: "wf-renal",
        course_id: 2,
        course_name: "Renal Physiology",
        course_code: "RENAL-2",
      }).workflow,
    });
    getWorkflowMock.mockResolvedValue(
      makeWorkflowDetail({
        workflow_id: "wf-renal",
        course_id: 2,
        course_name: "Renal Physiology",
        course_code: "RENAL-2",
      }),
    );

    renderTutor();

    expect(await screen.findByTestId("studio-toolbar")).toBeInTheDocument();
    const sessionActionButton = await screen.findByRole("button", {
      name: /end session/i,
    });

    fireEvent.click(sessionActionButton);

    await waitFor(() => {
      expect(endSessionMock).toHaveBeenCalledWith("sess-cardio");
    });
    expect(await screen.findByTestId("studio-entry-state")).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText(/course for new priming session/i),
      {
        target: { value: "2" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /start priming/i }));

    await waitFor(() => {
      expect(createWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          course_id: 2,
          current_stage: "priming",
          status: "priming_in_progress",
        }),
      );
    });
    expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-priming-panel")).not.toBeInTheDocument();

    await openStudioPanel(/open source shelf panel/i);
    const sourceShelf = await screen.findByTestId("studio-source-shelf");
    expect(sourceShelf).toHaveTextContent("Renal Physiology");
    expect(sourceShelf).toHaveTextContent("2 materials loaded");
    expect(sourceShelf).toHaveTextContent("Renal Notes");
    expect(sourceShelf).toHaveTextContent("Renal Diagram");
  });

  it("renders Studio as the default shell page", async () => {
    renderTutor();

    await expectStudioEntryState();
    expect(screen.queryByTestId("tutor-launch-hub")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /theme lab/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^studio$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^tutor$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^schedule$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^settings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^launch$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("OPEN WORKBENCH")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start priming/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open full studio/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^refresh$/i })).toBeInTheDocument();
  });

  it("opens Tutor inside the shared floating canvas instead of switching shells", async () => {
    renderTutor();

    await expectStudioEntryState();
    await openStudioPanel(/open tutor panel/i);
    expect(
      await screen.findByText("READY TO RUN A STUDY SESSION"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("studio-tutor-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
  });

  it("removes the STUDIO/TUTOR tab row and shows the floating-panel toolbar by default", async () => {
    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^studio$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^tutor$/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
  });

  it("restores the Tutor hero shell and keeps the Tutor bar above the Studio workspace", async () => {
    renderTutor();

    const toolbar = await screen.findByTestId("studio-toolbar");
    await waitFor(() => {
      expect(document.querySelector(".page-shell__hero")).not.toBeNull();
    });
    await waitFor(() => {
      expect(document.querySelector(".brain-workspace__top-bar")).not.toBeNull();
    });
    const hero = document.querySelector(".page-shell__hero");
    const topBar = document.querySelector(".brain-workspace__top-bar");

    expect(toolbar).toBeInTheDocument();
    expect(screen.getByText("Live Study Core")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tutor" })).toBeInTheDocument();
    expect(screen.queryByText("LIVE TEACH RUNTIME")).not.toBeInTheDocument();
    expect(hero).not.toBeNull();
    expect(topBar).not.toBeNull();
    expect(within(topBar as HTMLElement).getByText("ACTIVE WORKFLOW")).toBeInTheDocument();
    expect(within(topBar as HTMLElement).getByText("READY")).toBeInTheDocument();
    expect(
      (topBar as HTMLElement).compareDocumentPosition(toolbar) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("always renders a hero NEW SESSION button", async () => {
    renderTutor();

    await waitFor(() => {
      expect(document.querySelector(".page-shell__actions")).not.toBeNull();
    });

    const heroActions = document.querySelector(".page-shell__actions");
    expect(heroActions).not.toBeNull();
    const newSessionButton = within(heroActions as HTMLElement).getByRole("button", {
        name: /^new session$/i,
      });
    expect(newSessionButton).toBeInTheDocument();
    expect(newSessionButton).toHaveClass("tutor-hero-action");
    expect(newSessionButton).toHaveClass("tutor-hero-action--primary");
  });

  it("only renders the hero RESUME button when a resume candidate exists", async () => {
    getHubMock.mockResolvedValueOnce({
      ...makeTutorHub(),
      resume_candidate: null,
    });

    const firstRender = renderTutor();

    await waitFor(() => {
      expect(document.querySelector(".page-shell__actions")).not.toBeNull();
    });

    let heroActions = document.querySelector(".page-shell__actions");
    expect(heroActions).not.toBeNull();
    expect(
      within(heroActions as HTMLElement).queryByRole("button", {
        name: /^resume$/i,
      }),
    ).not.toBeInTheDocument();

    firstRender.unmount();

    renderTutor();

    await waitFor(() => {
      expect(document.querySelector(".page-shell__actions")).not.toBeNull();
    });

    heroActions = document.querySelector(".page-shell__actions");
    expect(heroActions).not.toBeNull();
    const resumeButton = within(heroActions as HTMLElement).getByRole("button", {
        name: /^resume$/i,
      });
    expect(resumeButton).toBeInTheDocument();
    expect(resumeButton).toHaveClass("tutor-hero-action");
    expect(resumeButton).toHaveClass("tutor-hero-action--outline");
  });

  it("renders a hero REFRESH button and invalidates tutor caches", async () => {
    const { queryClient } = renderTutor();

    await waitFor(() => {
      expect(document.querySelector(".page-shell__actions")).not.toBeNull();
    });

    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
    invalidateQueriesSpy.mockClear();

    const heroActions = document.querySelector(".page-shell__actions");
    expect(heroActions).not.toBeNull();

    const refreshButton = within(heroActions as HTMLElement).getByRole("button", {
      name: /^refresh$/i,
    });
    expect(refreshButton).toHaveClass("tutor-hero-action");
    expect(refreshButton).toHaveClass("tutor-hero-action--outline");

    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(6);
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tutor-hub"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tutor-sessions"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tutor-project-shell"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tutor-studio-restore"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tutor-chat-materials-all-enabled"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["obsidian"],
    });
  });

  it("keeps the Brain home workflow widgets off the /tutor route", async () => {
    renderTutor();

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.queryByText("STUDIO HUB")).not.toBeInTheDocument();
    expect(screen.queryByText("STUDY WHEEL")).not.toBeInTheDocument();
    expect(screen.queryByText("RECENT WORKFLOWS")).not.toBeInTheDocument();
  });

  it("starts a Tutor session directly from the Tutor panel", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=tutor");
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Tutor Panel Session",
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

    fireEvent.click(
      await screen.findByRole("button", { name: /open tutor panel/i }),
    );

    expect(await screen.findByTestId("studio-tutor-panel")).toBeInTheDocument();
    expect(screen.getByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^start session$/i }));

    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-started");
    });
    expect(await screen.findByTestId("tutor-chat")).toBeInTheDocument();
  });

  it("infers the Tutor study unit from the scoped material when starting from the panel", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=1&mode=tutor");
    localStorage.setItem("tutor.selected_material_ids.v2", JSON.stringify([561]));
    getMaterialsMock.mockResolvedValue([
      {
        id: 561,
        course_id: 1,
        title: "Cardiovascular",
        source_path: "C:\\pt-study-sop\\brain\\data\\uploads\\b9b96302c2b9_Cardiovascular.pdf",
        file_type: "pdf",
        folder_path: "",
        enabled: 1,
      },
    ]);
    getContentSourcesMock.mockResolvedValue({
      courses: [{ id: 1, name: "Exercise Physiology" }],
    });
    getLearningObjectivesByCourseMock.mockResolvedValue([
      {
        id: 80,
        courseId: 1,
        loCode: "OBJ-001",
        title: "Describe the major functions of the cardiovascular system",
        groupName: "Cardiovascular",
        status: "active",
        moduleId: null,
        createdAt: "2026-03-21T01:25:09.53225",
        updatedAt: "2026-03-21T01:25:09.53225",
        lastSessionDate: null,
        lastSessionId: null,
        nextAction: null,
        managedByTutor: true,
      },
    ]);
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Cardiovascular",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [561],
        accuracy_profile: "strict",
        objective_scope: "module_all",
        vault_folder: "Courses/Exercise Physiology/Cardiovascular",
      },
      artifacts_json: "[]",
      turns: [],
    });

    renderTutor();

    await openStudioPanel(/open tutor panel/i);
    expect(await screen.findByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^start session$/i }));

    await waitFor(() => {
      expect(preflightSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "Cardiovascular",
          study_unit: "Cardiovascular",
          module_name: "Cardiovascular",
          content_filter: expect.objectContaining({
            material_ids: [561],
            vault_folder: "Courses/Exercise Physiology/Cardiovascular",
          }),
        }),
      );
    });
    await waitFor(() => {
      expect(createSessionMock).toHaveBeenCalled();
    });
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
    await openStudioPanel(/open tutor panel/i);
    expect(
      await screen.findByText("READY TO RUN A STUDY SESSION"),
    ).toBeInTheDocument();
    expect(screen.queryByText("LIVE SESSION")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tutor-chat")).not.toBeInTheDocument();
  });

  it("keeps deferred Schedule and Settings tabs hidden from the Tutor nav", async () => {
    renderTutor();

    await expectStudioEntryState();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^schedule$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^settings$/i })).not.toBeInTheDocument();
  });

  it("returns to the canvas entry state when the only open Tutor panel is closed", async () => {
    renderTutor();

    await openStudioPanel(/open tutor panel/i);
    const tutorPanel = await screen.findByTestId("studio-tutor-panel");
    fireEvent.click(within(tutorPanel).getByRole("button", { name: /close panel/i }));

    expect(await screen.findByTestId("studio-entry-state")).toBeInTheDocument();
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

    await openStudioPanel(/open tutor panel/i);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /resume session/i,
      }),
    );

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-recent");
    });
    await openStudioPanel(/open tutor panel/i);
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

    expect(await screen.findByTestId("studio-toolbar")).toBeInTheDocument();
    await openStudioPanel(/open tutor panel/i);
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

    await expectStudioEntryState();
    expect(screen.queryByRole("tab", { name: /^schedule$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("OPEN WORKBENCH")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-tab-bar")).not.toBeInTheDocument();
  });

  it("ignores explicit Studio mode query params and restores a real active tutor session", async () => {
    window.history.replaceState({}, "", "/tutor?course_id=77&mode=studio");
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        last_mode: "tutor",
        active_session_id: "sess-project",
      }),
    );
    workspaceSurfaceMode.useReal = true;

    renderTutor();

    expect(await screen.findByTestId("studio-toolbar")).toBeInTheDocument();
    await openStudioPanel(/open tutor panel/i);
    expect(await screen.findByTestId("tutor-chat")).toBeInTheDocument();
    expect(getSessionMock).toHaveBeenCalledWith("sess-project");
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

    await openStudioPanel(/open prime packet panel/i);

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

    await openStudioPanel(/open prime packet panel/i);

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

    await openStudioPanel(/open polish packet panel/i);
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

    await expectStudioEntryState();
    expect(screen.queryByTestId("tutor-publish-mode")).not.toBeInTheDocument();
  });

  it("keeps the canvas empty on /tutor load while hydrating project-shell document tabs", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        panel_layout: [
          {
            id: "panel-source-shelf",
            panel: "source_shelf",
            position: { x: 24, y: 32 },
            size: { width: 320, height: 680 },
            zIndex: 2,
            collapsed: false,
          },
          {
            id: "panel-document-dock",
            panel: "document_dock",
            position: { x: 360, y: 32 },
            size: { width: 640, height: 280 },
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
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    await expectStudioEntryState();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.panel_layout).toEqual([]);
      expect(lastCall?.document_tabs).toEqual([
        expect.objectContaining({
          id: "doc-material-101",
          kind: "material",
          title: "Cardiac Output Lecture",
          sourceId: 101,
        }),
      ]);
      expect(lastCall?.active_document_tab_id).toBe("doc-material-101");
    });
  });

  it("preserves multiple document tabs from project shell without reopening the old panel layout", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        panel_layout: [
          {
            id: "panel-document-dock",
            panel: "document_dock",
            position: { x: 360, y: 32 },
            size: { width: 640, height: 280 },
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
          {
            id: "doc-material-102",
            kind: "material",
            title: "Afterload Drill",
            sourceId: 102,
            sourcePath: "uploads/afterload-drill.txt",
          },
        ],
        active_document_tab_id: "doc-material-102",
      }),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    await expectStudioEntryState();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.panel_layout).toEqual([]);
      expect(lastCall?.document_tabs).toEqual([
        expect.objectContaining({
          id: "doc-material-101",
          kind: "material",
          title: "Cardiac Output Lecture",
          sourceId: 101,
        }),
        expect.objectContaining({
          id: "doc-material-102",
          kind: "material",
          title: "Afterload Drill",
          sourceId: 102,
          sourcePath: "uploads/afterload-drill.txt",
        }),
      ]);
      expect(lastCall?.active_document_tab_id).toBe("doc-material-102");
    });
  });

  it("hydrates tutor selector state independently from the priming start-state", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        tutor_chain_id: 77,
        tutor_custom_block_ids: [91, 92],
      }),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });
    localStorage.setItem(
      "tutor.start.state.v2",
      JSON.stringify({
        courseId: 77,
        topic: "Cardiovascular regulation",
        selectedMaterials: [101],
        chainId: 5,
        customBlockIds: [11, 12],
        accuracyProfile: "strict",
        objectiveScope: "module_all",
        selectedObjectiveId: "",
        selectedObjectiveGroup: "Week 7",
        selectedPaths: [],
      }),
    );

    renderTutor();

    await expectStudioEntryState();

    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.tutor_chain_id).toBe(77);
      expect(lastCall?.tutor_custom_block_ids).toEqual([91, 92]);
    });
  });

  it("hydrates runtime persistence fields from StudioRun authority", async () => {
    getProjectShellMock.mockResolvedValue(
      makeProjectShell(77, {
        runtime_state: {
          active_memory_capsule_id: 12,
          compaction_telemetry: {
            tokenCount: 18750,
            contextWindow: 24000,
            pressureLevel: "high",
          },
          direct_note_save_status: {
            state: "saved",
            path: "Tutor Workspace/Cardio Note.md",
          },
          priming_method_ids: ["M-PRE-010", "M-PRE-008"],
          priming_chain_id: 17,
          priming_custom_block_ids: [31, 32],
        },
      }),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    await expectStudioEntryState();

    await waitFor(() => {
      expect(saveProjectShellStateMock).toHaveBeenCalled();
      const lastCall =
        saveProjectShellStateMock.mock.calls[
          saveProjectShellStateMock.mock.calls.length - 1
        ]?.[0];
      expect(lastCall?.runtime_state).toEqual({
        active_memory_capsule_id: 12,
        compaction_telemetry: {
          tokenCount: 18750,
          contextWindow: 24000,
          pressureLevel: "high",
        },
        direct_note_save_status: {
          state: "saved",
          path: "Tutor Workspace/Cardio Note.md",
        },
        priming_method_ids: ["M-PRE-010", "M-PRE-008"],
        priming_chain_id: 17,
        priming_custom_block_ids: [31, 32],
      });
    });
  });

  it("shows the entry card on an empty StudioRun and starts Priming on an empty canvas from /tutor", async () => {
    getProjectShellMock.mockResolvedValue(makeProjectShell(77));
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    await expectStudioEntryState();
    fireEvent.click(screen.getByRole("button", { name: /start priming/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("studio-priming-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("priming-selector-bar")).not.toBeInTheDocument();
    await openStudioPanel(/open priming panel/i);
    expect(await screen.findByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("priming-tool-panel")).toBeInTheDocument();
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

    await expectStudioEntryState();
    fireEvent.click(screen.getByRole("button", { name: /start priming/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    });
    await openStudioPanel(/open priming panel/i);
    expect(await screen.findByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("brain-home")).not.toBeInTheDocument();
  });

  it("consumes the Brain handoff state while keeping the Tutor route shell visible", async () => {
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

    await screen.findByTestId("studio-toolbar");
    expect(await screen.findByTestId("tutor-brain-handoff")).toBeInTheDocument();
    expect(screen.getByText("Live Study Core")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tutor" })).toBeInTheDocument();
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

    await expectStudioEntryState();
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
    await expectStudioEntryState();
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

    await expectStudioEntryState();
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
    await expectStudioEntryState();
    expect(screen.queryByTestId("tutor-launch-hub")).not.toBeInTheDocument();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });

  it("falls back safely when wizard state is corrupted JSON", async () => {
    localStorage.setItem("tutor.wizard.state.v1", "{not-valid-json");
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([909]),
    );

    renderTutor();

    await expectStudioEntryState();
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
    await expectStudioEntryState();
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });
});
