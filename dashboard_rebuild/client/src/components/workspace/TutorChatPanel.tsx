import { type ReactNode, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  TEXT_SECTION_LABEL,
  TEXT_MUTED,
  BTN_TOOLBAR,
  BTN_TOOLBAR_ACTIVE,
  SELECT_BASE,
} from "@/lib/theme";

export type ChainMode = "solo" | "auto" | "template" | "custom";

export interface TutorChatPanelProps {
  sessionId: string | null;
  chainMode: ChainMode;
  onChainModeChange: (mode: ChainMode) => void;
  selectedChainId: number | null;
  onChainSelect: (chainId: number) => void;
  availableChains: Array<{ id: number; title: string; block_count: number }>;
  availableMethods: Array<{ id: number; method_id: string; title: string }>;
  selectedMethodId: string | null;
  onMethodSelect: (methodId: string) => void;
  /** Called when user clicks "Summarize & Save"; wire to quickCompactWorkflowMemory */
  onCompact?: () => Promise<void>;
  /** Optional extra callback to persist compaction result into the Packet */
  onCompactToPacket?: () => Promise<void>;
  children: ReactNode;
}

const MODES: Array<{ value: ChainMode; label: string }> = [
  { value: "solo", label: "Solo" },
  { value: "auto", label: "Auto" },
  { value: "template", label: "Template" },
  { value: "custom", label: "Custom" },
];

export function TutorChatPanel({
  sessionId,
  chainMode,
  onChainModeChange,
  selectedChainId,
  onChainSelect,
  availableChains,
  availableMethods,
  selectedMethodId,
  onMethodSelect,
  onCompact,
  onCompactToPacket,
  children,
}: TutorChatPanelProps): React.ReactElement {
  const [compacting, setCompacting] = useState(false);

  const handleCompact = useCallback(async () => {
    if (!onCompact) return;
    setCompacting(true);
    try {
      await onCompact();
      if (onCompactToPacket) {
        await onCompactToPacket();
      }
      toast.success("Session summarized and saved");
    } catch {
      toast.error("Failed to summarize session");
    } finally {
      setCompacting(false);
    }
  }, [onCompact, onCompactToPacket]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-3 py-2 border-b border-primary/20 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className={TEXT_SECTION_LABEL}>TUTOR CHAT</h2>
          {sessionId && onCompact ? (
            <button
              type="button"
              disabled={compacting}
              onClick={handleCompact}
              title="Summarize & Save"
              className={cn(
                BTN_TOOLBAR,
                "min-h-[28px] py-0.5 px-2 text-[10px] flex items-center gap-1",
              )}
            >
              <Sparkles className="h-3 w-3" />
              {compacting ? "Saving..." : "Summarize"}
            </button>
          ) : null}
        </div>

        {sessionId ? (
          <>
            {/* Mode toggle row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(TEXT_MUTED, "text-sm mr-1")}>Chain:</span>
              {MODES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={chainMode === value}
                  className={cn(
                    chainMode === value ? BTN_TOOLBAR_ACTIVE : BTN_TOOLBAR,
                    "min-h-[32px] py-1 text-[10px]",
                  )}
                  onClick={() => onChainModeChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mode-specific selector */}
            <ModeSelector
              chainMode={chainMode}
              selectedChainId={selectedChainId}
              onChainSelect={onChainSelect}
              availableChains={availableChains}
              availableMethods={availableMethods}
              selectedMethodId={selectedMethodId}
              onMethodSelect={onMethodSelect}
            />
          </>
        ) : (
          <p className={cn(TEXT_MUTED, "text-sm py-1")}>
            Start a session to begin chatting
          </p>
        )}
      </div>

      {/* Chat body */}
      {sessionId ? (
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      ) : null}
    </div>
  );
}

/* ── Mode-specific selector ─────────────────────────────────────────── */

interface ModeSelectorProps {
  chainMode: ChainMode;
  selectedChainId: number | null;
  onChainSelect: (chainId: number) => void;
  availableChains: Array<{ id: number; title: string; block_count: number }>;
  availableMethods: Array<{ id: number; method_id: string; title: string }>;
  selectedMethodId: string | null;
  onMethodSelect: (methodId: string) => void;
}

function ModeSelector({
  chainMode,
  selectedChainId,
  onChainSelect,
  availableChains,
  availableMethods,
  selectedMethodId,
  onMethodSelect,
}: ModeSelectorProps): React.ReactElement | null {
  switch (chainMode) {
    case "solo":
      return (
        <select
          aria-label="Method"
          className={cn(SELECT_BASE, "text-sm py-1")}
          value={selectedMethodId ?? ""}
          onChange={(e) => onMethodSelect(e.target.value)}
        >
          <option value="" disabled>
            Select a method...
          </option>
          {availableMethods.map((m) => (
            <option key={m.method_id} value={m.method_id}>
              {m.title}
            </option>
          ))}
        </select>
      );

    case "template":
      return (
        <select
          aria-label="Chain"
          className={cn(SELECT_BASE, "text-sm py-1")}
          value={selectedChainId ?? ""}
          onChange={(e) => onChainSelect(Number(e.target.value))}
        >
          <option value="" disabled>
            Select a chain template...
          </option>
          {availableChains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.block_count} blocks)
            </option>
          ))}
        </select>
      );

    case "auto":
      return (
        <p className={cn(TEXT_MUTED, "text-sm py-1")}>
          AI will select the best chain
        </p>
      );

    case "custom":
      return (
        <p className={cn(TEXT_MUTED, "text-sm py-1")}>Build custom chain</p>
      );

    default:
      return null;
  }
}
