import {
  ExternalLink,
  FileText,
  FileWarning,
  Film,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DocxPreviewPanel } from "@/components/DocxPreviewPanel";
import { MaterialViewerZoomSurface } from "@/components/MaterialViewerZoomSurface";
import { TextPreviewPanel } from "@/components/MaterialViewerTextPanel";
import { Button } from "@/components/ui/button";
import {
  clampMaterialViewerZoom,
  formatMaterialViewerZoomLabel,
  MATERIAL_VIEWER_ZOOM_DEFAULT,
  stepMaterialViewerZoom,
} from "@/lib/materialViewerZoom";
import {
  buildPdfViewerUrl,
  getMaterialViewerFallbackMessage,
  getMaterialViewerKindLabel,
  getMaterialViewerTitle,
  isChapterSplitMaterialSource,
  resolveMaterialViewerKind,
  type MaterialViewerKind,
  type MaterialViewerSource,
} from "@/lib/materialViewer";
import { cn } from "@/lib/utils";

interface MaterialViewerProps {
  source: MaterialViewerSource;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onTextSelectionChange?: ((selection: {
    text: string;
    label: string | null;
  }) => void) | null;
}

function MaterialViewerHeader({
  title,
  kind,
  kindLabel,
  url,
  zoom,
  onZoomChange,
}: {
  title: string;
  kind: MaterialViewerKind;
  kindLabel: string;
  url: string | null;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}) {
  const Icon =
    kind === "video" ? Film : kind === "unsupported" ? FileWarning : FileText;
  const zoomEnabled = typeof onZoomChange === "function";
  const zoomLabel = formatMaterialViewerZoomLabel(zoom);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-primary/15 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="truncate font-arcade text-ui-2xs text-primary">
            MATERIAL VIEWER
          </div>
          <div className="truncate font-terminal text-xs text-foreground">
            {title}
          </div>
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {zoomEnabled ? (
          <div
            data-testid="material-viewer-zoom-controls"
            className="flex items-center gap-1 border border-primary/20 bg-black/30 px-1 py-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() =>
                onZoomChange(stepMaterialViewerZoom(zoom, "out"))
              }
              className="h-7 w-7 rounded-none text-primary hover:bg-primary/10"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[3.25rem] text-center font-terminal text-ui-2xs uppercase tracking-[0.16em] text-muted-foreground">
              {zoomLabel}
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
              onClick={() =>
                onZoomChange(MATERIAL_VIEWER_ZOOM_DEFAULT)
              }
              className="h-7 w-7 rounded-none text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
        <span className="border border-primary/20 bg-black/30 px-2 py-1 font-terminal text-ui-2xs uppercase tracking-[0.18em] text-muted-foreground">
          {kindLabel}
        </span>
        <span className="border border-primary/20 bg-black/30 px-2 py-1 font-terminal text-ui-2xs uppercase tracking-[0.18em] text-muted-foreground">
          read-only
        </span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 border border-primary/30 px-2 py-1 font-terminal text-ui-2xs uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
          >
            <ExternalLink className="h-3 w-3" />
            open
          </a>
        ) : null}
      </div>
    </div>
  );
}

function FallbackPanel({
  message,
  textContent,
  onTextSelectionChange,
}: {
  message: string;
  textContent: string | null;
  onTextSelectionChange?: MaterialViewerProps["onTextSelectionChange"];
}) {
  if (textContent) {
    return (
      <div
        data-testid="material-viewer-fallback"
        className="flex w-full flex-col"
      >
        <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-terminal text-xs text-yellow-100">
          {message}
        </div>
        <TextPreviewPanel
          textContent={textContent}
          onTextSelectionChange={onTextSelectionChange}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="material-viewer-fallback"
      className="flex w-full flex-col gap-4 p-4"
    >
      <div className="border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-terminal text-xs text-yellow-100">
        {message}
      </div>
    </div>
  );
}

export function MaterialViewer({
  source,
  className,
  zoom = MATERIAL_VIEWER_ZOOM_DEFAULT,
  onZoomChange,
  onTextSelectionChange = null,
}: MaterialViewerProps) {
  const kind = resolveMaterialViewerKind(source);
  const kindLabel = getMaterialViewerKindLabel(kind, source);
  const title = getMaterialViewerTitle(source);
  const url = source.url ? String(source.url) : null;
  const textContent = source.textContent ? String(source.textContent) : null;
  const zoomScale = clampMaterialViewerZoom(zoom);
  const showPdf =
    kind === "pdf" && Boolean(url) && !isChapterSplitMaterialSource(source);
  const showVideo = kind === "video" && Boolean(url);
  const showDocx = kind === "docx" && Boolean(url);
  const showText =
    (kind === "text" && Boolean(textContent)) ||
    (kind === "docx" && Boolean(textContent) && !url);
  const showFallback =
    kind === "unsupported" ||
    (isChapterSplitMaterialSource(source) && !textContent) ||
    (kind === "docx" && !url && !textContent) ||
    (!showPdf && !showVideo && !showDocx && !showText);

  const viewerBody = (
    <>
      {showDocx && url ? (
        <DocxPreviewPanel
          url={url}
          textContent={textContent}
          onTextSelectionChange={onTextSelectionChange}
        />
      ) : null}

      {showText && textContent ? (
        <TextPreviewPanel
          textContent={textContent}
          onTextSelectionChange={onTextSelectionChange}
        />
      ) : null}

      {showPdf && url ? (
        <iframe
          data-testid="material-viewer-pdf"
          title={`${title} PDF viewer`}
          src={buildPdfViewerUrl(url)}
          className="block w-full border-0 bg-white"
          style={{ height: "min(70vh, 720px)", minHeight: "480px" }}
        />
      ) : null}

      {showVideo && url ? (
        <div className="flex w-full items-center justify-center bg-black p-4">
          <video
            data-testid="material-viewer-video"
            controls
            playsInline
            preload="metadata"
            poster={source.posterUrl || undefined}
            className="max-w-full rounded-none border border-primary/15 bg-black"
            style={{ width: "100%", maxHeight: "min(70vh, 720px)" }}
          >
            <source src={url} type={source.mimeType || undefined} />
            Your browser does not support inline video playback.
          </video>
        </div>
      ) : null}

      {showFallback ? (
        <FallbackPanel
          message={getMaterialViewerFallbackMessage(kind, source)}
          textContent={textContent}
          onTextSelectionChange={onTextSelectionChange}
        />
      ) : null}
    </>
  );

  return (
    <section
      data-testid="material-viewer"
      className={cn(
        "flex h-full min-h-0 max-h-full flex-col overflow-hidden border border-primary/15 bg-black/25",
        className,
      )}
    >
      <MaterialViewerHeader
        title={title}
        kind={kind}
        kindLabel={kindLabel}
        url={url}
        zoom={zoomScale}
        onZoomChange={onZoomChange}
      />

      <MaterialViewerZoomSurface zoom={zoomScale}>
        {viewerBody}
      </MaterialViewerZoomSurface>
    </section>
  );
}
