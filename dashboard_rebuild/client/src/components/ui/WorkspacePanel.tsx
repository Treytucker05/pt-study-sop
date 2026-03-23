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
  minWidth?: number;
  minHeight?: number;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onClose?: () => void;
  onPopOut?: () => void;
  className?: string;
}

const TITLE_BAR_CLASSES =
  "flex items-center justify-between px-3 py-1.5 bg-background/95 border-b border-primary/30 select-none cursor-move";

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
  minWidth = 200,
  minHeight = 100,
  collapsed = false,
  onCollapsedChange,
  onPositionChange,
  onSizeChange,
  onClose,
  onPopOut,
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
          x: defaultPosition.x,
          y: defaultPosition.y,
          width: "auto",
          height: "auto",
        }}
        enableResizing={false}
        onDragStop={(_e, d) => {
          onPositionChange?.({ x: d.x, y: d.y });
        }}
        onResizeStop={() => {}}
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
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: defaultSize.width,
        height: defaultSize.height,
      }}
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
        "flex flex-col bg-background/70 backdrop-blur-sm border border-primary/30 rounded-sm",
        "shadow-[0_4px_16px_rgba(0,0,0,0.5)] shadow-primary/5",
        "ring-1 ring-primary/10",
        className,
      )}
    >
      {/* Title bar */}
      <div className={cn(TITLE_BAR_CLASSES, "workspace-panel-drag-handle rounded-t-sm")}>
        <span className={TITLE_TEXT_CLASSES}>{title}</span>

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
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </Rnd>
  );
}
