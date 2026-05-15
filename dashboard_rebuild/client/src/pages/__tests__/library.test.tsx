import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  consumeLibraryLaunchFromTutorMock,
  getMaterialsMock,
  getActiveCoursesMock,
  getEveryCoursesMock,
  getContentSourcesMock,
  getMaterialContentMock,
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

  it("folder rail shows folders from uploaded Library materials only", async () => {
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

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: /folders/i }));
    expect(await screen.findByText("Movement Science II")).toBeInTheDocument();
    expect(screen.getByText("Topic 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh pt school/i })).not.toBeInTheDocument();
  });
});
