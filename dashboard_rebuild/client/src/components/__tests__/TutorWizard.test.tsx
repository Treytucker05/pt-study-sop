import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { TutorWizard } from "@/components/TutorWizard";
import type { TutorMode, TutorSessionSummary, TutorTemplateChain } from "@/lib/api";

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
    if (key === "tutor-content-sources") {
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
    if (key === "tutor-chains-templates") {
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

    // Check for step progress bar
    expect(screen.getByText("1. COURSE")).toBeInTheDocument();
    expect(screen.getByText("2. CHAIN")).toBeInTheDocument();
    expect(screen.getByText("3. START")).toBeInTheDocument();

    // Check for material selector (step 0 component)
    expect(screen.getByTestId("material-selector")).toBeInTheDocument();

    // Check for NEXT button
    expect(screen.getByRole("button", { name: /NEXT/i })).toBeInTheDocument();
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
});
