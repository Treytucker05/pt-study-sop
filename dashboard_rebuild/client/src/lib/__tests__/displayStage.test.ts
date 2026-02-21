import { describe, it, expect } from "vitest";
import { getDisplayStage, DISPLAY_STAGE_LABELS } from "@/lib/displayStage";
import type { MethodBlock } from "@/api";

function makeBlock(overrides: Partial<MethodBlock> = {}): MethodBlock {
  return {
    id: 1,
    name: "Test",
    category: "retrieve",
    description: null,
    default_duration_min: 15,
    energy_cost: "medium",
    best_stage: null,
    tags: [],
    evidence: null,
    created_at: "",
    ...overrides,
  };
}

describe("getDisplayStage", () => {
  it("maps retrieve category to retrieval stage", () => {
    expect(getDisplayStage(makeBlock({ category: "retrieve" }))).toBe("retrieval");
  });

  it("maps encode category to encoding stage", () => {
    expect(getDisplayStage(makeBlock({ category: "encode" }))).toBe("encoding");
  });

  it("maps prepare category to priming stage", () => {
    expect(getDisplayStage(makeBlock({ category: "prepare" }))).toBe("priming");
  });

  it("maps overlearn category to overlearning stage", () => {
    expect(getDisplayStage(makeBlock({ category: "overlearn" }))).toBe("overlearning");
  });

  it("returns calibrate when tag includes calibrate", () => {
    expect(getDisplayStage(makeBlock({ category: null, tags: ["calibrate", "solo"] }))).toBe("calibrate");
  });

  it("prefers control_stage over category", () => {
    expect(getDisplayStage(makeBlock({ control_stage: "prime", category: "encode" } as any))).toBe("priming");
  });

  it("defaults to encoding for unknown category", () => {
    expect(getDisplayStage(makeBlock({ category: "unknown" }))).toBe("encoding");
  });
});

describe("DISPLAY_STAGE_LABELS", () => {
  it("has labels for all stages", () => {
    expect(DISPLAY_STAGE_LABELS.priming).toBe("PRIMING");
    expect(DISPLAY_STAGE_LABELS.calibrate).toBe("CALIBRATE");
    expect(DISPLAY_STAGE_LABELS.retrieval).toBe("RETRIEVAL");
    expect(DISPLAY_STAGE_LABELS.overlearning).toBe("OVERLEARNING");
  });
});
