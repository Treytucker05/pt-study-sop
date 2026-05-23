import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TutorShell } from "@/components/TutorShell";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";

vi.mock("@/components/TutorErrorBoundary", () => ({
  TutorErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/tutor-shell/TutorShellDeferredPanels", () => ({
  TutorWorkflowPrimingPanelLazy: () => (
    <div data-testid="mock-priming-panel">priming</div>
  ),
  TutorWorkflowPolishStudioLazy: () => (
    <div data-testid="mock-polish-panel">polish</div>
  ),
}));

vi.mock("@/components/tutor-shell/TutorLiveStudyPane", () => ({
  TutorLiveStudyPane: () => <div data-testid="mock-tutor-live">tutor</div>,
}));

vi.mock("@/components/studio/StudioWorkspaceUnified", () => ({
  StudioWorkspaceUnified: () => (
    <div data-testid="studio-tldraw-workspace">workspace</div>
  ),
}));

vi.mock("@/components/studio/SourceShelf", () => ({
  SourceShelf: () => <div data-testid="source-shelf-content">shelf</div>,
}));

vi.mock("@/components/studio/StudioDocumentDock", () => ({
  StudioDocumentDock: () => <div data-testid="studio-document-dock">dock</div>,
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getTemplateChains: vi.fn().mockResolvedValue([]),
      getMethodBlocks: vi.fn().mockResolvedValue([]),
    },
  },
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

function buildMinimalTutorShellProps(viewerState: Record<string, unknown> | null) {
  const hub = {
    courseId: 1,
    courseLabel: "Test",
    topic: "Topic",
    selectedMaterials: [],
    selectedPaths: [],
    chatMaterials: [],
    courseFolders: [],
    derivedVaultFolder: null,
    effectiveStudyUnit: null,
    effectiveTopic: null,
    getCourseMaterialIds: vi.fn(() => []),
    setSelectedMaterials: vi.fn(),
    setSelectedPaths: vi.fn(),
    accuracyProfile: "balanced",
    setAccuracyProfile: vi.fn(),
    objectiveScope: "course",
    setObjectiveScope: vi.fn(),
    tutorContentSources: { courses: [] },
    tutorHub: null,
  } as unknown as UseTutorHubReturn;

  const session = {
    hasActiveTutorSession: false,
    isStarting: false,
    scholarStrategy: null,
    artifacts: [],
    turnCount: 0,
  } as unknown as UseTutorSessionReturn;

  const workflow = {
    activeWorkflowId: null,
    activeWorkflowDetail: null,
    primingMethods: [],
    setPrimingMethods: vi.fn(),
    primingMethodRuns: [],
    mergedPrimingSourceInventory: [],
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
    primingReadinessItems: [],
    savingPrimingBundle: false,
    runningPrimingAssist: false,
    primingAssistTargetMaterialId: null,
    savingPolishBundle: false,
    setPolishDraftPreview: vi.fn(),
    openStudioPriming: vi.fn(),
    runWorkflowPrimingAssist: vi.fn(),
    applyPrimingDisplayedRun: vi.fn(),
  } as unknown as UseTutorWorkflowReturn;

  return {
    hub,
    session,
    workflow,
    showSetup: false,
    viewerState,
    panelLayout: [],
    setPanelLayout: vi.fn(),
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
  };
}

function renderTutorShellWithViewerState(
  viewerState: Record<string, unknown> | null,
) {
  const props = buildMinimalTutorShellProps(viewerState);
  return render(
    <QueryClientProvider client={props.queryClient}>
      <TutorShell {...props} />
    </QueryClientProvider>,
  );
}

describe("TutorShell stage shell flag", () => {
  it("renders TutorStageShell when stage_shell_v1 is enabled", () => {
    renderTutorShellWithViewerState({ stage_shell_v1: true });

    expect(screen.getByTestId("tutor-stage-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-canvas")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-transform-wrapper")).not.toBeInTheDocument();
    expect(screen.getByTestId("tutor-session-board")).toBeInTheDocument();
  });

  it("renders legacy StudioShell when stage_shell_v1 is false", () => {
    renderTutorShellWithViewerState({ stage_shell_v1: false });

    expect(screen.getByTestId("studio-shell")).toBeInTheDocument();
    expect(screen.queryByTestId("tutor-stage-shell")).not.toBeInTheDocument();
  });
});
