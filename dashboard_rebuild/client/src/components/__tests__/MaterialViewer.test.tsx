import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MaterialViewer } from "@/components/MaterialViewer";
import { resolveMaterialViewerKind } from "@/lib/materialViewer";

const { renderAsyncMock } = vi.hoisted(() => ({
  renderAsyncMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("docx-preview", () => ({
  renderAsync: renderAsyncMock,
}));

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

  it("renders txt materials as a primary text viewer without an unsupported banner", () => {
    render(
      <MaterialViewer
        source={{
          title: "Objectives and To-Do List",
          fileName:
            "/PT School/11_Movement Science II/20_Topic 2/MSII-20-Topic 2 - Objectives and To-Do List.txt",
          fileType: "txt",
          url: "/api/tutor/materials/278/file",
          textContent: "PHYT 6315 - Topic 2 Motor Control and Learning",
        }}
      />,
    );

    expect(screen.queryByTestId("material-viewer-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-panel")).toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent(
      "PHYT 6315",
    );
    expect(screen.getByText("txt")).toBeInTheDocument();
  });

  it("shows extracted text for chapter-split textbook rows instead of a broken PDF iframe", () => {
    render(
      <MaterialViewer
        source={{
          title: "Physical Therapy for Children — Ch 2",
          fileName:
            "/vault/PT School/Textbook/Physical Therapy for Children.pdf#ch02",
          fileType: "pdf",
          url: "/api/tutor/materials/9/file",
          textContent: "# Physical Therapy for Children — Chapter 2\n\nGait basics",
        }}
      />,
    );

    expect(screen.queryByTestId("material-viewer-pdf")).not.toBeInTheDocument();
    expect(screen.queryByTestId("material-viewer-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent(
      "Gait basics",
    );
  });

  it("renders DOCX with extracted text when no file URL is available", () => {
    render(
      <MaterialViewer
        source={{
          title: "Worksheet",
          fileName: "worksheet.docx",
          fileType: "docx",
          textContent: "Cell respiration summary",
        }}
      />,
    );

    expect(screen.queryByTestId("material-viewer-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-panel")).toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent(
      "Cell respiration summary",
    );
    expect(screen.getByText("docx")).toBeInTheDocument();
  });

  it("renders DOCX inline when the file URL loads", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response);

    render(
      <MaterialViewer
        source={{
          title: "Syllabus",
          fileName: "syllabus.docx",
          fileType: "docx",
          url: "/api/tutor/materials/12/file",
          textContent: "Fallback syllabus text",
        }}
      />,
    );

    expect(screen.getByTestId("material-viewer-docx-panel")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tutor/materials/12/file",
        expect.objectContaining({ credentials: "same-origin" }),
      );
      expect(renderAsyncMock).toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });

  it("steps zoom through the viewer toolbar", async () => {
    const user = userEvent.setup();
    const handleZoomChange = vi.fn();
    const source = {
      title: "Worksheet",
      fileName: "worksheet.txt",
      fileType: "txt",
      textContent: "Cell respiration summary",
    };

    const { rerender } = render(
      <MaterialViewer
        source={source}
        zoom={1}
        onZoomChange={handleZoomChange}
      />,
    );

    expect(screen.getByTestId("material-viewer-zoom-controls")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /zoom in/i }));
    expect(handleZoomChange).toHaveBeenCalledWith(1.125);

    rerender(
      <MaterialViewer
        source={source}
        zoom={1.125}
        onZoomChange={handleZoomChange}
      />,
    );
    expect(screen.getByText("113%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /zoom out/i }));
    expect(handleZoomChange).toHaveBeenLastCalledWith(1);
  });

  it("scales content with transform inside a fixed scroll viewport", () => {
    render(
      <MaterialViewer
        source={{
          title: "Worksheet",
          fileName: "worksheet.txt",
          fileType: "txt",
          textContent: "Cell respiration summary",
        }}
        zoom={1.25}
        onZoomChange={vi.fn()}
      />,
    );

    const zoomContent = screen.getByTestId("material-viewer-zoom-content");
    expect(zoomContent).toHaveStyle({
      transform: "scale(1.25)",
      width: "80%",
    });
    expect(zoomContent).not.toHaveStyle({ zoom: "1.25" });
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
    expect(resolveMaterialViewerKind({ fileName: "notes.txt", fileType: "txt" })).toBe(
      "text",
    );
    expect(
      resolveMaterialViewerKind({
        fileName: "/books/reader.pdf#ch03",
        fileType: "pdf",
        textContent: "Chapter body",
      }),
    ).toBe("text");
    expect(resolveMaterialViewerKind({ mimeType: "video/mp4" })).toBe("video");
    expect(resolveMaterialViewerKind({ fileType: "docx" })).toBe("docx");
    expect(resolveMaterialViewerKind({ fileName: "archive.zip" })).toBe(
      "unsupported",
    );
  });
});
