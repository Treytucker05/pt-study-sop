import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TutorStageSettingsProps = {
  runConfig: ReactNode;
  memory: ReactNode;
  notesPanel?: ReactNode;
  className?: string;
};

export function TutorStageSettings({
  runConfig,
  memory,
  notesPanel,
  className,
}: TutorStageSettingsProps) {
  return (
    <div
      data-testid="tutor-stage-settings-layout"
      className={cn("flex h-full min-h-0 overflow-hidden", className)}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{runConfig}</div>
        {notesPanel ? (
          <div
            data-testid="tutor-stage-settings-notes"
            className="shrink-0 border-t border-primary/15 p-4"
          >
            {notesPanel}
          </div>
        ) : null}
      </div>
      <aside
        data-testid="tutor-stage-settings-memory-rail"
        className="flex w-[260px] max-w-[280px] shrink-0 flex-col overflow-hidden border-l border-primary/15 bg-black/15"
      >
        {memory}
      </aside>
    </div>
  );
}
