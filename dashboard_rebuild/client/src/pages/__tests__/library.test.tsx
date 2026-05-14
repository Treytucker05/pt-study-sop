import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  previewSyncMaterialsFolderMock,
  startSyncMaterialsFolderMock,
  getSyncMaterialsStatusMock,
  reextractMaterialMock,
  semesterIntakePreviewMock,
  semesterIntakeApplyMock,
  readTutorSelectedMaterialIdsMock,
  writeTutorSelectedMaterialIdsMock,
  writeTutorStoredStartStateMock,
  setLocationMock,
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
  previewSyncMaterialsFolderMock: vi.fn(),
  startSyncMaterialsFolderMock: vi.fn(),
  getSyncMaterialsStatusMock: vi.fn(),
  reextractMaterialMock: vi.fn(),
  semesterIntakePreviewMock: vi.fn(),
  semesterIntakeApplyMock: vi.fn(),
  readTutorSelectedMaterialIdsMock: vi.fn(),
  writeTutorSelectedMaterialIdsMock: vi.fn(),
  writeTutorStoredStartStateMock: vi.fn(),
  setLocationMock: vi.fn(),
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
  writeTutorStoredStartState: writeTutorStoredStartStateMock,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/library", setLocationMock],
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
      getEvery: getEveryCoursesMock,
    },
    semesterIntake: {
      preview: semesterIntakePreviewMock,
      apply: semesterIntakeApplyMock,
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
    semesterIntakePreviewMock.mockResolvedValue({
      ok: true,
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      courses: [],
      global_schedule_files: [],
      unassigned_material_files: [],
      ignored_files: [],
      counts: {
        courses: 0,
        syllabus_files: 0,
        schedule_files: 0,
        material_files: 0,
        ignored_files: 0,
      },
    });
    semesterIntakeApplyMock.mockResolvedValue({
      ok: true,
      coursesCreated: 0,
      coursesUpdated: 0,
      modulesCreated: 0,
      objectivesCreated: 0,
      eventsCreated: 0,
      setupFilesParsed: 0,
      setupParseErrors: [],
      materialSyncJobs: [],
      courses: [],
    });
  });

  it("renders the course-first Library operations workflow", async () => {
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
    expect(screen.getByText("Movement Science II")).toBeInTheDocument();
    expect(screen.getByText("PHYT 6242")).toBeInTheDocument();
    expect(screen.getByText("ADD COURSEWORK")).toBeInTheDocument();
    expect(screen.getByText("COURSE SETUP")).toBeInTheDocument();
    expect(screen.getByText("STUDY MATERIALS")).toBeInTheDocument();
    expect(screen.getByText("CURRENT RUN")).toBeInTheDocument();
    expect(screen.getByText("STUDY READINESS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /semester intake/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /folder sync/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /direct upload/i })).toBeInTheDocument();
    expect(screen.getByText("YOUR MATERIALS")).toBeInTheDocument();
    expect(screen.getByText(/build the Current Run/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", {
        name: /Movement Science II \(PHYT 6242\)/i,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("switches Add Coursework modes without losing selected-file safety", async () => {
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

    expect(await screen.findByText("ADD COURSEWORK")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /semester intake/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /apply setup \+ selected files/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /folder sync/i }));

    expect(screen.getByText("SYNC STUDY FOLDER")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync selected files/i })).toBeDisabled();
    expect(screen.getByText(/0 selected/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /direct upload/i }));

    expect(screen.getByText("UPLOAD MATERIALS")).toBeInTheDocument();
    expect(screen.getByTestId("material-uploader")).toBeInTheDocument();
  });

  it("shows Movement Science II intake as a reviewable course row", async () => {
    semesterIntakePreviewMock.mockResolvedValue({
      ok: true,
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      courses: [
        {
          name: "Movement Science II",
          code: "PHYT 6242",
          folder_path: "11_Movement Science II",
          syllabus_files: [
            {
              path: "11_Movement Science II/syllabus.docx",
              name: "syllabus.docx",
              roles: ["syllabus"],
              size: 100,
              modified_at: "2026-05-13T12:00:00",
            },
          ],
          schedule_files: [
            {
              path: "11_Movement Science II/schedule.pdf",
              name: "schedule.pdf",
              roles: ["schedule"],
              size: 120,
              modified_at: "2026-05-13T12:00:00",
            },
          ],
          material_files: [
            {
              path: "11_Movement Science II/Topic 1/objectives.docx",
              name: "objectives.docx",
              roles: ["material"],
              size: 90,
              modified_at: "2026-05-13T12:00:00",
            },
            {
              path: "11_Movement Science II/Topic 1/intro-movement.pptx",
              name: "intro-movement.pptx",
              roles: ["material"],
              size: 200,
              modified_at: "2026-05-13T12:00:00",
            },
          ],
          readiness: {
            course: "missing",
            syllabus: "found",
            schedule: "found",
            materials: "found",
            embeddings: "pending",
            readyForTutor: false,
          },
        },
      ],
      global_schedule_files: [],
      unassigned_material_files: [],
      ignored_files: [],
      counts: {
        courses: 1,
        syllabus_files: 1,
        schedule_files: 1,
        material_files: 2,
        ignored_files: 0,
      },
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: /scan intake/i }));

    expect(await screen.findByText("Movement Science II")).toBeInTheDocument();
    expect(
      screen.getByText(/1 syllabus \/ 1 schedule \/ 2 material/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/0 selected for Library/i)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: /load objectives\.docx from movement science ii/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: /load intro-movement\.pptx from movement science ii/i,
      }),
    ).toBeInTheDocument();
  });

  it("writes selected tutor materials and clears stale wizard progress on open", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 1,
        title: "Intro Notes",
        source_path: "Uploaded Files/intro-notes.pdf",
        folder_path: "Uploaded Files",
        file_type: "pdf",
        file_size: 1024,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "abc123",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);
    localStorage.setItem(
      "tutor.wizard.progress.v1",
      JSON.stringify({ step: 2, chainMode: "template" }),
    );

    renderLibrary();

    await screen.findByText("Intro Notes");
    expect(screen.getByText("COURSE RAIL")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", { name: /select intro notes for tutor/i }),
    );

    await waitFor(() => {
      expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([1]);
    });

    writeTutorSelectedMaterialIdsMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /open tutor/i }));

    expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([1]);
    expect(writeTutorStoredStartStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 9,
        selectedMaterials: [1],
        chainId: undefined,
        customBlockIds: [],
        accuracyProfile: "strict",
        objectiveScope: "module_all",
        selectedObjectiveId: "",
        selectedObjectiveGroup: "",
        selectedPaths: [],
      }),
    );
    expect(localStorage.getItem("tutor.wizard.progress.v1")).toBeNull();
    expect(localStorage.getItem("tutor-studio-last-tab")).toBe("workspace");
    expect(sessionStorage.getItem("tutor.open_from_library.v1")).toBe("1");
    expect(setLocationMock).toHaveBeenCalledWith("/tutor?course_id=9");
  });

  it("keeps textbook references visible but out of default Current Run bulk actions", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 101,
        title: "MSII Topic 1 Objectives",
        source_path:
          "11_Movement Science II/10_Intro/MSII Topic 1 Objectives.pdf",
        folder_path: "11_Movement Science II/10_Intro",
        file_type: "pdf",
        file_size: 1024,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "study-101",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
      {
        id: 102,
        title: "Observational Gait Analysis",
        source_path:
          "11_Movement Science II/01_Textbook/Observational Gait Analysis.pdf",
        folder_path: "11_Movement Science II/01_Textbook",
        file_type: "pdf",
        file_size: 4096,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "reference-102",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    expect(await screen.findByText("MSII Topic 1 Objectives")).toBeInTheDocument();
    expect(screen.getByText("Observational Gait Analysis")).toBeInTheDocument();
    expect(screen.getByText("COURSE REF")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /replace run/i }));

    await waitFor(() => {
      expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([101]);
    });
    expect(screen.getByText(/Current Run: 1 file total/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open tutor \(1\)/i })).toBeEnabled();
  });

  it("launches Tutor with only the row file when Study this file is used", async () => {
    getMaterialsMock.mockResolvedValue([
      {
        id: 1,
        title: "Intro Notes",
        source_path: "Uploaded Files/intro-notes.pdf",
        folder_path: "Uploaded Files",
        file_type: "pdf",
        file_size: 1024,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "abc123",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
      {
        id: 2,
        title: "Reference Chapter",
        source_path: "Uploaded Files/reference-chapter.pdf",
        folder_path: "Uploaded Files/01_Textbook",
        file_type: "pdf",
        file_size: 2048,
        course_id: 9,
        enabled: true,
        extraction_error: null,
        checksum: "def456",
        created_at: new Date("2026-03-05T12:00:00Z").toISOString(),
        updated_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      },
    ]);

    renderLibrary();

    await screen.findByText("Intro Notes");
    fireEvent.click(
      screen.getByRole("button", { name: /study intro notes in tutor/i }),
    );

    expect(writeTutorSelectedMaterialIdsMock).toHaveBeenCalledWith([1]);
    expect(writeTutorStoredStartStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 9,
        selectedMaterials: [1],
      }),
    );
    expect(setLocationMock).toHaveBeenCalledWith("/tutor?course_id=9");
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
    fireEvent.click(screen.getByRole("button", { name: /direct upload/i }));
    expect(
      screen.getByRole("combobox", { name: /upload course/i }),
    ).toHaveValue("9");
    fireEvent.click(screen.getByRole("button", { name: /folder sync/i }));
    expect(screen.getByRole("combobox", { name: /sync course/i })).toHaveValue(
      "9",
    );
  });

  it("scans a semester folder and applies course setup from Library", async () => {
    semesterIntakePreviewMock.mockResolvedValue({
      ok: true,
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
      courses: [
        {
          name: "Dx Mgmt Integumentary",
          code: "PHYT 6262",
          folder_path: "10_Dx_Mgmt_Integumentary",
          syllabus_files: [
            {
              path: "10_Dx_Mgmt_Integumentary/syllabus.docx",
              name: "syllabus.docx",
              roles: ["syllabus"],
              size: 100,
              modified_at: "2026-05-11T12:00:00",
            },
          ],
          schedule_files: [],
          material_files: [
            {
              path: "10_Dx_Mgmt_Integumentary/week-1.pdf",
              name: "week-1.pdf",
              roles: ["material"],
              size: 200,
              modified_at: "2026-05-11T12:00:00",
            },
            {
              path: "10_Dx_Mgmt_Integumentary/week-1-extra.pptx",
              name: "week-1-extra.pptx",
              roles: ["material"],
              size: 250,
              modified_at: "2026-05-11T12:00:00",
            },
          ],
          readiness: {
            course: "missing",
            syllabus: "found",
            schedule: "missing",
            materials: "found",
            embeddings: "pending",
            readyForTutor: false,
          },
        },
      ],
      global_schedule_files: [
        {
          path: "00_Class_Schedules/semester-schedule.pdf",
          name: "semester-schedule.pdf",
          roles: ["schedule"],
          size: 300,
          modified_at: "2026-05-11T12:00:00",
        },
      ],
      unassigned_material_files: [],
      ignored_files: [],
      counts: {
        courses: 1,
        syllabus_files: 1,
        schedule_files: 1,
        material_files: 2,
        ignored_files: 0,
      },
    });
    semesterIntakeApplyMock.mockResolvedValue({
      ok: true,
      coursesCreated: 1,
      coursesUpdated: 0,
      modulesCreated: 0,
      objectivesCreated: 0,
      eventsCreated: 0,
      setupFilesParsed: 1,
      setupParseErrors: [],
      materialSyncJobs: [{ courseId: 1, jobId: "semester-sync-job" }],
      courses: [{ id: 1, name: "Dx Mgmt Integumentary" }],
    });

    renderLibrary();

    expect(
      await screen.findByRole("button", { name: /semester intake/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scan intake/i }));

    expect(await screen.findByText("Dx Mgmt Integumentary")).toBeInTheDocument();
    expect(screen.getByText(/0 selected for Library/i)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /load week-1\.pdf from dx mgmt integumentary/i,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /apply setup \+ selected files/i }),
    );

    await waitFor(() => {
      expect(semesterIntakeApplyMock).toHaveBeenCalledWith({
        folder_path:
          "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
        courses: [
          {
            name: "Dx Mgmt Integumentary",
            code: "PHYT 6262",
            folder_path: "10_Dx_Mgmt_Integumentary",
            syllabus_files: ["10_Dx_Mgmt_Integumentary/syllabus.docx"],
            schedule_files: [],
            material_files: ["10_Dx_Mgmt_Integumentary/week-1.pdf"],
            syllabus: { modules: [] },
            schedule: { events: [] },
          },
        ],
      });
    });
  });

  it("scans a folder without auto-selecting every file for sync", async () => {
    previewSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      type: "folder",
      folder: "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School/Movement Science II",
      counts: { folders: 1, files: 2 },
      tree: {
        type: "folder",
        name: "Movement Science II",
        path: "",
        children: [
          {
            type: "folder",
            name: "Topic 1",
            path: "Topic 1",
            children: [
              {
                type: "file",
                name: "objectives.docx",
                path: "Topic 1/objectives.docx",
                size: 100,
                modified_at: "2026-05-13T12:00:00",
              },
              {
                type: "file",
                name: "intro-movement.pptx",
                path: "Topic 1/intro-movement.pptx",
                size: 200,
                modified_at: "2026-05-13T12:00:00",
              },
            ],
          },
        ],
      },
      allowed_exts: [".docx", ".pptx"],
      truncated: false,
    });
    startSyncMaterialsFolderMock.mockResolvedValue({
      ok: true,
      job_id: "sync-selected-only",
      folder:
        "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School/Movement Science II",
      selected_count: 1,
      course_id: null,
    });

    renderLibrary();

    fireEvent.click(await screen.findByRole("button", { name: /folder sync/i }));
    fireEvent.change(screen.getByPlaceholderText(/paste the local pt school folder path/i), {
      target: {
        value:
          "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School/Movement Science II",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /scan folder tree/i }));

    expect(await screen.findByText(/2 files found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 selected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync selected files/i })).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", { name: /sync objectives\.docx/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /sync selected files/i }));

    await waitFor(() => {
      expect(startSyncMaterialsFolderMock).toHaveBeenCalledWith({
        folder_path:
          "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School/Movement Science II",
        selected_files: ["Topic 1/objectives.docx"],
        course_id: null,
      });
    });
  });
});
