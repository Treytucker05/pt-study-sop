import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useWorkspaceLayout } from "@/hooks/useWorkspaceLayout";
import type { PanelLayout } from "@/hooks/useWorkspaceLayout";

const STORAGE_KEY = "workspace-layouts";

const samplePanels: PanelLayout[] = [
  {
    type: "material-viewer",
    position: { x: 20, y: 20 },
    size: { width: 400, height: 500 },
    collapsed: false,
  },
  {
    type: "method-runner",
    position: { x: 440, y: 20 },
    size: { width: 400, height: 500 },
    collapsed: false,
  },
];

describe("useWorkspaceLayout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── saveLayout ────────────────────────────────────────────────────────

  it("saveLayout stores panels in localStorage", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.saveLayout(1, samplePanels);
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored["1"]).toBeDefined();
    expect(stored["1"].panels).toEqual(samplePanels);
    expect(stored["1"].savedAt).toBeTruthy();
  });

  // ── loadLayout ────────────────────────────────────────────────────────

  it("loadLayout retrieves saved panels", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.saveLayout(2, samplePanels);
    });

    const layout = result.current.loadLayout(2);
    expect(layout).not.toBeNull();
    expect(layout!.panels).toEqual(samplePanels);
    expect(layout!.savedAt).toBeTruthy();
  });

  it("loadLayout returns null for empty slot", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    const layout = result.current.loadLayout(3);
    expect(layout).toBeNull();
  });

  // ── getSlotInfo ───────────────────────────────────────────────────────

  it("getSlotInfo shows which slots have saves", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.saveLayout(1, samplePanels);
      result.current.saveLayout(3, samplePanels);
    });

    const info = result.current.getSlotInfo();
    expect(info).toHaveLength(5);

    expect(info[0].slot).toBe(1);
    expect(info[0].savedAt).toBeTruthy();

    expect(info[1].slot).toBe(2);
    expect(info[1].savedAt).toBeNull();

    expect(info[2].slot).toBe(3);
    expect(info[2].savedAt).toBeTruthy();

    expect(info[3].slot).toBe(4);
    expect(info[3].savedAt).toBeNull();

    expect(info[4].slot).toBe(5);
    expect(info[4].savedAt).toBeNull();
  });

  // ── clearSlot ─────────────────────────────────────────────────────────

  it("clearSlot removes a saved layout", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.saveLayout(2, samplePanels);
    });

    expect(result.current.loadLayout(2)).not.toBeNull();

    act(() => {
      result.current.clearSlot(2);
    });

    expect(result.current.loadLayout(2)).toBeNull();
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  it("handles invalid slot numbers gracefully", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    // Out-of-range slots should not throw
    act(() => {
      result.current.saveLayout(0, samplePanels);
    });
    expect(result.current.loadLayout(0)).toBeNull();

    act(() => {
      result.current.saveLayout(6, samplePanels);
    });
    expect(result.current.loadLayout(6)).toBeNull();

    act(() => {
      result.current.saveLayout(-1, samplePanels);
    });
    expect(result.current.loadLayout(-1)).toBeNull();

    // clearSlot on invalid slot should not throw
    act(() => {
      result.current.clearSlot(0);
      result.current.clearSlot(99);
    });
  });

  it("saveLayout with name preserves the name", () => {
    const { result } = renderHook(() => useWorkspaceLayout());

    act(() => {
      result.current.saveLayout(1, samplePanels, "My Study Layout");
    });

    const layout = result.current.loadLayout(1);
    expect(layout!.name).toBe("My Study Layout");

    const info = result.current.getSlotInfo();
    expect(info[0].name).toBe("My Study Layout");
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json {{{");

    const { result } = renderHook(() => useWorkspaceLayout());

    // Should not throw, should treat as empty
    expect(result.current.loadLayout(1)).toBeNull();
    expect(result.current.getSlotInfo()).toHaveLength(5);

    // Should be able to save over corrupted data
    act(() => {
      result.current.saveLayout(1, samplePanels);
    });
    expect(result.current.loadLayout(1)).not.toBeNull();
  });
});
