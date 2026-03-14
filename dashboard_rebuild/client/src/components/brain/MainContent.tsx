import { useEffect, useState, useCallback } from "react";
import { House, BrainCircuit } from "lucide-react";
import { BrainHome } from "./BrainHome";
import { LearnerProfilePanel } from "./LearnerProfilePanel";
import { ErrorBoundary, TabErrorFallback } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BrainWorkspace } from "./useBrainWorkspace";

const TABS = [
  { id: "home" as const, label: "HOME", icon: House, hint: "Alt+1" },
  { id: "profile" as const, label: "PROFILE", icon: BrainCircuit, hint: "Alt+2" },
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

  // Alt+1..2 keyboard shortcuts for tab switching
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
        {currentTab === "home" && (
          <div
            id="brain-tabpanel-home"
            role="tabpanel"
            aria-labelledby="brain-tab-home"
            data-tab="home"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
            <ErrorBoundary
              key={`home-${errorKeys["home"] || 0}`}
              fallback={
                <TabErrorFallback
                  tabName="HOME"
                  onReset={() => resetErrorBoundary("home")}
                />
              }
            >
              <BrainHome workspace={workspace} />
            </ErrorBoundary>
          </div>
        )}

        {currentTab === "profile" && (
          <div
            id="brain-tabpanel-profile"
            role="tabpanel"
            aria-labelledby="brain-tab-profile"
            data-tab="profile"
            className="flex-1 min-h-0 overflow-hidden flex flex-col brain-tab-enter"
            tabIndex={0}
          >
            <ErrorBoundary
              key={`profile-${errorKeys["profile"] || 0}`}
              fallback={
                <TabErrorFallback
                  tabName="PROFILE"
                  onReset={() => resetErrorBoundary("profile")}
                />
              }
            >
              <LearnerProfilePanel workspace={workspace} />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
