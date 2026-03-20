import { getMethodControlStage } from "@/lib/controlStages";

export type DisplayStage =
  | "priming"
  | "teaching"
  | "calibrate"
  | "encoding"
  | "reference"
  | "retrieval"
  | "overlearning"

export const DISPLAY_STAGE_LABELS: Record<DisplayStage, string> = {
  priming: "PRIMING",
  teaching: "TEACH",
  calibrate: "CALIBRATE",
  encoding: "ENCODING",
  reference: "REFERENCE",
  retrieval: "RETRIEVAL",
  overlearning: "OVERLEARNING",
}

const BEST_STAGE_MAP: Record<string, DisplayStage> = {
  priming: "priming",
  first_exposure: "priming",
  teach: "teaching",
  teaching: "teaching",
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
  // Control Plane (CP-MSS v2.0) stages
  prime: "priming",
  teach: "teaching",
  teaching: "teaching",
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

  const controlStage = getMethodControlStage(block)
  if (controlStage === "PRIME") return "priming"
  if (controlStage === "TEACH") return "teaching"
  if (controlStage === "CALIBRATE") return "calibrate"
  if (controlStage === "ENCODE") return "encoding"
  if (controlStage === "REFERENCE") return "reference"
  if (controlStage === "RETRIEVE") return "retrieval"
  if (controlStage === "OVERLEARN") return "overlearning"

  // Fall back to category/best-stage aliases when stage normalization cannot resolve.
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
