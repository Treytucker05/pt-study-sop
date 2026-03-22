import { Clock, Zap } from "lucide-react";
import type { MethodBlock } from "@/api";
import { ENERGY_COLORS, ENERGY_DEFAULT, CONTROL_PLANE_COLORS, CONTROL_PLANE_DEFAULT } from "@/lib/colors";
import { getMethodStageBadgeLabel, getMethodStageColorKey } from "@/lib/controlStages";

interface MethodBlockCardProps {
  block: MethodBlock;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  showLegacyCategory?: boolean;
  hideHeader?: boolean;
}

export default function MethodBlockCard({
  block,
  compact,
  onClick,
  draggable,
  onDragStart,
  showLegacyCategory,
  hideHeader,
}: MethodBlockCardProps) {
  const stageColors = CONTROL_PLANE_COLORS[getMethodStageColorKey(block)] || CONTROL_PLANE_DEFAULT;
  const colorClass = stageColors.border;
  const badgeClass = stageColors.badge;
  const stageLabel = getMethodStageBadgeLabel(block);
  const energyClass = ENERGY_COLORS[block.energy_cost] || ENERGY_DEFAULT;
  const isInteractive = Boolean(onClick || draggable);
  const Wrapper = isInteractive ? "button" : "div";

  if (compact) {
    return (
      <Wrapper
        {...(isInteractive ? { type: "button" as const, onClick } : {})}
        className={`${hideHeader ? "" : `border-2 ${colorClass}`} p-2 rounded-none transition-opacity ${isInteractive ? "w-full cursor-pointer text-left hover:opacity-80" : ""}`}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between gap-2">
            <span className="font-terminal text-base truncate">{block.name}</span>
            <span className={`text-xs font-arcade px-1 py-0.5 rounded-none ${badgeClass}`}>
              {stageLabel}
            </span>
          </div>
        )}
        {showLegacyCategory && (
          <div className="text-ui-2xs font-terminal text-muted-foreground/70">legacy: {block.category}</div>
        )}
        {hideHeader && block.description && (
          <p className="font-terminal text-xs text-muted-foreground line-clamp-2">{block.description}</p>
        )}
        {hideHeader && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-terminal mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {block.default_duration_min}m
            </span>
            <span className={`flex items-center gap-1 ${energyClass}`}>
              <Zap className="w-3 h-3" />
              {block.energy_cost}
            </span>
          </div>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      {...(isInteractive ? { type: "button" as const, onClick } : {})}
      className={`border-2 ${colorClass} p-3 rounded-none transition-opacity ${isInteractive ? "w-full cursor-pointer text-left hover:opacity-80" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-arcade text-sm">{block.name}</span>
        <span className={`text-xs font-arcade px-1.5 py-0.5 rounded-none ${badgeClass}`}>
          {stageLabel}
        </span>
      </div>
      {showLegacyCategory && (
        <div className="text-xs font-terminal text-muted-foreground/70 mb-2">legacy: {block.category}</div>
      )}
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
    </Wrapper>
  );
}
