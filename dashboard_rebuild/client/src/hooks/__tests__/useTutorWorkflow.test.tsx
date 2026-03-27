import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorWorkflow } from "@/hooks/useTutorWorkflow";
import type { TutorWorkflowDetailResponse, TutorWorkflowSummary } from "@/lib/api";

const listWorkflowsMock = vi.fn();
const getWorkflowMock = vi.fn();
const deleteWorkflowMock = vi.fn();
const createWorkflowMock = vi.fn();
const savePrimingBundleMock = vi.fn();
const updateWorkflowStageMock = vi.fn();
const runPrimingAssistMock = vi.fn();
const captureWorkflowNoteMock = vi.fn();
const saveWorkflowFeedbackMock = vi.fn();
const createMemoryCapsuleMock = vi.fn();
const saveObsidianFileMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      listWorkflows: (...args: unknown[]) => listWorkflowsMock(...args),
      getWorkflow: (...args: unknown[]) => getWorkflowMock(...args),
      deleteWorkflow: (...args: unknown[]) => deleteWorkflowMock(...args),
      createWorkflow: (...args: unknown[]) => createWorkflowMock(...args),
      savePrimingBundle: (...args: unknown[]) => savePrimingBundleMock(...args),
      updateWorkflowStage: (...args: unknown[]) => updateWorkflowStageMock(...args),
      runPrimingAssist: (...args: unknown[]) => runPrimingAssistMock(...args),
      savePolishBundle: vi.fn(),
      captureWorkflowNote: (...args: unknown[]) => captureWorkflowNoteMock(...args),
      saveWorkflowFeedback: (...args: unknown[]) => saveWorkflowFeedbackMock(...args),
      createMemoryCapsule: (...args: unknown[]) => createMemoryCapsuleMock(...args),
    },
    obsidian: {
      saveFile: (...args: unknown[]) => saveObsidianFileMock(...args),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const workflowFixture: TutorWorkflowSummary = {
  workflow_id: "wf-1",
  course_id: 101,
  course_name: "Exercise Physiology",
  course_code: "EPHY-101",
  course_event_id: null,
  assignment_title: "Week 7 Study Plan",
  study_unit: "Week 7",
  topic: "Cardiovascular regulation",
  due_date: "2026-03-28T00:00:00Z",
  current_stage: "priming",
  status: "priming_in_progress",
  active_tutor_session_id: "sess-1",
  created_at: "2026-03-20T10:00:00Z",
  updated_at: "2026-03-20T11:00:00Z",
};

const workflowDetailFixture: TutorWorkflowDetailResponse = {
  workflow: workflowFixture,
  priming_bundle: null,
  captured_notes: [],
  feedback_events: [],
  stage_time_logs: [],
  memory_capsules: [],
  polish_bundle: null,
  publish_results: [],
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createHubMock() {
  return {
    courseId: undefined,
    topic: "",
    selectedMaterials: [],
    selectedPaths: [],
    selectedObjectiveGroup: "",
    selectedObjectiveId: "",
    objectiveScope: "module_all",
    scopedObjectives: [],
    chatMaterials: [],
    setCourseId: vi.fn(),
    setTopic: vi.fn(),
    setSelectedMaterials: vi.fn(),
    setSelectedPaths: vi.fn(),
    setVaultFolder: vi.fn(),
    setSelectedObjectiveGroup: vi.fn(),
    setSelectedObjectiveId: vi.fn(),
    setObjectiveScope: vi.fn(),
  };
}

function createSessionMock() {
  return {
    startSession: vi.fn(),
    resumeSession: vi.fn(),
    clearActiveSessionState: vi.fn(),
    checkpointWorkflowStudyTimer: vi.fn().mockResolvedValue(90),
    artifacts: [],
    latestCommittedAssistantMessage: null,
    activeContentFilter: null,
  };
}

describe("useTutorWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkflowsMock.mockResolvedValue({ items: [workflowFixture], count: 1 });
    getWorkflowMock.mockResolvedValue(workflowDetailFixture);
    createWorkflowMock.mockResolvedValue({
      workflow: {
        workflow_id: "wf-new",
        current_stage: "priming",
        status: "priming_in_progress",
      },
    });
    deleteWorkflowMock.mockResolvedValue({
      deleted: true,
      workflow_id: workflowFixture.workflow_id,
      related_records_deleted: {
        publish_results: 0,
        polish_bundles: 0,
        memory_capsules: 0,
        stage_time_logs: 0,
        feedback_events: 0,
        captured_notes: 0,
        priming_bundles: 0,
      },
    });
    savePrimingBundleMock.mockResolvedValue({ priming_bundle: null });
    updateWorkflowStageMock.mockResolvedValue({ ok: true });
    runPrimingAssistMock.mockResolvedValue({
      source_inventory: [],
      priming_method_runs: [],
      aggregate: {
        summaries: [],
        concepts: [],
        terminology: [],
        root_explanations: [],
        identified_gaps: [],
        learning_objectives: [],
      },
    });
    captureWorkflowNoteMock.mockResolvedValue({ note: { id: 1 } });
    saveWorkflowFeedbackMock.mockResolvedValue({ feedback_event: { id: 1 } });
    createMemoryCapsuleMock.mockResolvedValue({ memory_capsule: { id: 1 } });
    saveObsidianFileMock.mockResolvedValue({ success: true, path: "Courses/Exercise Physiology/Tutor Notes/Week 7/Exact - Cardiac output.md" });
  });

  it("clears the active workflow when the open workflow is deleted", async () => {
    const hub = createHubMock();
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: "sess-1",
          shellMode: "studio",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(listWorkflowsMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
    });

    await waitFor(() => {
      expect(getWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    });

    await act(async () => {
      await result.current.deleteWorkflowRecord(workflowFixture);
    });

    expect(deleteWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    expect(result.current.activeWorkflowId).toBeNull();
    expect(session.clearActiveSessionState).toHaveBeenCalled();
    expect(hub.setSelectedMaterials).toHaveBeenCalledWith([]);
    expect(toastSuccessMock).toHaveBeenCalledWith("Study plan deleted");
  });

  it("saves extracted PRIME objectives into the workflow bundle when no approved objectives exist yet", async () => {
    const hub = {
      ...createHubMock(),
      courseId: 101,
      selectedMaterials: [101],
      selectedObjectiveGroup: "Week 7",
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    getWorkflowMock.mockResolvedValue({
      ...workflowDetailFixture,
      priming_bundle: {
        id: 1,
        workflow_id: workflowFixture.workflow_id,
        course_id: 101,
        study_unit: "Week 7",
        topic: "Cardiovascular regulation",
        selected_material_ids: [101],
        selected_paths: [],
        source_inventory: [
          {
            id: 101,
            title: "Week 7 Deck",
            priming_output: {
              material_id: 101,
              title: "Week 7 Deck",
              concepts: [],
              terminology: [],
              gaps: [],
              learning_objectives: [
                { lo_code: "OBJ-1", title: "Explain cardiac output" },
                { lo_code: "OBJ-1", title: "Explain cardiac output" },
                { title: "Describe preload vs afterload" },
              ],
            },
          },
        ],
        priming_methods: ["M-PRE-010"],
        priming_method: "M-PRE-010",
        priming_method_runs: [],
        learning_objectives: [],
        concepts: [{ concept: "Cardiac output" }],
        concept_graph: {},
        terminology: [{ term: "Cardiac output" }],
        root_explanations: [{ text: "Hierarchy" }],
        summaries: [{ summary: "Summary" }],
        identified_gaps: [],
        confidence_flags: {},
        readiness_status: "draft",
        readiness_blockers: [],
        recommended_tutor_strategy: {},
        created_at: "2026-03-20T11:00:00Z",
        updated_at: "2026-03-20T11:10:00Z",
      },
      workflow: { ...workflowFixture, study_unit: "Week 7" },
    });

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          shellMode: "studio",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(listWorkflowsMock).toHaveBeenCalled();
    });

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
    });

    await waitFor(() => {
      expect(getWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    });

    await waitFor(() => {
      expect(result.current.mergedPrimingSourceInventory).toHaveLength(1);
    });

    await act(async () => {
      await result.current.saveWorkflowPriming("draft");
    });

    expect(savePrimingBundleMock).toHaveBeenCalledWith(
      workflowFixture.workflow_id,
      expect.objectContaining({
        priming_methods: ["M-PRE-010"],
        priming_method: "M-PRE-010",
        learning_objectives: [
          {
            lo_code: "OBJ-1",
            title: "Explain cardiac output",
            status: "active",
            group: "Week 7",
          },
          {
            title: "Describe preload vs afterload",
            status: "active",
            group: "Week 7",
          },
        ],
      }),
    );
  });

  it("treats approved study-unit objectives as readiness evidence without relying on single-focus scope", async () => {
    const hub = {
      ...createHubMock(),
      selectedObjectiveGroup: "Week 7",
      scopedObjectives: [
        {
          id: "obj-1",
          loCode: "OBJ-1",
          title: "Explain cardiac output",
          status: "active",
          groupName: "Week 7",
        },
      ],
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          shellMode: "studio",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(listWorkflowsMock).toHaveBeenCalled();
    });

    expect(result.current.primingReadinessItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Learning objectives captured",
          ready: true,
          detail: expect.stringContaining("approved objective"),
        }),
      ]),
    );
  });

  it("bootstraps Studio priming once and prevents duplicate workflow creation on repeated clicks", async () => {
    let resolveCreateWorkflow: ((value: { workflow: { workflow_id: string; current_stage: string; status: string } }) => void) | null = null;
    createWorkflowMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreateWorkflow = resolve;
        }),
    );
    getWorkflowMock.mockResolvedValue({
      ...workflowDetailFixture,
      workflow: {
        ...workflowFixture,
        workflow_id: "wf-studio",
        course_id: null,
        topic: null,
        study_unit: null,
      },
      priming_bundle: null,
    });

    const hub = {
      ...createHubMock(),
      courseId: 101,
      topic: "Cardiac output",
      selectedMaterials: [501],
      selectedObjectiveGroup: "Week 7",
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          hasRestored: true,
        }),
      { wrapper },
    );

    let firstPromise: Promise<string | null> | null = null;
    let secondPromise: Promise<string | null> | null = null;

    await act(async () => {
      firstPromise = result.current.openStudioPriming();
      secondPromise = result.current.openStudioPriming();
    });

    expect(createWorkflowMock).toHaveBeenCalledTimes(1);
    expect(createWorkflowMock).toHaveBeenCalledWith({
      course_id: 101,
      study_unit: "Week 7",
      topic: "Cardiac output",
      current_stage: "priming",
      status: "priming_in_progress",
    });
    expect(result.current.bootstrappingPriming).toBe(true);
    expect(secondPromise).not.toBeNull();
    await expect(secondPromise).resolves.toBeNull();

    await act(async () => {
      resolveCreateWorkflow?.({
        workflow: {
          workflow_id: "wf-studio",
          current_stage: "priming",
          status: "priming_in_progress",
        },
      });
      await firstPromise;
    });

    expect(result.current.activeWorkflowId).toBe("wf-studio");
    expect(result.current.bootstrappingPriming).toBe(false);
    expect(toastSuccessMock).toHaveBeenCalledWith("Priming workspace ready");
    await waitFor(() => {
      expect(getWorkflowMock).toHaveBeenCalledWith("wf-studio");
    });
    expect(hub.setCourseId).toHaveBeenCalledWith(101);
    expect(hub.setSelectedMaterials).toHaveBeenCalledWith([501]);
    expect(hub.setSelectedObjectiveGroup).toHaveBeenCalledWith("Week 7");
  });

  it("bootstraps a Priming workflow automatically when RUN executes without an active workflow", async () => {
    const hub = {
      ...createHubMock(),
      courseId: 101,
      topic: "Cardiac output",
      selectedMaterials: [501],
      selectedObjectiveGroup: "Week 7",
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setPrimingMethods(["M-PRE-010"]);
    });

    await act(async () => {
      await result.current.runWorkflowPrimingAssist([501]);
    });

    expect(createWorkflowMock).toHaveBeenCalledWith({
      course_id: 101,
      study_unit: "Week 7",
      topic: "Cardiac output",
      current_stage: "priming",
      status: "priming_in_progress",
    });
    expect(runPrimingAssistMock).toHaveBeenCalledWith(
      "wf-new",
      expect.objectContaining({
        material_ids: [501],
        priming_methods: ["M-PRE-010"],
        priming_method: "M-PRE-010",
      }),
    );
  });

  it("checkpoints workflow study time after saving an exact tutor note", async () => {
    const hub = createHubMock();
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: "sess-1",
          shellMode: "tutor",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
      result.current.setExactNoteTitle("Cardiac output");
      result.current.setExactNoteContent("Stroke volume x heart rate");
    });

    await act(async () => {
      await result.current.saveWorkflowNoteCapture("exact");
    });

    expect(captureWorkflowNoteMock).toHaveBeenCalledWith(
      workflowFixture.workflow_id,
      expect.objectContaining({
        tutor_session_id: "sess-1",
        note_mode: "exact",
        stage: "tutor",
        status: "captured",
        title: "Cardiac output",
        content: "Stroke volume x heart rate",
      }),
    );
    expect(session.checkpointWorkflowStudyTimer).toHaveBeenCalledWith("manual_save", [
      { kind: "note_save", mode: "exact", tutor_session_id: "sess-1" },
    ]);
  });

  it("captures the current session rules inside a workflow memory capsule", async () => {
    const hub = createHubMock();
    const session = {
      ...createSessionMock(),
      activeContentFilter: {
        session_rules: [
          "Always force a function confirmation before L4 precision.",
          "Stay inside the assigned provenance boundary.",
        ],
      },
    };
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: "sess-1",
          shellMode: "tutor",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
      result.current.setMemorySummaryText("Learner still confuses preload with inotropy.");
    });

    await act(async () => {
      await result.current.createWorkflowMemoryCapsule();
    });

    expect(createMemoryCapsuleMock).toHaveBeenCalledWith(
      workflowFixture.workflow_id,
      expect.objectContaining({
        tutor_session_id: "sess-1",
        summary_text: "Learner still confuses preload with inotropy.",
        rule_snapshot_text:
          "Always force a function confirmation before L4 precision.\nStay inside the assigned provenance boundary.",
      }),
    );
  });

  it("writes a Tutor note directly to the vault without routing through Polish", async () => {
    const hub = createHubMock();
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: "sess-1",
          shellMode: "tutor",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
      result.current.setExactNoteTitle("Cardiac output");
      result.current.setExactNoteContent("Stroke volume x heart rate.");
    });

    await waitFor(() => {
      expect(getWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    });

    await act(async () => {
      await result.current.saveWorkflowNoteToVault("exact");
    });

    expect(saveObsidianFileMock).toHaveBeenCalledWith(
      expect.stringContaining("Courses/Exercise Physiology/Tutor Notes/Week 7 Study Plan/"),
      expect.stringContaining("Stroke volume x heart rate."),
    );
    expect(captureWorkflowNoteMock).not.toHaveBeenCalled();
    expect(session.checkpointWorkflowStudyTimer).toHaveBeenCalledWith("manual_save", [
      expect.objectContaining({
        kind: "note_vault_save",
        mode: "exact",
        tutor_session_id: "sess-1",
      }),
    ]);
  });

  it("forwards packet context when Priming Assist runs from the Studio packet", async () => {
    const hub = {
      ...createHubMock(),
      topic: "Cardiovascular regulation",
      selectedMaterials: [101],
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          shellMode: "studio",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
      result.current.setPrimingMethods(["summary_first"]);
    });

    await act(async () => {
      await result.current.runWorkflowPrimingAssist([101], {
        packet_context:
          "## Primed Artifacts\n- Misconception to repair :: Learner mixed preload effects with heart-rate regulation.",
      });
    });

    expect(runPrimingAssistMock).toHaveBeenCalledWith(
      workflowFixture.workflow_id,
      expect.objectContaining({
        material_ids: [101],
        packet_context:
          "## Primed Artifacts\n- Misconception to repair :: Learner mixed preload effects with heart-rate regulation.",
      }),
    );
  });

  it("forwards packet context when Tutor starts from the Studio packet", async () => {
    const hub = {
      ...createHubMock(),
      selectedMaterials: [101],
      selectedObjectiveGroup: "Week 7",
      scopedObjectives: [
        {
          id: "OBJ-1",
          loCode: "OBJ-1",
          title: "Explain cardiac output",
          status: "active",
          groupName: "Week 7",
        },
      ],
    };
    const session = createSessionMock();
    session.startSession.mockResolvedValue({ session_id: "sess-2" });
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: null,
          shellMode: "studio",
          setShellMode: vi.fn(),
          hasRestored: true,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setActiveWorkflowId(workflowFixture.workflow_id);
      result.current.setPrimingMethods(["summary_first"]);
    });

    await waitFor(() => {
      expect(result.current.activeWorkflowId).toBe(workflowFixture.workflow_id);
    });

    await act(async () => {
      await result.current.startTutorFromWorkflow({
        packet_context:
          "## Primed Artifacts\n- Misconception to repair :: Learner mixed preload effects with heart-rate regulation.",
      });
    });

    expect(session.startSession).toHaveBeenCalledWith({
      packet_context:
        "## Primed Artifacts\n- Misconception to repair :: Learner mixed preload effects with heart-rate regulation.",
    });
  });

  it("clears a stale live Tutor session when Studio opens a workflow from a different course", async () => {
    const hub = {
      ...createHubMock(),
      courseId: 101,
    };
    const session = createSessionMock();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useTutorWorkflow({
          hub: hub as never,
          session: session as never,
          activeSessionId: "sess-1",
          hasRestored: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(listWorkflowsMock).toHaveBeenCalled();
    });

    const crossCourseWorkflow: TutorWorkflowSummary = {
      ...workflowFixture,
      workflow_id: "wf-final-sync",
      course_id: 303,
      course_name: "Neuroscience",
      current_stage: "final_sync",
      status: "stored",
      active_tutor_session_id: null,
    };

    await act(async () => {
      await result.current.openWorkflowRecord(crossCourseWorkflow);
    });

    expect(session.clearActiveSessionState).toHaveBeenCalledTimes(1);
    expect(session.resumeSession).not.toHaveBeenCalled();
    expect(hub.setCourseId).toHaveBeenCalledWith(303);
    expect(result.current.activeWorkflowId).toBe("wf-final-sync");
  });
});
