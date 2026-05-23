import { useCallback, useEffect, useState, type ReactNode } from "react";

import { TutorSessionBoard } from "@/components/tutor-stage/TutorSessionBoard";
import { cn } from "@/lib/utils";
import {
  defaultBoardLayoutModeForTab,
  type BoardLayoutMode,
} from "@/lib/boardLayoutState";
import {
  TUTOR_STAGE_TABS,
  tutorStageShowsBoard,
  tutorStageViewportTestId,
  type TutorStageTab,
} from "@/components/tutor-stage/tutorStageTabs";

export type TutorStageShellProps = {
  stages: Partial<Record<TutorStageTab, ReactNode>>;
  /** @deprecated Prefer `sessionBoard` + layout props for integrated chrome. */
  board?: ReactNode;
  sessionBoard?: ReactNode;
  defaultTab?: TutorStageTab;
  activeTab?: TutorStageTab;
  onTabChange?: (tab: TutorStageTab) => void;
  defaultBoardLayoutMode?: BoardLayoutMode;
  boardLayoutMode?: BoardLayoutMode;
  onBoardLayoutModeChange?: (mode: BoardLayoutMode) => void;
  sessionBoardToolbar?: ReactNode;
  className?: string;
};

export function TutorStageShell({
  stages,
  board,
  sessionBoard,
  defaultTab = "read",
  activeTab: controlledTab,
  onTabChange,
  defaultBoardLayoutMode,
  boardLayoutMode: controlledBoardLayoutMode,
  onBoardLayoutModeChange,
  sessionBoardToolbar,
  className,
}: TutorStageShellProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<TutorStageTab>(defaultTab);
  const activeTab = controlledTab ?? uncontrolledTab;

  const [uncontrolledBoardLayoutMode, setUncontrolledBoardLayoutMode] =
    useState<BoardLayoutMode>(
      defaultBoardLayoutMode ?? defaultBoardLayoutModeForTab(defaultTab),
    );
  const boardLayoutMode = controlledBoardLayoutMode ?? uncontrolledBoardLayoutMode;

  useEffect(() => {
    if (controlledBoardLayoutMode !== undefined) {
      return;
    }
    setUncontrolledBoardLayoutMode(
      defaultBoardLayoutMode ?? defaultBoardLayoutModeForTab(activeTab),
    );
  }, [activeTab, controlledBoardLayoutMode, defaultBoardLayoutMode]);

  const handleSelectTab = useCallback(
    (nextTab: TutorStageTab) => {
      if (controlledTab === undefined) {
        setUncontrolledTab(nextTab);
      }
      if (controlledBoardLayoutMode === undefined) {
        setUncontrolledBoardLayoutMode(defaultBoardLayoutModeForTab(nextTab));
      }
      onTabChange?.(nextTab);
    },
    [controlledTab, controlledBoardLayoutMode, onTabChange],
  );

  const handleBoardLayoutModeChange = useCallback(
    (nextMode: BoardLayoutMode) => {
      if (controlledBoardLayoutMode === undefined) {
        setUncontrolledBoardLayoutMode(nextMode);
      }
      onBoardLayoutModeChange?.(nextMode);
    },
    [controlledBoardLayoutMode, onBoardLayoutModeChange],
  );

  const stageContent = stages[activeTab];
  const boardContent = sessionBoard ?? board;
  const showBoard = Boolean(boardContent) && tutorStageShowsBoard(activeTab);
  const stageHidden = showBoard && boardLayoutMode === "fullscreen";

  return (
    <div
      data-testid="tutor-stage-shell"
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      <nav
        data-testid="tutor-stage-tab-bar"
        aria-label="Tutor stage"
        className="flex shrink-0 flex-wrap items-center gap-1 border-b border-primary/15 bg-black/20 px-2 py-2"
      >
        {TUTOR_STAGE_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={tab.testId}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                isActive
                  ? "bg-primary/20 text-foreground"
                  : "text-foreground/60 hover:bg-primary/10 hover:text-foreground",
              )}
              onClick={() => handleSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div
        data-testid="tutor-stage-body"
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          boardLayoutMode === "fullscreen" && showBoard && "overflow-hidden",
        )}
      >
        {!stageHidden ? (
          <section
            data-testid={tutorStageViewportTestId(activeTab)}
            className={cn(
              "flex min-h-0 flex-col overflow-hidden",
              showBoard && boardLayoutMode === "split"
                ? "min-h-[200px] flex-1"
                : "flex-1",
            )}
            role="tabpanel"
          >
            {stageContent ?? (
              <div className="flex flex-1 items-center justify-center font-mono text-xs uppercase tracking-[0.18em] text-foreground/50">
                No content for {activeTab}
              </div>
            )}
          </section>
        ) : null}

        {showBoard ? (
          <aside
            data-testid="tutor-session-board"
            className={cn(
              "shrink-0",
              boardLayoutMode === "fullscreen" && "flex min-h-0 flex-1 flex-col",
            )}
          >
            {sessionBoard !== undefined ? (
              <TutorSessionBoard
                layoutMode={boardLayoutMode}
                onLayoutModeChange={handleBoardLayoutModeChange}
                toolbar={sessionBoardToolbar}
              >
                {sessionBoard}
              </TutorSessionBoard>
            ) : (
              board
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
