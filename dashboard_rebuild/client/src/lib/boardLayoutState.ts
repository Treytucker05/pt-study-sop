import type { TutorStageTab } from "@/components/tutor-stage/tutorStageTabs";

export type BoardLayoutMode = "split" | "collapsed" | "fullscreen";

export type BoardLayoutAction =
  | "collapse"
  | "expand"
  | "enter_fullscreen"
  | "exit_fullscreen";

const BOARD_LAYOUT_LABELS: Record<BoardLayoutMode, string> = {
  split: "Split",
  collapsed: "Collapsed",
  fullscreen: "Fullscreen",
};

export function boardLayoutModeLabel(mode: BoardLayoutMode): string {
  return BOARD_LAYOUT_LABELS[mode];
}

export function getNextBoardLayoutMode(
  current: BoardLayoutMode,
  action: BoardLayoutAction,
): BoardLayoutMode {
  switch (action) {
    case "collapse":
      if (current === "split") {
        return "collapsed";
      }
      return current;
    case "expand":
      if (current === "collapsed") {
        return "split";
      }
      return current;
    case "enter_fullscreen":
      if (current === "split" || current === "collapsed") {
        return "fullscreen";
      }
      return current;
    case "exit_fullscreen":
      if (current === "fullscreen") {
        return "split";
      }
      return current;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function defaultBoardLayoutModeForTab(tab: TutorStageTab): BoardLayoutMode {
  if (tab === "sources") {
    return "collapsed";
  }
  return "split";
}
