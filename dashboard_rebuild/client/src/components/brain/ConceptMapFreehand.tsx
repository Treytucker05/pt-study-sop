import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tldraw, createTLStore, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConceptMapFreehandProps {
  className?: string;
  initialSnapshot?: unknown;
  initialTitle?: string;
}

export function ConceptMapFreehand({
  className,
  initialSnapshot,
  initialTitle = "Untitled",
}: ConceptMapFreehandProps) {
  const store = useMemo(() => createTLStore(), []);
  const [title, setTitle] = useState(initialTitle);
  const [isDirty, setIsDirty] = useState(false);
  const suppressDirtyRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!initialSnapshot) return;
    suppressDirtyRef.current = true;
    try {
      loadSnapshot(store, initialSnapshot as any);
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to load tldraw snapshot:", err);
    } finally {
      suppressDirtyRef.current = false;
    }
  }, [initialSnapshot, store]);

  useEffect(() => {
    const cleanup = store.listen(() => {
      if (suppressDirtyRef.current) return;
      setIsDirty(true);
    });
    return cleanup;
  }, [store]);

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
    editor.user.updateUserPreferences({ colorScheme: "dark" });
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Freehand map title..."
          className="h-6 text-[10px] font-arcade bg-transparent border-none px-1 text-primary focus-visible:ring-0 w-[200px]"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[9px] font-terminal"
          onClick={handleSave}
        >
          <Save className="w-3 h-3 mr-1" />
          Save
        </Button>
        <div className="flex items-center gap-1 text-[9px] font-terminal text-muted-foreground ml-auto">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isDirty ? "bg-red-500" : "bg-green-500"
            )}
          />
          {isDirty ? "Unsaved" : "Saved"}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-black/80 border border-secondary/20">
        <Tldraw store={store} onMount={handleMount} inferDarkMode={false} />
      </div>
    </div>
  );
}
