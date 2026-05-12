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
    expect(
      screen.getByText("Mirror your Obsidian-style folder tree."),
    ).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

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
    expect(
      screen.getByRole("combobox", { name: /upload course/i }),
    ).toHaveValue("9");
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
        material_files: 1,
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

    expect(await screen.findByText("SEMESTER INTAKE")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /scan intake/i }));

    expect(await screen.findByText("Dx Mgmt Integumentary")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /apply course setup/i }),
    );

    await waitFor(() => {
      expect(semesterIntakeApplyMock).toHaveBeenCalledWith({
        folder_path:
          "/Users/fst/Library/CloudStorage/OneDrive-Personal/Desktop/PT School",
        courses: [
          {
            name: "Dx Mgmt Integumentary",
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
});
