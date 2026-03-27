import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

import {
  StudioShell,
  applyStudioShellPanelPositionUpdate,
  buildStudioShellViewportFocus,
  buildStudioShellPresetLayout,
} from "@/components/studio/StudioShell";

const transformWrapperSpy = vi.fn();
const setTransformSpy = vi.fn();
const scrollIntoViewSpy = vi.fn();

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({
    children,
    wheel,
    panning,
    onInit,
  }: {
    children: (controls: {
      zoomIn: () => void;
      zoomOut: () => void;
      resetTransform: () => void;
      setTransform: (...args: unknown[]) => void;
    }) => ReactNode;
    wheel?: { activationKeys?: string[] };
    panning?: { activationKeys?: string[] };
    onInit?: (ref: {
      setTransform: (...args: unknown[]) => void;
      zoomIn: () => void;
      zoomOut: () => void;
      resetTransform: () => void;
    }) => void;
  }) => {
    const controls = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetTransform: vi.fn(),
      setTransform: setTransformSpy,
    };
    useEffect(() => {
      onInit?.(controls);
    }, [onInit]);
    transformWrapperSpy({ wheel, panning });
    return (
      <div
        data-testid="mock-transform-wrapper"
        data-wheel-keys={(wheel?.activationKeys || []).join(",")}
        data-panning-keys={(panning?.activationKeys || []).join(",")}
      >
        {children(controls)}
      </div>
    );
  },
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-transform-component">{children}</div>
  ),
}));

describe("StudioShell", () => {
  it("scrolls the canvas into view when the user recenters panels", () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    try {
      render(
        <StudioShell
          panelLayout={buildStudioShellPresetLayout("minimal")}
          setPanelLayout={vi.fn()}
          tutorPanel={<div>Tutor</div>}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Center Windows" }));

      expect(scrollIntoViewSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          block: "start",
          behavior: "smooth",
        }),
      );
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      scrollIntoViewSpy.mockReset();
    }
  });

  it("requires Control + wheel to zoom and lets mouse drag pan the canvas", () => {
    transformWrapperSpy.mockClear();

    render(
      <StudioShell
        panelLayout={[]}
        setPanelLayout={vi.fn()}
        entryCard={<div>entry</div>}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const wrapper = screen.getByTestId("mock-transform-wrapper");
    expect(wrapper).toHaveAttribute("data-wheel-keys", "Control");
    expect(wrapper).toHaveAttribute("data-panning-keys", "");
    expect(transformWrapperSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        panning: expect.objectContaining({
          disabled: true,
        }),
      }),
    );
  });

  it("pans only when dragging the empty canvas background", () => {
    setTransformSpy.mockClear();

    const minimalLayout = buildStudioShellPresetLayout("minimal");
    const { container } = render(
      <StudioShell
        panelLayout={minimalLayout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    setTransformSpy.mockClear();

    const canvas = screen.getByTestId("studio-canvas");
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      clientX: 420,
      clientY: 420,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      clientX: 320,
      clientY: 360,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: 320,
      clientY: 360,
    });

    expect(setTransformSpy).toHaveBeenCalledWith(-100, -60, 1, 0);

    setTransformSpy.mockClear();

    const titleBar = container.querySelector(
      '[data-testid="studio-tutor-panel"] .workspace-panel-drag-handle',
    );
    expect(titleBar).toBeTruthy();

    fireEvent.pointerDown(titleBar!, {
      pointerId: 2,
      clientX: 200,
      clientY: 120,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 2,
      clientX: 260,
      clientY: 180,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 2,
      clientX: 260,
      clientY: 180,
    });

    expect(setTransformSpy).not.toHaveBeenCalled();
  });

  it("does not start canvas panning from the entry-state card", () => {
    setTransformSpy.mockClear();

    render(
      <StudioShell
        panelLayout={[]}
        setPanelLayout={vi.fn()}
        entryCard={<button type="button">Start Priming</button>}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const canvas = screen.getByTestId("studio-canvas");
    const entryButton = screen.getByRole("button", { name: "Start Priming" });

    fireEvent.pointerDown(entryButton, {
      pointerId: 3,
      clientX: 240,
      clientY: 180,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 3,
      clientX: 180,
      clientY: 140,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 3,
      clientX: 180,
      clientY: 140,
    });

    expect(setTransformSpy).not.toHaveBeenCalled();
  });

  it("opens the study preset at readable panel sizes", () => {
    const studyLayout = buildStudioShellPresetLayout("study");

    const byPanel = new Map(studyLayout.map((item) => [item.panel, item]));

    expect(byPanel.get("document_dock")?.size.width).toBeGreaterThanOrEqual(800);
    expect(byPanel.get("document_dock")?.size.height).toBeGreaterThanOrEqual(700);
    expect(byPanel.get("workspace")?.size.width).toBeGreaterThanOrEqual(900);
    expect(byPanel.get("workspace")?.size.height).toBeGreaterThanOrEqual(700);
    expect(byPanel.get("tutor_chat")?.size.width).toBeGreaterThanOrEqual(600);
    expect(byPanel.get("tutor_chat")?.size.height).toBeGreaterThanOrEqual(900);
  });

  it("tiles preset panels from the top-left and wraps to the next row", () => {
    const studyLayout = buildStudioShellPresetLayout("study");
    const byPanel = new Map(studyLayout.map((item) => [item.panel, item]));
    const documentDock = byPanel.get("document_dock");
    const workspace = byPanel.get("workspace");
    const tutor = byPanel.get("tutor_chat");
    const status = byPanel.get("tutor_status");
    const memory = byPanel.get("memory");

    expect(documentDock?.position).toEqual({ x: 56, y: 56 });
    expect(workspace?.position.y).toBe(56);
    expect(tutor?.position.y).toBe(56);
    expect((workspace?.position.x || 0)).toBeGreaterThan(documentDock?.position.x || 0);
    expect((tutor?.position.x || 0)).toBeGreaterThan(workspace?.position.x || 0);
    expect(status?.position.x).toBe(56);
    expect((status?.position.y || 0)).toBeGreaterThan(tutor?.position.y || 0);
    expect(memory?.position.y).toBe(status?.position.y);
    expect((memory?.position.x || 0)).toBeGreaterThan(status?.position.x || 0);
  });

  it("computes a top-anchored focus transform for open panels", () => {
    const layout = buildStudioShellPresetLayout("minimal");
    const focus = buildStudioShellViewportFocus(layout, 1600, 900);
    const tutor = layout[0];
    const topEdge = tutor.position.y * focus.scale + focus.positionY;
    const leftEdge = tutor.position.x * focus.scale + focus.positionX;
    const rightEdge =
      (tutor.position.x + tutor.size.width) * focus.scale + focus.positionX;

    expect(topEdge).toBeGreaterThanOrEqual(40);
    expect(topEdge).toBeLessThanOrEqual(80);
    expect(leftEdge).toBeGreaterThan(0);
    expect(rightEdge).toBeLessThan(1600);
  });

  it("lets the user recenter open panels toward the top of the canvas", () => {
    render(
      <StudioShell
        panelLayout={buildStudioShellPresetLayout("minimal")}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Center Windows" }));

    expect(setTransformSpy).toHaveBeenCalled();
  });

  it("opens newly spawned panels to the right before wrapping to a new row", () => {
    const setPanelLayout = vi.fn();
    const minimalLayout = buildStudioShellPresetLayout("minimal");

    render(
      <StudioShell
        panelLayout={minimalLayout}
        setPanelLayout={setPanelLayout}
        tutorPanel={<div>Tutor</div>}
        memory={<div>Memory</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open memory panel/i }));

    const updater = setPanelLayout.mock.calls.at(-1)?.[0];
    expect(typeof updater).toBe("function");

    const nextLayout = updater(minimalLayout);
    const tutor = nextLayout.find((item: { panel: string }) => item.panel === "tutor_chat");
    const memory = nextLayout.find((item: { panel: string }) => item.panel === "memory");

    expect(memory?.position.y).toBe(tutor?.position.y);
    expect((memory?.position.x || 0)).toBeGreaterThan(tutor?.position.x || 0);
  });

  it("preserves the same panel DOM node when position changes", () => {
    const minimalLayout = buildStudioShellPresetLayout("minimal");
    const movedLayout = minimalLayout.map((item) =>
      item.panel === "tutor_chat"
        ? {
            ...item,
            position: {
              x: item.position.x + 120,
              y: item.position.y + 40,
            },
          }
        : item,
    );

    const { rerender } = render(
      <StudioShell
        panelLayout={minimalLayout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const panelBefore = screen.getByTestId("studio-tutor-panel");

    rerender(
      <StudioShell
        panelLayout={movedLayout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const panelAfter = screen.getByTestId("studio-tutor-panel");
    expect(panelAfter).toBe(panelBefore);
  });

  it("does not recenter the canvas when a panel position updates", () => {
    const minimalLayout = buildStudioShellPresetLayout("minimal");
    const movedLayout = minimalLayout.map((item) =>
      item.panel === "tutor_chat"
        ? {
            ...item,
            position: {
              x: item.position.x + 160,
              y: item.position.y,
            },
          }
        : item,
    );

    const { rerender } = render(
      <StudioShell
        panelLayout={minimalLayout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    setTransformSpy.mockClear();

    rerender(
      <StudioShell
        panelLayout={movedLayout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    expect(setTransformSpy).not.toHaveBeenCalled();
  });

  it("shows a Mind Map toolbar button and spawns the Mind Map panel from the registry", () => {
    const setPanelLayout = vi.fn();

    render(
      <StudioShell
        panelLayout={[]}
        setPanelLayout={setPanelLayout}
        entryCard={<div>entry</div>}
        tutorPanel={<div>Tutor</div>}
        mindMapPanel={<div data-testid="mind-map-view">Mind Map View</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open mind map panel/i }));

    const updater = setPanelLayout.mock.calls.at(-1)?.[0];
    expect(typeof updater).toBe("function");

    const nextLayout = updater([]);
    expect(nextLayout).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          panel: "mind_map",
        }),
      ]),
    );
  });

  it("lets the user group and ungroup selected windows from the toolbar", async () => {
    const setPanelLayout = vi.fn();
    const studyLayout = buildStudioShellPresetLayout("study");
    const { rerender } = render(
      <StudioShell
        panelLayout={studyLayout}
        setPanelLayout={setPanelLayout}
        documentDock={<div>Document Dock</div>}
        workspace={<div>Workspace</div>}
        tutorPanel={<div>Tutor</div>}
        tutorStatus={<div>Tutor Status</div>}
        memory={<div>Memory</div>}
      />,
    );

    const tutorTitleBar = screen
      .getByTestId("studio-tutor-panel")
      .querySelector(".workspace-panel-drag-handle");
    const statusTitleBar = screen
      .getByTestId("studio-tutor-status")
      .querySelector(".workspace-panel-drag-handle");

    expect(tutorTitleBar).toBeTruthy();
    expect(statusTitleBar).toBeTruthy();

    fireEvent.pointerDown(tutorTitleBar!);
    fireEvent.pointerDown(statusTitleBar!, { shiftKey: true });

    await waitFor(() => {
      expect(screen.getByText("2 Selected")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Group selected windows" }));

    const groupUpdater = setPanelLayout.mock.calls.at(-1)?.[0];
    expect(typeof groupUpdater).toBe("function");

    const groupedLayout = groupUpdater(studyLayout);
    const tutor = groupedLayout.find(
      (item: { panel: string }) => item.panel === "tutor_chat",
    );
    const status = groupedLayout.find(
      (item: { panel: string }) => item.panel === "tutor_status",
    );

    expect(tutor?.groupId).toBeTruthy();
    expect(status?.groupId).toBe(tutor?.groupId);

    const setGroupedLayout = vi.fn();
    rerender(
      <StudioShell
        panelLayout={groupedLayout}
        setPanelLayout={setGroupedLayout}
        documentDock={<div>Document Dock</div>}
        workspace={<div>Workspace</div>}
        tutorPanel={<div>Tutor</div>}
        tutorStatus={<div>Tutor Status</div>}
        memory={<div>Memory</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ungroup selected windows" }));

    const ungroupUpdater = setGroupedLayout.mock.calls.at(-1)?.[0];
    expect(typeof ungroupUpdater).toBe("function");

    const ungroupedLayout = ungroupUpdater(groupedLayout);
    const ungroupedTutor = ungroupedLayout.find(
      (item: { panel: string }) => item.panel === "tutor_chat",
    );
    const ungroupedStatus = ungroupedLayout.find(
      (item: { panel: string }) => item.panel === "tutor_status",
    );

    expect(ungroupedTutor?.groupId ?? null).toBeNull();
    expect(ungroupedStatus?.groupId ?? null).toBeNull();
  });

  it("moves selected windows together and keeps grouped windows linked", () => {
    const studyLayout = buildStudioShellPresetLayout("study");
    const tutor = studyLayout.find((item) => item.panel === "tutor_chat");
    const status = studyLayout.find((item) => item.panel === "tutor_status");

    expect(tutor).toBeTruthy();
    expect(status).toBeTruthy();

    const movedSelection = applyStudioShellPanelPositionUpdate(
      studyLayout,
      tutor!.id,
      {
        x: tutor!.position.x + 120,
        y: tutor!.position.y + 40,
      },
      [tutor!.id, status!.id],
    );

    const movedTutor = movedSelection.find((item) => item.id === tutor!.id);
    const movedStatus = movedSelection.find((item) => item.id === status!.id);

    expect(movedTutor?.position).toEqual({
      x: tutor!.position.x + 120,
      y: tutor!.position.y + 40,
    });
    expect(movedStatus?.position).toEqual({
      x: status!.position.x + 120,
      y: status!.position.y + 40,
    });

    const groupedLayout = studyLayout.map((item) =>
      item.id === tutor!.id || item.id === status!.id
        ? { ...item, groupId: "group-7" }
        : item,
    );

    const movedGroup = applyStudioShellPanelPositionUpdate(
      groupedLayout,
      tutor!.id,
      {
        x: tutor!.position.x + 80,
        y: tutor!.position.y + 24,
      },
      [tutor!.id],
    );

    const groupedTutor = movedGroup.find((item) => item.id === tutor!.id);
    const groupedStatus = movedGroup.find((item) => item.id === status!.id);

    expect(groupedTutor?.position).toEqual({
      x: tutor!.position.x + 80,
      y: tutor!.position.y + 24,
    });
    expect(groupedStatus?.position).toEqual({
      x: status!.position.x + 80,
      y: status!.position.y + 24,
    });
  });
});
