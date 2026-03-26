import { describe, expect, it } from "vitest";

import { buildStudioRepairCandidates } from "@/lib/studioRepairCandidates";

describe("buildStudioRepairCandidates", () => {
  it("projects misconception, gap, and validation cues into explicit repair candidates", () => {
    expect(
      buildStudioRepairCandidates({
        latestVerdict: {
          verdict: "partial",
          confidence: 0.82,
          why_wrong:
            "The reply mixed preload effects with heart-rate regulation.",
          _validation_issues: [
            "Missing citation support for the preload claim.",
          ],
        },
        latestTeachBackRubric: {
          overall_rating: "partial",
          accuracy_score: 0.6,
          breadth_score: 0.55,
          synthesis_score: 0.5,
          confidence: 0.74,
          misconceptions: [
            "The teach-back treated preload as identical to heart rate.",
          ],
          gaps: [{ skill_id: "frank-starling" }],
          next_focus: "Differentiate preload from rate control.",
        },
      }),
    ).toEqual([
      expect.objectContaining({
        title: "Misconception to repair",
        detail: "The reply mixed preload effects with heart-rate regulation.",
        badge: "MISCONCEPTION",
      }),
      expect.objectContaining({
        title: "Validation issue",
        detail: "Missing citation support for the preload claim.",
        badge: "VALIDATION",
      }),
      expect.objectContaining({
        title: "Teach-back misconception",
        detail: "The teach-back treated preload as identical to heart rate.",
        badge: "MISCONCEPTION",
      }),
      expect.objectContaining({
        title: "Missing concept",
        detail: "Fill the missing concept: frank-starling.",
        badge: "GAP",
      }),
    ]);
  });

  it("returns an empty list when the latest judged turn has no repair cues", () => {
    expect(
      buildStudioRepairCandidates({
        latestVerdict: {
          verdict: "pass",
          confidence: 0.95,
        },
        latestTeachBackRubric: {
          overall_rating: "pass",
          accuracy_score: 0.9,
          breadth_score: 0.9,
          synthesis_score: 0.9,
          confidence: 0.93,
        },
      }),
    ).toEqual([]);
  });

  it("accumulates distinct repair candidates across assistant message history", () => {
    expect(
      buildStudioRepairCandidates({
        messageHistory: [
          {
            content: "Preload affects stroke volume.",
            verdict: {
              verdict: "partial",
              confidence: 0.7,
              why_wrong:
                "The reply collapsed preload and afterload into the same mechanism.",
            },
          },
          {
            content: "Heart rate affects cardiac output.",
            verdict: {
              verdict: "partial",
              confidence: 0.75,
              why_wrong:
                "The reply treated heart-rate control as the same as preload regulation.",
              _validation_issues: ["Missing citation support for the rate-control claim."],
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        detail: "The reply treated heart-rate control as the same as preload regulation.",
      }),
      expect.objectContaining({
        detail: "Missing citation support for the rate-control claim.",
      }),
      expect.objectContaining({
        detail: "The reply collapsed preload and afterload into the same mechanism.",
      }),
    ]);
  });
});
