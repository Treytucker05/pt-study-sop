export type MaterialViewerKind = "pdf" | "docx" | "video" | "unsupported";

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

const PDF_EXTENSIONS = [".pdf"];
const DOCX_EXTENSIONS = [".docx", ".doc"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];

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
    VIDEO_EXTENSIONS.includes(extension) ||
    matchesMimeType(mimeType, "video/") ||
    fileType === "mp4"
  ) {
    return "video";
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
  if (fileName) return fileName;

  const url = String(source.url || "").trim();
  if (url) {
    const segments = url.split("/");
    return decodeURIComponent(segments[segments.length - 1] || "Untitled material");
  }

  return "Untitled material";
}

export function getMaterialViewerFallbackMessage(
  kind: MaterialViewerKind,
  source: MaterialViewerSource,
): string {
  if (!source.url && !source.textContent) {
    return "No viewer source is available yet.";
  }

  switch (kind) {
    case "docx":
      return "DOCX cannot be rendered inline reliably in-browser, so v1 falls back to extracted text or external open.";
    case "unsupported":
      return "This material type does not have an inline viewer yet.";
    default:
      return "This material cannot be rendered inline.";
  }
}
