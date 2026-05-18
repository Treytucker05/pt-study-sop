import { describe, expect, it } from "vitest";

import {
  conceptMapToTldrawShapes,
  isConceptMapCanvasShapeId,
  isMindMapCanvasShapeId,
  mindMapToTldrawShapes,
} from "@/lib/canvasGraphFromMaps";
import {
  emptySessionMaterialBundle,
  type SessionMaterialBundle,
} from "@/lib/sessionMaterialBundle";

function bundleWith(
  overrides: Partial<SessionMaterialBundle>,
): SessionMaterialBundle {
  return {
    ...emptySessionMaterialBundle("workflow:test"),
    isReady: true,
    ...overrides,
  };
}

// Valid tldraw DefaultColorStyle values (must stay in sync with @tldraw).
const TLDRAW_COLORS = new Set([
  "black",
  "blue",
  "green",
  "grey",
  "light-blue",
  "light-green",
  "light-red",
  "light-violet",
  "orange",
  "red",
  "violet",
  "white",
  "yellow",
]);

describe("mindMapToTldrawShapes", () => {
  it("returns no shapes for an empty/not-ready bundle", () => {
    const { shapes, bounds } = mindMapToTldrawShapes(
      emptySessionMaterialBundle("workflow:test"),
    );
    expect(shapes).toEqual([]);
    expect(bounds).toBeNull();
  });

  it("emits native tldraw geo nodes + arrow edges with valid props", () => {
    const { shapes, bounds } = mindMapToTldrawShapes(
      bundleWith({
        topic: "Integumentary",
        learningObjectives: [
          { loCode: "LO-1", title: "Wound healing", materialId: null, sourceTitle: null },
          { loCode: "LO-2", title: "Burns", materialId: null, sourceTitle: null },
        ],
        concepts: [
          { concept: "debridement", materialId: null, sourceTitle: null },
        ],
      }),
    );

    const geo = shapes.filter((s) => s.type === "geo");
    const arrows = shapes.filter((s) => s.type === "arrow");

    // root + 2 LOs + 1 concept = 4 nodes; 3 edges (root→LO×2, LO/root→concept)
    expect(geo).toHaveLength(4);
    expect(arrows).toHaveLength(3);

    for (const g of geo) {
      if (g.type !== "geo") continue;
      expect(g.props.geo).toBe("rectangle");
      expect(g.props.w).toBeGreaterThan(0);
      expect(g.props.h).toBeGreaterThan(0);
      expect(TLDRAW_COLORS.has(g.props.color)).toBe(true);
      expect(g.props.font).toBe("mono");
      expect(isMindMapCanvasShapeId(String(g.id))).toBe(true);
      // laid out at/after the overlay-clearing origin
      expect(g.x).toBeGreaterThanOrEqual(460 - 1);
    }
    for (const a of arrows) {
      if (a.type !== "arrow") continue;
      expect(Number.isFinite(a.props.start.x)).toBe(true);
      expect(Number.isFinite(a.props.end.y)).toBe(true);
      expect(a.props.arrowheadEnd).toBe("arrow");
    }

    expect(bounds).not.toBeNull();
    expect(bounds!.w).toBeGreaterThan(0);
    expect(bounds!.h).toBeGreaterThan(0);
  });

  it("places different node ranks at different x (dagre LR layout)", () => {
    const { shapes } = mindMapToTldrawShapes(
      bundleWith({
        topic: "Root",
        learningObjectives: [
          { loCode: null, title: "Child A", materialId: null, sourceTitle: null },
        ],
      }),
    );
    const geo = shapes.filter((s) => s.type === "geo");
    const xs = new Set(geo.map((g) => Math.round(g.x)));
    // root and its child must not stack at the same x in an LR layout
    expect(xs.size).toBeGreaterThan(1);
  });
});

describe("conceptMapToTldrawShapes", () => {
  it("returns nothing for a not-ready bundle", () => {
    const { shapes, bounds } = conceptMapToTldrawShapes(
      emptySessionMaterialBundle("workflow:test"),
    );
    expect(shapes).toEqual([]);
    expect(bounds).toBeNull();
  });

  it("emits native geo nodes for concepts with valid props + ids", () => {
    const { shapes, bounds } = conceptMapToTldrawShapes(
      bundleWith({
        concepts: [
          { concept: "Reciprocal inhibition", materialId: null, sourceTitle: null },
          { concept: "Autogenic inhibition", materialId: null, sourceTitle: null },
        ],
      }),
    );
    const geo = shapes.filter((s) => s.type === "geo");
    expect(geo).toHaveLength(2);
    for (const g of geo) {
      if (g.type !== "geo") continue;
      expect(g.props.geo).toBe("rectangle");
      expect(g.props.color).toBe("blue");
      expect(g.props.font).toBe("mono");
      expect(g.props.w).toBeGreaterThan(0);
      expect(isConceptMapCanvasShapeId(String(g.id))).toBe(true);
      expect(g.x).toBeGreaterThanOrEqual(460 - 1);
    }
    expect(bounds).not.toBeNull();
  });
});
