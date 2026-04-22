import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Rnd } from "react-rnd";
import {
  Crosshair,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Rows3,
  ScanSearch,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const WORKSPACE_PANEL_SIZE_PRESETS = {
  small: { label: "Small", width: 360, height: 400 },
  medium: { label: "Medium", width: 560, height: 640 },
  large: { label: "Large", width: 840, height: 760 },
  wide: { label: "Wide", width: 1100, height: 500 },
} as const;

export type WorkspacePanelSizePresetKey =
  keyof typeof WORKSPACE_PANEL_SIZE_PRESETS;

export interface WorkspacePanelProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  position?: { x: number; y: number };
  positionResetToken?: string | number;
  size?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  collapsed?: boolean;
  isPoppedOut?: boolean;
  dataTestId?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onClose?: () => void;
  onPopOut?: () => void;
  onSendBack?: () => void;
  onTitlePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onMaximize?: () => void;
  onFitContent?: () => void;
  onCenter?: () => void;
  onSizePresetSelect?: (preset: WorkspacePanelSizePresetKey) => void;
  className?: string;
  style?: CSSProperties;
  scale?: number;
  selected?: boolean;
  grouped?: boolean;
  defaultCollapsed?: boolean;
}

const TITLE_BAR_CLASSES =
  "flex items-center justify-between px-3 py-2 bg-[linear-gradient(180deg,rgba(255,110,140,0.18),rgba(18,6,12,0.92))] border-b border-primary/25 select-none cursor-move shadow-[inset_0_-1px_0_rgba(255,120,146,0.14)]";

const TITLE_TEXT_CLASSES =
  "font-terminal text-sm tracking-wider text-primary/80 uppercase truncate";

const BTN_CLASSES =
  "inline-flex items-center justify-center w-6 h-6 rounded-sm text-primary/50 hover:text-primary/80 transition-colors";

const SIZE_CONTROL_CLASSES =
  "inline-flex h-7 items-center justify-center rounded-[0.7rem] border border-[rgba(255,108,138,0.18)] bg-[radial-gradient(circle,rgba(255,84,116,0.10)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.05)_1px,transparent_1px)] bg-[size:cover,10px_10px,10px_10px] px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd4dd] shadow-[0_0_0_1px_rgba(255,84,116,0.08),0_8px_18px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.32)] hover:text-white";

const SIZE_MENU_ITEM_CLASSES =
  "flex w-full items-center justify-between gap-3 rounded-[0.75rem] border border-transparent px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd4dd] transition-colors hover:border-[rgba(255,118,144,0.22)] hover:bg-[rgba(255,84,116,0.12)] hover:text-white";

const PANEL_FIT_CONTENT_MAX_WIDTH = 1400;
const PANEL_FIT_CONTENT_MAX_HEIGHT = 1000;
const PANEL_FIT_CONTENT_HORIZONTAL_CHROME = 24;
const PANEL_FIT_CONTENT_VERTICAL_CHROME = 64;
const FIT_CONTENT_SCROLL_EPSILON = 2;

// Temporarily unhook Tailwind's `truncate` (overflow:hidden + text-overflow:
// ellipsis) inside the measure root so scrollWidth / descendant bounding
// rects reflect the natural unclipped width of the content instead of the
// already-truncated width. Without this, clicking Fit on a panel like
// Source Shelf measures the *clipped* filename width and resizes the panel
// to keep showing "…file.pdf" instead of the whole filename.
const FIT_MEASUREMENT_ATTR = "data-workspace-panel-fit-measuring";
const FIT_MEASUREMENT_STYLE_ID = "workspace-panel-fit-measuring-style";

function ensureFitMeasurementStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FIT_MEASUREMENT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = FIT_MEASUREMENT_STYLE_ID;
  style.textContent = `
    [${FIT_MEASUREMENT_ATTR}="true"] .truncate,
    [${FIT_MEASUREMENT_ATTR}="true"] .text-ellipsis,
    [${FIT_MEASUREMENT_ATTR}="true"] .overflow-hidden {
      overflow: visible !important;
      text-overflow: clip !important;
    }
    [${FIT_MEASUREMENT_ATTR}="true"] .truncate,
    [${FIT_MEASUREMENT_ATTR}="true"] .text-ellipsis {
      white-space: nowrap !important;
    }
    [${FIT_MEASUREMENT_ATTR}="true"],
    [${FIT_MEASUREMENT_ATTR}="true"] * {
      min-width: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function measureDescendantBounds(
  rootNode: HTMLElement,
): { width: number; height: number } | null {
  const rootRect = rootNode.getBoundingClientRect();
  if (!Number.isFinite(rootRect.width) || !Number.isFinite(rootRect.height)) {
    return null;
  }

  const descendants = Array.from(rootNode.querySelectorAll<HTMLElement>("*"));
  if (descendants.length === 0) {
    return null;
  }

  let minLeft = 0;
  let minTop = 0;
  let maxRight = rootRect.width;
  let maxBottom = rootRect.height;
  let foundRenderableDescendant = false;

  for (const descendant of descendants) {
    const descendantRect = descendant.getBoundingClientRect();
    if (
      !Number.isFinite(descendantRect.width) ||
      !Number.isFinite(descendantRect.height) ||
      (descendantRect.width <= 0 && descendantRect.height <= 0)
    ) {
      continue;
    }

    foundRenderableDescendant = true;
    const left = descendantRect.left - rootRect.left;
    const top = descendantRect.top - rootRect.top;
    const right = descendantRect.right - rootRect.left;
    const bottom = descendantRect.bottom - rootRect.top;

    minLeft = Math.min(minLeft, left);
    minTop = Math.min(minTop, top);
    maxRight = Math.max(maxRight, right);
    maxBottom = Math.max(maxBottom, bottom);
  }

  if (!foundRenderableDescendant) {
    return null;
  }

  return {
    width: Math.ceil(maxRight - minLeft),
    height: Math.ceil(maxBottom - minTop),
  };
}

export function WorkspacePanel({
  id,
  title,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: 400, height: 300 },
  position,
  positionResetToken,
  size,
  minWidth = 200,
  minHeight = 100,
  collapsed = false,
  isPoppedOut = false,
  dataTestId,
  onCollapsedChange,
  onPositionChange,
  onSizeChange,
  onClose,
  onPopOut,
  onSendBack,
  onTitlePointerDown,
  onMaximize,
  onFitContent,
  onCenter,
  onSizePresetSelect,
  className,
  style,
  scale = 1,
  selected = false,
  grouped = false,
  defaultCollapsed = false,
}: WorkspacePanelProps) {
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const contentMeasureRef = useRef<HTMLDivElement | null>(null);
  const defaultCollapsedAppliedRef = useRef(false);

  useEffect(() => {
    if (!sizeMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        sizeMenuRef.current &&
        !sizeMenuRef.current.contains(event.target as Node)
      ) {
        setSizeMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [sizeMenuOpen]);

  const handleToggleCollapse = () => {
    onCollapsedChange?.(!collapsed);
  };

  const handleTitlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) {
      return;
    }
    onTitlePointerDown?.(event);
  };
  const canFitContent = Boolean(onFitContent) || Boolean(onSizeChange);
  const showSizeControls =
    Boolean(onMaximize) ||
    canFitContent ||
    Boolean(onCenter) ||
    Boolean(onSizePresetSelect);

  const handleSelectPreset = (preset: WorkspacePanelSizePresetKey) => {
    onSizePresetSelect?.(preset);
    setSizeMenuOpen(false);
  };

  useEffect(() => {
    if (!defaultCollapsed || defaultCollapsedAppliedRef.current) {
      return;
    }

    const scheduleFrame =
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) =>
            window.setTimeout(() => callback(performance.now()), 0);
    const cancelFrame =
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame.bind(window)
        : window.clearTimeout.bind(window);

    const frame = scheduleFrame(() => {
      const contentRoot = contentScrollRef.current;
      if (!contentRoot) return;

      contentRoot
        .querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]')
        .forEach((trigger) => {
          trigger.click();
        });

      contentRoot
        .querySelectorAll<HTMLDetailsElement>("details[open]")
        .forEach((detailsElement) => {
          detailsElement.open = false;
        });
    });

    defaultCollapsedAppliedRef.current = true;

    return () => {
      cancelFrame(frame);
    };
  }, [defaultCollapsed]);

  const measureFitContentSize = () => {
    const contentScrollNode = contentScrollRef.current;
    const contentMeasureNode = contentMeasureRef.current;
    const panelBodyNode = contentScrollNode?.parentElement as HTMLDivElement | null;
    if (!contentScrollNode) return null;

    const restoreScrollStyles = {
      position: contentScrollNode.style.position,
      inset: contentScrollNode.style.inset,
      overflow: contentScrollNode.style.overflow,
      overflowX: contentScrollNode.style.overflowX,
      overflowY: contentScrollNode.style.overflowY,
      height: contentScrollNode.style.height,
      maxHeight: contentScrollNode.style.maxHeight,
    };
    const restorePanelBodyStyles = panelBodyNode
      ? {
          overflow: panelBodyNode.style.overflow,
          height: panelBodyNode.style.height,
        }
      : null;

    ensureFitMeasurementStyle();
    contentMeasureNode?.setAttribute(FIT_MEASUREMENT_ATTR, "true");
    contentScrollNode.setAttribute(FIT_MEASUREMENT_ATTR, "true");

    try {
      if (panelBodyNode) {
        panelBodyNode.style.overflow = "visible";
        panelBodyNode.style.height = "auto";
      }

      contentScrollNode.style.position = "relative";
      contentScrollNode.style.inset = "auto";
      contentScrollNode.style.overflow = "visible";
      contentScrollNode.style.overflowX = "visible";
      contentScrollNode.style.overflowY = "visible";
      contentScrollNode.style.height = "auto";
      contentScrollNode.style.maxHeight = "none";

      const scrollMeasuredWidth = Math.max(
        contentScrollNode.scrollWidth,
        contentMeasureNode?.scrollWidth ?? 0,
        Math.ceil(contentMeasureNode?.getBoundingClientRect().width ?? 0),
      );
      const scrollMeasuredHeight = Math.max(
        contentScrollNode.scrollHeight,
        contentMeasureNode?.scrollHeight ?? 0,
        Math.ceil(contentMeasureNode?.getBoundingClientRect().height ?? 0),
      );
      const containerWidth = Math.max(
        contentScrollNode.clientWidth,
        Math.ceil(contentScrollNode.getBoundingClientRect().width),
      );
      const containerHeight = Math.max(
        contentScrollNode.clientHeight,
        Math.ceil(contentScrollNode.getBoundingClientRect().height),
      );
      const shouldMeasureDescendants =
        Boolean(contentMeasureNode) &&
        scrollMeasuredWidth <= containerWidth + FIT_CONTENT_SCROLL_EPSILON &&
        scrollMeasuredHeight <= containerHeight + FIT_CONTENT_SCROLL_EPSILON;
      const descendantBounds =
        shouldMeasureDescendants && contentMeasureNode
          ? measureDescendantBounds(contentMeasureNode)
          : null;
      const measuredContentWidth = Math.max(
        scrollMeasuredWidth,
        descendantBounds?.width ?? 0,
      );
      const measuredContentHeight = Math.max(
        scrollMeasuredHeight,
        descendantBounds?.height ?? 0,
      );

      return {
        width: Math.min(
          PANEL_FIT_CONTENT_MAX_WIDTH,
          Math.max(
            minWidth,
            Math.ceil(measuredContentWidth + PANEL_FIT_CONTENT_HORIZONTAL_CHROME),
          ),
        ),
        height: Math.min(
          PANEL_FIT_CONTENT_MAX_HEIGHT,
          Math.max(
            minHeight,
            Math.ceil(measuredContentHeight + PANEL_FIT_CONTENT_VERTICAL_CHROME),
          ),
        ),
      };
    } finally {
      contentScrollNode.style.position = restoreScrollStyles.position;
      contentScrollNode.style.inset = restoreScrollStyles.inset;
      contentScrollNode.style.overflow = restoreScrollStyles.overflow;
      contentScrollNode.style.overflowX = restoreScrollStyles.overflowX;
      contentScrollNode.style.overflowY = restoreScrollStyles.overflowY;
      contentScrollNode.style.height = restoreScrollStyles.height;
      contentScrollNode.style.maxHeight = restoreScrollStyles.maxHeight;

      if (panelBodyNode && restorePanelBodyStyles) {
        panelBodyNode.style.overflow = restorePanelBodyStyles.overflow;
        panelBodyNode.style.height = restorePanelBodyStyles.height;
      }

      contentMeasureNode?.removeAttribute(FIT_MEASUREMENT_ATTR);
      contentScrollNode.removeAttribute(FIT_MEASUREMENT_ATTR);
    }
  };

  // ── Collapsed chip view ───────────────────────────────────────────
  if (collapsed) {
    return (
      <Rnd
        key={`collapsed:${String(positionResetToken ?? "stable")}`}
        default={{
          x: position?.x ?? defaultPosition.x,
          y: position?.y ?? defaultPosition.y,
          width: "auto",
          height: "auto",
        }}
        scale={scale}
        enableResizing={false}
        onDragStop={(_e, d) => {
          onPositionChange?.({ x: d.x, y: d.y });
        }}
        onResizeStop={() => {}}
        data-testid={dataTestId}
        className={cn(
          "workspace-panel-root inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-background/80 border border-primary/20 backdrop-blur-sm",
          "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
          "font-terminal text-xs tracking-wider text-primary/80 uppercase",
          selected && "border-primary/70 text-white shadow-[0_0_0_1px_rgba(255,110,140,0.38),0_12px_22px_rgba(0,0,0,0.34)]",
          className,
        )}
      >
        <button
          type="button"
          aria-label="Expand panel"
          className={BTN_CLASSES}
          onClick={handleToggleCollapse}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span>{title}</span>
      </Rnd>
    );
  }

  // ── Expanded panel view ───────────────────────────────────────────
  return (
    <Rnd
      key={`expanded:${String(positionResetToken ?? "stable")}`}
      default={{
        x: position?.x ?? defaultPosition.x,
        y: position?.y ?? defaultPosition.y,
        width: size?.width ?? defaultSize.width,
        height: size?.height ?? defaultSize.height,
      }}
      size={size}
      scale={scale}
      minWidth={minWidth}
      minHeight={minHeight}
      dragHandleClassName="workspace-panel-drag-handle"
      onDragStop={(_e, d) => {
        onPositionChange?.({ x: d.x, y: d.y });
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        onSizeChange?.({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
        onPositionChange?.(position);
      }}
      className={cn(
        "workspace-panel-root flex min-w-0 min-h-0 flex-col overflow-hidden border border-primary/15 rounded-[0.95rem] bg-background/60 backdrop-blur-sm",
        "shadow-[0_18px_36px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,110,140,0.08)]",
        selected &&
          "border-primary/65 shadow-[0_0_0_1px_rgba(255,116,142,0.44),0_20px_40px_rgba(0,0,0,0.34),0_0_24px_rgba(255,92,128,0.08)]",
        className,
      )}
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
      }}
      data-testid={dataTestId}
    >
      {/* Title bar */}
      <div
        className={cn(
          TITLE_BAR_CLASSES,
          "workspace-panel-drag-handle relative rounded-t-[0.95rem]",
          selected && "bg-[linear-gradient(180deg,rgba(255,122,146,0.28),rgba(18,6,12,0.94))]",
        )}
        onPointerDown={handleTitlePointerDown}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isPoppedOut && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" title="Synced to pop-out window" />
          )}
          {grouped ? (
            <span className="rounded-full border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-terminal text-[9px] uppercase tracking-[0.16em] text-primary/80">
              Group
            </span>
          ) : null}
          <span className={TITLE_TEXT_CLASSES}>{title}</span>
        </span>

        <div className="flex items-center gap-0.5 ml-2">
          {showSizeControls ? (
            <>
              {onMaximize ? (
                <button
                  type="button"
                  aria-label="Maximize panel"
                  title="Maximize"
                  className={cn(SIZE_CONTROL_CLASSES, "px-1.5")}
                  onClick={() => {
                    onMaximize();
                    setSizeMenuOpen(false);
                  }}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {canFitContent ? (
                <button
                  type="button"
                  aria-label="Fit panel content"
                  title="Fit content"
                  className={cn(SIZE_CONTROL_CLASSES, "px-1.5")}
                  onClick={() => {
                    const measuredSize = measureFitContentSize();
                    if (measuredSize) {
                      onSizeChange?.(measuredSize);
                    }
                    onFitContent?.();
                    setSizeMenuOpen(false);
                  }}
                >
                  <ScanSearch className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {onCenter ? (
                <button
                  type="button"
                  aria-label="Center panel"
                  title="Center"
                  className={cn(SIZE_CONTROL_CLASSES, "px-1.5")}
                  onClick={() => {
                    onCenter();
                    setSizeMenuOpen(false);
                  }}
                >
                  <Crosshair className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {onSizePresetSelect ? (
                <div ref={sizeMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Panel size presets"
                    title="Size presets"
                    aria-expanded={sizeMenuOpen}
                    className={cn(SIZE_CONTROL_CLASSES, "px-1.5")}
                    onClick={() => {
                      setSizeMenuOpen((current) => !current);
                    }}
                  >
                    <Rows3 className="h-3.5 w-3.5" />
                  </button>

                  {sizeMenuOpen ? (
                    <div
                      className="absolute right-0 top-[calc(100%+0.4rem)] z-30 flex min-w-[13rem] flex-col gap-1 rounded-[0.95rem] border border-[rgba(255,118,144,0.22)] bg-[linear-gradient(180deg,rgba(30,8,16,0.96),rgba(6,2,4,0.98))] p-2 shadow-[0_18px_34px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,84,116,0.10)]"
                      data-testid={`${dataTestId || id}-size-menu`}
                    >
                      {(
                        Object.entries(WORKSPACE_PANEL_SIZE_PRESETS) as [
                          WorkspacePanelSizePresetKey,
                          (typeof WORKSPACE_PANEL_SIZE_PRESETS)[WorkspacePanelSizePresetKey],
                        ][]
                      ).map(([presetKey, preset]) => (
                        <button
                          key={presetKey}
                          type="button"
                          className={SIZE_MENU_ITEM_CLASSES}
                          onClick={() => {
                            handleSelectPreset(presetKey);
                          }}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[#ffbccc]/70">
                            {preset.width}x{preset.height}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            aria-label="Collapse panel"
            className={BTN_CLASSES}
            onClick={handleToggleCollapse}
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {onPopOut && (
            <button
              type="button"
              aria-label="Pop out panel"
              className={BTN_CLASSES}
              onClick={onPopOut}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              aria-label="Close panel"
              className={BTN_CLASSES}
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Panel body */}
      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden">
        <div
          ref={contentScrollRef}
          data-workspace-panel-content="true"
          data-default-collapsed={defaultCollapsed ? "true" : "false"}
          className="absolute inset-0 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3 [overflow-wrap:anywhere]"
        >
          <div ref={contentMeasureRef} className="min-h-full min-w-0">
            {isPoppedOut ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-terminal text-xs text-primary/60 uppercase tracking-wider">
                    Open in window
                  </span>
                </div>
                {onSendBack && (
                  <button
                    type="button"
                    onClick={onSendBack}
                    className={cn(
                      "px-3 py-1.5 rounded-sm text-xs font-terminal uppercase tracking-wider",
                      "bg-primary/10 border border-primary/30 text-primary/70",
                      "hover:bg-primary/20 hover:text-primary transition-colors",
                    )}
                  >
                    Send Back
                  </button>
                )}
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </Rnd>
  );
}
