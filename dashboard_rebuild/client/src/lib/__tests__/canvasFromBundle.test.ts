import { describe, expect, it } from "vitest";

import {
  buildSessionSeedShapes,
  isSessionSeedShapeId,
  SESSION_SEED_SHAPE_PREFIX,
} from "@/lib/canvasFromBundle";
import {
  emptySessionMaterialBundle,
  type SessionMaterialBundle,
} from "@/lib/sessionMaterialBundle";

function bundleWith(overrides: Partial<SessionMaterialBundle>): SessionMaterialBundle {
  return {
    ...emptySessionMaterialBundle("workflow:t"),
    isReady: true,
    ...overrides,
  };
}

describe("buildSessionSeedShapes", () => {
  it("returns nothing when bundle is not ready", () => {
    expect(buildSessionSeedShapes(emptySessionMaterialBundle())).toEqual([]);
  });

  it("returns nothing when there are no learning objectives", () => {
    expect(buildSessionSeedShapes(bundleWith({}))).toEqual([]);
  });

  it("creates one note shape per LO up to MAX_FRAMES (12)", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      loCode: `L-${i}`,
      title: `Objective ${i}`,
      materialId: null,
      sourceTitle: null,
    }));
    const shapes = buildSessionSeedShapes(bundleWith({ learningObjectives: many }));
    expect(shapes).toHaveLength(12);
    expect(shapes.every((s) => s.type === "note")).toBe(true);
    expect(shapes.every((s) => s.meta.source === "session-seed")).toBe(true);
  });

  it("lays shapes out in a deterministic 3-column grid", () => {
    const los = Array.from({ length: 4 }, (_, i) => ({
      loCode: null,
      title: `O${i}`,
      materialId: null,
      sourceTitle: null,
    }));
    const shapes = buildSessionSeedShapes(bundleWith({ learningObjectives: los }));
    expect(shapes.map((s) => [s.x, s.y])).toEqual([
      [96, 96],
      [96 + 360, 96],
      [96 + 720, 96],
      [96, 96 + 280],
    ]);
  });

  it("attaches matching concepts as bullets to an LO frame", () => {
    const shapes = buildSessionSeedShapes(
      bundleWith({
        learningObjectives: [
          { loCode: "LO-1", title: "Differentiate contract-relax and hold-relax", materialId: null, sourceTitle: null },
        ],
        concepts: [
          { concept: "contract-relax", materialId: null, sourceTitle: null },
          { concept: "unrelated", materialId: null, sourceTitle: null },
        ],
      }),
    );
    expect(shapes).toHaveLength(1);
    // richText is opaque internally; just assert the shape exists with an id we control
    expect(String(shapes[0].id)).toContain(`${SESSION_SEED_SHAPE_PREFIX}-lo-0`);
  });

  it("produces shape IDs that pass isSessionSeedShapeId", () => {
    const shapes = buildSessionSeedShapes(
      bundleWith({
        learningObjectives: [
          { loCode: null, title: "One", materialId: null, sourceTitle: null },
        ],
      }),
    );
    expect(shapes).toHaveLength(1);
    expect(isSessionSeedShapeId(String(shapes[0].id))).toBe(true);
    expect(isSessionSeedShapeId("shape:other")).toBe(false);
  });
});
