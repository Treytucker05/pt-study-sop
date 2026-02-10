import { useState } from "react";
import { ArrowRight, GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MethodBlockCard from "@/components/MethodBlockCard";
import type { MethodBlock, MethodChain } from "@/api";

interface ChainBuilderProps {
  chain: MethodChain & { blocks?: MethodBlock[] };
  allBlocks: MethodBlock[];
  onSave: (blockIds: number[]) => void;
  readOnly?: boolean;
}

export default function ChainBuilder({ chain, allBlocks, onSave, readOnly }: ChainBuilderProps) {
  const [blockIds, setBlockIds] = useState<number[]>(chain.block_ids || []);
  const [showPicker, setShowPicker] = useState(false);

  const blocksMap = new Map(allBlocks.map((b) => [b.id, b]));
  const orderedBlocks = blockIds.map((id) => blocksMap.get(id)).filter(Boolean) as MethodBlock[];

  const handleRemove = (index: number) => {
    const next = [...blockIds];
    next.splice(index, 1);
    setBlockIds(next);
    onSave(next);
  };

  const handleAdd = (blockId: number) => {
    const next = [...blockIds, blockId];
    setBlockIds(next);
    onSave(next);
    setShowPicker(false);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...blockIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setBlockIds(next);
    onSave(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-arcade text-xs text-primary">CHAIN BLOCKS</span>
        <span className="text-xs font-terminal text-muted-foreground">
          ({orderedBlocks.length} blocks)
        </span>
      </div>

      {orderedBlocks.length === 0 && (
        <div className="border-2 border-dashed border-secondary p-4 text-center">
          <p className="font-terminal text-xs text-muted-foreground">No blocks in this chain yet</p>
        </div>
      )}

      <div className="space-y-2">
        {orderedBlocks.map((block, index) => (
          <div key={`${block.id}-${index}`} className="flex items-center gap-2">
            {!readOnly && (
              <button
                className="text-muted-foreground hover:text-primary cursor-grab"
                onClick={() => handleMoveUp(index)}
                title="Move up"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              <MethodBlockCard block={block} compact />
            </div>
            {index < orderedBlocks.length - 1 && (
              <ArrowRight className="w-3 h-3 text-primary/40 shrink-0" />
            )}
            {!readOnly && (
              <button
                className="text-muted-foreground hover:text-red-400"
                onClick={() => handleRemove(index)}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div>
          {showPicker ? (
            <div className="border-2 border-primary/30 bg-black/50 p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="font-arcade text-xs text-primary">ADD BLOCK</span>
                <button onClick={() => setShowPicker(false)}>
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {allBlocks.map((block) => (
                  <MethodBlockCard
                    key={block.id}
                    block={block}
                    compact
                    onClick={() => handleAdd(block.id)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-none border-2 border-dashed border-secondary font-arcade text-xs"
              onClick={() => setShowPicker(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> ADD BLOCK
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
