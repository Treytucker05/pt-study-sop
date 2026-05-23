import { useCallback, useState, type ReactNode } from "react";

import { BoardLayoutChrome } from "@/components/tutor-stage/BoardLayoutChrome";
import { cn } from "@/lib/utils";
import type { BoardLayoutMode } from "@/lib/boardLayoutState";

export type TutorSessionBoardProps = {
  children: ReactNode;
  layoutMode?: BoardLayoutMode;
  defaultLayoutMode?: BoardLayoutMode;
  onLayoutModeChange?: (mode: BoardLayoutMode) => void;
  toolbar?: ReactNode;
  className?: string;
};

export function TutorSessionBoard({
  children,
  layoutMode: controlledLayoutMode,
  defaultLayoutMode = "split",
  onLayoutModeChange,
  toolbar,
  className,
}: TutorSessionBoardProps) {
  const [uncontrolledLayoutMode, setUncontrolledLayoutMode] =
    useState<BoardLayoutMode>(defaultLayoutMode);
  const layoutMode = controlledLayoutMode ?? uncontrolledLayoutMode;

  const handleLayoutModeChange = useCallback(
    (nextMode: BoardLayoutMode) => {
      if (controlledLayoutMode === undefined) {
        setUncontrolledLayoutMode(nextMode);
      }
      onLayoutModeChange?.(nextMode);
    },
    [controlledLayoutMode, onLayoutModeChange],
  );

  if (layoutMode === "collapsed") {
    return (
      <div
        data-testid="tutor-session-board-root"
        data-layout="collapsed"
        className={cn(
          "flex items-center justify-between gap-2 border-t-2 border-primary/40 bg-black/30 px-3 py-2",
          className,
        )}
      >
        <BoardLayoutChrome
          layoutMode={layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          className="flex w-full items-center justify-between gap-2"
        />
      </div>
    );
  }

  return (
    <div
      data-testid="tutor-session-board-root"
      data-layout={layoutMode}
      className={cn(
        "flex min-h-0 flex-col border-t-2 border-primary/40 bg-black/25",
        layoutMode === "fullscreen" ? "flex-1" : "max-h-[45%] min-h-[140px]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-primary/10 px-2 py-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/55">
          {layoutMode === "fullscreen"
            ? "Fullscreen board — stage hidden"
            : "Session board"}
        </span>
        <BoardLayoutChrome
          layoutMode={layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          className="flex items-center gap-1"
        />
      </div>

      <div
        data-testid="tutor-board-toolbar"
        className="flex shrink-0 items-center gap-1 border-b border-primary/10 px-2 py-1"
      >
        {toolbar ?? (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/45">
            Workspace tools
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        {children}
      </div>
    </div>
  );
}
