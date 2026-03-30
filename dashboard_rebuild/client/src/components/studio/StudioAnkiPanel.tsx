import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface EditableAnkiCard {
  id: string;
  front: string;
  back: string;
  deckName?: string;
  tags?: string;
  source: "draft" | "queue";
}

export interface StudioAnkiPanelProps {
  activeSessionId: string | null;
  courseId?: number | null;
  workflowId?: string | null;
  sessionName?: string;
  draftCardRequestText?: string;
}

function normalizeCardKey(front: string, back: string): string {
  return `${front.trim().toLowerCase()}::${back.trim().toLowerCase()}`;
}

function parseCardQueue(value: string): EditableAnkiCard[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const separatorIndex = line.indexOf("::");
      const front =
        separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : line;
      const back =
        separatorIndex >= 0 ? line.slice(separatorIndex + 2).trim() : "";

      return {
        id: `queue-${index}`,
        front,
        back,
        source: "queue" as const,
      };
    });
}

function escapeCsvCell(value: string | undefined): string {
  const normalized = String(value || "");
  return `"${normalized.replace(/"/g, "\"\"")}"`;
}

function buildCsv(cards: EditableAnkiCard[]): string {
  const rows = [
    ["Front", "Back", "Deck", "Tags"],
    ...cards.map((card) => [
      card.front,
      card.back,
      card.deckName || "",
      card.tags || "",
    ]),
  ];

  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
}

function buildExportFilename(
  sessionName: string | undefined,
  workflowId: string | null | undefined,
): string {
  const base = String(sessionName || workflowId || "anki-cards")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${base || "anki-cards"}.csv`;
}

async function copyCard(card: EditableAnkiCard) {
  const payload = `${card.front}\t${card.back}`;
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is unavailable in this browser.");
  }
  await navigator.clipboard.writeText(payload);
}

export function StudioAnkiPanel({
  activeSessionId,
  courseId = null,
  workflowId = null,
  sessionName,
  draftCardRequestText = "",
}: StudioAnkiPanelProps) {
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
  });

  const sourceCards = useMemo(() => {
    let draftPool = drafts;

    if (activeSessionId) {
      draftPool = drafts.filter((draft) => draft.sessionId === activeSessionId);
    } else if (!draftCardRequestText.trim() && typeof courseId === "number") {
      const courseDrafts = drafts.filter((draft) => draft.courseId === courseId);
      draftPool = courseDrafts.length > 0 ? courseDrafts : drafts;
    } else if (draftCardRequestText.trim()) {
      draftPool = [];
    }

    const scopedDrafts = draftPool
      .slice(0, 5)
      .map<EditableAnkiCard>((draft) => ({
        id: `draft-${draft.id}`,
        front: draft.front,
        back: draft.back,
        deckName: draft.deckName,
        tags: draft.tags,
        source: "draft",
      }));

    const merged = new Map<string, EditableAnkiCard>();
    for (const draft of scopedDrafts) {
      merged.set(normalizeCardKey(draft.front, draft.back), draft);
    }
    for (const queuedCard of parseCardQueue(draftCardRequestText)) {
      const key = normalizeCardKey(queuedCard.front, queuedCard.back);
      if (!merged.has(key)) {
        merged.set(key, queuedCard);
      }
    }
    return Array.from(merged.values());
  }, [activeSessionId, courseId, draftCardRequestText, drafts]);

  const [editableCards, setEditableCards] = useState<EditableAnkiCard[]>([]);

  useEffect(() => {
    setEditableCards(sourceCards);
  }, [sourceCards]);

  const completeCards = useMemo(
    () =>
      editableCards.filter(
        (card) => card.front.trim().length > 0 && card.back.trim().length > 0,
      ),
    [editableCards],
  );

  const updateCardField = (
    id: string,
    field: "front" | "back",
    value: string,
  ) => {
    setEditableCards((current) =>
      current.map((card) => (card.id === id ? { ...card, [field]: value } : card)),
    );
  };

  const handleExportCsv = () => {
    if (completeCards.length === 0) {
      toast.error("Add at least one complete front/back card before exporting.");
      return;
    }

    const csv = buildCsv(completeCards);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildExportFilename(sessionName, workflowId);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${completeCards.length} card(s) to CSV.`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-testid="studio-anki-content">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#ffd6de]">
            Anki Export Queue
          </div>
          <p className="font-mono text-[11px] leading-5 text-[#ffc8d3]/68">
            Review flashcards from the current study session, edit front/back text,
            then export a CSV Anki can import.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          disabled={completeCards.length === 0}
          className="shrink-0 rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffd6de]"
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
        {completeCards.length} ready / {editableCards.length} total
      </div>

      {isLoading ? (
        <div className="font-mono text-xs text-[#ffc8d3]/68">Loading flashcards...</div>
      ) : editableCards.length === 0 ? (
        <div className="rounded-[0.9rem] border border-[rgba(255,118,144,0.18)] bg-black/20 p-4 font-mono text-xs leading-6 text-[#ffc8d3]/68">
          No Anki cards yet for this session. Generate cards from the Polish panel,
          then reopen Anki to review and export them.
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {editableCards.map((card, index) => (
            <section
              key={card.id}
              className="rounded-[0.95rem] border border-[rgba(255,118,144,0.18)] bg-black/25 p-3"
              data-testid="studio-anki-card"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb9c7]">
                  Card {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[rgba(255,118,144,0.22)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]">
                    {card.source === "draft" ? "Saved draft" : "Card queue"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void copyCard(card)
                        .then(() => toast.success(`Copied card ${index + 1}.`))
                        .catch((error: unknown) =>
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Failed to copy card.",
                          ),
                        );
                    }}
                    className="rounded-full border-[rgba(255,118,144,0.18)] bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffd6de]"
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
                    Front
                  </span>
                  <textarea
                    value={card.front}
                    onChange={(event) =>
                      updateCardField(card.id, "front", event.target.value)
                    }
                    className="min-h-[112px] rounded-[0.8rem] border border-[rgba(255,118,144,0.18)] bg-black/30 p-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-[#ffc8d3]/38"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ffb9c7]">
                    Back
                  </span>
                  <textarea
                    value={card.back}
                    onChange={(event) =>
                      updateCardField(card.id, "back", event.target.value)
                    }
                    className="min-h-[112px] rounded-[0.8rem] border border-[rgba(255,118,144,0.18)] bg-black/30 p-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-[#ffc8d3]/38"
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
