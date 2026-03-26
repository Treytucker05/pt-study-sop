export interface StudioPanelLayoutItem {
  id: string;
  panel: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  collapsed: boolean;
  groupId?: string | null;
}

export interface StudioDocumentTab {
  id: string;
  kind: string;
  title: string;
  sourceId?: number | string;
  sourcePath?: string | null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isStudioPanelLayoutItem(
  value: unknown,
): value is StudioPanelLayoutItem {
  if (!isPlainRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.panel !== "string" ||
    !isPlainRecord(value.position) ||
    !isPlainRecord(value.size) ||
    !isFiniteNumber(value.position.x) ||
    !isFiniteNumber(value.position.y) ||
    !isFiniteNumber(value.size.width) ||
    !isFiniteNumber(value.size.height) ||
    !isFiniteNumber(value.zIndex) ||
    typeof value.collapsed !== "boolean"
  ) {
    return false;
  }
  if (
    value.groupId !== undefined &&
    value.groupId !== null &&
    typeof value.groupId !== "string"
  ) {
    return false;
  }
  return true;
}

export function normalizeStudioPanelLayout(
  value: unknown,
): StudioPanelLayoutItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStudioPanelLayoutItem);
}

export function isStudioDocumentTab(value: unknown): value is StudioDocumentTab {
  if (!isPlainRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.title !== "string"
  ) {
    return false;
  }
  if (
    value.sourceId !== undefined &&
    typeof value.sourceId !== "string" &&
    typeof value.sourceId !== "number"
  ) {
    return false;
  }
  if (
    value.sourcePath !== undefined &&
    value.sourcePath !== null &&
    typeof value.sourcePath !== "string"
  ) {
    return false;
  }
  return true;
}

export function normalizeStudioDocumentTabs(
  value: unknown,
): StudioDocumentTab[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStudioDocumentTab);
}
