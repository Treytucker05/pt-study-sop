import type { ReactNode } from "react";

import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { StudioShell } from "@/components/studio/StudioShell";
import type { StudioPanelLayoutItem } from "@/lib/studioPanelLayout";
import type { TutorStudioView } from "@/lib/tutorUtils";

interface TutorStudioShellPaneProps {
  view: TutorStudioView;
  primingPanel?: ReactNode;
  tutorPanel?: ReactNode;
  polishPanel?: ReactNode;
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
  panelLayout: StudioPanelLayoutItem[];
  setPanelLayout: (
    next:
      | StudioPanelLayoutItem[]
      | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
  ) => void;
}

export function TutorStudioShellPane({
  view,
  primingPanel,
  tutorPanel,
  polishPanel,
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
  panelLayout,
  setPanelLayout,
}: TutorStudioShellPaneProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fade-slide-in">
      <TutorErrorBoundary fallbackLabel="Studio">
        <StudioShell
          view={view}
          primingPanel={primingPanel}
          tutorPanel={tutorPanel}
          polishPanel={polishPanel}
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
          panelLayout={panelLayout}
          setPanelLayout={setPanelLayout}
        />
      </TutorErrorBoundary>
    </div>
  );
}
