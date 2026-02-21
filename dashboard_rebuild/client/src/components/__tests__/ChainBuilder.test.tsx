import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChainBuilder from "@/components/ChainBuilder";
import type { MethodBlock, MethodChain } from "@/api";

vi.mock("@/components/MethodBlockCard", () => ({
  default: ({ block, onClick, compact }: { block: MethodBlock; onClick?: () => void; compact?: boolean }) => (
    <div
      data-testid={`block-${block.id}`}
      data-compact={compact}
      onClick={onClick}
    >
      {block.name}
    </div>
  ),
}));

const blocks: MethodBlock[] = [
  {
    id: 1, name: "Active Recall", category: "retrieve",
    description: null, default_duration_min: 15, energy_cost: "medium",
    best_stage: null, tags: [], evidence: null, created_at: "",
  },
  {
    id: 2, name: "Spaced Review", category: "overlearn",
    description: null, default_duration_min: 10, energy_cost: "low",
    best_stage: null, tags: [], evidence: null, created_at: "",
  },
  {
    id: 3, name: "Mind Mapping", category: "encode",
    description: null, default_duration_min: 20, energy_cost: "high",
    best_stage: null, tags: [], evidence: null, created_at: "",
  },
];

const baseChain: MethodChain = {
  id: 1,
  name: "Study Sprint",
  description: null,
  block_ids: [1, 2],
  context_tags: {},
  created_at: "",
  is_template: 0,
};

describe("ChainBuilder", () => {
  let onSave: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onSave = vi.fn();
  });

  it("renders existing blocks in order", () => {
    render(<ChainBuilder chain={baseChain} allBlocks={blocks} onSave={onSave} />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("Spaced Review")).toBeInTheDocument();
    expect(screen.getByText("(2 blocks)")).toBeInTheDocument();
  });

  it("shows empty state when chain has no blocks", () => {
    const emptyChain = { ...baseChain, block_ids: [] };
    render(<ChainBuilder chain={emptyChain} allBlocks={blocks} onSave={onSave} />);
    expect(screen.getByText("No blocks in this chain yet")).toBeInTheDocument();
  });

  it("removes a block and calls onSave", () => {
    const { container } = render(
      <ChainBuilder chain={baseChain} allBlocks={blocks} onSave={onSave} />
    );
    // Each block row has a remove button with an X (w-3 h-3) svg as last button in the row
    // Find all buttons that are siblings of the block testids (not the ADD BLOCK button)
    const allButtons = container.querySelectorAll("button");
    // Filter to only remove buttons — they contain a w-3 svg and are NOT grip/add buttons
    const removeButtons = Array.from(allButtons).filter((btn) => {
      const svg = btn.querySelector("svg");
      return svg?.classList.contains("w-3") && svg.classList.contains("h-3")
        && !svg.classList.toString().includes("grip")
        && !svg.classList.toString().includes("mr-1");
    });
    // Click the first remove button (removes block 1)
    fireEvent.click(removeButtons[0]);

    expect(onSave).toHaveBeenCalledWith([2]);
  });

  it("opens picker and adds a block", () => {
    render(<ChainBuilder chain={baseChain} allBlocks={blocks} onSave={onSave} />);
    fireEvent.click(screen.getByText(/ADD BLOCK/));

    // Picker shows all available blocks
    expect(screen.getByTestId("block-3")).toBeInTheDocument();
    expect(screen.getByText("Mind Mapping")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("block-3"));
    expect(onSave).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("hides remove buttons and add picker in readOnly mode", () => {
    render(<ChainBuilder chain={baseChain} allBlocks={blocks} onSave={onSave} readOnly />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.queryByText(/ADD BLOCK/)).not.toBeInTheDocument();
  });
});
