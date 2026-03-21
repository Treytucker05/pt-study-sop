import type { Material, TutorAccuracyProfile, TutorObjectiveScope } from "@/lib/api";
import type { TutorPrimingSourceInventoryItem } from "@/api.types";
import type { TutorArtifact } from "@/components/TutorArtifacts";
import type { TutorShellMode, TutorBoardScope } from "@/lib/api";

export type PrimeArtifactFormatKey = "objectives" | "spine" | "map" | "summary" | "terms";

const MARKDOWN_LIST_PREFIX_RE = /^((?:[-*+])|(?:\d+[\.\)]))\s+/;
const MARKDOWN_HEADING_RE = /^#{1,6}\s+/;
const MERMAID_BLOCK_RE = /```mermaid\s*\n([\s\S]*?)```/i;
const CODE_BLOCK_RE = /^```/;

// ─── Query-string helpers ───

export type TutorPageMode = Exclude<TutorShellMode, "publish"> | "launch";
export type TutorStudioView = "workbench" | "priming" | "polish" | "final_sync";

export type TutorShellQuery = {
  courseId?: number;
  sessionId?: string;
  mode?: TutorPageMode;
  boardScope?: TutorBoardScope;
  boardId?: number;
};

export function normalizeTutorPageMode(value: string | null | undefined): TutorPageMode | undefined {
  if (value === "launch" || value === "studio" || value === "tutor" || value === "schedule") {
    return value;
  }
  if (value === "dashboard" || value === "publish") {
    return "launch";
  }
  return undefined;
}

export function normalizeTutorStudioView(
  value: string | null | undefined,
): TutorStudioView | undefined {
  if (
    value === "workbench" ||
    value === "priming" ||
    value === "polish" ||
    value === "final_sync"
  ) {
    return value;
  }
  return undefined;
}

export function resolveStudioViewFromWorkflowStage(stage: string | null | undefined): TutorStudioView {
  if (stage === "final_sync") return "final_sync";
  if (stage === "polish") return "polish";
  if (stage === "priming" || stage === "launch") return "priming";
  return "workbench";
}

export function readTutorShellQuery(): TutorShellQuery {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const parsedCourseId = Number.parseInt(params.get("course_id") || "", 10);
  const parsedBoardId = Number.parseInt(params.get("board_id") || "", 10);
  const rawMode = params.get("mode");
  const rawBoardScope = params.get("board_scope");
  return {
    courseId: Number.isFinite(parsedCourseId) ? parsedCourseId : undefined,
    sessionId: params.get("session_id") || undefined,
    mode: normalizeTutorPageMode(rawMode),
    boardScope:
      rawBoardScope === "session" || rawBoardScope === "project" || rawBoardScope === "overall"
        ? rawBoardScope
        : undefined,
    boardId: Number.isFinite(parsedBoardId) ? parsedBoardId : undefined,
  };
}

export function writeTutorShellQuery(query: TutorShellQuery): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (typeof query.courseId === "number") params.set("course_id", String(query.courseId));
  else params.delete("course_id");
  if (query.sessionId) params.set("session_id", query.sessionId);
  else params.delete("session_id");
  if (query.mode) params.set("mode", query.mode);
  else params.delete("mode");
  if (query.boardScope) params.set("board_scope", query.boardScope);
  else params.delete("board_scope");
  if (typeof query.boardId === "number") params.set("board_id", String(query.boardId));
  else params.delete("board_id");

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

// ─── Pure utility functions ───

export function parseFacilitationSteps(prompt: string | undefined | null): string[] {
  if (!prompt) return [];
  const lines = prompt.split(/\n/).filter((line) => line.trim());
  return lines
    .map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-*]\s+)/, "").trim())
    .filter(Boolean);
}

export function normalizeArtifactType(
  value: unknown,
): "note" | "card" | "map" | "structured_notes" | null {
  if (value === "table") return "note";
  if (value === "structured_map") return "map";
  if (
    value === "note" ||
    value === "card" ||
    value === "map" ||
    value === "structured_notes"
  ) {
    return value;
  }
  return null;
}

export function sanitizeVaultSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeStudyUnitLabel(value: string): string {
  const clean = sanitizeVaultSegment(value)
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  const numbered = clean.match(
    /^(Week|Module|Construct|Topic)\s+0*([0-9]+)(?:\s*-\s*|\s+)?(.+)?$/i,
  );
  if (!numbered) {
    return clean;
  }
  const [, prefix, num, suffix] = numbered;
  const tail = String(suffix || "")
    .replace(/\s+/g, " ")
    .trim();
  return tail ? `${prefix} ${Number(num)} - ${tail}` : `${prefix} ${Number(num)}`;
}

export function deriveVaultFolder(courseName: string, objectiveGroup: string): string {
  const safeCourse = sanitizeVaultSegment(courseName || "General");
  const normalizedGroup = normalizeStudyUnitLabel(objectiveGroup || "");
  if (!normalizedGroup) return `Courses/${safeCourse}`;
  return `Courses/${safeCourse}/${normalizedGroup}`;
}

export function scoreStudyUnitCandidate(rawSegment: string): number {
  const segment = normalizeStudyUnitLabel(rawSegment);
  if (!segment || !/^(Week|Module|Construct|Topic)\s*0*\d+/i.test(segment)) {
    return Number.NEGATIVE_INFINITY;
  }
  let score = 1;
  if (/\s-\s.+/.test(segment)) score += 6;
  if (/\b(lecture|slides?|transcript|practice|todo|to do|notes?|objectives?|lo)\b/i.test(rawSegment)) {
    score -= 5;
  }
  if (/^(Week|Module|Construct|Topic)\s+\d+$/i.test(segment)) {
    score += 1;
  }
  return score;
}

export function inferStudyUnitFromMaterial(material: Material): string {
  let bestUnit = "";
  let bestScore = Number.NEGATIVE_INFINITY;
  const folderSegments: string[] = [];
  if (material.folder_path) {
    folderSegments.push(...String(material.folder_path).split(/[\\/]/));
  }
  const sourceParentSegments: string[] = [];
  if (material.source_path) {
    const parts = String(material.source_path).split(/[\\/]/);
    sourceParentSegments.push(...parts.slice(0, -1));
  }

  const candidateGroups = [folderSegments, sourceParentSegments];
  for (const segments of candidateGroups) {
    const cleaned = segments
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => segment.replace(/\.[A-Za-z0-9]+$/, ""));

    for (let index = cleaned.length - 1; index >= 0; index -= 1) {
      const segment = cleaned[index];
      const score = scoreStudyUnitCandidate(segment);
      if (score > bestScore) {
        bestUnit = normalizeStudyUnitLabel(segment);
        bestScore = score;
      }
    }
  }

  const fileNameCandidates = [material.title || "", material.source_path || ""]
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => String(segment).split(/[\\/]/).pop() || "")
    .map((segment) => segment.replace(/\.[A-Za-z0-9]+$/, ""));
  for (const segment of fileNameCandidates) {
    const score = scoreStudyUnitCandidate(segment);
    if (score > bestScore) {
      bestUnit = normalizeStudyUnitLabel(segment);
      bestScore = score;
    }
  }
  return bestUnit;
}

export function parseLinesToRecords(value: string, key: string): Record<string, string>[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !MARKDOWN_HEADING_RE.test(line) && !CODE_BLOCK_RE.test(line))
    .map((line) => line.replace(MARKDOWN_LIST_PREFIX_RE, "").trim())
    .filter(Boolean)
    .map((line) => ({ [key]: line }));
}

export function recordsToMultilineText(
  records: Record<string, unknown>[] | undefined,
  candidateKeys: string[],
): string {
  if (!Array.isArray(records) || records.length === 0) return "";
  return records
    .map((record) => {
      for (const key of candidateKeys) {
        const value = record?.[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      const firstStringValue = Object.values(record || {}).find(
        (value) => typeof value === "string" && value.trim().length > 0,
      );
      return typeof firstStringValue === "string" ? firstStringValue.trim() : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function formatSourceBlockText(
  records: Array<{ title: string; [key: string]: unknown }>,
  valueKey: string,
): string {
  return records
    .map((record) => {
      const value = record?.[valueKey];
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return "";
      const title = String(record.title || "Source").trim() || "Source";
      return `### ${title}\n\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function formatSourceLineText(
  records: Array<{ [key: string]: unknown }>,
  valueKey: string,
): string {
  return records
    .map((record) => {
      const value = record?.[valueKey];
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean)
    .join("\n");
}

function splitCleanLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !MARKDOWN_HEADING_RE.test(line) && !CODE_BLOCK_RE.test(line))
    .map((line) => line.replace(MARKDOWN_LIST_PREFIX_RE, "").trim())
    .filter(Boolean);
}

function splitIntoParagraphs(value: string, sentencesPerParagraph = 2): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const sentences = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (sentences.length <= sentencesPerParagraph) return [trimmed];
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(index, index + sentencesPerParagraph).join(" "));
  }
  return paragraphs;
}

function withHeading(heading: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return MARKDOWN_HEADING_RE.test(trimmed) ? trimmed : `## ${heading}\n\n${trimmed}`;
}

function looksStructuredMarkdown(value: string): boolean {
  const trimmed = value.trim();
  return (
    MARKDOWN_HEADING_RE.test(trimmed) ||
    MARKDOWN_LIST_PREFIX_RE.test(trimmed) ||
    CODE_BLOCK_RE.test(trimmed) ||
    trimmed.includes("\n\n") ||
    /\|.+\|/.test(trimmed)
  );
}

function looksLikeStructuredMap(value: string): boolean {
  const trimmed = value.trim();
  return (
    MERMAID_BLOCK_RE.test(trimmed) ||
    /(?:->|=>|-->|::)/.test(trimmed) ||
    /^[|`+\- ].+$/m.test(trimmed) ||
    /^\s{2,}\S/m.test(trimmed)
  );
}

export function extractMermaidBlock(value: string): string | null {
  const match = value.match(MERMAID_BLOCK_RE);
  return match ? match[1].trim() : null;
}

export function formatPrimeArtifactMarkdown(
  artifact: PrimeArtifactFormatKey,
  value: string,
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (artifact === "summary") {
    if (looksStructuredMarkdown(trimmed)) return withHeading("Summary", trimmed);
    return withHeading("Summary", splitIntoParagraphs(trimmed).join("\n\n"));
  }

  if (artifact === "map") {
    const mermaid = extractMermaidBlock(trimmed);
    if (mermaid) {
      return withHeading("Hierarchical Map", `\`\`\`mermaid\n${mermaid}\n\`\`\``);
    }
    if (looksLikeStructuredMap(trimmed)) {
      return withHeading("Hierarchical Map", `\`\`\`text\n${trimmed}\n\`\`\``);
    }
    return withHeading("Structure Notes", splitIntoParagraphs(trimmed).join("\n\n"));
  }

  const lines = splitCleanLines(trimmed);
  if (lines.length === 0) return "";

  if (artifact === "terms") {
    return withHeading("Key Terms", lines.map((line) => `- ${line}`).join("\n"));
  }

  const orderedHeading = artifact === "objectives" ? "Learning Objectives" : "Study Spine";
  return withHeading(
    orderedHeading,
    lines.map((line, index) => `${index + 1}. ${line}`).join("\n"),
  );
}

export function formatPrimeArtifactPreviewText(
  artifact: PrimeArtifactFormatKey,
  value: string,
  maxLines = 8,
): string {
  const markdown = formatPrimeArtifactMarkdown(artifact, value)
    .replace(/```mermaid\s*\n?/gi, "MERMAID MAP\n")
    .replace(/```text\s*\n?/gi, "")
    .replace(/```/g, "")
    .trim();
  if (!markdown) return "";
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}

export function mergePrimingSourceInventory(
  selectedMaterialIds: number[],
  materials: Material[],
  existingInventory: TutorPrimingSourceInventoryItem[],
): TutorPrimingSourceInventoryItem[] {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const inventoryById = new Map(existingInventory.map((item) => [item.id, item]));
  const result: TutorPrimingSourceInventoryItem[] = [];
  for (const materialId of selectedMaterialIds) {
    const material = materialById.get(materialId);
    const existing = inventoryById.get(materialId);
    if (!material && !existing) continue;
    result.push({
      id: materialId,
      title: existing?.title || material?.title || `Material ${materialId}`,
      source_path: existing?.source_path ?? material?.source_path ?? null,
      folder_path: existing?.folder_path ?? material?.folder_path ?? null,
      course_id: existing?.course_id ?? material?.course_id ?? null,
      content_type: existing?.content_type ?? (material as unknown as Record<string, unknown>)?.content_type as string | null ?? null,
      priming_output: existing?.priming_output ?? null,
      method_outputs: existing?.method_outputs ?? [],
    });
  }
  return result;
}

export function formatElapsedDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export const INPUT_BASE = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
export const SELECT_BASE = "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
