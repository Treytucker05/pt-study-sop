export const CONTROL_STAGE_ORDER = [
  "PRIME",
  "TEACH",
  "CALIBRATE",
  "ENCODE",
  "REFERENCE",
  "RETRIEVE",
  "OVERLEARN",
] as const;

export type ControlStage = (typeof CONTROL_STAGE_ORDER)[number];

export const CONTROL_STAGE_LABELS: Record<ControlStage, string> = {
  PRIME: "PRIME",
  TEACH: "TEACH",
  CALIBRATE: "CALIBRATE",
  ENCODE: "ENCODE",
  REFERENCE: "REFERENCE",
  RETRIEVE: "RETRIEVE",
  OVERLEARN: "OVERLEARN",
};

export type MethodStageLike = {
  control_stage?: string | null;
  category?: string | null;
};

const STAGE_ALIASES: Record<string, ControlStage> = {
  prime: "PRIME",
  priming: "PRIME",
  prepare: "PRIME",
  teach: "TEACH",
  teaching: "TEACH",
  calibrate: "CALIBRATE",
  calibration: "CALIBRATE",
  encode: "ENCODE",
  encoding: "ENCODE",
  reference: "REFERENCE",
  interrogate: "REFERENCE",
  retrieve: "RETRIEVE",
  retrieval: "RETRIEVE",
  overlearn: "OVERLEARN",
  overlearning: "OVERLEARN",
  refine: "OVERLEARN",
};

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : "";
}

export function getNormalizedControlStage(value: unknown): ControlStage | null {
  return STAGE_ALIASES[normalize(value)] ?? null;
}

export function getMethodControlStage(block: MethodStageLike | null | undefined): ControlStage | null {
  if (!block) return null;
  return getNormalizedControlStage(block.control_stage) ?? getNormalizedControlStage(block.category);
}

export function getMethodStageColorKey(block: MethodStageLike | null | undefined): string {
  const stage = getMethodControlStage(block);
  if (stage) return stage;

  const rawCategory = normalize(block?.category);
  if (!rawCategory) return "";
  if (rawCategory === "teaching") return "teach";
  return rawCategory;
}

export function getMethodStageBadgeLabel(block: MethodStageLike | null | undefined): string {
  const stage = getMethodControlStage(block);
  if (stage) return CONTROL_STAGE_LABELS[stage];
  return typeof block?.control_stage === "string" && block.control_stage.trim().length > 0
    ? block.control_stage.trim().toUpperCase()
    : typeof block?.category === "string" && block.category.trim().length > 0
      ? block.category.trim().toUpperCase()
      : "BLOCK";
}

export function getChainStageWarnings(blocks: MethodStageLike[]): string[] {
  if (blocks.length < 2) return [];

  const warnings: string[] = [];
  const stages = blocks.map((block) => getMethodControlStage(block));
  const stageSet = new Set(stages.filter(Boolean));

  const firstPrimeIdx = stages.indexOf("PRIME");
  const firstTeachIdx = stages.indexOf("TEACH");
  const firstCalibrateIdx = stages.indexOf("CALIBRATE");
  const firstEncodeIdx = stages.indexOf("ENCODE");
  const firstRetrieveIdx = stages.indexOf("RETRIEVE");
  const firstReferenceIdx = stages.indexOf("REFERENCE");

  if (firstTeachIdx !== -1 && firstPrimeIdx !== -1 && firstTeachIdx < firstPrimeIdx) {
    warnings.push("TEACH appears before PRIME — orient the learner before teaching when both stages are present.");
  }

  if (firstTeachIdx !== -1 && firstCalibrateIdx !== -1 && firstCalibrateIdx < firstTeachIdx) {
    warnings.push("CALIBRATE appears before TEACH — teach unfamiliar material before checking it when both stages are present.");
  }

  if (firstRetrieveIdx !== -1 && firstEncodeIdx !== -1 && firstRetrieveIdx < firstEncodeIdx) {
    warnings.push("RETRIEVE appears before ENCODE — encode first for stronger retention.");
  }

  if (!stageSet.has("REFERENCE") && !stageSet.has("RETRIEVE")) {
    warnings.push("No REFERENCE or RETRIEVE block — add grounding or testing for durable learning.");
  }

  if (blocks.length >= 3 && !stageSet.has("PRIME")) {
    warnings.push("No PRIME block — consider adding a short orientation block before TEACH or ENCODE.");
  }

  return warnings;
}
