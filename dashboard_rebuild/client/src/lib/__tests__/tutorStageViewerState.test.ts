import { describe, expect, it } from "vitest";

import {
  mergeTutorStageViewerState,
  readTutorStageViewerState,
} from "@/lib/tutorStageViewerState";

describe("tutorStageViewerState", () => {
  it("reads stage tab and board layout from viewer_state", () => {
    expect(
      readTutorStageViewerState({
        stage_shell_v1: true,
        active_tab: "prime",
        board_layout_mode: "collapsed",
        material_id: 101,
      }),
    ).toEqual({
      stage_shell_v1: true,
      active_tab: "prime",
      board_layout_mode: "collapsed",
    });
  });

  it("ignores invalid stage fields", () => {
    expect(
      readTutorStageViewerState({
        active_tab: "invalid",
        board_layout_mode: "wide",
      }),
    ).toEqual({
      stage_shell_v1: undefined,
      active_tab: undefined,
      board_layout_mode: undefined,
    });
  });

  it("merges stage fields without dropping unrelated viewer keys", () => {
    expect(
      mergeTutorStageViewerState(
        { material_id: 101, selection_text: "hello" },
        {
          stage_shell_v1: true,
          active_tab: "read",
          board_layout_mode: "split",
        },
      ),
    ).toEqual({
      material_id: 101,
      selection_text: "hello",
      stage_shell_v1: true,
      active_tab: "read",
      board_layout_mode: "split",
    });
  });
});
