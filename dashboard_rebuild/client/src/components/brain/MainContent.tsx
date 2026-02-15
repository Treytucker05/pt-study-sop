import { useEffect, useState, useCallback } from "react";
import { PenTool, Pencil, MessageSquare, Network, Table2, Layers } from "lucide-react";
import { BrainChat } from "@/components/BrainChat";
import { VaultEditor } from "./VaultEditor";
import { GraphPanel } from "./GraphPanel";
import { ExcalidrawCanvas } from "./ExcalidrawCanvas";
import { ComparisonTableEditor } from "@/components/ComparisonTableEditor";
import { AnkiIntegration } from "@/components/AnkiIntegration";
import { ErrorBoundary, TabErrorFallback } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BrainWorkspace } from "./useBrainWorkspace";

const TABS = [
  { id: "canvas" as const, label: "CANVAS", icon: PenTool, hint: "Alt+1" },
  { id: "edit" as const, label: "EDIT", icon: Pencil, hint: "Alt+2" },
  { id: "chat" as const, label: "CHAT", icon: MessageSquare, hint: "Alt+3" },
  { id: "graph" as const, label: "GRAPH", icon: Network, hint: "Alt+4" },
  { id: "table" as const, label: "TABLE", icon: Table2, hint: "Alt+5" },
  { id: "anki" as const, label: "ANKI", icon: Layers, hint: "Alt+6" },
] as const;

interface MainContentProps {
  workspace: BrainWorkspace;
}

export function MainContent({ workspace }: MainContentProps) {
  const [errorKeys, setErrorKeys] = useState<Record<string, number>>({});

  const resetErrorBoundary = useCallback((tabId: string) => {
    setErrorKeys((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] || 0) + 1,
    }));
  }, []);

  // Alt+1..5 keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < TABS.length) {
        e.preventDefault();
        workspace.setMainMode(TABS[idx].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [workspace]);

  const currentTab = workspace.mainMode;
  const currentIndex = TABS.findIndex((t) => t.id === currentTab);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex: number | null = null;
      if (e.key === "ArrowLeft") nextIndex = currentIndex <= 0 ? TABS.length - 1 : currentIndex - 1;
      else if (e.key === "ArrowRight") nextIndex = currentIndex >= TABS.length - 1 ? 0 : currentIndex + 1;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = TABS.length - 1;
      if (nextIndex !== null) {
        e.preventDefault();
        workspace.setMainMode(TABS[nextIndex].id);
      }
    },
    [currentIndex, workspace]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Tab list with status indicators */}
      <div
        role="tablist"
        aria-label="Main content view"
        className="tab-bar"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          const tabId = `brain-tab-${tab.id}`;
          const panelId = `brain-tabpanel-${tab.id}`;
          return (
            <button
              key={tab.id}
              id={tabId}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => workspace.setMainMode(tab.id)}
              onKeyDown={handleTabKeyDown}
              className={cn("tab-item", isActive && "active")}
              title={tab.hint}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {tab.label}
              {tab.id === "anki" && workspace.pendingDrafts.length > 0 && (
                <span className="ml-1 px-1 py-0 text-xs bg-secondary text-primary-foreground font-arcade">
                  {workspace.pendingDrafts.length}
                </span>
              )}
            </button>
          );
        })}

        {/* Status dots — right side of tab bar */}
        <div className="flex items-center gap-3 ml-auto pr-3 font-terminal text-xs" role="status" aria-label="Connection status">
          <span
            className="flex items-center gap-1"
            aria-label={workspace.obsidianStatus?.connected ? "Obsidian: connected" : "Obsidian: disconnected"}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              workspace.obsidianStatus?.connected ? "bg-success" : "bg-destructive"
            )} aria-hidden="true" />
            <span className="text-muted-foreground hidden sm:inline">Obsidian</span>
          </span>
          <span
            className="flex items-center gap-1"
            aria-label={workspace.ankiStatus?.connected ? "Anki: connected" : "Anki: disconnected"}
          >
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              workspace.ankiStatus?.connected ? "bg-success" : "bg-destructive"
            )} aria-hidden="true" />
            <span className="text-muted-foreground hidden sm:inline">Anki</span>
          </span>
          {workspace.pendingDrafts.length > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs rounded-none border-secondary/50 text-secondary">
              {workspace.pendingDrafts.length} drafts
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {currentTab === "canvas" && (
          <div
            id="brain-tabpanel-canvas"
            role="tabpanel"
            aria-labelledby="brain-tab-canvas"
            data-tab="canvas"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`canvas-${errorKeys["canvas"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="CANVAS"
                onReset={() => resetErrorBoundary("canvas")}
              />
            }
          >
            <ExcalidrawCanvas workspace={workspace} />
          </ErrorBoundary>
          </div>
        )}

        {currentTab === "edit" && (
          <div
            id="brain-tabpanel-edit"
            role="tabpanel"
            aria-labelledby="brain-tab-edit"
            data-tab="edit"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`edit-${errorKeys["edit"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="EDIT"
                onReset={() => resetErrorBoundary("edit")}
              />
            }
          >
            <VaultEditor workspace={workspace} />
          </ErrorBoundary>
          </div>
        )}

        {currentTab === "chat" && (
          <div
            id="brain-tabpanel-chat"
            role="tabpanel"
            aria-labelledby="brain-tab-chat"
            data-tab="chat"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`chat-${errorKeys["chat"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="CHAT"
                onReset={() => resetErrorBoundary("chat")}
              />
            }
          >
            <BrainChat />
          </ErrorBoundary>
          </div>
        )}

        {currentTab === "graph" && (
          <div
            id="brain-tabpanel-graph"
            role="tabpanel"
            aria-labelledby="brain-tab-graph"
            data-tab="graph"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`graph-${errorKeys["graph"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="GRAPH"
                onReset={() => resetErrorBoundary("graph")}
              />
            }
          >
            <GraphPanel />
          </ErrorBoundary>
          </div>
        )}

        {currentTab === "table" && (
          <div
            id="brain-tabpanel-table"
            role="tabpanel"
            aria-labelledby="brain-tab-table"
            data-tab="table"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`table-${errorKeys["table"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="TABLE"
                onReset={() => resetErrorBoundary("table")}
              />
            }
          >
            <ComparisonTableEditor />
          </ErrorBoundary>
          </div>
        )}

        {currentTab === "anki" && (
          <div
            id="brain-tabpanel-anki"
            role="tabpanel"
            aria-labelledby="brain-tab-anki"
            data-tab="anki"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
          <ErrorBoundary
            key={`anki-${errorKeys["anki"] || 0}`}
            fallback={
              <TabErrorFallback
                tabName="ANKI"
                onReset={() => resetErrorBoundary("anki")}
              />
            }
          >
            <AnkiIntegration
              totalCards={workspace.metrics?.totalCards || 0}
              compact
            />
          </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
