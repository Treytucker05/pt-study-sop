import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ComponentProps } from "react";
import { ContentFilter } from "@/components/ContentFilter";
import type { TutorMode } from "@/lib/api";

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
          { id: 3, name: "Quick Drill", blocks: [{ id: 1 }] },
          { id: 4, name: "Low Energy", blocks: [{ id: 1 }] },
          { id: 5, name: "Mastery Review", blocks: [{ id: 1 }] },
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
    mode: "Core",
    setMode: vi.fn(),
    chainId: undefined,
    setChainId: vi.fn(),
    customBlockIds: [],
    setCustomBlockIds: vi.fn(),
    topic: "",
    setTopic: vi.fn(),
    webSearch: false,
    setWebSearch: vi.fn(),
    onStartSession: vi.fn(),
    isStarting: false,
    hasActiveSession: false,
    ...overrides,
  };
  render(<ContentFilter {...props} />);
  return props;
}

function clickModeCard(label: string) {
  const textNode = screen.getAllByText(label).find((node) => node.closest("button"));
  if (!textNode) {
    throw new Error(`Mode button not found: ${label}`);
  }
  fireEvent.click(textNode.closest("button")!);
}

describe("ContentFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueryMocks();
    window.localStorage.clear();
  });

  it("auto-picks the recommended chain when switching modes in templates tab", () => {
    const setMode = vi.fn<(mode: TutorMode) => void>();
    const setChainId = vi.fn<(id: number | undefined) => void>();
    renderFilter({ setMode, setChainId });

    clickModeCard("REVIEW");

    expect(setMode).toHaveBeenCalledWith("Sprint");
    expect(setChainId).toHaveBeenCalledWith(2);
  });

  it("does not auto-pick chain when custom tab is active", () => {
    const setMode = vi.fn<(mode: TutorMode) => void>();
    const setChainId = vi.fn<(id: number | undefined) => void>();
    renderFilter({ setMode, setChainId });

    fireEvent.click(screen.getByRole("button", { name: "CUSTOM" }));
    clickModeCard("REVIEW");

    expect(setMode).toHaveBeenCalledWith("Sprint");
    expect(setChainId).not.toHaveBeenCalledWith(2);
  });
});
