import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TutorStudioMode } from "@/components/TutorStudioMode";

const {
  restoreStudioItemsMock,
  promoteStudioItemMock,
  getMaterialContentMock,
  getMaterialFileUrlMock,
  getContentSourcesMock,
} = vi.hoisted(() => ({
  restoreStudioItemsMock: vi.fn(),
  promoteStudioItemMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
  getMaterialFileUrlMock: vi.fn((id: number) => `/api/tutor/materials/${id}/file`),
  getContentSourcesMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      restoreStudioItems: restoreStudioItemsMock,
      promoteStudioItem: promoteStudioItemMock,
      getMaterialContent: getMaterialContentMock,
      getMaterialFileUrl: getMaterialFileUrlMock,
      getContentSources: getContentSourcesMock,
    },
    chains: {
      getOne: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/TutorWorkspaceSurface", () => ({
  TutorWorkspaceSurface: () => <div data-testid="tutor-workspace-surface">workspace surface</div>,
}));

vi.mock("@/components/StudioBreadcrumb", () => ({
  StudioBreadcrumb: ({ level }: { level: number }) => (
    <nav data-testid="studio-breadcrumb">Level {level}</nav>
  ),
}));

vi.mock("@/components/StudioClassPicker", () => ({
  StudioClassPicker: () => <div data-testid="studio-class-picker">class picker</div>,
}));

vi.mock("@/components/StudioClassDetail", () => ({
  StudioClassDetail: () => <div data-testid="studio-class-detail">class detail</div>,
}));

vi.mock("@/components/StudioPrepMode", () => ({
  StudioPrepMode: () => <div data-testid="studio-prep-mode">prep mode</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

function renderStudio(props?: Partial<React.ComponentProps<typeof TutorStudioMode>>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TutorStudioMode
        courseId={4}
        activeSessionId="session-1"
        availableMaterials={[
          {
            id: 11,
            title: "Worksheet",
            source_path: "worksheet.docx",
            folder_path: null,
            file_type: "docx",
            file_size: 1024,
            course_id: 4,
            enabled: true,
            extraction_error: null,
            checksum: null,
            created_at: "2026-03-13T00:00:00Z",
            updated_at: null,
          },
          {
            id: 22,
            title: "Lecture PDF",
            source_path: "/materials/lecture.pdf",
            folder_path: null,
            file_type: "pdf",
            file_size: 4096,
            course_id: 4,
            enabled: true,
            extraction_error: null,
            checksum: null,
            created_at: "2026-03-13T00:00:00Z",
            updated_at: null,
          },
        ]}
        selectedMaterialIds={[22, 11]}
        activeBoardScope="project"
        onBoardScopeChange={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("TutorStudioMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreStudioItemsMock.mockResolvedValue({ items: [] });
    promoteStudioItemMock.mockResolvedValue({ ok: true });
    getContentSourcesMock.mockResolvedValue({
      courses: [{ id: 4, name: "Test Course", code: "TC-100", doc_count: 2 }],
      total_materials: 2,
      total_instructions: 0,
      total_docs: 2,
      openrouter_enabled: false,
    });
    getMaterialContentMock.mockImplementation(async (id: number) => {
      if (id === 22) {
        return {
          id: 22,
          title: "Lecture PDF",
          source_path: "/materials/lecture.pdf",
          file_type: "pdf",
          content: "Lecture PDF extracted text",
          char_count: 128,
          extraction_lossy: false,
          replacement_ratio: 0,
        };
      }

      return {
        id: 11,
        title: "Worksheet",
        source_path: "worksheet.docx",
        file_type: "docx",
        content: "Worksheet extracted text",
        char_count: 96,
        extraction_lossy: false,
        replacement_ratio: 0,
      };
    });
  });

  it("renders 3-column L3 workspace with viewer pane, workbench, and source/workbench tabs", async () => {
    renderStudio();

    // Breadcrumb at level 3 (courseId is set)
    expect(screen.getByTestId("studio-breadcrumb")).toBeInTheDocument();

    // Workbench surface is always mounted (even when source tab is active)
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();

    // Right panel has SOURCE and WORKBENCH sub-tabs
    expect(screen.getByText("SOURCE")).toBeInTheDocument();
    expect(screen.getByText("WORKBENCH")).toBeInTheDocument();

    // Source tab is default — viewer pane should be visible
    expect(await screen.findByTestId("studio-material-viewer-pane")).toBeInTheDocument();

    await waitFor(() => {
      expect(getMaterialContentMock).toHaveBeenCalledWith(22);
    });

    const pdfViewer = await screen.findByTestId("material-viewer-pdf");
    expect(pdfViewer).toHaveAttribute("src", "/api/tutor/materials/22/file#toolbar=0&navpanes=0&view=FitH");

    // Switch material via picker
    fireEvent.click(screen.getByTestId("studio-material-picker-11"));

    await waitFor(() => {
      expect(getMaterialContentMock).toHaveBeenCalledWith(11);
    });

    expect(await screen.findByTestId("material-viewer-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent("Worksheet extracted text");
  });

  it("shows empty state when no materials are selected", async () => {
    renderStudio({
      availableMaterials: [],
      selectedMaterialIds: [],
    });

    // Source viewer shows empty guidance text
    expect(await screen.findByText(/Select materials/i)).toBeInTheDocument();
    // Workbench surface still mounted
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(getMaterialContentMock).not.toHaveBeenCalled();
  });

  it("renders L1 class picker when no courseId is provided", () => {
    renderStudio({ courseId: undefined });
    expect(screen.getByTestId("studio-class-picker")).toBeInTheDocument();
  });

  it("renders prep mode when no active session at L3", () => {
    renderStudio({ activeSessionId: null });
    expect(screen.getByTestId("studio-prep-mode")).toBeInTheDocument();
    // Board layout elements should NOT be present
    expect(screen.queryByText("SESSION BOARD")).not.toBeInTheDocument();
  });

  it("honors a shell entry request to land on Studio L2 class detail", () => {
    renderStudio({
      entryRequest: { level: 2, token: 1 },
    });

    expect(screen.getByTestId("studio-class-detail")).toBeInTheDocument();
    expect(screen.getByTestId("studio-breadcrumb")).toHaveTextContent("Level 2");
    expect(screen.queryByTestId("tutor-workspace-surface")).not.toBeInTheDocument();
  });
});
