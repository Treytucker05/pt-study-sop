import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorSession } from "@/hooks/useTutorSession";
import type { TutorWorkflowDetailResponse } from "@/lib/api";

const preflightSessionMock = vi.fn();
const configCheckMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      preflightSession: (...args: unknown[]) => preflightSessionMock(...args),
      configCheck: (...args: unknown[]) => configCheckMock(...args),
      getProjectShell: vi.fn(),
      restoreStudioItems: vi.fn(),
      createCustomChain: vi.fn(),
      createSession: vi.fn(),
      getSession: vi.fn(),
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
});
