export type DisplayStage =
  | "priming"
  | "calibrate"
  | "encoding"
  | "reference"
  | "retrieval"
  | "overlearning"

export const DISPLAY_STAGE_LABELS: Record<DisplayStage, string> = {
  priming: "PRIMING",
  calibrate: "CALIBRATE",
  encoding: "ENCODING",
  reference: "REFERENCE",
  retrieval: "RETRIEVAL",
  overlearning: "OVERLEARNING",
}

const BEST_STAGE_MAP: Record<string, DisplayStage> = {
  priming: "priming",
  first_exposure: "priming",
  calibrate: "calibrate",
  calibration: "calibrate",
  encoding: "encoding",
  encode: "encoding",
  reference: "reference",
  review: "reference",
  retrieval: "retrieval",
  exam_prep: "retrieval",
  overlearning: "overlearning",
  consolidation: "overlearning",
}

const CATEGORY_MAP: Record<string, DisplayStage> = {
  // Control Plane (CP-MSS v1.0) stages
  prime: "priming",
  calibrate: "calibrate",
  encode: "encoding",
  reference: "reference",
  retrieve: "retrieval",
  overlearn: "overlearning",
  // Legacy PEIRRO categories
  prepare: "priming",
  interrogate: "reference",
  refine: "overlearning",
}

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : ""
}

export function getDisplayStage(
  block: {
    best_stage?: string | null
    category?: string | null
    control_stage?: string | null
    tags?: string[] | null
  } | null | undefined
): DisplayStage {
  if (!block) return "encoding"

  // Check control_stage (Control Plane) FIRST - highest priority
  const controlStage = CATEGORY_MAP[normalize(block.control_stage)]
  if (controlStage) return controlStage

  // Fall back to category (legacy)
  const category = CATEGORY_MAP[normalize(block.category)]
  if (category) return category

  // Check best_stage last (it can be misleading for CP taxonomy)
  const bestStage = BEST_STAGE_MAP[normalize(block.best_stage)]
  if (bestStage) return bestStage

  // Check tags as last resort
  for (const tag of block.tags || []) {
    const fromTag = BEST_STAGE_MAP[normalize(tag)]
    if (fromTag) return fromTag
  }

  return "encoding"
}
