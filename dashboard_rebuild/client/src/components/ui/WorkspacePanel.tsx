import { type ReactNode } from "react";
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
  className?: string;
}

const TITLE_BAR_CLASSES =
  "flex items-center justify-between px-3 py-1.5 bg-background/90 border-b border-primary/20 select-none cursor-move";

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
  className,
}: WorkspacePanelProps) {
  const handleToggleCollapse = () => {
    onCollapsedChange?.(!collapsed);
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
        enableResizing={false}
        onDragStop={(_e, d) => {
          onPositionChange?.({ x: d.x, y: d.y });
        }}
        onResizeStop={() => {}}
        data-testid={dataTestId}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-background/80 border border-primary/20 backdrop-blur-sm",
          "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
          "font-terminal text-xs tracking-wider text-primary/80 uppercase",
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
        "flex flex-col bg-background/60 backdrop-blur-sm border border-primary/15 rounded-sm",
        "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
        className,
      )}
      data-testid={dataTestId}
    >
      {/* Title bar */}
      <div className={cn(TITLE_BAR_CLASSES, "workspace-panel-drag-handle rounded-t-sm")}>
        <span className="flex items-center gap-2">
          {isPoppedOut && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" title="Synced to pop-out window" />
          )}
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
      <div className="flex-1 overflow-auto p-3 relative">
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
    </Rnd>
  );
}
