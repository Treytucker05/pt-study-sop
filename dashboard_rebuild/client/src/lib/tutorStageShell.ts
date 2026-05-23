import type { TutorStageTab } from "@/components/tutor-stage/tutorStageTabs";
import type { StudioShellPreset } from "@/components/studio/StudioShell";

export function isTutorStageShellEnabled(
  viewerState?: Record<string, unknown> | null,
): boolean {
  if (viewerState?.stage_shell_v1 === false) {
    return false;
  }
  if (import.meta.env.MODE === "test") {
    return viewerState?.stage_shell_v1 === true;
  }
  return true;
}

export function tutorStageTabForPreset(
  preset: StudioShellPreset,
): TutorStageTab {
  switch (preset) {
    case "priming":
      return "prime";
    case "polish":
      return "polish";
    case "minimal":
      return "teach";
    case "study":
    case "full_studio":
    default:
      return "read";
  }
}

export function tutorStageTabForLiveSession(hasLiveTutorSession: boolean): TutorStageTab {
  return hasLiveTutorSession ? "teach" : "read";
}
