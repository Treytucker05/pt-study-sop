import { Check, X } from "lucide-react";

export interface AnkiCardDraft {
  id: number;
  front: string;
  back: string;
  status: string;
}

export interface AnkiPanelProps {
  cardDrafts: AnkiCardDraft[];
  onApproveDraft?: (id: number) => void;
  onRejectDraft?: (id: number) => void;
  onEditDraft?: (id: number, front: string, back: string) => void;
}

const CARD_BTN_BASE =
  "inline-flex items-center justify-center w-6 h-6 rounded-sm transition-colors";

const APPROVE_BTN =
  `${CARD_BTN_BASE} text-green-500/60 hover:text-green-400 hover:bg-green-500/10`;

const REJECT_BTN =
  `${CARD_BTN_BASE} text-red-500/60 hover:text-red-400 hover:bg-red-500/10`;

const CONTENT_MAX_LENGTH = 100;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function AnkiPanel({
  cardDrafts,
  onApproveDraft,
  onRejectDraft,
}: AnkiPanelProps): React.JSX.Element {
  const count = cardDrafts.length;

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-terminal text-sm tracking-wider text-primary/80 uppercase">
        ANKI CARDS ({count})
      </h2>

      {count === 0 ? (
        <p className="text-primary/40 text-sm font-terminal text-center py-6">
          No card drafts
        </p>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <ul className="flex flex-col gap-2">
            {cardDrafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-start gap-2 px-2 py-2 rounded-sm border border-primary/10 bg-background/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-terminal text-xs text-primary/80 truncate">
                    <span className="text-secondary/60 mr-1">F:</span>
                    {truncate(draft.front, CONTENT_MAX_LENGTH)}
                  </p>
                  <p className="font-terminal text-xs text-primary/50 truncate mt-0.5">
                    <span className="text-secondary/60 mr-1">B:</span>
                    {truncate(draft.back, CONTENT_MAX_LENGTH)}
                  </p>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {onApproveDraft && (
                    <button
                      type="button"
                      className={APPROVE_BTN}
                      onClick={() => onApproveDraft(draft.id)}
                      aria-label={`Approve card ${draft.id}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onRejectDraft && (
                    <button
                      type="button"
                      className={REJECT_BTN}
                      onClick={() => onRejectDraft(draft.id)}
                      aria-label={`Reject card ${draft.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
