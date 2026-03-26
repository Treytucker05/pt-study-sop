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

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      preflightSession: (...args: unknown[]) => preflightSessionMock(...args),
      configCheck: (...args: unknown[]) => configCheckMock(...args),
      logWorkflowStageTime: (...args: unknown[]) => logWorkflowStageTimeMock(...args),
      getProjectShell: (...args: unknown[]) => getProjectShellMock(...args),
      restoreStudioItems: (...args: unknown[]) => restoreStudioItemsMock(...args),
      createCustomChain: vi.fn(),
      createSession: vi.fn(),
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
      vault_ready: false,
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

  it("hydrates committed assistant history from restored session turns", async () => {
    const wrapper = createWrapper();
    const hub = createHubMock();
    const setActiveSessionId = vi.fn();
    const setShellMode = vi.fn();
    const setShowSetup = vi.fn();
    const setRestoredTurns = vi.fn();

    getSessionMock.mockResolvedValue({
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
    });

    const { result } = renderHook(
      () =>
        useTutorSession({
          initialRouteQuery: {},
          hub: hub as never,
          activeSessionId: null,
          setActiveSessionId,
          shellMode: "studio",
          studioView: "home",
          setShellMode,
          setShowSetup,
          setRestoredTurns,
          hasRestored: true,
          activeWorkflowId: null,
          activeWorkflowDetail: null,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.resumeSession("sess-restore");
    });

    expect(result.current.committedAssistantMessages).toHaveLength(2);
    expect(result.current.committedAssistantMessages[0]).toMatchObject({
      sessionTurnNumber: 1,
      content: "It increases stroke volume through ventricular stretch.",
      verdict: expect.objectContaining({
        why_wrong: "The answer omitted the Frank-Starling mechanism.",
      }),
      teachBackRubric: expect.objectContaining({
        misconceptions: ["The answer skipped ventricular stretch."],
      }),
    });
    expect(result.current.latestCommittedAssistantMessage).toMatchObject({
      sessionTurnNumber: 2,
      verdict: expect.objectContaining({
        why_wrong:
          "The answer treated heart-rate control as identical to preload regulation.",
      }),
    });
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
});
