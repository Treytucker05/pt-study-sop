import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
  children,
}: TutorChatPanelProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-3 py-2 border-b border-primary/20 space-y-2">
        <h2 className={TEXT_SECTION_LABEL}>TUTOR CHAT</h2>

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
