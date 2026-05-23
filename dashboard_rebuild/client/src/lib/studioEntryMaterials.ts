import type { Material } from "@/lib/api";
import {
  getMaterialFolder,
  materialFolderSegments,
} from "@/lib/materialFolder";

/** Matches backend `text_extractor.SUPPORTED_EXTENSIONS` + mp4. */
export const STUDIO_ENTRY_UPLOAD_ACCEPT =
  ".pdf,.docx,.pptx,.md,.txt,.mp4";

const UPLOAD_EXTENSION_SET = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".md",
  ".markdown",
  ".txt",
  ".text",
  ".mp4",
]);

export type StudioEntryMaterialGroupKind =
  | "textbook"
  | "section"
  | "upload"
  | "unsorted";

export interface StudioEntryMaterialGroup {
  key: string;
  label: string;
  kind: StudioEntryMaterialGroupKind;
  materials: Material[];
}

const GROUP_KIND_ORDER: Record<StudioEntryMaterialGroupKind, number> = {
  textbook: 0,
  section: 1,
  upload: 2,
  unsorted: 3,
};

export function getUploadFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const dot = normalized.lastIndexOf(".");
  if (dot < 0) return "";
  return normalized.slice(dot);
}

export function isStudioEntryUploadFile(file: File): boolean {
  return UPLOAD_EXTENSION_SET.has(getUploadFileExtension(file.name));
}

export function partitionStudioEntryUploadFiles(files: File[]): {
  accepted: File[];
  rejected: File[];
} {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isStudioEntryUploadFile(file)) {
      accepted.push(file);
    } else {
      rejected.push(file);
    }
  }
  return { accepted, rejected };
}

export function compareEntryMaterialLabels(
  leftLabel: string,
  rightLabel: string,
): number {
  return leftLabel.localeCompare(rightLabel, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function slugifyGroupKey(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "group";
}

function pathHasTextbookMarker(text: string): boolean {
  const segments = text
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.toLowerCase().trim())
    .filter(Boolean);
  if (
    segments.some((segment) =>
      /^(0?1|textbook|textbooks|reference|references)[\s_-]*(textbook|textbooks|reference|references)?$/.test(
        segment,
      ),
    )
  ) {
    return true;
  }
  return /\b(textbook|course reference|reference material|references)\b/.test(
    text.toLowerCase(),
  );
}

export function isEntryTextbookMaterial(
  material: Material,
  formatLabel: (material: Material) => string,
): boolean {
  const docType = String(material.doc_type || "").toLowerCase().trim();
  if (docType === "textbook") return true;

  const sourcePath = material.source_path || "";
  if (/#ch\d+$/i.test(sourcePath)) return true;

  const label = formatLabel(material);
  if (/—\s+Ch\s+\d+$/i.test(label)) return true;

  const pathText = [
    material.folder_path || "",
    material.source_path || "",
    material.title || "",
  ].join("/");
  return pathHasTextbookMarker(pathText);
}

export function getEntryTextbookStem(
  material: Material,
  formatLabel: (material: Material) => string,
): string {
  const label = formatLabel(material);
  const chapterLabelMatch = label.match(/^(.+?)\s+—\s+Ch\s+\d+$/i);
  if (chapterLabelMatch?.[1]) {
    return chapterLabelMatch[1].trim();
  }

  const sourcePath = (material.source_path || "").replace(/\\/g, "/");
  const chapterAt = sourcePath.search(/#ch\d+$/i);
  if (chapterAt > 0) {
    const basename = sourcePath.split("/").pop() || sourcePath;
    const stem = basename
      .slice(0, chapterAt)
      .replace(/\.[A-Za-z0-9]{1,6}$/, "")
      .trim();
    if (stem) return stem;
  }

  const title = (material.title || "").trim();
  if (title) {
    return title.split(/[\\/]/).pop()?.trim() || title;
  }

  const folder = getMaterialFolder(material);
  return folder === "Unsorted" ? "Textbook" : folder;
}

export function getEntryChapterSortKey(
  material: Material,
  formatLabel: (material: Material) => string,
): number {
  const label = formatLabel(material);
  const labelMatch = label.match(/—\s+Ch\s+(\d+)/i);
  if (labelMatch?.[1]) return Number(labelMatch[1]);

  const sourcePath = material.source_path || "";
  const pathMatch = sourcePath.match(/#ch(\d+)/i);
  if (pathMatch?.[1]) return Number(pathMatch[1]);

  return 9999;
}

function isUploadedSourcePath(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, "/").trim().toLowerCase();
  return (
    normalized.includes("/uploads/") ||
    normalized.startsWith("uploads/")
  );
}

function getEntrySectionBucket(material: Material): {
  key: string;
  label: string;
  kind: StudioEntryMaterialGroupKind;
} {
  if (isUploadedSourcePath(material.source_path || "")) {
    return {
      key: "uploaded",
      label: "Uploaded Files",
      kind: "upload",
    };
  }

  const folder = getMaterialFolder(material);
  if (folder === "Uploaded Files") {
    return {
      key: "uploaded",
      label: "Uploaded Files",
      kind: "upload",
    };
  }
  if (folder === "Unsorted") {
    return {
      key: "unsorted",
      label: "Unsorted",
      kind: "unsorted",
    };
  }
  return {
    key: `section-${slugifyGroupKey(folder)}`,
    label: folder,
    kind: "section",
  };
}

export function groupEntryCourseMaterials(
  materials: Material[],
  formatLabel: (material: Material) => string,
): StudioEntryMaterialGroup[] {
  const textbookBuckets = new Map<string, Material[]>();
  const sectionBuckets = new Map<
    string,
    { label: string; kind: StudioEntryMaterialGroupKind; materials: Material[] }
  >();

  for (const material of materials) {
    if (isEntryTextbookMaterial(material, formatLabel)) {
      const stem = getEntryTextbookStem(material, formatLabel);
      const bucketKey = slugifyGroupKey(stem);
      const existing = textbookBuckets.get(bucketKey) || [];
      existing.push(material);
      textbookBuckets.set(bucketKey, existing);
      continue;
    }

    const bucket = getEntrySectionBucket(material);
    const existing = sectionBuckets.get(bucket.key) || {
      label: bucket.label,
      kind: bucket.kind,
      materials: [],
    };
    existing.materials.push(material);
    sectionBuckets.set(bucket.key, existing);
  }

  const groups: StudioEntryMaterialGroup[] = [];

  for (const [stemKey, bucketMaterials] of textbookBuckets.entries()) {
    const stem = getEntryTextbookStem(bucketMaterials[0]!, formatLabel);
    const sorted = [...bucketMaterials].sort((left, right) => {
      const chapterDelta =
        getEntryChapterSortKey(left, formatLabel) -
        getEntryChapterSortKey(right, formatLabel);
      if (chapterDelta !== 0) return chapterDelta;
      return compareEntryMaterialLabels(
        formatLabel(left),
        formatLabel(right),
      );
    });
    groups.push({
      key: `textbook-${stemKey}`,
      label: `Textbook · ${stem}`,
      kind: "textbook",
      materials: sorted,
    });
  }

  for (const [key, bucket] of sectionBuckets.entries()) {
    groups.push({
      key,
      label: bucket.label,
      kind: bucket.kind,
      materials: [...bucket.materials].sort((left, right) =>
        compareEntryMaterialLabels(formatLabel(left), formatLabel(right)),
      ),
    });
  }

  return groups.sort((left, right) => {
    const kindDelta = GROUP_KIND_ORDER[left.kind] - GROUP_KIND_ORDER[right.kind];
    if (kindDelta !== 0) return kindDelta;
    return compareEntryMaterialLabels(left.label, right.label);
  });
}
