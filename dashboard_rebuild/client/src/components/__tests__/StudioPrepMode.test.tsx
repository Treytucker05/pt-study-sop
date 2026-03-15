import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioPrepMode } from "@/components/StudioPrepMode";
import type { TutorWorkspaceSurfaceHandle } from "@/components/TutorWorkspaceSurface";
import type { Material } from "@/lib/api";

const { getOneMock, getMaterialFileUrlMock } = vi.hoisted(() => ({
  getOneMock: vi.fn(),
  getMaterialFileUrlMock: vi.fn((id: number) => `/api/tutor/materials/${id}/file`),
}));

vi.mock("@/lib/api", () => ({
  api: {
    chains: { getOne: getOneMock },
    tutor: { getMaterialFileUrl: getMaterialFileUrlMock },
  },
}));

vi.mock("@/components/TutorWorkspaceSurface", () => ({
  TutorWorkspaceSurface: () => <div data-testid="tutor-workspace-surface">workspace surface</div>,
}));

vi.mock("@/components/MaterialViewer", () => ({
  MaterialViewer: ({ source }: { source: { title: string } }) => (
    <div data-testid="material-viewer">{source.title}</div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const MOCK_MATERIALS: Material[] = [
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
];

const MOCK_CHAIN_EXPANDED = {
  id: 1,
  name: "Top-Down Narrative",
  description: "Narrative-based chain",
  block_ids: [100, 200],
  context_tags: {},
  created_at: "2026-01-01T00:00:00Z",
  is_template: 1,
  blocks: [
    {
      id: 100,
      name: "Big Picture Map",
      control_stage: "PRIME",
      category: "prepare",
      description: "Create overview map",
      default_duration_min: 10,
      energy_cost: "medium",
      best_stage: "priming",
      tags: [],
      evidence: null,
      facilitation_prompt: "Start by mapping the big picture...",
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: 200,
      name: "Narrative Weave",
      control_stage: "ENCODE",
      category: "encode",
      description: "Weave narrative connections",
      default_duration_min: 15,
      energy_cost: "high",
      best_stage: "encoding",
      tags: [],
      evidence: null,
      facilitation_prompt: "Now weave the narrative threads...",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
};

function renderPrep(props?: Partial<React.ComponentProps<typeof StudioPrepMode>>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const ref = createRef<TutorWorkspaceSurfaceHandle>();

  return render(
    <QueryClientProvider client={queryClient}>
      <StudioPrepMode
        chainId={1}
        availableMaterials={MOCK_MATERIALS}
        viewerMaterial={MOCK_MATERIALS[0]}
        viewerMaterialContent={{
          id: 11,
          title: "Worksheet",
          source_path: "worksheet.docx",
          file_type: "docx",
          content: "Worksheet extracted text",
          char_count: 96,
          extraction_lossy: false,
          replacement_ratio: 0,
        }}
        viewerMaterialLoading={false}
        onSelectMaterial={vi.fn()}
        onOpenMaterialPopout={vi.fn()}
        onOpenWorkbenchPopout={vi.fn()}
        onLaunchSession={vi.fn()}
        workspaceSurfaceRef={ref}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("StudioPrepMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOneMock.mockResolvedValue(MOCK_CHAIN_EXPANDED);
  });

  it("renders chain blocks and allows step selection", async () => {
    renderPrep();

    // Wait for chain data to load
    expect(await screen.findByText("Big Picture Map")).toBeInTheDocument();
    expect(screen.getByText("Narrative Weave")).toBeInTheDocument();

    // Chain name shown in header
    expect(screen.getByText("Top-Down Narrative")).toBeInTheDocument();

    // Click a step to see facilitation prompt
    fireEvent.click(screen.getByTestId("prep-step-100"));
    expect(await screen.findByText(/Start by mapping the big picture/)).toBeInTheDocument();
  });

  it("shows empty state when no chain selected", () => {
    renderPrep({ chainId: undefined });
    expect(screen.getByText("NO CHAIN SELECTED")).toBeInTheDocument();
    expect(screen.getByText("OPEN START PANEL")).toBeInTheDocument();
  });

  it("renders launch session button", async () => {
    const onLaunchSession = vi.fn();
    renderPrep({ onLaunchSession });

    // Wait for blocks to load
    await screen.findByText("Big Picture Map");

    fireEvent.click(screen.getByTestId("prep-launch-session"));
    expect(onLaunchSession).toHaveBeenCalledOnce();
  });

  it("renders material viewer and workbench tabs", async () => {
    renderPrep();

    // Wait for chain data
    await screen.findByText("Big Picture Map");

    // MATERIAL and WORKBENCH tabs present
    expect(screen.getByText("MATERIAL")).toBeInTheDocument();
    expect(screen.getByText("WORKBENCH")).toBeInTheDocument();

    // Material viewer visible by default
    expect(screen.getByTestId("material-viewer")).toBeInTheDocument();

    // Workbench surface always mounted
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();
  });

  it("switches between material and workbench tabs", async () => {
    renderPrep();
    await screen.findByText("Big Picture Map");

    // Switch to workbench
    fireEvent.click(screen.getByText("WORKBENCH"));
    expect(screen.getByTestId("tutor-workspace-surface")).toBeInTheDocument();

    // Switch back to material
    fireEvent.click(screen.getByText("MATERIAL"));
    expect(screen.getByTestId("material-viewer")).toBeInTheDocument();
  });

  it("shows material picker sidebar with all available materials", async () => {
    renderPrep();
    await screen.findByText("Big Picture Map");

    expect(screen.getByTestId("prep-material-picker-11")).toBeInTheDocument();
    expect(screen.getByTestId("prep-material-picker-22")).toBeInTheDocument();
  });

  it("calls onSelectMaterial when material picker item clicked", async () => {
    const onSelectMaterial = vi.fn();
    renderPrep({ onSelectMaterial });
    await screen.findByText("Big Picture Map");

    fireEvent.click(screen.getByTestId("prep-material-picker-22"));
    expect(onSelectMaterial).toHaveBeenCalledWith(22);
  });

  it("shows empty material guidance when no materials available", async () => {
    renderPrep({ availableMaterials: [], viewerMaterial: null, viewerMaterialContent: undefined });
    await waitFor(() => {
      expect(screen.getByText(/Choose materials/i)).toBeInTheDocument();
    });
  });

  it("toggles facilitation prompt on step click", async () => {
    renderPrep();
    await screen.findByText("Big Picture Map");

    // Click step 1 to show prompt
    fireEvent.click(screen.getByTestId("prep-step-100"));
    expect(await screen.findByText(/Start by mapping the big picture/)).toBeInTheDocument();

    // Click step 2 to switch
    fireEvent.click(screen.getByTestId("prep-step-200"));
    expect(await screen.findByText(/Now weave the narrative threads/)).toBeInTheDocument();
    expect(screen.queryByText(/Start by mapping the big picture/)).not.toBeInTheDocument();

    // Click step 2 again to deselect
    fireEvent.click(screen.getByTestId("prep-step-200"));
    expect(screen.queryByText(/Now weave the narrative threads/)).not.toBeInTheDocument();
  });
});
