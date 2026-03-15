import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CoreWorkspaceFrameProps {
  children: ReactNode;
  topBar?: ReactNode;
  sidebar?: ReactNode;
  ready?: boolean;
  className?: string;
  topBarClassName?: string;
  sidebarClassName?: string;
  mainClassName?: string;
  contentClassName?: string;
}

export function CoreWorkspaceFrame({
  children,
  topBar,
  sidebar,
  ready = true,
  className,
  topBarClassName,
  sidebarClassName,
  mainClassName,
  contentClassName,
}: CoreWorkspaceFrameProps) {
  return (
    <div
      className={cn(
        "brain-workspace app-workspace-shell relative flex-1 min-h-[70vh] w-full overflow-hidden",
        ready && "brain-workspace--ready",
        className,
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        {topBar ? (
          <div
            className={cn(
              "brain-workspace__top-bar shrink-0 border-b border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_18%,rgba(0,0,0,0.22)_100%)] backdrop-blur-sm",
              topBarClassName,
            )}
          >
            {topBar}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {sidebar ? (
            <aside
              className={cn(
                "brain-workspace__sidebar-wrap flex w-full shrink-0 flex-col border-b border-primary/30 bg-black/40 min-h-0 max-h-[44vh] lg:w-80 lg:max-h-none lg:border-b-0 lg:border-r",
                sidebarClassName,
              )}
            >
              {sidebar}
            </aside>
          ) : null}

          <section
            className={cn(
              "brain-workspace__main-wrap brain-workspace__canvas flex min-h-0 flex-1 flex-col overflow-hidden",
              mainClassName,
            )}
          >
            <div className={cn("flex min-h-0 flex-1 flex-col", contentClassName)}>{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
