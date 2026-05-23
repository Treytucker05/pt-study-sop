import { describe, expect, it } from "vitest";

import {
  boardLayoutModeLabel,
  defaultBoardLayoutModeForTab,
  getNextBoardLayoutMode,
  type BoardLayoutAction,
  type BoardLayoutMode,
} from "@/lib/boardLayoutState";

describe("boardLayoutState", () => {
  describe("getNextBoardLayoutMode", () => {
    const cases: Array<{
      current: BoardLayoutMode;
      action: BoardLayoutAction;
      expected: BoardLayoutMode;
    }> = [
      { current: "split", action: "collapse", expected: "collapsed" },
      { current: "split", action: "enter_fullscreen", expected: "fullscreen" },
      { current: "collapsed", action: "expand", expected: "split" },
      { current: "fullscreen", action: "exit_fullscreen", expected: "split" },
      { current: "collapsed", action: "enter_fullscreen", expected: "fullscreen" },
      { current: "fullscreen", action: "collapse", expected: "fullscreen" },
      { current: "collapsed", action: "collapse", expected: "collapsed" },
      { current: "split", action: "expand", expected: "split" },
      { current: "split", action: "exit_fullscreen", expected: "split" },
      { current: "fullscreen", action: "expand", expected: "fullscreen" },
      { current: "fullscreen", action: "exit_fullscreen", expected: "split" },
    ];

    it.each(cases)(
      "from $current via $action -> $expected",
      ({ current, action, expected }) => {
        expect(getNextBoardLayoutMode(current, action)).toBe(expected);
      },
    );
  });

  describe("boardLayoutModeLabel", () => {
    it("returns human labels for each mode", () => {
      expect(boardLayoutModeLabel("split")).toBe("Split");
      expect(boardLayoutModeLabel("collapsed")).toBe("Collapsed");
      expect(boardLayoutModeLabel("fullscreen")).toBe("Fullscreen");
    });
  });

  describe("defaultBoardLayoutModeForTab", () => {
    it("defaults Sources to collapsed and productive tabs to split", () => {
      expect(defaultBoardLayoutModeForTab("sources")).toBe("collapsed");
      expect(defaultBoardLayoutModeForTab("read")).toBe("split");
      expect(defaultBoardLayoutModeForTab("prime")).toBe("split");
      expect(defaultBoardLayoutModeForTab("teach")).toBe("split");
      expect(defaultBoardLayoutModeForTab("polish")).toBe("split");
    });
  });
});
