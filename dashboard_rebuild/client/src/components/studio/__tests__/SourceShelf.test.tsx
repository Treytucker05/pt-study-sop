import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourceShelf } from "@/components/studio/SourceShelf";
import type { Material } from "@/lib/api";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

const getObsidianFilesMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getFiles: (...args: unknown[]) => getObsidianFilesMock(...args),
    },
  },
}));

function makeMaterial(
  overrides: Partial<Material> & Pick<Material, "id">,
): Material {
  return {
    id: overrides.id,
    title: overrides.title ?? `Material ${overrides.id}`,
    source_path: overrides.source_path ?? `uploads/material-${overrides.id}.txt`,
    folder_path: overrides.folder_path ?? "Uploaded Files",
    file_type: overrides.file_type ?? "txt",
    file_size: overrides.file_size ?? 1200,
    course_id: overrides.course_id ?? 1,
    enabled: overrides.enabled ?? true,
    extraction_error: overrides.extraction_error ?? null,
    checksum: overrides.checksum ?? null,
    created_at: overrides.created_at ?? "2026-03-27T10:00:00Z",
    updated_at: overrides.updated_at ?? "2026-03-27T10:00:00Z",
    has_docling_assets: overrides.has_docling_assets,
    docling_asset_count: overrides.docling_asset_count,
  };
}

const BASE_MATERIALS: Material[] = [
  makeMaterial({
    id: 101,
    title: "Cardiac Output Lecture",
    course_id: 1,
    file_type: "pdf",
    source_path: "uploads/cardio-output.pdf",
  }),
  makeMaterial({
    id: 102,
    title: "Afterload Drill",
    course_id: 1,
    file_type: "txt",
    source_path: "uploads/afterload-drill.txt",
  }),
  makeMaterial({
    id: 201,
    title: "Neuro Outlier",
    course_id: 2,
    file_type: "pdf",
    source_path: "uploads/neuro-outlier.pdf",
  }),
];

function renderSourceShelfHarness(options?: {
  initialSelectedPaths?: string[];
  vaultFolder?: string | null;
  onOpenInDocumentDock?: (
    object: Extract<StudioWorkspaceObject, { kind: "material" | "vault_path" }>,
  ) => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Harness() {
    const [materials, setMaterials] = useState(BASE_MATERIALS);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([101]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>(
      options?.initialSelectedPaths ?? [
        "Exercise Physiology/Week 7/Cardio.md",
        "Exercise Physiology/Week 7/Afterload.md",
      ],
    );

    return (
      <QueryClientProvider client={queryClient}>
        <SourceShelf
          courseId={1}
          courseName="Exercise Physiology"
          studyUnit="Week 7"
          topic="Cardiac output"
          materials={materials}
          selectedMaterialIds={selectedMaterialIds}
          selectedMaterialCount={selectedMaterialIds.length}
          selectedPaths={selectedPaths}
          vaultFolder={options?.vaultFolder ?? "Exercise Physiology/Week 7"}
          courseOptions={[
            { id: 1, name: "Exercise Physiology" },
            { id: 2, name: "Neuroscience" },
          ]}
          onSelectedMaterialIdsChange={setSelectedMaterialIds}
          onSelectedPathsChange={setSelectedPaths}
          onUploadFiles={async (files) => {
            const uploaded = Array.from(files).map((file, index) =>
              makeMaterial({
                id: 300 + index,
                title: file.name,
                course_id: 1,
                file_type: file.name.split(".").pop()?.toLowerCase() || "txt",
                source_path: `uploads/${file.name}`,
              }),
            );

            setMaterials((current) => [...current, ...uploaded]);
            setSelectedMaterialIds((current) => [
              ...current,
              ...uploaded.map((material) => material.id),
            ]);
          }}
          onOpenInDocumentDock={options?.onOpenInDocumentDock}
        />
      </QueryClientProvider>
    );
  }

  return render(<Harness />);
}

describe("SourceShelf", () => {
  beforeEach(() => {
    getObsidianFilesMock.mockReset();
    getObsidianFilesMock.mockResolvedValue({ success: true, files: [] });
  });

  it("renders one searchable tree, filters it in real time, and cascades course checkbox selection", async () => {
    const user = userEvent.setup();
    renderSourceShelfHarness();

    const shelf = screen.getByTestId("source-shelf-content");
    expect(within(shelf).getByRole("button", { name: /^all$/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(shelf).getByRole("checkbox", {
        name: /include all exercise physiology in current run/i,
      }),
    ).toBeInTheDocument();
    expect(within(shelf).getByText("Cardiac Output Lecture")).toBeInTheDocument();
    expect(
      within(shelf).getByText("Exercise Physiology/Week 7/Cardio.md"),
    ).toBeInTheDocument();

    const search = within(shelf).getByPlaceholderText(/search sources/i);
    await user.type(search, "afterload");

    expect(within(shelf).getByText("Afterload Drill")).toBeInTheDocument();
    expect(
      within(shelf).queryByText("Cardiac Output Lecture"),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.click(within(shelf).getByRole("button", { name: /^library$/i }));
    await user.click(
      within(shelf).getByRole("checkbox", {
        name: /include all exercise physiology in current run/i,
      }),
    );
    await user.click(within(shelf).getByRole("button", { name: /^current run$/i }));

    expect(within(shelf).getByText("Cardiac Output Lecture")).toBeInTheDocument();
    expect(within(shelf).getByText("Afterload Drill")).toBeInTheDocument();
    expect(within(shelf).queryByText("Neuro Outlier")).not.toBeInTheDocument();
  });

  it("lists vault notes from the derived folder even before any vault paths are selected", async () => {
    const user = userEvent.setup();
    getObsidianFilesMock.mockImplementation(async (folder?: string) => {
      if (folder === "Exercise Physiology/Week 7") {
        return {
          success: true,
          files: ["Cardio.md", "Afterload.md", "Subtopic/"],
        };
      }
      if (folder === "Exercise Physiology/Week 7/Subtopic") {
        return {
          success: true,
          files: ["Stroke Volume.md"],
        };
      }
      return { success: true, files: [] };
    });

    renderSourceShelfHarness({ initialSelectedPaths: [] });

    const shelf = screen.getByTestId("source-shelf-content");
    await user.click(within(shelf).getByRole("button", { name: /^vault$/i }));
    await waitFor(() =>
      expect(getObsidianFilesMock).toHaveBeenCalledWith(
        "Exercise Physiology/Week 7",
      ),
    );

    expect(
      await within(shelf).findByText("Cardio.md", undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(shelf).getByText("Afterload.md")).toBeInTheDocument();
    expect(within(shelf).getByText("Subtopic")).toBeInTheDocument();
    expect(
      within(shelf).getByRole("checkbox", {
        name: /include cardio\.md in current run/i,
      }),
    ).not.toBeChecked();
  });

  it("uploads a new library material and auto-checks it into the current run", async () => {
    const user = userEvent.setup();
    renderSourceShelfHarness();

    const shelf = screen.getByTestId("source-shelf-content");
    await user.click(within(shelf).getByRole("button", { name: /^library$/i }));

    const input = within(shelf).getByTestId("source-shelf-upload-input");
    await user.upload(
      input,
      new File(["alpha"], "Hemodynamics Notes.txt", { type: "text/plain" }),
    );

    expect(await within(shelf).findByText("Hemodynamics Notes.txt")).toBeInTheDocument();
    expect(
      within(shelf).getByRole("checkbox", {
        name: /include hemodynamics notes\.txt in current run/i,
      }),
    ).toBeChecked();

    await user.click(within(shelf).getByRole("button", { name: /^current run$/i }));
    expect(within(shelf).getByText("Hemodynamics Notes.txt")).toBeInTheDocument();
  });

  it("opens a leaf in Document Dock without changing its run membership", async () => {
    const user = userEvent.setup();
    const onOpenInDocumentDock = vi.fn();

    renderSourceShelfHarness({ onOpenInDocumentDock });

    const shelf = screen.getByTestId("source-shelf-content");
    const checkbox = within(shelf).getByRole("checkbox", {
      name: /include cardiac output lecture in current run/i,
    });

    expect(checkbox).toBeChecked();

    await user.click(
      within(shelf).getByRole("button", {
        name: /open cardiac output lecture in document dock/i,
      }),
    );

    expect(onOpenInDocumentDock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "material",
        title: "Cardiac Output Lecture",
      }),
    );
    expect(checkbox).toBeChecked();
  });

  it("renders folder rows as tree controls instead of native buttons", async () => {
    renderSourceShelfHarness();

    const shelf = screen.getByTestId("source-shelf-content");
    const courseFolderRow = await within(shelf).findByRole("button", {
      name: /exercise physiology 3\/4 loaded/i,
    });

    await waitFor(() => {
      expect(courseFolderRow.tagName).toBe("DIV");
    });
  });
});
