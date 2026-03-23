import { useState, useCallback, type KeyboardEvent } from "react";
import {
  X,
  FileText,
  Cpu,
  StickyNote,
  Target,
  PenTool,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export interface PacketItem {
  id: string;
  type: "material" | "method_output" | "note" | "objectives" | "drawing" | "custom";
  title: string;
  content: string;
  methodId?: string;
  addedAt: string;
}

export interface PacketPanelProps {
  items: PacketItem[];
  onAddItem: (item: Omit<PacketItem, "id" | "addedAt">) => void;
  onRemoveItem: (id: string) => void;
  onClearAll?: () => void;
}

const TYPE_ICONS: Record<PacketItem["type"], typeof FileText> = {
  material: FileText,
  method_output: Cpu,
  note: StickyNote,
  objectives: Target,
  drawing: PenTool,
  custom: Plus,
};

const BTN_CLASSES =
  "inline-flex items-center justify-center w-6 h-6 rounded-sm text-primary/50 hover:text-red-400 transition-colors";

const CLEAR_BTN_CLASSES =
  "px-3 py-1 rounded-sm border border-primary/30 bg-background/80 font-terminal text-xs tracking-wider text-primary/80 uppercase hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30 transition-colors";

const PREVIEW_MAX_LENGTH = 80;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function PacketPanel({
  items,
  onAddItem,
  onRemoveItem,
  onClearAll,
}: PacketPanelProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter" && inputValue.trim().length > 0) {
        onAddItem({
          type: "custom",
          title: inputValue.trim(),
          content: inputValue.trim(),
        });
        setInputValue("");
      }
    },
    [inputValue, onAddItem],
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
          PACKET ({items.length})
        </h2>

        {onClearAll && items.length > 0 && (
          <button type="button" className={CLEAR_BTN_CLASSES} onClick={onClearAll}>
            Clear All
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-auto min-h-0">
        {items.length === 0 ? (
          <p className="text-primary/40 text-sm font-terminal text-center py-6">
            Drag items here or type below to add to your study packet
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-sm border border-primary/10 bg-background/40 hover:border-primary/25 transition-colors group"
                >
                  <Icon className="w-4 h-4 mt-0.5 text-primary/50 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <span className="font-terminal text-xs tracking-wider text-primary/80 block truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-primary/40 block truncate">
                      {truncate(item.content, PREVIEW_MAX_LENGTH)}
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${item.title}`}
                    className={BTN_CLASSES}
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick-add input */}
      <Input
        placeholder="Type to add a quick item..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Add quick item"
      />
    </div>
  );
}
