export type MaterialViewerKind = "pdf" | "docx" | "video" | "text" | "unsupported";

export interface MaterialViewerSource {
  id?: number | string | null;
  title?: string | null;
  fileName?: string | null;
  url?: string | null;
  mimeType?: string | null;
  fileType?: string | null;
  textContent?: string | null;
  posterUrl?: string | null;
}

/** Chapter-split textbook rows use ``path.pdf#ch01`` — no separate PDF on disk. */
export function isChapterSplitMaterialSource(
  source: MaterialViewerSource,
): boolean {
  const path = `${source.fileName || ""} ${source.url || ""}`;
  return /#ch\d+/i.test(path);
}

function basenameFromPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withoutFragment = trimmed.split("#", 1)[0] || trimmed;
  const segments = withoutFragment.split(/[\\/]/);
  return segments[segments.length - 1] || withoutFragment;
}

const PDF_EXTENSIONS = [".pdf"];
const DOCX_EXTENSIONS = [".docx", ".doc"];
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".text"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];

const TEXT_FILE_TYPES = new Set(["txt", "text", "md", "markdown"]);

function normalizeExtensionCandidate(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase();
}

function resolveExtension(source: MaterialViewerSource): string {
  const candidates = [source.fileName, source.url, source.fileType, source.mimeType];
  for (const candidate of candidates) {
    const normalized = normalizeExtensionCandidate(candidate);
    if (!normalized) continue;

    if (normalized.startsWith(".")) {
      return normalized;
    }

    const lastDot = normalized.lastIndexOf(".");
    if (lastDot >= 0) {
      return normalized.slice(lastDot);
    }
  }
  return "";
}

function matchesMimeType(
  mimeType: string | null | undefined,
  expectedPrefix: string,
): boolean {
  return normalizeExtensionCandidate(mimeType).startsWith(expectedPrefix);
}

export function resolveMaterialViewerKind(
  source: MaterialViewerSource,
): MaterialViewerKind {
  if (isChapterSplitMaterialSource(source)) {
    return "text";
  }

  const extension = resolveExtension(source);
  const mimeType = normalizeExtensionCandidate(source.mimeType);
  const fileType = normalizeExtensionCandidate(source.fileType);

  if (
    PDF_EXTENSIONS.includes(extension) ||
    mimeType === "application/pdf" ||
    fileType === "pdf"
  ) {
    return "pdf";
  }

  if (
    DOCX_EXTENSIONS.includes(extension) ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    fileType === "docx" ||
    fileType === "doc"
  ) {
    return "docx";
  }

  if (
    TEXT_EXTENSIONS.includes(extension) ||
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    TEXT_FILE_TYPES.has(fileType)
  ) {
    return "text";
  }

  if (
    VIDEO_EXTENSIONS.includes(extension) ||
    matchesMimeType(mimeType, "video/") ||
    fileType === "mp4"
  ) {
    return "video";
  }

  if (String(source.textContent || "").trim()) {
    return "text";
  }

  return "unsupported";
}

export function buildPdfViewerUrl(url: string): string {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (trimmed.includes("#")) {
    return `${trimmed}&toolbar=0&navpanes=0&view=FitH`;
  }
  return `${trimmed}#toolbar=0&navpanes=0&view=FitH`;
}

export function getMaterialViewerTitle(source: MaterialViewerSource): string {
  const explicit = String(source.title || "").trim();
  if (explicit) return explicit;

  const fileName = String(source.fileName || "").trim();
  if (fileName) return basenameFromPath(fileName);

  const url = String(source.url || "").trim();
  if (url) {
    const segments = url.split("/");
    return decodeURIComponent(segments[segments.length - 1] || "Untitled material");
  }

  return "Untitled material";
}

export function getMaterialViewerKindLabel(
  kind: MaterialViewerKind,
  source: MaterialViewerSource,
): string {
  if (kind === "text") {
    const fileType = normalizeExtensionCandidate(source.fileType);
    if (fileType) return fileType;
    const extension = resolveExtension(source).replace(/^\./, "");
    return extension || "text";
  }
  return kind;
}

export function getMaterialViewerFallbackMessage(
  kind: MaterialViewerKind,
  source: MaterialViewerSource,
): string {
  if (!source.url && !source.textContent) {
    return "No viewer source is available yet.";
  }

  if (isChapterSplitMaterialSource(source)) {
    return "This textbook chapter is shown from extracted text (split from a large PDF).";
  }

  switch (kind) {
    case "text":
      return "Showing extracted text for this document.";
    case "docx":
      if (source.textContent) {
        return "Showing extracted text because the DOCX file could not be loaded inline.";
      }
      return "DOCX file is not available for inline viewing yet.";
    case "unsupported":
      return "This material type does not have an inline viewer yet.";
    default:
      return "This material cannot be rendered inline.";
  }
}
