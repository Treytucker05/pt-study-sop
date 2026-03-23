import { useState, useCallback, useRef, type ReactElement } from "react";
import {
  FileText,
  Zap,
  Package,
  StickyNote,
  Target,
  PenTool,
  BookOpen,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkspacePanel } from "@/components/ui/WorkspacePanel";
import { cn } from "@/lib/utils";

// ── Panel registry types ──────────────────────────────────────────────

export interface PanelRegistryEntry {
  type: string;
  label: string;
  icon: LucideIcon;
  defaultSize: { width: number; height: number };
  allowMultiple: boolean;
}

export const PANEL_REGISTRY: PanelRegistryEntry[] = [
  { type: "material-viewer", label: "Material Viewer", icon: FileText, defaultSize: { width: 400, height: 500 }, allowMultiple: false },
  { type: "method-runner",   label: "Method Runner",   icon: Zap,       defaultSize: { width: 400, height: 500 }, allowMultiple: true },
  { type: "packet",          label: "Packet",          icon: Package,   defaultSize: { width: 350, height: 600 }, allowMultiple: false },
  { type: "notes",           label: "Notes",           icon: StickyNote, defaultSize: { width: 350, height: 400 }, allowMultiple: true },
  { type: "objectives",      label: "Objectives",      icon: Target,    defaultSize: { width: 350, height: 400 }, allowMultiple: false },
  { type: "excalidraw",      label: "Excalidraw",      icon: PenTool,   defaultSize: { width: 500, height: 400 }, allowMultiple: false },
  { type: "obsidian",        label: "Obsidian",        icon: BookOpen,  defaultSize: { width: 400, height: 500 }, allowMultiple: false },
];

// ── Panel instance state ──────────────────────────────────────────────

export interface PanelInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────

const STAGGER_OFFSET = 30;

function registryFor(type: string): PanelRegistryEntry | undefined {
  return PANEL_REGISTRY.find((e) => e.type === type);
}

let panelCounter = 0;
function nextPanelId(type: string): string {
  panelCounter += 1;
  return `${type}-${panelCounter}`;
}

function buildDefaultLayout(): PanelInstance[] {
  return [
    {
      id: nextPanelId("material-viewer"),
      type: "material-viewer",
      position: { x: 20, y: 20 },
      size: { width: 400, height: 500 },
      collapsed: false,
    },
    {
      id: nextPanelId("method-runner"),
      type: "method-runner",
      position: { x: 440, y: 20 },
      size: { width: 400, height: 500 },
      collapsed: false,
    },
    {
      id: nextPanelId("packet"),
      type: "packet",
      position: { x: 860, y: 20 },
      size: { width: 350, height: 600 },
      collapsed: false,
    },
  ];
}

// ── Component ─────────────────────────────────────────────────────────

export function WorkspaceCanvas(): ReactElement {
  const [panels, setPanels] = useState<PanelInstance[]>(buildDefaultLayout);
  const [menuOpen, setMenuOpen] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Spawn a new panel or flash an existing single-instance one
  const spawnPanel = useCallback(
    (type: string) => {
      const entry = registryFor(type);
      if (!entry) return;

      // Single-instance guard: if it already exists, flash it
      if (!entry.allowMultiple) {
        const existing = panels.find((p) => p.type === type);
        if (existing) {
          // Flash the existing panel briefly
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          setFlashId(existing.id);
          flashTimerRef.current = setTimeout(() => setFlashId(null), 600);
          setMenuOpen(false);
          return;
        }
      }

      const instanceCount = panels.length;
      const newPanel: PanelInstance = {
        id: nextPanelId(type),
        type,
        position: {
          x: 20 + instanceCount * STAGGER_OFFSET,
          y: 20 + instanceCount * STAGGER_OFFSET,
        },
        size: { ...entry.defaultSize },
        collapsed: false,
      };

      setPanels((prev) => [...prev, newPanel]);
      setMenuOpen(false);
    },
    [panels],
  );

  const closePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateCollapsed = useCallback((id: string, collapsed: boolean) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, collapsed } : p)),
    );
  }, []);

  const updatePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setPanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, position } : p)),
      );
    },
    [],
  );

  const updateSize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setPanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, size } : p)),
      );
    },
    [],
  );

  return (
    <div className="relative flex-1 min-h-[600px] overflow-hidden bg-background/50">
      {/* ── Active panels ─────────────────────────────────────────── */}
      {panels.map((panel) => {
        const entry = registryFor(panel.type);
        if (!entry) return null;
        const Icon = entry.icon;

        return (
          <WorkspacePanel
            key={panel.id}
            id={panel.id}
            title={entry.label}
            defaultPosition={panel.position}
            defaultSize={panel.size}
            collapsed={panel.collapsed}
            onCollapsedChange={(c) => updateCollapsed(panel.id, c)}
            onPositionChange={(pos) => updatePosition(panel.id, pos)}
            onSizeChange={(s) => updateSize(panel.id, s)}
            onClose={() => closePanel(panel.id)}
            className={cn(
              flashId === panel.id && "ring-2 ring-primary animate-pulse",
            )}
          >
            {/* Placeholder content */}
            <div className="flex flex-col items-center justify-center h-full gap-2 text-primary/40">
              <Icon className="w-8 h-8" />
              <span className="font-terminal text-xs uppercase tracking-wider">
                {entry.label}
              </span>
            </div>
          </WorkspacePanel>
        );
      })}

      {/* ── Add-panel button + dropdown ───────────────────────────── */}
      <div className="absolute bottom-4 right-4 z-50">
        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute bottom-12 right-0 w-52",
              "bg-background/95 backdrop-blur-sm border border-primary/20 rounded-sm",
              "shadow-[0_4px_12px_rgba(0,0,0,0.4)] py-1",
            )}
          >
            {PANEL_REGISTRY.map((entry) => {
              const Icon = entry.icon;
              const alreadyOpen =
                !entry.allowMultiple &&
                panels.some((p) => p.type === entry.type);

              return (
                <button
                  key={entry.type}
                  role="menuitem"
                  type="button"
                  aria-label={entry.label}
                  disabled={alreadyOpen}
                  onClick={() => spawnPanel(entry.type)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-left",
                    "font-terminal text-xs uppercase tracking-wider",
                    alreadyOpen
                      ? "text-primary/25 cursor-not-allowed"
                      : "text-primary/70 hover:bg-primary/10 hover:text-primary",
                    "transition-colors",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {entry.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-label="Add panel"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-primary/10 border border-primary/30 text-primary/70",
            "hover:bg-primary/20 hover:text-primary transition-colors",
            "shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
