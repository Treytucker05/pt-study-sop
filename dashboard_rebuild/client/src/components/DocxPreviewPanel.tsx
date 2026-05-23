import { useEffect, useRef, useState } from "react";

import { TextPreviewPanel } from "@/components/MaterialViewerTextPanel";

type DocxPreviewStatus = "loading" | "ready" | "error";

interface DocxPreviewPanelProps {
  url: string;
  textContent?: string | null;
  onTextSelectionChange?: ((selection: {
    text: string;
    label: string | null;
  }) => void) | null;
}

export function DocxPreviewPanel({
  url,
  textContent = null,
  onTextSelectionChange = null,
}: DocxPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<DocxPreviewStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    container.replaceChildren();

    (async () => {
      try {
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) {
          throw new Error(`Could not load document (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;

        await renderAsync(buffer, container, undefined, {
          className: "docx-preview",
          inWrapper: true,
        });

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Could not render DOCX",
        );
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [url]);

  if (status === "error" && textContent) {
    return (
      <TextPreviewPanel
        textContent={textContent}
        onTextSelectionChange={onTextSelectionChange}
      />
    );
  }

  if (status === "error") {
    return (
      <div
        data-testid="material-viewer-docx-error"
        className="flex w-full flex-col gap-4 p-4"
      >
        <div className="border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-terminal text-xs text-yellow-100">
          {errorMessage || "Could not render DOCX inline."}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="material-viewer-docx-panel"
      className="w-full p-4"
    >
      {status === "loading" ? (
        <div className="flex min-h-[120px] items-center justify-center font-terminal text-sm text-muted-foreground">
          Loading document...
        </div>
      ) : null}
      <div
        ref={containerRef}
        className="docx-preview-host overflow-visible rounded-none border border-primary/15 bg-white text-black"
      />
    </div>
  );
}
