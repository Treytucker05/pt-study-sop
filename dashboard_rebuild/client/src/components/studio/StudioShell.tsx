import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TutorStudioView } from "@/lib/tutorUtils";
import { cn } from "@/lib/utils";

type StudioShellPanelProps = {
  testId: string;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function StudioShellPanel({
  testId,
  title,
  children,
  className,
  contentClassName,
}: StudioShellPanelProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "min-h-0 overflow-hidden rounded-[1rem] border border-[rgba(255,122,146,0.2)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)_12%,rgba(0,0,0,0.18)_100%),linear-gradient(135deg,rgba(124,14,38,0.18),rgba(18,5,10,0.86)_58%,rgba(0,0,0,0.96)_100%)] shadow-[0_14px_32px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,86,118,0.12)] backdrop-blur-md",
        className,
      )}
    >
      <CardHeader className="border-b border-primary/15 px-4 py-3">
        <CardTitle className="font-arcade text-ui-2xs uppercase tracking-[0.18em] text-primary/84">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("min-h-0 p-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

function getWorkspaceTitle(view: TutorStudioView): string {
  switch (view) {
    case "home":
      return "Workspace Home";
    case "priming":
      return "Priming";
    case "polish":
      return "Polish";
    case "final_sync":
      return "Final Sync";
    default:
      return "Workspace";
  }
}

export interface StudioShellProps {
  view: TutorStudioView;
  workspace: ReactNode;
  sourceShelf?: ReactNode;
  documentDock?: ReactNode;
  runConfig?: ReactNode;
  tutorStatus?: ReactNode;
  repairCandidates?: ReactNode;
  memory?: ReactNode;
  primePacket?: ReactNode;
  polishPacket?: ReactNode;
  assistantDock?: ReactNode;
  stageNav?: ReactNode;
}

export function StudioShell({
  view,
  workspace,
  sourceShelf,
  documentDock,
  runConfig,
  tutorStatus,
  repairCandidates,
  memory,
  primePacket,
  polishPacket,
  assistantDock,
  stageNav,
}: StudioShellProps) {
  const workspacePanel = (
    <StudioShellPanel
      testId="studio-workspace-panel"
      title={getWorkspaceTitle(view)}
      className="flex min-h-0 flex-col"
      contentClassName="min-h-0 flex-1 p-0"
    >
      {workspace}
    </StudioShellPanel>
  );

  const stageNavigator = stageNav ? (
    <div
      data-testid="studio-stage-nav"
      className="flex flex-wrap items-center gap-2 rounded-[0.95rem] border border-[rgba(255,122,146,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.16)_100%)] px-3 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
    >
      {stageNav}
    </div>
  ) : null;

  if (view === "home") {
    return (
      <div data-testid="studio-shell" className="flex h-full min-h-0 flex-col gap-3 p-3">
        {stageNavigator}
        <div className="flex min-h-0 flex-1 flex-col">{workspacePanel}</div>
      </div>
    );
  }

  if (view === "priming") {
    return (
      <div data-testid="studio-shell" className="flex h-full min-h-0 flex-col gap-3 p-3">
        {stageNavigator}
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_19rem]">
          <StudioShellPanel
            testId="studio-source-shelf"
            title="Source Shelf"
            className="flex min-h-0 flex-col"
          >
            {sourceShelf}
          </StudioShellPanel>
          <div className="flex min-h-0 flex-col">{workspacePanel}</div>
          <div className="grid min-h-0 auto-rows-min gap-3">
            <StudioShellPanel testId="studio-run-config" title="Run Config">
              {runConfig}
            </StudioShellPanel>
            <StudioShellPanel testId="studio-prime-packet" title="Prime Packet">
              {primePacket}
            </StudioShellPanel>
          </div>
        </div>
      </div>
    );
  }

  if (view === "polish" || view === "final_sync") {
    return (
      <div data-testid="studio-shell" className="flex h-full min-h-0 flex-col gap-3 p-3">
        {stageNavigator}
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-h-0 flex-col">{workspacePanel}</div>
          <StudioShellPanel testId="studio-polish-packet" title="Polish Packet">
            {polishPacket}
          </StudioShellPanel>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="studio-shell" className="flex h-full min-h-0 flex-col gap-3 p-3">
      {stageNavigator}
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <StudioShellPanel
          testId="studio-source-shelf"
          title="Source Shelf"
          className="flex min-h-0 flex-col"
        >
          {sourceShelf}
        </StudioShellPanel>

        <div className="grid min-h-0 gap-3 xl:grid-rows-[minmax(8rem,auto)_minmax(0,1fr)]">
          <StudioShellPanel testId="studio-document-dock" title="Document Dock">
            {documentDock}
          </StudioShellPanel>
          {workspacePanel}
        </div>

        <div className="grid min-h-0 auto-rows-min gap-3">
          <StudioShellPanel testId="studio-run-config" title="Run Config">
            {runConfig}
          </StudioShellPanel>
          <StudioShellPanel testId="studio-tutor-status" title="Tutor Status">
            {tutorStatus}
          </StudioShellPanel>
          <StudioShellPanel
            testId="studio-repair-candidates"
            title="Repair Candidates"
          >
            {repairCandidates}
          </StudioShellPanel>
          <StudioShellPanel testId="studio-memory" title="Memory">
            {memory}
          </StudioShellPanel>
          <StudioShellPanel testId="studio-prime-packet" title="Prime Packet">
            {primePacket}
          </StudioShellPanel>
          <StudioShellPanel testId="studio-polish-packet" title="Polish Packet">
            {polishPacket}
          </StudioShellPanel>
        </div>
      </div>

      {assistantDock ? (
        <StudioShellPanel testId="studio-assistant-dock" title="Assistant Dock">
          {assistantDock}
        </StudioShellPanel>
      ) : null}
    </div>
  );
}
