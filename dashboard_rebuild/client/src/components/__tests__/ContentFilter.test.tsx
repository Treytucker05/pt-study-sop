import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { ContentFilter } from "@/components/ContentFilter";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: unknown) => mockUseQuery(args),
}));

vi.mock("@/components/MaterialUploader", () => ({
  MaterialUploader: () => <div data-testid="material-uploader" />,
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
          total_materials: 1,
          total_instructions: 1,
          openrouter_enabled: true,
          buster_enabled: true,
        },
        isLoading: false,
        isError: false,
      };
    }
    if (key === "tutor-template-chains") {
      return {
        data: [
          { id: 1, name: "First Exposure (Core)", blocks: [{ id: 1 }] },
          { id: 2, name: "Review Sprint", blocks: [{ id: 1 }, { id: 2 }] },
        ],
        isLoading: false,
        isError: false,
      };
    }
    if (key === "courses-active") {
      return { data: [], isLoading: false, isError: false };
    }
    return { data: undefined, isLoading: false, isError: false };
  });
}

function renderFilter(overrides?: Partial<ComponentProps<typeof ContentFilter>>) {
  const props: ComponentProps<typeof ContentFilter> = {
    courseId: undefined,
    setCourseId: vi.fn(),
    selectedMaterials: [],
    setSelectedMaterials: vi.fn(),
    chainId: undefined,
    setChainId: vi.fn(),
    customBlockIds: [],
    setCustomBlockIds: vi.fn(),
    topic: "",
    setTopic: vi.fn(),
    onStartSession: vi.fn(),
    isStarting: false,
    hasActiveSession: false,
    ...overrides,
  };
  render(<ContentFilter {...props} />);
  return props;
}

describe("ContentFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryMocks();
    window.localStorage.clear();
  });

  it("renders chain templates and freeform option", () => {
    renderFilter();

    expect(screen.getByText("FREEFORM")).toBeInTheDocument();
    expect(screen.getByText("FIRST EXPOSURE (CORE)")).toBeInTheDocument();
    expect(screen.getByText("REVIEW SPRINT")).toBeInTheDocument();
  });

  it("calls setChainId when clicking a template chain", () => {
    const setChainId = vi.fn();
    renderFilter({ setChainId });

    const chainButton = screen.getByText("FIRST EXPOSURE (CORE)").closest("button");
    fireEvent.click(chainButton!);

    expect(setChainId).toHaveBeenCalledWith(1);
  });

  it("switching to custom tab clears chainId", () => {
    const setChainId = vi.fn();
    renderFilter({ setChainId });

    fireEvent.click(screen.getByRole("button", { name: "CUSTOM" }));

    expect(setChainId).toHaveBeenCalledWith(undefined);
  });

  it("shows start session button", () => {
    renderFilter();
    expect(screen.getByText("START SESSION")).toBeInTheDocument();
  });
});
