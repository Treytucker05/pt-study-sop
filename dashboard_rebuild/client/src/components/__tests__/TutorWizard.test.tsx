import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { TutorWizard } from "@/components/TutorWizard";
import type { TutorMode, TutorSessionSummary, TutorTemplateChain } from "@/lib/api";
import { QUERY_KEYS } from "@/test/query-keys";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: unknown) => mockUseQuery(args),
}));

vi.mock("@/components/MaterialSelector", () => ({
  MaterialSelector: () => <div data-testid="material-selector" />,
}));

vi.mock("@/components/TutorChainBuilder", () => ({
  TutorChainBuilder: () => <div data-testid="chain-builder" />,
}));

function setupQueryMocks() {
  mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
    const key = opts.queryKey[0];
    if (key === QUERY_KEYS.TUTOR_CONTENT_SOURCES) {
      return {
        data: {
          courses: [
            { id: 1, name: "Anatomy", code: "ANAT101", doc_count: 5 },
            { id: 2, name: "Physiology", code: "PHYS101", doc_count: 8 },
          ],
          total_materials: 13,
          total_instructions: 2,
          total_docs: 13,
          openrouter_enabled: false,
        },
        isLoading: false,
        isError: false,
      };
    }
    if (key === QUERY_KEYS.TUTOR_CHAINS_TEMPLATES) {
      return {
        data: [
          {
            id: 1,
            name: "First Exposure (Core)",
            description: "For new material",
            blocks: [{ id: 1, name: "Prime", category: "encode", duration: 15 }],
            context_tags: "first-exposure",
          },
          {
            id: 2,
            name: "Review Sprint",
            description: "For review",
            blocks: [
              { id: 2, name: "Test", category: "retrieve", duration: 20 },
              { id: 3, name: "Refine", category: "refine", duration: 10 },
            ],
            context_tags: "review",
          },
        ] as TutorTemplateChain[],
        isLoading: false,
        isError: false,
      };
    }
    if (key === "learning-objectives") {
      return {
        data: [],
        isLoading: false,
        isError: false,
      };
    }
    return { data: undefined, isLoading: false, isError: false };
  });
}

function renderWizard(overrides?: Partial<ComponentProps<typeof TutorWizard>>) {
  const props: ComponentProps<typeof TutorWizard> = {
    courseId: undefined,
    setCourseId: vi.fn(),
    selectedMaterials: [],
    setSelectedMaterials: vi.fn(),
    topic: "",
    setTopic: vi.fn(),
    chainId: undefined,
    setChainId: vi.fn(),
    customBlockIds: [],
    setCustomBlockIds: vi.fn(),
    objectiveScope: "module_all",
    setObjectiveScope: vi.fn(),
    selectedObjectiveId: "",
    setSelectedObjectiveId: vi.fn(),
    selectedObjectiveGroup: "",
    setSelectedObjectiveGroup: vi.fn(),
    availableObjectives: [],
    vaultFolderPreview: "",
    preflight: undefined,
    preflightLoading: false,
    preflightError: null,
    onStartSession: vi.fn(),
    isStarting: false,
    recentSessions: [],
    onResumeSession: vi.fn(),
    ...overrides,
  };
  render(<TutorWizard {...props} />);
  return props;
}

describe("TutorWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryMocks();
    window.localStorage.clear();
  });

  it("renders step 0 (course selection) on mount", () => {
    renderWizard();

    // Step labels should show correct text content
    expect(screen.getByText("1. COURSE")).toHaveTextContent("1. COURSE");
    expect(screen.getByText("2. CHAIN")).toHaveTextContent("2. CHAIN");
    expect(screen.getByText("3. START")).toHaveTextContent("3. START");

    // Material selector is rendered on step 0
    expect(screen.getByTestId("material-selector")).toBeInTheDocument();

    // NEXT button should be enabled for navigation
    const nextBtn = screen.getByRole("button", { name: /NEXT/i });
    expect(nextBtn).toBeEnabled();
  });

  it("clicking NEXT advances to step 1", async () => {
    renderWizard();

    const nextButton = screen.getByRole("button", { name: /NEXT/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      // Step 1 should show chain mode buttons - look for the text content
      const preBuiltButtons = screen.getAllByText("PRE-BUILT");
      expect(preBuiltButtons.length).toBeGreaterThan(0);
    });

    // BACK button should now be visible
    expect(screen.getByRole("button", { name: /BACK/i })).toBeInTheDocument();
  });

  it("clicking BACK from step 1 returns to step 0", async () => {
    renderWizard();

    // Advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    await waitFor(() => {
      const preBuiltButtons = screen.getAllByText("PRE-BUILT");
      expect(preBuiltButtons.length).toBeGreaterThan(0);
    });

    // Click BACK
    fireEvent.click(screen.getByRole("button", { name: /BACK/i }));

    await waitFor(() => {
      // Should return to step 0
      expect(screen.getByTestId("material-selector")).toBeInTheDocument();
    });
  });

  it("renders step 2 (start confirmation) when step=2", async () => {
    renderWizard();

    // Advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    await waitFor(() => {
      const preBuiltButtons = screen.getAllByText("PRE-BUILT");
      expect(preBuiltButtons.length).toBeGreaterThan(0);
    });

    // Advance to step 2
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    await waitFor(() => {
      // Step 2 should show "Start Session" button
      expect(screen.getByRole("button", { name: /Start Session/i })).toBeInTheDocument();
    });
  });

  it("calls onStartSession when Start Session button clicked", async () => {
    const onStartSession = vi.fn();
    renderWizard({ onStartSession });

    // Advance to step 1
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    await waitFor(() => {
      const preBuiltButtons = screen.getAllByText("PRE-BUILT");
      expect(preBuiltButtons.length).toBeGreaterThan(0);
    });

    // Advance to step 2
    const nextButtons = screen.getAllByRole("button", { name: /NEXT/i });
    fireEvent.click(nextButtons[nextButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Session/i })).toBeInTheDocument();
    });

    // Click Start Session
    fireEvent.click(screen.getByRole("button", { name: /Start Session/i }));

    expect(onStartSession).toHaveBeenCalled();
  });

  it("disables Start Session when single-focus has no explicit objective", async () => {
    renderWizard({ objectiveScope: "single_focus" });

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    await waitFor(() => {
      const preBuiltButtons = screen.getAllByText("PRE-BUILT");
      expect(preBuiltButtons.length).toBeGreaterThan(0);
    });

    const nextButtons = screen.getAllByRole("button", { name: /NEXT/i });
    fireEvent.click(nextButtons[nextButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start Session/i })).toBeDisabled();
    });
  });

  it("shows preflight blockers on the start step", async () => {
    renderWizard({
      selectedObjectiveGroup: "Week 7 - Development of Nervous System",
      selectedObjectiveId: "OBJ-6",
      preflight: {
        ok: false,
        preflight_id: "preflight-123",
        course_id: 1,
        module_name: "Week 7 - Development of Nervous System",
        topic: "Week 7",
        objective_scope: "single_focus",
        focus_objective_id: "OBJ-6",
        material_ids: [11, 12],
        resolved_learning_objectives: [],
        map_of_contents: {
          path: "Courses/Neuroscience/Week 7/_Map of Contents.md",
          status: "updated",
          module_name: "Week 7 - Development of Nervous System",
          objective_ids: ["OBJ-1", "OBJ-6"],
        },
        vault_ready: true,
        recommended_mode_flags: {
          materials: true,
          obsidian: true,
          gemini_vision: false,
          web_search: false,
          deep_think: false,
        },
        blockers: [
          {
            code: "MATERIALS_REQUIRED",
            message: "Select one or more study materials before starting a Tutor session.",
          },
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    await waitFor(() => {
      expect(screen.getAllByText("PRE-BUILT").length).toBeGreaterThan(0);
    });
    const nextButtons = screen.getAllByRole("button", { name: /NEXT/i });
    fireEvent.click(nextButtons[nextButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("PREFLIGHT")).toBeInTheDocument();
      expect(
        screen.getByText("Select one or more study materials before starting a Tutor session."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start Session/i })).toBeDisabled();
    });
  });
});
