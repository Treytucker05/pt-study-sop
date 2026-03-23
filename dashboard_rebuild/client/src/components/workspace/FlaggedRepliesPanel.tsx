export interface FlaggedReply {
  messageId: string;
  content: string;
  sentiment: "liked" | "disliked";
  category?: string;
  comment?: string;
}

export interface FlaggedRepliesPanelProps {
  flaggedReplies: FlaggedReply[];
  onReviewComplete?: (
    messageId: string,
    action: "keep" | "discard" | "revise",
  ) => void;
}

const ACTION_BTN_BASE =
  "px-2 py-0.5 rounded-sm border font-terminal text-[10px] tracking-wider uppercase transition-colors";

const ACTION_STYLES = {
  keep: `${ACTION_BTN_BASE} border-green-500/30 text-green-400/80 hover:bg-green-500/10 hover:text-green-400`,
  discard: `${ACTION_BTN_BASE} border-red-500/30 text-red-400/80 hover:bg-red-500/10 hover:text-red-400`,
  revise: `${ACTION_BTN_BASE} border-yellow-500/30 text-yellow-400/80 hover:bg-yellow-500/10 hover:text-yellow-400`,
} as const;

const BADGE_CLASSES =
  "inline-flex px-1.5 py-0.5 rounded-sm border border-secondary/30 bg-secondary/10 font-terminal text-[10px] tracking-wider text-secondary/80 uppercase";

const CONTENT_MAX_LENGTH = 120;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function FlaggedRepliesPanel({
  flaggedReplies,
  onReviewComplete,
}: FlaggedRepliesPanelProps): React.JSX.Element {
  const count = flaggedReplies.length;

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
        FLAGGED REPLIES ({count})
      </h2>

      {count === 0 ? (
        <p className="text-primary/40 text-sm font-terminal text-center py-6">
          No flagged replies
        </p>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <ul className="flex flex-col gap-2">
            {flaggedReplies.map((reply) => (
              <li
                key={reply.messageId}
                className="flex flex-col gap-1.5 px-2 py-2 rounded-sm border border-primary/10 bg-background/40"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-terminal text-xs text-primary/80 line-clamp-3">
                      {truncate(reply.content, CONTENT_MAX_LENGTH)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {reply.category && (
                    <span className={BADGE_CLASSES}>{reply.category}</span>
                  )}
                  {reply.comment && (
                    <span className="font-terminal text-[10px] text-primary/40 italic truncate">
                      &ldquo;{reply.comment}&rdquo;
                    </span>
                  )}
                </div>

                {onReviewComplete && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      className={ACTION_STYLES.keep}
                      onClick={() => onReviewComplete(reply.messageId, "keep")}
                      aria-label={`Keep reply ${reply.messageId}`}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className={ACTION_STYLES.discard}
                      onClick={() => onReviewComplete(reply.messageId, "discard")}
                      aria-label={`Discard reply ${reply.messageId}`}
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      className={ACTION_STYLES.revise}
                      onClick={() => onReviewComplete(reply.messageId, "revise")}
                      aria-label={`Revise reply ${reply.messageId}`}
                    >
                      Revise
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
