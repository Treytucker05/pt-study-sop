import type { Material } from "@/lib/api";
import type { StudioRepairCandidate } from "@/lib/studioRepairCandidates";

export type StudioWorkspaceObject =
  | {
      id: string;
      kind: "material";
      title: string;
      detail: string;
      badge: string;
    }
  | {
      id: string;
      kind: "vault_path";
      title: string;
      detail: string;
      badge: "VAULT";
    }
  | {
      id: string;
      kind: "excerpt";
      title: string;
      detail: string;
      badge: "EXCERPT";
      provenance: {
        materialId: number | null;
        sourcePath: string | null;
        fileType: string | null;
        sourceTitle: string;
        selectionLabel: string | null;
      };
    }
  | {
      id: string;
      kind: "image";
      title: string;
      detail: string;
      badge: string;
      asset: {
        url: string;
        mimeType: string | null;
      };
    }
  | {
      id: string;
      kind: "diagram_sketch";
      title: string;
      detail: string;
      badge: string;
      content: {
        format: string;
        data: string;
      };
    }
  | {
      id: string;
      kind: "link_reference";
      title: string;
      detail: string;
      badge: string;
      href: string;
    }
  | {
      id: string;
      kind: "text_note";
      title: string;
      detail: string;
      badge: string;
      provenance: {
        sourceType: "repair_candidate";
        candidateId: string;
        sourceLabel: string;
      };
    };

function formatFileType(value: string | null | undefined): string {
  const normalized = String(value || "").trim();
  return normalized ? normalized.toUpperCase() : "FILE";
}

export interface BuildStudioWorkspaceObjectsParams {
  materials: Material[];
  selectedMaterialIds: number[];
  selectedPaths: string[];
}

export interface CreateStudioExcerptWorkspaceObjectParams {
  materialId: number | null;
  sourcePath: string | null;
  fileType: string | null;
  sourceTitle: string | null;
  excerptText: string;
  selectionLabel?: string | null;
}

function normalizeExcerptFragment(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 64);
}

function hashExcerptSeed(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function getStudioExcerptObjectId({
  materialId,
  excerptText,
  selectionLabel,
}: Pick<
  CreateStudioExcerptWorkspaceObjectParams,
  "materialId" | "excerptText" | "selectionLabel"
>) {
  const excerptSeed = [
    materialId ?? "source",
    selectionLabel?.trim() || "",
    normalizeExcerptFragment(excerptText),
  ].join("::");

  return `excerpt:${materialId ?? "source"}:${hashExcerptSeed(excerptSeed)}`;
}

export function createStudioExcerptWorkspaceObject({
  materialId,
  sourcePath,
  fileType,
  sourceTitle,
  excerptText,
  selectionLabel = null,
}: CreateStudioExcerptWorkspaceObjectParams): StudioWorkspaceObject {
  const normalizedExcerpt = excerptText.trim().replace(/\s+/g, " ");
  const normalizedTitle = sourceTitle?.trim() || "Untitled source";

  return {
    id: getStudioExcerptObjectId({
      materialId,
      excerptText: normalizedExcerpt,
      selectionLabel,
    }),
    kind: "excerpt",
    title: `Excerpt: ${normalizedTitle}`,
    detail: normalizedExcerpt,
    badge: "EXCERPT",
    provenance: {
      materialId,
      sourcePath,
      fileType,
      sourceTitle: normalizedTitle,
      selectionLabel,
    },
  };
}

export function getStudioRepairWorkspaceObjectId(candidateId: string) {
  return `repair-note:${candidateId}`;
}

export function createStudioRepairWorkspaceObject(
  candidate: StudioRepairCandidate,
): StudioWorkspaceObject {
  return {
    id: getStudioRepairWorkspaceObjectId(candidate.id),
    kind: "text_note",
    title: candidate.title,
    detail: candidate.detail,
    badge: candidate.badge,
    provenance: {
      sourceType: "repair_candidate",
      candidateId: candidate.id,
      sourceLabel: candidate.sourceLabel,
    },
  };
}

export function buildStudioWorkspaceObjects({
  materials,
  selectedMaterialIds,
  selectedPaths,
}: BuildStudioWorkspaceObjectsParams): StudioWorkspaceObject[] {
  const selectedMaterials =
    selectedMaterialIds.length > 0
      ? materials.filter((material) => selectedMaterialIds.includes(material.id))
      : [];

  return [
    ...selectedMaterials.map((material) => ({
      id: `material:${material.id}`,
      kind: "material" as const,
      title: material.title || `Material #${material.id}`,
      detail: material.source_path || "Source path unavailable",
      badge: formatFileType(material.file_type),
    })),
    ...selectedPaths.map((path) => ({
      id: `vault:${path}`,
      kind: "vault_path" as const,
      title: path,
      detail: "Linked vault reference",
      badge: "VAULT" as const,
    })),
  ];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStudioWorkspaceObject(value: unknown): value is StudioWorkspaceObject {
  if (!isPlainRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.title !== "string" ||
    typeof value.detail !== "string" ||
    typeof value.badge !== "string"
  ) {
    return false;
  }

  if (value.kind === "material") {
    return true;
  }

  if (value.kind === "vault_path" && value.badge === "VAULT") {
    return true;
  }

  if (value.kind === "image") {
    return (
      isPlainRecord(value.asset) &&
      typeof value.asset.url === "string" &&
      value.asset.url.trim().length > 0 &&
      (typeof value.asset.mimeType === "string" || value.asset.mimeType === null)
    );
  }

  if (value.kind === "diagram_sketch") {
    return (
      isPlainRecord(value.content) &&
      typeof value.content.format === "string" &&
      value.content.format.trim().length > 0 &&
      typeof value.content.data === "string" &&
      value.content.data.trim().length > 0
    );
  }

  if (value.kind === "link_reference") {
    return typeof value.href === "string" && value.href.trim().length > 0;
  }

  if (value.kind !== "excerpt") {
    if (value.kind !== "text_note") {
      return false;
    }

    if (!isPlainRecord(value.provenance)) {
      return false;
    }

    return (
      value.provenance.sourceType === "repair_candidate" &&
      typeof value.provenance.candidateId === "string" &&
      typeof value.provenance.sourceLabel === "string"
    );
  }

  if (!isPlainRecord(value.provenance)) {
    return false;
  }

  return (
    (typeof value.provenance.materialId === "number" ||
      value.provenance.materialId === null) &&
    (typeof value.provenance.sourcePath === "string" ||
      value.provenance.sourcePath === null) &&
    (typeof value.provenance.fileType === "string" ||
      value.provenance.fileType === null) &&
    typeof value.provenance.sourceTitle === "string" &&
    (typeof value.provenance.selectionLabel === "string" ||
      value.provenance.selectionLabel === null)
  );
}

export function normalizeStudioWorkspaceObjects(value: unknown): StudioWorkspaceObject[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStudioWorkspaceObject);
}
