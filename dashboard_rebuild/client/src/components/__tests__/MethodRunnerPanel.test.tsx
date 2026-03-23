import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  MethodRunnerPanel,
  type MethodRunnerPanelProps,
} from "@/components/workspace/MethodRunnerPanel";

const METHODS: MethodRunnerPanelProps["availableMethods"] = [
  {
    id: 1,
    method_id: "active-recall",
    title: "Active Recall",
    category: "retrieve",
    description: "Retrieve from memory",
  },
  {
    id: 2,
    method_id: "spaced-rep",
    title: "Spaced Repetition",
    category: "review",
  },
];

describe("MethodRunnerPanel", () => {
  // ── 1. Renders with title in picker mode ──────────────────────────────
  it('renders with title "METHOD RUNNER" in picker mode', () => {
    render(<MethodRunnerPanel availableMethods={METHODS} />);
    expect(screen.getByText("METHOD RUNNER")).toBeInTheDocument();
  });

  // ── 2. Shows list of available methods ────────────────────────────────
  it("shows list of available methods with titles and category badges", () => {
    render(<MethodRunnerPanel availableMethods={METHODS} />);
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("Spaced Repetition")).toBeInTheDocument();
    expect(screen.getByText("retrieve")).toBeInTheDocument();
    expect(screen.getByText("review")).toBeInTheDocument();
  });

  // ── 3. Clicking a method triggers onRunMethod ─────────────────────────
  it("clicking a method triggers onRunMethod with the method_id", async () => {
    const onRunMethod = vi.fn().mockResolvedValue("output text");
    render(
      <MethodRunnerPanel availableMethods={METHODS} onRunMethod={onRunMethod} />,
    );
    fireEvent.click(screen.getByText("Active Recall"));
    expect(onRunMethod).toHaveBeenCalledWith("active-recall");
  });

  // ── 4. Shows loading state while running ──────────────────────────────
  it("shows loading state while method is running", async () => {
    // Never-resolving promise to keep loading state
    const onRunMethod = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <MethodRunnerPanel availableMethods={METHODS} onRunMethod={onRunMethod} />,
    );
    fireEvent.click(screen.getByText("Active Recall"));

    await waitFor(() => {
      expect(screen.getByText(/RUNNING.*Active Recall/i)).toBeInTheDocument();
    });
  });

  // ── 5. Shows output after method completes ────────────────────────────
  it("shows output after method completes", async () => {
    const onRunMethod = vi.fn().mockResolvedValue("Here is the method output");
    render(
      <MethodRunnerPanel availableMethods={METHODS} onRunMethod={onRunMethod} />,
    );
    fireEvent.click(screen.getByText("Active Recall"));

    await waitFor(() => {
      expect(screen.getByText("Here is the method output")).toBeInTheDocument();
    });
    expect(screen.getByText(/Active Recall.*OUTPUT/i)).toBeInTheDocument();
  });

  // ── 6. Send to Packet calls callback with method output ───────────────
  it("Send to Packet calls onSendToPacket with method output", async () => {
    const onRunMethod = vi.fn().mockResolvedValue("output text");
    const onSendToPacket = vi.fn();
    render(
      <MethodRunnerPanel
        availableMethods={METHODS}
        onRunMethod={onRunMethod}
        onSendToPacket={onSendToPacket}
      />,
    );
    fireEvent.click(screen.getByText("Active Recall"));

    await waitFor(() => {
      expect(screen.getByText("output text")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /send to packet/i }));
    expect(onSendToPacket).toHaveBeenCalledWith({
      type: "method_output",
      title: "Active Recall",
      content: "output text",
      methodId: "active-recall",
    });
  });

  // ── 7. Run Another returns to picker mode ─────────────────────────────
  it('"Run Another" returns to picker mode', async () => {
    const onRunMethod = vi.fn().mockResolvedValue("some output");
    render(
      <MethodRunnerPanel availableMethods={METHODS} onRunMethod={onRunMethod} />,
    );
    fireEvent.click(screen.getByText("Active Recall"));

    await waitFor(() => {
      expect(screen.getByText("some output")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /run another/i }));
    expect(screen.getByText("METHOD RUNNER")).toBeInTheDocument();
    expect(screen.getByText("Active Recall")).toBeInTheDocument();
    expect(screen.getByText("Spaced Repetition")).toBeInTheDocument();
  });

  // ── 8. Shows empty state when no methods available ────────────────────
  it("shows empty state when no methods available", () => {
    render(<MethodRunnerPanel availableMethods={[]} />);
    expect(screen.getByText(/no methods/i)).toBeInTheDocument();
  });
});
