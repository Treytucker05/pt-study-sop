import type { ReactNode } from "react";

import {
  CONTROL_DECK,
  CONTROL_DECK_BODY,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_TOPLINE,
} from "@/components/shell/controlStyles";
import { cn } from "@/lib/utils";

interface CoreWorkspaceFrameProps {
  children: ReactNode;
  topBar?: ReactNode;
  sidebar?: ReactNode;
  ready?: boolean;
  topBarVariant?: "deck" | "integrated";
  className?: string;
  topBarClassName?: string;
  topBarSurfaceClassName?: string;
  sidebarClassName?: string;
  mainClassName?: string;
  contentClassName?: string;
}

export function CoreWorkspaceFrame({
  children,
  topBar,
  sidebar,
  ready = true,
  topBarVariant = "deck",
  className,
  topBarClassName,
  topBarSurfaceClassName,
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
              "brain-workspace__top-bar shrink-0 border-b border-primary/20 bg-transparent px-2 py-2 md:px-3",
              topBarClassName,
            )}
          >
            {topBarVariant === "integrated" ? (
              <div className={cn("min-h-[5rem]", topBarSurfaceClassName)}>
                {topBar}
              </div>
            ) : (
              <div className={cn(CONTROL_DECK, "min-h-[5rem] p-2.5", topBarSurfaceClassName)}>
                <div className={CONTROL_DECK_INSET} />
                <div className={CONTROL_DECK_TOPLINE} />
                <div className={CONTROL_DECK_BOTTOMLINE} />
                <div className={CONTROL_DECK_BODY}>{topBar}</div>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {sidebar ? (
            <aside
              className={cn(
                "brain-workspace__sidebar-wrap flex w-full shrink-0 flex-col border-b border-primary/30 bg-transparent min-h-0 max-h-[44vh] lg:w-80 lg:max-h-none lg:border-b-0 lg:border-r",
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
