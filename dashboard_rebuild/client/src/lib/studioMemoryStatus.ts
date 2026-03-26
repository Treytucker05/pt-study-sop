import type { TutorMemoryCapsule } from "@/lib/api";

import {
  getStudioTutorContextHealth,
  type StudioTutorContextHealth,
} from "@/lib/studioTutorStatus";

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

export function buildStudioMemoryStatus({
  memoryCapsules,
  turnCount,
  latestAssistantContent,
  stageTimerDisplaySeconds,
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
    }),
  };
}
