import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  consumeLibraryLaunchFromTutorMock,
  getMaterialsMock,
  getActiveCoursesMock,
  getEveryCoursesMock,
  getContentSourcesMock,
  getMaterialContentMock,
  previewSyncMaterialsFolderMock,
  startSyncMaterialsFolderMock,
  getSyncMaterialsStatusMock,
  getEmbedStatusMock,
  updateMaterialMock,
  deleteMaterialMock,
  reextractMaterialMock,
} = vi.hoisted(() => ({
  consumeLibraryLaunchFromTutorMock: vi.fn(),
  getMaterialsMock: vi.fn(),
  getActiveCoursesMock: vi.fn(),
  getEveryCoursesMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
  previewSyncMaterialsFolderMock: vi.fn(),
  startSyncMaterialsFolderMock: vi.fn(),
  getSyncMaterialsStatusMock: vi.fn(),
  getEmbedStatusMock: vi.fn(),
  updateMaterialMock: vi.fn(),
  deleteMaterialMock: vi.fn(),
  reextractMaterialMock: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/MaterialUploader", () => ({
  MaterialUploader: ({
    courseId,
    role,
    setupKind,
  }: {
    courseId?: number;
    role?: string;
    setupKind?: string;
  }) => (
    <div data-testid={`material-uploader-${role || "study"}`}>
      {role || "study"}:{setupKind || "none"}:{courseId || "none"}
    </div>
  ),
}));

vi.mock("@/lib/tutorClientState", () => ({
  consumeLibraryLaunchFromTutor: consumeLibraryLaunchFromTutorMock,
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      getContentSources: getContentSourcesMock,
      getMaterialContent: getMaterialContentMock,
      previewSyncMaterialsFolder: previewSyncMaterialsFolderMock,
      startSyncMaterialsFolder: startSyncMaterialsFolderMock,
      getSyncMaterialsStatus: getSyncMaterialsStatusMock,
      embedStatus: getEmbedStatusMock,
      updateMaterial: updateMaterialMock,
      deleteMaterial: deleteMaterialMock,
      reextractMaterial: reextractMaterialMock,
    },
    courses: {
      getActive: getActiveCoursesMock,
      getEvery: getEveryCoursesMock,
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

describe("Library catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    consumeLibraryLaunchFromTutorMock.mockReturnValue(null);

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
    getEveryCoursesMock.mockResolvedValue([]);
    getContentSourcesMock.mockResolvedValue({ courses: [] });
    getMaterialContentMock.mockResolvedValue({
      id: 1,
      title: "Intro Notes",
      source_path: "Uploaded Files/intro-notes.pdf",
      content: "notes",
      assets: [],
    });
    previewSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      tree: {
        type: "folder",
        name: "PT School",
        path: "",
        children: [],
      },
      counts: { folders: 0, files: 0 },
      allowed_exts: [".pdf", ".docx", ".pptx", ".txt", ".md", ".mp4"],
      truncated: false,
      max_files: 5000,
    });
    startSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      job_id: "source-upload-job",
      selected_count: 1,
      setup_count: 0,
      course_id: null,
    });
    getSyncMaterialsStatusMock.mockResolvedValue({
      job_id: "source-upload-job",
      status: "completed",
      phase: "done",
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      processed: 1,
      total: 1,
      index: 1,
      current_file: null,
      errors: 0,
      sync_result: { ok: true, processed: 1, total: 1, doc_ids: [901] },
      embed_result: null,
      started_at: new Date("2026-05-15T12:00:00Z").toISOString(),
      finished_at: new Date("2026-05-15T12:00:02Z").toISOString(),
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

  it("renders Library as a catalog with upload, not intake or Tutor handoff", async () => {
    getActiveCoursesMock.mockResolvedValue([
      { id: 11, name: "Movement Science II", code: "PHYT 6242" },
    ]);
    getContentSourcesMock.mockResolvedValue({
      courses: [
        {
          id: 11,
          name: "Movement Science II",
          code: "PHYT 6242",
          doc_count: 2,
        },
      ],
    });

    renderLibrary();

    expect(await screen.findByText("COURSE RAIL")).toBeInTheDocument();
    expect(getMaterialsMock).toHaveBeenCalledWith({ include_setup: true });
    expect(screen.getByText("Movement Science II")).toBeInTheDocument();
    expect(screen.getByText("PHYT 6242")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all files/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /all files/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByPlaceholderText(/search library files/i)).toBeInTheDocument();
    expect(screen.getByText("LIBRARY FILES")).toBeInTheDocument();
    expect(screen.getByText("Intro Notes")).toBeInTheDocument();

    expect(screen.queryByText(/selected for tutor/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/study run/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /use visible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add visible/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open tutor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /semester intake/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /folder sync/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh pt school/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /upload/i }));
    expect(screen.getAllByText("UPLOAD FILES").length).toBeGreaterThan(0);
    expect(screen.getByTestId("material-uploader-study")).toBeInTheDocument();
    expect(screen.queryByTestId("material-uploader-setup")).not.toBeInTheDocument();
    expect(screen.queryByText(/course setup upload/i)).not.toBeInTheDocument();
  });

  it("uses a compact visual shell with catalog tabs as the primary navigation", async () => {
    const { container } = renderLibrary();

    expect(await screen.findByText("COURSE RAIL")).toBeInTheDocument();
    expect(
      container.querySelector(".library-ops-workspace--calm"),
    ).toBeInTheDocument();

    const workflowTabs = screen.getByRole("tablist", {
      name: /library workflow/i,
    });
    expect(workflowTabs).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ALL FILES" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "UPLOAD" }));
    expect(screen.getByRole("tab", { name: "UPLOAD" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows setup files as ordinary catalog rows without study controls", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 11,
        title: "Dx Mgmt Syllabus and Schedule",
        source_path: "Uploaded Files/dx-syllabus-schedule.docx",
        folder_path: "Uploaded Files",
        file_type: "docx",
        doc_type: "course_setup",
        material_role: "setup",
        setup_kind: "syllabus_schedule",
        file_size: 70122,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "setup-11",
        created_at: new Date("2026-05-14T12:00:00Z").toISOString(),
        updated_at: new Date("2026-05-14T12:00:00Z").toISOString(),
      },
      {
        id: 12,
        title: "Dx Week 1 Wound Lecture",
        source_path: "Uploaded Files/dx-week-1.pptx",
        folder_path: "Uploaded Files",
        file_type: "pptx",
        doc_type: "upload",
        material_role: "study",
        file_size: 99000,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "study-12",
        created_at: new Date("2026-05-14T12:00:00Z").toISOString(),
        updated_at: new Date("2026-05-14T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    expect(await screen.findByText("Dx Mgmt Syllabus and Schedule")).toBeInTheDocument();
    expect(screen.getByText("Dx Week 1 Wound Lecture")).toBeInTheDocument();
    expect(screen.getByText("SETUP")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open tutor/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/study run/i)).not.toBeInTheDocument();
  });

  it("opens extracted material content in a readable scroll container", async () => {
    getMaterialContentMock.mockResolvedValue({
      id: 1,
      title: "Intro Notes",
      source_path: "Uploaded Files/intro-notes.pdf",
      file_type: "pdf",
      char_count: 12000,
      content:
        "# Intro Notes\n\n" +
        "| Phase | What to check |\n|---|---|\n| Intake | Confirm the file renders clearly. |\n\n" +
        "Readable paragraph.\n\n".repeat(80),
      assets: [],
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: "View content" }));

    expect(await screen.findByTestId("library-material-reader")).toHaveClass(
      "overflow-y-auto",
    );
    const markdownReader = screen.getByTestId("library-material-markdown");
    expect(markdownReader.className).toContain("library-material-markdown");
    expect(markdownReader.className).toContain("max-w-[86ch]");
    expect(markdownReader.className).toContain("prose-headings:font-sans");
    expect(markdownReader.className).not.toContain("prose-headings:font-arcade");
    expect(screen.getByTestId("library-material-table-scroll")).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveTextContent("What to check");
    const contentDialog = screen.getByRole("dialog", { name: "Intro Notes" });
    expect(contentDialog).toBeInTheDocument();
    expect(
      within(contentDialog).getByRole("heading", {
        level: 2,
        name: "Intro Notes",
      }),
    ).toHaveClass("library-material-dialog-title");
    expect(screen.getAllByText(/readable paragraph/i).length).toBeGreaterThan(1);
  });

  it("uploads files into the Library without setup/intake choices", async () => {
    getActiveCoursesMock.mockResolvedValue([
      { id: 9, name: "Dx Mgmt Integumentary", code: "PHYT 6262" },
    ]);
    getContentSourcesMock.mockResolvedValue({
      courses: [
        {
          id: 9,
          name: "Dx Mgmt Integumentary",
          code: "PHYT 6262",
          doc_count: 0,
        },
      ],
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("tab", { name: /upload/i }));
    expect((await screen.findAllByText("UPLOAD FILES")).length).toBeGreaterThan(0);
    expect(screen.queryByText("COURSE SETUP UPLOAD")).not.toBeInTheDocument();
    expect(screen.queryByText("STUDY MATERIAL UPLOAD")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: /upload course/i }), {
      target: { value: "9" },
    });
    expect(screen.queryByTestId("material-uploader-setup")).not.toBeInTheDocument();
    expect(screen.getByTestId("material-uploader-study")).toHaveTextContent("study:none:9");
  });

  it("searches uploaded materials by title, folder, type, and source path", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 101,
        title: "MSII Topic 1 Objectives",
        source_path:
          "11_Movement Science II/10_Intro/MSII Topic 1 Objectives.pdf",
        folder_path: "11_Movement Science II/10_Intro",
        file_type: "pdf",
        file_size: 1024,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "study-101",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
      {
        id: 102,
        title: "Professional Writing",
        source_path: "13_Professionalism/Professional Writing.pdf",
        folder_path: "13_Professionalism",
        file_type: "pdf",
        file_size: 4096,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "study-102",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    expect(await screen.findByText("MSII Topic 1 Objectives")).toBeInTheDocument();
    expect(screen.getByText("Professional Writing")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search library files/i), {
      target: { value: "professionalism" },
    });

    expect(screen.queryByText("MSII Topic 1 Objectives")).not.toBeInTheDocument();
    expect(screen.getByText("Professional Writing")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search library files/i), {
      target: { value: "pdf" },
    });

    expect(screen.getByText("MSII Topic 1 Objectives")).toBeInTheDocument();
    expect(screen.getByText("Professional Writing")).toBeInTheDocument();
  });

  it("filters catalog rows from basic file-column filter buttons", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 201,
        title: "Movement Objectives",
        source_path: "11_Movement Science II/objectives.pdf",
        folder_path: "11_Movement Science II",
        file_type: "pdf",
        file_size: 1024,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "filter-201",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
      {
        id: 202,
        title: "Task Analysis Slides",
        source_path: "11_Movement Science II/task-analysis.pptx",
        folder_path: "11_Movement Science II",
        file_type: "pptx",
        file_size: 2048,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "filter-202",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    expect(await screen.findByText("Movement Objectives")).toBeInTheDocument();
    expect(screen.getByText("Task Analysis Slides")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /filter type column/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "PDF" }));

    expect(screen.getByText("Movement Objectives")).toBeInTheDocument();
    expect(screen.queryByText("Task Analysis Slides")).not.toBeInTheDocument();
  });

  it("supports basic file-explorer column resize, autofit, and drag ordering", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 301,
        title: "MSII Topic 1 - Control of Human Movement With A Long Name",
        source_path:
          "11_Movement Science II/10_Intro/MSII Topic 1 - Control of Human Movement.pptx",
        folder_path: "11_Movement Science II/10_Intro",
        file_type: "pptx",
        file_size: 4096,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "explorer-301",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    expect(await screen.findByText(/MSII Topic 1/)).toBeInTheDocument();
    const headerRow = screen.getByTestId("library-material-table-header");
    const initialTemplate = headerRow.style.gridTemplateColumns;

    fireEvent.doubleClick(
      screen.getByRole("separator", { name: /resize title column/i }),
    );
    expect(headerRow.style.gridTemplateColumns).not.toBe(initialTemplate);

    const titleResize = screen.getByRole("separator", {
      name: /resize title column/i,
    });
    const beforeDragTemplate = headerRow.style.gridTemplateColumns;
    fireEvent.mouseDown(titleResize, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 150 });
    fireEvent.mouseUp(window);
    expect(headerRow.style.gridTemplateColumns).not.toBe(beforeDragTemplate);

    const titleHeader = screen.getByTestId("library-table-header-title");
    const folderHeader = screen.getByTestId("library-table-header-folder");
    fireEvent.dragStart(folderHeader);
    fireEvent.dragOver(titleHeader);
    fireEvent.drop(titleHeader);

    const orderedColumns = Array.from(
      headerRow.querySelectorAll("[data-library-column-id]"),
    ).map((node) => node.getAttribute("data-library-column-id"));
    expect(orderedColumns.slice(0, 2)).toEqual(["folder", "title"]);
  });

  it("consumes Tutor Page 1 handoff and preselects the upload course target", async () => {
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
    fireEvent.click(screen.getByRole("tab", { name: /upload/i }));
    expect(screen.getByRole("combobox", { name: /upload course/i })).toHaveValue(
      "9",
    );
  });

  it("folder rail refreshes from the live PT School source tree", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 301,
        title: "Topic 1 objectives",
        source_path:
          "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School/Movement Science II/Topic 1/objectives.pdf",
        folder_path: "Movement Science II/Topic 1",
        file_type: "pdf",
        file_size: 200,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "existing-301",
        created_at: new Date("2026-05-14T12:00:00Z").toISOString(),
        updated_at: new Date("2026-05-14T12:00:00Z").toISOString(),
      },
    ]);
    previewSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      tree: {
        type: "folder",
        name: "PT School",
        path: "",
        children: [
          {
            type: "folder",
            name: "10_Dx Mgmt Integumentary",
            path: "10_Dx Mgmt Integumentary",
            children: [
              {
                type: "folder",
                name: "10_Week 1 Course Intro Skin Anatomy and Wound Healing",
                path: "10_Dx Mgmt Integumentary/10_Week 1 Course Intro Skin Anatomy and Wound Healing",
                children: [
                  {
                    type: "file",
                    name: "PHYT 6262 - Skin Anatomy.pptx",
                    path: "10_Dx Mgmt Integumentary/10_Week 1 Course Intro Skin Anatomy and Wound Healing/PHYT 6262 - Skin Anatomy.pptx",
                    size: 400,
                  },
                ],
              },
            ],
          },
          {
            type: "folder",
            name: "11_Movement Science II",
            path: "11_Movement Science II",
            children: [
              {
                type: "folder",
                name: "10_Intro and Perspective of Human Movement",
                path: "11_Movement Science II/10_Intro and Perspective of Human Movement",
                children: [
                  {
                    type: "file",
                    name: "objectives.pdf",
                    path: "11_Movement Science II/10_Intro and Perspective of Human Movement/objectives.pdf",
                    size: 200,
                  },
                ],
              },
            ],
          },
        ],
      },
      counts: { folders: 4, files: 2 },
      allowed_exts: [".pdf", ".pptx"],
      truncated: false,
      max_files: 5000,
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: /folders/i }));
    expect(previewSyncMaterialsFolderMock).toHaveBeenCalledWith({});
    expect(await screen.findByText("10_Dx Mgmt Integumentary")).toBeInTheDocument();
    expect(screen.getByText("11_Movement Science II")).toBeInTheDocument();
    expect(
      screen.getByText("10_Intro and Perspective of Human Movement"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refresh source folders/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 source files detected/i)).toBeInTheDocument();
  });

  it("opens the Upload tab with checkbox candidates for unuploaded source-folder files", async () => {
    const root =
      "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School";
    getMaterialsMock.mockResolvedValue([
      {
        id: 401,
        title: "Already Loaded",
        source_path: `${root}/10_Dx Mgmt Integumentary/10_Week 1/already-loaded.pdf`,
        folder_path: "10_Dx Mgmt Integumentary/10_Week 1",
        file_type: "pdf",
        file_size: 100,
        course_id: null,
        enabled: true,
        extraction_error: null,
        checksum: "existing-401",
        created_at: new Date("2026-05-15T12:00:00Z").toISOString(),
        updated_at: new Date("2026-05-15T12:00:00Z").toISOString(),
      },
    ]);
    previewSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      folder: root,
      tree: {
        type: "folder",
        name: "PT School",
        path: "",
        children: [
          {
            type: "folder",
            name: "10_Dx Mgmt Integumentary",
            path: "10_Dx Mgmt Integumentary",
            children: [
              {
                type: "folder",
                name: "10_Week 1",
                path: "10_Dx Mgmt Integumentary/10_Week 1",
                children: [
                  {
                    type: "file",
                    name: "already-loaded.pdf",
                    path: "10_Dx Mgmt Integumentary/10_Week 1/already-loaded.pdf",
                    size: 100,
                  },
                  {
                    type: "file",
                    name: "Wound Healing Lecture.pptx",
                    path: "10_Dx Mgmt Integumentary/10_Week 1/Wound Healing Lecture.pptx",
                    size: 2200,
                  },
                ],
              },
            ],
          },
        ],
      },
      counts: { folders: 2, files: 2 },
      allowed_exts: [".pdf", ".pptx"],
      truncated: false,
      max_files: 5000,
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: /folders/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /10_Dx Mgmt Integumentary/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "UPLOAD" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    const candidatePanel = await screen.findByTestId(
      "library-source-upload-candidates",
    );
    expect(
      within(candidatePanel).getByRole("checkbox", {
        name: /upload wound healing lecture\.pptx/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(candidatePanel).queryByRole("checkbox", {
        name: /upload already-loaded\.pdf/i,
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(candidatePanel).getByRole("checkbox", {
        name: /upload wound healing lecture\.pptx/i,
      }),
    );
    fireEvent.click(
      within(candidatePanel).getByRole("button", {
        name: /upload selected \(1\)/i,
      }),
    );

    await waitFor(() =>
      expect(startSyncMaterialsFolderMock).toHaveBeenCalledWith({
        folder_path: root,
        selected_files: [
          "10_Dx Mgmt Integumentary/10_Week 1/Wound Healing Lecture.pptx",
        ],
        course_id: null,
      }),
    );
  });
});
