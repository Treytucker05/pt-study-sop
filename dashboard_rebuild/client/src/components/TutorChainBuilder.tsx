import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorMethodBlock } from "@/lib/api";
import { CATEGORY_COLORS, CATEGORY_LABELS, type MethodCategory } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TEXT_SECTION_LABEL,
  TEXT_MUTED,
  ICON_SM,
} from "@/lib/theme";
import { ChevronDown, ChevronRight, GripVertical, X, Clock } from "lucide-react";

const CATEGORY_ORDER: MethodCategory[] = [
  "prepare",
  "encode",
  "interrogate",
  "retrieve",
  "refine",
  "overlearn",
];

interface TutorChainBuilderProps {
  selectedBlockIds: number[];
  setSelectedBlockIds: (ids: number[]) => void;
}

export function TutorChainBuilder({
  selectedBlockIds,
  setSelectedBlockIds,
}: TutorChainBuilderProps) {
  const { data: allBlocks = [], isLoading } = useQuery<TutorMethodBlock[]>({
    queryKey: ["tutor-method-blocks"],
    queryFn: () => api.tutor.getMethodBlocks(),
  });

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const blockMap = useMemo(() => {
    const m = new Map<number, TutorMethodBlock>();
    for (const b of allBlocks) m.set(b.id, b);
    return m;
  }, [allBlocks]);

  const byCategory = useMemo(() => {
    const groups: Record<string, TutorMethodBlock[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    for (const b of allBlocks) {
      if (!groups[b.category]) groups[b.category] = [];
      groups[b.category].push(b);
    }
    return groups;
  }, [allBlocks]);

  const selectedBlocks = useMemo(
    () => selectedBlockIds.map((id) => blockMap.get(id)).filter(Boolean) as TutorMethodBlock[],
    [selectedBlockIds, blockMap],
  );

  const totalDuration = useMemo(
    () => selectedBlocks.reduce((sum, b) => sum + (b.default_duration_min || 0), 0),
    [selectedBlocks],
  );

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const addBlock = (id: number) => {
    setSelectedBlockIds([...selectedBlockIds, id]);
  };

  const removeBlock = (index: number) => {
    setSelectedBlockIds(selectedBlockIds.filter((_, i) => i !== index));
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const ids = [...selectedBlockIds];
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(idx, 0, moved);
    setSelectedBlockIds(ids);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  if (isLoading) {
    return <div className={`${TEXT_MUTED} p-2`}>Loading blocks...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Block picker by category */}
      <div className={`${TEXT_SECTION_LABEL} text-xs`}>BLOCK PICKER</div>
      <ScrollArea className="h-36 border-2 border-primary/30 bg-black/20">
        <div className="p-1">
          {CATEGORY_ORDER.map((cat) => {
            const blocks = byCategory[cat] || [];
            if (blocks.length === 0) return null;
            const isCollapsed = collapsedCategories.has(cat);
            const color = CATEGORY_COLORS[cat];
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-1 px-2 py-1 text-left hover:bg-black/30 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" style={{ color }} />
                  ) : (
                    <ChevronDown className="w-3 h-3" style={{ color }} />
                  )}
                  <span className="font-arcade text-xs uppercase" style={{ color }}>
                    {CATEGORY_LABELS[cat]} ({blocks.length})
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="pl-4 pb-1 space-y-0.5">
                    {blocks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => addBlock(b.id)}
                        className="w-full text-left px-2 py-1 text-xs font-terminal text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors flex items-center justify-between"
                      >
                        <span className="truncate">{b.name}</span>
                        <span className={`${TEXT_MUTED} text-xs shrink-0 ml-2`}>
                          ~{b.default_duration_min}m
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Chain dropzone */}
      <div className={`${TEXT_SECTION_LABEL} text-xs flex items-center justify-between`}>
        <span>YOUR CHAIN</span>
        {selectedBlocks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedBlockIds([])}
            className="h-5 px-2 text-xs font-arcade text-destructive hover:text-destructive"
          >
            CLEAR
          </Button>
        )}
      </div>

      <div className="border-2 border-primary/30 bg-black/20 min-h-[60px]">
        {selectedBlocks.length === 0 ? (
          <div className={`${TEXT_MUTED} text-xs p-3 text-center`}>
            Click blocks above to build your study chain
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {selectedBlocks.map((b, idx) => {
              const color = CATEGORY_COLORS[b.category as MethodCategory] || "#888";
              return (
                <div
                  key={`${b.id}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-1 px-2 py-1 border transition-all ${
                    dragOverIdx === idx
                      ? "border-primary bg-primary/20"
                      : "border-primary/20 bg-black/30"
                  }`}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/40 cursor-grab shrink-0" />
                  <Badge
                    variant="outline"
                    className="text-xs rounded-none px-1 h-4 shrink-0"
                    style={{ borderColor: color, color }}
                  >
                    {b.category.slice(0, 3).toUpperCase()}
                  </Badge>
                  <span className="font-terminal text-xs text-foreground/80 truncate flex-1">
                    {b.name}
                  </span>
                  <span className={`${TEXT_MUTED} text-xs shrink-0`}>~{b.default_duration_min}m</span>
                  <button
                    onClick={() => removeBlock(idx)}
                    className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total duration */}
      {selectedBlocks.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className={`${TEXT_MUTED} text-xs`}>
            {selectedBlocks.length} block{selectedBlocks.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 font-terminal text-xs text-primary">
            <Clock className={ICON_SM} />
            ~{totalDuration} min
          </span>
        </div>
      )}
    </div>
  );
}
