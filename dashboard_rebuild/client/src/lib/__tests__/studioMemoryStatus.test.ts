import { describe, expect, it } from "vitest";

import { buildStudioMemoryStatus } from "@/lib/studioMemoryStatus";

describe("buildStudioMemoryStatus", () => {
  it("projects the latest capsule, history, and compaction state from workflow memory", () => {
    expect(
      buildStudioMemoryStatus({
        memoryCapsules: [
          {
            id: 1,
            workflow_id: "wf-1",
            tutor_session_id: "sess-1",
            stage: "tutor",
            capsule_version: 1,
            summary_text: "Established the first hemodynamics summary.",
            current_objective: "Cardiac output",
            study_unit: "Week 7",
            concept_focus: [],
            weak_points: [],
            unresolved_questions: [],
            exact_notes: [],
            editable_notes: [],
            feedback: [],
            card_requests: [],
            artifact_refs: [],
            source_turn_ids: [],
            created_at: "2026-03-25T10:30:00Z",
          },
          {
            id: 2,
            workflow_id: "wf-1",
            tutor_session_id: "sess-1",
            stage: "tutor",
            capsule_version: 2,
            summary_text:
              "Captured the misconception about preload versus heart rate.",
            current_objective: "Preload versus heart rate",
            study_unit: "Week 7",
            concept_focus: [],
            weak_points: [],
            unresolved_questions: [],
            exact_notes: [],
            editable_notes: [],
            feedback: [],
            card_requests: [],
            artifact_refs: [],
            source_turn_ids: [],
            created_at: "2026-03-25T11:45:00Z",
          },
        ],
        turnCount: 11,
        latestAssistantContent:
          "Stroke volume, preload, and afterload all shape cardiac output. ".repeat(
            20,
          ),
        stageTimerDisplaySeconds: 4_200,
      }),
    ).toMatchObject({
      capsuleCountLabel: "2 capsules total",
      latestCapsule: {
        versionLabel: "Capsule v2",
        summary:
          "Captured the misconception about preload versus heart rate.",
      },
      history: [
        { versionLabel: "Capsule v2" },
        { versionLabel: "Capsule v1" },
      ],
      compactionState: {
        label: "Compaction soon",
        level: "critical",
      },
    });
  });

  it("projects compaction state from backend telemetry when it is available", () => {
    expect(
      buildStudioMemoryStatus({
        memoryCapsules: [],
        turnCount: 1,
        latestAssistantContent: "Short answer.",
        stageTimerDisplaySeconds: 90,
        compactionTelemetry: {
          inputTokens: 11_400,
          outputTokens: 2_400,
          tokenCount: 13_800,
          contextWindow: 24_000,
          pressureLevel: "medium",
        },
      }),
    ).toMatchObject({
      compactionState: {
        level: "warning",
        label: "Getting heavy",
        detail: "Using 13,800 / 24,000 tokens of live context.",
      },
    });
  });
});
