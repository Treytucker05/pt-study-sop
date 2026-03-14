import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { TutorStartPanel } from "@/components/TutorStartPanel";
import type { TutorTemplateChain } from "@/lib/api";
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
    return { data: undefined, isLoading: false, isError: false };
  });
}

function renderStartPanel(
  overrides?: Partial<ComponentProps<typeof TutorStartPanel>>,
) {
  const props: ComponentProps<typeof TutorStartPanel> = {
    courseId: 1,
    setCourseId: vi.fn(),
    selectedMaterials: [4, 5],
    setSelectedMaterials: vi.fn(),
    topic: "Hip module",
    setTopic: vi.fn(),
    chainId: undefined,
    setChainId: vi.fn(),
    customBlockIds: [],
    setCustomBlockIds: vi.fn(),
    objectiveScope: "module_all",
    setObjectiveScope: vi.fn(),
    vaultFolder: "",
    setVaultFolder: vi.fn(),
    onStartSession: vi.fn(),
    isStarting: false,
    recentSessions: [],
    onResumeSession: vi.fn(),
    configStatus: { ok: true, checks: [] },
    ...overrides,
  };
  render(<TutorStartPanel {...props} />);
  return props;
}

describe("TutorStartPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryMocks();
  });

  it("renders launch summary and readiness instead of a step wizard", () => {
    renderStartPanel();

    expect(screen.getByText("LAUNCH SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("READINESS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START SESSION/i })).toBeInTheDocument();
    expect(screen.queryByText("1. COURSE")).not.toBeInTheDocument();
  });

  it("expands advanced launch options on demand", async () => {
    renderStartPanel();

    fireEvent.click(screen.getByRole("button", { name: /ADJUST LAUNCH OPTIONS/i }));

    await waitFor(() => {
      expect(screen.getByTestId("material-selector")).toBeInTheDocument();
    });
  });

  it("calls onStartSession when Start Session is clicked", () => {
    const onStartSession = vi.fn();
    renderStartPanel({ onStartSession });

    fireEvent.click(screen.getByRole("button", { name: /START SESSION/i }));

    expect(onStartSession).toHaveBeenCalled();
  });

  it("renders recent sessions and resumes them from the panel", () => {
    const onResumeSession = vi.fn();
    renderStartPanel({
      recentSessions: [
        {
          session_id: "sess-1",
          topic: "Recent anatomy",
          mode: "Core",
          status: "active",
          turn_count: 3,
          started_at: "2026-03-13T00:00:00Z",
        },
      ],
      onResumeSession,
    });

    fireEvent.click(screen.getByRole("button", { name: /Recent anatomy/i }));

    expect(onResumeSession).toHaveBeenCalledWith("sess-1");
  });
});
