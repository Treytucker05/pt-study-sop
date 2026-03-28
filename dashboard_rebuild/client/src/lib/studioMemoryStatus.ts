import type { TutorMemoryCapsule } from "@/lib/api";

export type StudioTutorContextHealthLevel = "healthy" | "warning" | "critical";

export interface StudioTutorContextHealth {
  level: StudioTutorContextHealthLevel;
  label: string;
  detail: string;
}

export interface StudioTutorContextHealthInput {
  turnCount: number;
  memoryCapsuleCount: number;
  latestAssistantCharacters: number;
  stageTimerDisplaySeconds: number;
  compactionTelemetry?: Record<string, unknown> | null;
}

export interface StudioMemoryHistoryEntry {
  id: number;
  versionLabel: string;
  summary: string;
  objective: string | null;
  createdAtLabel: string;
}

export interface StudioMemoryStatusModel {
  capsuleCountLabel: string;
  latestCapsule: StudioMemoryHistoryEntry | null;
  history: StudioMemoryHistoryEntry[];
  compactionState: StudioTutorContextHealth;
}

export interface BuildStudioMemoryStatusInput {
  memoryCapsules: TutorMemoryCapsule[];
  turnCount: number;
  latestAssistantContent?: string | null;
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

function formatCapsuleTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildHistoryEntry(
  capsule: TutorMemoryCapsule,
): StudioMemoryHistoryEntry {
  return {
    id: capsule.id,
    versionLabel: `Capsule v${capsule.capsule_version}`,
    summary:
      capsule.summary_text?.trim() || "No summary captured for this capsule yet.",
    objective: capsule.current_objective?.trim() || null,
    createdAtLabel: formatCapsuleTimestamp(capsule.created_at),
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

export function buildStudioMemoryStatus({
  memoryCapsules,
  turnCount,
  latestAssistantContent,
  stageTimerDisplaySeconds,
  compactionTelemetry,
}: BuildStudioMemoryStatusInput): StudioMemoryStatusModel {
  const sortedCapsules = [...memoryCapsules].sort((left, right) => {
    if (right.capsule_version !== left.capsule_version) {
      return right.capsule_version - left.capsule_version;
    }
    return right.id - left.id;
  });
  const history = sortedCapsules.map(buildHistoryEntry);

  return {
    capsuleCountLabel: `${memoryCapsules.length} capsule${memoryCapsules.length === 1 ? "" : "s"} total`,
    latestCapsule: history[0] ?? null,
    history,
    compactionState: getStudioTutorContextHealth({
      turnCount,
      memoryCapsuleCount: memoryCapsules.length,
      latestAssistantCharacters: latestAssistantContent?.trim().length ?? 0,
      stageTimerDisplaySeconds,
      compactionTelemetry,
    }),
  };
}
