import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Network, PenTool, Table2, FilePlus2 } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VaultEditor } from "@/components/brain/VaultEditor";
import { ExcalidrawCanvas } from "@/components/brain/ExcalidrawCanvas";
import { GraphPanel } from "@/components/brain/GraphPanel";
import { ComparisonTableEditor } from "@/components/ComparisonTableEditor";
import type { BrainWorkspace } from "@/components/brain/useBrainWorkspace";

type TutorWorkspaceMode = "notes" | "canvas" | "graph" | "table";

const WORKSPACE_TABS: Array<{
  id: TutorWorkspaceMode;
  label: string;
  icon: typeof BookOpen;
}> = [
  { id: "notes", label: "NOTES", icon: BookOpen },
  { id: "canvas", label: "CANVAS", icon: PenTool },
  { id: "graph", label: "GRAPH", icon: Network },
  { id: "table", label: "TABLE", icon: Table2 },
];

function sanitizeNoteTitle(input: string) {
  return input.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

export function TutorWorkspaceSurface() {
  const [mode, setMode] = useState<TutorWorkspaceMode>("notes");
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const { data: obsidianConfig } = useQuery({
    queryKey: ["obsidian", "config"],
    queryFn: api.obsidian.getConfig,
  });

  const { data: vaultIndex } = useQuery({
    queryKey: ["obsidian", "vault-index"],
    queryFn: () => api.obsidian.getVaultIndex(),
  });

  const openFile = useCallback(async (path: string) => {
    try {
      const result = await api.obsidian.getFile(path);
      if (!result.success) return;
      setCurrentFile(path);
      setFileContent(result.content || "");
      setHasChanges(false);
      setPreviewMode(false);
      setMode("notes");
    } catch (error) {
      console.error("Failed to open Tutor workspace note:", error);
    }
  }, []);

  const saveFile = useCallback(async () => {
    if (!currentFile) return;
    setIsSaving(true);
    try {
      const result = await api.obsidian.saveFile(currentFile, fileContent);
      if (result.success) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save Tutor workspace note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [currentFile, fileContent]);

  const handleWikilinkClick = useCallback(
    async (noteName: string, shiftKey: boolean) => {
      if (shiftKey) {
        const vaultName = obsidianConfig?.vaultName || "Treys School";
        window.open(
          `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(noteName)}`,
          "_blank",
        );
        return;
      }

      const fullPath = vaultIndex?.paths?.[noteName];
      if (fullPath) {
        await openFile(fullPath);
      }
    },
    [obsidianConfig, openFile, vaultIndex],
  );

  const createWorkspaceNote = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const path = `Tutor Workspace/Tutor Note ${stamp}.md`;
    setCurrentFile(path);
    setFileContent(`# Tutor Workspace Note\n\n`);
    setHasChanges(true);
    setPreviewMode(false);
    setMode("notes");
  }, []);

  const pinnedNotePaths = useMemo(() => {
    const paths = Object.values(vaultIndex?.paths || {})
      .filter((path): path is string => typeof path === "string" && path.endsWith(".md"))
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 6);
    return paths;
  }, [vaultIndex]);

  const notesWorkspace = {
    currentFile,
    fileContent,
    hasChanges,
    previewMode,
    isSaving,
    obsidianConfig,
    handleWikilinkClick,
    saveFile,
    setPreviewMode,
    setFileContent: (value: string) => {
      setFileContent(value);
      setHasChanges(true);
    },
    isFullscreen,
    chatExpanded,
    toggleFullscreen: () => setIsFullscreen((prev) => !prev),
    toggleChat: () => setChatExpanded((prev) => !prev),
  } as unknown as BrainWorkspace;

  return (
    <div
      data-testid="tutor-workspace-surface"
      className="flex h-full min-h-0 flex-col border-t border-primary/10 bg-black/25"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-primary/20 px-4 py-2">
        <div>
          <div className="font-arcade text-[10px] text-primary">TUTOR WORKSPACE TOOLS</div>
          <div className="font-terminal text-[11px] text-muted-foreground">
            Rehosted study surfaces live here, not on the public Brain shell.
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`tutor-workspace-tab-${tab.id}`}
                className={cn(
                  "rounded-none font-arcade text-[10px]",
                  isActive
                    ? "border border-primary/40 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:border-primary/20 hover:text-primary",
                )}
                onClick={() => setMode(tab.id)}
              >
                <Icon className="mr-1 h-3 w-3" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {mode === "notes" ? (
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[260px_1fr]">
          <div className="border-r border-primary/20 bg-black/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-arcade text-[10px] text-primary">NOTES</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none border-primary/40 font-arcade text-[10px]"
                onClick={createWorkspaceNote}
              >
                <FilePlus2 className="mr-1 h-3 w-3" />
                NEW NOTE
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <div className="font-terminal text-[11px] text-muted-foreground">
                Quick vault picks
              </div>
              {pinnedNotePaths.length ? (
                pinnedNotePaths.map((path) => {
                  const name = sanitizeNoteTitle(path.split("/").pop() || path) || path;
                  return (
                    <button
                      key={path}
                      type="button"
                      className={cn(
                        "block w-full border border-primary/15 bg-black/30 px-3 py-2 text-left font-terminal text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-white",
                        currentFile === path && "border-primary/40 text-white",
                      )}
                      onClick={() => {
                        void openFile(path);
                      }}
                    >
                      {name}
                    </button>
                  );
                })
              ) : (
                <div className="border border-primary/15 bg-black/30 px-3 py-3 font-terminal text-xs text-muted-foreground">
                  No indexed vault notes yet. Start a Tutor workspace note and save it into the vault.
                </div>
              )}
            </div>
          </div>
          <div className="min-h-0">
            <VaultEditor workspace={notesWorkspace} />
          </div>
        </div>
      ) : null}

      {mode === "canvas" ? (
        <div className="min-h-0 flex-1">
          <ExcalidrawCanvas workspace={notesWorkspace} />
        </div>
      ) : null}

      {mode === "graph" ? (
        <div className="min-h-0 flex-1">
          <GraphPanel />
        </div>
      ) : null}

      {mode === "table" ? (
        <div className="min-h-0 flex-1">
          <ComparisonTableEditor className="h-full" />
        </div>
      ) : null}
    </div>
  );
}
