import { createShapeId, toRichText } from "@tldraw/tlschema";

import type { SessionMaterialBundle } from "@/lib/sessionMaterialBundle";

export const SESSION_SEED_SHAPE_PREFIX = "session-seed";

/**
 * Deterministic grid for seed shapes:
 * - 3 columns
 * - 320 wide × 240 tall boxes with 40 padding
 * - first frame at (96, 96)
 */
const GRID_COLUMNS = 3;
const BOX_WIDTH = 320;
const BOX_HEIGHT = 240;
const BOX_PAD = 40;
const GRID_ORIGIN_X = 96;
const GRID_ORIGIN_Y = 96;
const MAX_FRAMES = 12;

export function getSessionSeedShapeId(key: string) {
  return createShapeId(`${SESSION_SEED_SHAPE_PREFIX}-${key}`);
}

export function isSessionSeedShapeId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith(`shape:${SESSION_SEED_SHAPE_PREFIX}-`);
}

export type SessionSeedShapeSpec = {
  id: ReturnType<typeof createShapeId>;
  type: "note";
  x: number;
  y: number;
  props: { richText: ReturnType<typeof toRichText> };
  meta: { source: "session-seed"; role: "lo"; sessionKey: string };
};

function buildFrameBody(
  title: string,
  bullets: string[],
): string {
  const cleanedBullets = bullets
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (cleanedBullets.length === 0) return title;
  return [title, "", ...cleanedBullets.map((b) => `• ${b}`)].join("\n");
}

/**
 * Build one note-shape per Learning Objective in the bundle, laid out as a
 * deterministic grid. The first few concepts that mention the LO are attached
 * as bullets inside the frame body.
 */
export function buildSessionSeedShapes(
  bundle: SessionMaterialBundle,
): SessionSeedShapeSpec[] {
  if (!bundle.isReady) return [];
  const objectives = bundle.learningObjectives.slice(0, MAX_FRAMES);
  if (objectives.length === 0) return [];

  const lowerConcepts = bundle.concepts.map((c) => ({
    label: c.concept,
    needle: c.concept.toLowerCase(),
  }));

  return objectives.map((lo, idx) => {
    const column = idx % GRID_COLUMNS;
    const row = Math.floor(idx / GRID_COLUMNS);
    const x = GRID_ORIGIN_X + column * (BOX_WIDTH + BOX_PAD);
    const y = GRID_ORIGIN_Y + row * (BOX_HEIGHT + BOX_PAD);

    const loTitle = lo.loCode ? `${lo.loCode} — ${lo.title}` : lo.title;
    const loNeedle = lo.title.toLowerCase();
    const relatedBullets = lowerConcepts
      .filter(({ needle }) => loNeedle.includes(needle) || needle.includes(loNeedle))
      .map(({ label }) => label);

    return {
      id: getSessionSeedShapeId(`lo-${idx}`),
      type: "note" as const,
      x,
      y,
      props: {
        richText: toRichText(buildFrameBody(loTitle, relatedBullets)),
      },
      meta: {
        source: "session-seed" as const,
        role: "lo" as const,
        sessionKey: bundle.sessionKey,
      },
    };
  });
}
