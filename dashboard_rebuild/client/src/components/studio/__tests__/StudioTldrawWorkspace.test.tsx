import { useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StudioTldrawWorkspace } from "@/components/studio/StudioTldrawWorkspace";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

const mockTldrawEditor = {
  createShapes: vi.fn().mockReturnThis(),
  updateShapes: vi.fn().mockReturnThis(),
  deleteShapes: vi.fn().mockReturnThis(),
  getCurrentPageShapeIds: vi.fn().mockReturnValue(new Set()),
};
let writeTextMock: ReturnType<typeof vi.fn>;

vi.mock("tldraw", () => ({
  Tldraw: ({
    onMount,
    hideUi,
  }: {
    onMount?: (editor: typeof mockTldrawEditor) => void;
    hideUi?: boolean;
  }) => {
    useEffect(() => {
      onMount?.(mockTldrawEditor);
    }, [onMount]);

    return (
      <div data-testid="mock-tldraw-canvas" data-hide-ui={hideUi ? "true" : "false"}>
        tldraw canvas
      </div>
    );
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function buildPrimingNote(
  overrides: Partial<Extract<StudioWorkspaceObject, { kind: "text_note" }>> = {},
): Extract<StudioWorkspaceObject, { kind: "text_note" }> {
  return {
    id: "priming-note-1",
    kind: "text_note",
    title: "Learning Objectives · Cardiac Output",
    detail: "Explain preload, afterload, stroke volume, and heart rate.",
    badge: "OBJECTIVES",
    provenance: {
      sourceType: "priming_result",
      resultKey: "learning-objectives",
      sourceLabel: "Learning Objectives Primer",
    },
    ...overrides,
  };
}

describe("StudioTldrawWorkspace", () => {
  beforeEach(() => {
    mockTldrawEditor.createShapes.mockReset().mockReturnThis();
    mockTldrawEditor.updateShapes.mockReset().mockReturnThis();
    mockTldrawEditor.deleteShapes.mockReset().mockReturnThis();
    mockTldrawEditor.getCurrentPageShapeIds.mockReset().mockReturnValue(new Set());
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: {
        writeText: async () => undefined,
      },
    });
    writeTextMock = vi.spyOn(window.navigator.clipboard, "writeText").mockResolvedValue(undefined) as unknown as ReturnType<typeof vi.fn>;
  });

  it("lets Workspace priming cards be edited, selected for Tutor and Obsidian, hidden, and deleted", async () => {
    const user = userEvent.setup();
    const onUpdateWorkspaceObject = vi.fn();
    const onDeleteWorkspaceObject = vi.fn();

    render(
      <StudioTldrawWorkspace
        courseName="Cardiovascular Pulmonary"
        canvasObjects={[buildPrimingNote()]}
        currentRunObjects={[]}
        selectedMaterialCount={1}
        promotedPrimeObjectIds={[]}
        onUpdateWorkspaceObject={onUpdateWorkspaceObject}
        onDeleteWorkspaceObject={onDeleteWorkspaceObject}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /include learning objectives .* in tutor context/i,
      }),
    );
    expect(onUpdateWorkspaceObject).toHaveBeenLastCalledWith(
      "priming-note-1",
      expect.objectContaining({
        workspace: expect.objectContaining({ tutorContext: true }),
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /include learning objectives .* in obsidian handoff/i,
      }),
    );
    expect(onUpdateWorkspaceObject).toHaveBeenLastCalledWith(
      "priming-note-1",
      expect.objectContaining({
        workspace: expect.objectContaining({ obsidianHandoff: true }),
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /edit workspace card: learning objectives/i,
      }),
    );
    await user.clear(screen.getByLabelText(/workspace card title/i));
    await user.type(screen.getByLabelText(/workspace card title/i), "Updated Objectives");
    await user.clear(screen.getByLabelText(/workspace card detail/i));
    await user.type(screen.getByLabelText(/workspace card detail/i), "Updated detail");
    await user.click(screen.getByRole("button", { name: /save workspace card/i }));
    expect(onUpdateWorkspaceObject).toHaveBeenLastCalledWith(
      "priming-note-1",
      expect.objectContaining({
        title: "Updated Objectives",
        detail: "Updated detail",
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /hide workspace card: learning objectives/i,
      }),
    );
    expect(onUpdateWorkspaceObject).toHaveBeenLastCalledWith(
      "priming-note-1",
      expect.objectContaining({
        workspace: expect.objectContaining({ hidden: true }),
      }),
    );

    await user.click(
      screen.getByRole("button", {
        name: /delete workspace card: learning objectives/i,
      }),
    );
    expect(onDeleteWorkspaceObject).toHaveBeenCalledWith("priming-note-1");
  });

  it("keeps hidden Workspace cards out of the tldraw canvas sync", async () => {
    render(
      <StudioTldrawWorkspace
        courseName="Cardiovascular Pulmonary"
        canvasObjects={[
          buildPrimingNote({
            workspace: {
              hidden: true,
              tutorContext: true,
              obsidianHandoff: true,
            },
          }),
        ]}
        currentRunObjects={[]}
        selectedMaterialCount={1}
        promotedPrimeObjectIds={[]}
      />,
    );

    expect(screen.getByText("Learning Objectives · Cardiac Output")).toBeInTheDocument();
    await waitFor(() => expect(mockTldrawEditor.createShapes).not.toHaveBeenCalled());
  });

  it("copies selected Obsidian Workspace cards as a markdown handoff packet", async () => {
    render(
      <StudioTldrawWorkspace
        courseName="Cardiovascular Pulmonary"
        canvasObjects={[
          buildPrimingNote({
            workspace: {
              obsidianHandoff: true,
              tutorContext: true,
            },
          }),
        ]}
        currentRunObjects={[]}
        selectedMaterialCount={1}
        promotedPrimeObjectIds={[]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /copy obsidian markdown handoff/i }),
    );

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining("# Obsidian Handoff - Cardiovascular Pulmonary"),
      ),
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("Learning Objectives · Cardiac Output"),
    );
  });
});
