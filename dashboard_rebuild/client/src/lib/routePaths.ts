/**
 * Normalize wouter location paths served under the Flask /brain prefix.
 */
export function normalizeRoutePath(path: string): string {
  if (path === "/brain") {
    return "/";
  }
  if (path.startsWith("/brain/")) {
    const stripped = path.slice("/brain".length);
    return stripped.length > 0 ? stripped : "/";
  }
  return path;
}
