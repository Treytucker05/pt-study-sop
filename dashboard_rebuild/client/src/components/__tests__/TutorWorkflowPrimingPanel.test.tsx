import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
    block: { name: string };
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

function renderPanel(overrides: Record<string, unknown> = {}) {
  const wrapper = createWrapper();
  return render(
    <TutorWorkflowPrimingPanel
      workflow={
        {
          workflow_id: "wf-123",
          updated_at: "2026-03-20T12:00:00Z",
          status: "priming_in_progress",
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
      studyUnitOptions={[{ value: "Week 7", objectiveCount: 2, materialCount: 1 }]}
      primingMethods={["M-PRE-013"]}
      setPrimingMethods={vi.fn()}
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
      rootExplanationText="```mermaid\ngraph TD\nA-->B\n```"
      setRootExplanationText={vi.fn()}
      gapsText="Potential ambiguity"
      setGapsText={vi.fn()}
      recommendedStrategyText=""
      setRecommendedStrategyText={vi.fn()}
      sourceInventory={[] as never}
      vaultFolderPreview="Courses/Exercise Phys/Week 7"
      readinessItems={[
        { label: "Artifacts", ready: true, detail: "Core PRIME artifacts generated." },
        { label: "Handoff notes", ready: false, detail: "Still needs final note review." },
      ]}
      preflightBlockers={[]}
      preflightLoading={false}
      preflightError={null}
      onBackToStudio={vi.fn()}
      onSaveDraft={vi.fn()}
      onMarkReady={vi.fn()}
      onStartTutor={vi.fn()}
      onRunAssistForSelected={vi.fn()}
      onRunAssistForMaterial={vi.fn()}
      isSaving={false}
      isStartingTutor={false}
      isRunningAssist={false}
      assistTargetMaterialId={null}
      {...overrides}
    />,
    { wrapper },
  );
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
      },
      {
        id: 202,
        method_id: "M-PRE-013",
        name: "Big-Picture Orientation Summary",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prime orientation summary.",
      },
    ]);
  });

  it("uses the step flow and lets the learner toggle methods from the PRIME METHODS step", async () => {
    const setPrimingMethods = vi.fn();
    renderPanel({ primingMethods: [], setPrimingMethods });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    fireEvent.click(screen.getAllByRole("tab", { name: "PRIME METHODS" })[0]);

    expect(screen.getByRole("heading", { name: "PRIME METHODS" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /learning objectives primer/i }));

    expect(setPrimingMethods).toHaveBeenCalledWith(["M-PRE-010"]);
    expect(screen.getByRole("button", { name: /extract prime/i })).toBeDisabled();
  });

  it("keeps Materials as a dedicated reading step and removes legacy outputs chrome from Outputs", async () => {
    renderPanel({
      sourceInventory: [
        {
          id: 101,
          title: "Lecture 1",
          source_path: "/tmp/lecture-1.pdf",
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
          ],
        },
      ] as never,
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalled());

    expect(screen.getAllByRole("tab", { name: "SETUP" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: "MATERIALS" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: "PRIME METHODS" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: "OUTPUTS" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("tab", { name: "TUTOR HANDOFF" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Keep the scoped source visible while you work/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("tab", { name: "MATERIALS" })[0]);

    expect(screen.getByRole("heading", { name: "MATERIALS" })).toHaveFocus();
    expect(screen.getByText("FULL READER")).toBeInTheDocument();
    expect(screen.getAllByTestId("priming-material-reader").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("tab", { name: "OUTPUTS" })[0]);

    expect(screen.getByRole("heading", { name: "OUTPUTS" })).toHaveFocus();
    expect(screen.getByText("SELECTED PRIME METHOD WINDOWS")).toBeInTheDocument();
    expect(screen.queryByText("LEGACY PRIME OUTPUTS")).not.toBeInTheDocument();
    expect(screen.queryByText("PRIME BOUNDARY")).not.toBeInTheDocument();
  });

  it("shows Tutor handoff blockers and disables ready/start actions in the handoff step", async () => {
    renderPanel({
      selectedObjectiveGroup: "",
      preflightBlockers: [
        { code: "STUDY_UNIT_REQUIRED", message: "Choose a study unit before running Tutor preflight." },
      ],
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("tab", { name: "TUTOR HANDOFF" })[0]);

    expect(screen.getAllByText("Choose a study unit before running Tutor readiness check.").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /mark ready/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /start tutor session/i })).toBeDisabled();
  });

  it("renders existing study-unit objectives inside the outputs step", async () => {
    renderPanel({
      availableObjectives: [
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
      ] as never,
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("tab", { name: "OUTPUTS" })[0]);

    expect(screen.getByText("EXISTING STUDY-UNIT OBJECTIVES")).toBeInTheDocument();
    expect(screen.getByText("LO-1")).toBeInTheDocument();
    expect(screen.getByText("Explain cardiac output regulation")).toBeInTheDocument();
    expect(screen.getByText("Differentiate stroke volume modifiers")).toBeInTheDocument();
  });

  it("separates selected methods from already extracted methods on the scoped materials", async () => {
    renderPanel({
      sourceInventory: [
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
      ] as never,
      primingMethodRuns: [
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
      ] as never,
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("tab", { name: "OUTPUTS" })[0]);

    expect(screen.getByText("SELECTED PRIME METHOD WINDOWS")).toBeInTheDocument();
    expect(screen.getByText("STORED OUTPUTS FROM EARLIER PRIMING RUNS")).toBeInTheDocument();
    expect(screen.getAllByText("Big-Picture Orientation Summary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Learning Objectives Primer").length).toBeGreaterThan(0);
  });
});
