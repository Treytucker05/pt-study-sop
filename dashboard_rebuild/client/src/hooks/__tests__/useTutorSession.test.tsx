import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorSession } from "@/hooks/useTutorSession";
import type { TutorWorkflowDetailResponse } from "@/lib/api";

const preflightSessionMock = vi.fn();
const configCheckMock = vi.fn();
const logWorkflowStageTimeMock = vi.fn();
const getProjectShellMock = vi.fn();
const restoreStudioItemsMock = vi.fn();
const getSessionMock = vi.fn();
const createSessionMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      preflightSession: (...args: unknown[]) => preflightSessionMock(...args),
      configCheck: (...args: unknown[]) => configCheckMock(...args),
      logWorkflowStageTime: (...args: unknown[]) => logWorkflowStageTimeMock(...args),
      getProjectShell: (...args: unknown[]) => getProjectShellMock(...args),
      restoreStudioItems: (...args: unknown[]) => restoreStudioItemsMock(...args),
      createCustomChain: vi.fn(),
      createSession: (...args: unknown[]) => createSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      deleteArtifacts: vi.fn(),
      advanceBlock: vi.fn(),
      createArtifact: vi.fn(),
      captureStudioItem: vi.fn(),
      saveStrategyFeedback: vi.fn(),
      endSession: vi.fn(),
      deleteSession: vi.fn(),
    },
    obsidian: {
      append: vi.fn(),
    },
  },
}));

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
    courseId: 1,
    effectiveTopic: "Cardiovascular regulation",
    effectiveStudyUnit: "Week 7",
    topic: "Cardiovascular regulation",
    selectedObjectiveGroup: "Week 7",
    selectedObjectiveId: "",
    objectiveScope: "module_all",
    scopedObjectives: [],
    selectedMaterials: [101],
    selectedPaths: [],
    derivedVaultFolder: "Courses/Exercise Phys/Week 7",
    accuracyProfile: "strict",
    chainId: undefined,
    customBlockIds: [],
    setTopic: vi.fn(),
    setCourseId: vi.fn(),
    setChainId: vi.fn(),
    setSelectedMaterials: vi.fn(),
    setAccuracyProfile: vi.fn(),
    setObjectiveScope: vi.fn(),
    setSelectedObjectiveId: vi.fn(),
    setSelectedObjectiveGroup: vi.fn(),
    setVaultFolder: vi.fn(),
  };
}

describe("useTutorSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preflightSessionMock.mockResolvedValue({
      ok: true,
      preflight_id: "preflight-1",
      course_id: 1,
      material_ids: [101],
      resolved_learning_objectives: [],
      map_of_contents: null,
      recommended_mode_flags: {
        materials: true,
        obsidian: true,
        gemini_vision: false,
        web_search: false,
        deep_think: false,
      },
      blockers: [],
    });
    configCheckMock.mockResolvedValue({ ok: true });
    logWorkflowStageTimeMock.mockResolvedValue({ ok: true });
    getProjectShellMock.mockResolvedValue({});
    restoreStudioItemsMock.mockResolvedValue({ items: [] });
    getSessionMock.mockReset();
    createSessionMock.mockReset();
    createSessionMock.mockResolvedValue({ session_id: "sess-started" });
  });

  it("uses carried-forward priming objectives in Tutor preflight when no approved objectives are loaded", () => {
    const wrapper = createWrapper();
    const hub = createHubMock();
    const activeWorkflowDetail: TutorWorkflowDetailResponse = {
      workflow: {
        workflow_id: "wf-1",
        course_id: 1,
        course_name: "Exercise Phys",
        course_code: "EXPH",
        course_event_id: null,
        assignment_title: "Week 7 Study Plan",
        study_unit: "Week 7",
        topic: "Cardiovascular regulation",
        due_date: null,
        current_stage: "priming",
        status: "priming_in_progress",
        active_tutor_session_id: null,
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:05:00Z",
      },
      priming_bundle: {
        id: 1,
        workflow_id: "wf-1",
        course_id: 1,
        study_unit: "Week 7",
        topic: "Cardiovascular regulation",
        selected_material_ids: [101],
        selected_paths: [],
        source_inventory: [],
        priming_methods: ["M-PRE-010"],
        priming_method: "M-PRE-010",
        priming_chain_id: null,
        priming_method_runs: [],
        learning_objectives: [
          { lo_code: "OBJ-1", title: "Explain cardiac output", status: "active", group: "Week 7" },
          { lo_code: "OBJ-1", title: "Explain cardiac output", status: "active", group: "Week 7" },
          { title: "Describe preload vs afterload", group: "Week 7" },
        ],
        concepts: [],
        concept_graph: {},
        terminology: [],
        root_explanations: [],
        summaries: [],
        identified_gaps: [],
        confidence_flags: {},
        readiness_status: "ready",
        readiness_blockers: [],
        recommended_tutor_strategy: {},
        created_at: "2026-03-20T12:00:00Z",
        updated_at: "2026-03-20T12:05:00Z",
      },
      captured_notes: [],
      feedback_events: [],
      stage_time_logs: [],
      memory_capsules: [],
      polish_bundle: null,
      publish_results: [],
    };

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: undefined,
          tutorCustomBlockIds: [],
          setTutorChainId: vi.fn(),
          setTutorCustomBlockIds: vi.fn(),
          activeSessionId: null,
          setActiveSessionId: vi.fn(),
          shellMode: "studio",
          studioView: "priming",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: false,
          activeWorkflowId: "wf-1",
          activeWorkflowDetail,
        }),
      { wrapper },
    );

    expect(result.current.preflightPayload).toMatchObject({
      course_id: 1,
      study_unit: "Week 7",
      learning_objectives: [
        {
          lo_code: "OBJ-1",
          title: "Explain cardiac output",
          status: "active",
          group: "Week 7",
        },
        {
          title: "Describe preload vs afterload",
          group: "Week 7",
        },
      ],
    });
  });

  it("checkpoints workflow study time on manual save without leaving the timer nullified", async () => {
    const wrapper = createWrapper();
    const hub = createHubMock();

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: undefined,
          tutorCustomBlockIds: [],
          setTutorChainId: vi.fn(),
          setTutorCustomBlockIds: vi.fn(),
          activeSessionId: "sess-1",
          setActiveSessionId: vi.fn(),
          shellMode: "tutor",
          studioView: "home",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: true,
          activeWorkflowId: "wf-1",
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.stageTimerRunning).toBe(true);
    });
    const initialStartedAt = result.current.stageTimerStartedAt;
    expect(initialStartedAt).toBeTruthy();

    vi.useFakeTimers();
    vi.setSystemTime(
      new Date(new Date(initialStartedAt!).getTime() + 120_000),
    );

    await act(async () => {
      const seconds = await result.current.checkpointWorkflowStudyTimer("manual_save", [
        { kind: "note_save" },
      ]);
      expect(seconds).toBe(120);
    });

    expect(logWorkflowStageTimeMock).toHaveBeenCalledWith(
      "wf-1",
      expect.objectContaining({
        trigger_source: "manual_save",
        seconds_active: 120,
        start_ts: initialStartedAt,
        stage: "tutor",
      }),
    );
    expect(result.current.stageTimerRunning).toBe(true);
    expect(result.current.stageTimerStartedAt).toBe(
      new Date(new Date(initialStartedAt!).getTime() + 120_000).toISOString(),
    );

    vi.useRealTimers();
  });

  it("hydrates restored session metadata and raw turns when resuming a session", async () => {
    const wrapper = createWrapper();
    const hub = createHubMock();
    const setActiveSessionId = vi.fn();
    const setShowSetup = vi.fn();
    const setRestoredTurns = vi.fn();
    const setTutorChainId = vi.fn();
    const setTutorCustomBlockIds = vi.fn();

    const restoredSession = {
      session_id: "sess-restore",
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
      scholar_strategy: null,
      strategy_feedback: null,
      artifacts_json: null,
      turn_count: 2,
      started_at: "2026-03-25T10:00:00Z",
      turns: [
        {
          id: 1,
          turn_number: 1,
          question: "How does preload affect stroke volume?",
          answer: "It increases stroke volume through ventricular stretch.",
          citations_json: null,
          phase: "first_pass",
          artifacts_json: null,
          verdict: {
            verdict: "partial",
            confidence: 0.72,
            why_wrong: "The answer omitted the Frank-Starling mechanism.",
          },
          teach_back_rubric: {
            overall_rating: "partial",
            accuracy_score: 0.6,
            breadth_score: 0.5,
            synthesis_score: 0.5,
            confidence: 0.7,
            misconceptions: ["The answer skipped ventricular stretch."],
          },
          created_at: "2026-03-25T10:01:00Z",
        },
        {
          id: 2,
          turn_number: 2,
          question: "How does heart rate affect cardiac output?",
          answer: "It changes cardiac output by changing beats per minute.",
          citations_json: null,
          phase: "first_pass",
          artifacts_json: null,
          verdict: {
            verdict: "partial",
            confidence: 0.8,
            why_wrong:
              "The answer treated heart-rate control as identical to preload regulation.",
            _validation_issues: ["Missing citation support for the rate-control claim."],
          },
          teach_back_rubric: null,
          created_at: "2026-03-25T10:02:00Z",
        },
      ],
    };

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: undefined,
          tutorCustomBlockIds: [],
          setTutorChainId,
          setTutorCustomBlockIds,
          activeSessionId: null,
          setActiveSessionId,
          setShowSetup,
          setRestoredTurns,
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      result.current.applySessionState(restoredSession as never);
    });

    expect(setShowSetup).toHaveBeenCalledWith(false);
    expect(hub.setTopic).toHaveBeenCalledWith("Cardiovascular regulation");
    expect(setTutorChainId).toHaveBeenCalledWith(undefined);
    expect(setTutorCustomBlockIds).toHaveBeenCalledWith([]);
    expect(setRestoredTurns).toHaveBeenCalledWith([
      {
        question: "How does preload affect stroke volume?",
        answer: "It increases stroke volume through ventricular stretch.",
      },
      {
        question: "How does heart rate affect cardiac output?",
        answer: "It changes cardiac output by changing beats per minute.",
      },
    ]);
  });

  it("starts Tutor with tutor-owned selector state instead of hub chain state", async () => {
    const wrapper = createWrapper();
    const hub = {
      ...createHubMock(),
      chainId: 5,
      customBlockIds: [11, 12],
    };
    const setTutorChainId = vi.fn();
    const setTutorCustomBlockIds = vi.fn();

    getSessionMock.mockResolvedValue({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: "2026-03-25T12:00:00Z",
      topic: "Cardiovascular regulation",
      course_id: 1,
      method_chain_id: 77,
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

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: 77,
          tutorCustomBlockIds: [91, 92],
          setTutorChainId,
          setTutorCustomBlockIds,
          activeSessionId: null,
          setActiveSessionId: vi.fn(),
          shellMode: "studio",
          studioView: "priming",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSession();
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method_chain_id: 77,
      }),
    );
    expect(createSessionMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        method_chain_id: 5,
      }),
    );
    expect(setTutorChainId).toHaveBeenCalledWith(77);
    expect(setTutorCustomBlockIds).toHaveBeenCalledWith([]);
  });

  it("forwards Prime Packet context when Tutor starts from the panel path", async () => {
    const wrapper = createWrapper();
    const hub = createHubMock();

    getSessionMock.mockResolvedValue({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: "2026-03-25T12:00:00Z",
      topic: "Cardiovascular regulation",
      course_id: 1,
      method_chain_id: 77,
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

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: 77,
          tutorCustomBlockIds: [],
          setTutorChainId: vi.fn(),
          setTutorCustomBlockIds: vi.fn(),
          activeSessionId: null,
          setActiveSessionId: vi.fn(),
          shellMode: "studio",
          studioView: "priming",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSession({
        packet_context: "Prime Packet\n- Cardiac Output Lecture",
      });
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        packet_context: "Prime Packet\n- Cardiac Output Lecture",
      }),
    );
  });

  it("forwards active session rules when Tutor starts from a compacted capsule", async () => {
    const wrapper = createWrapper();
    const hub = createHubMock();

    getSessionMock.mockResolvedValue({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: "2026-03-25T12:00:00Z",
      topic: "Cardiovascular regulation",
      course_id: 1,
      method_chain_id: 77,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [101],
        accuracy_profile: "strict",
        objective_scope: "module_all",
        session_rules: [
          "Always force a function confirmation before L4 precision.",
          "Stay inside the assigned provenance boundary.",
        ],
      },
      artifacts_json: "[]",
      turns: [],
    });

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: 77,
          tutorCustomBlockIds: [],
          setTutorChainId: vi.fn(),
          setTutorCustomBlockIds: vi.fn(),
          activeSessionId: null,
          setActiveSessionId: vi.fn(),
          shellMode: "studio",
          studioView: "priming",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSession({
        session_rules: [
          "Always force a function confirmation before L4 precision.",
          "Stay inside the assigned provenance boundary.",
        ],
      });
    });

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content_filter: {
          session_rules: [
            "Always force a function confirmation before L4 precision.",
            "Stay inside the assigned provenance boundary.",
          ],
        },
      }),
    );
  });

  it("falls back to an inferred study unit when Tutor starts without an explicit study unit", async () => {
    const wrapper = createWrapper();
    const hub = {
      ...createHubMock(),
      effectiveTopic: "Cardiovascular",
      effectiveStudyUnit: "Cardiovascular",
      selectedObjectiveGroup: "",
      selectedMaterials: [561],
      derivedVaultFolder: "Courses/Exercise Physiology/Cardiovascular",
      scopedObjectives: [],
    };

    getSessionMock.mockResolvedValue({
      session_id: "sess-started",
      status: "active",
      turn_count: 0,
      started_at: "2026-03-25T12:00:00Z",
      topic: "Cardiovascular",
      course_id: 1,
      method_chain_id: 77,
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

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          tutorChainId: 77,
          tutorCustomBlockIds: [],
          setTutorChainId: vi.fn(),
          setTutorCustomBlockIds: vi.fn(),
          activeSessionId: null,
          setActiveSessionId: vi.fn(),
          shellMode: "tutor",
          studioView: "workspace",
          setShellMode: vi.fn(),
          setShowSetup: vi.fn(),
          setRestoredTurns: vi.fn(),
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSession();
    });

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
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        preflight_id: "preflight-1",
      }),
    );
  });
});
