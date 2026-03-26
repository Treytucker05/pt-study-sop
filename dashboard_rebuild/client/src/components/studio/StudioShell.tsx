import type { ReactNode } from "react";

import { WorkspacePanel } from "@/components/ui/WorkspacePanel";
import type { StudioPanelLayoutItem } from "@/lib/studioPanelLayout";
import type { TutorStudioView } from "@/lib/tutorUtils";
import { cn } from "@/lib/utils";

type StudioFloatingPanel = {
  id: string;
  panel: string;
  title: string;
  testId: string;
  content: ReactNode;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
};

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

function buildDefaultPanelLayoutItem(
  panel: StudioFloatingPanel,
): StudioPanelLayoutItem {
  return {
    id: panel.id,
    panel: panel.panel,
    position: panel.defaultPosition,
    size: panel.defaultSize,
    zIndex: 1,
    collapsed: false,
  };
}

function getFloatingPanels({
  view,
  workspace,
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
  assistantDock,
}: {
  view: TutorStudioView;
  workspace: ReactNode;
  primingPanel?: ReactNode;
  tutorPanel?: ReactNode;
  polishPanel?: ReactNode;
  sourceShelf?: ReactNode;
  documentDock?: ReactNode;
  runConfig?: ReactNode;
  tutorStatus?: ReactNode;
  repairCandidates?: ReactNode;
  memory?: ReactNode;
  primePacket?: ReactNode;
  polishPacket?: ReactNode;
  assistantDock?: ReactNode;
}): StudioFloatingPanel[] {
  const workspacePanel: StudioFloatingPanel = {
    id: "panel-workspace",
    panel: "workspace",
    testId: "studio-workspace-panel",
    title: getWorkspaceTitle(view),
    content: workspace,
    defaultPosition: view === "home" ? { x: 56, y: 48 } : { x: 380, y: 332 },
    defaultSize: view === "home"
      ? { width: 1080, height: 680 }
      : { width: 760, height: 460 },
    minWidth: 420,
    minHeight: 240,
  };

  if (view === "home") {
    return [workspacePanel];
  }

  if (view === "priming") {
    return [
      {
        id: "panel-source-shelf",
        panel: "source_shelf",
        testId: "studio-source-shelf",
        title: "Source Shelf",
        content: sourceShelf,
        defaultPosition: { x: 24, y: 88 },
        defaultSize: { width: 320, height: 720 },
        minWidth: 260,
        minHeight: 220,
      },
      {
        id: "panel-run-config",
        panel: "run_config",
        testId: "studio-run-config",
        title: "Run Config",
        content: runConfig,
        defaultPosition: { x: 1180, y: 88 },
        defaultSize: { width: 320, height: 260 },
        minWidth: 260,
        minHeight: 180,
      },
      {
        id: "panel-prime-packet",
        panel: "prime_packet",
        testId: "studio-prime-packet",
        title: "Prime Packet",
        content: primePacket,
        defaultPosition: { x: 1180, y: 364 },
        defaultSize: { width: 320, height: 444 },
        minWidth: 260,
        minHeight: 220,
      },
      workspacePanel,
    ];
  }

  if (view === "polish" || view === "final_sync") {
    return [
      workspacePanel,
      {
        id: "panel-polish-packet",
        panel: "polish_packet",
        testId: "studio-polish-packet",
        title: "Polish Packet",
        content: polishPacket,
        defaultPosition: { x: 1180, y: 88 },
        defaultSize: { width: 320, height: 720 },
        minWidth: 260,
        minHeight: 220,
      },
    ];
  }

  return [
    {
      id: "panel-source-shelf",
      panel: "source_shelf",
      testId: "studio-source-shelf",
      title: "Source Shelf",
      content: sourceShelf,
      defaultPosition: { x: 24, y: 88 },
      defaultSize: { width: 320, height: 720 },
      minWidth: 260,
      minHeight: 220,
    },
    {
      id: "panel-document-dock",
      panel: "document_dock",
      testId: "studio-document-dock",
      title: "Document Dock",
      content: documentDock,
      defaultPosition: { x: 380, y: 88 },
      defaultSize: { width: 760, height: 228 },
      minWidth: 400,
      minHeight: 160,
    },
    workspacePanel,
    {
      id: "panel-run-config",
      panel: "run_config",
      testId: "studio-run-config",
      title: "Run Config",
      content: runConfig,
      defaultPosition: { x: 1180, y: 88 },
      defaultSize: { width: 320, height: 190 },
      minWidth: 260,
      minHeight: 140,
    },
    {
      id: "panel-tutor-status",
      panel: "tutor_status",
      testId: "studio-tutor-status",
      title: "Tutor Status",
      content: tutorStatus,
      defaultPosition: { x: 1180, y: 292 },
      defaultSize: { width: 320, height: 180 },
      minWidth: 260,
      minHeight: 140,
    },
    {
      id: "panel-repair-candidates",
      panel: "repair_candidates",
      testId: "studio-repair-candidates",
      title: "Repair Candidates",
      content: repairCandidates,
      defaultPosition: { x: 1180, y: 486 },
      defaultSize: { width: 320, height: 170 },
      minWidth: 260,
      minHeight: 140,
    },
    {
      id: "panel-memory",
      panel: "memory",
      testId: "studio-memory",
      title: "Memory",
      content: memory,
      defaultPosition: { x: 1180, y: 670 },
      defaultSize: { width: 320, height: 170 },
      minWidth: 260,
      minHeight: 140,
    },
    {
      id: "panel-prime-packet",
      panel: "prime_packet",
      testId: "studio-prime-packet",
      title: "Prime Packet",
      content: primePacket,
      defaultPosition: { x: 24, y: 824 },
      defaultSize: { width: 520, height: 240 },
      minWidth: 320,
      minHeight: 180,
    },
    {
      id: "panel-polish-packet",
      panel: "polish_packet",
      testId: "studio-polish-packet",
      title: "Polish Packet",
      content: polishPacket,
      defaultPosition: { x: 564, y: 824 },
      defaultSize: { width: 576, height: 240 },
      minWidth: 320,
      minHeight: 180,
    },
    ...(assistantDock
      ? [
          {
            id: "panel-assistant-dock",
            panel: "assistant_dock",
            testId: "studio-assistant-dock",
            title: "Assistant Dock",
            content: assistantDock,
            defaultPosition: { x: 1180, y: 854 },
            defaultSize: { width: 320, height: 210 },
            minWidth: 260,
            minHeight: 160,
          } satisfies StudioFloatingPanel,
        ]
      : []),
    ...(primingPanel
      ? [
          {
            id: "panel-priming",
            panel: "priming",
            testId: "studio-priming-panel",
            title: "Priming",
            content: primingPanel,
            defaultPosition: { x: 1560, y: 88 },
            defaultSize: { width: 680, height: 440 },
            minWidth: 420,
            minHeight: 240,
          } satisfies StudioFloatingPanel,
        ]
      : []),
    ...(tutorPanel
      ? [
          {
            id: "panel-tutor",
            panel: "tutor",
            testId: "studio-tutor-panel",
            title: "Tutor",
            content: tutorPanel,
            defaultPosition: { x: 1560, y: 548 },
            defaultSize: { width: 680, height: 520 },
            minWidth: 420,
            minHeight: 260,
          } satisfies StudioFloatingPanel,
        ]
      : []),
    ...(polishPanel
      ? [
          {
            id: "panel-polish",
            panel: "polish",
            testId: "studio-polish-panel",
            title: "Polish",
            content: polishPanel,
            defaultPosition: { x: 2260, y: 88 },
            defaultSize: { width: 680, height: 440 },
            minWidth: 420,
            minHeight: 240,
          } satisfies StudioFloatingPanel,
        ]
      : []),
  ];
}

function upsertPanelLayoutItem(
  current: StudioPanelLayoutItem[],
  panel: StudioFloatingPanel,
  update: Partial<StudioPanelLayoutItem>,
): StudioPanelLayoutItem[] {
  const existingIndex = current.findIndex(
    (item) => item.panel === panel.panel || item.id === panel.id,
  );
  const baseline =
    existingIndex >= 0
      ? current[existingIndex]
      : buildDefaultPanelLayoutItem(panel);
  const nextItem: StudioPanelLayoutItem = {
    ...baseline,
    ...update,
    panel: panel.panel,
    id: update.id ?? baseline.id ?? panel.id,
  };

  if (existingIndex < 0) {
    return [...current, nextItem];
  }

  return current.map((item, index) => (index === existingIndex ? nextItem : item));
}

export interface StudioShellProps {
  view: TutorStudioView;
  workspace: ReactNode;
  primingPanel?: ReactNode;
  tutorPanel?: ReactNode;
  polishPanel?: ReactNode;
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
  panelLayout: StudioPanelLayoutItem[];
  setPanelLayout: (
    next:
      | StudioPanelLayoutItem[]
      | ((current: StudioPanelLayoutItem[]) => StudioPanelLayoutItem[]),
  ) => void;
}

export function StudioShell({
  view,
  workspace,
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
  assistantDock,
  stageNav,
  panelLayout,
  setPanelLayout,
}: StudioShellProps) {
  const stageNavigator = stageNav ? (
    <div
      data-testid="studio-stage-nav"
      className="flex flex-wrap items-center gap-2 rounded-[0.95rem] border border-[rgba(255,122,146,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.16)_100%)] px-3 py-2 shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
    >
      {stageNav}
    </div>
  ) : null;

  const panelDefinitions = getFloatingPanels({
    view,
    workspace,
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
    assistantDock,
  });

  const savedPanelsByKey = new Map<string, StudioPanelLayoutItem>();
  for (const item of panelLayout) {
    savedPanelsByKey.set(item.panel, item);
    savedPanelsByKey.set(item.id, item);
  }

  const restoredPanels = panelDefinitions.filter(
    (panel) =>
      savedPanelsByKey.has(panel.panel) || savedPanelsByKey.has(panel.id),
  );
  const panelsToRender =
    panelLayout.length > 0 && restoredPanels.length > 0
      ? restoredPanels
      : panelDefinitions;

  return (
    <div data-testid="studio-shell" className="flex h-full min-h-0 flex-col gap-3 p-3">
      {stageNavigator}
      <div
        data-testid="studio-floating-shell"
        className={cn(
          "relative flex-1 overflow-auto rounded-[1rem] border border-[rgba(255,122,146,0.14)]",
          "bg-[radial-gradient(circle_at_top,rgba(255,70,104,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.24))]",
        )}
      >
        <div className="absolute inset-0 min-h-[1120px] min-w-[1560px]">
          {panelsToRender.map((panel, index) => {
            const savedLayout =
              savedPanelsByKey.get(panel.panel) ?? savedPanelsByKey.get(panel.id);
            const resolvedLayout = savedLayout ?? buildDefaultPanelLayoutItem(panel);

            return (
              <WorkspacePanel
                key={`${resolvedLayout.id}:${resolvedLayout.position.x}:${resolvedLayout.position.y}:${resolvedLayout.size.width}:${resolvedLayout.size.height}:${resolvedLayout.collapsed}`}
                id={resolvedLayout.id}
                title={panel.title}
                dataTestId={panel.testId}
                position={resolvedLayout.position}
                size={resolvedLayout.size}
                defaultPosition={panel.defaultPosition}
                defaultSize={panel.defaultSize}
                minWidth={panel.minWidth}
                minHeight={panel.minHeight}
                collapsed={resolvedLayout.collapsed}
                className="bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)_12%,rgba(0,0,0,0.18)_100%),linear-gradient(135deg,rgba(124,14,38,0.18),rgba(18,5,10,0.86)_58%,rgba(0,0,0,0.96)_100%)] shadow-[0_14px_32px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,86,118,0.12)]"
                onCollapsedChange={(collapsed) => {
                  setPanelLayout((current) =>
                    upsertPanelLayoutItem(current, panel, {
                      ...resolvedLayout,
                      collapsed,
                    }),
                  );
                }}
                onPositionChange={(position) => {
                  setPanelLayout((current) =>
                    upsertPanelLayoutItem(current, panel, {
                      ...resolvedLayout,
                      position,
                      zIndex: resolvedLayout.zIndex || index + 1,
                    }),
                  );
                }}
                onSizeChange={(size) => {
                  setPanelLayout((current) =>
                    upsertPanelLayoutItem(current, panel, {
                      ...resolvedLayout,
                      size,
                      zIndex: resolvedLayout.zIndex || index + 1,
                    }),
                  );
                }}
              >
                <div
                  data-panel-layout-id={resolvedLayout.id}
                  data-panel-kind={panel.panel}
                  data-panel-position={`${resolvedLayout.position.x},${resolvedLayout.position.y}`}
                  data-panel-size={`${resolvedLayout.size.width},${resolvedLayout.size.height}`}
                  className="h-full min-h-0"
                >
                  {panel.content}
                </div>
              </WorkspacePanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
