import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Excalidraw, exportToBlob, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import {
  LayoutGrid,
  Save,
  Download,
  Maximize2,
  Minimize2,
  FolderOpen,
  MessageSquare,
  X,
  FilePlus,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { TEMPLATES, type LayoutTemplate } from "./excalidraw-templates";
import type { BrainWorkspace } from "./useBrainWorkspace";

/* ─── public imperative handle ─── */
export interface ExcalidrawCanvasHandle {
  getAPI: () => ExcalidrawImperativeAPI | null;
  exportPNG: () => Promise<Blob | null>;
  getSceneData: () => {
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null;
  loadScene: (elements: ExcalidrawElement[]) => void;
}

interface ExcalidrawCanvasProps {
  workspace?: BrainWorkspace;
  onChange?: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
}

type AnyListener = EventListenerOrEventListenerObject;
type WindowWithUnloadShim = Window & {
  __ptUnloadShimRefCount?: number;
  __ptOriginalAddEventListener?: typeof window.addEventListener;
  __ptOriginalRemoveEventListener?: typeof window.removeEventListener;
  __ptUnloadListenerMap?: WeakMap<AnyListener, AnyListener>;
};

const remapEventType = (type: string) => (type === "unload" ? "pagehide" : type);

const mapUnloadListener = (
  win: WindowWithUnloadShim,
  type: string,
  listener: AnyListener | null,
): AnyListener | null => {
  if (type !== "unload" || !listener) return listener;

  let listenerMap = win.__ptUnloadListenerMap;
  if (!listenerMap) {
    listenerMap = new WeakMap<AnyListener, AnyListener>();
    win.__ptUnloadListenerMap = listenerMap;
  }

  const existing = listenerMap.get(listener);
  if (existing) return existing;

  const mappedListener: AnyListener =
    typeof listener === "function"
      ? ((event: Event) => {
        (listener as EventListener)(event);
      })
      : {
        handleEvent: (event: Event) => listener.handleEvent(event),
      };

  listenerMap.set(listener, mappedListener);
  return mappedListener;
};

const installUnloadListenerShim = () => {
  if (typeof window === "undefined") return () => { };

  const win = window as WindowWithUnloadShim;
  win.__ptUnloadShimRefCount = (win.__ptUnloadShimRefCount ?? 0) + 1;
  if (win.__ptUnloadShimRefCount > 1) {
    return () => {
      win.__ptUnloadShimRefCount = Math.max(0, (win.__ptUnloadShimRefCount ?? 1) - 1);
    };
  }

  const originalAdd = window.addEventListener.bind(window);
  const originalRemove = window.removeEventListener.bind(window);
  win.__ptOriginalAddEventListener = originalAdd;
  win.__ptOriginalRemoveEventListener = originalRemove;

  window.addEventListener = ((type: string, listener: AnyListener | null, options?: boolean | AddEventListenerOptions) => {
    const mappedType = remapEventType(type);
    const mappedListener = mapUnloadListener(win, type, listener);
    if (!mappedListener) return;
    originalAdd(mappedType, mappedListener, options);
  }) as typeof window.addEventListener;

  window.removeEventListener = ((type: string, listener: AnyListener | null, options?: boolean | EventListenerOptions) => {
    const mappedType = remapEventType(type);
    const mappedListener = mapUnloadListener(win, type, listener);
    if (!mappedListener) return;
    originalRemove(mappedType, mappedListener, options);
  }) as typeof window.removeEventListener;

  return () => {
    win.__ptUnloadShimRefCount = Math.max(0, (win.__ptUnloadShimRefCount ?? 1) - 1);
    if (win.__ptUnloadShimRefCount !== 0) return;

    if (win.__ptOriginalAddEventListener) {
      window.addEventListener = win.__ptOriginalAddEventListener;
    }
    if (win.__ptOriginalRemoveEventListener) {
      window.removeEventListener = win.__ptOriginalRemoveEventListener;
    }
    win.__ptOriginalAddEventListener = undefined;
    win.__ptOriginalRemoveEventListener = undefined;
    win.__ptUnloadListenerMap = undefined;
  };
};

/* ─── component ─── */
export const ExcalidrawCanvas = forwardRef<
  ExcalidrawCanvasHandle,
  ExcalidrawCanvasProps
>(function ExcalidrawCanvas({ workspace, onChange }, ref) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  /* ── toolbar state ── */
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [elementCount, setElementCount] = useState(0);
  const showTemplatesOnMount = useRef(true);

  /* ── file picker state ── */
  const [showFilePicker, setShowFilePicker] = useState<"save" | "load" | null>(null);
  const [filePickerPath, setFilePickerPath] = useState("Brain Canvas/Untitled.excalidraw");
  const [vaultFiles, setVaultFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => installUnloadListenerShim(), []);



  /* ── imperative handle (unchanged API) ── */
  useImperativeHandle(
    ref,
    () => ({
      getAPI: () => excalidrawAPI,
      exportPNG: async () => {
        if (!excalidrawAPI) return null;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const files = excalidrawAPI.getFiles();
        return exportToBlob({
          elements,
          appState: { ...appState, exportWithDarkMode: true },
          files,
        });
      },
      getSceneData: () => {
        if (!excalidrawAPI) return null;
        return {
          elements: excalidrawAPI.getSceneElements(),
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
        };
      },
      loadScene: (elements: ExcalidrawElement[]) => {
        if (!excalidrawAPI) return;
        excalidrawAPI.updateScene({ elements });
        excalidrawAPI.scrollToContent(elements, { fitToViewport: true });
      },
    }),
    [excalidrawAPI],
  );

  /* ── change handler ── */
  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      setElementCount(elements.filter((e) => !e.isDeleted).length);
      setIsSaved(false);
      onChange?.(elements, appState, files);
    },
    [onChange],
  );

  /* ── template selection ── */
  const applyTemplate = useCallback(
    (template: LayoutTemplate) => {
      if (!excalidrawAPI) return;
      const skeletons = template.createElements();
      if (skeletons.length === 0) {
        // blank template — clear canvas
        excalidrawAPI.updateScene({ elements: [] });
      } else {
        const elements = convertToExcalidrawElements(skeletons);
        excalidrawAPI.updateScene({ elements });
        excalidrawAPI.scrollToContent(elements, { fitToViewport: true });
      }
      setShowTemplates(false);
      setIsSaved(false);
    },
    [excalidrawAPI],
  );

  const fetchVaultFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const result = await api.obsidian.getFiles("Brain Canvas");
      if (result.files) {
        const excalidrawFiles = (result.files as string[]).filter(
          (f) => f.endsWith(".excalidraw") || f.endsWith(".excalidraw.json"),
        );
        setVaultFiles(excalidrawFiles);
      }
    } catch {
      setVaultFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const openSavePicker = useCallback(() => {
    setFilePickerPath(currentFilePath || "Brain Canvas/Untitled.excalidraw");
    setShowFilePicker("save");
  }, [currentFilePath]);

  const openLoadPicker = useCallback(() => {
    fetchVaultFiles();
    setFilePickerPath(currentFilePath || "Brain Canvas/Untitled.excalidraw");
    setShowFilePicker("load");
  }, [currentFilePath, fetchVaultFiles]);

  const handleSave = useCallback(async (path?: string) => {
    if (!excalidrawAPI) return;
    const savePath = path || filePickerPath || "Brain Canvas/Untitled.excalidraw";
    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const sceneData = {
        type: "excalidraw",
        version: 2,
        elements: [...elements],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        files: files || {},
      };

      const result = await api.obsidian.saveFile(
        savePath,
        JSON.stringify(sceneData, null, 2),
      );
      if (result.success) {
        setCurrentFilePath(result.path || savePath);
        setIsSaved(true);
        setShowFilePicker(null);
      }
    } catch (err) {
      console.error("Failed to save canvas:", err);
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, filePickerPath]);

  const handleLoad = useCallback(async (path?: string) => {
    if (!excalidrawAPI) return;
    const loadPath = path || filePickerPath || "Brain Canvas/Untitled.excalidraw";
    try {
      const result = await api.obsidian.getFile(loadPath);
      if (result.success && result.content) {
        const scene = JSON.parse(result.content);
        if (scene.elements && Array.isArray(scene.elements)) {
          excalidrawAPI.updateScene({ elements: scene.elements });
          excalidrawAPI.scrollToContent(scene.elements, {
            fitToViewport: true,
          });
          setCurrentFilePath(loadPath);
          setIsSaved(true);
          setShowFilePicker(null);
        }
      }
    } catch (err) {
      console.error("Failed to load canvas:", err);
    }
  }, [excalidrawAPI, filePickerPath]);

  /* ── export PNG ── */
  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return;
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      const blob = await exportToBlob({
        elements,
        appState: { ...appState, exportWithDarkMode: true },
        files,
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "canvas-export.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to export PNG:", err);
    }
  }, [excalidrawAPI]);

  /* ── fullscreen ── */
  const isFullscreen = workspace?.isFullscreen ?? false;
  const handleFullscreen = useCallback(() => {
    workspace?.toggleFullscreen();
  }, [workspace]);

  /* ESC exits fullscreen */
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") workspace?.toggleFullscreen();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen, workspace]);

  return (
    <div className="excalidraw-wrapper flex flex-col">
      {/* ─── Canvas Toolbar ─── */}
      <div className="flex items-center gap-1 px-2.5 border-b border-primary/20 bg-black/40 shrink-0 h-8">
        <span className="font-arcade text-[7px] text-muted-foreground mr-1">
          TOOLS
        </span>

        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={`px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none ${showTemplates ? "text-primary bg-primary/20" : ""}`}
          title="Layout Templates"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Templates
        </button>

        <div className="w-px h-4 bg-primary/20 mx-1" />

        <span className="font-arcade text-[7px] text-muted-foreground mr-1">
          ACTIONS
        </span>

        <button
          onClick={() => currentFilePath ? handleSave(currentFilePath) : openSavePicker()}
          disabled={isSaving}
          className="px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none disabled:opacity-50"
          title={currentFilePath ? `Save to ${currentFilePath}` : "Save As..."}
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={openLoadPicker}
          className="px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none"
          title="Load from Vault"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Load
        </button>

        <button
          onClick={handleExport}
          className="px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none"
          title="Export PNG"
        >
          <Download className="w-3.5 h-3.5" />
          PNG
        </button>

        <div className="w-px h-4 bg-primary/20 mx-1" />

        <button
          onClick={handleFullscreen}
          className={`px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none ${isFullscreen ? "text-primary bg-primary/15" : ""}`}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
          {isFullscreen ? "Exit" : "Full"}
        </button>

        <button
          onClick={() => workspace?.toggleChat()}
          className={`px-2 h-6 font-terminal text-[13px] bg-transparent border-none text-muted-foreground cursor-pointer flex items-center gap-1 transition-colors hover:text-foreground hover:bg-primary/10 rounded-none ${workspace?.chatExpanded ? "text-primary bg-primary/15" : ""}`}
          title={workspace?.chatExpanded ? "Hide chat" : "Show chat"}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>

        <div className="flex-1" />

        {currentFilePath && (
          <span className="font-terminal text-[11px] text-muted-foreground/70 truncate max-w-[200px]" title={currentFilePath}>
            <FileText className="w-3 h-3 inline mr-1" />
            {currentFilePath.split("/").pop()}
          </span>
        )}
        <span className="font-terminal text-[13px] text-muted-foreground flex items-center gap-2">
          {elementCount}N
          <span className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isSaved ? "bg-success" : "bg-yellow-500"}`}
            />
            {isSaved ? "Saved" : "Unsaved"}
          </span>
        </span>
      </div>

      {/* ─── Canvas Area (relative for overlay) ─── */}
      <div className="flex-1 min-h-0 relative">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          theme="dark"
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              saveAsImage: false,
              export: false,
              loadScene: false,
            },
          }}
          initialData={{
            appState: {
              viewBackgroundColor: "transparent",
              currentItemStrokeColor: "#ff0000",
              currentItemFontFamily: 3,
              gridSize: 20,
            },
          }}
        />

        {/* ─── Template Picker Overlay ─── */}
        {showTemplates && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5 p-6">
              <div className="flex items-center gap-4">
                <h2 className="font-arcade text-[10px] text-primary tracking-wider">
                  CHOOSE A LAYOUT TEMPLATE
                </h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-[180px] h-[130px] border-[3px] border-double border-primary/30 bg-black/95 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all hover:border-primary hover:bg-primary/8 hover:-translate-y-0.5 rounded-none"
                  >
                    <TemplateMiniPreview templateId={template.id} />
                    <span className="font-arcade text-[7px] text-muted-foreground">
                      {template.name}
                    </span>
                  </button>
                ))}
              </div>

              <p className="font-terminal text-sm text-muted-foreground">
                Templates pre-place Excalidraw frames + shapes. You can modify
                everything after.
              </p>
            </div>
          </div>
        )}

        {showFilePicker && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col gap-4 p-6 border-[3px] border-double border-primary/40 bg-black/95 w-[420px] max-h-[80%]">
              <div className="flex items-center justify-between">
                <h2 className="font-arcade text-[10px] text-primary tracking-wider">
                  {showFilePicker === "save" ? "SAVE CANVAS" : "LOAD CANVAS"}
                </h2>
                <button
                  onClick={() => setShowFilePicker(null)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-arcade text-[7px] text-muted-foreground">
                  FILE PATH
                </label>
                <input
                  type="text"
                  value={filePickerPath}
                  onChange={(e) => setFilePickerPath(e.target.value)}
                  className="h-8 px-2 font-terminal text-sm bg-black border-[3px] border-double border-secondary rounded-none text-foreground focus:border-primary focus:outline-none"
                  placeholder="Brain Canvas/filename.excalidraw"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (showFilePicker === "save") handleSave(filePickerPath);
                      else handleLoad(filePickerPath);
                    }
                  }}
                />
              </div>

              {showFilePicker === "load" && (
                <div className="flex flex-col gap-1 min-h-0">
                  <label className="font-arcade text-[7px] text-muted-foreground">
                    EXISTING FILES
                  </label>
                  <div className="flex-1 overflow-y-auto max-h-[200px] border-[3px] border-double border-secondary/30 bg-black/60">
                    {loadingFiles ? (
                      <div className="p-3 font-terminal text-xs text-muted-foreground text-center">
                        Loading...
                      </div>
                    ) : vaultFiles.length === 0 ? (
                      <div className="p-3 font-terminal text-xs text-muted-foreground text-center">
                        No .excalidraw files found in Brain Canvas/
                      </div>
                    ) : (
                      vaultFiles.map((file) => (
                        <button
                          key={file}
                          onClick={() => {
                            setFilePickerPath(file);
                            handleLoad(file);
                          }}
                          className="w-full text-left px-3 py-1.5 font-terminal text-xs text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors border-b border-secondary/10 flex items-center gap-2"
                        >
                          <FileText className="w-3 h-3 shrink-0 text-muted-foreground" />
                          {file.split("/").pop()}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowFilePicker(null)}
                  className="px-3 h-7 font-terminal text-xs bg-transparent border-[3px] border-double border-secondary text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors rounded-none"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showFilePicker === "save") handleSave(filePickerPath);
                    else handleLoad(filePickerPath);
                  }}
                  disabled={isSaving || !filePickerPath.trim()}
                  className="px-3 h-7 font-terminal text-xs bg-primary text-primary-foreground hover:bg-primary/80 transition-colors rounded-none disabled:opacity-50"
                >
                  {showFilePicker === "save"
                    ? isSaving ? "Saving..." : "Save"
                    : "Load"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Mini preview thumbnails for template cards ─── */
function TemplateMiniPreview({ templateId }: { templateId: string }) {
  const boxClass = "absolute border border-primary/40 bg-primary/8";
  const labelClass = "absolute font-arcade text-[5px] text-primary/50";

  switch (templateId) {
    case "blank":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative flex items-center justify-center">
          <span className="font-terminal text-[10px] text-secondary/50">
            blank
          </span>
        </div>
      );
    case "mindmap":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative">
          <div
            className={boxClass}
            style={{
              left: "35%",
              top: "30%",
              width: "30%",
              height: "30%",
              borderColor: "hsl(0 100% 50% / 0.6)",
            }}
          />
          <div
            className={boxClass}
            style={{ left: "5%", top: "5%", width: "20%", height: "20%" }}
          />
          <div
            className={boxClass}
            style={{ right: "5%", top: "5%", width: "20%", height: "20%" }}
          />
          <div
            className={boxClass}
            style={{
              left: "5%",
              bottom: "5%",
              width: "20%",
              height: "20%",
            }}
          />
          <div
            className={boxClass}
            style={{
              right: "5%",
              bottom: "5%",
              width: "20%",
              height: "20%",
            }}
          />
        </div>
      );
    case "flowchart":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative">
          <div
            className={boxClass}
            style={{ left: "30%", top: "5%", width: "40%", height: "18%" }}
          />
          <div
            className={boxClass}
            style={{ left: "10%", top: "40%", width: "30%", height: "18%" }}
          />
          <div
            className={boxClass}
            style={{ right: "10%", top: "40%", width: "30%", height: "18%" }}
          />
          <div
            className={boxClass}
            style={{
              left: "30%",
              bottom: "5%",
              width: "40%",
              height: "18%",
            }}
          />
        </div>
      );
    case "cornell":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative">
          <div
            className={boxClass}
            style={{ left: 0, top: 0, width: "30%", height: "75%" }}
          />
          <div
            className={boxClass}
            style={{ right: 0, top: 0, width: "68%", height: "75%" }}
          />
          <div
            className={boxClass}
            style={{ left: 0, bottom: 0, width: "100%", height: "22%" }}
          />
          <span
            className={labelClass}
            style={{ left: "3px", top: "3px" }}
          >
            CUES
          </span>
          <span
            className={labelClass}
            style={{ right: "10px", top: "3px" }}
          >
            NOTES
          </span>
          <span
            className={labelClass}
            style={{ left: "3px", bottom: "4px" }}
          >
            SUMMARY
          </span>
        </div>
      );
    case "anatomy":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative">
          <div
            className={boxClass}
            style={{
              left: 0,
              top: 0,
              width: "65%",
              height: "100%",
              borderColor: "hsl(217 91% 60% / 0.4)",
            }}
          />
          <div
            className={boxClass}
            style={{ right: 0, top: 0, width: "32%", height: "45%" }}
          />
          <div
            className={boxClass}
            style={{ right: 0, bottom: 0, width: "32%", height: "50%" }}
          />
          <span
            className={labelClass}
            style={{ left: "15px", top: "25px" }}
          >
            IMAGE
          </span>
          <span
            className={labelClass}
            style={{ right: "8px", top: "3px" }}
          >
            LABELS
          </span>
          <span
            className={labelClass}
            style={{ right: "8px", bottom: "22px" }}
          >
            NOTES
          </span>
        </div>
      );
    case "comparison":
      return (
        <div className="w-[140px] h-[70px] border-[3px] border-double border-secondary/30 bg-black/60 relative">
          <div
            className={boxClass}
            style={{ left: 0, top: 0, width: "100%", height: "18%" }}
          />
          <div
            className={boxClass}
            style={{ left: 0, top: "22%", width: "48%", height: "55%" }}
          />
          <div
            className={boxClass}
            style={{ right: 0, top: "22%", width: "48%", height: "55%" }}
          />
          <div
            className={boxClass}
            style={{ left: 0, bottom: 0, width: "100%", height: "18%" }}
          />
          <span
            className={labelClass}
            style={{ left: "3px", top: "3px" }}
          >
            TOPIC
          </span>
          <span
            className={labelClass}
            style={{ left: "3px", top: "25px" }}
          >
            A
          </span>
          <span
            className={labelClass}
            style={{ right: "15px", top: "25px" }}
          >
            B
          </span>
          <span
            className={labelClass}
            style={{ left: "3px", bottom: "3px" }}
          >
            SHARED
          </span>
        </div>
      );
    default:
      return (
        <div className="w-[140px] h-[70px] border border-secondary/30 bg-black/60" />
      );
  }
}
