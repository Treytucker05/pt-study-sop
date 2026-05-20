import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

export interface BuildObsidianHandoffMarkdownParams {
  courseName: string | null;
  sessionGoal?: string | null;
  materialTitles?: string[];
  workspaceObjects: StudioWorkspaceObject[];
}

type HandoffBucket =
  | "learningObjectives"
  | "concepts"
  | "terms"
  | "summaries"
  | "rootExplanations"
  | "gaps"
  | "visuals"
  | "excerpts"
  | "other";

const BUCKET_HEADINGS: Record<HandoffBucket, string> = {
  learningObjectives: "Learning Objectives",
  concepts: "Concepts",
  terms: "Terms",
  summaries: "Summaries",
  rootExplanations: "Root Explanations",
  gaps: "Gaps / Questions",
  visuals: "Visual Map Outline / Images",
  excerpts: "Source Excerpts",
  other: "Other Workspace Notes",
};

function normalizeLine(value: string | null | undefined): string | null {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readSourceLabel(workspaceObject: StudioWorkspaceObject): string | null {
  if (workspaceObject.kind === "excerpt") {
    return workspaceObject.provenance.sourceTitle;
  }
  if (workspaceObject.kind === "text_note") {
    return workspaceObject.provenance.sourceLabel;
  }
  if (workspaceObject.kind === "material") {
    return workspaceObject.detail;
  }
  if (workspaceObject.kind === "vault_path") {
    return workspaceObject.title;
  }
  if (workspaceObject.kind === "image") {
    return workspaceObject.asset.url;
  }
  if (workspaceObject.kind === "link_reference") {
    return workspaceObject.href;
  }
  return null;
}

function getBucket(workspaceObject: StudioWorkspaceObject): HandoffBucket {
  if (workspaceObject.kind === "image" || workspaceObject.kind === "diagram_sketch") {
    return "visuals";
  }
  if (workspaceObject.kind === "excerpt") {
    return "excerpts";
  }

  const label = `${workspaceObject.badge} ${workspaceObject.title}`.toLowerCase();
  if (label.includes("objective")) return "learningObjectives";
  if (label.includes("concept")) return "concepts";
  if (label.includes("term")) return "terms";
  if (label.includes("summar")) return "summaries";
  if (label.includes("root")) return "rootExplanations";
  if (
    label.includes("gap") ||
    label.includes("question") ||
    label.includes("unsupported")
  ) {
    return "gaps";
  }
  return "other";
}

function formatWorkspaceObject(workspaceObject: StudioWorkspaceObject): string {
  const lines = [`### ${workspaceObject.title}`, ""];
  const sourceLabel = normalizeLine(readSourceLabel(workspaceObject));
  if (sourceLabel) {
    lines.push(`Source: ${sourceLabel}`, "");
  }
  lines.push(workspaceObject.detail.trim() || "_No detail captured._");

  if (workspaceObject.kind === "image") {
    lines.push("", `Image: ${workspaceObject.asset.url}`);
  }
  if (workspaceObject.kind === "link_reference") {
    lines.push("", `Link: ${workspaceObject.href}`);
  }

  return lines.join("\n").trim();
}

export function buildObsidianHandoffMarkdown({
  courseName,
  sessionGoal = null,
  materialTitles = [],
  workspaceObjects,
}: BuildObsidianHandoffMarkdownParams): string {
  const selectedObjects = workspaceObjects.filter(
    (workspaceObject) => workspaceObject.workspace?.obsidianHandoff === true,
  );
  const lines = [
    `# Obsidian Handoff - ${normalizeLine(courseName) || "Unassigned Course"}`,
    "",
    `Course: ${normalizeLine(courseName) || "Unassigned Course"}`,
    `Session goal: ${normalizeLine(sessionGoal) || "Not specified"}`,
  ];

  const normalizedMaterials = materialTitles
    .map((title) => normalizeLine(title))
    .filter((title): title is string => Boolean(title));
  lines.push(
    `Materials: ${
      normalizedMaterials.length > 0 ? normalizedMaterials.join(", ") : "No material titles captured"
    }`,
    "",
  );

  const grouped = new Map<HandoffBucket, StudioWorkspaceObject[]>();
  for (const workspaceObject of selectedObjects) {
    const bucket = getBucket(workspaceObject);
    grouped.set(bucket, [...(grouped.get(bucket) || []), workspaceObject]);
  }

  for (const bucket of Object.keys(BUCKET_HEADINGS) as HandoffBucket[]) {
    const objects = grouped.get(bucket) || [];
    lines.push(`## ${BUCKET_HEADINGS[bucket]}`);
    if (objects.length === 0) {
      lines.push("_None selected._", "");
      continue;
    }
    lines.push(objects.map(formatWorkspaceObject).join("\n\n"), "");
  }

  return lines.join("\n").trimEnd() + "\n";
}
