import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowPrimingPanel } from "@/components/TutorWorkflowPrimingPanel";
import type { TutorPrimingMethodRun } from "@/api.types";

const { getPrimeMethodsMock, startChainRunMock, refinePrimingAssistMock } = vi.hoisted(() => ({
  getPrimeMethodsMock: vi.fn(),
  startChainRunMock: vi.fn(),
  refinePrimingAssistMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    methods: {
      getAll: (...args: unknown[]) => getPrimeMethodsMock(...args),
    },
    chainRun: {
      start: (...args: unknown[]) => startChainRunMock(...args),
    },
    tutor: {
      refinePrimingAssist: (...args: unknown[]) => refinePrimingAssistMock(...args),
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
    startChainRunMock.mockReset();
    refinePrimingAssistMock.mockReset();
  });

  it("renders colorful method cards with descriptions and disables RUN when nothing is loaded", async () => {
    renderPanel({
      selectedMaterials: [],
      sourceInventory: [],
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    expect(screen.getAllByTestId("priming-method-card")).toHaveLength(2);
    expect(screen.getByText("Prime objectives first.")).toBeInTheDocument();
    expect(screen.getByText("Extract structure.")).toBeInTheDocument();
    expect(
      screen.getByText("No materials loaded — open Source Shelf to add."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /priming chain/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("priming-run-button")).toBeDisabled();
    expect(
      screen.getByPlaceholderText("Run a method first to chat with Priming results"),
    ).toBeDisabled();
  });

  it("shows selected state for more than one method card", async () => {
    renderPanel({
      primingMethods: ["M-PRE-010", "M-PRE-013"],
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    expect(screen.getByText("2 methods selected")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /learning objectives primer/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("checkbox", { name: /structural extraction/i }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("keeps chain runs reachable through the chain selector", async () => {
    startChainRunMock.mockResolvedValue({
      run_id: 77,
      chain_name: "First Exposure: Standard",
      status: "completed",
      steps: [
        {
          step: 1,
          method_name: "Learning Objectives Primer",
          category: "prepare",
          output: "- Map the major determinants of cardiac output.",
          duration_ms: 1200,
        },
      ],
      artifacts: null,
    });

    renderPanel({
      primingMethods: [],
      chainId: 1,
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    expect(screen.getByRole("combobox", { name: /priming chain/i })).toHaveValue("1");
    fireEvent.click(screen.getByTestId("priming-run-button"));

    await waitFor(() =>
      expect(startChainRunMock).toHaveBeenCalledWith(
        expect.objectContaining({
          chain_id: 1,
          course_id: 1,
          source_doc_ids: [101],
        }),
      ),
    );
    expect(await screen.findByText("1. Learning Objectives Primer")).toBeInTheDocument();
    expect(screen.getAllByText("First Exposure: Standard").length).toBeGreaterThan(0);
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

    fireEvent.click(
      screen.getByRole("checkbox", { name: /learning objectives primer/i }),
    );

    fireEvent.click(screen.getByTestId("priming-run-button"));
    expect(onRunAssistForSelected).toHaveBeenCalledTimes(1);

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
        title: expect.stringContaining("Learning Objectives"),
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
        title: expect.stringContaining("Learning Objectives"),
        badge: "OBJECTIVES",
        provenance: expect.objectContaining({
          sourceType: "priming_result",
        }),
      }),
    );
  });

  it("enables Priming chat after RUN, sends a follow-up, and applies revised results", async () => {
    const wrapper = createWrapper();
    const onApplyRefinedResults = vi.fn();

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
          templateChains={[] as never}
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
          onRunAssistForSelected={() => {
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
                          { lo_code: "LO-1", title: "Define cardiac output." },
                          { lo_code: "LO-2", title: "Describe determinants of stroke volume." },
                          { lo_code: "LO-3", title: "Explain how preload affects stroke volume." },
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
                          { lo_code: "LO-1", title: "Define cardiac output." },
                          { lo_code: "LO-2", title: "Describe determinants of stroke volume." },
                          { lo_code: "LO-3", title: "Explain how preload affects stroke volume." },
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
          onPromoteResultToPrimePacket={vi.fn()}
          onSendResultToWorkspace={vi.fn()}
          onApplyRefinedResults={onApplyRefinedResults}
          isSaving={false}
          isStartingTutor={false}
          isRunningAssist={isRunningAssist}
          assistTargetMaterialId={null}
        />
      );
    }

    refinePrimingAssistMock.mockResolvedValue({
      assistant_message:
        "Objective 3 should explicitly mention the Frank-Starling physiology that links higher preload to higher stroke volume.",
      updated_results: {
        key: "method:M-PRE-010:refined",
        label: "Learning Objectives Primer",
        kind: "method",
        methodId: "M-PRE-010",
        blocks: [
          {
            id: "objectives::cardio",
            title: "Learning Objectives",
            badge: "OBJECTIVES",
            kind: "objectives",
            sourceLabel: "Cardiac Output Lecture",
            materialId: 101,
            content:
              "LO-1 — Define cardiac output.\nLO-2 — Describe determinants of stroke volume.\nLO-3 — Explain how increased preload raises stroke volume through the Frank-Starling mechanism.",
            objectives: [
              { lo_code: "LO-1", title: "Define cardiac output." },
              { lo_code: "LO-2", title: "Describe determinants of stroke volume." },
              {
                lo_code: "LO-3",
                title:
                  "Explain how increased preload raises stroke volume through the Frank-Starling mechanism.",
              },
            ],
          },
        ],
      },
    });

    render(<Harness />, { wrapper });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    fireEvent.click(
      screen.getByRole("checkbox", { name: /learning objectives primer/i }),
    );
    fireEvent.click(screen.getByTestId("priming-run-button"));

    await waitFor(() =>
      expect(screen.getByText("Explain how preload affects stroke volume.")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByTestId("priming-chat-input"), {
      target: {
        value: "Expand on objective 3 with more detail about the physiology",
      },
    });
    fireEvent.click(screen.getByTestId("priming-chat-send"));

    await waitFor(() =>
      expect(refinePrimingAssistMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Expand on objective 3 with more detail about the physiology",
          material_ids: [101],
          conversation_history: [],
        }),
      ),
    );

    expect(
      await screen.findByText(/objective 3 should explicitly mention the frank-starl/iu),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply changes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /apply changes/i }));

    expect(onApplyRefinedResults).toHaveBeenCalledWith(
      expect.objectContaining({
        methodId: "M-PRE-010",
      }),
    );
    expect(
      await screen.findByText(
        "Explain how increased preload raises stroke volume through the Frank-Starling mechanism.",
      ),
    ).toBeInTheDocument();
  });
});
