import { type ReactElement, useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import type { MethodBlock } from "@/api";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface PrimingBlockBarProps {
  onBlockActivate: (block: MethodBlock) => void;
  activeBlockId?: number;
}

const ENERGY_DOT: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

export function PrimingBlockBar({
  onBlockActivate,
  activeBlockId,
}: PrimingBlockBarProps): ReactElement {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const { data: allBlocks = [] } = useQuery({
    queryKey: ["methodBlocks"],
    queryFn: () => api.tutor.getMethodBlocks(),
  });

  const primeBlocks = allBlocks.filter(
    (b) => b.control_stage === "PRIME",
  );

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleActivate = useCallback(
    (block: MethodBlock) => {
      onBlockActivate(block);
      setExpandedId(null);
    },
    [onBlockActivate],
  );

  const expandedBlock = primeBlocks.find((b) => b.id === expandedId) ?? null;

  return (
    <div ref={barRef} className="relative bg-black/80 border-t border-primary/20">
      {/* Expanded detail overlay */}
      {expandedBlock && (
        <div
          className="absolute bottom-full left-0 right-0 z-50 mx-2 mb-1 border border-primary/30 bg-black/95 p-4 shadow-lg"
          role="dialog"
          aria-label={`Details for ${expandedBlock.name}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-arcade text-sm uppercase tracking-wide text-primary">
                {expandedBlock.name}
              </h3>
              {expandedBlock.description && (
                <p className="mt-1 font-terminal text-xs text-muted-foreground line-clamp-2">
                  {expandedBlock.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 font-terminal text-[0.65rem] text-muted-foreground">
                <span>{expandedBlock.default_duration_min}m</span>
                <span className="capitalize">{expandedBlock.energy_cost} energy</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleActivate(expandedBlock)}
              className="shrink-0 border-2 border-red-500/60 bg-red-500/10 px-3 py-1.5 font-arcade text-[0.6rem] uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20"
            >
              Use Block
            </button>
          </div>

          {expandedBlock.facilitation_prompt && (
            <ScrollArea className="mt-3 max-h-48">
              <p className="font-terminal text-xs leading-relaxed text-muted-foreground/80">
                {expandedBlock.facilitation_prompt}
              </p>
            </ScrollArea>
          )}

          {expandedBlock.evidence && (
            <p className="mt-2 border-t border-primary/10 pt-2 font-terminal text-[0.6rem] italic text-muted-foreground/60">
              {expandedBlock.evidence}
            </p>
          )}
        </div>
      )}

      {/* Horizontal scrollable block bar */}
      <ScrollArea className="w-full" type="scroll">
        <div className="flex items-center gap-2 px-3 py-2">
          {primeBlocks.map((block) => {
            const isActive = block.id === activeBlockId;
            const isExpanded = block.id === expandedId;
            const dotColor = ENERGY_DOT[block.energy_cost] ?? "bg-gray-500";

            return (
              <button
                key={block.id}
                type="button"
                onClick={() => toggleExpand(block.id)}
                aria-pressed={isExpanded}
                className={[
                  "flex shrink-0 items-center gap-1.5 border px-2.5 py-1.5 transition-colors",
                  "rounded-none font-arcade text-[0.6rem] uppercase tracking-wide",
                  isActive
                    ? "border-yellow-500/50 bg-yellow-500/5 text-yellow-400"
                    : "border-primary/20 bg-black/40 text-muted-foreground hover:border-primary/40",
                  isExpanded && !isActive ? "border-primary/50" : "",
                ].join(" ")}
              >
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                <span className="whitespace-nowrap">{block.name}</span>
                <span className="text-[0.5rem] text-muted-foreground/60">
                  {block.default_duration_min}m
                </span>
              </button>
            );
          })}

          {primeBlocks.length === 0 && (
            <span className="font-terminal text-xs text-muted-foreground/50">
              No PRIME blocks found
            </span>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
