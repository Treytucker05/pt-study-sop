import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getFilesMock = vi.fn();
const getFileMock = vi.fn();
const saveFileMock = vi.fn();
const updateSceneMock = vi.fn();
const scrollToContentMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    obsidian: {
      getFiles: (...args: unknown[]) => getFilesMock(...args),
      getFile: (...args: unknown[]) => getFileMock(...args),
      saveFile: (...args: unknown[]) => saveFileMock(...args),
    },
  },
}));

vi.mock("@/components/brain/excalidraw-templates", () => ({
  TEMPLATES: [],
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: ({ excalidrawAPI }: { excalidrawAPI?: (api: unknown) => void }) => {
    const api = {
      getSceneElements: () => [],
      getAppState: () => ({ viewBackgroundColor: "#000", gridSize: 16 }),
      getFiles: () => ({}),
      updateScene: updateSceneMock,
      scrollToContent: scrollToContentMock,
    };
    useEffect(() => {
      excalidrawAPI?.(api);
    }, [excalidrawAPI]);
    return <div data-testid="excalidraw-stage">canvas stage</div>;
  },
  exportToBlob: vi.fn(),
  convertToExcalidrawElements: vi.fn((elements) => elements),
}));

import { ExcalidrawCanvas } from "@/components/brain/ExcalidrawCanvas";

describe("ExcalidrawCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFilesMock.mockResolvedValue({ files: [] });
    getFileMock.mockResolvedValue({
      success: true,
      content: JSON.stringify({ elements: [{ id: "n1" }] }),
    });
    saveFileMock.mockResolvedValue({
      success: true,
      path: "Brain Canvas/Saved Canvas.excalidraw",
    });
  });

  it("opens the load picker and shows the empty-state file list", async () => {
    render(<ExcalidrawCanvas />);

    fireEvent.click(screen.getByRole("button", { name: /load/i }));

    expect(await screen.findByText("LOAD CANVAS")).toBeInTheDocument();
    expect(getFilesMock).toHaveBeenCalledWith("Brain Canvas");
    expect(
      await screen.findByText("No .excalidraw files found in Brain Canvas/"),
    ).toBeInTheDocument();
  });

  it("loads an existing vault file from the picker", async () => {
    getFilesMock.mockResolvedValue({
      files: ["Brain Canvas/Test Diagram.excalidraw"],
    });

    render(<ExcalidrawCanvas />);

    fireEvent.click(screen.getByRole("button", { name: /load/i }));
    const fileButton = await screen.findByRole("button", { name: /test diagram\.excalidraw/i });
    fireEvent.click(fileButton);

    await waitFor(() => {
      expect(getFileMock).toHaveBeenCalledWith("Brain Canvas/Test Diagram.excalidraw");
    });
    expect(updateSceneMock).toHaveBeenCalledWith({ elements: [{ id: "n1" }] });
    expect(scrollToContentMock).toHaveBeenCalled();
  });

  it("disables save until a valid path is provided, then saves the canvas", async () => {
    render(<ExcalidrawCanvas />);

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("SAVE CANVAS")).toBeInTheDocument();

    const pathInput = screen.getByPlaceholderText("Brain Canvas/filename.excalidraw");
    const saveButton = screen.getAllByRole("button", { name: /^save$/i }).at(-1);
    expect(saveButton).toBeDefined();

    fireEvent.change(pathInput, { target: { value: "" } });
    expect(saveButton).toBeDisabled();

    fireEvent.change(pathInput, {
      target: { value: "Brain Canvas/Saved Canvas.excalidraw" },
    });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(saveFileMock).toHaveBeenCalledWith(
        "Brain Canvas/Saved Canvas.excalidraw",
        expect.stringContaining("\"type\": \"excalidraw\""),
      );
    });
  });
});
