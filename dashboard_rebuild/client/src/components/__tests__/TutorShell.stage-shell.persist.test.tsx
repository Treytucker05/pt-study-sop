import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderPersistHarness(viewerState: Record<string, unknown> | null) {
  const setViewerState = vi.fn();
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
    openStudioPriming: vi.fn(),
    runWorkflowPrimingAssist: vi.fn(),
    applyPrimingDisplayedRun: vi.fn(),
  } as unknown as UseTutorWorkflowReturn;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TutorShell
        hub={hub}
        session={session}
        workflow={workflow}
        showSetup={false}
        viewerState={viewerState}
        setViewerState={setViewerState}
        panelLayout={[]}
        setPanelLayout={vi.fn()}
        queryClient={queryClient}
      />
    </QueryClientProvider>,
  );

  return { setViewerState };
}

describe("TutorShell stage shell persistence", () => {
  it("restores active tab and board layout from viewer_state", () => {
    renderPersistHarness({
      stage_shell_v1: true,
      active_tab: "prime",
      board_layout_mode: "collapsed",
    });

    expect(screen.getByTestId("tutor-stage-prime")).toBeVisible();
    expect(screen.getByTestId("tutor-session-board-root")).toHaveAttribute(
      "data-layout",
      "collapsed",
    );
  });

  it("writes active tab and board layout back to viewer_state", async () => {
    const user = userEvent.setup();
    const { setViewerState } = renderPersistHarness({
      stage_shell_v1: true,
      active_tab: "read",
      board_layout_mode: "split",
    });

    await user.click(screen.getByTestId("tutor-stage-tab-prime"));

    expect(setViewerState).toHaveBeenCalled();
    const lastCall = setViewerState.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall).toMatchObject({
      stage_shell_v1: true,
      active_tab: "prime",
      board_layout_mode: "split",
    });
  });
});
