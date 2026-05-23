import type { TutorStageTab } from "@/components/tutor-stage/tutorStageTabs";
import type { BoardLayoutMode } from "@/lib/boardLayoutState";

export type TutorStageViewerState = {
  stage_shell_v1?: boolean;
  active_tab?: TutorStageTab;
  board_layout_mode?: BoardLayoutMode;
};

const TUTOR_STAGE_TABS = new Set<TutorStageTab>([
  "sources",
  "read",
  "prime",
  "teach",
  "polish",
  "settings",
]);

const BOARD_LAYOUT_MODES = new Set<BoardLayoutMode>([
  "split",
  "collapsed",
  "fullscreen",
]);

function parseTutorStageTab(value: unknown): TutorStageTab | undefined {
  return typeof value === "string" && TUTOR_STAGE_TABS.has(value as TutorStageTab)
    ? (value as TutorStageTab)
    : undefined;
}

function parseBoardLayoutMode(value: unknown): BoardLayoutMode | undefined {
  return typeof value === "string" &&
    BOARD_LAYOUT_MODES.has(value as BoardLayoutMode)
    ? (value as BoardLayoutMode)
    : undefined;
}

export function readTutorStageViewerState(
  viewerState?: Record<string, unknown> | null,
): TutorStageViewerState {
  return {
    stage_shell_v1:
      viewerState?.stage_shell_v1 === true
        ? true
        : viewerState?.stage_shell_v1 === false
          ? false
          : undefined,
    active_tab: parseTutorStageTab(viewerState?.active_tab),
    board_layout_mode: parseBoardLayoutMode(viewerState?.board_layout_mode),
  };
}

export function mergeTutorStageViewerState(
  viewerState: Record<string, unknown> | null,
  patch: TutorStageViewerState,
): Record<string, unknown> {
  const next = { ...(viewerState ?? {}) };

  if (patch.stage_shell_v1 !== undefined) {
    next.stage_shell_v1 = patch.stage_shell_v1;
  }
  if (patch.active_tab !== undefined) {
    next.active_tab = patch.active_tab;
  }
  if (patch.board_layout_mode !== undefined) {
    next.board_layout_mode = patch.board_layout_mode;
  }

  return next;
}
