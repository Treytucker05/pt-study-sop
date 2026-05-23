import { describe, expect, it, beforeEach } from "vitest";

import {
  assignTabToDocumentPane,
  clearTabFromDocumentPanes,
  closeDocumentPaneLeaf,
  collectDocumentPaneLeaves,
  createDocumentPaneLayout,
  resetDocumentPaneIdCounterForTests,
  splitDocumentPane,
  SPLIT_SIDE_BY_SIDE,
  SPLIT_STACKED,
} from "@/lib/documentPaneLayout";

describe("documentPaneLayout", () => {
  beforeEach(() => {
    resetDocumentPaneIdCounterForTests(1);
  });

  it("splits a leaf side-by-side and stacked", () => {
    const root = createDocumentPaneLayout("tab-a");
    const sideBySide = splitDocumentPane(root, "pane-1", SPLIT_SIDE_BY_SIDE);
    expect(sideBySide).not.toBeNull();
    expect(collectDocumentPaneLeaves(sideBySide!)).toHaveLength(2);

    const leavesAfterSideBySide = collectDocumentPaneLeaves(sideBySide!);
    const stacked = splitDocumentPane(
      sideBySide!,
      leavesAfterSideBySide[1]!.id,
      SPLIT_STACKED,
    );
    expect(stacked).not.toBeNull();
    expect(collectDocumentPaneLeaves(stacked!)).toHaveLength(3);
  });

  it("assigns and clears tabs on individual panes", () => {
    const root = createDocumentPaneLayout(null);
    const withTab = assignTabToDocumentPane(root, "pane-1", "tab-a");
    expect(withTab.tabId).toBe("tab-a");

    const cleared = clearTabFromDocumentPanes(withTab, "tab-a");
    expect(cleared.tabId).toBeNull();
  });

  it("closes a pane and collapses the layout", () => {
    const root = createDocumentPaneLayout("tab-a");
    const split = splitDocumentPane(root, "pane-1", SPLIT_SIDE_BY_SIDE)!;
    const leaves = collectDocumentPaneLeaves(split);
    const closed = closeDocumentPaneLeaf(split, leaves[1]!.id);
    expect(collectDocumentPaneLeaves(closed)).toHaveLength(1);
  });
});
