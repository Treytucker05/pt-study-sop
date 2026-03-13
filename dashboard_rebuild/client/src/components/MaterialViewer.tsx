import { FileText, Film, FileWarning, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  buildPdfViewerUrl,
  getMaterialViewerFallbackMessage,
  getMaterialViewerTitle,
  resolveMaterialViewerKind,
  type MaterialViewerKind,
  type MaterialViewerSource,
} from "@/lib/materialViewer";

interface MaterialViewerProps {
  source: MaterialViewerSource;
  className?: string;
}

function MaterialViewerHeader({
  title,
  kind,
  url,
}: {
  title: string;
  kind: MaterialViewerKind;
  url: string | null;
}) {
  const Icon =
    kind === "video" ? Film : kind === "unsupported" ? FileWarning : FileText;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-primary/15 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="truncate font-arcade text-[10px] text-primary">
            MATERIAL VIEWER
          </div>
          <div className="truncate font-terminal text-xs text-foreground">
            {title}
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="border border-primary/20 bg-black/30 px-2 py-1 font-terminal text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {kind}
        </span>
        <span className="border border-primary/20 bg-black/30 px-2 py-1 font-terminal text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          read-only
        </span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 border border-primary/30 px-2 py-1 font-terminal text-[10px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/10"
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
}: {
  message: string;
  textContent: string | null;
}) {
  return (
    <div
      data-testid="material-viewer-fallback"
      className="flex min-h-[320px] flex-col gap-4 p-4"
    >
      <div className="border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-terminal text-xs text-yellow-100">
        {message}
      </div>
      {textContent ? (
        <div className="min-h-0 flex-1 overflow-auto border border-primary/15 bg-black/30 p-4">
          <div className="mb-2 font-arcade text-[10px] text-primary">
            EXTRACTED TEXT PREVIEW
          </div>
          <pre
            data-testid="material-viewer-text-preview"
            className="whitespace-pre-wrap font-terminal text-xs leading-6 text-foreground"
          >
            {textContent}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function MaterialViewer({ source, className }: MaterialViewerProps) {
  const kind = resolveMaterialViewerKind(source);
  const title = getMaterialViewerTitle(source);
  const url = source.url ? String(source.url) : null;
  const textContent = source.textContent ? String(source.textContent) : null;

  return (
    <section
      data-testid="material-viewer"
      className={cn(
        "flex h-full min-h-0 flex-col border border-primary/15 bg-black/25",
        className,
      )}
    >
      <MaterialViewerHeader title={title} kind={kind} url={url} />

      {kind === "pdf" && url ? (
        <iframe
          data-testid="material-viewer-pdf"
          title={`${title} PDF viewer`}
          src={buildPdfViewerUrl(url)}
          className="min-h-[420px] w-full flex-1 bg-white"
        />
      ) : null}

      {kind === "video" && url ? (
        <div className="flex min-h-[320px] flex-1 items-center justify-center bg-black p-4">
          <video
            data-testid="material-viewer-video"
            controls
            playsInline
            preload="metadata"
            poster={source.posterUrl || undefined}
            className="max-h-full w-full rounded-none border border-primary/15 bg-black"
          >
            <source src={url} type={source.mimeType || undefined} />
            Your browser does not support inline video playback.
          </video>
        </div>
      ) : null}

      {(kind === "docx" || kind === "unsupported" || (!url && kind !== "video")) ? (
        <FallbackPanel
          message={getMaterialViewerFallbackMessage(kind, source)}
          textContent={textContent}
        />
      ) : null}
    </section>
  );
}
