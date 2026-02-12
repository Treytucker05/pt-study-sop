import { useCallback, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Download,
  FileInput,
  FileText,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  Undo2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ConceptMapStructured } from "./ConceptMapStructured";
import { ConceptMapFreehand } from "./ConceptMapFreehand";
import { MindMapView } from "@/components/MindMapView";
import { VaultGraphView } from "@/components/VaultGraphView";
import {
  EMPTY_GRAPH_STATUS,
  type GraphCanvasCommand,
  type GraphCanvasMode,
  type GraphCanvasStatus,
} from "./graph-canvas-types";

const MODES: { id: GraphCanvasMode; label: string }[] = [
  { id: "mindmap", label: "Mind Map" },
  { id: "structured", label: "Structured" },
  { id: "freehand", label: "Freehand" },
  { id: "vault", label: "Vault Graph" },
];

const EMPTY_BY_MODE: Record<GraphCanvasMode, GraphCanvasStatus> = {
  mindmap: { ...EMPTY_GRAPH_STATUS, mode: "mindmap", supportsMermaid: true, supportsDraw: true },
  structured: { ...EMPTY_GRAPH_STATUS, mode: "structured", supportsMermaid: true },
  freehand: { ...EMPTY_GRAPH_STATUS, mode: "freehand", supportsDraw: true },
  vault: { ...EMPTY_GRAPH_STATUS, mode: "vault" },
};

const TEMPLATES: { name: string; mermaid: string }[] = [
  {
    name: "Simple Mind Map",
    mermaid: "graph LR\n  A[Topic] --> B[Branch A]\n  A --> C[Branch B]\n  B --> D[Detail]\n  C --> E[Detail]",
  },
  {
    name: "Decision Flow",
    mermaid: "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action 1]\n  B -->|No| D[Action 2]\n  C --> E[End]\n  D --> E",
  },
  {
    name: "Concept Chain",
    mermaid: "graph TD\n  A[Concept 1] --> B[Concept 2]\n  B --> C[Concept 3]\n  C --> D[Clinical Link]",
  },
];

export function UnifiedBrainCanvas() {
  const [mode, setMode] = useState<GraphCanvasMode>("mindmap");
  const [command, setCommand] = useState<GraphCanvasCommand | null>(null);
  const [statusByMode, setStatusByMode] = useState<Record<GraphCanvasMode, GraphCanvasStatus>>(EMPTY_BY_MODE);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [studyBusy, setStudyBusy] = useState(false);
  const seqRef = useRef(0);
  const { toast } = useToast();

  const currentStatus = statusByMode[mode] || EMPTY_BY_MODE[mode];

  const issueCommand = useCallback((
    type: GraphCanvasCommand["type"],
    payload?: unknown,
    targetOverride?: GraphCanvasMode
  ) => {
    const target = targetOverride || mode;
    seqRef.current += 1;
    setCommand({
      id: seqRef.current,
      target,
      type,
      payload,
    });
  }, [mode]);

  const handleStatusChange = useCallback((status: GraphCanvasStatus) => {
    setStatusByMode((prev) => ({ ...prev, [status.mode]: status }));
  }, []);

  const applyImport = useCallback(() => {
    const code = importText.trim();
    if (!code) return;
    const target = mode === "freehand" ? "structured" : mode;
    if (target === "vault") {
      toast({ title: "Import not available", description: "Switch to Mind Map or Structured mode", variant: "destructive" });
      return;
    }
    if (mode === "freehand") setMode("structured");
    issueCommand("import_mermaid", code, target);
    setShowImport(false);
    setImportText("");
  }, [importText, mode, issueCommand, toast]);

  const saveStudyAction = useCallback(async (action: string) => {
    const labels = currentStatus.selectedLabels.length > 0
      ? currentStatus.selectedLabels
      : [`${mode} selection`];
    const lines = [
      `## ${new Date().toISOString()} — ${action}`,
      `- Mode: ${mode}`,
      `- Labels: ${labels.join(", ")}`,
      "",
    ];
    try {
      setStudyBusy(true);
      await api.obsidian.append("Study Sessions/Brain Canvas Actions.md", `${lines.join("\n")}\n`);
      toast({ title: "Study action saved", description: action });
    } catch (err) {
      toast({ title: "Action failed", description: String(err), variant: "destructive" });
    } finally {
      setStudyBusy(false);
    }
  }, [currentStatus.selectedLabels, mode, toast]);

  const canUseGraphCommands = mode !== "vault";
  const canUseMermaid = currentStatus.supportsMermaid && mode !== "vault";

  const activeView = useMemo(() => {
    if (mode === "mindmap") {
      return (
        <MindMapView
          hideToolbar
          externalCommand={command}
          onStatusChange={handleStatusChange}
        />
      );
    }
    if (mode === "structured") {
      return (
        <ConceptMapStructured
          hideToolbar
          externalCommand={command}
          onStatusChange={handleStatusChange}
        />
      );
    }
    if (mode === "freehand") {
      return (
        <ConceptMapFreehand
          hideToolbar
          externalCommand={command}
          onStatusChange={handleStatusChange}
        />
      );
    }
    return <VaultGraphView />;
  }, [mode, command, handleStatusChange]);

  return (
    <div className="flex flex-col h-full">
      <div className="tab-sub-bar" role="tablist" aria-label="Canvas mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setMode(item.id)}
            className={cn("tab-sub-item", mode === item.id && "active")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 px-2 py-1 border-b border-primary/20 bg-black/40 shrink-0 flex-wrap">
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none" onClick={() => issueCommand("undo")} disabled={!canUseGraphCommands || !currentStatus.canUndo} title="Undo">
          <Undo2 className="w-3 h-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none" onClick={() => issueCommand("redo")} disabled={!canUseGraphCommands || !currentStatus.canRedo} title="Redo">
          <Redo2 className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-primary/20" />
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => issueCommand("save")} disabled={!canUseGraphCommands} title="Save">
          <Save className="w-3 h-3 mr-1" />Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => setShowImport((v) => !v)} disabled={!canUseMermaid} title="Import Mermaid">
          <FileInput className="w-3 h-3 mr-1" />Import
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => issueCommand("export_mermaid")} disabled={!canUseMermaid} title="Export Mermaid">
          <FileText className="w-3 h-3 mr-1" />Mermaid
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => issueCommand("export_png")} disabled={!canUseGraphCommands} title="Export PNG">
          <Download className="w-3 h-3 mr-1" />PNG
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => issueCommand("add_node")} disabled={!canUseGraphCommands} title="Add node">
          <Plus className="w-3 h-3 mr-1" />Add
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-1.5 rounded-none font-terminal text-xs"
          onClick={() => {
            const text = window.prompt("Find text");
            if (text) window.find(text);
          }}
          title="Search"
        >
          <Search className="w-3 h-3 mr-1" />Search
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-1.5 rounded-none font-terminal text-xs" onClick={() => setTemplateOpen((v) => !v)} disabled={!canUseMermaid} title="Templates">
          <Workflow className="w-3 h-3 mr-1" />Templates
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-1.5 rounded-none font-terminal text-xs"
          onClick={() => toast({ title: "Canvas settings", description: "Direction, layout, and draw controls live in mode tools." })}
          title="Settings"
        >
          <Settings2 className="w-3 h-3 mr-1" />Settings
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs font-terminal text-muted-foreground">
          <span>{currentStatus.nodeCount}N / {currentStatus.edgeCount}E</span>
          <span className={cn("w-2 h-2 rounded-full", currentStatus.isDirty ? "bg-destructive" : "bg-success")} />
          <span>{currentStatus.isDirty ? "Unsaved" : "Saved"}</span>
        </div>
      </div>

      {(showImport || templateOpen) && (
        <div className="shrink-0 px-3 py-2 border-b border-primary/20 bg-black/40 flex flex-col gap-2">
          {showImport && (
            <>
              <p className="font-arcade text-xs text-primary">IMPORT MERMAID</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="graph TD&#10;  A[Topic] --> B[Branch]"
                className="min-h-[72px] w-full px-2 py-1.5 font-mono text-xs bg-black/60 border border-primary/30 rounded-none text-foreground placeholder:text-muted-foreground resize-y"
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-none font-terminal text-xs" onClick={applyImport} disabled={!importText.trim()}>
                  Import
                </Button>
                <Button size="sm" variant="outline" className="rounded-none font-terminal text-xs border-primary/30" onClick={() => setShowImport(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
          {templateOpen && (
            <>
              <p className="font-arcade text-xs text-primary">TEMPLATES</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    className="text-left px-3 py-2 border border-primary/30 hover:border-primary/60 hover:bg-primary/10 rounded-none"
                    onClick={() => {
                      const target = mode === "freehand" ? "structured" : mode;
                      if (target === "vault") return;
                      if (mode === "freehand") setMode("structured");
                      issueCommand("import_mermaid", template.mermaid, target);
                      setTemplateOpen(false);
                    }}
                  >
                    <div className="font-arcade text-xs text-primary">{template.name}</div>
                    <div className="font-terminal text-xs text-muted-foreground truncate">
                      {template.mermaid.split("\n")[0]}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 px-2 py-1 border-b border-primary/20 bg-black/30 shrink-0 flex-wrap">
        <span className="font-arcade text-[10px] text-muted-foreground mr-1">STUDY TOOLS</span>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 rounded-none font-terminal text-xs" onClick={() => void saveStudyAction("Generate Summary")} disabled={studyBusy}>
          <BookOpen className="w-3 h-3 mr-1" />Summary
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 rounded-none font-terminal text-xs" onClick={() => void saveStudyAction("Generate Quiz")} disabled={studyBusy}>
          Quiz
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 rounded-none font-terminal text-xs" onClick={() => void saveStudyAction("Generate Flashcards")} disabled={studyBusy}>
          Cards
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-1.5 rounded-none font-terminal text-xs" onClick={() => void saveStudyAction("Mark Weak Area")} disabled={studyBusy}>
          Weak
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView}
      </div>
    </div>
  );
}
