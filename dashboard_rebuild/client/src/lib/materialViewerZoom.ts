export const MATERIAL_VIEWER_ZOOM_DEFAULT = 1;
export const MATERIAL_VIEWER_ZOOM_MIN = 0.5;
export const MATERIAL_VIEWER_ZOOM_MAX = 2;
export const MATERIAL_VIEWER_ZOOM_STEP = 0.125;

export function clampMaterialViewerZoom(value: number): number {
  return Math.min(
    MATERIAL_VIEWER_ZOOM_MAX,
    Math.max(MATERIAL_VIEWER_ZOOM_MIN, value),
  );
}

export function stepMaterialViewerZoom(
  current: number,
  direction: "in" | "out",
): number {
  const delta =
    direction === "in"
      ? MATERIAL_VIEWER_ZOOM_STEP
      : -MATERIAL_VIEWER_ZOOM_STEP;
  return clampMaterialViewerZoom(
    Math.round((current + delta) * 1000) / 1000,
  );
}

export function formatMaterialViewerZoomLabel(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
