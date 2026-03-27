import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Rnd } from "react-rnd";
import { ChevronDown, ChevronRight, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspacePanelProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  position?: { x: number; y: number };
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
  className?: string;
  style?: CSSProperties;
  scale?: number;
  selected?: boolean;
  grouped?: boolean;
}

const TITLE_BAR_CLASSES =
  "flex items-center justify-between px-3 py-2 bg-[linear-gradient(180deg,rgba(255,110,140,0.18),rgba(18,6,12,0.92))] border-b border-primary/25 select-none cursor-move shadow-[inset_0_-1px_0_rgba(255,120,146,0.14)]";

const TITLE_TEXT_CLASSES =
  "font-terminal text-sm tracking-wider text-primary/80 uppercase truncate";

const BTN_CLASSES =
  "inline-flex items-center justify-center w-6 h-6 rounded-sm text-primary/50 hover:text-primary/80 transition-colors";

export function WorkspacePanel({
  id,
  title,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: 400, height: 300 },
  position,
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
  className,
  style,
  scale = 1,
  selected = false,
  grouped = false,
}: WorkspacePanelProps) {
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

  // ── Collapsed chip view ───────────────────────────────────────────
  if (collapsed) {
    return (
      <Rnd
        default={{
          x: position?.x ?? defaultPosition.x,
          y: position?.y ?? defaultPosition.y,
          width: "auto",
          height: "auto",
        }}
      position={position}
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
      default={{
        x: position?.x ?? defaultPosition.x,
        y: position?.y ?? defaultPosition.y,
        width: size?.width ?? defaultSize.width,
        height: size?.height ?? defaultSize.height,
      }}
      position={position}
      size={size}
      scale={scale}
      minWidth={minWidth}
      minHeight={minHeight}
      dragHandleClassName="workspace-panel-drag-handle"
      onDrag={(_e, d) => {
        onPositionChange?.({ x: d.x, y: d.y });
      }}
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
      style={style}
      data-testid={dataTestId}
    >
      {/* Title bar */}
      <div
        className={cn(
          TITLE_BAR_CLASSES,
          "workspace-panel-drag-handle rounded-t-[0.95rem]",
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
      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden p-3">
        <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden [overflow-wrap:anywhere]">
        {isPoppedOut ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm z-10">
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
    </Rnd>
  );
}
