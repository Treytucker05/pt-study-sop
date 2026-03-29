import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import {
  Download,
  FolderOpen,
  Maximize2,
  MessageSquare,
  Minimize2,
  Save,
} from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BrainWorkspace } from "./useBrainWorkspace";

interface ExcalidrawCanvasHandle {
  getAPI: () => null;
  getCurrentScene: () => {
    elements: [];
    appState: null;
    files: Record<string, never>;
  } | null;
  loadScene: (_elements: unknown[]) => void;
}

interface ExcalidrawCanvasProps {
  workspace?: BrainWorkspace;
  onChange?: () => void;
}

type FilePickerMode = "save" | "load";

function buildCanvasSnapshot(currentFile: string | null) {
  return {
    kind: "legacy-sketch-canvas",
    updated_at: new Date().toISOString(),
    note_path: currentFile,
    message:
      "Compatibility canvas retained after removing the unused Excalidraw dependency.",
  };
}

export const ExcalidrawCanvas = forwardRef<
  ExcalidrawCanvasHandle,
  ExcalidrawCanvasProps
>(function ExcalidrawCanvas({ workspace, onChange }, ref) {
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [filePickerPath, setFilePickerPath] = useState(
    "Brain Canvas/Untitled.canvas.json",
  );
  const [showFilePicker, setShowFilePicker] = useState<FilePickerMode | null>(
    null,
  );
  const [vaultFiles, setVaultFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const snapshot = useMemo(
    () => buildCanvasSnapshot(workspace?.currentFile ?? null),
    [workspace?.currentFile],
  );

  useImperativeHandle(
    ref,
    () => ({
      getAPI: () => null,
      getCurrentScene: () => ({
        elements: [],
        appState: null,
        files: {},
      }),
      loadScene: () => {
        setIsDirty(false);
        onChange?.();
      },
    }),
    [onChange],
  );

  const fetchVaultFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const result = await api.obsidian.getFiles("Brain Canvas");
      const nextFiles = Array.isArray(result.files)
        ? result.files
            .filter((file): file is string => typeof file === "string")
            .filter((file) => /\.json$/i.test(file))
        : [];
      setVaultFiles(nextFiles);
    } catch {
      setVaultFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const handleSave = useCallback(
    async (path?: string) => {
      const savePath = path || filePickerPath || "Brain Canvas/Untitled.canvas.json";
      setIsSaving(true);
      try {
        const result = await api.obsidian.saveFile(
          savePath,
          JSON.stringify(buildCanvasSnapshot(workspace?.currentFile ?? null), null, 2),
        );
        if (result.success) {
          setCurrentFilePath(result.path || savePath);
          setFilePickerPath(result.path || savePath);
          setIsDirty(false);
          setShowFilePicker(null);
          onChange?.();
        }
      } finally {
        setIsSaving(false);
      }
    },
    [filePickerPath, onChange, workspace?.currentFile],
  );

  const handleLoad = useCallback(
    async (path?: string) => {
      const loadPath = path || filePickerPath || "Brain Canvas/Untitled.canvas.json";
      const result = await api.obsidian.getFile(loadPath);
      if (!result.success) return;

      setCurrentFilePath(loadPath);
      setFilePickerPath(loadPath);
      setIsDirty(false);
      setShowFilePicker(null);
      onChange?.();
    },
    [filePickerPath, onChange],
  );

  const handleExport = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify(snapshot, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "legacy-canvas-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [snapshot]);

  const openSavePicker = useCallback(() => {
    setFilePickerPath(currentFilePath || "Brain Canvas/Untitled.canvas.json");
    setShowFilePicker("save");
  }, [currentFilePath]);

  const openLoadPicker = useCallback(() => {
    void fetchVaultFiles();
    setFilePickerPath(currentFilePath || "Brain Canvas/Untitled.canvas.json");
    setShowFilePicker("load");
  }, [currentFilePath, fetchVaultFiles]);

  const isFullscreen = workspace?.isFullscreen ?? false;

  return (
    <div
      data-testid="tutor-workspace-canvas-tool"
      className="flex h-full min-h-0 flex-col border border-primary/10 bg-black/25"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-primary/20 px-3 py-2">
        <button
          type="button"
          onClick={() =>
            currentFilePath ? void handleSave(currentFilePath) : openSavePicker()
          }
          disabled={isSaving}
          className="flex h-6 items-center gap-1 rounded-none px-2 font-terminal text-ui-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={openLoadPicker}
          className="flex h-6 items-center gap-1 rounded-none px-2 font-terminal text-ui-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Load
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="flex h-6 items-center gap-1 rounded-none px-2 font-terminal text-ui-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <div className="mx-1 h-4 w-px bg-primary/20" />
        <button
          type="button"
          onClick={() => workspace?.toggleFullscreen()}
          className="flex h-6 items-center gap-1 rounded-none px-2 font-terminal text-ui-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          {isFullscreen ? "Window" : "Fullscreen"}
        </button>
        <button
          type="button"
          onClick={() => workspace?.toggleChat()}
          className={cn(
            "flex h-6 items-center gap-1 rounded-none px-2 font-terminal text-ui-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground",
            workspace?.chatExpanded && "bg-primary/15 text-primary",
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </button>
        <div className="ml-auto flex items-center gap-2 font-terminal text-ui-xs text-muted-foreground">
          <span>{currentFilePath || "Unsaved canvas"}</span>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isDirty ? "bg-yellow-500" : "bg-success",
            )}
          />
          <span>{isDirty ? "Unsaved" : "Saved"}</span>
        </div>
      </div>

      <div
        data-testid="legacy-canvas-stage"
        className="flex min-h-0 flex-1 items-center justify-center border-t border-primary/10 bg-black/20 p-6"
      >
        <div className="max-w-lg rounded-[0.9rem] border border-primary/15 bg-black/40 p-5 text-center">
          <div className="font-arcade text-ui-xs uppercase tracking-[0.18em] text-primary">
            Legacy Canvas
          </div>
          <p className="mt-3 font-terminal text-sm leading-6 text-muted-foreground">
            This compatibility sketch surface stays available for legacy Tutor
            workspace tabs after the unused Excalidraw package removal. The live
            Studio canvas now runs through the unified Workspace panel.
          </p>
        </div>
      </div>

      {showFilePicker ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[420px] w-full max-w-xl flex-col gap-3 border-[3px] border-double border-primary/30 bg-black/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
            <div className="font-arcade text-ui-2xs uppercase tracking-[0.18em] text-primary">
              {showFilePicker === "save" ? "Save Canvas" : "Load Canvas"}
            </div>
            <input
              type="text"
              value={filePickerPath}
              onChange={(event) => setFilePickerPath(event.target.value)}
              className="h-8 border-[3px] border-double border-secondary bg-black px-2 font-terminal text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {showFilePicker === "load" ? (
              <div className="min-h-0 flex-1 overflow-y-auto border-[3px] border-double border-secondary/30 bg-black/60">
                {loadingFiles ? (
                  <div className="p-3 text-center font-terminal text-xs text-muted-foreground">
                    Loading...
                  </div>
                ) : vaultFiles.length === 0 ? (
                  <div className="p-3 text-center font-terminal text-xs text-muted-foreground">
                    No saved compatibility canvases found in `Brain Canvas/`.
                  </div>
                ) : (
                  vaultFiles.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => void handleLoad(file)}
                      className="flex w-full items-center gap-2 border-b border-secondary/10 px-3 py-1.5 text-left font-terminal text-xs text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      {file}
                    </button>
                  ))
                )}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFilePicker(null)}
                className="h-7 px-3 font-terminal text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  showFilePicker === "save"
                    ? void handleSave(filePickerPath)
                    : void handleLoad(filePickerPath)
                }
                disabled={isSaving || !filePickerPath.trim()}
                className="h-7 rounded-none bg-primary px-3 font-terminal text-xs text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
              >
                {showFilePicker === "save"
                  ? isSaving
                    ? "Saving..."
                    : "Save"
                  : "Load"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
