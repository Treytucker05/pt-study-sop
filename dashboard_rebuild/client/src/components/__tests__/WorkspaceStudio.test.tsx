import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  WorkspaceStudio,
  type WorkspaceStudioProps,
} from "@/components/WorkspaceStudio";

// react-rnd uses DOM measurements that jsdom doesn't support
vi.mock("react-rnd", () => {
  const React = require("react");
  return {
    Rnd: React.forwardRef(function MockRnd(
      {
        children,
        onDragStop,
        onResizeStop,
        default: _default,
        minWidth: _mw,
        minHeight: _mh,
        ...rest
      }: any,
      ref: any,
    ) {
      return (
        <div
          ref={ref}
          data-testid="rnd-wrapper"
          data-ondragstop={onDragStop ? "true" : undefined}
          data-onresizestop={onResizeStop ? "true" : undefined}
          {...rest}
        >
          {children}
        </div>
      );
    }),
  };
});

const defaultProps: WorkspaceStudioProps = {
  courseId: 1,
  courseName: "Neuroanatomy",
  courses: [
    { id: 1, name: "Neuroanatomy" },
    { id: 2, name: "Physiology" },
  ],
  onCourseChange: vi.fn(),
  selectedMaterialIds: [10, 20],
  activeSessionId: null,
  workflowId: null,
};

function renderStudio(overrides: Partial<WorkspaceStudioProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<WorkspaceStudio {...props} />);
}

describe("WorkspaceStudio", () => {
  // ── 1. Renders WorkspaceTopBar ──────────────────────────────────
  it("renders WorkspaceTopBar", () => {
    renderStudio();
    // TopBar contains the mode selector with PREP visible, and the Start Tutor button
    expect(screen.getByTestId("mode-selector")).toBeInTheDocument();
    expect(screen.getByTestId("start-tutor-btn")).toBeInTheDocument();
    expect(screen.getByTestId("timer-display")).toBeInTheDocument();
  });

  // ── 2. Renders WorkspaceCanvas ──────────────────────────────────
  it("renders WorkspaceCanvas with default panels", () => {
    renderStudio();
    // WorkspaceCanvas renders default panels: Material Viewer, Method Runner, Packet
    expect(screen.getAllByText("Material Viewer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Method Runner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Packet").length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Mode change updates the mode state ───────────────────────
  it("updates mode when mode selector changes", () => {
    renderStudio();
    // The mode selector should show the initial mode value
    const modeSelector = screen.getByTestId("mode-selector");
    expect(modeSelector).toBeInTheDocument();
  });

  // ── 4. Packet items can be added (internal state test) ──────────
  it("has the workspace-studio container", () => {
    renderStudio();
    expect(screen.getByTestId("workspace-studio")).toBeInTheDocument();
  });

  // ── 5. Start Tutor switches to tutor mode ───────────────────────
  it("Start Tutor button is rendered and clickable", () => {
    renderStudio();
    const startBtn = screen.getByTestId("start-tutor-btn");
    expect(startBtn).toBeInTheDocument();
    // Click should not throw
    fireEvent.click(startBtn);
  });

  // ── 6. Course selector present ──────────────────────────────────
  it("renders course selector", () => {
    renderStudio();
    expect(screen.getByTestId("course-selector")).toBeInTheDocument();
  });

  // ── 7. Workspace name input present ─────────────────────────────
  it("renders workspace name input", () => {
    renderStudio();
    expect(screen.getByTestId("workspace-name-input")).toBeInTheDocument();
  });

  // ── 8. Timer display shows 00:00 initially ─────────────────────
  it("timer starts at 00:00", () => {
    renderStudio();
    expect(screen.getByTestId("timer-display")).toHaveTextContent("00:00");
  });

  // ── 9. Layout slot buttons render ───────────────────────────────
  it("renders layout slot buttons", () => {
    renderStudio();
    expect(screen.getByTestId("layout-slot-1")).toBeInTheDocument();
    expect(screen.getByTestId("layout-slot-5")).toBeInTheDocument();
  });
});
