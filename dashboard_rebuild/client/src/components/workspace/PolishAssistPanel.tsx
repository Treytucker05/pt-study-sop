import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Send } from "lucide-react";
import type { PacketItem } from "@/components/workspace/PacketPanel";

export interface AssistResults {
  cardRequests: Array<{ title: string; front: string; back: string }>;
  rePrimeRequests: Array<{ topic: string; reason: string }>;
  artifacts: Array<{ type: string; content: string }>;
}

export interface PolishAssistPanelProps {
  workflowId: string | null;
  onRunAssist?: () => void;
  assistResults?: AssistResults | null;
  assistRunning?: boolean;
  onSendToPacket?: (
    item: Omit<PacketItem, "id" | "addedAt">,
  ) => void;
}

const BTN_CLASSES =
  "px-3 py-1.5 rounded-sm border border-primary/30 bg-background/80 font-terminal text-xs tracking-wider text-primary/80 uppercase hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const SECTION_BTN_CLASSES =
  "flex items-center gap-1.5 font-terminal text-xs tracking-wider text-primary/70 uppercase hover:text-primary transition-colors";

const SEND_BTN_CLASSES =
  "inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-secondary/30 bg-background/60 font-terminal text-[10px] tracking-wider text-secondary/80 uppercase hover:bg-secondary/10 hover:text-secondary transition-colors";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  onSendAll?: () => void;
}

function CollapsibleSection({
  title,
  count,
  children,
  onSendAll,
}: CollapsibleSectionProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-primary/10 rounded-sm bg-background/30">
      <div className="flex items-center justify-between px-2 py-1.5">
        <button
          type="button"
          className={SECTION_BTN_CLASSES}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          {title} ({count})
        </button>

        {onSendAll && count > 0 && (
          <button
            type="button"
            className={SEND_BTN_CLASSES}
            onClick={onSendAll}
            aria-label={`Send all ${title.toLowerCase()} to packet`}
          >
            <Send className="w-3 h-3" />
            Send All
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-2 pb-2 space-y-1">{children}</div>
      )}
    </div>
  );
}

export function PolishAssistPanel({
  workflowId,
  onRunAssist,
  assistResults,
  assistRunning = false,
  onSendToPacket,
}: PolishAssistPanelProps): React.JSX.Element {
  const hasResults = assistResults != null;

  const handleSendCards = (): void => {
    if (!assistResults || !onSendToPacket) return;
    for (const card of assistResults.cardRequests) {
      onSendToPacket({
        type: "custom",
        title: card.title,
        content: `Front: ${card.front}\nBack: ${card.back}`,
      });
    }
  };

  const handleSendRePrimes = (): void => {
    if (!assistResults || !onSendToPacket) return;
    for (const rp of assistResults.rePrimeRequests) {
      onSendToPacket({
        type: "custom",
        title: `Re-prime: ${rp.topic}`,
        content: rp.reason,
      });
    }
  };

  const handleSendArtifacts = (): void => {
    if (!assistResults || !onSendToPacket) return;
    for (const artifact of assistResults.artifacts) {
      onSendToPacket({
        type: "custom",
        title: `Artifact: ${artifact.type}`,
        content: artifact.content,
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
        POLISH ASSIST
      </h2>

      <button
        type="button"
        className={BTN_CLASSES}
        disabled={assistRunning || workflowId == null}
        onClick={onRunAssist}
      >
        {assistRunning ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running...
          </span>
        ) : (
          "Run Polish Assist"
        )}
      </button>

      {hasResults && (
        <div className="flex flex-col gap-2 flex-1 overflow-auto min-h-0">
          <CollapsibleSection
            title="Card Requests"
            count={assistResults.cardRequests.length}
            onSendAll={onSendToPacket ? handleSendCards : undefined}
          >
            {assistResults.cardRequests.map((card, i) => (
              <div
                key={`card-${i}`}
                className="px-2 py-1 rounded-sm bg-background/40 border border-primary/10 font-terminal text-xs"
              >
                <span className="text-primary/80 block truncate">{card.title}</span>
                <span className="text-primary/40 block truncate">
                  {card.front}
                </span>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Re-Prime Requests"
            count={assistResults.rePrimeRequests.length}
            onSendAll={onSendToPacket ? handleSendRePrimes : undefined}
          >
            {assistResults.rePrimeRequests.map((rp, i) => (
              <div
                key={`rp-${i}`}
                className="px-2 py-1 rounded-sm bg-background/40 border border-primary/10 font-terminal text-xs"
              >
                <span className="text-primary/80 block truncate">{rp.topic}</span>
                <span className="text-primary/40 block truncate">
                  {rp.reason}
                </span>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Artifacts"
            count={assistResults.artifacts.length}
            onSendAll={onSendToPacket ? handleSendArtifacts : undefined}
          >
            {assistResults.artifacts.map((a, i) => (
              <div
                key={`art-${i}`}
                className="px-2 py-1 rounded-sm bg-background/40 border border-primary/10 font-terminal text-xs"
              >
                <span className="text-secondary/80 block truncate">{a.type}</span>
                <span className="text-primary/40 block truncate">
                  {a.content}
                </span>
              </div>
            ))}
          </CollapsibleSection>
        </div>
      )}

      {!hasResults && !assistRunning && (
        <p className="text-primary/40 text-sm font-terminal text-center py-6">
          Run Polish Assist to generate cards, re-primes, and artifacts
        </p>
      )}
    </div>
  );
}
