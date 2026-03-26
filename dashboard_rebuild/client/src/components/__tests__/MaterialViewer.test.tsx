import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MaterialViewer } from "@/components/MaterialViewer";
import { resolveMaterialViewerKind } from "@/lib/materialViewer";

describe("MaterialViewer", () => {
  it("renders PDFs inline with the Chromium viewer URL", () => {
    render(
      <MaterialViewer
        source={{
          title: "Lecture PDF",
          url: "/materials/lecture.pdf",
          fileType: "pdf",
        }}
      />,
    );

    const frame = screen.getByTestId("material-viewer-pdf");
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute(
      "src",
      "/materials/lecture.pdf#toolbar=0&navpanes=0&view=FitH",
    );
  });

  it("renders videos inline", () => {
    render(
      <MaterialViewer
        source={{
          title: "Lecture capture",
          url: "/materials/lecture.mp4",
          mimeType: "video/mp4",
        }}
      />,
    );

    expect(screen.getByTestId("material-viewer-video")).toBeInTheDocument();
  });

  it("falls back to extracted text for DOCX", () => {
    render(
      <MaterialViewer
        source={{
          title: "Worksheet",
          fileName: "worksheet.docx",
          textContent: "Cell respiration summary",
        }}
      />,
    );

    expect(screen.getByTestId("material-viewer-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent(
      "Cell respiration summary",
    );
  });

  it("reports real text selection from the extracted text preview", () => {
    const handleSelectionChange = vi.fn();

    render(
      <MaterialViewer
        source={{
          title: "Worksheet",
          fileName: "worksheet.docx",
          textContent: "Cell respiration summary",
        }}
        onTextSelectionChange={handleSelectionChange}
      />,
    );

    const preview = screen.getByTestId("material-viewer-text-preview");
    const textNode = preview.firstChild;

    expect(textNode).not.toBeNull();

    const range = document.createRange();
    range.setStart(textNode!, 0);
    range.setEnd(textNode!, "Cell respiration".length);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.mouseUp(preview);

    expect(handleSelectionChange).toHaveBeenCalledWith({
      text: "Cell respiration",
      label: "Viewer selection",
    });
  });
});

describe("resolveMaterialViewerKind", () => {
  it("detects supported viewer kinds from common metadata", () => {
    expect(resolveMaterialViewerKind({ fileName: "packet.pdf" })).toBe("pdf");
    expect(resolveMaterialViewerKind({ mimeType: "video/mp4" })).toBe("video");
    expect(resolveMaterialViewerKind({ fileType: "docx" })).toBe("docx");
    expect(resolveMaterialViewerKind({ fileName: "archive.zip" })).toBe(
      "unsupported",
    );
  });
});
