import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkspaceCanvas } from "@/components/WorkspaceCanvas";

// react-rnd uses DOM measurements that jsdom doesn't support,
// so we mock it to a simple div that exposes the callbacks.
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

describe("WorkspaceCanvas", () => {
  // ── 1. Default panels render on mount ────────────────────────────────
  it("renders default panels: Material Viewer, Method Runner, Packet", () => {
    render(<WorkspaceCanvas />);
    // Each panel label appears twice: once in the WorkspacePanel title bar,
    // once in the placeholder body content.
    expect(screen.getAllByText("Material Viewer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Method Runner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Packet").length).toBeGreaterThanOrEqual(1);
  });

  // ── 2. "+" button opens panel type menu ──────────────────────────────
  it("shows add-panel button", () => {
    render(<WorkspaceCanvas />);
    const addBtn = screen.getByRole("button", { name: /add panel/i });
    expect(addBtn).toBeInTheDocument();
  });

  it("opens panel type menu when '+' button is clicked", () => {
    render(<WorkspaceCanvas />);
    const addBtn = screen.getByRole("button", { name: /add panel/i });
    fireEvent.click(addBtn);
    // Panel types not in default layout should appear in the menu
    const notesItems = screen.getAllByText("Notes");
    expect(notesItems.length).toBeGreaterThanOrEqual(1);
    const objectivesItems = screen.getAllByText("Objectives");
    expect(objectivesItems.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Clicking a type spawns a new panel ────────────────────────────
  it("spawns a new panel when a type is selected from the menu", () => {
    render(<WorkspaceCanvas />);
    const addBtn = screen.getByRole("button", { name: /add panel/i });
    fireEvent.click(addBtn);

    // Notes is not in the default layout, so clicking it should spawn one
    const notesMenuItem = screen.getByRole("menuitem", { name: /notes/i });
    fireEvent.click(notesMenuItem);

    // After spawning, Notes should appear in the canvas (title + placeholder = 2)
    const notesElements = screen.getAllByText("Notes");
    expect(notesElements.length).toBe(2);
  });

  // ── 4. Cannot spawn duplicate single-instance panels ─────────────────
  it("does not spawn a duplicate single-instance panel", () => {
    render(<WorkspaceCanvas />);
    // Material Viewer is already rendered by default and is single-instance
    // Count current Material Viewer texts (title bar + placeholder = 2)
    const beforeCount = screen.getAllByText("Material Viewer").length;

    const addBtn = screen.getByRole("button", { name: /add panel/i });
    fireEvent.click(addBtn);

    // The menu item for Material Viewer should be disabled
    const menuItem = screen.getByRole("menuitem", {
      name: /material viewer/i,
    });
    expect(menuItem).toBeDisabled();
    fireEvent.click(menuItem);

    // Count should not have increased (menu closes, so we close it first)
    // Since disabled buttons don't fire click, count stays the same
    const afterCount = screen.getAllByText("Material Viewer").length;
    // The menu item text also matches, so afterCount includes that
    // But the panel count itself should not have grown
    expect(afterCount).toBeLessThanOrEqual(beforeCount + 1); // +1 for menu item text
  });

  // ── 5. Can spawn multiple method-runner panels ────────────────────────
  it("can spawn multiple method-runner panels", () => {
    render(<WorkspaceCanvas />);
    // One Method Runner exists by default (title + placeholder = 2 texts)
    const beforeCount = screen.getAllByText("Method Runner").length;

    const addBtn = screen.getByRole("button", { name: /add panel/i });
    fireEvent.click(addBtn);
    fireEvent.click(
      screen.getByRole("menuitem", { name: /method runner/i }),
    );

    // Should have 2 more text elements (new panel title + placeholder)
    const afterCount = screen.getAllByText("Method Runner").length;
    expect(afterCount).toBe(beforeCount + 2);
  });

  // ── 6. Panels render WorkspacePanel with correct titles ───────────────
  it("renders each panel inside a WorkspacePanel with correct title", () => {
    render(<WorkspaceCanvas />);
    // Default panels render with their titles visible
    expect(screen.getAllByText("Material Viewer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Method Runner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Packet").length).toBeGreaterThanOrEqual(1);
    // Each panel has a close button (WorkspacePanel feature)
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    expect(closeButtons.length).toBe(3);
  });
});
