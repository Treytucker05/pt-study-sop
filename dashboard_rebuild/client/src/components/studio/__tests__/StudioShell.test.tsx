import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect, useState, type ReactNode } from "react";

import {
  StudioShell,
  applyStudioShellPanelPositionUpdate,
  buildStudioShellViewportFocus,
  buildStudioShellPresetLayout,
} from "@/components/studio/StudioShell";

const transformWrapperSpy = vi.fn();
const setTransformSpy = vi.fn();
const scrollIntoViewSpy = vi.fn();
const mockTransformState = {
  scale: 1,
  positionX: 0,
  positionY: 0,
};

const createViewportRect = (width: number, height: number) =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect;

vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({
    children,
    wheel,
    panning,
    onInit,
    onTransformed,
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
    onTransformed?: (
      ref: {
        setTransform: (...args: unknown[]) => void;
        zoomIn: () => void;
        zoomOut: () => void;
        resetTransform: () => void;
      },
      state: {
        scale: number;
        positionX: number;
        positionY: number;
      },
    ) => void;
  }) => {
    let controls: {
      zoomIn: () => void;
      zoomOut: () => void;
      resetTransform: () => void;
      setTransform: (...args: unknown[]) => void;
    };

    const applyTransform = (
      positionX: number,
      positionY: number,
      scale: number,
      duration = 0,
    ) => {
      mockTransformState.positionX = positionX;
      mockTransformState.positionY = positionY;
      mockTransformState.scale = scale;
      setTransformSpy(positionX, positionY, scale, duration);
      onTransformed?.(controls, { ...mockTransformState });
    };

    controls = {
      zoomIn: vi.fn(() =>
        applyTransform(
          mockTransformState.positionX,
          mockTransformState.positionY,
          Math.min(mockTransformState.scale + 0.1, 1.8),
        ),
      ),
      zoomOut: vi.fn(() =>
        applyTransform(
          mockTransformState.positionX,
          mockTransformState.positionY,
          Math.max(mockTransformState.scale - 0.1, 0.45),
        ),
      ),
      resetTransform: vi.fn(() => applyTransform(0, 0, 1)),
      setTransform: (...args: unknown[]) => {
        const [positionX = 0, positionY = 0, scale = 1, duration = 0] = args as [
          number?,
          number?,
          number?,
          number?,
        ];
        applyTransform(positionX, positionY, scale, duration);
      },
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
  beforeEach(() => {
    transformWrapperSpy.mockClear();
    setTransformSpy.mockClear();
    scrollIntoViewSpy.mockClear();
    mockTransformState.scale = 1;
    mockTransformState.positionX = 0;
    mockTransformState.positionY = 0;
  });

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
          excluded: ["workspace-panel-root", "studio-canvas-drag-disabled"],
        }),
      }),
    );
  });

  it("keeps only the surviving workspace panels in the toolbar registry", () => {
    render(
      <StudioShell
        panelLayout={[]}
        setPanelLayout={vi.fn()}
        entryCard={<div>entry</div>}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    expect(
      screen.getByRole("button", { name: /open source shelf panel/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open workspace panel/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open tutor status panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open repair candidates panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open objectives panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open mind map panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open method runner panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open sketch panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open concept map panel/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open vault graph panel/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the wired Obsidian panel content from the toolbar", () => {
    function Harness() {
      const [panelLayout, setPanelLayout] = useState<ReturnType<typeof buildStudioShellPresetLayout>>([]);

      return (
        <StudioShell
          panelLayout={panelLayout}
          setPanelLayout={setPanelLayout}
          tutorPanel={<div>Tutor</div>}
          obsidianPanel={<div data-testid="obsidian-panel-content">obsidian browser</div>}
        />
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /open obsidian panel/i }));

    expect(screen.getByTestId("obsidian-panel-content")).toBeInTheDocument();
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

  it("stops title-bar pointerdown from bubbling into the canvas background handler", async () => {
    const minimalLayout = buildStudioShellPresetLayout("minimal");
    const outerPointerDown = vi.fn();

    render(
      <div onPointerDown={outerPointerDown}>
        <StudioShell
          panelLayout={minimalLayout}
          setPanelLayout={vi.fn()}
          tutorPanel={<div>Tutor</div>}
        />
      </div>,
    );

    const titleBar = screen
      .getByTestId("studio-tutor-panel")
      .querySelector(".workspace-panel-drag-handle");

    expect(titleBar).toBeTruthy();

    fireEvent.pointerDown(titleBar!, {
      pointerId: 7,
      clientX: 200,
      clientY: 120,
    });

    await waitFor(() => {
      expect(screen.getByText("1 Selected")).toBeInTheDocument();
    });

    expect(outerPointerDown).not.toHaveBeenCalled();
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

  it("does not start canvas panning from the entry overlay backdrop outside the card", () => {
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
    const entryOverlay = screen.getByTestId("studio-entry-overlay");

    fireEvent.pointerDown(entryOverlay, {
      pointerId: 11,
      clientX: 24,
      clientY: 24,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 11,
      clientX: 180,
      clientY: 140,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 11,
      clientX: 180,
      clientY: 140,
    });

    expect(setTransformSpy).not.toHaveBeenCalled();
  });

  it("renders the entry overlay as a dark interactive backdrop that blocks wheel and pointer propagation", () => {
    const outerWheel = vi.fn();
    const outerPointerDown = vi.fn();

    render(
      <div onWheel={outerWheel} onPointerDown={outerPointerDown}>
        <StudioShell
          panelLayout={[]}
          setPanelLayout={vi.fn()}
          entryCard={<button type="button">Start Priming</button>}
          tutorPanel={<div>Tutor</div>}
        />
      </div>,
    );

    const entryState = screen.getByTestId("studio-entry-state");
    const entryOverlay = screen.getByTestId("studio-entry-overlay");

    fireEvent.wheel(entryOverlay, { deltaY: 120 });
    fireEvent.pointerDown(entryOverlay, {
      pointerId: 12,
      clientX: 32,
      clientY: 32,
    });

    expect(outerWheel).not.toHaveBeenCalled();
    expect(outerPointerDown).not.toHaveBeenCalled();
    expect(entryOverlay).toHaveClass("pointer-events-auto", "bg-black/70");
    expect(entryState).toHaveClass(
      "border",
      "border-primary/20",
      "bg-black/90",
      "shadow-2xl",
    );
  });

  it("renders the entry-state card as a top-biased fixed viewport overlay outside the transformed canvas layer", () => {
    render(
      <StudioShell
        panelLayout={[]}
        setPanelLayout={vi.fn()}
        entryCard={<button type="button">Start Priming</button>}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const entryState = screen.getByTestId("studio-entry-state");
    const entryOverlay = screen.getByTestId("studio-entry-overlay");
    const studioCanvas = screen.getByTestId("studio-canvas");
    const transformedCanvas = screen.getByTestId("mock-transform-component");

    expect(transformedCanvas).not.toContainElement(entryState);
    expect(studioCanvas).not.toContainElement(entryState);
    expect(document.body).toContainElement(entryOverlay);
    expect(entryOverlay).toHaveStyle({ paddingTop: "max(3rem, 12vh)" });
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
    const memory = byPanel.get("memory");

    expect(documentDock?.position).toEqual({ x: 56, y: 56 });
    expect(workspace?.position.y).toBe(56);
    expect(tutor?.position.y).toBe(56);
    expect((workspace?.position.x || 0)).toBeGreaterThan(documentDock?.position.x || 0);
    expect((tutor?.position.x || 0)).toBeGreaterThan(workspace?.position.x || 0);
    expect(memory?.position.x).toBe(56);
    expect((memory?.position.y || 0)).toBeGreaterThan(tutor?.position.y || 0);
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

  it("remounts panels after Center Windows applies a viewport transform", async () => {
    render(
      <StudioShell
        panelLayout={buildStudioShellPresetLayout("minimal")}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const panelBefore = screen.getByTestId("studio-tutor-panel");

    fireEvent.click(screen.getByRole("button", { name: "Center Windows" }));

    await waitFor(() => {
      expect(screen.getByTestId("studio-tutor-panel")).not.toBe(panelBefore);
    });
  });

  it("preserves the current zoom when the user recenters open panels", () => {
    render(
      <StudioShell
        panelLayout={buildStudioShellPresetLayout("minimal")}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const canvas = screen.getByTestId("studio-canvas");
    const rectSpy = vi
      .spyOn(canvas, "getBoundingClientRect")
      .mockReturnValue(createViewportRect(1600, 900));

    try {
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

      setTransformSpy.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Center Windows" }));

      const centerCall = setTransformSpy.mock.calls.at(-1);
      expect(centerCall).toBeTruthy();
      expect(centerCall?.[2]).toBeCloseTo(1.2);
      expect(centerCall?.[3]).toBe(180);
    } finally {
      rectSpy.mockRestore();
    }
  });

  it("auto-focuses externally requested layouts after the Start Priming delay", async () => {
    vi.useFakeTimers();

    render(
      <StudioShell
        panelLayout={buildStudioShellPresetLayout("priming")}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
        externalLayoutFocusRequestKey={1}
      />,
    );

    const canvas = screen.getByTestId("studio-canvas");
    const rectSpy = vi
      .spyOn(canvas, "getBoundingClientRect")
      .mockReturnValue(createViewportRect(1600, 900));

    try {
      setTransformSpy.mockClear();

      await act(async () => {
        vi.advanceTimersByTime(299);
      });
      expect(setTransformSpy).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      const focusCall = setTransformSpy.mock.calls.at(-1);
      expect(focusCall).toBeTruthy();
      expect(focusCall?.[2]).toBeLessThan(1);
      expect(focusCall?.[3]).toBe(180);
    } finally {
      rectSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("keeps the zoom slider and percentage label in sync with toolbar zoom changes", () => {
    render(
      <StudioShell
        panelLayout={buildStudioShellPresetLayout("minimal")}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const zoomSlider = screen.getByRole("slider", { name: /canvas zoom/i });
    expect(zoomSlider).toHaveValue("1");
    expect(screen.getByText("100%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^zoom in$/i }));

    expect(zoomSlider).toHaveValue("1.1");
    expect(screen.getByText("110%")).toBeInTheDocument();

    fireEvent.change(zoomSlider, { target: { value: "1.45" } });

    expect(setTransformSpy).toHaveBeenLastCalledWith(0, 0, 1.45, 120);
    expect(zoomSlider).toHaveValue("1.45");
    expect(screen.getByText("145%")).toBeInTheDocument();
  });

  it("pans the viewport for panel center/maximize while keeping fit-content and presets on the shared layout updater", () => {
    const setPanelLayout = vi.fn();
    const defaultLayout = buildStudioShellPresetLayout("minimal");
    const resizedLayout = defaultLayout.map((item) =>
      item.panel === "tutor_chat"
        ? {
            ...item,
            size: { width: 520, height: 620 },
          }
        : item,
    );

    const { rerender } = render(
      <StudioShell
        panelLayout={resizedLayout}
        setPanelLayout={setPanelLayout}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const canvas = screen.getByTestId("studio-canvas");
    const rectSpy = vi
      .spyOn(canvas, "getBoundingClientRect")
      .mockReturnValue(createViewportRect(1600, 900));

    try {
      setTransformSpy.mockClear();

      fireEvent.click(screen.getByRole("button", { name: /maximize panel/i }));
      const maximizeUpdater = setPanelLayout.mock.calls.at(-1)?.[0];
      expect(typeof maximizeUpdater).toBe("function");
      const maximizedLayout = maximizeUpdater(resizedLayout);
      const maximizedTutor = maximizedLayout.find(
        (item: { panel: string }) => item.panel === "tutor_chat",
      );
      expect(maximizedTutor?.size).toEqual({ width: 1200, height: 900 });
      expect(maximizedTutor?.position).toEqual(
        resizedLayout.find((item) => item.panel === "tutor_chat")?.position,
      );
      expect(setTransformSpy).toHaveBeenLastCalledWith(144, 0, 1, 180);

      setPanelLayout.mockClear();
      setTransformSpy.mockClear();

      fireEvent.click(screen.getByRole("button", { name: /center panel/i }));
      expect(setPanelLayout).not.toHaveBeenCalled();
      expect(setTransformSpy).toHaveBeenLastCalledWith(484, 0, 1, 180);

      setPanelLayout.mockClear();

      const contentRoot = screen
        .getByTestId("studio-tutor-panel")
        .querySelector('[data-workspace-panel-content="true"]') as HTMLDivElement | null;
      expect(contentRoot).not.toBeNull();
      Object.defineProperty(contentRoot!, "scrollWidth", {
        configurable: true,
        value: 920,
      });
      Object.defineProperty(contentRoot!, "scrollHeight", {
        configurable: true,
        value: 780,
      });

      fireEvent.click(screen.getByRole("button", { name: /fit panel content/i }));
      const fitUpdater = setPanelLayout.mock.calls.at(-1)?.[0];
      expect(typeof fitUpdater).toBe("function");
      const fitLayout = fitUpdater(resizedLayout);
      expect(
        fitLayout.find((item: { panel: string }) => item.panel === "tutor_chat")
          ?.size,
      ).toEqual({ width: 944, height: 844 });

      setPanelLayout.mockClear();

      fireEvent.click(screen.getByRole("button", { name: /panel size presets/i }));
      fireEvent.click(screen.getByRole("button", { name: /wide/i }));
      const presetUpdater = setPanelLayout.mock.calls.at(-1)?.[0];
      expect(typeof presetUpdater).toBe("function");
      const presetLayout = presetUpdater(defaultLayout);
      expect(
        presetLayout.find((item: { panel: string }) => item.panel === "tutor_chat")
          ?.size,
      ).toEqual({ width: 1100, height: 500 });

      rerender(
        <StudioShell
          panelLayout={presetLayout}
          setPanelLayout={setPanelLayout}
          tutorPanel={<div>Tutor</div>}
        />,
      );
    } finally {
      rectSpy.mockRestore();
    }
  });

  it("still refits the layout when the user resets the canvas view", () => {
    const layout = buildStudioShellPresetLayout("minimal");
    const focus = buildStudioShellViewportFocus(layout, 1600, 900);

    render(
      <StudioShell
        panelLayout={layout}
        setPanelLayout={vi.fn()}
        tutorPanel={<div>Tutor</div>}
      />,
    );

    const canvas = screen.getByTestId("studio-canvas");
    const rectSpy = vi
      .spyOn(canvas, "getBoundingClientRect")
      .mockReturnValue(createViewportRect(1600, 900));

    try {
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
      fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

      setTransformSpy.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Reset canvas view" }));

      const resetCall = setTransformSpy.mock.calls.at(-1);
      expect(resetCall).toBeTruthy();
      expect(resetCall?.[2]).toBeCloseTo(focus.scale);
      expect(resetCall?.[3]).toBe(180);
    } finally {
      rectSpy.mockRestore();
    }
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

  it("remounts the panel DOM node when an external layout restore changes its position", async () => {
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

    await waitFor(() => {
      expect(screen.getByTestId("studio-tutor-panel")).not.toBe(panelBefore);
    });

    const panelAfter = screen.getByTestId("studio-tutor-panel");
    expect(panelAfter).not.toBe(panelBefore);
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
        memory={<div>Memory</div>}
      />,
    );

    const tutorTitleBar = screen
      .getByTestId("studio-tutor-panel")
      .querySelector(".workspace-panel-drag-handle");
    const memoryTitleBar = screen
      .getByTestId("studio-memory")
      .querySelector(".workspace-panel-drag-handle");

    expect(tutorTitleBar).toBeTruthy();
    expect(memoryTitleBar).toBeTruthy();

    fireEvent.pointerDown(tutorTitleBar!);
    fireEvent.pointerDown(memoryTitleBar!, { shiftKey: true });

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
    const memory = groupedLayout.find(
      (item: { panel: string }) => item.panel === "memory",
    );

    expect(tutor?.groupId).toBeTruthy();
    expect(memory?.groupId).toBe(tutor?.groupId);

    const setGroupedLayout = vi.fn();
    rerender(
      <StudioShell
        panelLayout={groupedLayout}
        setPanelLayout={setGroupedLayout}
        documentDock={<div>Document Dock</div>}
        workspace={<div>Workspace</div>}
        tutorPanel={<div>Tutor</div>}
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
    const ungroupedMemory = ungroupedLayout.find(
      (item: { panel: string }) => item.panel === "memory",
    );

    expect(ungroupedTutor?.groupId ?? null).toBeNull();
    expect(ungroupedMemory?.groupId ?? null).toBeNull();
  });

  it("moves selected windows together and keeps grouped windows linked", () => {
    const studyLayout = buildStudioShellPresetLayout("study");
    const tutor = studyLayout.find((item) => item.panel === "tutor_chat");
    const memory = studyLayout.find((item) => item.panel === "memory");

    expect(tutor).toBeTruthy();
    expect(memory).toBeTruthy();

    const movedSelection = applyStudioShellPanelPositionUpdate(
      studyLayout,
      tutor!.id,
      {
        x: tutor!.position.x + 120,
        y: tutor!.position.y + 40,
      },
      [tutor!.id, memory!.id],
    );

    const movedTutor = movedSelection.find((item) => item.id === tutor!.id);
    const movedMemory = movedSelection.find((item) => item.id === memory!.id);

    expect(movedTutor?.position).toEqual({
      x: tutor!.position.x + 120,
      y: tutor!.position.y + 40,
    });
    expect(movedMemory?.position).toEqual({
      x: memory!.position.x + 120,
      y: memory!.position.y + 40,
    });

    const groupedLayout = studyLayout.map((item) =>
      item.id === tutor!.id || item.id === memory!.id
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
    const groupedMemory = movedGroup.find((item) => item.id === memory!.id);

    expect(groupedTutor?.position).toEqual({
      x: tutor!.position.x + 80,
      y: tutor!.position.y + 24,
    });
    expect(groupedMemory?.position).toEqual({
      x: memory!.position.x + 80,
      y: memory!.position.y + 24,
    });
  });
});
