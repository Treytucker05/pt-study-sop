import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorShell } from "@/components/TutorShell";
import { getStudioCanvasShapeId } from "@/lib/studioCanvasShapes";
import { getStudioRepairCandidateId } from "@/lib/studioRepairCandidates";
import { getStudioExcerptObjectId } from "@/lib/studioWorkspaceObjects";
import { getStudioRepairWorkspaceObjectId } from "@/lib/studioWorkspaceObjects";

vi.mock("@/components/TutorErrorBoundary", () => ({
  TutorErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/TutorWorkflowPrimingPanel", () => ({
  TutorWorkflowPrimingPanel: ({
    onStartTutor,
    onRunAssistForSelected,
  }: {
    onStartTutor?: () => void;
    onRunAssistForSelected?: () => void;
  }) => (
    <div data-testid="mock-priming-panel">
      priming panel
      <button type="button" onClick={() => onStartTutor?.()}>
        Start Tutor from priming panel
      </button>
      <button type="button" onClick={() => onRunAssistForSelected?.()}>
        Run Priming Assist from priming panel
      </button>
    </div>
  ),
}));

vi.mock("@/components/TutorWorkflowPolishStudio", () => ({
  TutorWorkflowPolishStudio: () => (
    <div data-testid="mock-polish-panel">polish panel</div>
  ),
}));

vi.mock("@/components/TutorWorkflowFinalSync", () => ({
  TutorWorkflowFinalSync: () => (
    <div data-testid="mock-final-sync-panel">final sync panel</div>
  ),
}));

vi.mock("@/components/TutorWorkflowLaunchHub", () => ({
  TutorWorkflowLaunchHub: () => (
    <div data-testid="mock-launch-hub">launch hub</div>
  ),
}));

vi.mock("@/components/TutorStudioMode", () => ({
  TutorStudioMode: () => (
    <div data-testid="mock-studio-mode">studio mode</div>
  ),
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: ({
    onPromoteToPolishPacket,
  }: {
    onPromoteToPolishPacket?: (payload: {
      message: {
        messageId?: string;
        sessionTurnNumber?: number;
        role: "assistant";
        content: string;
      };
      index: number;
    }) => void;
  }) => (
    <div data-testid="mock-tutor-chat">
      <button
        type="button"
        onClick={() =>
          onPromoteToPolishPacket?.({
            message: {
              messageId: "assistant-1",
              sessionTurnNumber: 3,
              role: "assistant",
              content:
                "Cardiac output is determined by stroke volume multiplied by heart rate.",
            },
            index: 0,
          })
        }
      >
        Promote reply to Polish Packet
      </button>
    </div>
  ),
}));

const mockTldrawEditor = {
  createShapes: vi.fn().mockReturnThis(),
  updateShapes: vi.fn().mockReturnThis(),
  deleteShapes: vi.fn().mockReturnThis(),
};

vi.mock("tldraw", () => ({
  Tldraw: ({
    onMount,
    hideUi,
  }: {
    onMount?: (editor: typeof mockTldrawEditor) => void;
    hideUi?: boolean;
  }) => {
    useEffect(() => {
      onMount?.(mockTldrawEditor);
    }, [onMount]);

    return (
      <div data-testid="mock-tldraw-canvas" data-hide-ui={hideUi ? "true" : "false"}>
        tldraw canvas
      </div>
    );
  },
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: () => <div data-testid="mock-excalidraw">excalidraw</div>,
  exportToBlob: vi.fn(async () => new Blob(["png"])),
  convertToExcalidrawElements: vi.fn((elements: unknown[]) => elements),
}));

vi.mock("@/components/brain/UnifiedBrainCanvas", () => ({
  UnifiedBrainCanvas: () => <div data-testid="mock-brain-canvas">brain canvas</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => (
    <div data-testid="mock-concept-map">concept map</div>
  ),
}));

vi.mock("@/hooks/useBrainFeedback", () => ({
  useBrainFeedback: () => ({ submitBrainFeedback: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const getTemplateChainsMock = vi.fn().mockResolvedValue([]);
const getMethodBlocksMock = vi.fn().mockResolvedValue([]);
const getMaterialContentMock = vi.fn().mockResolvedValue({ content: "" });

beforeEach(() => {
  mockTldrawEditor.createShapes.mockReset().mockReturnThis();
  mockTldrawEditor.updateShapes.mockReset().mockReturnThis();
  mockTldrawEditor.deleteShapes.mockReset().mockReturnThis();
  getMaterialContentMock.mockReset().mockResolvedValue({ content: "" });
});

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getTemplateChains: (...args: unknown[]) => getTemplateChainsMock(...args),
      getMethodBlocks: (...args: unknown[]) => getMethodBlocksMock(...args),
      getMaterialContent: (...args: unknown[]) => getMaterialContentMock(...args),
      getMaterialFileUrl: (materialId: number) =>
        `/api/tutor/materials/${materialId}/file`,
      summarizeReply: vi.fn(),
      captureWorkflowNote: vi.fn(),
      createWorkflow: vi.fn(),
      updateWorkflowStage: vi.fn(),
    },
  },
}));

function createQueryWrapper() {
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

type HubOverrides = Partial<ReturnType<typeof makeHub>>;

function makeHub() {
  return {
    tutorContentSources: { courses: [] },
    tutorHub: null,
    tutorHubLoading: false,
    courseLabel: null,
    selectedObjectiveGroup: "",
    topic: "",
    selectedMaterials: [],
    chatMaterials: [],
    courseId: undefined,
    chainId: undefined,
    customBlockIds: [],
    selectedObjectiveId: "",
    objectiveScope: "module_all",
    availableObjectives: [],
    studyUnitOptions: [],
    derivedVaultFolder: "",
    selectedPaths: [],
    setChainId: vi.fn(),
    setCustomBlockIds: vi.fn(),
    setCourseId: vi.fn(),
    setSelectedMaterials: vi.fn(),
    setTopic: vi.fn(),
    setObjectiveScope: vi.fn(),
    setSelectedObjectiveId: vi.fn(),
    setSelectedObjectiveGroup: vi.fn(),
  };
}

function makeHubWithOverrides(overrides: HubOverrides = {}) {
  return {
    ...makeHub(),
    ...overrides,
  };
}

function makeSession() {
  return {
    preflight: { blockers: [] },
    preflightLoading: false,
    preflightError: null,
    isStarting: false,
    stageTimerDisplaySeconds: 0,
    stageTimerPauseCount: 0,
    stageTimerRunning: false,
    toggleWorkflowStudyTimer: vi.fn(),
    persistStageTimeSlice: vi.fn().mockResolvedValue(0),
    handleArtifactCreated: vi.fn(),
    handleStudioCapture: vi.fn(),
    setLatestCommittedAssistantMessage: vi.fn(),
    commitAssistantMessage: vi.fn(),
    latestCommittedAssistantMessage: null,
    committedAssistantMessages: [],
    turnCount: 0,
    setTurnCount: vi.fn(),
    endSession: vi.fn(),
    showEndConfirm: false,
    scholarStrategyExpanded: false,
    setScholarStrategyExpanded: vi.fn(),
    scholarStrategy: null,
    strategyFeedback: null,
    strategyNotes: "",
    setStrategyNotes: vi.fn(),
    savingStrategyFeedback: false,
    saveScholarStrategyFeedback: vi.fn().mockResolvedValue(undefined),
    saveScholarStrategyNotes: vi.fn().mockResolvedValue(undefined),
  };
}

type SessionOverrides = Partial<ReturnType<typeof makeSession>>;

function makeSessionWithOverrides(overrides: SessionOverrides = {}) {
  return {
    ...makeSession(),
    ...overrides,
  };
}

type WorkflowView = "home" | "workspace" | "priming" | "polish" | "final_sync";
type WorkflowOverrides = Partial<ReturnType<typeof makeWorkflow>>;

function makeWorkflow(studioView: WorkflowView) {
  return {
    studioView,
    activeWorkflowDetail: null,
    filteredWorkflows: [],
    workflowCount: 0,
    workflowFilters: {
      search: "",
      courseId: "all",
      stage: "all",
      status: "all",
      dueBucket: "all",
    },
    setWorkflowFilters: vi.fn(),
    createWorkflowAndOpenPriming: vi.fn(),
    openWorkflowRecord: vi.fn(),
    deleteWorkflowRecord: vi.fn(),
    activeWorkflowId: null,
    creatingWorkflow: false,
    deletingWorkflowId: null,
    bootstrappingPriming: false,
    setStudioView: vi.fn(),
    primingMethods: [],
    setPrimingMethods: vi.fn(),
    primingMethodRuns: [],
    mergedPrimingSourceInventory: [],
    primingReadinessItems: [],
    primingSummaryText: "",
    setPrimingSummaryText: vi.fn(),
    primingConceptsText: "",
    setPrimingConceptsText: vi.fn(),
    primingTerminologyText: "",
    setPrimingTerminologyText: vi.fn(),
    primingRootExplanationText: "",
    setPrimingRootExplanationText: vi.fn(),
    primingGapsText: "",
    setPrimingGapsText: vi.fn(),
    primingStrategyText: "",
    setPrimingStrategyText: vi.fn(),
    savingPrimingBundle: false,
    runningPrimingAssist: false,
    primingAssistTargetMaterialId: null,
    saveWorkflowPriming: vi.fn(),
    startTutorFromWorkflow: vi.fn(),
    runWorkflowPrimingAssist: vi.fn(),
    savingPolishBundle: false,
    saveWorkflowPolish: vi.fn(),
    quickCompactWorkflowMemory: vi.fn(),
    openWorkflowPolish: vi.fn(),
    exactNoteTitle: "",
    setExactNoteTitle: vi.fn(),
    exactNoteContent: "",
    setExactNoteContent: vi.fn(),
    editableNoteTitle: "",
    setEditableNoteTitle: vi.fn(),
    editableNoteContent: "",
    setEditableNoteContent: vi.fn(),
    saveWorkflowNoteCapture: vi.fn(),
    captureWorkflowMessageNote: vi.fn(),
    savingRuntimeEvent: false,
    feedbackSentiment: "liked",
    setFeedbackSentiment: vi.fn(),
    feedbackIssueType: "",
    setFeedbackIssueType: vi.fn(),
    feedbackMessage: "",
    setFeedbackMessage: vi.fn(),
    saveWorkflowFeedbackEvent: vi.fn(),
    saveWorkflowMessageFeedback: vi.fn(),
    memorySummaryText: "",
    setMemorySummaryText: vi.fn(),
    memoryWeakPointsText: "",
    setMemoryWeakPointsText: vi.fn(),
    memoryUnresolvedText: "",
    setMemoryUnresolvedText: vi.fn(),
    memoryCardRequestsText: "",
    setMemoryCardRequestsText: vi.fn(),
    createWorkflowMemoryCapsule: vi.fn(),
  };
}

function makeWorkflowWithOverrides(
  studioView: WorkflowView,
  overrides: WorkflowOverrides = {},
) {
  return {
    ...makeWorkflow(studioView),
    ...overrides,
  };
}

function renderTutorShell(
  studioView: WorkflowView,
  {
    hubOverrides,
    sessionOverrides,
    workflowOverrides,
    viewerState,
    shellOverrides,
    shellMode = "studio",
    activeSessionId = null,
  }: {
    hubOverrides?: HubOverrides;
    sessionOverrides?: SessionOverrides;
    workflowOverrides?: WorkflowOverrides;
    viewerState?: Record<string, unknown> | null;
    shellMode?: "studio" | "tutor";
    activeSessionId?: string | null;
    shellOverrides?: {
      promotedPrimePacketObjects?: unknown[];
      onPromotePrimePacketObject?: (...args: unknown[]) => void;
      promotedPolishPacketNotes?: unknown[];
      onPromotePolishPacketNote?: (...args: unknown[]) => void;
    };
  } = {},
) {
  const wrapper = createQueryWrapper();

  return render(
    <TutorShell
      shellMode={shellMode}
      setShellMode={vi.fn()}
      activeSessionId={activeSessionId}
      hub={makeHubWithOverrides(hubOverrides) as never}
      session={makeSessionWithOverrides(sessionOverrides) as never}
      workflow={makeWorkflowWithOverrides(studioView, workflowOverrides) as never}
      restoredTurns={undefined}
      activeBoardScope="project"
      activeBoardId={null}
      viewerState={viewerState ?? null}
      setActiveBoardScope={vi.fn()}
      setActiveBoardId={vi.fn()}
      setViewerState={vi.fn()}
      setShowSetup={vi.fn()}
      queryClient={new QueryClient()}
      promotedPrimePacketObjects={
        shellOverrides?.promotedPrimePacketObjects as never
      }
      onPromotePrimePacketObject={
        shellOverrides?.onPromotePrimePacketObject as never
      }
      promotedPolishPacketNotes={
        shellOverrides?.promotedPolishPacketNotes as never
      }
      onPromotePolishPacketNote={
        shellOverrides?.onPromotePolishPacketNote as never
      }
      onResumeHubCandidate={vi.fn()}
    />,
    { wrapper },
  );
}

function renderTutorShellTutorHarness() {
  const wrapper = createQueryWrapper();

  function Harness() {
    const [shellMode, setShellMode] = useState<"studio" | "tutor">("tutor");
    const [studioView, setStudioView] = useState<WorkflowView>("home");

    const workflow = useMemo(
      () =>
        makeWorkflowWithOverrides(studioView, {
          activeWorkflowId: 77,
          openWorkflowPolish: vi.fn(() => {
            setStudioView("polish");
            setShellMode("studio");
          }),
        }),
      [studioView],
    );

    return (
      <TutorShell
        shellMode={shellMode}
        setShellMode={setShellMode}
        activeSessionId="sess-1"
        hub={
          makeHubWithOverrides({
            courseId: 101,
            courseLabel: "Exercise Physiology",
          }) as never
        }
        session={makeSession() as never}
        workflow={workflow as never}
        restoredTurns={undefined}
        activeBoardScope="project"
        activeBoardId={null}
        viewerState={null}
        setActiveBoardScope={vi.fn()}
        setActiveBoardId={vi.fn()}
        setViewerState={vi.fn()}
        setShowSetup={vi.fn()}
        queryClient={new QueryClient()}
        onResumeHubCandidate={vi.fn()}
      />
    );
  }

  return render(<Harness />, { wrapper });
}

describe("TutorShell studio routing", () => {
  it("shows current run context in the Source Shelf for Workspace Home", async () => {
    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedObjectiveGroup: "Week 7",
        topic: "Cardiac output",
        selectedMaterials: [101, 102],
        derivedVaultFolder: "Exercise Physiology/Week 7",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    expect(sourceShelf).toHaveTextContent("Current Run");
    expect(sourceShelf).toHaveTextContent("Exercise Physiology");
    expect(sourceShelf).toHaveTextContent("Week 7");
    expect(sourceShelf).toHaveTextContent("Cardiac output");
    expect(sourceShelf).toHaveTextContent("2 materials in run");
    expect(sourceShelf).toHaveTextContent("Exercise Physiology/Week 7");
  });

  it("keeps Workspace Home focused on the main launch surface instead of the full Studio rail stack", async () => {
    renderTutorShell("home");

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-stage-nav")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-run-config")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-tutor-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-memory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-prime-packet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-polish-packet")).not.toBeInTheDocument();
  });

  it("shows the active run configuration summary inside Run Config", async () => {
    renderTutorShell("priming", {
      hubOverrides: {
        chainId: 12,
      },
      workflowOverrides: {
        primingMethods: ["summary", "concept-map", "gaps"],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const runConfig = screen.getByTestId("studio-run-config");
    expect(runConfig).toHaveTextContent("3 priming methods selected");
    expect(runConfig).toHaveTextContent("Template chain selected");
    expect(runConfig).toHaveTextContent("Chain #12");
    expect(runConfig).toHaveTextContent("Tutor start mode");
  });

  it("reduces Priming chrome to source context, run config, and Prime Packet", async () => {
    renderTutorShell("priming");

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-source-shelf")).toBeInTheDocument();
    expect(screen.getByTestId("studio-run-config")).toBeInTheDocument();
    expect(screen.getByTestId("studio-prime-packet")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-tutor-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-repair-candidates")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-memory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-polish-packet")).not.toBeInTheDocument();
  });

  it("shows live Tutor Status with context health inside the Studio shell", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        scholarStrategy: {
          strategyId: "strategy-1",
          generatedAt: "2026-03-25T10:00:00Z",
          profileSnapshotId: 42,
          hybridArchetype: {
            slug: "retrieval-coach",
            label: "Adaptive Retrieval Coach",
          },
          boundedBy: {
            allowedFields: ["pacing", "retrievalPressure"],
            forbiddenFields: ["courseScope"],
            note: "Stay inside the current study packet.",
          },
          fields: {},
          summary: "Fade scaffolds slowly while pushing retrieval first.",
        },
        turnCount: 11,
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output. ".repeat(
              20,
            ),
          verdict: {
            verdict: "partial",
            confidence: 0.82,
            why_wrong:
              "The reply mixed preload effects with heart-rate regulation.",
            _validation_issues: [
              "Missing citation support for the preload claim.",
              "Next hint should be present for partial verdicts.",
            ],
          },
        },
        stageTimerDisplaySeconds: 4_200,
        stageTimerRunning: true,
      },
      workflowOverrides: {
        activeWorkflowDetail: {
          memory_capsules: [{ id: 1 }, { id: 2 }],
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const tutorStatus = screen.getByTestId("studio-tutor-status");
    expect(tutorStatus).toHaveTextContent("Adaptive Retrieval Coach");
    expect(tutorStatus).toHaveTextContent(
      "Fade scaffolds slowly while pushing retrieval first.",
    );
    expect(tutorStatus).toHaveTextContent("Compaction soon");
    expect(tutorStatus).toHaveTextContent("11 turns");
    expect(tutorStatus).toHaveTextContent("1:10:00");
    expect(tutorStatus).toHaveTextContent("2 capsules");
    expect(tutorStatus).toHaveTextContent("Live");
    expect(tutorStatus).toHaveTextContent("2 validation issues");
    expect(tutorStatus).toHaveTextContent("82% confidence");
    expect(tutorStatus).toHaveTextContent("Needs repair");
    expect(tutorStatus).not.toHaveTextContent(
      "Adaptive status, validation, and context health will surface here.",
    );
  });

  it("shows latest capsule, capsule history, and compaction state inside Memory", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        turnCount: 11,
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output. ".repeat(
              20,
            ),
        },
        stageTimerDisplaySeconds: 4_200,
        stageTimerRunning: true,
      },
      workflowOverrides: {
        activeWorkflowDetail: {
          memory_capsules: [
            {
              id: 1,
              capsule_version: 1,
              summary_text: "Established the first hemodynamics summary.",
              current_objective: "Cardiac output",
              created_at: "2026-03-25T10:30:00Z",
            },
            {
              id: 2,
              capsule_version: 2,
              summary_text: "Captured the misconception about preload versus heart rate.",
              current_objective: "Preload versus heart rate",
              created_at: "2026-03-25T11:45:00Z",
            },
          ],
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const memory = screen.getByTestId("studio-memory");
    expect(memory).toHaveTextContent("Latest capsule");
    expect(memory).toHaveTextContent("Capsule v2");
    expect(memory).toHaveTextContent(
      "Captured the misconception about preload versus heart rate.",
    );
    expect(memory).toHaveTextContent("Compaction soon");
    expect(memory).toHaveTextContent("2 capsules total");
    expect(memory).toHaveTextContent("Capsule v1");
    expect(memory).not.toHaveTextContent(
      "Session capsules and compaction status will surface here.",
    );
  });

  it("shows explicit repair candidates derived from the latest judged turn", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output.",
          verdict: {
            verdict: "partial",
            confidence: 0.82,
            why_wrong:
              "The reply mixed preload effects with heart-rate regulation.",
            _validation_issues: [
              "Missing citation support for the preload claim.",
            ],
          },
          teachBackRubric: {
            overall_rating: "partial",
            accuracy_score: 0.6,
            breadth_score: 0.55,
            synthesis_score: 0.5,
            confidence: 0.74,
            misconceptions: [
              "The teach-back treated preload as identical to heart rate.",
            ],
            gaps: [{ skill_id: "frank-starling" }],
            next_focus: "Differentiate preload from rate control.",
          },
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const repairCandidates = screen.getByTestId("studio-repair-candidates");
    expect(repairCandidates).toHaveTextContent("Misconception to repair");
    expect(repairCandidates).toHaveTextContent(
      "The reply mixed preload effects with heart-rate regulation.",
    );
    expect(repairCandidates).toHaveTextContent("Validation issue");
    expect(repairCandidates).toHaveTextContent(
      "Missing citation support for the preload claim.",
    );
    expect(repairCandidates).toHaveTextContent("Teach-back misconception");
    expect(repairCandidates).toHaveTextContent("Missing concept");
    expect(repairCandidates).toHaveTextContent(
      "Fill the missing concept: frank-starling.",
    );
    expect(repairCandidates).not.toHaveTextContent(
      "Detected misconceptions and missing-context cues will appear here.",
    );
  });

  it("accumulates repair candidates across committed assistant history", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        latestCommittedAssistantMessage: {
          role: "assistant",
          content: "Heart rate affects cardiac output.",
          verdict: {
            verdict: "partial",
            confidence: 0.75,
            why_wrong:
              "The reply treated heart-rate control as the same as preload regulation.",
            _validation_issues: [
              "Missing citation support for the rate-control claim.",
            ],
          },
        },
        committedAssistantMessages: [
          {
            role: "assistant",
            sessionTurnNumber: 1,
            content: "Preload affects stroke volume.",
            verdict: {
              verdict: "partial",
              confidence: 0.7,
              why_wrong:
                "The reply collapsed preload and afterload into the same mechanism.",
            },
          },
          {
            role: "assistant",
            sessionTurnNumber: 2,
            content: "Heart rate affects cardiac output.",
            verdict: {
              verdict: "partial",
              confidence: 0.75,
              why_wrong:
                "The reply treated heart-rate control as the same as preload regulation.",
              _validation_issues: [
                "Missing citation support for the rate-control claim.",
              ],
            },
          },
        ],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const repairCandidates = screen.getByTestId("studio-repair-candidates");
    expect(repairCandidates).toHaveTextContent(
      "The reply treated heart-rate control as the same as preload regulation.",
    );
    expect(repairCandidates).toHaveTextContent(
      "Missing citation support for the rate-control claim.",
    );
    expect(repairCandidates).toHaveTextContent(
      "The reply collapsed preload and afterload into the same mechanism.",
    );
    expect(repairCandidates).toHaveTextContent("Turn 2 verdict");
    expect(repairCandidates).toHaveTextContent("Turn 1 verdict");
  });

  it("shows active source context in the Document Dock for Workspace Home", async () => {
    renderTutorShell("workspace", {
      hubOverrides: {
        selectedMaterials: [101, 102],
        selectedPaths: ["Exercise Physiology/Week 7/Cardio.md"],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
          {
            id: 102,
            title: "Hemodynamics Notes",
            file_type: "txt",
            source_path: "uploads/hemodynamics.txt",
          },
        ],
      },
      viewerState: {
        material_id: 101,
        source_path: "uploads/cardio-output.pdf",
        file_type: "pdf",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const documentDock = screen.getByTestId("studio-document-dock");
    expect(documentDock).toHaveTextContent("Cardiac Output Lecture");
    expect(documentDock).toHaveTextContent("PDF");
    expect(documentDock).toHaveTextContent("2 selected source files");
    expect(documentDock).toHaveTextContent("1 linked vault path");
    expect(documentDock).toHaveTextContent("Exercise Physiology/Week 7/Cardio.md");
  });

  it("shows explicit Prime Packet sections for source context and primed artifacts", async () => {
    renderTutorShell("priming", {
      hubOverrides: {
        selectedMaterials: [101],
        selectedPaths: ["Exercise Physiology/Week 7/Cardio.md"],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
        ],
      },
      workflowOverrides: {
        primingSummaryText: "Cardiac output sets whole-body perfusion.",
        primingTerminologyText: "Stroke volume\nHeart rate",
        primingStrategyText: "Start with retrieval, then increase scaffolding slowly.",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const primePacket = screen.getByTestId("studio-prime-packet");
    expect(primePacket).toHaveTextContent("Source Context");
    expect(primePacket).toHaveTextContent("Primed Artifacts");
    expect(primePacket).toHaveTextContent("Cardiac Output Lecture");
    expect(primePacket).toHaveTextContent("Exercise Physiology/Week 7/Cardio.md");
    expect(primePacket).toHaveTextContent("Summary");
    expect(primePacket).toHaveTextContent("Terminology");
    expect(primePacket).toHaveTextContent("Tutor Strategy");
  });

  it("shows explicit Polish Packet sections for notes, summaries, cards, and assets", async () => {
    renderTutorShell("polish", {
      workflowOverrides: {
        activeWorkflowDetail: {
          captured_notes: [
            {
              id: 1,
              note_mode: "exact",
              title: "SV vs HR misconception",
              content: "Need to separate preload from heart-rate effects.",
            },
          ],
          polish_bundle: {
            summaries: [{ title: "Hemodynamics summary" }],
            card_requests: [{ front: "What determines cardiac output?" }],
            status: "draft",
          },
          publish_results: [
            {
              id: 9,
              status: "draft",
              obsidian_results: [{ path: "Vault/Cardio.md" }],
              anki_results: [],
            },
          ],
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const polishPacket = screen.getByTestId("studio-polish-packet");
    expect(polishPacket).toHaveTextContent("Notes");
    expect(polishPacket).toHaveTextContent("Summaries");
    expect(polishPacket).toHaveTextContent("Cards");
    expect(polishPacket).toHaveTextContent("Assets");
    expect(polishPacket).toHaveTextContent("SV vs HR misconception");
    expect(polishPacket).toHaveTextContent("Hemodynamics summary");
    expect(polishPacket).toHaveTextContent("What determines cardiac output?");
    expect(polishPacket).toHaveTextContent("Vault/Cardio.md");
  });

  it("reduces Polish chrome to the main polish surface and Polish Packet", async () => {
    renderTutorShell("polish");

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-polish-packet")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-run-config")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-tutor-status")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-repair-candidates")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-memory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-prime-packet")).not.toBeInTheDocument();
  });

  it("seeds the workspace view with current-run source objects", async () => {
    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedMaterials: [101, 102],
        selectedPaths: ["Exercise Physiology/Week 7/Cardio.md"],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
          {
            id: 102,
            title: "Hemodynamics Notes",
            file_type: "txt",
            source_path: "uploads/hemodynamics.txt",
          },
        ],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const workspace = await screen.findByTestId("studio-tldraw-workspace");
    expect(workspace).toHaveTextContent("Current Run Ready");
    expect(workspace).toHaveTextContent("3 current-run source objects ready");
    expect(workspace).toHaveTextContent("0 active canvas objects");
    expect(screen.getByTestId("mock-tldraw-canvas")).toHaveAttribute(
      "data-hide-ui",
      "true",
    );
  });

  it("adds a current-run source from Source Shelf into the workspace canvas objects", async () => {
    const user = userEvent.setup();

    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedMaterials: [101, 102],
        selectedPaths: ["Exercise Physiology/Week 7/Cardio.md"],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
          {
            id: 102,
            title: "Hemodynamics Notes",
            file_type: "txt",
            source_path: "uploads/hemodynamics.txt",
          },
        ],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    const workspace = await screen.findByTestId("studio-tldraw-workspace");

    expect(workspace).toHaveTextContent("0 active canvas objects");

    await user.click(
      within(sourceShelf).getByRole("button", {
        name: /Add Cardiac Output Lecture to workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("Canvas Objects");
    expect(workspace).toHaveTextContent("1 active canvas object");
    expect(mockTldrawEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: getStudioCanvasShapeId("material:101"),
        type: "note",
      }),
    ]);
    expect(
      within(sourceShelf).getByRole("button", {
        name: /Cardiac Output Lecture already in workspace/i,
      }),
    ).toBeDisabled();
  });

  it("clips the active document excerpt into the workspace with provenance-backed shape ids", async () => {
    const user = userEvent.setup();

    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
        ],
      },
      viewerState: {
        material_id: 101,
        source_path: "uploads/cardio-output.pdf",
        file_type: "pdf",
        selection_text:
          "Cardiac output is determined by stroke volume multiplied by heart rate.",
        selection_label: "Paragraph 1",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const documentDock = screen.getByTestId("studio-document-dock");
    const workspace = await screen.findByTestId("studio-tldraw-workspace");

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Clip excerpt to workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("1 active canvas object");
    expect(mockTldrawEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: getStudioCanvasShapeId(
          getStudioExcerptObjectId({
            materialId: 101,
            excerptText:
              "Cardiac output is determined by stroke volume multiplied by heart rate.",
            selectionLabel: "Paragraph 1",
          }),
        ),
        type: "note",
      }),
    ]);
  });

  it("clips the active viewer selection into the workspace from the real document viewer state", async () => {
    const user = userEvent.setup();
    getMaterialContentMock.mockResolvedValueOnce({
      title: "Cardiac Output Lecture",
      file_type: "txt",
      content:
        "Cardiac output depends on stroke volume and heart rate for each beat.",
    });

    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "txt",
            source_path: "uploads/cardio-output.txt",
          },
        ],
      },
      viewerState: {
        material_id: 101,
        source_path: "uploads/cardio-output.txt",
        file_type: "txt",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const documentDock = screen.getByTestId("studio-document-dock");
    const textPreview = await screen.findByTestId("material-viewer-text-preview");
    const textNode = textPreview.firstChild;

    expect(textNode).not.toBeNull();

    const range = document.createRange();
    range.setStart(textNode!, 0);
    range.setEnd(textNode!, "Cardiac output depends on stroke volume".length);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseUp(textPreview);

    expect(
      within(documentDock).getByLabelText(/Selected passage/i),
    ).toHaveValue("Cardiac output depends on stroke volume");

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Clip excerpt to workspace/i,
      }),
    );

    expect(mockTldrawEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: getStudioCanvasShapeId(
          getStudioExcerptObjectId({
            materialId: 101,
            excerptText: "Cardiac output depends on stroke volume",
            selectionLabel: "Viewer selection",
          }),
        ),
        type: "note",
      }),
    ]);
  });

  it("promotes a workspace excerpt into Prime Packet primed artifacts", async () => {
    const user = userEvent.setup();

    renderTutorShell("workspace", {
      hubOverrides: {
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
        ],
      },
      viewerState: {
        material_id: 101,
        source_path: "uploads/cardio-output.pdf",
        file_type: "pdf",
        selection_text:
          "Cardiac output is determined by stroke volume multiplied by heart rate.",
        selection_label: "Paragraph 1",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const documentDock = screen.getByTestId("studio-document-dock");
    const workspace = screen.getByTestId("studio-tldraw-workspace");
    const primePacket = screen.getByTestId("studio-prime-packet");

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Clip excerpt to workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("Workspace Excerpts");
    expect(primePacket).not.toHaveTextContent(
      "Cardiac output is determined by stroke volume multiplied by heart rate.",
    );

    await user.click(
      within(workspace).getByRole("button", {
        name: /Promote excerpt: Cardiac Output Lecture to Prime Packet/i,
      }),
    );

    expect(primePacket).toHaveTextContent("Workspace Excerpt");
    expect(primePacket).toHaveTextContent(
      "Cardiac output is determined by stroke volume multiplied by heart rate.",
    );
    expect(
      within(workspace).getByRole("button", {
        name: /Excerpt: Cardiac Output Lecture already in Prime Packet/i,
      }),
    ).toBeDisabled();
  });

  it("sends a repair candidate into the workspace as a real tldraw note shape", async () => {
    const user = userEvent.setup();

    renderTutorShell("workspace", {
      sessionOverrides: {
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output.",
          verdict: {
            verdict: "partial",
            confidence: 0.82,
            why_wrong:
              "The reply mixed preload effects with heart-rate regulation.",
            _validation_issues: [
              "Missing citation support for the preload claim.",
            ],
          },
          teachBackRubric: {
            overall_rating: "partial",
            accuracy_score: 0.6,
            breadth_score: 0.55,
            synthesis_score: 0.5,
            confidence: 0.74,
            misconceptions: [
              "The teach-back treated preload as identical to heart rate.",
            ],
            gaps: [{ skill_id: "frank-starling" }],
            next_focus: "Differentiate preload from rate control.",
          },
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const repairCandidates = screen.getByTestId("studio-repair-candidates");
    const workspace = screen.getByTestId("studio-tldraw-workspace");

    expect(workspace).toHaveTextContent("0 active canvas objects");

    await user.click(
      within(repairCandidates).getByRole("button", {
        name: /Send repair candidate: Misconception to repair to Workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("1 active canvas object");
    expect(mockTldrawEditor.createShapes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: getStudioCanvasShapeId(
          getStudioRepairWorkspaceObjectId(
            getStudioRepairCandidateId({
              source: "verdict",
              title: "Misconception to repair",
              detail:
                "The reply mixed preload effects with heart-rate regulation.",
            }),
          ),
        ),
        type: "note",
      }),
    ]);
    expect(
      within(repairCandidates).getByRole("button", {
        name: /Repair candidate: Misconception to repair already in Workspace/i,
      }),
    ).toBeDisabled();
  });

  it("promotes a repair-backed workspace note into Prime Packet primed artifacts", async () => {
    const user = userEvent.setup();

    renderTutorShell("workspace", {
      sessionOverrides: {
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output.",
          verdict: {
            verdict: "partial",
            confidence: 0.82,
            why_wrong:
              "The reply mixed preload effects with heart-rate regulation.",
            _validation_issues: [
              "Missing citation support for the preload claim.",
            ],
          },
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const repairCandidates = screen.getByTestId("studio-repair-candidates");
    const workspace = screen.getByTestId("studio-tldraw-workspace");
    const primePacket = screen.getByTestId("studio-prime-packet");

    await user.click(
      within(repairCandidates).getByRole("button", {
        name: /Send repair candidate: Misconception to repair to Workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("1 active canvas object");
    expect(primePacket).not.toHaveTextContent(
      "The reply mixed preload effects with heart-rate regulation.",
    );

    await user.click(
      within(workspace).getByRole("button", {
        name: /Promote note: Misconception to repair to Prime Packet/i,
      }),
    );

    expect(primePacket).toHaveTextContent("Misconception to repair");
    expect(primePacket).toHaveTextContent(
      "The reply mixed preload effects with heart-rate regulation.",
    );
    expect(
      within(workspace).getByRole("button", {
        name: /Note: Misconception to repair already in Prime Packet/i,
      }),
    ).toBeDisabled();
  });

  it("hands repair-note Prime promotions back to the parent controller for persistence", async () => {
    const user = userEvent.setup();
    const onPromotePrimePacketObject = vi.fn();

    renderTutorShell("workspace", {
      sessionOverrides: {
        latestCommittedAssistantMessage: {
          role: "assistant",
          content:
            "Stroke volume, preload, and afterload all shape cardiac output.",
          verdict: {
            verdict: "partial",
            confidence: 0.82,
            why_wrong:
              "The reply mixed preload effects with heart-rate regulation.",
          },
        },
      },
      shellOverrides: {
        promotedPrimePacketObjects: [],
        onPromotePrimePacketObject,
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const repairCandidates = screen.getByTestId("studio-repair-candidates");
    const workspace = screen.getByTestId("studio-tldraw-workspace");

    await user.click(
      within(repairCandidates).getByRole("button", {
        name: /Send repair candidate: Misconception to repair to Workspace/i,
      }),
    );

    await user.click(
      within(workspace).getByRole("button", {
        name: /Promote note: Misconception to repair to Prime Packet/i,
      }),
    );

    expect(onPromotePrimePacketObject).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "text_note",
        title: "Misconception to repair",
        detail: "The reply mixed preload effects with heart-rate regulation.",
      }),
    );
  });

  it("passes Prime Packet repair notes into Tutor startup packet context", async () => {
    const user = userEvent.setup();
    const startTutorFromWorkflow = vi.fn();

    renderTutorShell("priming", {
      hubOverrides: {
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            source_path: "uploads/cardio-output.pdf",
            file_type: "pdf",
          },
        ],
      },
      workflowOverrides: {
        startTutorFromWorkflow,
      },
      shellOverrides: {
        promotedPrimePacketObjects: [
          {
            id: "repair-note:verdict-1",
            kind: "text_note",
            title: "Misconception to repair",
            detail:
              "The learner mixed preload effects with heart-rate regulation.",
            badge: "MISCONCEPTION",
            provenance: {
              sourceType: "repair_candidate",
              candidateId: "candidate-1",
              sourceLabel: "Latest verdict",
            },
          },
        ],
      },
    });

    expect(await screen.findByTestId("mock-priming-panel")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Start Tutor from priming panel/i }),
    );

    expect(startTutorFromWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        packet_context: expect.stringContaining("Misconception to repair"),
      }),
    );
    expect(startTutorFromWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        packet_context: expect.stringContaining(
          "The learner mixed preload effects with heart-rate regulation.",
        ),
      }),
    );
  });

  it("passes Prime Packet repair notes into Priming Assist packet context", async () => {
    const user = userEvent.setup();
    const runWorkflowPrimingAssist = vi.fn();

    renderTutorShell("priming", {
      hubOverrides: {
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            source_path: "uploads/cardio-output.pdf",
            file_type: "pdf",
          },
        ],
      },
      workflowOverrides: {
        runWorkflowPrimingAssist,
      },
      shellOverrides: {
        promotedPrimePacketObjects: [
          {
            id: "repair-note:verdict-1",
            kind: "text_note",
            title: "Misconception to repair",
            detail:
              "The learner mixed preload effects with heart-rate regulation.",
            badge: "MISCONCEPTION",
            provenance: {
              sourceType: "repair_candidate",
              candidateId: "candidate-1",
              sourceLabel: "Latest verdict",
            },
          },
        ],
      },
    });

    expect(await screen.findByTestId("mock-priming-panel")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Run Priming Assist from priming panel/i,
      }),
    );

    expect(runWorkflowPrimingAssist).toHaveBeenCalledWith(
      [101],
      expect.objectContaining({
        packet_context: expect.stringContaining("Misconception to repair"),
      }),
    );
    expect(runWorkflowPrimingAssist).toHaveBeenCalledWith(
      [101],
      expect.objectContaining({
        packet_context: expect.stringContaining(
          "The learner mixed preload effects with heart-rate regulation.",
        ),
      }),
    );
  });

  it("promotes a tutor reply into Polish Packet notes", async () => {
    const user = userEvent.setup();

    renderTutorShellTutorHarness();

    expect(await screen.findByTestId("mock-tutor-chat")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Promote reply to Polish Packet/i,
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /OPEN POLISH/i,
      }),
    );

    const polishPacket = await screen.findByTestId("studio-polish-packet");
    expect(polishPacket).toHaveTextContent("Tutor Reply 3");
    expect(polishPacket).toHaveTextContent(
      "Cardiac output is determined by stroke volume multiplied by heart rate.",
    );
  });

  it("hands Polish Packet promotions back to the parent controller for persistence", async () => {
    const user = userEvent.setup();
    const onPromotePolishPacketNote = vi.fn();

    renderTutorShell("home", {
      shellMode: "tutor",
      activeSessionId: "sess-1",
      shellOverrides: {
        promotedPolishPacketNotes: [],
        onPromotePolishPacketNote,
      },
    });

    expect(await screen.findByTestId("mock-tutor-chat")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Promote reply to Polish Packet/i,
      }),
    );

    expect(onPromotePolishPacketNote).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "assistant-1",
        title: "Tutor Reply 3",
        content:
          "Cardiac output is determined by stroke volume multiplied by heart rate.",
        badge: "TUTOR",
      }),
    );
  });

  it.each([
    ["workspace", "studio-tldraw-workspace"],
    ["priming", "mock-priming-panel"],
    ["polish", "mock-polish-panel"],
    ["final_sync", "mock-final-sync-panel"],
  ] as const)(
    "keeps the %s Studio view inside StudioShell",
    async (studioView, testId) => {
      renderTutorShell(studioView);

      expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
      expect(await screen.findByTestId(testId)).toBeInTheDocument();
    },
  );
});
