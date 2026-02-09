import { Clock, Zap } from "lucide-react";
import type { MethodBlock } from "@/api";

const CATEGORY_LABEL: Record<string, string> = {
  prepare: "PRIME",
  encode: "ENCODE",
  interrogate: "INTERROGATE",
  retrieve: "RETRIEVE",
  refine: "REFINE",
  overlearn: "OVERLEARN",
};

const CATEGORY_COLORS: Record<string, string> = {
  prepare: "border-yellow-500 bg-yellow-500/10",
  encode: "border-purple-500 bg-purple-500/10",
  interrogate: "border-green-500 bg-green-500/10",
  retrieve: "border-red-500 bg-red-500/10",
  refine: "border-blue-500 bg-blue-500/10",
  overlearn: "border-gray-500 bg-gray-500/10",
};

const CATEGORY_BADGE: Record<string, string> = {
  prepare: "bg-yellow-500/20 text-yellow-400",
  encode: "bg-purple-500/20 text-purple-400",
  interrogate: "bg-green-500/20 text-green-400",
  retrieve: "bg-red-500/20 text-red-400",
  refine: "bg-blue-500/20 text-blue-400",
  overlearn: "bg-gray-500/20 text-gray-400",
};

const ENERGY_ICON: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

interface MethodBlockCardProps {
  block: MethodBlock;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function MethodBlockCard({ block, compact, onClick, draggable, onDragStart }: MethodBlockCardProps) {
  const colorClass = CATEGORY_COLORS[block.category] || "border-secondary bg-secondary/10";
  const badgeClass = CATEGORY_BADGE[block.category] || "bg-secondary/20 text-muted-foreground";
  const energyClass = ENERGY_ICON[block.energy_cost] || "text-muted-foreground";

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
