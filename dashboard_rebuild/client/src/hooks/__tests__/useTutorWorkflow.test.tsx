import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorWorkflow } from "@/hooks/useTutorWorkflow";
import type { TutorWorkflowDetailResponse, TutorWorkflowSummary } from "@/lib/api";

const listWorkflowsMock = vi.fn();
const getWorkflowMock = vi.fn();
const deleteWorkflowMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      listWorkflows: (...args: unknown[]) => listWorkflowsMock(...args),
      getWorkflow: (...args: unknown[]) => getWorkflowMock(...args),
      deleteWorkflow: (...args: unknown[]) => deleteWorkflowMock(...args),
      createWorkflow: vi.fn(),
      savePrimingBundle: vi.fn(),
      updateWorkflowStage: vi.fn(),
      runPrimingAssist: vi.fn(),
      savePolishBundle: vi.fn(),
      captureWorkflowNote: vi.fn(),
      saveWorkflowFeedback: vi.fn(),
      createMemoryCapsule: vi.fn(),
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
    artifacts: [],
    latestCommittedAssistantMessage: null,
  };
}

describe("useTutorWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkflowsMock.mockResolvedValue({ items: [workflowFixture], count: 1 });
    getWorkflowMock.mockResolvedValue(workflowDetailFixture);
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
          shellMode: "dashboard",
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
      result.current.setWorkflowView("priming");
    });

    await waitFor(() => {
      expect(getWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    });

    await act(async () => {
      await result.current.deleteWorkflowRecord(workflowFixture);
    });

    expect(deleteWorkflowMock).toHaveBeenCalledWith(workflowFixture.workflow_id);
    expect(result.current.activeWorkflowId).toBeNull();
    expect(result.current.workflowView).toBe("launch");
    expect(session.clearActiveSessionState).toHaveBeenCalled();
    expect(hub.setSelectedMaterials).toHaveBeenCalledWith([]);
    expect(toastSuccessMock).toHaveBeenCalledWith("Study plan deleted");
  });
});
