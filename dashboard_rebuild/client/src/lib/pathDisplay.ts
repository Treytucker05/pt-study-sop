/**
 * Tiny utilities for turning raw filesystem paths into something a human
 * wants to read in a panel. Keep in one place so every Studio surface
 * (Source Shelf, Document Dock, Prime/Polish Packet, etc.) renders paths
 * the same way.
 */

export function splitPath(path: string | null | undefined): string[] {
  if (!path) return [];
  return String(path)
    .split(/[\\/]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Just the final path segment (filename + extension), with whitespace trimmed. */
export function basenameFromPath(path: string | null | undefined): string {
  const segments = splitPath(path);
  if (segments.length > 0) return segments[segments.length - 1];
  return String(path ?? "").trim();
}
