import { describe, expect, it } from "vitest";

import {
  buildStudioTutorStatus,
  getStudioTutorContextHealth,
} from "@/lib/studioTutorStatus";

describe("getStudioTutorContextHealth", () => {
  it("reports healthy when the current session load is light", () => {
    expect(
      getStudioTutorContextHealth({
        turnCount: 2,
        memoryCapsuleCount: 0,
        latestAssistantCharacters: 120,
        stageTimerDisplaySeconds: 600,
      }),
    ).toMatchObject({
      level: "healthy",
      label: "Healthy",
    });
  });

  it("reports getting heavy when session load starts building", () => {
    expect(
      getStudioTutorContextHealth({
        turnCount: 9,
        memoryCapsuleCount: 1,
        latestAssistantCharacters: 500,
        stageTimerDisplaySeconds: 2_700,
      }),
    ).toMatchObject({
      level: "warning",
      label: "Getting heavy",
    });
  });

  it("reports compaction soon when context pressure is high", () => {
    expect(
      getStudioTutorContextHealth({
        turnCount: 11,
        memoryCapsuleCount: 2,
        latestAssistantCharacters: 1_300,
        stageTimerDisplaySeconds: 4_200,
      }),
    ).toMatchObject({
      level: "critical",
      label: "Compaction soon",
    });
  });
});

describe("buildStudioTutorStatus", () => {
  it("surfaces runtime and adaptive status fields for the Tutor Status panel", () => {
    expect(
      buildStudioTutorStatus({
        scholarStrategy: {
          strategyId: "strategy-1",
          generatedAt: "2026-03-25T10:00:00Z",
          profileSnapshotId: 42,
          hybridArchetype: {
            slug: "retrieval-coach",
            label: "Adaptive Retrieval Coach",
          },
          boundedBy: {
            allowedFields: [],
            forbiddenFields: [],
            note: "Stay inside the packet.",
          },
          fields: {},
          summary: "Fade scaffolds slowly while pushing retrieval first.",
        },
        turnCount: 11,
        memoryCapsuleCount: 2,
        latestAssistantContent:
          "Stroke volume, preload, and afterload all shape cardiac output. ".repeat(
            20,
          ),
        latestVerdict: {
          verdict: "partial",
          confidence: 0.82,
          why_wrong: "The reply mixed preload effects with heart-rate regulation.",
          _validation_issues: [
            "Missing citation support for the preload claim.",
            "Next hint should be present for partial verdicts.",
          ],
        },
        stageTimerDisplaySeconds: 4_200,
        stageTimerRunning: true,
      }),
    ).toMatchObject({
      strategyLabel: "Adaptive Retrieval Coach",
      strategySummary: "Fade scaffolds slowly while pushing retrieval first.",
      turnCountLabel: "11 turns",
      stageTimerLabel: "1:10:00",
      memoryCapsuleLabel: "2 capsules",
      runtimeStateLabel: "Live",
      contextHealth: {
        label: "Compaction soon",
        level: "critical",
      },
      rulesFollowingLabel: "2 validation issues",
      provenanceConfidenceLabel: "82% confidence",
      repairSignal: {
        label: "Needs repair",
        detail: "The reply mixed preload effects with heart-rate regulation.",
      },
    });
  });
});
