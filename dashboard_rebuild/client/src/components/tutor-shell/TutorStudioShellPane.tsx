import type { ReactNode } from "react";

import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { StudioShell } from "@/components/studio/StudioShell";
import type { StudioPanelLayoutItem } from "@/lib/studioPanelLayout";

interface TutorStudioShellPaneProps {
  primingPanel?: ReactNode;
  tutorPanel?: ReactNode;
  polishPanel?: ReactNode;
  sourceShelf: ReactNode;
  documentDock: ReactNode;
  runConfig: ReactNode;
  memory: ReactNode;
  primePacket: ReactNode;
  polishPacket: ReactNode;
  workspace: ReactNode;
  panelLayout: StudioPanelLayoutItem[];
  setPanelLayout: (
    next:
      | StudioPanelLayoutItem[]
      | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
  ) => void;
}

export function TutorStudioShellPane({
  primingPanel,
  tutorPanel,
  polishPanel,
  sourceShelf,
  documentDock,
  runConfig,
  memory,
  primePacket,
  polishPacket,
  workspace,
  panelLayout,
  setPanelLayout,
}: TutorStudioShellPaneProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fade-slide-in">
      <TutorErrorBoundary fallbackLabel="Studio">
        <StudioShell
          primingPanel={primingPanel}
          tutorPanel={tutorPanel}
          polishPanel={polishPanel}
          sourceShelf={sourceShelf}
          documentDock={documentDock}
          runConfig={runConfig}
          memory={memory}
          primePacket={primePacket}
          polishPacket={polishPacket}
          workspace={workspace}
          panelLayout={panelLayout}
          setPanelLayout={setPanelLayout}
        />
      </TutorErrorBoundary>
    </div>
  );
}
