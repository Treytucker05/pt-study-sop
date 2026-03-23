import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MaterialViewerPanel } from "@/components/workspace/MaterialViewerPanel";

// ── Hoisted mocks ───────────────────────────────────────────────────────────

const { getMaterialsMock, getMaterialContentMock } = vi.hoisted(() => ({
  getMaterialsMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
}));

vi.mock("@/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      getMaterialContent: getMaterialContentMock,
      getMaterialFileUrl: (id: number) => `/api/tutor/materials/${id}/file`,
    },
  },
}));

// react-rnd needs DOM measurements jsdom can't provide
vi.mock("react-rnd", () => {
  const React = require("react");
  return {
    Rnd: React.forwardRef(function MockRnd(
      { children, ...rest }: any,
      ref: any,
    ) {
      return (
        <div ref={ref} data-testid="rnd-wrapper" {...rest}>
          {children}
        </div>
      );
    }),
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_MATERIALS = [
  {
    id: 10,
    title: "Lecture 1 Slides",
    file_type: "pptx",
    source_path: "/slides/lec1.pptx",
    folder_path: null,
    file_size: 2048,
    course_id: 1,
    enabled: true,
    extraction_error: null,
    checksum: null,
    created_at: "2025-01-01",
    updated_at: null,
  },
  {
    id: 20,
    title: "Chapter 3 PDF",
    file_type: "pdf",
    source_path: "/docs/ch3.pdf",
    folder_path: null,
    file_size: 4096,
    course_id: 1,
    enabled: true,
    extraction_error: null,
    checksum: null,
    created_at: "2025-01-02",
    updated_at: null,
  },
];

function renderPanel(
  props?: Partial<React.ComponentProps<typeof MaterialViewerPanel>>,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MaterialViewerPanel
        courseId={1}
        selectedMaterialIds={[10, 20]}
        {...props}
      />
    </QueryClientProvider>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("MaterialViewerPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMaterialsMock.mockResolvedValue(MOCK_MATERIALS);
    getMaterialContentMock.mockResolvedValue({
      id: 10,
      title: "Lecture 1 Slides",
      content: "Slide content here",
      char_count: 19,
      extraction_lossy: false,
      replacement_ratio: 0,
    });
  });

  // ── 1. Panel title ──────────────────────────────────────────────────────
  it("renders with panel title 'MATERIALS'", () => {
    renderPanel();
    expect(screen.getByText("MATERIALS")).toBeInTheDocument();
  });

  // ── 2. Material list ────────────────────────────────────────────────────
  it("shows material list when materials are available", async () => {
    renderPanel();
    await waitFor(() => {
      expect(screen.getByText("Lecture 1 Slides")).toBeInTheDocument();
      expect(screen.getByText("Chapter 3 PDF")).toBeInTheDocument();
    });
  });

  // ── 3. Empty state ──────────────────────────────────────────────────────
  it("shows empty state when no materials are selected", async () => {
    getMaterialsMock.mockResolvedValue([]);
    renderPanel({ selectedMaterialIds: [] });
    await waitFor(() => {
      expect(screen.getByText(/no materials selected/i)).toBeInTheDocument();
    });
  });

  // ── 4. Send to Packet ───────────────────────────────────────────────────
  it("Send to Packet button calls onSendToPacket with material reference", async () => {
    const onSendToPacket = vi.fn();
    renderPanel({ onSendToPacket });

    // The first material auto-selects, so "Lecture 1 Slides" appears in
    // both the list button and the viewer header.
    await waitFor(() => {
      expect(screen.getAllByText("Lecture 1 Slides").length).toBeGreaterThanOrEqual(1);
    });

    // Wait for content to load (non-PDF material fetches text content)
    await waitFor(() => {
      expect(screen.getByText("Slide content here")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /send to packet/i }));

    expect(onSendToPacket).toHaveBeenCalledWith({
      type: "material",
      title: "Lecture 1 Slides",
      content: "Slide content here",
    });
  });
});
