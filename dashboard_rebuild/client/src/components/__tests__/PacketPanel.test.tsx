import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  PacketPanel,
  type PacketItem,
  type PacketPanelProps,
} from "@/components/workspace/PacketPanel";

const ITEMS: PacketItem[] = [
  {
    id: "aaa-111",
    type: "material",
    title: "Chapter 5 Notes",
    content: "Key concepts from chapter 5 including...",
    addedAt: "2026-03-23T10:00:00Z",
  },
  {
    id: "bbb-222",
    type: "method_output",
    title: "Active Recall Output",
    content: "Generated recall questions for the topic.",
    methodId: "active-recall",
    addedAt: "2026-03-23T10:05:00Z",
  },
  {
    id: "ccc-333",
    type: "custom",
    title: "Quick thought",
    content: "Remember to review diagrams",
    addedAt: "2026-03-23T10:10:00Z",
  },
];

function renderPanel(overrides: Partial<PacketPanelProps> = {}) {
  const props: PacketPanelProps = {
    items: [],
    onAddItem: vi.fn(),
    onRemoveItem: vi.fn(),
    ...overrides,
  };
  return { ...render(<PacketPanel {...props} />), props };
}

describe("PacketPanel", () => {
  // ── 1. Renders with title "PACKET (0)" when empty ───────────────────
  it('renders with title "PACKET (0)" when empty', () => {
    renderPanel();
    expect(screen.getByText("PACKET (0)")).toBeInTheDocument();
  });

  // ── 2. Shows empty state message when no items ──────────────────────
  it("shows empty state message when no items", () => {
    renderPanel();
    expect(
      screen.getByText(/drag items here or type below/i),
    ).toBeInTheDocument();
  });

  // ── 3. Renders item list with titles ────────────────────────────────
  it("renders item list with titles", () => {
    renderPanel({ items: ITEMS });
    expect(screen.getByText("Chapter 5 Notes")).toBeInTheDocument();
    expect(screen.getByText("Active Recall Output")).toBeInTheDocument();
    expect(screen.getByText("Quick thought")).toBeInTheDocument();
  });

  // ── 4. Shows item count in title ────────────────────────────────────
  it("shows item count in title", () => {
    renderPanel({ items: ITEMS });
    expect(screen.getByText("PACKET (3)")).toBeInTheDocument();
  });

  // ── 5. Remove button calls onRemoveItem with correct id ─────────────
  it("remove button calls onRemoveItem with correct id", () => {
    const onRemoveItem = vi.fn();
    renderPanel({ items: ITEMS, onRemoveItem });

    const removeButtons = screen.getAllByLabelText(/remove/i);
    fireEvent.click(removeButtons[1]);

    expect(onRemoveItem).toHaveBeenCalledWith("bbb-222");
  });

  // ── 6. Text input adds custom item via onAddItem ────────────────────
  it("text input adds custom item via onAddItem", () => {
    const onAddItem = vi.fn();
    renderPanel({ onAddItem });

    const input = screen.getByPlaceholderText(/type to add/i);
    fireEvent.change(input, { target: { value: "New quick note" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddItem).toHaveBeenCalledWith({
      type: "custom",
      title: "New quick note",
      content: "New quick note",
    });
  });

  // ── 7. Does not submit empty input ──────────────────────────────────
  it("does not submit empty input on Enter", () => {
    const onAddItem = vi.fn();
    renderPanel({ onAddItem });

    const input = screen.getByPlaceholderText(/type to add/i);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddItem).not.toHaveBeenCalled();
  });

  // ── 8. Shows content preview snippet ────────────────────────────────
  it("shows content preview snippet for items", () => {
    renderPanel({ items: ITEMS });
    expect(
      screen.getByText(/Key concepts from chapter 5/),
    ).toBeInTheDocument();
  });
});
