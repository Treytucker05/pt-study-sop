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

  it("has labels for encoding and reference stages", () => {
    expect(DISPLAY_STAGE_LABELS.encoding).toBe("ENCODING");
    expect(DISPLAY_STAGE_LABELS.reference).toBe("REFERENCE");
  });
});

describe("getDisplayStage edge cases", () => {
  it("returns encoding for null block", () => {
    expect(getDisplayStage(null)).toBe("encoding");
  });

  it("returns encoding for undefined block", () => {
    expect(getDisplayStage(undefined)).toBe("encoding");
  });

  it("returns encoding for empty block", () => {
    expect(getDisplayStage(makeBlock({ category: null, best_stage: null, tags: [] }))).toBe("encoding");
  });

  it("returns encoding for block with null tags", () => {
    expect(getDisplayStage(makeBlock({ category: null, tags: null as any }))).toBe("encoding");
  });

  it("normalizes whitespace in category values", () => {
    expect(getDisplayStage(makeBlock({ category: "  Retrieve  " }))).toBe("retrieval");
  });

  it("handles case-insensitive category matching", () => {
    expect(getDisplayStage(makeBlock({ category: "ENCODE" }))).toBe("encoding");
    expect(getDisplayStage(makeBlock({ category: "Prepare" }))).toBe("priming");
  });

  it("handles spaces in category (replaced with underscore)", () => {
    expect(getDisplayStage(makeBlock({ category: "over learn" }))).toBe("encoding");
  });

  it("maps best_stage when category is null", () => {
    expect(getDisplayStage(makeBlock({ category: null, best_stage: "first_exposure" }))).toBe("priming");
    expect(getDisplayStage(makeBlock({ category: null, best_stage: "consolidation" }))).toBe("overlearning");
    expect(getDisplayStage(makeBlock({ category: null, best_stage: "exam_prep" }))).toBe("retrieval");
  });

  it("maps legacy PEIRRO categories", () => {
    expect(getDisplayStage(makeBlock({ category: "interrogate" }))).toBe("reference");
    expect(getDisplayStage(makeBlock({ category: "refine" }))).toBe("overlearning");
  });

  it("maps CP-MSS v1.0 control_stage values", () => {
    expect(getDisplayStage(makeBlock({ control_stage: "prime" } as any))).toBe("priming");
    expect(getDisplayStage(makeBlock({ control_stage: "calibrate" } as any))).toBe("calibrate");
    expect(getDisplayStage(makeBlock({ control_stage: "reference" } as any))).toBe("reference");
  });

  it("control_stage takes priority over best_stage", () => {
    expect(getDisplayStage(makeBlock({
      control_stage: "overlearn",
      best_stage: "priming",
    } as any))).toBe("overlearning");
  });

  it("falls through all layers to tags", () => {
    expect(getDisplayStage(makeBlock({
      control_stage: null,
      category: null,
      best_stage: null,
      tags: ["encoding"],
    } as any))).toBe("encoding");
  });
});
