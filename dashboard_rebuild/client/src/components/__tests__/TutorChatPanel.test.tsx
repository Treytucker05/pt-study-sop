import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TutorChatPanel, type TutorChatPanelProps } from "../workspace/TutorChatPanel";

const DEFAULT_CHAINS = [
  { id: 1, title: "Recall Chain", block_count: 3 },
  { id: 2, title: "Deep Dive", block_count: 5 },
];

const DEFAULT_METHODS = [
  { id: 1, method_id: "recall", title: "Recall" },
  { id: 2, method_id: "explain", title: "Explain" },
];

function renderPanel(overrides: Partial<TutorChatPanelProps> = {}) {
  const defaults: TutorChatPanelProps = {
    sessionId: "session-abc",
    chainMode: "solo",
    onChainModeChange: vi.fn(),
    selectedChainId: null,
    onChainSelect: vi.fn(),
    availableChains: DEFAULT_CHAINS,
    availableMethods: DEFAULT_METHODS,
    selectedMethodId: null,
    onMethodSelect: vi.fn(),
    children: <div data-testid="tutor-chat-child">Chat goes here</div>,
    ...overrides,
  };
  return { ...render(<TutorChatPanel {...defaults} />), props: defaults };
}

describe("TutorChatPanel", () => {
  // 1. Renders with title "TUTOR CHAT"
  it("renders with title TUTOR CHAT", () => {
    renderPanel();
    expect(screen.getByText("TUTOR CHAT")).toBeInTheDocument();
  });

  // 2. Shows chain mode buttons
  it("shows all four chain mode buttons", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /solo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /auto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /template/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /custom/i })).toBeInTheDocument();
  });

  // 3. Clicking mode button calls onChainModeChange
  it("calls onChainModeChange when a mode button is clicked", () => {
    const onChainModeChange = vi.fn();
    renderPanel({ chainMode: "solo", onChainModeChange });

    fireEvent.click(screen.getByRole("button", { name: /template/i }));
    expect(onChainModeChange).toHaveBeenCalledWith("template");
  });

  // 4. Solo mode shows method selector
  it("shows method selector in solo mode", () => {
    renderPanel({ chainMode: "solo" });
    const select = screen.getByRole("combobox", { name: /method/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Recall")).toBeInTheDocument();
    expect(screen.getByText("Explain")).toBeInTheDocument();
  });

  it("calls onMethodSelect when method is chosen in solo mode", () => {
    const onMethodSelect = vi.fn();
    renderPanel({ chainMode: "solo", onMethodSelect });

    const select = screen.getByRole("combobox", { name: /method/i });
    fireEvent.change(select, { target: { value: "explain" } });
    expect(onMethodSelect).toHaveBeenCalledWith("explain");
  });

  // 5. Template mode shows chain selector
  it("shows chain selector in template mode", () => {
    renderPanel({ chainMode: "template" });
    const select = screen.getByRole("combobox", { name: /chain/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Recall Chain (3 blocks)")).toBeInTheDocument();
    expect(screen.getByText("Deep Dive (5 blocks)")).toBeInTheDocument();
  });

  it("calls onChainSelect when chain is chosen in template mode", () => {
    const onChainSelect = vi.fn();
    renderPanel({ chainMode: "template", onChainSelect });

    const select = screen.getByRole("combobox", { name: /chain/i });
    fireEvent.change(select, { target: { value: "2" } });
    expect(onChainSelect).toHaveBeenCalledWith(2);
  });

  // 6. Auto mode shows auto-select label
  it("shows auto-select label in auto mode", () => {
    renderPanel({ chainMode: "auto" });
    expect(
      screen.getByText(/ai will select the best chain/i),
    ).toBeInTheDocument();
  });

  // 7. Custom mode shows custom label
  it("shows custom chain label in custom mode", () => {
    renderPanel({ chainMode: "custom" });
    expect(screen.getByText(/build custom chain/i)).toBeInTheDocument();
  });

  // 8. Shows "Start a session" when no sessionId
  it('shows "Start a session" message when sessionId is null', () => {
    renderPanel({ sessionId: null });
    expect(
      screen.getByText(/start a session to begin chatting/i),
    ).toBeInTheDocument();
  });

  it("does not show chain mode buttons when sessionId is null", () => {
    renderPanel({ sessionId: null });
    expect(
      screen.queryByRole("button", { name: /solo/i }),
    ).not.toBeInTheDocument();
  });

  // 9. Renders children (the actual chat)
  it("renders children when session is active", () => {
    renderPanel();
    expect(screen.getByTestId("tutor-chat-child")).toBeInTheDocument();
  });

  it("does not render children when sessionId is null", () => {
    renderPanel({ sessionId: null });
    expect(screen.queryByTestId("tutor-chat-child")).not.toBeInTheDocument();
  });

  // 10. Active mode button is visually distinct
  it("marks the active mode button as current", () => {
    renderPanel({ chainMode: "auto" });
    const autoBtn = screen.getByRole("button", { name: /auto/i });
    expect(autoBtn).toHaveAttribute("aria-pressed", "true");
  });
});
