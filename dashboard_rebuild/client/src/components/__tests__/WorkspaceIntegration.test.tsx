import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceCanvas, type WorkspaceCanvasProps } from "@/components/WorkspaceCanvas";

// ── Mocks ──────────────────────────────────────────────────────────────

// react-rnd uses DOM measurements that jsdom can't handle
vi.mock("react-rnd", () => {
  const React = require("react");
  return {
    Rnd: React.forwardRef(function MockRnd(
      {
        children,
        className,
        default: _default,
        minWidth: _mw,
        minHeight: _mh,
        dragHandleClassName: _dhc,
        enableResizing: _er,
        onDragStop: _ods,
        onResizeStop: _ors,
        ...rest
      }: any,
      ref: any,
    ) {
      return (
        <div ref={ref} data-testid="rnd-wrapper" className={className} {...rest}>
          {children}
        </div>
      );
    }),
  };
});

// react-zoom-pan-pinch wraps content in a transform container
vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TransformComponent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useControls: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), resetTransform: vi.fn() }),
}));

const { getMaterialsMock, getMethodBlocksMock, getMaterialContentMock, getTemplatePromptMock } = vi.hoisted(() => ({
  getMaterialsMock: vi.fn(),
  getMethodBlocksMock: vi.fn(),
  getMaterialContentMock: vi.fn(),
  getTemplatePromptMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      getMethodBlocks: getMethodBlocksMock,
      getMaterialContent: getMaterialContentMock,
      getMaterialFileUrl: (id: number) => `/api/tutor/materials/${id}/file`,
    },
    methods: {
      getTemplatePrompt: getTemplatePromptMock,
    },
  },
}));

// Mock the lazy-loaded heavy tool components
vi.mock("@/components/brain/ExcalidrawCanvas", () => ({
  ExcalidrawCanvas: () => <div data-testid="excalidraw-canvas">Excalidraw</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="concept-map">Concept Map</div>,
}));

vi.mock("@/components/VaultGraphView", () => ({
  VaultGraphView: () => <div data-testid="vault-graph">Vault Graph</div>,
}));

vi.mock("@/components/MindMapView", () => ({
  MindMapView: () => <div data-testid="mind-map">Mind Map</div>,
}));

vi.mock("@/components/workspace/TutorChatPanel", () => ({
  TutorChatPanel: () => <div data-testid="tutor-chat-panel">tutor chat content</div>,
}));

vi.mock("@/components/workspace/FlaggedRepliesPanel", () => ({
  FlaggedRepliesPanel: () => <div data-testid="flagged-replies-panel">Flagged</div>,
}));

vi.mock("@/components/workspace/PolishAssistPanel", () => ({
  PolishAssistPanel: () => <div data-testid="polish-assist-panel">Polish</div>,
}));

vi.mock("@/components/workspace/AnkiPanel", () => ({
  AnkiPanel: () => <div data-testid="anki-panel">Anki</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/lib/workspacePanelPopout", () => ({
  openPanelPopoutWindow: vi.fn(),
  createPanelPopoutTransport: vi.fn(() => ({
    subscribe: vi.fn(),
    close: vi.fn(),
  })),
  panelChannelName: vi.fn((id: string) => `panel-${id}`),
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

// ── Helpers ────────────────────────────────────────────────────────────

function renderCanvas(overrides: Partial<WorkspaceCanvasProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const defaultProps: WorkspaceCanvasProps = {
    courseId: 4,
    selectedMaterialIds: [],
    ...overrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceCanvas {...defaultProps} />
    </QueryClientProvider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("WorkspaceIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMaterialsMock.mockResolvedValue([]);
    getMethodBlocksMock.mockResolvedValue([]);
    getMaterialContentMock.mockResolvedValue({ content: "" });
    getTemplatePromptMock.mockResolvedValue({ facilitation_prompt: "output" });
  });

  // ── TEST 1: Start Tutor creates session ──────────────────────────────
  // WorkspaceCanvas does not own the Start Tutor button directly; that
  // lives in TutorWorkflowPrimingPanel. Here we verify that when a
  // parent provides an onStartTutorSession-equivalent callback via the
  // mode prop, the canvas transitions correctly (tutor-chat panel spawns).
  // We validate the integration by asserting mode="tutor" triggers the
  // tutor-chat panel spawn, which is how sessions start on the canvas.
  it("mode=tutor spawns a tutor-chat panel (session start integration)", () => {
    renderCanvas({ mode: "tutor" });

    // The Tutor Chat panel content should be rendered
    expect(screen.getByTestId("tutor-chat-panel")).toBeInTheDocument();
    // The panel title bar renders "Tutor Chat" (also appears in add-menu)
    const tutorChatLabels = screen.getAllByText("Tutor Chat");
    expect(tutorChatLabels.length).toBeGreaterThanOrEqual(1);
  });

  // ── TEST 2: Default panels spawn on mount ────────────────────────────
  it("spawns default panels (Material Viewer, Method Runner, Packet) on mount", () => {
    renderCanvas();

    // Default layout includes these 3 panels
    expect(screen.getByText("Material Viewer")).toBeInTheDocument();
    expect(screen.getByText("Method Runner")).toBeInTheDocument();
    expect(screen.getByText("Packet")).toBeInTheDocument();
  });

  // ── TEST 3: Mode switch to tutor spawns chat panel ───────────────────
  it("spawns Tutor Chat panel when mode switches to tutor", () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <WorkspaceCanvas courseId={4} selectedMaterialIds={[]} mode="prep" />
      </QueryClientProvider>,
    );

    // No tutor chat panel content in prep mode
    expect(screen.queryByTestId("tutor-chat-panel")).not.toBeInTheDocument();

    // Switch to tutor mode
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <WorkspaceCanvas courseId={4} selectedMaterialIds={[]} mode="tutor" />
      </QueryClientProvider>,
    );

    // Tutor Chat panel should now be present
    expect(screen.getByTestId("tutor-chat-panel")).toBeInTheDocument();
  });

  // ── TEST 4: Send to Packet from Method Runner ─────────────────────────
  it("shows Send to Packet button in Method Runner after selecting a block", async () => {
    const addToPacket = vi.fn();
    getMethodBlocksMock.mockResolvedValue([
      {
        id: 101,
        name: "Active Recall",
        category: "retrieve",
        description: "Test yourself",
        default_duration_min: 10,
        energy_cost: "medium",
        best_stage: "encoding",
        tags: [],
        evidence: null,
        facilitation_prompt: "Recall the key points",
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    renderCanvas({ addToPacket });

    // Wait for method blocks to load and click the block
    const blockButton = await screen.findByText("Active Recall");
    fireEvent.click(blockButton);

    // After selecting a block, the "Send to Packet" button appears
    await waitFor(() => {
      expect(screen.getByText("Send to Packet")).toBeInTheDocument();
    });
  });

  // ── TEST 5: Empty Packet shows guidance message ──────────────────────
  it("shows empty packet guidance when no items are in the packet", () => {
    renderCanvas({ packetItems: [] });

    // The Packet panel renders an empty state with guidance text
    expect(screen.getByText("Packet is empty")).toBeInTheDocument();
    expect(screen.getByText(/Send materials or methods here/)).toBeInTheDocument();
  });
});
