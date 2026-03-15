import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SupportWorkspaceFrameProps {
  sidebar: ReactNode;
  commandBand?: ReactNode;
  children: ReactNode;
  className?: string;
  sidebarClassName?: string;
  mainClassName?: string;
  contentClassName?: string;
}

export function SupportWorkspaceFrame({
  sidebar,
  commandBand,
  children,
  className,
  sidebarClassName,
  mainClassName,
  contentClassName,
}: SupportWorkspaceFrameProps) {
  return (
    <div
      className={cn(
        "brain-workspace brain-workspace--ready app-workspace-shell relative flex-1 min-h-[70vh] w-full overflow-hidden",
        className,
      )}
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <aside
          className={cn(
            "brain-workspace__sidebar-wrap flex w-full shrink-0 flex-col border-b border-primary/30 bg-black/40 min-h-0 max-h-[44vh] lg:w-80 lg:max-h-none lg:border-b-0 lg:border-r",
            sidebarClassName,
          )}
        >
          {sidebar}
        </aside>

        <section
          className={cn(
            "brain-workspace__main-wrap brain-workspace__canvas flex min-h-0 flex-1 flex-col overflow-hidden",
            mainClassName,
          )}
        >
          {commandBand ? (
            <div className="border-b border-primary/20 bg-black/30">{commandBand}</div>
          ) : null}
          <div className={cn("flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4", contentClassName)}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
