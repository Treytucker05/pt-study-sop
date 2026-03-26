import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorShell } from "@/components/TutorShell";
import { buildStudioShellPresetLayout } from "@/components/studio/StudioShell";
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
    onCompact,
    onPromoteToPolishPacket,
  }: {
    onCompact?: () => void;
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
      <div data-testid="mock-tutor-chat-toolbar">
        <button type="button">ASK / SOCRATIC</button>
        <button type="button">EVALUATE</button>
        <button type="button">CONCEPT MAP</button>
        <button type="button">TEACH-BACK</button>
        <button type="button">Voice Dictation</button>
      </div>
      <button type="button" onClick={() => onCompact?.()}>
        Compact Tutor memory
      </button>
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
        <a href="https://tldraw.dev#pricing">Get a license for production</a>
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
    effectiveStudyUnit: "",
    topic: "",
    effectiveTopic: "",
    selectedMaterials: [],
    chatMaterials: [],
    selectedMaterialRecords: [],
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
  const base = makeHub();
  return {
    ...base,
    ...overrides,
    effectiveStudyUnit:
      overrides.effectiveStudyUnit ??
      overrides.selectedObjectiveGroup ??
      base.effectiveStudyUnit,
    effectiveTopic:
      overrides.effectiveTopic ?? overrides.topic ?? base.effectiveTopic,
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
    startSession: vi.fn().mockResolvedValue(null),
    resumeSession: vi.fn().mockResolvedValue(undefined),
    hasActiveTutorSession: true,
    activeSessionStatus: "active",
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
    saveWorkflowNoteToVault: vi.fn(),
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
    activeSessionId = null,
  }: {
    hubOverrides?: HubOverrides;
    sessionOverrides?: SessionOverrides;
    workflowOverrides?: WorkflowOverrides;
    viewerState?: Record<string, unknown> | null;
    activeSessionId?: string | null;
    shellOverrides?: {
      promotedPrimePacketObjects?: unknown[];
      onPromotePrimePacketObject?: (...args: unknown[]) => void;
      promotedPolishPacketNotes?: unknown[];
      onPromotePolishPacketNote?: (...args: unknown[]) => void;
      panelLayout?: unknown[];
      setPanelLayout?: (...args: unknown[]) => void;
      runtimeState?: Record<string, unknown> | null;
      setCompactionTelemetry?: (...args: unknown[]) => void;
      setActiveMemoryCapsuleId?: (...args: unknown[]) => void;
      setDirectNoteSaveStatus?: (...args: unknown[]) => void;
      tutorChainId?: number;
      tutorCustomBlockIds?: number[];
      setTutorChainId?: (...args: unknown[]) => void;
      setTutorCustomBlockIds?: (...args: unknown[]) => void;
      primingMethodIds?: string[];
      primingChainId?: number;
      primingCustomBlockIds?: number[];
      setPrimingMethodIds?: (...args: unknown[]) => void;
      setPrimingChainId?: (...args: unknown[]) => void;
      setPrimingCustomBlockIds?: (...args: unknown[]) => void;
    };
  } = {},
) {
  const wrapper = createQueryWrapper();

  function Harness() {
    const [panelLayout, setPanelLayout] = useState<unknown[]>(
      shellOverrides?.panelLayout ?? buildStudioShellPresetLayout("full_studio"),
    );

    return (
      <TutorShell
        activeSessionId={activeSessionId}
        hub={makeHubWithOverrides(hubOverrides) as never}
        session={makeSessionWithOverrides(sessionOverrides) as never}
        workflow={makeWorkflowWithOverrides(studioView, workflowOverrides) as never}
        restoredTurns={undefined}
        activeBoardScope="project"
        activeBoardId={null}
        viewerState={viewerState ?? null}
        runtimeState={shellOverrides?.runtimeState as never}
        tutorChainId={shellOverrides?.tutorChainId as never}
        tutorCustomBlockIds={shellOverrides?.tutorCustomBlockIds as never}
        setActiveBoardScope={vi.fn()}
        setActiveBoardId={vi.fn()}
        setViewerState={vi.fn()}
        setShowSetup={vi.fn()}
        queryClient={new QueryClient()}
        panelLayout={panelLayout as never}
        setPanelLayout={
          (shellOverrides?.setPanelLayout as never) ??
          (setPanelLayout as never)
        }
        setCompactionTelemetry={shellOverrides?.setCompactionTelemetry as never}
        setActiveMemoryCapsuleId={shellOverrides?.setActiveMemoryCapsuleId as never}
        setDirectNoteSaveStatus={shellOverrides?.setDirectNoteSaveStatus as never}
        setTutorChainId={shellOverrides?.setTutorChainId as never}
        setTutorCustomBlockIds={shellOverrides?.setTutorCustomBlockIds as never}
        primingMethodIds={shellOverrides?.primingMethodIds as never}
        primingChainId={shellOverrides?.primingChainId as never}
        primingCustomBlockIds={shellOverrides?.primingCustomBlockIds as never}
        setPrimingMethodIds={shellOverrides?.setPrimingMethodIds as never}
        setPrimingChainId={shellOverrides?.setPrimingChainId as never}
        setPrimingCustomBlockIds={shellOverrides?.setPrimingCustomBlockIds as never}
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
      />
    );
  }

  return render(<Harness />, { wrapper });
}

function renderTutorShellTutorHarness() {
  const wrapper = createQueryWrapper();

  function Harness() {
    const [studioView, setStudioView] = useState<WorkflowView>("home");
    const [panelLayout, setPanelLayout] = useState(
      buildStudioShellPresetLayout("full_studio"),
    );

    const workflow = useMemo(
      () =>
        makeWorkflowWithOverrides(studioView, {
          activeWorkflowId: 77,
          openWorkflowPolish: vi.fn(() => {
            setStudioView("polish");
          }),
        }),
      [studioView],
    );

    return (
      <TutorShell
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
        tutorChainId={undefined}
        tutorCustomBlockIds={[]}
        setActiveBoardScope={vi.fn()}
        setActiveBoardId={vi.fn()}
        setViewerState={vi.fn()}
        setShowSetup={vi.fn()}
        queryClient={new QueryClient()}
        panelLayout={panelLayout as never}
        setPanelLayout={setPanelLayout as never}
        setTutorChainId={vi.fn()}
        setTutorCustomBlockIds={vi.fn()}
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

  it("uses the Source Shelf Library tab as a real working surface for browsing and staging materials", async () => {
    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedObjectiveGroup: "Week 7",
        topic: "Cardiac output",
        selectedMaterials: [101],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
          {
            id: 102,
            title: "Afterload Drill",
            file_type: "txt",
            source_path: "uploads/afterload-drill.txt",
          },
        ],
        derivedVaultFolder: "Exercise Physiology/Week 7",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    await userEvent.click(within(sourceShelf).getByRole("button", { name: /^library$/i }));

    expect(sourceShelf).toHaveTextContent("Library Sources");
    expect(sourceShelf).toHaveTextContent("Afterload Drill");

    await userEvent.click(
      within(sourceShelf).getByRole("button", {
        name: /open afterload drill in document dock/i,
      }),
    );
    expect(screen.getByTestId("studio-document-dock")).toHaveTextContent(
      "Afterload Drill",
    );

    await userEvent.click(
      within(sourceShelf).getByRole("button", {
        name: /add afterload drill to workspace/i,
      }),
    );
    expect(
      within(sourceShelf).getByRole("button", {
        name: /afterload drill already in workspace/i,
      }),
    ).toHaveTextContent("In Workspace");
  });

  it("uses the Source Shelf Vault tab as a real working surface for browsing and staging linked paths", async () => {
    renderTutorShell("workspace", {
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedObjectiveGroup: "Week 7",
        topic: "Cardiac output",
        selectedMaterials: [101],
        selectedPaths: [
          "Exercise Physiology/Week 7/Cardio.md",
          "Exercise Physiology/Week 7/Afterload.md",
        ],
        chatMaterials: [
          {
            id: 101,
            title: "Cardiac Output Lecture",
            file_type: "pdf",
            source_path: "uploads/cardio-output.pdf",
          },
        ],
        derivedVaultFolder: "Exercise Physiology/Week 7",
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    await userEvent.click(within(sourceShelf).getByRole("button", { name: /^vault$/i }));

    expect(sourceShelf).toHaveTextContent("Linked Vault Paths");
    expect(sourceShelf).toHaveTextContent("Exercise Physiology/Week 7/Cardio.md");
    expect(sourceShelf).toHaveTextContent("Exercise Physiology/Week 7/Afterload.md");

    await userEvent.click(
      within(sourceShelf).getByRole("button", {
        name: /add exercise physiology\/week 7\/afterload\.md to workspace/i,
      }),
    );

    expect(
      within(sourceShelf).getByRole("button", {
        name: /exercise physiology\/week 7\/afterload\.md already in workspace/i,
      }),
    ).toHaveTextContent("In Workspace");
  });

  it("shows a minimal entry state when the canvas has no open panels", async () => {
    renderTutorShell("home", {
      shellOverrides: {
        panelLayout: [],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-entry-state")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-document-dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-run-config")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-prime-packet")).not.toBeInTheDocument();
  });

  it("shows the centered start card and opens the Priming preset from the empty canvas", async () => {
    const user = userEvent.setup();

    renderTutorShell("home", {
      activeSessionId: null,
      sessionOverrides: {
        hasActiveTutorSession: false,
      },
      hubOverrides: {
        courseLabel: "Exercise Physiology",
        selectedObjectiveGroup: "Week 7",
        topic: "Cardiac output",
      },
      shellOverrides: {
        panelLayout: [],
      },
    });

    expect(await screen.findByTestId("studio-entry-state")).toHaveTextContent(
      "Exercise Physiology",
    );

    await user.click(screen.getByRole("button", { name: /start priming/i }));

    expect(screen.queryByTestId("studio-entry-state")).not.toBeInTheDocument();
    expect(await screen.findByTestId("studio-priming-panel")).toBeInTheDocument();
  });

  it("shows the active run configuration summary inside Run Config", async () => {
    renderTutorShell("priming", {
      workflowOverrides: {
        primingMethods: ["summary", "concept-map", "gaps"],
      },
      shellOverrides: {
        tutorChainId: 12,
        tutorCustomBlockIds: [],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const runConfig = screen.getByTestId("studio-run-config");
    expect(runConfig).toHaveTextContent("3 priming methods selected");
    expect(runConfig).toHaveTextContent("Template chain selected");
    expect(runConfig).toHaveTextContent("Chain #12");
    expect(runConfig).toHaveTextContent("Tutor start mode");
  });

  it("routes Run Config controls through Priming-owned, Tutor-owned, and runtime-rule setters", async () => {
    const user = userEvent.setup();
    const setPrimingMethods = vi.fn();
    const setTutorChainId = vi.fn();
    const setTutorCustomBlockIds = vi.fn();
    const setAccuracyProfile = vi.fn();
    const setObjectiveScope = vi.fn();
    getTemplateChainsMock.mockResolvedValueOnce([
      {
        id: 17,
        title: "Cardio Deep Dive",
        description: "",
        blocks: [],
      },
    ]);

    renderTutorShell("workspace", {
      hubOverrides: {
        accuracyProfile: "strict",
        objectiveScope: "module_all",
        setAccuracyProfile,
        setObjectiveScope,
      },
      workflowOverrides: {
        primingMethods: ["M-PRE-010", "M-PRE-008"],
        setPrimingMethods,
      },
      shellOverrides: {
        tutorChainId: 5,
        tutorCustomBlockIds: [11, 12],
        setTutorChainId,
        setTutorCustomBlockIds,
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const runConfig = screen.getByTestId("studio-run-config");

    await user.click(
      within(runConfig).getByRole("button", {
        name: /Concept Map/i,
      }),
    );
    expect(setPrimingMethods).toHaveBeenCalledWith([
      "M-PRE-010",
      "M-PRE-008",
      "M-PRE-005",
    ]);

    await user.selectOptions(
      within(runConfig).getByLabelText(/Tutor chain/i),
      "17",
    );
    expect(setTutorChainId).toHaveBeenCalledWith(17);
    expect(setTutorCustomBlockIds).toHaveBeenCalledWith([]);

    fireEvent.change(within(runConfig).getByLabelText(/Tutor custom block ids/i), {
      target: { value: "21, 34" },
    });
    expect(setTutorCustomBlockIds).toHaveBeenLastCalledWith([21, 34]);
    expect(setTutorChainId).toHaveBeenLastCalledWith(undefined);

    await user.selectOptions(
      within(runConfig).getByLabelText(/Accuracy profile/i),
      "balanced",
    );
    expect(setAccuracyProfile).toHaveBeenCalledWith("balanced");

    await user.selectOptions(
      within(runConfig).getByLabelText(/Objective scope/i),
      "single_focus",
    );
    expect(setObjectiveScope).toHaveBeenCalledWith("single_focus");
  });

  it("renders a Priming selector bar that updates Priming-owned state without mutating Tutor selectors", async () => {
    const user = userEvent.setup();
    const setPrimingMethodIds = vi.fn();
    const setPrimingChainId = vi.fn();
    const setTutorChainId = vi.fn();

    getTemplateChainsMock.mockResolvedValueOnce([
      {
        id: 17,
        name: "Cardio Deep Dive",
        title: "Cardio Deep Dive",
        description: "",
        blocks: [],
      },
    ]);

    renderTutorShell("workspace", {
      workflowOverrides: {
        primingMethods: ["M-PRE-010"],
      },
      shellOverrides: {
        primingMethodIds: ["M-PRE-010"],
        primingChainId: undefined,
        setPrimingMethodIds,
        setPrimingChainId,
        tutorChainId: 41,
        setTutorChainId,
      },
    });

    const primingPanel = await screen.findByTestId("studio-priming-panel");
    expect(
      within(primingPanel).getByTestId("priming-selector-bar"),
    ).toBeInTheDocument();

    await user.click(
      within(primingPanel).getByRole("button", { name: /bridge/i }),
    );
    expect(setPrimingMethodIds).toHaveBeenCalledWith(["M-PRE-010", "M-PRE-008"]);
    expect(setTutorChainId).not.toHaveBeenCalled();

    await user.selectOptions(
      within(primingPanel).getByLabelText(/priming chain template/i),
      "template:17",
    );
    expect(setPrimingChainId).toHaveBeenCalledWith(17);
    expect(setTutorChainId).not.toHaveBeenCalled();
  });

  it("renders a Tutor selector bar above the behavior controls and keeps Tutor selectors independent from Priming", async () => {
    const user = userEvent.setup();
    const setTutorChainId = vi.fn();
    const setPrimingChainId = vi.fn();

    getTemplateChainsMock.mockResolvedValueOnce([
      {
        id: 23,
        name: "Teach Back Chain",
        title: "Teach Back Chain",
        description: "",
        blocks: [],
      },
    ]);

    renderTutorShell("workspace", {
      activeSessionId: "sess-1",
      sessionOverrides: {
        hasActiveTutorSession: true,
      },
      shellOverrides: {
        tutorChainId: undefined,
        setTutorChainId,
        primingChainId: 17,
        setPrimingChainId,
      },
    });

    const tutorPanel = await screen.findByTestId("studio-tutor-panel");
    expect(within(tutorPanel).getByTestId("tutor-selector-bar")).toBeInTheDocument();
    expect(within(tutorPanel).getByText("ASK / SOCRATIC")).toBeInTheDocument();
    expect(
      within(tutorPanel).getByRole("button", { name: /voice dictation/i }),
    ).toBeInTheDocument();

    await user.selectOptions(
      within(tutorPanel).getByLabelText(/tutor chain template/i),
      "template:23",
    );
    expect(setTutorChainId).toHaveBeenCalledWith(23);
    expect(setPrimingChainId).not.toHaveBeenCalled();
  });

  it("reduces Priming chrome to source context, run config, and Prime Packet", async () => {
    renderTutorShell("priming", {
      shellOverrides: {
        panelLayout: buildStudioShellPresetLayout("priming"),
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-source-shelf")).toBeInTheDocument();
    expect(screen.getByTestId("studio-document-dock")).toBeInTheDocument();
    expect(screen.getByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(screen.getByTestId("studio-run-config")).toBeInTheDocument();
    expect(screen.getByTestId("studio-prime-packet")).toBeInTheDocument();
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

  it("projects backend compaction telemetry into Tutor Status and Memory", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        turnCount: 1,
        latestCommittedAssistantMessage: {
          role: "assistant",
          content: "Short answer.",
        },
        stageTimerDisplaySeconds: 90,
        stageTimerRunning: true,
      },
      shellOverrides: {
        runtimeState: {
          activeMemoryCapsuleId: null,
          compactionTelemetry: {
            inputTokens: 12_000,
            outputTokens: 3_600,
            tokenCount: 15_600,
            contextWindow: 24_000,
            pressureLevel: "high",
          },
          directNoteSaveStatus: null,
        },
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    expect(screen.getByTestId("studio-tutor-status")).toHaveTextContent(
      "Using 15,600 / 24,000 tokens of live context.",
    );
    expect(screen.getByTestId("studio-memory")).toHaveTextContent(
      "Using 15,600 / 24,000 tokens of live context.",
    );
  });

  it("shows persisted direct vault note-save status inside Tutor Status", async () => {
    renderTutorShell("workspace", {
      shellOverrides: {
        runtimeState: {
          activeMemoryCapsuleId: null,
          compactionTelemetry: null,
          directNoteSaveStatus: {
            state: "saved",
            mode: "exact",
            path: "Courses/Exercise Physiology/Tutor Notes/Week 7 Study Plan/Exact - Cardiac output.md",
          },
        },
      },
    });

    expect(await screen.findByTestId("studio-tutor-status")).toBeInTheDocument();
    expect(screen.getByTestId("studio-tutor-status")).toHaveTextContent("Saved to vault");
    expect(screen.getByTestId("studio-tutor-status")).toHaveTextContent(
      "Courses/Exercise Physiology/Tutor Notes/Week 7 Study Plan/Exact - Cardiac output.md",
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

  it("lets the user activate a specific memory capsule from the Memory panel", async () => {
    const user = userEvent.setup();
    const setActiveMemoryCapsuleId = vi.fn();

    renderTutorShell("workspace", {
      workflowOverrides: {
        activeWorkflowDetail: {
          memory_capsules: [
            {
              id: 7,
              capsule_version: 1,
              summary_text: "Established the first hemodynamics summary.",
              current_objective: "Cardiac output",
              created_at: "2026-03-25T10:30:00Z",
            },
            {
              id: 8,
              capsule_version: 2,
              summary_text: "Captured the misconception about preload versus heart rate.",
              current_objective: "Preload versus heart rate",
              created_at: "2026-03-25T11:45:00Z",
            },
          ],
        },
      },
      shellOverrides: {
        runtimeState: {
          activeMemoryCapsuleId: 7,
          compactionTelemetry: null,
          directNoteSaveStatus: null,
        },
        setActiveMemoryCapsuleId,
      },
    });

    expect(await screen.findByTestId("studio-memory")).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId("studio-memory")).getByRole("button", {
        name: /resume from capsule v2/i,
      }),
    );

    expect(setActiveMemoryCapsuleId).toHaveBeenCalledWith(8);
  });

  it("saves the Tutor exact note directly to the vault from the Tutor panel", async () => {
    const user = userEvent.setup();
    const saveWorkflowNoteToVault = vi.fn();
    const setDirectNoteSaveStatus = vi.fn();

    renderTutorShell("workspace", {
      activeSessionId: "sess-1",
      workflowOverrides: {
        activeWorkflowId: "wf-1",
        exactNoteTitle: "Cardiac output",
        exactNoteContent: "Stroke volume x heart rate.",
        saveWorkflowNoteToVault: saveWorkflowNoteToVault.mockResolvedValue({
          state: "saved",
          mode: "exact",
          path: "Courses/Exercise Physiology/Tutor Notes/Week 7 Study Plan/Exact - Cardiac output.md",
        }),
      },
      shellOverrides: {
        setDirectNoteSaveStatus,
      },
    });

    expect(await screen.findByTestId("mock-tutor-chat")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /save exact to vault/i }),
    );

    expect(saveWorkflowNoteToVault).toHaveBeenCalledWith("exact");

    await waitFor(() => {
      expect(setDirectNoteSaveStatus).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          state: "saving",
          mode: "exact",
        }),
      );
      expect(setDirectNoteSaveStatus).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          state: "saved",
          mode: "exact",
          path: "Courses/Exercise Physiology/Tutor Notes/Week 7 Study Plan/Exact - Cardiac output.md",
        }),
      );
    });
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
    renderTutorShell("polish", {
      shellOverrides: {
        panelLayout: buildStudioShellPresetLayout("polish"),
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-polish-panel")).toBeInTheDocument();
    expect(screen.getByTestId("studio-polish-packet")).toBeInTheDocument();
    expect(screen.getByTestId("studio-workspace-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-source-shelf")).not.toBeInTheDocument();
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

  it("removes the tldraw vendor CTA from the shipped workspace surface", async () => {
    renderTutorShell("workspace");

    await screen.findByTestId("studio-tldraw-workspace");

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: /get a license for production/i }),
      ).not.toBeInTheDocument();
    });
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

  it("runs the prep loop from Source Shelf into Document Dock, Workspace, and Prime Packet", async () => {
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
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    const documentDock = screen.getByTestId("studio-document-dock");
    const workspace = screen.getByTestId("studio-tldraw-workspace");
    const primePacket = screen.getByTestId("studio-prime-packet");

    await user.click(
      within(sourceShelf).getByRole("button", {
        name: /Open Cardiac Output Lecture in Document Dock/i,
      }),
    );

    expect(documentDock).toHaveTextContent("Cardiac Output Lecture");

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

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Clip excerpt to workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("Workspace Excerpts");

    await user.click(
      within(workspace).getByRole("button", {
        name: /Promote excerpt: Cardiac Output Lecture to Prime Packet/i,
      }),
    );

    expect(primePacket).toHaveTextContent("Workspace Excerpt");
    expect(primePacket).toHaveTextContent(
      "Cardiac output depends on stroke volume",
    );
  });

  it("supports multiple Document Dock tabs and clips from the active selected tab", async () => {
    const user = userEvent.setup();
    getMaterialContentMock.mockImplementation(async (materialId: number) => {
      if (materialId === 101) {
        return {
          title: "Cardiac Output Lecture",
          file_type: "txt",
          content:
            "Cardiac output depends on stroke volume and heart rate for each beat.",
        };
      }

      if (materialId === 102) {
        return {
          title: "Afterload Drill",
          file_type: "txt",
          content:
            "Afterload rises when aortic pressure increases during systole.",
        };
      }

      return { content: "" };
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
          {
            id: 102,
            title: "Afterload Drill",
            file_type: "txt",
            source_path: "uploads/afterload-drill.txt",
          },
        ],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();

    const sourceShelf = screen.getByTestId("studio-source-shelf");
    const documentDock = screen.getByTestId("studio-document-dock");
    const workspace = screen.getByTestId("studio-tldraw-workspace");

    await user.click(
      within(sourceShelf).getByRole("button", {
        name: /Open Cardiac Output Lecture in Document Dock/i,
      }),
    );

    expect(
      await within(documentDock).findByRole("button", {
        name: /Cardiac Output Lecture/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByText(
        /Cardiac output depends on stroke volume and heart rate/i,
      ),
    ).toBeInTheDocument();

    await user.click(within(sourceShelf).getByRole("button", { name: /^library$/i }));
    await user.click(
      within(sourceShelf).getByRole("button", {
        name: /Open Afterload Drill in Document Dock/i,
      }),
    );

    expect(
      await within(documentDock).findByRole("button", {
        name: /Afterload Drill/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByText(/Afterload rises when aortic pressure increases/i),
    ).toBeInTheDocument();

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Cardiac Output Lecture/i,
      }),
    );
    expect(
      await within(documentDock).findByRole("button", {
        name: /Cardiac Output Lecture/i,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByText(
        /Cardiac output depends on stroke volume and heart rate/i,
      ),
    ).toBeInTheDocument();

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Afterload Drill/i,
      }),
    );
    expect(
      await screen.findByText(/Afterload rises when aortic pressure increases/i),
    ).toBeInTheDocument();

    const selectedPassage = within(documentDock).getByLabelText(/Selected passage/i);
    await user.clear(selectedPassage);
    await user.type(
      selectedPassage,
      "Afterload rises when aortic pressure increases during systole.",
    );

    await user.click(
      within(documentDock).getByRole("button", {
        name: /Clip excerpt to workspace/i,
      }),
    );

    expect(workspace).toHaveTextContent("Afterload Drill");
    expect(workspace).toHaveTextContent(
      "Afterload rises when aortic pressure increases during systole.",
    );
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

  it("starts a Tutor session from the Tutor panel using Prime Packet context", async () => {
    const user = userEvent.setup();
    const startSession = vi.fn().mockResolvedValue({
      session_id: "sess-started",
    });

    renderTutorShell("workspace", {
      activeSessionId: null,
      sessionOverrides: {
        startSession,
        hasActiveTutorSession: false,
        activeSessionStatus: null,
      },
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
      },
    });

    expect(await screen.findByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start session/i }));

    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        packet_context: expect.stringContaining("Cardiac Output Lecture"),
      }),
    );
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        packet_context: expect.stringContaining(
          "Cardiac output sets whole-body perfusion.",
        ),
      }),
    );
  });

  it("passes the active memory capsule into Tutor start-session context", async () => {
    const user = userEvent.setup();
    const startSession = vi.fn().mockResolvedValue({
      session_id: "sess-started",
    });

    renderTutorShell("workspace", {
      activeSessionId: null,
      sessionOverrides: {
        startSession,
        hasActiveTutorSession: false,
        activeSessionStatus: null,
      },
      workflowOverrides: {
        activeWorkflowDetail: {
          memory_capsules: [
            {
              id: 42,
              capsule_version: 3,
              summary_text:
                "Learner still mixes preload determinants with heart-rate control.",
              rule_snapshot_text:
                "Always force a function confirmation before L4 precision.",
              current_objective:
                "Differentiate preload determinants from chronotropy.",
              study_unit: "Hemodynamics",
              weak_points: [],
              unresolved_questions: [],
              exact_notes: [],
              editable_notes: [],
              feedback: [],
              card_requests: [],
              artifact_refs: [],
              source_turn_ids: [],
              created_at: "2026-03-26T09:00:00Z",
            },
          ],
        },
      },
      shellOverrides: {
        runtimeState: {
          activeMemoryCapsuleId: 42,
          compactionTelemetry: null,
          directNoteSaveStatus: null,
        },
      },
    });

    expect(await screen.findByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start session/i }));

    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        memory_capsule_context: expect.stringContaining(
          "Learner still mixes preload determinants with heart-rate control.",
        ),
      }),
    );
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        memory_capsule_context: expect.stringContaining(
          "Differentiate preload determinants from chronotropy.",
        ),
      }),
    );
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        memory_capsule_context: expect.stringContaining(
          "Always force a function confirmation before L4 precision.",
        ),
      }),
    );
  });

  it("activates the newly created memory capsule after Tutor compaction", async () => {
    const user = userEvent.setup();
    const quickCompactWorkflowMemory = vi.fn().mockResolvedValue({
      id: 99,
      capsule_version: 4,
    });
    const setActiveMemoryCapsuleId = vi.fn();

    renderTutorShell("workspace", {
      activeSessionId: "sess-1",
      workflowOverrides: {
        quickCompactWorkflowMemory,
      },
      shellOverrides: {
        setActiveMemoryCapsuleId,
      },
    });

    expect(await screen.findByTestId("mock-tutor-chat")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /compact tutor memory/i }),
    );

    expect(quickCompactWorkflowMemory).toHaveBeenCalledTimes(1);
    expect(setActiveMemoryCapsuleId).toHaveBeenCalledWith(99);
  });

  it("does not treat a stale Tutor session id as a live Tutor pane", async () => {
    renderTutorShell("workspace", {
      activeSessionId: "sess-stale",
      sessionOverrides: {
        hasActiveTutorSession: false,
        activeSessionStatus: "completed",
      },
    });

    expect(await screen.findByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-tutor-chat")).not.toBeInTheDocument();
  });

  it("restores Priming, Tutor, and Polish as floating Studio panels from StudioRun layout", async () => {
    renderTutorShell("workspace", {
      sessionOverrides: {
        hasActiveTutorSession: false,
        activeSessionStatus: null,
      },
      shellOverrides: {
        panelLayout: [
          {
            id: "panel-priming",
            panel: "priming",
            position: { x: 1600, y: 100 },
            size: { width: 680, height: 440 },
            zIndex: 10,
            collapsed: false,
          },
          {
            id: "panel-tutor",
            panel: "tutor",
            position: { x: 1600, y: 560 },
            size: { width: 680, height: 520 },
            zIndex: 11,
            collapsed: false,
          },
          {
            id: "panel-polish",
            panel: "polish",
            position: { x: 2300, y: 100 },
            size: { width: 680, height: 440 },
            zIndex: 12,
            collapsed: false,
          },
        ],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(screen.getByTestId("studio-tutor-panel")).toBeInTheDocument();
    expect(screen.getByTestId("studio-polish-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mock-priming-panel")).toBeInTheDocument();
    expect(within(screen.getByTestId("studio-tutor-panel")).getByText("READY TO RUN A STUDY SESSION")).toBeInTheDocument();
    expect(screen.getByTestId("mock-polish-panel")).toBeInTheDocument();
  });

  it("renders a toolbar-driven canvas instead of stage navigation", async () => {
    renderTutorShell("home", {
      workflowOverrides: {
        activeWorkflowDetail: null,
      },
      shellOverrides: {
        panelLayout: [],
      },
    });

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.getByTestId("studio-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("studio-canvas")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-stage-nav")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open source shelf panel/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open priming panel/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open tutor panel/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open polish panel/i }),
    ).toBeInTheDocument();
  });

  it("lets the user open priming, tutor, and polish panels from the toolbar at the same time", async () => {
    const user = userEvent.setup();
    renderTutorShell("home", {
      workflowOverrides: {
        activeWorkflowDetail: null,
      },
      shellOverrides: {
        panelLayout: [],
      },
    });

    await user.click(
      await screen.findByRole("button", { name: /open priming panel/i }),
    );
    await user.click(screen.getByRole("button", { name: /open tutor panel/i }));
    await user.click(screen.getByRole("button", { name: /open polish panel/i }));

    expect(await screen.findByTestId("studio-priming-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-tutor-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("studio-polish-panel")).toBeInTheDocument();
  });

  it.each([
    ["workspace", "studio-tldraw-workspace"],
    ["priming", "mock-priming-panel"],
    ["polish", "mock-polish-panel"],
  ] as const)(
    "keeps the %s Studio view inside StudioShell",
    async (studioView, testId) => {
      renderTutorShell(studioView);

      expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
      expect(await screen.findByTestId(testId)).toBeInTheDocument();
    },
  );

  it("keeps Final Sync out of the floating panel registry", async () => {
    renderTutorShell("final_sync");

    expect(await screen.findByTestId("studio-shell")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open final sync panel/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-final-sync-panel")).not.toBeInTheDocument();
  });
});
