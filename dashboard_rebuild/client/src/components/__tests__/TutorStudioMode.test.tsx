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
} = vi.hoisted(() => ({
  restoreStudioItemsMock: vi.fn(),
  promoteStudioItemMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
  getMaterialFileUrlMock: vi.fn((id: number) => `/api/tutor/materials/${id}/file`),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      restoreStudioItems: restoreStudioItemsMock,
      promoteStudioItem: promoteStudioItemMock,
      getMaterialContent: getMaterialContentMock,
      getMaterialFileUrl: getMaterialFileUrlMock,
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

  it("renders a live MaterialViewer pane from selected materials while keeping the workbench shell active", async () => {
    renderStudio();

    expect(await screen.findByTestId("studio-material-viewer-pane")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(screen.getByText("SUMMARY BOARD")).toBeInTheDocument();
    expect(screen.getByText("WORKBENCH")).toBeInTheDocument();

    await waitFor(() => {
      expect(getMaterialContentMock).toHaveBeenCalledWith(22);
    });

    const pdfViewer = await screen.findByTestId("material-viewer-pdf");
    expect(pdfViewer).toHaveAttribute("src", "/api/tutor/materials/22/file#toolbar=0&navpanes=0&view=FitH");

    fireEvent.click(screen.getByTestId("studio-material-picker-11"));

    await waitFor(() => {
      expect(getMaterialContentMock).toHaveBeenCalledWith(11);
    });

    expect(await screen.findByTestId("material-viewer-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("material-viewer-text-preview")).toHaveTextContent("Worksheet extracted text");
  });

  it("shows a Studio source empty state when no Tutor materials are selected", async () => {
    renderStudio({
      availableMaterials: [],
      selectedMaterialIds: [],
    });

    expect(await screen.findByText("NO SELECTED SOURCES")).toBeInTheDocument();
    expect(screen.getByText("SOURCE VIEWER READY")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(getMaterialContentMock).not.toHaveBeenCalled();
  });
});
