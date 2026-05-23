import { describe, expect, it } from "vitest";

import {
  clampMaterialViewerZoom,
  formatMaterialViewerZoomLabel,
  MATERIAL_VIEWER_ZOOM_DEFAULT,
  stepMaterialViewerZoom,
} from "@/lib/materialViewerZoom";

describe("materialViewerZoom", () => {
  it("steps zoom in and out within bounds", () => {
    expect(stepMaterialViewerZoom(MATERIAL_VIEWER_ZOOM_DEFAULT, "in")).toBe(1.125);
    expect(stepMaterialViewerZoom(1.125, "out")).toBe(1);
    expect(clampMaterialViewerZoom(3)).toBe(2);
    expect(clampMaterialViewerZoom(0.1)).toBe(0.5);
  });

  it("formats zoom labels for the toolbar", () => {
    expect(formatMaterialViewerZoomLabel(1)).toBe("100%");
    expect(formatMaterialViewerZoomLabel(1.25)).toBe("125%");
  });
});
