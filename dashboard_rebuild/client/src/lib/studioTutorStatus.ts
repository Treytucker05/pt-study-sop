import type {
  TeachBackRubric,
  TutorScholarStrategy,
  TutorVerdict,
} from "@/lib/api";
import { formatElapsedDuration } from "@/lib/tutorUtils";

export type StudioTutorContextHealthLevel = "healthy" | "warning" | "critical";

export interface StudioTutorContextHealth {
  level: StudioTutorContextHealthLevel;
  label: string;
  detail: string;
}

export interface BuildStudioTutorStatusInput {
  scholarStrategy: TutorScholarStrategy | null;
  turnCount: number;
  memoryCapsuleCount: number;
  latestAssistantContent?: string | null;
  latestVerdict?: TutorVerdict | null;
  latestTeachBackRubric?: TeachBackRubric | null;
  stageTimerDisplaySeconds: number;
  stageTimerRunning: boolean;
}

export interface StudioTutorStatusModel {
  strategyLabel: string;
  strategySummary: string;
  turnCountLabel: string;
  stageTimerLabel: string;
  memoryCapsuleLabel: string;
  runtimeStateLabel: string;
  contextHealth: StudioTutorContextHealth;
  rulesFollowingLabel: string;
  rulesFollowingDetail: string;
  provenanceConfidenceLabel: string;
  repairSignal: {
    label: string;
    detail: string;
  };
}

export interface StudioTutorContextHealthInput {
  turnCount: number;
  memoryCapsuleCount: number;
  latestAssistantCharacters: number;
  stageTimerDisplaySeconds: number;
}

function normalizeConfidenceScore(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "No confidence score yet";
  }
  const normalized = value > 1 ? value : value * 100;
  const clamped = Math.max(0, Math.min(100, normalized));
  return `${Math.round(clamped)}% confidence`;
}

function buildValidationSignals(
  latestVerdict: TutorVerdict | null | undefined,
  latestTeachBackRubric: TeachBackRubric | null | undefined,
): Pick<
  StudioTutorStatusModel,
  | "rulesFollowingLabel"
  | "rulesFollowingDetail"
  | "provenanceConfidenceLabel"
  | "repairSignal"
> {
  const validationIssues = [
    ...(latestVerdict?._validation_issues ?? []),
    ...(latestTeachBackRubric?._validation_issues ?? []),
  ];
  const hasRepairSignal =
    validationIssues.length > 0 ||
    latestVerdict?.verdict === "fail" ||
    latestVerdict?.verdict === "partial" ||
    latestTeachBackRubric?.overall_rating === "fail" ||
    latestTeachBackRubric?.overall_rating === "partial";
  const confidence =
    latestVerdict?.confidence ?? latestTeachBackRubric?.confidence ?? null;

  if (!latestVerdict && !latestTeachBackRubric) {
    return {
      rulesFollowingLabel: "Awaiting judged turn",
      rulesFollowingDetail:
        "Validation and repair cues will appear after the first judged response.",
      provenanceConfidenceLabel: "No confidence score yet",
      repairSignal: {
        label: "No repair signal yet",
        detail: "No judged turn has produced a repair cue yet.",
      },
    };
  }

  const rulesFollowingLabel =
    validationIssues.length > 0
      ? `${validationIssues.length} validation issue${validationIssues.length === 1 ? "" : "s"}`
      : "Structured output valid";
  const rulesFollowingDetail =
    validationIssues[0] ||
    (latestVerdict
      ? `Latest verdict: ${latestVerdict.verdict}.`
      : latestTeachBackRubric
        ? `Teach-back rating: ${latestTeachBackRubric.overall_rating}.`
        : "No validation details available.");
  const repairDetail =
    latestVerdict?.why_wrong ||
    latestVerdict?.next_hint ||
    latestTeachBackRubric?.next_focus ||
    (hasRepairSignal
      ? "Use the latest validation issues to decide whether this turn needs repair."
      : "No active repair cue.");

  return {
    rulesFollowingLabel,
    rulesFollowingDetail,
    provenanceConfidenceLabel: normalizeConfidenceScore(confidence),
    repairSignal: {
      label: hasRepairSignal ? "Needs repair" : "No repair signal",
      detail: repairDetail,
    },
  };
}

export function getStudioTutorContextHealth({
  turnCount,
  memoryCapsuleCount,
  latestAssistantCharacters,
  stageTimerDisplaySeconds,
}: StudioTutorContextHealthInput): StudioTutorContextHealth {
  let pressureScore = 0;

  if (turnCount >= 8) pressureScore += 1;
  if (turnCount >= 12) pressureScore += 1;
  if (memoryCapsuleCount >= 1) pressureScore += 1;
  if (memoryCapsuleCount >= 2) pressureScore += 1;
  if (latestAssistantCharacters >= 900) pressureScore += 1;
  if (stageTimerDisplaySeconds >= 45 * 60) pressureScore += 1;

  if (pressureScore >= 4) {
    return {
      level: "critical",
      label: "Compaction soon",
      detail:
        "Session context is dense enough that automatic compaction is likely soon.",
    };
  }

  if (pressureScore >= 2) {
    return {
      level: "warning",
      label: "Getting heavy",
      detail:
        "Context is building. Keep an eye on compaction if long replies and more turns keep stacking.",
    };
  }

  return {
    level: "healthy",
    label: "Healthy",
    detail: "Context still has room before compaction pressure starts building.",
  };
}

export function buildStudioTutorStatus({
  scholarStrategy,
  turnCount,
  memoryCapsuleCount,
  latestAssistantContent,
  latestVerdict,
  latestTeachBackRubric,
  stageTimerDisplaySeconds,
  stageTimerRunning,
}: BuildStudioTutorStatusInput): StudioTutorStatusModel {
  const strategyLabel =
    scholarStrategy?.hybridArchetype?.label || "Default Tutor rules";
  const strategySummary =
    scholarStrategy?.summary ||
    "Adaptive scholar strategy has not been attached to this run yet.";
  const runtimeStateLabel = stageTimerRunning
    ? "Live"
    : turnCount > 0
      ? "Paused"
      : "Not started";
  const validationSignals = buildValidationSignals(
    latestVerdict,
    latestTeachBackRubric,
  );

  return {
    strategyLabel,
    strategySummary,
    turnCountLabel: `${turnCount} turn${turnCount === 1 ? "" : "s"}`,
    stageTimerLabel: formatElapsedDuration(stageTimerDisplaySeconds),
    memoryCapsuleLabel: `${memoryCapsuleCount} capsule${memoryCapsuleCount === 1 ? "" : "s"}`,
    runtimeStateLabel,
    contextHealth: getStudioTutorContextHealth({
      turnCount,
      memoryCapsuleCount,
      latestAssistantCharacters: latestAssistantContent?.trim().length ?? 0,
      stageTimerDisplaySeconds,
    }),
    ...validationSignals,
  };
}
