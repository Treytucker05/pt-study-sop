import type { ReactNode } from "react";

import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { StudioShell } from "@/components/studio/StudioShell";
import type { TutorStudioView } from "@/lib/tutorUtils";

interface TutorStudioShellPaneProps {
  view: TutorStudioView;
  sourceShelf: ReactNode;
  documentDock: ReactNode;
  runConfig: ReactNode;
  tutorStatus: ReactNode;
  repairCandidates: ReactNode;
  memory: ReactNode;
  primePacket: ReactNode;
  polishPacket: ReactNode;
  workspace: ReactNode;
  stageNav: ReactNode;
}

export function TutorStudioShellPane({
  view,
  sourceShelf,
  documentDock,
  runConfig,
  tutorStatus,
  repairCandidates,
  memory,
  primePacket,
  polishPacket,
  workspace,
  stageNav,
}: TutorStudioShellPaneProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fade-slide-in">
      <TutorErrorBoundary fallbackLabel="Studio">
        <StudioShell
          view={view}
          sourceShelf={sourceShelf}
          documentDock={documentDock}
          runConfig={runConfig}
          tutorStatus={tutorStatus}
          repairCandidates={repairCandidates}
          memory={memory}
          primePacket={primePacket}
          polishPacket={polishPacket}
          workspace={workspace}
          stageNav={stageNav}
        />
      </TutorErrorBoundary>
    </div>
  );
}
