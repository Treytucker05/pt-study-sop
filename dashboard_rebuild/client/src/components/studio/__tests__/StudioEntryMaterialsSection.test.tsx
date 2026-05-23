import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StudioEntryMaterialsSection } from "@/components/studio/StudioEntryMaterialsSection";
import type { Material } from "@/lib/api";

const materials = [
  {
    id: 1,
    title: "Chapter 1.pdf",
    file_type: "pdf",
    source_path: "uploads/ch1.pdf",
    course_id: 101,
  },
  {
    id: 2,
    title: "Notes.txt",
    file_type: "txt",
    source_path: "uploads/notes.txt",
    course_id: 101,
  },
] as Material[];

describe("StudioEntryMaterialsSection", () => {
  it("accepts txt in the hidden file input", () => {
    render(
      <StudioEntryMaterialsSection
        materials={materials}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[1]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading={false}
        uploadProgress={null}
        onUploadFiles={vi.fn()}
      />,
    );

    expect(screen.getByTestId("studio-entry-upload-input")).toHaveAttribute(
      "accept",
      ".pdf,.docx,.pptx,.md,.txt,.mp4",
    );
  });

  it("collapses and expands all material groups from the header", async () => {
    const user = userEvent.setup();
    render(
      <StudioEntryMaterialsSection
        materials={[
          ...materials,
          {
            id: 3,
            title: "Slides.pptx",
            file_type: "pptx",
            source_path: "uploads/slides.pptx",
            course_id: 101,
          },
        ] as Material[]}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading={false}
        uploadProgress={null}
        onUploadFiles={vi.fn()}
      />,
    );

    expect(screen.getByTestId("studio-entry-material-row-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("studio-entry-collapse-all-groups"));
    expect(
      screen.queryByTestId("studio-entry-material-row-1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("studio-entry-material-row-3"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("studio-entry-expand-all-groups"));
    expect(screen.getByTestId("studio-entry-material-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("studio-entry-material-row-3")).toBeInTheDocument();
  });

  it("collapses and expands material groups", async () => {
    const user = userEvent.setup();
    render(
      <StudioEntryMaterialsSection
        materials={materials}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading={false}
        uploadProgress={null}
        onUploadFiles={vi.fn()}
      />,
    );

    const group = screen.getByTestId("studio-entry-material-group-uploaded");
    expect(group).toHaveAttribute("data-expanded", "true");
    expect(screen.getByTestId("studio-entry-material-row-1")).toBeInTheDocument();

    await user.click(
      within(group).getByRole("button", { expanded: true }),
    );
    expect(group).toHaveAttribute("data-expanded", "false");
    expect(
      screen.queryByTestId("studio-entry-material-row-1"),
    ).not.toBeInTheDocument();

    await user.click(
      within(group).getByRole("button", { expanded: false }),
    );
    expect(screen.getByTestId("studio-entry-material-row-1")).toBeInTheDocument();
  });

  it("renders grouped material sections", () => {
    render(
      <StudioEntryMaterialsSection
        materials={materials}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading={false}
        uploadProgress={null}
        onUploadFiles={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("studio-entry-material-group-uploaded"),
    ).toBeInTheDocument();
  });

  it("uploads dropped txt files", async () => {
    const onUploadFiles = vi.fn().mockResolvedValue(undefined);
    render(
      <StudioEntryMaterialsSection
        materials={materials}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading={false}
        uploadProgress={null}
        onUploadFiles={onUploadFiles}
      />,
    );

    const dropzone = screen.getByTestId("studio-entry-upload-dropzone");
    const file = new File(["hello"], "reading-notes.txt", { type: "text/plain" });
    fireEvent.dragEnter(dropzone, { dataTransfer: { types: ["Files"] } });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onUploadFiles).toHaveBeenCalledWith([file]);
    });
  });

  it("shows upload progress while uploading", async () => {
    const user = userEvent.setup();
    const onUploadFiles = vi.fn().mockResolvedValue(undefined);
    render(
      <StudioEntryMaterialsSection
        materials={materials}
        materialFilter=""
        onMaterialFilterChange={vi.fn()}
        selectedMaterialIds={[]}
        onToggleMaterial={vi.fn()}
        onToggleAll={vi.fn()}
        allSelected={false}
        formatMaterialLabel={(material) => material.title ?? "Untitled"}
        formatMaterialBadge={(fileType) =>
          String(fileType ?? "file").toUpperCase()
        }
        uploading
        uploadProgress={{ completed: 1, total: 2, currentName: "notes.txt" }}
        onUploadFiles={onUploadFiles}
      />,
    );

    expect(screen.getByTestId("studio-entry-upload-status")).toHaveTextContent(
      "1 of 2",
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    await user.click(screen.getByTestId("studio-entry-upload-dropzone"));
    expect(onUploadFiles).not.toHaveBeenCalled();
  });
});
