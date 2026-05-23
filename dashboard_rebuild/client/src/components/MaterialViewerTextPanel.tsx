import { useCallback, useRef } from "react";

interface TextPreviewPanelProps {
  textContent: string;
  onTextSelectionChange?: ((selection: {
    text: string;
    label: string | null;
  }) => void) | null;
}

export function useTextSelectionHandler(
  onTextSelectionChange: TextPreviewPanelProps["onTextSelectionChange"],
) {
  const textPreviewRef = useRef<HTMLPreElement | null>(null);
  const handleSelectionChange = useCallback(() => {
    if (!onTextSelectionChange || !textPreviewRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const commonAncestor = selection.getRangeAt(0).commonAncestorContainer;
    const selectionRoot =
      commonAncestor.nodeType === window.Node.TEXT_NODE
        ? commonAncestor.parentElement
        : commonAncestor;

    if (!selectionRoot || !textPreviewRef.current.contains(selectionRoot)) return;

    onTextSelectionChange({
      text: selectedText,
      label: "Viewer selection",
    });
  }, [onTextSelectionChange]);

  return { textPreviewRef, handleSelectionChange };
}

export function TextPreviewPanel({
  textContent,
  onTextSelectionChange = null,
}: TextPreviewPanelProps) {
  const { textPreviewRef, handleSelectionChange } =
    useTextSelectionHandler(onTextSelectionChange);

  return (
    <div
      data-testid="material-viewer-text-panel"
      className="w-full p-4"
    >
      <div className="border border-primary/15 bg-black/30 p-4">
        <pre
          data-testid="material-viewer-text-preview"
          ref={textPreviewRef}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          className="whitespace-pre-wrap font-terminal text-sm leading-6 text-foreground"
        >
          {textContent}
        </pre>
      </div>
    </div>
  );
}
