import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { TutorWorkflowPrimingPanel } from "@/components/TutorWorkflowPrimingPanel";

const { getPrimeMethodsMock } = vi.hoisted(() => ({
  getPrimeMethodsMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    methods: {
      getAll: (...args: unknown[]) => getPrimeMethodsMock(...args),
    },
  },
}));

vi.mock("@/components/MaterialSelector", () => ({
  MaterialSelector: () => <div data-testid="material-selector">material selector</div>,
}));

vi.mock("@/components/priming/PrimingMaterialReader", () => ({
  PrimingMaterialReader: () => <div data-testid="priming-material-reader">material reader</div>,
}));

vi.mock("@/components/ObsidianRenderer", () => ({
  ObsidianRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="structured-map-preview">structured map</div>,
}));

vi.mock("@/components/TutorChainBuilder", () => ({
  TutorChainBuilder: () => <div data-testid="tutor-chain-builder">chain builder</div>,
}));

vi.mock("@/components/MethodBlockCard", () => ({
  default: ({
    block,
    onClick,
  }: {
    block: { name: string; method_id?: string | null };
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {block.name}
    </button>
  ),
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

describe("TutorWorkflowPrimingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrimeMethodsMock.mockResolvedValue([
      {
        id: 201,
        method_id: "M-PRE-010",
        name: "Learning Objectives Primer",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prime objectives first.",
        outputs_summary: "ObjectiveList",
      },
      {
        id: 202,
        method_id: "M-PRE-013",
        name: "Big-Picture Orientation Summary",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prime orientation summary.",
        outputs_summary: "OrientationSummary",
      },
    ]);
  });

  it("keeps the workspace blank below method cards until at least one method is selected", async () => {
    const setPrimingMethods = vi.fn();
    const wrapper = createWrapper();

    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "VO2 max",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic=""
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup="Week 7"
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[]}
        studyUnitOptions={[]}
        primingMethods={[]}
        setPrimingMethods={setPrimingMethods}
        primingMethodRuns={[]}
        chainId={1}
        setChainId={vi.fn()}
        customBlockIds={[]}
        setCustomBlockIds={vi.fn()}
        templateChains={[
          {
            id: 1,
            name: "First Exposure Core",
            description: "Teach-first chain",
            context_tags: "first-exposure",
            blocks: [
              { id: 1, name: "Prime", control_stage: "PRIME", category: "PRIME", duration: 12 },
              { id: 2, name: "Teach", control_stage: "TEACH", category: "TEACH", duration: 15 },
            ],
          },
        ] as never}
        templateChainsLoading={false}
        summaryText="Summary output"
        setSummaryText={vi.fn()}
        conceptsText="Concept A"
        setConceptsText={vi.fn()}
        terminologyText="Term :: definition"
        setTerminologyText={vi.fn()}
        rootExplanationText="Root map"
        setRootExplanationText={vi.fn()}
        gapsText="Potential ambiguity"
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[
          {
            id: 101,
            title: "Lecture 1",
            source_path: "Course/Week7/Lecture1.pdf",
            method_outputs: [
              {
                method_id: "M-PRE-010",
                method_name: "Learning Objectives Primer",
                output_family: "learning_objectives",
                outputs: {
                  learning_objectives: [
                    { lo_code: "LO-1", title: "Explain cardiac output regulation" },
                    { title: "Differentiate stroke volume modifiers" },
                  ],
                },
                source_ids: [101],
                status: "complete",
                updated_at: "2026-03-21T04:00:00Z",
              },
            ],
          },
        ] as never}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
          { label: "Handoff notes", ready: false, detail: "Still needs final note review." },
        ]}
        preflightBlockers={[]}
        preflightLoading={false}
        preflightError={null}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME");
    });

    expect(screen.queryByRole("button", { name: /extract prime/i })).not.toBeInTheDocument();
    expect(screen.queryByText("SELECTED PRIME METHOD WINDOWS")).not.toBeInTheDocument();
    expect(screen.queryByText("LEGACY PRIME OUTPUTS")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIME BOUNDARY")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /learning objectives primer/i }));

    expect(setPrimingMethods).toHaveBeenCalledWith(["M-PRE-010"]);
  });

  it("renders the method-driven workspace, removes priming chains, and shows selected method windows", async () => {
    const setPrimingMethods = vi.fn();
    const wrapper = createWrapper();

    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "VO2 max",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic=""
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup="Week 7"
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[]}
        studyUnitOptions={[]}
        primingMethods={["M-PRE-013"]}
        setPrimingMethods={setPrimingMethods}
        primingMethodRuns={[]}
        chainId={1}
        setChainId={vi.fn()}
        customBlockIds={[]}
        setCustomBlockIds={vi.fn()}
        templateChains={[
          {
            id: 1,
            name: "First Exposure Core",
            description: "Teach-first chain",
            context_tags: "first-exposure",
            blocks: [
              { id: 1, name: "Prime", control_stage: "PRIME", category: "PRIME", duration: 12 },
              { id: 2, name: "Teach", control_stage: "TEACH", category: "TEACH", duration: 15 },
            ],
          },
        ] as never}
        templateChainsLoading={false}
        summaryText="Summary output"
        setSummaryText={vi.fn()}
        conceptsText="Concept A"
        setConceptsText={vi.fn()}
        terminologyText="Term :: definition"
        setTerminologyText={vi.fn()}
        rootExplanationText="Root map"
        setRootExplanationText={vi.fn()}
        gapsText=""
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[]}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
          { label: "Handoff notes", ready: false, detail: "Still needs final note review." },
        ]}
        preflightBlockers={[]}
        preflightLoading={false}
        preflightError={null}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME");
    });

    const setupHeading = screen.getByText("SETUP");
    const workspaceHeading = screen.getByText("PRIME ARTIFACT WORKSPACE");
    const viewerHeading = screen.getByText("SOURCE VIEWER");

    expect(setupHeading.compareDocumentPosition(workspaceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(workspaceHeading.compareDocumentPosition(viewerHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByText("TUTOR LAUNCH CONTRACT")).toBeInTheDocument();
    expect(screen.getByText("PRIMING METHODS")).toBeInTheDocument();
    expect(screen.getByText("SELECTED PRIME METHOD WINDOWS")).toBeInTheDocument();
    expect(screen.getByText("TUTOR CHAIN")).toBeInTheDocument();
    expect(screen.getByText("WORKFLOW CONTEXT")).toBeInTheDocument();
    expect(screen.queryByText("PRIMING CHAIN")).not.toBeInTheDocument();
    expect(screen.queryByText("CHAIN PREVIEW")).not.toBeInTheDocument();
    expect(
      screen.getByText("Reference-only view of the materials in scope. Extraction now runs from the PRIME workspace above."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /extract prime/i })).toBeInTheDocument();
    expect(screen.getAllByText("Big-Picture Orientation Summary").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: /learning objectives primer/i }));

    expect(setPrimingMethods).toHaveBeenCalledWith(["M-PRE-013", "M-PRE-010"]);
  });

  it("shows Tutor launch blockers inline and disables ready/start actions", async () => {
    const wrapper = createWrapper();

    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "VO2 max",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic="VO2 max"
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup=""
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[]}
        studyUnitOptions={[]}
        primingMethods={["M-PRE-010"]}
        setPrimingMethods={vi.fn()}
        primingMethodRuns={[]}
        chainId={undefined}
        setChainId={vi.fn()}
        customBlockIds={[]}
        setCustomBlockIds={vi.fn()}
        templateChains={[]}
        templateChainsLoading={false}
        summaryText="Summary output"
        setSummaryText={vi.fn()}
        conceptsText="Concept A"
        setConceptsText={vi.fn()}
        terminologyText="Term :: definition"
        setTerminologyText={vi.fn()}
        rootExplanationText="Root map"
        setRootExplanationText={vi.fn()}
        gapsText=""
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[]}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Study unit selected", ready: false, detail: "Choose the study unit before handing PRIME off to Tutor." },
          { label: "Materials loaded", ready: true, detail: "1 source material selected" },
        ]}
        preflightBlockers={[
          { code: "STUDY_UNIT_REQUIRED", message: "Choose a study unit before starting the Tutor session." },
        ]}
        preflightLoading={false}
        preflightError={null}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(getPrimeMethodsMock).toHaveBeenCalled();
    });

    expect(screen.getAllByText("TUTOR LAUNCH BLOCKERS").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Choose a study unit before starting the Tutor session."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark ready/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /start tutor session/i })).toBeDisabled();
  });

  it("formats learning objectives as structured cards instead of raw lines", async () => {
    const wrapper = createWrapper();

    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "Cardiac output",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic="Cardiac output"
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup="Week 7"
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[
          {
            title: "Explain cardiac output regulation",
            loCode: "LO-1",
            groupName: "Week 7",
            status: "active",
          },
          {
            title: "Differentiate stroke volume modifiers",
            groupName: "Week 7",
            status: "active",
          },
        ] as never}
        studyUnitOptions={[]}
        primingMethods={["M-PRE-010"]}
        setPrimingMethods={vi.fn()}
        primingMethodRuns={[]}
        chainId={undefined}
        setChainId={vi.fn()}
        customBlockIds={[]}
        setCustomBlockIds={vi.fn()}
        templateChains={[]}
        templateChainsLoading={false}
        summaryText=""
        setSummaryText={vi.fn()}
        conceptsText=""
        setConceptsText={vi.fn()}
        terminologyText=""
        setTerminologyText={vi.fn()}
        rootExplanationText=""
        setRootExplanationText={vi.fn()}
        gapsText=""
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[]}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
        ]}
        preflightBlockers={[]}
        preflightLoading={false}
        preflightError={null}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(getPrimeMethodsMock).toHaveBeenCalled();
    });

    expect(screen.getByText("EXISTING STUDY-UNIT OBJECTIVES")).toBeInTheDocument();
    expect(screen.getByText("LO-1")).toBeInTheDocument();
    expect(screen.getByText("Explain cardiac output regulation")).toBeInTheDocument();
    expect(screen.getByText("Differentiate stroke volume modifiers")).toBeInTheDocument();
  });

  it("separates selected methods from already extracted methods on the scoped materials", async () => {
    const wrapper = createWrapper();

    render(
      <TutorWorkflowPrimingPanel
        workflow={
          {
            workflow_id: "wf-123",
            updated_at: "2026-03-20T12:00:00Z",
            status: "priming",
            assignment_title: "Week 7",
            course_name: "Exercise Phys",
            topic: "Cardiac output",
          } as never
        }
        courses={[{ id: 1, name: "Exercise Phys", code: "EXPH" }] as never}
        courseId={1}
        setCourseId={vi.fn()}
        selectedMaterials={[101]}
        setSelectedMaterials={vi.fn()}
        topic="Cardiac output"
        setTopic={vi.fn()}
        objectiveScope="module_all"
        setObjectiveScope={vi.fn()}
        selectedObjectiveId=""
        setSelectedObjectiveId={vi.fn()}
        selectedObjectiveGroup="Week 7"
        setSelectedObjectiveGroup={vi.fn()}
        availableObjectives={[]}
        studyUnitOptions={[]}
        primingMethods={["M-PRE-013"]}
        setPrimingMethods={vi.fn()}
        primingMethodRuns={[
          {
            method_id: "M-PRE-013",
            method_name: "Big-Picture Orientation Summary",
            output_family: "summary",
            outputs: {
              entries: [{ material_id: 101, title: "Deck", summary: "Overview" }],
            },
            source_ids: [101],
            status: "complete",
            updated_at: "2026-03-21T04:00:00Z",
          },
          {
            method_id: "M-PRE-010",
            method_name: "Learning Objectives Primer",
            output_family: "learning_objectives",
            outputs: {
              entries: [{ material_id: 101, title: "Deck", learning_objectives: [{ title: "Explain output" }] }],
            },
            source_ids: [101],
            status: "complete",
            updated_at: "2026-03-21T04:00:00Z",
          },
        ] as never}
        chainId={undefined}
        setChainId={vi.fn()}
        customBlockIds={[]}
        setCustomBlockIds={vi.fn()}
        templateChains={[]}
        templateChainsLoading={false}
        summaryText=""
        setSummaryText={vi.fn()}
        conceptsText=""
        setConceptsText={vi.fn()}
        terminologyText=""
        setTerminologyText={vi.fn()}
        rootExplanationText=""
        setRootExplanationText={vi.fn()}
        gapsText=""
        setGapsText={vi.fn()}
        recommendedStrategyText=""
        setRecommendedStrategyText={vi.fn()}
        sourceInventory={[
          {
            id: 101,
            title: "Deck",
            source_path: "/tmp/deck.pdf",
            method_outputs: [
              {
                method_id: "M-PRE-013",
                method_name: "Big-Picture Orientation Summary",
                output_family: "summary",
                outputs: { summary: "Overview" },
                source_ids: [101],
                status: "complete",
                updated_at: "2026-03-21T04:00:00Z",
              },
              {
                method_id: "M-PRE-010",
                method_name: "Learning Objectives Primer",
                output_family: "learning_objectives",
                outputs: { learning_objectives: [{ title: "Explain output" }] },
                source_ids: [101],
                status: "complete",
                updated_at: "2026-03-21T04:00:00Z",
              },
            ],
          },
        ] as never}
        vaultFolderPreview="Courses/Exercise Phys/Week 7"
        readinessItems={[
          { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
        ]}
        preflightBlockers={[]}
        preflightLoading={false}
        preflightError={null}
        onBackToLaunch={vi.fn()}
        onSaveDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onStartTutor={vi.fn()}
        onRunAssistForSelected={vi.fn()}
        onRunAssistForMaterial={vi.fn()}
        isSaving={false}
        isStartingTutor={false}
        isRunningAssist={false}
        assistTargetMaterialId={null}
      />,
      { wrapper },
    );

    await waitFor(() => {
      expect(getPrimeMethodsMock).toHaveBeenCalled();
    });

    expect(screen.getByText("SELECTED PRIME METHOD WINDOWS")).toBeInTheDocument();
    expect(screen.getByText("ALREADY EXTRACTED PRIME METHODS")).toBeInTheDocument();
    expect(screen.getAllByText("Big-Picture Orientation Summary").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Learning Objectives Primer").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "These outputs already exist on the selected materials but are not part of the method set currently queued for the next extract.",
      ),
    ).toBeInTheDocument();
  });
});
