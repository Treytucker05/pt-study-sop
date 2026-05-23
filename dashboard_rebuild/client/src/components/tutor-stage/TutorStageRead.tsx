import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TutorStageReadProps = {
  sourceShelf: ReactNode;
  documentDock: ReactNode;
  className?: string;
};

export function TutorStageRead({
  sourceShelf,
  documentDock,
  className,
}: TutorStageReadProps) {
  return (
    <div
      data-testid="tutor-stage-read-layout"
      className={cn("flex min-h-0 flex-1 overflow-hidden", className)}
    >
      <aside
        data-testid="tutor-stage-read-shelf-rail"
        className="flex w-[240px] max-w-[280px] shrink-0 flex-col overflow-hidden border-r border-primary/15 bg-black/15"
      >
        {sourceShelf}
      </aside>
      <main
        data-testid="tutor-stage-read-dock"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {documentDock}
      </main>
    </div>
  );
}
