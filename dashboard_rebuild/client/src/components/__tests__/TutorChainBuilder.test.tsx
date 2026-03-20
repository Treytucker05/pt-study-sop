import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorChainBuilder } from "@/components/TutorChainBuilder";
import type { MethodBlock } from "@/lib/api";

const getAllMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    methods: {
      getAll: (...args: unknown[]) => getAllMock(...args),
    },
  },
}));

function renderBuilder(props?: Partial<ComponentProps<typeof TutorChainBuilder>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TutorChainBuilder
        selectedBlockIds={[]}
        setSelectedBlockIds={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
}

const blocks: MethodBlock[] = [
  {
    id: 1,
    name: "Orientation map",
    control_stage: "PRIME",
    category: "prepare",
    description: "Prime the terrain.",
    default_duration_min: 8,
    energy_cost: "low",
    best_stage: "first_exposure",
    tags: [],
    evidence: null,
    created_at: "",
  },
  {
    id: 2,
    name: "Teach the mechanism",
    control_stage: "TEACH",
    category: "encode",
    description: "Explain one mechanism chunk.",
    default_duration_min: 12,
    energy_cost: "medium",
    best_stage: "teaching",
    tags: [],
    evidence: null,
    created_at: "",
  },
  {
    id: 3,
    name: "Quick readiness check",
    control_stage: "CALIBRATE",
    category: "encode",
    description: "Check the learner after teaching.",
    default_duration_min: 6,
    energy_cost: "medium",
    best_stage: "review",
    tags: [],
    evidence: null,
    created_at: "",
  },
  {
    id: 4,
    name: "Micro familiarity pulse",
    control_stage: "CALIBRATE",
    category: "encode",
    description: "Quick pre-teach pulse check.",
    default_duration_min: 3,
    energy_cost: "low",
    best_stage: "review",
    tags: [],
    evidence: null,
    created_at: "",
  },
];

describe("TutorChainBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllMock.mockResolvedValue(blocks);
  });

  it("renders TEACH as its own block-picker section", async () => {
    renderBuilder();

    expect(await screen.findByText(/TEACH \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText("Orientation map")).toBeInTheDocument();
    expect(screen.getByText("Teach the mechanism")).toBeInTheDocument();
  });

  it("warns when CALIBRATE appears before TEACH", async () => {
    renderBuilder({
      selectedBlockIds: [1, 3, 2],
      setSelectedBlockIds: vi.fn(),
    });

    expect(await screen.findByText(/CALIBRATE appears before TEACH/i)).toBeInTheDocument();
  });

  it("uses the TEACH chip label in the custom chain", async () => {
    renderBuilder({
      selectedBlockIds: [1, 2],
      setSelectedBlockIds: vi.fn(),
    });

    expect(await screen.findByText("TCH")).toBeInTheDocument();
    expect(screen.getByTitle(/TEACH · Explain one mechanism chunk/i)).toBeInTheDocument();
  });

  it("adds a TEACH block from the picker", async () => {
    const setSelectedBlockIds = vi.fn();
    renderBuilder({ setSelectedBlockIds });

    fireEvent.click(await screen.findByText("Teach the mechanism"));
    expect(setSelectedBlockIds).toHaveBeenCalledWith([2]);
  });

  it("shows the locked architecture summary for first-exposure chains", async () => {
    renderBuilder({
      selectedBlockIds: [1, 4, 2, 3],
      setSelectedBlockIds: vi.fn(),
    });

    const architecture = await screen.findByTestId("tutor-chain-architecture");
    expect(architecture).toBeInTheDocument();
    expect(within(architecture).getByText(/^MICRO-CALIBRATE$/i)).toBeInTheDocument();
    expect(within(architecture).getByText(/^FULL CALIBRATE$/i)).toBeInTheDocument();
    expect(
      within(architecture).getByText(/Runtime-only slot opens after the TEACH close artifact/i),
    ).toBeInTheDocument();
    expect(
      within(architecture).getByText(/No default teach-back gate in this chain/i),
    ).toBeInTheDocument();
  });
});
