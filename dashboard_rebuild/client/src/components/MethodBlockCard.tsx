import { Clock, Zap } from "lucide-react";
import type { MethodBlock } from "@/api";
import { PEIRRO_COLORS, PEIRRO_DEFAULT, ENERGY_COLORS, ENERGY_DEFAULT } from "@/lib/colors";

const CATEGORY_LABEL: Record<string, string> = {
  prepare: "PRIME",
  encode: "ENCODE",
  interrogate: "INTERROGATE",
  retrieve: "RETRIEVE",
  refine: "REFINE",
  overlearn: "OVERLEARN",
};

interface MethodBlockCardProps {
  block: MethodBlock;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function MethodBlockCard({ block, compact, onClick, draggable, onDragStart }: MethodBlockCardProps) {
  const cat = PEIRRO_COLORS[block.category] || PEIRRO_DEFAULT;
  const colorClass = cat.border;
  const badgeClass = cat.badge;
  const energyClass = ENERGY_COLORS[block.energy_cost] || ENERGY_DEFAULT;

  if (compact) {
    return (
      <div
        className={`border-2 ${colorClass} p-2 rounded-none cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-terminal text-base truncate">{block.name}</span>
          <span className={`text-xs font-arcade px-1 py-0.5 rounded-none ${badgeClass}`}>
            {CATEGORY_LABEL[block.category] || block.category.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 ${colorClass} p-3 rounded-none cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-arcade text-sm">{block.name}</span>
        <span className={`text-xs font-arcade px-1.5 py-0.5 rounded-none ${badgeClass}`}>
          {CATEGORY_LABEL[block.category] || block.category.toUpperCase()}
        </span>
      </div>
      {block.description && (
        <p className="font-terminal text-lg text-muted-foreground mb-2 line-clamp-2">
          {block.description}
        </p>
      )}
      {block.evidence && (
        <p className="font-terminal text-base text-primary/50 italic mb-2 line-clamp-1">
          {block.evidence}
        </p>
      )}
      <div className="flex items-center gap-3 text-base text-muted-foreground font-terminal">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {block.default_duration_min}m
        </span>
        <span className={`flex items-center gap-1 ${energyClass}`}>
          <Zap className="w-4 h-4" />
          {block.energy_cost}
        </span>
        {block.best_stage && (
          <span className="text-primary/60">{block.best_stage.replace("_", " ")}</span>
        )}
      </div>
      {block.tags && block.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {block.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-sm font-terminal bg-secondary/30 px-1 py-0.5 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
