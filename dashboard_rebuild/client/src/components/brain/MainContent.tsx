import { useEffect, useState, useCallback } from "react";
import { House, BrainCircuit } from "lucide-react";
import { ContractBrainHome } from "./ContractBrainHome";
import { LearnerProfilePanel } from "./LearnerProfilePanel";
import { ErrorBoundary, TabErrorFallback } from "@/components/ErrorBoundary";
import {
  CONTROL_CHIP,
  CONTROL_DECK,
  CONTROL_DECK_BODY,
  CONTROL_DECK_BOTTOMLINE,
  CONTROL_DECK_INSET,
  CONTROL_DECK_TOPLINE,
  controlToggleButton,
} from "@/components/shell/controlStyles";
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
      <div className={cn(CONTROL_DECK, "mx-3 mt-3 p-2.5")}>
        <div className={CONTROL_DECK_INSET} />
        <div className={CONTROL_DECK_TOPLINE} />
        <div className={CONTROL_DECK_BOTTOMLINE} />
        <div className={cn(CONTROL_DECK_BODY, "gap-3 xl:flex-row xl:items-center xl:justify-between")}>
          <div
            role="tablist"
            aria-label="Main content view"
            className="flex flex-wrap items-center gap-2"
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
                  className={controlToggleButton(isActive, "primary")}
                  title={tab.hint}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="status"
            aria-label="Connection status"
          >
            <span
              className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-ui-xs")}
              aria-label={
                workspace.obsidianStatus?.connected ? "Obsidian: connected" : "Obsidian: disconnected"
              }
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  workspace.obsidianStatus?.connected ? "bg-success" : "bg-destructive",
                )}
                aria-hidden="true"
              />
              Obsidian
            </span>
            <span
              className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-ui-xs")}
              aria-label={workspace.ankiStatus?.connected ? "Anki: connected" : "Anki: disconnected"}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  workspace.ankiStatus?.connected ? "bg-success" : "bg-destructive",
                )}
                aria-hidden="true"
              />
              Anki
            </span>
            {workspace.pendingDrafts.length > 0 && (
              <Badge
                variant="outline"
                className="min-h-[40px] rounded-full border-secondary/50 px-3 font-terminal text-ui-xs text-secondary"
              >
                {workspace.pendingDrafts.length} drafts
              </Badge>
            )}
          </div>
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
              <ContractBrainHome workspace={workspace} />
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
