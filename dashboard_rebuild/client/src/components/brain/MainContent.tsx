import { useEffect, useState, useCallback } from "react";
import { Pencil, MessageSquare, Network, Table2, Layers } from "lucide-react";
import { BrainChat } from "@/components/BrainChat";
import { VaultEditor } from "./VaultEditor";
import { GraphPanel } from "./GraphPanel";
import { ComparisonTableEditor } from "@/components/ComparisonTableEditor";
import { AnkiIntegration } from "@/components/AnkiIntegration";
import { ErrorBoundary, TabErrorFallback } from "@/components/ErrorBoundary";
import type { BrainWorkspace } from "./useBrainWorkspace";

const TABS = [
  { id: "edit" as const, label: "EDIT", icon: Pencil },
  { id: "chat" as const, label: "CHAT", icon: MessageSquare },
  { id: "graph" as const, label: "GRAPH", icon: Network },
  { id: "table" as const, label: "TABLE", icon: Table2 },
  { id: "anki" as const, label: "ANKI", icon: Layers },
] as const;

interface MainContentProps {
  workspace: BrainWorkspace;
}

export function MainContent({ workspace }: MainContentProps) {
  const [errorKeys, setErrorKeys] = useState<Record<string, number>>({});

  // Reset error boundary when switching tabs
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

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-primary/40 bg-black/40 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => workspace.setMainMode(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-arcade text-xs transition-colors ${
                isActive
                  ? "bg-primary text-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={isActive}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {tab.label}
              {tab.id === "anki" && workspace.pendingDrafts.length > 0 && (
                <span className="ml-1 px-1 py-0 text-xs bg-secondary text-black font-arcade">
                  {workspace.pendingDrafts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content with error boundaries */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {currentTab === "edit" && (
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
        )}

        {currentTab === "chat" && (
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
        )}

        {currentTab === "graph" && (
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
        )}

        {currentTab === "table" && (
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
        )}

        {currentTab === "anki" && (
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
        )}
      </div>
    </div>
  );
}
