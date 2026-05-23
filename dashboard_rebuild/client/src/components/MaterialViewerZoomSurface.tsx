import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  formatMaterialViewerZoomLabel,
  MATERIAL_VIEWER_ZOOM_DEFAULT,
  stepMaterialViewerZoom,
} from "@/lib/materialViewerZoom";
import { cn } from "@/lib/utils";

interface MaterialViewerZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

export function MaterialViewerZoomControls({
  zoom,
  onZoomChange,
  className,
}: MaterialViewerZoomControlsProps) {
  return (
    <div
      data-testid="material-viewer-zoom-controls"
      className={cn(
        "flex items-center gap-1 border border-primary/20 bg-black/30 px-1 py-1",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => onZoomChange(stepMaterialViewerZoom(zoom, "out"))}
        className="h-7 w-7 rounded-none text-primary hover:bg-primary/10"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <span className="min-w-[3.25rem] text-center font-terminal text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {formatMaterialViewerZoomLabel(zoom)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => onZoomChange(stepMaterialViewerZoom(zoom, "in"))}
        className="h-7 w-7 rounded-none text-primary hover:bg-primary/10"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Reset zoom"
        title="Reset zoom"
        disabled={zoom === MATERIAL_VIEWER_ZOOM_DEFAULT}
        onClick={() => onZoomChange(MATERIAL_VIEWER_ZOOM_DEFAULT)}
        className="h-7 w-7 rounded-none text-primary hover:bg-primary/10 disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface MaterialViewerZoomSurfaceProps {
  zoom: number;
  children: ReactNode;
  className?: string;
}

/** Scale document content inside a fixed viewport; pane size does not change. */
export function getMaterialViewerZoomContentStyle(scale: number): CSSProperties {
  const safeScale = scale > 0 ? scale : 1;
  return {
    transform: `scale(${safeScale})`,
    transformOrigin: "top left",
    width: `${100 / safeScale}%`,
  };
}

export function MaterialViewerZoomSurface({
  zoom,
  children,
  className,
}: MaterialViewerZoomSurfaceProps) {
  return (
    <div
      data-testid="material-viewer-zoom-surface"
      className={cn("min-h-0 flex-1 overflow-auto", className)}
    >
      <div
        data-testid="material-viewer-zoom-content"
        className="inline-block min-w-full origin-top-left"
        style={getMaterialViewerZoomContentStyle(zoom)}
      >
        {children}
      </div>
    </div>
  );
}
