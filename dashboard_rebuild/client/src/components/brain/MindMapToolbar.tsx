import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  Plus,
  Trash2,
  Palette,
  LayoutGrid,
  ArrowUpDown,
  ArrowLeftRight,
  Pencil,
  Download,
  Save,
  Circle,
  Square,
  Diamond,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCEPT_NODE_COLORS, CONCEPT_EDGE_COLORS } from "@/lib/colors";
import { MIND_MAP_SHAPES, type MindMapShape } from "./MindMapNodes";

const SHAPE_ICONS: Record<MindMapShape, React.ElementType> = {
  rectangle: Square,
  circle: Circle,
  diamond: Diamond,
  hexagon: Hexagon,
};

interface MindMapToolbarProps {
  onSeedMap: () => void;
  onAddNode: (shape: MindMapShape) => void;
  onDeleteSelected: () => void;
  onSetNodeColor: (idx: number) => void;
  onSetEdgeColor: (stroke: string) => void;
  onSetShape: (shape: MindMapShape) => void;
  onAutoLayout: () => void;
  onToggleDirection: () => void;
  direction: "TB" | "LR";
  drawMode: boolean;
  onToggleDraw: () => void;
  onExportPng: () => void;
  onSaveToVault: () => void;
  nodeCount: number;
  edgeCount: number;
  isDirty: boolean;
}

const BTN = "h-6 px-1.5 text-xs font-terminal";

export function MindMapToolbar({
  onSeedMap,
  onAddNode,
  onDeleteSelected,
  onSetNodeColor,
  onSetEdgeColor,
  onSetShape,
  onAutoLayout,
  onToggleDirection,
  direction,
  drawMode,
  onToggleDraw,
  onExportPng,
  onSaveToVault,
  nodeCount,
  edgeCount,
  isDirty,
}: MindMapToolbarProps) {
  const [showDropdown, setShowDropdown] = useState<"add" | "color" | "shape" | null>(null);

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-secondary/30 bg-black/40 shrink-0 flex-wrap">
      <Button size="sm" variant="ghost" className={BTN} onClick={onSeedMap} title="Seed from curriculum">
        <Sprout className="w-3 h-3" />
      </Button>
      <div className="w-px h-4 bg-secondary/30" />

      {/* Add Node dropdown */}
      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          className={BTN}
          onClick={() => setShowDropdown(showDropdown === "add" ? null : "add")}
          title="Add node"
        >
          <Plus className="w-3 h-3" />
        </Button>
        {showDropdown === "add" && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-black border-2 border-primary/50 z-50 space-y-0.5 min-w-[120px]">
            {MIND_MAP_SHAPES.map((s) => {
              const Icon = SHAPE_ICONS[s];
              return (
                <button
                  key={s}
                  onClick={() => { onAddNode(s); setShowDropdown(null); }}
                  className="flex items-center gap-2 w-full px-2 py-1 text-xs font-terminal text-secondary-foreground hover:bg-primary/20"
                >
                  <Icon className="w-3 h-3" />
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Button size="sm" variant="ghost" className={BTN} onClick={onDeleteSelected} title="Delete selected">
        <Trash2 className="w-3 h-3" />
      </Button>

      {/* Color picker */}
      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          className={BTN}
          onClick={() => setShowDropdown(showDropdown === "color" ? null : "color")}
          title="Color selected"
        >
          <Palette className="w-3 h-3" />
        </Button>
        {showDropdown === "color" && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-black border-2 border-primary/50 z-50 space-y-2 min-w-[160px]">
            <p className="font-terminal text-xs text-muted-foreground">NODE COLORS</p>
            <div className="flex flex-wrap gap-1">
              {CONCEPT_NODE_COLORS.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => { onSetNodeColor(i); setShowDropdown(null); }}
                  className={cn("w-5 h-5 border-2 rounded-none", c.border, c.bg)}
                  title={c.name}
                />
              ))}
            </div>
            <p className="font-terminal text-xs text-muted-foreground pt-1">EDGE COLORS</p>
            <div className="flex flex-wrap gap-1">
              {CONCEPT_EDGE_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => { onSetEdgeColor(c.stroke); setShowDropdown(null); }}
                  className="w-5 h-5 border-2 border-secondary/50 rounded-none"
                  style={{ backgroundColor: c.stroke }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shape picker */}
      <div className="relative">
        <Button
          size="sm"
          variant="ghost"
          className={BTN}
          onClick={() => setShowDropdown(showDropdown === "shape" ? null : "shape")}
          title="Change shape"
        >
          <Hexagon className="w-3 h-3" />
        </Button>
        {showDropdown === "shape" && (
          <div className="absolute top-full left-0 mt-1 p-1 bg-black border-2 border-primary/50 z-50 space-y-0.5 min-w-[120px]">
            {MIND_MAP_SHAPES.map((s) => {
              const Icon = SHAPE_ICONS[s];
              return (
                <button
                  key={s}
                  onClick={() => { onSetShape(s); setShowDropdown(null); }}
                  className="flex items-center gap-2 w-full px-2 py-1 text-xs font-terminal text-secondary-foreground hover:bg-primary/20"
                >
                  <Icon className="w-3 h-3" />
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-secondary/30" />
      <Button size="sm" variant="ghost" className={BTN} onClick={onAutoLayout} title="Auto layout">
        <LayoutGrid className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" className={BTN} onClick={onToggleDirection} title={`Direction: ${direction}`}>
        {direction === "TB" ? <ArrowUpDown className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />}
      </Button>

      <div className="w-px h-4 bg-secondary/30" />
      <Button
        size="sm"
        variant="ghost"
        className={cn(BTN, drawMode && "bg-primary/20 text-primary")}
        onClick={onToggleDraw}
        title="Draw mode"
      >
        <Pencil className="w-3 h-3" />
      </Button>

      <div className="w-px h-4 bg-secondary/30" />
      <Button size="sm" variant="ghost" className={BTN} onClick={onExportPng} title="Export PNG">
        <Download className="w-3 h-3" />
      </Button>
      <Button size="sm" variant="ghost" className={BTN} onClick={onSaveToVault} title="Save to vault">
        <Save className="w-3 h-3" />
      </Button>

      <div className="ml-auto flex items-center gap-2 text-xs font-terminal text-muted-foreground">
        <span>{nodeCount}N / {edgeCount}E</span>
        <span className={cn("w-2 h-2 rounded-full", isDirty ? "bg-destructive" : "bg-success")} />
        <span>{isDirty ? "Unsaved" : "Saved"}</span>
      </div>
    </div>
  );
}
