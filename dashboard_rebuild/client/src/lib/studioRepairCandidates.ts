import type { TeachBackRubric, TutorVerdict } from "@/lib/api";

export type StudioRepairCandidateSource = "verdict" | "teach_back";

export interface StudioRepairCandidate {
  id: string;
  title: string;
  detail: string;
  badge: "MISCONCEPTION" | "VALIDATION" | "GAP" | "FOCUS";
  source: StudioRepairCandidateSource;
  sourceLabel: string;
}

export interface BuildStudioRepairCandidatesInput {
  latestVerdict?: TutorVerdict | null;
  latestTeachBackRubric?: TeachBackRubric | null;
  messageHistory?: Array<{
    content?: string | null;
    sessionTurnNumber?: number;
    verdict?: TutorVerdict | null;
    teachBackRubric?: TeachBackRubric | null;
    sourceLabel?: string;
  }>;
}

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function hashSeed(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function getStudioRepairCandidateId({
  source,
  title,
  detail,
}: Pick<StudioRepairCandidate, "source" | "title" | "detail">) {
  return `repair:${source}:${hashSeed(
    [source, normalizeText(title), normalizeText(detail)].join("::"),
  )}`;
}

function pushCandidate(
  candidates: StudioRepairCandidate[],
  seenDetails: Set<string>,
  candidate: Omit<StudioRepairCandidate, "id" | "sourceLabel"> & {
    sourceLabel?: string;
  },
) {
  const detail = normalizeText(candidate.detail);
  if (!detail) return;

  const dedupeKey = detail.toLowerCase();
  if (seenDetails.has(dedupeKey)) return;
  seenDetails.add(dedupeKey);

  candidates.push({
    id: getStudioRepairCandidateId({
      source: candidate.source,
      title: candidate.title,
      detail,
    }),
    title: candidate.title,
    detail,
    badge: candidate.badge,
    source: candidate.source,
    sourceLabel:
      candidate.sourceLabel ??
      (candidate.source === "verdict" ? "Latest verdict" : "Teach-back rubric"),
  });
}

function formatGapDetail(
  gap: NonNullable<TeachBackRubric["gaps"]>[number],
): string {
  const skillId = normalizeText(gap.skill_id);
  const edgeId = normalizeText(gap.edge_id ?? null);

  if (skillId && edgeId) {
    return `Fill the missing concept: ${skillId} (${edgeId}).`;
  }

  if (skillId) {
    return `Fill the missing concept: ${skillId}.`;
  }

  if (edgeId) {
    return `Restore the missing connection: ${edgeId}.`;
  }

  return "";
}

function getRepairSourceLabel(
  source: StudioRepairCandidateSource,
  options: {
    sessionTurnNumber?: number;
    sourceLabel?: string;
    isLatestFallback?: boolean;
  },
): string {
  if (options.sourceLabel) return options.sourceLabel;

  if (
    typeof options.sessionTurnNumber === "number" &&
    Number.isFinite(options.sessionTurnNumber)
  ) {
    return source === "verdict"
      ? `Turn ${options.sessionTurnNumber} verdict`
      : `Turn ${options.sessionTurnNumber} teach-back rubric`;
  }

  if (options.isLatestFallback) {
    return source === "verdict" ? "Latest verdict" : "Teach-back rubric";
  }

  return source === "verdict" ? "Earlier verdict" : "Earlier teach-back rubric";
}

function appendRepairCandidatesForSnapshot(
  candidates: StudioRepairCandidate[],
  seenDetails: Set<string>,
  snapshot: {
    verdict?: TutorVerdict | null;
    teachBackRubric?: TeachBackRubric | null;
    sessionTurnNumber?: number;
    sourceLabel?: string;
    isLatestFallback?: boolean;
  },
) {
  const initialCount = candidates.length;
  const verdictSourceLabel = getRepairSourceLabel("verdict", snapshot);
  const teachBackSourceLabel = getRepairSourceLabel("teach_back", snapshot);

  if (snapshot.verdict?.why_wrong) {
    pushCandidate(candidates, seenDetails, {
      source: "verdict",
      title: "Misconception to repair",
      detail: snapshot.verdict.why_wrong,
      badge: "MISCONCEPTION",
      sourceLabel: verdictSourceLabel,
    });
  }

  for (const issue of snapshot.verdict?._validation_issues ?? []) {
    pushCandidate(candidates, seenDetails, {
      source: "verdict",
      title: "Validation issue",
      detail: issue,
      badge: "VALIDATION",
      sourceLabel: verdictSourceLabel,
    });
  }

  for (const misconception of snapshot.teachBackRubric?.misconceptions ?? []) {
    pushCandidate(candidates, seenDetails, {
      source: "teach_back",
      title: "Teach-back misconception",
      detail: misconception,
      badge: "MISCONCEPTION",
      sourceLabel: teachBackSourceLabel,
    });
  }

  for (const gap of snapshot.teachBackRubric?.gaps ?? []) {
    pushCandidate(candidates, seenDetails, {
      source: "teach_back",
      title: "Missing concept",
      detail: formatGapDetail(gap),
      badge: "GAP",
      sourceLabel: teachBackSourceLabel,
    });
  }

  if (candidates.length === initialCount) {
    const fallbackFocus =
      normalizeText(snapshot.verdict?.next_hint) ||
      normalizeText(snapshot.teachBackRubric?.next_focus);

    if (
      fallbackFocus &&
      (snapshot.verdict?.verdict === "partial" ||
        snapshot.verdict?.verdict === "fail" ||
        snapshot.teachBackRubric?.overall_rating === "partial" ||
        snapshot.teachBackRubric?.overall_rating === "fail")
    ) {
      pushCandidate(candidates, seenDetails, {
        source: snapshot.verdict ? "verdict" : "teach_back",
        title: "Next repair focus",
        detail: fallbackFocus,
        badge: "FOCUS",
        sourceLabel: snapshot.verdict ? verdictSourceLabel : teachBackSourceLabel,
      });
    }
  }
}

export function buildStudioRepairCandidates({
  latestVerdict,
  latestTeachBackRubric,
  messageHistory = [],
}: BuildStudioRepairCandidatesInput): StudioRepairCandidate[] {
  const candidates: StudioRepairCandidate[] = [];
  const seenDetails = new Set<string>();

  if (messageHistory.length > 0) {
    for (let index = messageHistory.length - 1; index >= 0; index -= 1) {
      appendRepairCandidatesForSnapshot(candidates, seenDetails, messageHistory[index]);
    }
    return candidates;
  }

  appendRepairCandidatesForSnapshot(candidates, seenDetails, {
    verdict: latestVerdict,
    teachBackRubric: latestTeachBackRubric,
    isLatestFallback: true,
  });

  return candidates;
}
