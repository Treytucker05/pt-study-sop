import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { Save, ExternalLink, FileText, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrainWorkspace } from "./useBrainWorkspace";
import brainBg from "@assets/TreysStudySystemIMAGE.jpg";

interface VaultEditorProps {
  workspace: BrainWorkspace;
}

export function VaultEditor({ workspace }: VaultEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = useCallback(async () => {
    await workspace.saveFile();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 300);
  }, [workspace]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  if (!workspace.currentFile) {
    return (
      <div className="brain-workspace__empty flex-1 flex flex-col items-center justify-center gap-4 relative overflow-hidden min-h-[200px]">
        <img
          src={brainBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.12] pointer-events-none select-none"
        />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
          <FileText className="brain-empty-icon w-10 h-10 text-primary/60" aria-hidden="true" />
          <p className="font-arcade text-xs text-primary/90 tracking-widest uppercase">
            No file open
          </p>
          <p className="font-terminal text-sm text-muted-foreground max-w-[260px]">
            Select a file from the vault sidebar or create a new note
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col",
      isFullscreen ? "fixed inset-0 z-50 bg-black" : "h-full"
    )}>
      {/* File toolbar */}
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 border-b bg-black/40",
        savedFlash ? "brain-save-flash" : "border-secondary/30"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-terminal text-sm text-primary truncate">
            {workspace.currentFile.split("/").pop()}
            {workspace.hasChanges && <span className="text-yellow-500 ml-1">*</span>}
          </span>
          <button
            onClick={() => {
              const vaultName = workspace.obsidianConfig?.vaultName || "Treys School";
              const fp = workspace.currentFile!.replace(/\.md$/, "");
              window.open(
                `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(fp)}`,
                "_blank"
              );
            }}
            className="text-muted-foreground hover:text-primary shrink-0"
            title="Open in Obsidian"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-xs font-terminal"
            onClick={() => workspace.setPreviewMode(!workspace.previewMode)}
          >
            {workspace.previewMode ? "Edit" : "Preview"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={!workspace.hasChanges || workspace.isSaving}
            className="h-5 px-2 text-xs font-terminal"
          >
            <Save className="w-3 h-3 mr-1" />
            {workspace.isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-xs font-terminal"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Content area */}
      {workspace.previewMode ? (
        <div className="flex-1 p-3 bg-black/60 font-terminal overflow-y-auto">
          <ObsidianRenderer
            content={workspace.fileContent}
            onWikilinkClick={workspace.handleWikilinkClick}
          />
        </div>
      ) : (
        <textarea
          value={workspace.fileContent}
          onChange={(e) => workspace.setFileContent(e.target.value)}
          className="flex-1 w-full p-3 bg-black/60 font-terminal text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary overflow-y-auto min-h-[200px]"
          placeholder="File content..."
          style={{ height: "100%" }}
        />
      )}
    </div>
  );
}
