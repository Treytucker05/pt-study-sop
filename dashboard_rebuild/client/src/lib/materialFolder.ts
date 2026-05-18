import type { Material } from "@/lib/api";

/**
 * Derive a material's folder path (vault-root-relative, machine-root
 * sanitized). Lifted verbatim from pages/library.tsx getMaterialFolder so
 * the Studio Source Shelf nests materials with the SAME hierarchy logic the
 * Library rail already uses. (library.tsx still has its own copy — dedupe
 * is a separate low-risk follow-up to avoid churn in that large file.)
 */

export function normalizeRawFolderSegments(parts: string[]): string[] {
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function normalizeSourceFolderSegments(parts: string[]): string[] {
  const cleaned = normalizeRawFolderSegments(parts);
  const usersIndex = cleaned.findIndex(
    (part) => part.toLowerCase() === "users",
  );
  const desktopIndex = cleaned.findIndex(
    (part) => part.toLowerCase() === "desktop",
  );
  if (
    usersIndex >= 0 &&
    desktopIndex > usersIndex &&
    desktopIndex < cleaned.length - 1
  ) {
    // Absolute local paths must not expose machine roots in the folder rail.
    return cleaned.slice(desktopIndex + 1);
  }
  return cleaned;
}

export function getMaterialFolder(mat: Material): string {
  const rawFolder = (mat.folder_path || "")
    .replace(/\\/g, "/")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (rawFolder) {
    const normalizedRaw = normalizeRawFolderSegments(rawFolder.split("/"));
    return normalizedRaw.join("/") || "Unsorted";
  }

  const sourcePath = (mat.source_path || "").replace(/\\/g, "/").trim();
  if (!sourcePath) return "Unsorted";

  const protocolIndex = sourcePath.indexOf("://");
  if (protocolIndex > 0) {
    const protocol = sourcePath.slice(0, protocolIndex);
    const afterProtocol = sourcePath.slice(protocolIndex + 3);
    const lastSlash = afterProtocol.lastIndexOf("/");
    if (lastSlash <= 0) return protocol;
    const protocolParts = normalizeRawFolderSegments(
      afterProtocol.slice(0, lastSlash).split("/"),
    );
    return protocolParts.length
      ? `${protocol}/${protocolParts.join("/")}`
      : protocol;
  }

  const normalizedSource = sourcePath.toLowerCase();
  if (
    normalizedSource.includes("/uploads/") ||
    normalizedSource.includes("\\uploads\\")
  )
    return "Uploaded Files";

  const lastSlash = sourcePath.lastIndexOf("/");
  if (lastSlash <= 0) return "Unsorted";

  const folders = normalizeSourceFolderSegments(
    sourcePath.slice(0, lastSlash).split("/"),
  );
  if (folders.length > 2) return folders.slice(-2).join("/");
  return folders.join("/") || "Unsorted";
}

/** Folder string → normalized path segments for tree nesting. */
export function materialFolderSegments(mat: Material): string[] {
  const folder = getMaterialFolder(mat);
  if (!folder || folder === "Unsorted") return [];
  return normalizeRawFolderSegments(folder.split("/"));
}
