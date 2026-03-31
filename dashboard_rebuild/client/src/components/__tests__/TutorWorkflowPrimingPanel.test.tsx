import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorWorkflowPrimingPanel } from "@/components/TutorWorkflowPrimingPanel";
import { resetPrimingPanelSessionState } from "@/components/priming/primingPanelState";
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
    resetPrimingPanelSessionState();
    getPrimeMethodsMock.mockResolvedValue([
      {
        id: 201,
        method_id: "M-PRE-010",
        name: "Learning Objectives Primer",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prime objectives first.",
        default_duration_min: 8,
        energy_cost: "low",
      },
      {
        id: 202,
        method_id: "M-PRE-013",
        name: "Structural Extraction",
        control_stage: "PRIME",
        category: "prepare",
        description: "Extract structure.",
        default_duration_min: 12,
        energy_cost: "medium",
      },
    ]);
    startChainRunMock.mockReset();
    refinePrimingAssistMock.mockReset();
  });

  it("renders colorful method cards with metadata and disables RUN when nothing is loaded", async () => {
    renderPanel({
      selectedMaterials: [],
      sourceInventory: [],
    });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    expect(screen.getAllByTestId("priming-method-card")).toHaveLength(2);
    expect(screen.getByText("Prime objectives first.")).toBeInTheDocument();
    expect(screen.getByText("Extract structure.")).toBeInTheDocument();
    expect(screen.getByText("low energy")).toBeInTheDocument();
    expect(screen.getByText("8 mins")).toBeInTheDocument();
    expect(screen.getByText("medium energy")).toBeInTheDocument();
    expect(screen.getByText("12 mins")).toBeInTheDocument();
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
    expect(
      screen.getByText("Run a method or chain first to unlock chat with the current Priming results."),
    ).toBeInTheDocument();
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

  it("filters the picker to pure-priming methods only", async () => {
    getPrimeMethodsMock.mockResolvedValue([
      {
        id: 201,
        method_id: "M-PRE-002",
        name: "Overarching Pre-Question Set",
        control_stage: "PRIME",
        category: "prepare",
        description: "Generate broad conceptual prompts.",
        default_duration_min: 10,
        energy_cost: "medium",
      },
      {
        id: 202,
        method_id: "M-PRE-004",
        name: "Simple Preview",
        control_stage: "PRIME",
        category: "prepare",
        description: "Preview the topic.",
        default_duration_min: 4,
        energy_cost: "low",
      },
      {
        id: 203,
        method_id: "M-PRE-005",
        name: "Skeleton Concept Hierarchy",
        control_stage: "PRIME",
        category: "prepare",
        description: "Build a concept map.",
        default_duration_min: 15,
        energy_cost: "high",
      },
      {
        id: 204,
        method_id: "M-PRE-006",
        name: "Anticipation Guide",
        control_stage: "PRIME",
        category: "prepare",
        description: "Anchor expectations.",
        default_duration_min: 6,
        energy_cost: "low",
      },
      {
        id: 205,
        method_id: "M-PRE-008",
        name: "Expert Skeleton",
        control_stage: "PRIME",
        category: "prepare",
        description: "Outline the expert structure.",
        default_duration_min: 9,
        energy_cost: "medium",
      },
      {
        id: 206,
        method_id: "M-PRE-009",
        name: "Prior Knowledge Bridge",
        control_stage: "PRIME",
        category: "prepare",
        description: "Bridge to existing knowledge.",
        default_duration_min: 7,
        energy_cost: "low",
      },
      {
        id: 207,
        method_id: "M-PRE-010",
        name: "Learning Objectives Primer",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prime objectives first.",
        default_duration_min: 8,
        energy_cost: "low",
      },
      {
        id: 208,
        method_id: "M-PRE-012",
        name: "Terminology Pretraining",
        control_stage: "PRIME",
        category: "prepare",
        description: "Load the core terms.",
        default_duration_min: 11,
        energy_cost: "medium",
      },
      {
        id: 209,
        method_id: "M-PRE-013",
        name: "Big-Picture Orientation Summary",
        control_stage: "PRIME",
        category: "prepare",
        description: "Orient the learner.",
        default_duration_min: 12,
        energy_cost: "medium",
      },
      {
        id: 210,
        method_id: "M-PRE-014",
        name: "Why-This-Matters Primer",
        control_stage: "PRIME",
        category: "prepare",
        description: "Frame the value.",
        default_duration_min: 5,
        energy_cost: "low",
      },
      {
        id: 211,
        method_id: "M-ENC-015",
        name: "Hand-Drawn Map",
        control_stage: "PRIME",
        category: "prepare",
        description: "Prompt a learner-created map.",
        default_duration_min: 10,
        energy_cost: "medium",
      },
    ]);

    renderPanel();

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    const cards = screen.getAllByTestId("priming-method-card");
    expect(cards).toHaveLength(8);
    expect(
      cards.map((card) => card.getAttribute("data-method-id")),
    ).toEqual([
      "M-PRE-004",
      "M-PRE-006",
      "M-PRE-008",
      "M-PRE-009",
      "M-PRE-010",
      "M-PRE-012",
      "M-PRE-013",
      "M-PRE-014",
    ]);
    expect(
      screen.queryByRole("checkbox", { name: /overarching pre-question set/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /skeleton concept hierarchy/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /hand-drawn map/i })).not.toBeInTheDocument();
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

    refinePrimingAssistMock
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        assistant_message:
          "Keep objective 3 tied to the Cardiac Output Lecture and keep the explanation to one sentence.",
        updated_results: null,
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
    expect(screen.getByTestId("priming-chat-turn-user")).toHaveTextContent(
      "Expand on objective 3 with more detail about the physiology",
    );
    expect(screen.getByTestId("priming-chat-turn-assistant")).toHaveTextContent(
      "Objective 3 should explicitly mention the Frank-Starling physiology",
    );
    expect(screen.getByRole("button", { name: /apply changes/i })).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("priming-chat-input"), {
      target: {
        value: "Keep it to one sentence and mention the source title.",
      },
    });
    fireEvent.click(screen.getByTestId("priming-chat-send"));

    await waitFor(() =>
      expect(refinePrimingAssistMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          message: "Keep it to one sentence and mention the source title.",
          material_ids: [101],
          conversation_history: [
            {
              role: "user",
              message: "Expand on objective 3 with more detail about the physiology",
            },
            expect.objectContaining({
              role: "assistant",
              message: expect.stringContaining(
                "Objective 3 should explicitly mention the Frank-Starling physiology",
              ),
              updatedResults: expect.objectContaining({
                methodId: "M-PRE-010",
              }),
            }),
          ],
        }),
      ),
    );

    expect(
      await screen.findByText(
        "Keep objective 3 tied to the Cardiac Output Lecture and keep the explanation to one sentence.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("priming-chat-turn-user")).toHaveLength(2);
    expect(screen.getAllByTestId("priming-chat-turn-assistant")).toHaveLength(2);

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

  it("persists run results, chat history, and draft input through a remount", async () => {
    const wrapper = createWrapper();

    function Harness() {
      return (
        <TutorWorkflowPrimingPanel
          workflow={
            {
              workflow_id: "wf-persist-001",
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
          chainId={1}
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
        />
      );
    }

    startChainRunMock.mockResolvedValue({
      run_id: 88,
      chain_name: "First Exposure: Standard",
      steps: [
        {
          step: 1,
          method_name: "Big Picture",
          category: "prime",
          output: "Cardiac output is the amount of blood the heart pumps each minute.",
        },
      ],
    });
    refinePrimingAssistMock.mockResolvedValue({
      assistant_message: "Keep the explanation tied to preload and heart rate.",
      updated_results: null,
    });

    const firstRender = render(<Harness />, { wrapper });

    await waitFor(() => expect(getPrimeMethodsMock).toHaveBeenCalledWith("PRIME"));

    fireEvent.click(screen.getByTestId("priming-run-button"));

    expect(
      await screen.findByText(
        "Cardiac output is the amount of blood the heart pumps each minute.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("priming-chat-input"), {
      target: { value: "Tie this more clearly to determinants of cardiac output." },
    });
    fireEvent.click(screen.getByTestId("priming-chat-send"));

    expect(
      await screen.findByText("Keep the explanation tied to preload and heart rate."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("priming-chat-input"), {
      target: { value: "draft that should survive remount" },
    });

    firstRender.unmount();
    render(<Harness />, { wrapper });

    expect(
      await screen.findByText(
        "Cardiac output is the amount of blood the heart pumps each minute.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Tie this more clearly to determinants of cardiac output.")).toBeInTheDocument();
    expect(
      screen.getByText("Keep the explanation tied to preload and heart rate."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("priming-chat-input")).toHaveValue(
      "draft that should survive remount",
    );
  });
});
