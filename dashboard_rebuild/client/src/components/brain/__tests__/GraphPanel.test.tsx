import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadGraphPanel() {
  const mod = await import("@/components/brain/GraphPanel");
  return mod.GraphPanel;
}

describe("GraphPanel", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("@/components/brain/UnifiedBrainCanvas");
  });

  it("shows a loading fallback while the lazy graph view resolves", async () => {
    vi.doMock("@/components/brain/UnifiedBrainCanvas", async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return {
        UnifiedBrainCanvas: () => <div data-testid="unified-brain-canvas">graph ready</div>,
      };
    });

    const GraphPanel = await loadGraphPanel();
    render(<GraphPanel />);

    expect(screen.getByTestId("graph-panel")).toBeInTheDocument();
    expect(screen.getByTestId("graph-panel-loading")).toBeInTheDocument();

    expect(await screen.findByTestId("unified-brain-canvas")).toHaveTextContent("graph ready");
  });

  it("renders the graph error boundary and can recover on retry", async () => {
    let shouldThrow = true;

    vi.doMock("@/components/brain/UnifiedBrainCanvas", () => ({
      UnifiedBrainCanvas: () => {
        if (shouldThrow) {
          throw new Error("graph boom");
        }
        return <div data-testid="unified-brain-canvas">graph recovered</div>;
      },
    }));

    const GraphPanel = await loadGraphPanel();
    render(<GraphPanel />);

    expect(await screen.findByTestId("graph-panel-error")).toHaveTextContent("GRAPH RENDER ERROR");
    expect(screen.getByText("graph boom")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("unified-brain-canvas")).toHaveTextContent("graph recovered");
  });
});
