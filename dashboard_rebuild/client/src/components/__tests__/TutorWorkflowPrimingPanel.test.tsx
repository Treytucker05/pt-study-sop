import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowPrimingPanel } from "@/components/TutorWorkflowPrimingPanel";
import type { TutorPrimingMethodRun } from "@/api.types";

const { getPrimeMethodsMock } = vi.hoisted(() => ({
  getPrimeMethodsMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    methods: {
      getAll: (...args: unknown[]) => getPrimeMethodsMock(...args),
    },
    chainRun: {
      start: vi.fn(),
    },
  },
}));

vi.mock("@/components/ObsidianRenderer", () => ({
  ObsidianRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="structured-map-preview">structured map</div>,
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
      primingMethods={[]}
      setPrimingMethods={vi.fn()}
      primingMethodRuns={[]}
      chainId={undefined}
      setChainId={vi.fn()}
      customBlockIds={[]}
      setCustomBlockIds={vi.fn()}
      templateChains={[
        {
          id: 1,
          name: "First Exposure: Standard",
          description: "Teach-first chain",
          context_tags: "first-exposure",
          blocks: [],
        },
      ] as never}
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
          title: "Cardiac Output Lecture",
          source_path: "/tmp/cardio-output.pdf",
          method_outputs: [],
        },
      ] as never}
      vaultFolderPreview="Courses/Exercise Phys/Week 7"
      readinessItems={[]}
      preflightBlockers={[]}
      preflightLoading={false}
      preflightError={null}
      onBackToStudio={vi.fn()}
      onSaveDraft={vi.fn()}
      onMarkReady={vi.fn()}
      onStartTutor={vi.fn()}
      onRunAssistForSelected={vi.fn()}
      onRunAssistForMaterial={vi.fn()}
      onPromoteResultToPrimePacket={vi.fn()}
      onSendResultToWorkspace={vi.fn()}
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
        name: "Structural Extraction",
        control_stage: "PRIME",
        category: "prepare",
        description: "Extract structure.",
      },
    ]);
  });

  it("shows loaded materials, grouped method/chain selection, and disables RUN when nothing is loaded", async () => {
    renderPanel({
      selectedMaterials: [],
      sourceInventory: [],
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    expect(
      screen.getByText("No materials loaded — open Source Shelf to add."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /priming method or chain/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("priming-run-button")).toBeDisabled();
    expect(
      screen.getByPlaceholderText("Chat with priming results coming soon"),
    ).toBeDisabled();
  });

  it("runs a selected method, renders formatted objectives, and sends the result to Prime Packet and Workspace", async () => {
    const onRunAssistForSelected = vi.fn();
    const onPromoteResultToPrimePacket = vi.fn();
    const onSendResultToWorkspace = vi.fn();
    const wrapper = createWrapper();

    function Harness() {
      const [primingMethods, setPrimingMethods] = useState<string[]>([]);
      const [isRunningAssist, setIsRunningAssist] = useState(false);
      const [sourceInventory, setSourceInventory] = useState([
        {
          id: 101,
          title: "Cardiac Output Lecture",
          source_path: "/tmp/cardio-output.pdf",
          method_outputs: [],
        },
      ]);
      const [primingMethodRuns, setPrimingMethodRuns] = useState<TutorPrimingMethodRun[]>(
        [],
      );

      return (
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
          primingMethods={primingMethods}
          setPrimingMethods={setPrimingMethods}
          primingMethodRuns={primingMethodRuns as never}
          chainId={undefined}
          setChainId={vi.fn()}
          customBlockIds={[]}
          setCustomBlockIds={vi.fn()}
          templateChains={[
            {
              id: 1,
              name: "First Exposure: Standard",
              description: "Teach-first chain",
              context_tags: "first-exposure",
              blocks: [],
            },
          ] as never}
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
          sourceInventory={sourceInventory as never}
          vaultFolderPreview="Courses/Exercise Phys/Week 7"
          readinessItems={[]}
          preflightBlockers={[]}
          preflightLoading={false}
          preflightError={null}
          onBackToStudio={vi.fn()}
          onSaveDraft={vi.fn()}
          onMarkReady={vi.fn()}
          onStartTutor={vi.fn()}
          onRunAssistForSelected={(methodIdOverride) => {
            onRunAssistForSelected(methodIdOverride);
            setIsRunningAssist(true);
            Promise.resolve().then(() => {
              setPrimingMethodRuns([
                {
                  method_id: "M-PRE-010",
                  method_name: "Learning Objectives Primer",
                  output_family: "learning_objectives",
                  outputs: {
                    entries: [
                      {
                        material_id: 101,
                        title: "Cardiac Output Lecture",
                        learning_objectives: [
                          { lo_code: "LO-1", title: "Explain cardiac output regulation" },
                          { title: "Differentiate stroke volume modifiers" },
                        ],
                      },
                    ],
                  },
                  source_ids: [101],
                  status: "complete",
                  updated_at: "2026-03-21T04:00:00Z",
                },
              ]);
              setSourceInventory([
                {
                  id: 101,
                  title: "Cardiac Output Lecture",
                  source_path: "/tmp/cardio-output.pdf",
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
              ]);
              setIsRunningAssist(false);
            });
          }}
          onRunAssistForMaterial={vi.fn()}
          onPromoteResultToPrimePacket={onPromoteResultToPrimePacket}
          onSendResultToWorkspace={onSendResultToWorkspace}
          isSaving={false}
          isStartingTutor={false}
          isRunningAssist={isRunningAssist}
          assistTargetMaterialId={null}
        />
      );
    }

    render(<Harness />, { wrapper });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    fireEvent.change(screen.getByTestId("priming-run-selector"), {
      target: { value: "method:M-PRE-010" },
    });

    fireEvent.click(screen.getByTestId("priming-run-button"));
    expect(onRunAssistForSelected).toHaveBeenCalledWith("M-PRE-010");

    await waitFor(() =>
      expect(
        screen.getByText("Explain cardiac output regulation"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Differentiate stroke volume modifiers")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /send to prime packet/i }));
    expect(onPromoteResultToPrimePacket).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "text_note",
        title: "Learning Objectives",
        badge: "OBJECTIVES",
        provenance: expect.objectContaining({
          sourceType: "priming_result",
        }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /send to workspace/i }));
    expect(onSendResultToWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "text_note",
        title: "Learning Objectives",
        badge: "OBJECTIVES",
        provenance: expect.objectContaining({
          sourceType: "priming_result",
        }),
      }),
    );
  });
});
