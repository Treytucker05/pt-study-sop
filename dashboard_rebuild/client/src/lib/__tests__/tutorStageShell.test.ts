import { describe, expect, it } from "vitest";

import {
  isTutorStageShellEnabled,
  tutorStageTabForPreset,
} from "@/lib/tutorStageShell";

describe("tutorStageShell", () => {
  it("respects explicit viewer_state flags", () => {
    expect(isTutorStageShellEnabled({ stage_shell_v1: true })).toBe(true);
    expect(isTutorStageShellEnabled({ stage_shell_v1: false })).toBe(false);
    expect(isTutorStageShellEnabled(null)).toBe(false);
  });

  it("maps presets to stage tabs", () => {
    expect(tutorStageTabForPreset("priming")).toBe("prime");
    expect(tutorStageTabForPreset("study")).toBe("read");
    expect(tutorStageTabForPreset("polish")).toBe("polish");
    expect(tutorStageTabForPreset("minimal")).toBe("teach");
  });
});
