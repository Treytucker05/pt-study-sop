import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkspacePanel } from "@/components/ui/WorkspacePanel";

// react-rnd uses DOM measurements that jsdom doesn't support,
// so we mock it to a simple div that exposes the callbacks.
vi.mock("react-rnd", () => {
  const React = require("react");
  return {
    Rnd: React.forwardRef(function MockRnd(
      {
        children,
        onDrag,
        onDragStop,
        onResizeStop,
        default: defaultProps,
        minWidth: _mw,
        minHeight: _mh,
        dragHandleClassName: _dragHandleClassName,
        enableResizing: _enableResizing,
        ["data-testid"]: dataTestId,
        position,
        scale,
        ...rest
      }: any,
      ref: any,
    ) {
      return (
        <div
          ref={ref}
          data-testid={dataTestId || "rnd-wrapper"}
          data-ondrag={onDrag ? "true" : undefined}
          data-ondragstop={onDragStop ? "true" : undefined}
          data-onresizestop={onResizeStop ? "true" : undefined}
          data-has-position={position ? "true" : "false"}
          data-default-x={defaultProps?.x}
          data-default-y={defaultProps?.y}
          data-scale={scale}
          onMouseMove={(e: any) => {
            if (onDrag && e.currentTarget.dataset.simulatedragmove) {
              onDrag(e, { x: 40, y: 60 });
            }
          }}
          onMouseUp={(e: any) => {
            // Simulate drag stop when data attribute is present
            if (onDragStop && e.currentTarget.dataset.simulatedragstop) {
              onDragStop(e, { x: 100, y: 200 });
            }
          }}
          {...rest}
        >
          {children}
        </div>
      );
    }),
  };
});

describe("WorkspacePanel", () => {
  // ── 1. Renders with title and children ──────────────────────────────
  it("renders title text in the title bar", () => {
    render(
      <WorkspacePanel id="p1" title="My Panel">
        <p>body content</p>
      </WorkspacePanel>,
    );
    expect(screen.getByText("My Panel")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <WorkspacePanel id="p1" title="My Panel">
        <p>body content</p>
      </WorkspacePanel>,
    );
    expect(screen.getByText("body content")).toBeInTheDocument();
  });

  // ── 2. Collapse / expand toggle ─────────────────────────────────────
  it("hides children when collapsed", () => {
    render(
      <WorkspacePanel id="p1" title="Panel" collapsed>
        <p>hidden stuff</p>
      </WorkspacePanel>,
    );
    expect(screen.queryByText("hidden stuff")).not.toBeInTheDocument();
  });

  it("calls onCollapsedChange when collapse button is clicked", () => {
    const onCollapsedChange = vi.fn();
    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
      >
        <p>content</p>
      </WorkspacePanel>,
    );
    const collapseBtn = screen.getByRole("button", { name: /collapse/i });
    fireEvent.click(collapseBtn);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("calls onCollapsedChange(false) when expand button is clicked while collapsed", () => {
    const onCollapsedChange = vi.fn();
    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        collapsed
        onCollapsedChange={onCollapsedChange}
      >
        <p>content</p>
      </WorkspacePanel>,
    );
    const expandBtn = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandBtn);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  // ── 3. Close button ─────────────────────────────────────────────────
  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <WorkspacePanel id="p1" title="Panel" onClose={onClose}>
        <p>content</p>
      </WorkspacePanel>,
    );
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render close button when onClose is not provided", () => {
    render(
      <WorkspacePanel id="p1" title="Panel">
        <p>content</p>
      </WorkspacePanel>,
    );
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  // ── 4. Pop-out button ───────────────────────────────────────────────
  it("calls onPopOut when pop-out button is clicked", () => {
    const onPopOut = vi.fn();
    render(
      <WorkspacePanel id="p1" title="Panel" onPopOut={onPopOut}>
        <p>content</p>
      </WorkspacePanel>,
    );
    const popOutBtn = screen.getByRole("button", { name: /pop.?out/i });
    fireEvent.click(popOutBtn);
    expect(onPopOut).toHaveBeenCalledOnce();
  });

  it("does not render pop-out button when onPopOut is not provided", () => {
    render(
      <WorkspacePanel id="p1" title="Panel">
        <p>content</p>
      </WorkspacePanel>,
    );
    expect(
      screen.queryByRole("button", { name: /pop.?out/i }),
    ).not.toBeInTheDocument();
  });

  // ── 5. Drag ─────────────────────────────────────────────────────────
  it("wraps content in an Rnd component with drag support", () => {
    render(
      <WorkspacePanel id="p1" title="Panel">
        <p>content</p>
      </WorkspacePanel>,
    );
    const rnd = screen.getByTestId("rnd-wrapper");
    expect(rnd).toBeInTheDocument();
    expect(rnd.dataset.ondrag).toBeUndefined();
    expect(rnd.dataset.ondragstop).toBe("true");
  });

  it("commits position changes only on drag stop", () => {
    const onPositionChange = vi.fn();

    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        onPositionChange={onPositionChange}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rnd = screen.getByTestId("rnd-wrapper");
    rnd.setAttribute("data-simulatedragmove", "true");
    fireEvent.mouseMove(rnd);
    expect(onPositionChange).not.toHaveBeenCalled();

    rnd.setAttribute("data-simulatedragstop", "true");
    fireEvent.mouseUp(rnd);
    expect(onPositionChange).toHaveBeenCalledTimes(1);
    expect(onPositionChange).toHaveBeenCalledWith({ x: 100, y: 200 });
  });

  // ── 6. Resize ───────────────────────────────────────────────────────
  it("wraps content in an Rnd component with resize support", () => {
    render(
      <WorkspacePanel id="p1" title="Panel">
        <p>content</p>
      </WorkspacePanel>,
    );
    const rnd = screen.getByTestId("rnd-wrapper");
    expect(rnd.dataset.onresizestop).toBe("true");
  });

  it("forwards the current canvas scale to react-rnd", () => {
    render(
      <WorkspacePanel id="p1" title="Panel" scale={0.85}>
        <p>content</p>
      </WorkspacePanel>,
    );
    const rnd = screen.getByTestId("rnd-wrapper");
    expect(rnd.dataset.scale).toBe("0.85");
  });

  it("uses default positioning without forwarding a controlled position prop in expanded mode", () => {
    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        position={{ x: 120, y: 240 }}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rnd = screen.getByTestId("rnd-wrapper");
    expect(rnd.dataset.hasPosition).toBe("false");
    expect(rnd.dataset.defaultX).toBe("120");
    expect(rnd.dataset.defaultY).toBe("240");
  });

  it("uses default positioning without forwarding a controlled position prop in collapsed mode", () => {
    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        collapsed
        position={{ x: 32, y: 64 }}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rnd = screen.getByTestId("rnd-wrapper");
    expect(rnd.dataset.hasPosition).toBe("false");
    expect(rnd.dataset.defaultX).toBe("32");
    expect(rnd.dataset.defaultY).toBe("64");
  });

  it("keeps the same Rnd node when the position changes without a reset token change", () => {
    const { rerender } = render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        position={{ x: 16, y: 24 }}
        positionResetToken={0}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rndBefore = screen.getByTestId("rnd-wrapper");

    rerender(
      <WorkspacePanel
        id="p1"
        title="Panel"
        position={{ x: 160, y: 240 }}
        positionResetToken={0}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rndAfter = screen.getByTestId("rnd-wrapper");
    expect(rndAfter).toBe(rndBefore);
  });

  it("remounts the Rnd node when the position reset token changes", () => {
    const { rerender } = render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        position={{ x: 16, y: 24 }}
        positionResetToken={0}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rndBefore = screen.getByTestId("rnd-wrapper");

    rerender(
      <WorkspacePanel
        id="p1"
        title="Panel"
        position={{ x: 160, y: 240 }}
        positionResetToken={1}
      >
        <p>content</p>
      </WorkspacePanel>,
    );

    const rndAfter = screen.getByTestId("rnd-wrapper");
    expect(rndAfter).not.toBe(rndBefore);
  });

  // ── 7. Title bar buttons are present ────────────────────────────────
  it("shows collapse, pop-out, and close buttons in the title bar", () => {
    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        onClose={() => {}}
        onPopOut={() => {}}
      >
        <p>content</p>
      </WorkspacePanel>,
    );
    expect(screen.getByRole("button", { name: /collapse/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pop.?out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  // ── Styling: collapsed shows as compact chip ────────────────────────
  it("renders as a compact chip when collapsed", () => {
    const { container } = render(
      <WorkspacePanel id="p1" title="Panel" collapsed>
        <p>content</p>
      </WorkspacePanel>,
    );
    // The panel body should not exist
    expect(screen.queryByText("content")).not.toBeInTheDocument();
    // Title should still be visible
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });

  // ── Custom className ────────────────────────────────────────────────
  it("merges custom className onto the root element", () => {
    render(
      <WorkspacePanel id="p1" title="Panel" className="custom-extra">
        <p>content</p>
      </WorkspacePanel>,
    );
    const rnd = screen.getByTestId("rnd-wrapper");
    // The className is passed through to the Rnd wrapper
    expect(rnd.className).toContain("custom-extra");
  });

  it("forwards title-bar pointer-down to the selection handler", () => {
    const handleTitlePointerDown = vi.fn();

    render(
      <WorkspacePanel
        id="p1"
        title="Panel"
        onTitlePointerDown={handleTitlePointerDown}
      >
          <p>content</p>
      </WorkspacePanel>,
    );

    fireEvent.pointerDown(screen.getByText("Panel"));
    expect(handleTitlePointerDown).toHaveBeenCalledTimes(1);
  });
});
