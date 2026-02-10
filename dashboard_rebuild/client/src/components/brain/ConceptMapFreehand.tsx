import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tldraw, createTLStore, getSnapshot, loadSnapshot, exportToBlob, type TLShapeId } from "tldraw";
import "tldraw/tldraw.css";
import { Save, Download, Undo2, Redo2, FileInput } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConceptMapFreehandProps {
  className?: string;
  initialSnapshot?: unknown;
  initialTitle?: string;
  onImportMermaid?: (mermaid: string) => void;
}

export function ConceptMapFreehand({
  className,
  initialSnapshot,
  initialTitle = "Untitled",
  onImportMermaid,
}: ConceptMapFreehandProps) {
  const store = useMemo(() => createTLStore(), []);
  const editorRef = useRef<any>(null);
  const pendingClearHistoryRef = useRef(false);
  const [title, setTitle] = useState(initialTitle);
  const [isDirty, setIsDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showMermaidImport, setShowMermaidImport] = useState(false);
  const [mermaidInput, setMermaidInput] = useState("");
  const suppressDirtyRef = useRef(false);
  const { toast } = useToast();

  const updateUndoRedoState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const getCanUndo = editor?.getCanUndo;
    const getCanRedo = editor?.getCanRedo;

    const getNumUndos = editor?.history?.getNumUndos;
    const getNumRedos = editor?.history?.getNumRedos;

    const nextCanUndo =
      typeof getCanUndo === "function"
        ? !!getCanUndo.call(editor)
        : typeof getNumUndos === "function"
          ? getNumUndos.call(editor.history) > 0
          : false;

    const nextCanRedo =
      typeof getCanRedo === "function"
        ? !!getCanRedo.call(editor)
        : typeof getNumRedos === "function"
          ? getNumRedos.call(editor.history) > 0
          : false;

    setCanUndo(nextCanUndo);
    setCanRedo(nextCanRedo);
  }, []);

  useEffect(() => {
    if (!initialSnapshot) return;
    suppressDirtyRef.current = true;
    try {
      loadSnapshot(store, initialSnapshot as any);
      const editor = editorRef.current;
      if (typeof editor?.clearHistory === "function") editor.clearHistory();
      else pendingClearHistoryRef.current = true;
      setIsDirty(false);
      updateUndoRedoState();
    } catch (err) {
      console.error("Failed to load tldraw snapshot:", err);
    } finally {
      suppressDirtyRef.current = false;
    }
  }, [initialSnapshot, store, updateUndoRedoState]);

  useEffect(() => {
    const cleanup = store.listen(() => {
      if (suppressDirtyRef.current) return;
      setIsDirty(true);
      updateUndoRedoState();
    }, { source: "user", scope: "document" });
    return cleanup;
  }, [store, updateUndoRedoState]);

  const handleSave = useCallback(async () => {
    const snapshot = getSnapshot(store);
    const safeTitle = (title || "Untitled").trim() || "Untitled";
    const safeName = safeTitle.replace(/[/\\?%*:|"<>]/g, "-");
    const path = `Concept Maps/${safeName}.tldraw.json`;
    try {
      await api.obsidian.saveFile(path, JSON.stringify(snapshot, null, 2));
      setIsDirty(false);
      toast({ title: "Freehand map saved", description: path });
    } catch (err) {
      toast({
        title: "Save failed",
        description: String(err),
        variant: "destructive",
      });
    }
  }, [store, title, toast]);

  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor;
    editor.user.updateUserPreferences({ colorScheme: "dark" });
    if (pendingClearHistoryRef.current) {
      pendingClearHistoryRef.current = false;
      const clearHistory = editorRef.current?.clearHistory;
      if (typeof clearHistory === "function") clearHistory.call(editorRef.current);
    }
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(() => {
    const editor = editorRef.current;
    const undo = editor?.undo;
    if (typeof undo === "function") undo.call(editor);
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    const editor = editorRef.current;
    const redo = editor?.redo;
    if (typeof redo === "function") redo.call(editor);
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleExportPng = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) {
      toast({ title: "Export failed", description: "Editor not ready", variant: "destructive" });
      return;
    }
    const ids = Array.from<TLShapeId>(editor.getCurrentPageShapeIds());
    if (ids.length === 0) {
      toast({ title: "Nothing to export", description: "Add shapes to the canvas first", variant: "destructive" });
      return;
    }
    try {
      const blob = await exportToBlob({
        editor,
        ids,
        format: "png",
        opts: { scale: 1, background: true },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "concept-map").replace(/[/\\?%*:|"<>]/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PNG exported" });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  }, [title, toast]);

  const handleImportMermaidConfirm = useCallback(() => {
    const code = mermaidInput.trim();
    if (code && onImportMermaid) {
      onImportMermaid(code);
      setShowMermaidImport(false);
      setMermaidInput("");
    }
  }, [mermaidInput, onImportMermaid]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="section-block section-block-gap shrink-0 flex-row flex-wrap gap-2 items-center border-primary/20">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Map title..."
          className="h-9 min-w-[180px] text-sm font-terminal bg-black/40 border-primary/20 rounded-none flex-1 max-w-[240px]"
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2 rounded-none font-terminal text-xs border border-transparent"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2 rounded-none font-terminal text-xs"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="w-px h-5 bg-primary/20" />
        <Button
          size="sm"
          variant="ghost"
          className="h-9 px-2 rounded-none font-terminal text-xs"
          onClick={handleExportPng}
          title="Export PNG"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          PNG
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 px-2 rounded-none font-terminal text-xs"
          onClick={handleSave}
          title="Save to vault"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
        {onImportMermaid && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2 rounded-none font-terminal text-xs"
            onClick={() => setShowMermaidImport(true)}
            title="Import Mermaid (switch to Structured)"
          >
            <FileInput className="w-3.5 h-3.5 mr-1" />
            Import Mermaid
          </Button>
        )}
        <div className="flex items-center gap-1.5 text-xs font-terminal text-muted-foreground ml-auto">
          <span className={cn("w-2 h-2 rounded-full shrink-0", isDirty ? "bg-destructive" : "bg-success")} />
          {isDirty ? "Unsaved" : "Saved"}
        </div>
      </div>

      {showMermaidImport && (
        <div className="shrink-0 px-3 py-2 border-b border-primary/20 bg-black/40 flex flex-col gap-2">
          <p className="font-arcade text-[10px] text-primary">PASTE MERMAID → SWITCH TO STRUCTURED</p>
          <textarea
            value={mermaidInput}
            onChange={(e) => setMermaidInput(e.target.value)}
            placeholder="graph TD&#10;  A[Topic] --> B[Subtopic]"
            className="min-h-[60px] w-full px-2 py-1.5 font-mono text-xs bg-black/60 border border-primary/30 rounded-none text-foreground placeholder:text-muted-foreground resize-y"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" className="rounded-none font-terminal text-xs" onClick={handleImportMermaidConfirm} disabled={!mermaidInput.trim()}>
              Import & switch
            </Button>
            <Button size="sm" variant="outline" className="rounded-none font-terminal text-xs border-primary/30" onClick={() => { setShowMermaidImport(false); setMermaidInput(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 bg-black/80 border border-primary/20">
        <Tldraw store={store} onMount={handleMount} inferDarkMode={false} />
      </div>
    </div>
  );
}
