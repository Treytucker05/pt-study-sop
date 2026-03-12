import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfigMock = vi.fn();
const getVaultIndexMock = vi.fn();
const getFileMock = vi.fn();
const saveFileMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getConfig: (...args: unknown[]) => getConfigMock(...args),
      getVaultIndex: (...args: unknown[]) => getVaultIndexMock(...args),
      getFile: (...args: unknown[]) => getFileMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
    },
  },
}));

vi.mock("@/components/brain/VaultEditor", () => ({
  VaultEditor: () => <div data-testid="tutor-workspace-notes-tool">notes tool</div>,
}));

vi.mock("@/components/brain/ExcalidrawCanvas", () => ({
  ExcalidrawCanvas: () => <div data-testid="tutor-workspace-canvas-tool">canvas tool</div>,
}));

vi.mock("@/components/brain/GraphPanel", () => ({
  GraphPanel: () => <div data-testid="tutor-workspace-graph-tool">graph tool</div>,
}));

vi.mock("@/components/ComparisonTableEditor", () => ({
  ComparisonTableEditor: () => <div data-testid="tutor-workspace-table-tool">table tool</div>,
}));

import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";

function renderSurface() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TutorWorkspaceSurface />
    </QueryClientProvider>,
  );
}

describe("TutorWorkspaceSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockResolvedValue({ vaultName: "Treys School" });
    getVaultIndexMock.mockResolvedValue({
      paths: {
        "Tutor Note": "Tutor Workspace/Tutor Note.md",
      },
    });
    getFileMock.mockResolvedValue({ success: true, content: "# Note" });
    saveFileMock.mockResolvedValue({ success: true, path: "Tutor Workspace/Tutor Note.md" });
  });

  it("defaults to notes and switches across the Tutor-hosted workspace tools", async () => {
    renderSurface();

    expect(await screen.findByTestId("tutor-workspace-surface")).toBeInTheDocument();
    expect(screen.getByTestId("tutor-workspace-notes-tool")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutor-workspace-tab-canvas"));
    expect(await screen.findByTestId("tutor-workspace-canvas-tool")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutor-workspace-tab-graph"));
    expect(await screen.findByTestId("tutor-workspace-graph-tool")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutor-workspace-tab-table"));
    expect(await screen.findByTestId("tutor-workspace-table-tool")).toBeInTheDocument();
  });
});
