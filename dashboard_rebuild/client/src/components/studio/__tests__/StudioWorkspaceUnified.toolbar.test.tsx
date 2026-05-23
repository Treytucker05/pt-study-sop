import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StudioWorkspaceUnified } from "@/components/studio/StudioWorkspaceUnified";

vi.mock("@/components/studio/StudioTldrawWorkspaceLazy", () => ({
  StudioTldrawWorkspaceLazy: () => (
    <div data-testid="studio-tldraw-workspace">canvas</div>
  ),
}));

vi.mock("@/components/MindMapView", () => ({
  MindMapView: () => <div data-testid="mock-mind-map">mind map</div>,
}));

vi.mock("@/components/brain/ConceptMapStructured", () => ({
  ConceptMapStructured: () => <div data-testid="mock-concept-map">concept map</div>,
}));

describe("StudioWorkspaceUnified toolbar", () => {
  it("uses workspace tools instead of canvas/mind/concept tabs", () => {
    render(
      <StudioWorkspaceUnified
        canvasObjects={[]}
        courseId={1}
        courseName="Test Course"
      />,
    );

    expect(screen.getByTestId("studio-workspace-unified")).toHaveAttribute(
      "data-workspace-tool",
      "select",
    );
    expect(screen.getByTestId("studio-workspace-toolbar")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-workspace-unified-tabs")).not.toBeInTheDocument();
    expect(screen.getByTestId("studio-workspace-tool-select")).toBeInTheDocument();
    expect(screen.getByTestId("studio-workspace-tool-mind-map")).toBeInTheDocument();
    expect(screen.getByTestId("studio-workspace-tool-concept-map")).toBeInTheDocument();
  });

  it("activates mind map and concept map from the toolbar", async () => {
    const user = userEvent.setup();

    render(
      <StudioWorkspaceUnified
        canvasObjects={[]}
        courseId={1}
        courseName="Test Course"
      />,
    );

    await user.click(screen.getByTestId("studio-workspace-tool-mind-map"));
    expect(screen.getByTestId("studio-workspace-unified")).toHaveAttribute(
      "data-workspace-tool",
      "mind-map",
    );
    expect(await screen.findByTestId("mock-mind-map")).toBeInTheDocument();

    await user.click(screen.getByTestId("studio-workspace-tool-concept-map"));
    expect(screen.getByTestId("studio-workspace-unified")).toHaveAttribute(
      "data-workspace-tool",
      "concept-map",
    );
    expect(await screen.findByTestId("mock-concept-map")).toBeInTheDocument();
  });

  it("maps legacy workspace tab requests to select tool", async () => {
    render(
      <StudioWorkspaceUnified
        canvasObjects={[]}
        courseId={1}
        courseName="Test Course"
        workspaceTabRequest={{ tab: "canvas", requestKey: 1 }}
      />,
    );

    expect(screen.getByTestId("studio-workspace-unified")).toHaveAttribute(
      "data-workspace-tool",
      "select",
    );
    expect(screen.getByTestId("studio-tldraw-workspace")).toBeInTheDocument();
  });
});
