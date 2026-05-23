import { Maximize2, Minimize2, PanelBottom } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getNextBoardLayoutMode,
  type BoardLayoutAction,
  type BoardLayoutMode,
} from "@/lib/boardLayoutState";

export type BoardLayoutChromeProps = {
  layoutMode: BoardLayoutMode;
  onLayoutModeChange: (mode: BoardLayoutMode) => void;
  className?: string;
};

function applyLayoutAction(
  current: BoardLayoutMode,
  action: BoardLayoutAction,
  onLayoutModeChange: (mode: BoardLayoutMode) => void,
) {
  onLayoutModeChange(getNextBoardLayoutMode(current, action));
}

export function BoardLayoutChrome({
  layoutMode,
  onLayoutModeChange,
  className,
}: BoardLayoutChromeProps) {
  if (layoutMode === "collapsed") {
    return (
      <div
        data-testid="tutor-board-layout-chrome"
        className={className}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/70">
          Session board
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-testid="tutor-board-expand"
            className="h-7 font-mono text-[10px] uppercase tracking-[0.12em]"
            onClick={() => applyLayoutAction(layoutMode, "expand", onLayoutModeChange)}
          >
            Expand split
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="tutor-board-fullscreen"
            className="h-7 font-mono text-[10px] uppercase tracking-[0.12em]"
            onClick={() =>
              applyLayoutAction(layoutMode, "enter_fullscreen", onLayoutModeChange)
            }
          >
            <Maximize2 className="mr-1 h-3 w-3" />
            Fullscreen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="tutor-board-layout-chrome"
      className={className}
    >
      {layoutMode === "fullscreen" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid="tutor-board-exit-fullscreen"
          className="h-7 font-mono text-[10px] uppercase tracking-[0.12em]"
          onClick={() =>
            applyLayoutAction(layoutMode, "exit_fullscreen", onLayoutModeChange)
          }
        >
          <Minimize2 className="mr-1 h-3 w-3" />
          Exit fullscreen
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="tutor-board-collapse"
            className="h-7 font-mono text-[10px] uppercase tracking-[0.12em]"
            onClick={() => applyLayoutAction(layoutMode, "collapse", onLayoutModeChange)}
          >
            <PanelBottom className="mr-1 h-3 w-3" />
            Collapse
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="tutor-board-fullscreen"
            className="h-7 font-mono text-[10px] uppercase tracking-[0.12em]"
            onClick={() =>
              applyLayoutAction(layoutMode, "enter_fullscreen", onLayoutModeChange)
            }
          >
            <Maximize2 className="mr-1 h-3 w-3" />
            Fullscreen
          </Button>
        </>
      )}
    </div>
  );
}
