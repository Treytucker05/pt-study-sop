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
  compactionTelemetry?: Record<string, unknown> | null;
  directNoteSaveStatus?: Record<string, unknown> | null;
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
  directNoteSave: {
    label: string;
    detail: string;
  };
}

export interface StudioTutorContextHealthInput {
  turnCount: number;
  memoryCapsuleCount: number;
  latestAssistantCharacters: number;
  stageTimerDisplaySeconds: number;
  compactionTelemetry?: Record<string, unknown> | null;
}

function normalizePositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function formatTokenCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTelemetryContextHealth(
  compactionTelemetry: Record<string, unknown> | null | undefined,
): StudioTutorContextHealth | null {
  if (!compactionTelemetry || typeof compactionTelemetry !== "object") {
    return null;
  }

  const tokenCount = normalizePositiveInteger(compactionTelemetry.tokenCount);
  const contextWindow = normalizePositiveInteger(
    compactionTelemetry.contextWindow,
  );
  const pressureLevel =
    typeof compactionTelemetry.pressureLevel === "string"
      ? compactionTelemetry.pressureLevel.trim().toLowerCase()
      : "";

  if (!tokenCount || !contextWindow || !pressureLevel) {
    return null;
  }

  const detail = `Using ${formatTokenCount(tokenCount)} / ${formatTokenCount(contextWindow)} tokens of live context.`;

  if (pressureLevel === "high") {
    return {
      level: "critical",
      label: "Compaction soon",
      detail,
    };
  }

  if (pressureLevel === "medium") {
    return {
      level: "warning",
      label: "Getting heavy",
      detail,
    };
  }

  return {
    level: "healthy",
    label: "Healthy",
    detail,
  };
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

function buildDirectNoteSaveSignal(
  directNoteSaveStatus: Record<string, unknown> | null | undefined,
): StudioTutorStatusModel["directNoteSave"] {
  if (!directNoteSaveStatus || typeof directNoteSaveStatus !== "object") {
    return {
      label: "No vault save yet",
      detail: "Direct Tutor note saves will report their latest vault status here.",
    };
  }

  const state =
    typeof directNoteSaveStatus.state === "string"
      ? directNoteSaveStatus.state.trim().toLowerCase()
      : "";
  const mode =
    typeof directNoteSaveStatus.mode === "string"
      ? directNoteSaveStatus.mode.trim().toLowerCase()
      : "note";
  const path =
    typeof directNoteSaveStatus.path === "string"
      ? directNoteSaveStatus.path.trim()
      : "";
  const error =
    typeof directNoteSaveStatus.error === "string"
      ? directNoteSaveStatus.error.trim()
      : "";

  if (state === "saving") {
    return {
      label: "Saving to vault",
      detail: `Writing the ${mode} Tutor note to Obsidian now.`,
    };
  }

  if (state === "saved") {
    return {
      label: "Saved to vault",
      detail: path || `The latest ${mode} Tutor note was written to Obsidian.`,
    };
  }

  if (state === "failed") {
    return {
      label: "Vault save failed",
      detail: error || `The latest ${mode} Tutor note could not be written to Obsidian.`,
    };
  }

  return {
    label: "No vault save yet",
    detail: "Direct Tutor note saves will report their latest vault status here.",
  };
}

export function getStudioTutorContextHealth({
  turnCount: _turnCount,
  memoryCapsuleCount: _memoryCapsuleCount,
  latestAssistantCharacters: _latestAssistantCharacters,
  stageTimerDisplaySeconds: _stageTimerDisplaySeconds,
  compactionTelemetry,
}: StudioTutorContextHealthInput): StudioTutorContextHealth {
  const telemetryHealth = getTelemetryContextHealth(compactionTelemetry);
  if (telemetryHealth) {
    return telemetryHealth;
  }

  return {
    level: "healthy",
    label: "Awaiting telemetry",
    detail:
      "Live context telemetry appears after the first completed Tutor turn.",
  };
}

export function buildStudioTutorStatus({
  scholarStrategy,
  turnCount,
  memoryCapsuleCount,
  latestAssistantContent,
  compactionTelemetry,
  directNoteSaveStatus,
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
  const directNoteSave = buildDirectNoteSaveSignal(directNoteSaveStatus);

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
      compactionTelemetry,
    }),
    ...validationSignals,
    directNoteSave,
  };
}
