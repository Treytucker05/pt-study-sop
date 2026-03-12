import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfigMock = vi.fn();
const getVaultIndexMock = vi.fn();
const getFileMock = vi.fn();
const saveFileMock = vi.fn();
const getFilesMock = vi.fn();
const appendMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getConfig: (...args: unknown[]) => getConfigMock(...args),
      getVaultIndex: (...args: unknown[]) => getVaultIndexMock(...args),
      getFile: (...args: unknown[]) => getFileMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
      getFiles: (...args: unknown[]) => getFilesMock(...args),
      append: (...args: unknown[]) => appendMock(...args),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/brain/UnifiedBrainCanvas", () => ({
  UnifiedBrainCanvas: () => <div data-testid="unified-brain-canvas">graph ready</div>,
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({ excalidrawAPI }: { excalidrawAPI?: (api: unknown) => void }) => {
    const api = {
      getSceneElements: () => [],
      getAppState: () => ({ viewBackgroundColor: "#000", gridSize: 16 }),
      getFiles: () => ({}),
      updateScene: vi.fn(),
      scrollToContent: vi.fn(),
    };
    useEffect(() => {
      excalidrawAPI?.(api);
    }, [excalidrawAPI]);
    return <div data-testid="excalidraw-stage">canvas stage</div>;
  },
  exportToBlob: vi.fn(),
  convertToExcalidrawElements: vi.fn((elements) => elements),
}));

import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";

function renderSurface() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <TutorWorkspaceSurface />
    </QueryClientProvider>,
  );
}

describe("TutorWorkspaceSurface integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Workspace/Tutor Note.md": "Tutor Workspace/Tutor Note.md",
      },
    });
    getFileMock.mockResolvedValue({ success: true, content: "# Tutor note body" });
    saveFileMock.mockResolvedValue({ success: true, path: "Tutor Workspace/Tutor Note.md" });
    getFilesMock.mockResolvedValue({ files: [] });
    appendMock.mockResolvedValue({ success: true });
    window.open = vi.fn();
  });

  it("opens a real workspace note through the Tutor-hosted notes flow", async () => {
    renderSurface();

    expect(await screen.findByTestId("tutor-workspace-surface")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /tutor note\.md/i }));

    expect(await screen.findByDisplayValue("# Tutor note body")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("# Tutor note body"), {
      target: { value: "# Tutor note body\n\nUpdated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(saveFileMock).toHaveBeenCalledWith(
        "Tutor Workspace/Tutor Note.md",
        "# Tutor note body\n\nUpdated",
      );
    });
  });

  it("mounts the real canvas shell with save and load entry points", async () => {
    renderSurface();

    fireEvent.click(await screen.findByTestId("tutor-workspace-tab-canvas"));

    expect(await screen.findByTestId("excalidraw-stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load/i })).toBeInTheDocument();
  });

  it("mounts the real graph and table surfaces under Tutor ownership", async () => {
    renderSurface();

    fireEvent.click(await screen.findByTestId("tutor-workspace-tab-graph"));
    expect(await screen.findByTestId("graph-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("unified-brain-canvas")).toHaveTextContent("graph ready");
    expect(screen.queryByTestId("graph-panel-error")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutor-workspace-tab-table"));
    expect(await screen.findByDisplayValue("Untitled Comparison")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeInTheDocument();
  });
});
