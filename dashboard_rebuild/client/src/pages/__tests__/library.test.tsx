import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  consumeLibraryLaunchFromTutorMock,
  getMaterialsMock,
  getActiveCoursesMock,
  getContentSourcesMock,
  getMaterialContentMock,
  getEmbedStatusMock,
  updateMaterialMock,
  deleteMaterialMock,
  previewSyncMaterialsFolderMock,
  startSyncMaterialsFolderMock,
  getSyncMaterialsStatusMock,
  reextractMaterialMock,
  readTutorSelectedMaterialIdsMock,
  writeTutorSelectedMaterialIdsMock,
} = vi.hoisted(() => ({
  consumeLibraryLaunchFromTutorMock: vi.fn(),
  getMaterialsMock: vi.fn(),
  getActiveCoursesMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
  getEmbedStatusMock: vi.fn(),
  updateMaterialMock: vi.fn(),
  deleteMaterialMock: vi.fn(),
  previewSyncMaterialsFolderMock: vi.fn(),
  startSyncMaterialsFolderMock: vi.fn(),
  getSyncMaterialsStatusMock: vi.fn(),
  reextractMaterialMock: vi.fn(),
  readTutorSelectedMaterialIdsMock: vi.fn(),
  writeTutorSelectedMaterialIdsMock: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/MaterialUploader", () => ({
  MaterialUploader: () => <div data-testid="material-uploader" />,
}));

vi.mock("@/lib/tutorClientState", () => ({
  consumeLibraryLaunchFromTutor: consumeLibraryLaunchFromTutorMock,
  readTutorSelectedMaterialIds: readTutorSelectedMaterialIdsMock,
  writeTutorSelectedMaterialIds: writeTutorSelectedMaterialIdsMock,
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      getContentSources: getContentSourcesMock,
      getMaterialContent: getMaterialContentMock,
      embedStatus: getEmbedStatusMock,
      updateMaterial: updateMaterialMock,
      deleteMaterial: deleteMaterialMock,
      previewSyncMaterialsFolder: previewSyncMaterialsFolderMock,
      startSyncMaterialsFolder: startSyncMaterialsFolderMock,
      getSyncMaterialsStatus: getSyncMaterialsStatusMock,
      reextractMaterial: reextractMaterialMock,
    },
    courses: {
      getActive: getActiveCoursesMock,
    },
  },
}));

import Library from "@/pages/library";

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Library />
    </QueryClientProvider>,
  );
}

describe("Library tutor handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    consumeLibraryLaunchFromTutorMock.mockReturnValue(null);
    readTutorSelectedMaterialIdsMock.mockReturnValue([]);
    writeTutorSelectedMaterialIdsMock.mockImplementation(() => {});

    getMaterialsMock.mockResolvedValue([
      {
        id: 1,
        title: "Intro Notes",
        source_path: "Uploaded Files/intro-notes.pdf",
        folder_path: "Uploaded Files",
        file_type: "pdf",
        file_size: 1024,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "abc123",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);
    getActiveCoursesMock.mockResolvedValue([]);
    getContentSourcesMock.mockResolvedValue({ courses: [] });
    getMaterialContentMock.mockResolvedValue({
      id: 1,
      title: "Intro Notes",
      source_path: "Uploaded Files/intro-notes.pdf",
      content: "notes",
      assets: [],
    });
    getEmbedStatusMock.mockResolvedValue({
      materials: [
        {
          id: 1,
          title: "Intro Notes",
          source_path: "Uploaded Files/intro-notes.pdf",
          chunk_count: 2,
          embedded: 1,
          stale_chunk_count: 0,
          needs_reembed: false,
        },
      ],
      total: 1,
      embedded: 1,
      pending: 0,
      stale: 0,
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      collection: "tutor_materials_gemini_gemini-embedding-2-preview",
      auto_selected_provider: false,
    });
  });

  it("writes selected tutor materials and clears stale wizard progress on open", async () => {
    localStorage.setItem(
      "tutor.wizard.progress.v1",
      JSON.stringify({ step: 2, chainMode: "template" }),
    );

    renderLibrary();

    await screen.findByText("Intro Notes");
    expect(
      screen.getByText(
        "Support system for Brain-owned study materials, Tutor scope, and clean handoff into live study.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("library-embed-provider")).toHaveTextContent(
      "Tutor embeddings: GEMINI · gemini-embedding-2-preview",
    );
    expect(screen.getByText("1/1 materials live")).toBeInTheDocument();
    expect(screen.getByText("No stale embeddings")).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([1]);
    });

    writeTutorSelectedMaterialIdsMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /open tutor/i }));

    expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([1]);
    expect(localStorage.getItem("tutor.wizard.progress.v1")).toBeNull();
    expect(sessionStorage.getItem("tutor.open_from_library.v1")).toBe("1");
  });

  it("consumes Tutor Page 1 handoff and preselects the course intake target", async () => {
    getActiveCoursesMock.mockResolvedValue([
      { id: 9, name: "Neuro", code: "NEU-9" },
    ]);
    getContentSourcesMock.mockResolvedValue({
      courses: [{ id: 9, name: "Neuro", code: "NEU-9", doc_count: 1 }],
    });
    consumeLibraryLaunchFromTutorMock.mockReturnValue({
      source: "assignment",
      courseId: 9,
      courseName: "Neuro",
      target: "load_materials",
    });

    renderLibrary();

    expect(await screen.findByText("NEU-9")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /upload course/i })).toHaveValue("9");
    expect(screen.getByRole("combobox", { name: /sync course/i })).toHaveValue("9");
  });
});
