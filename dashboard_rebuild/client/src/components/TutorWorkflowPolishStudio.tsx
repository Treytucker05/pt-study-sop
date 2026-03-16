import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Layers3, ListTodo, RefreshCw, Sparkles, StickyNote } from "lucide-react";
import { toast } from "sonner";

import type {
  TutorCapturedNote,
  TutorFeedbackEvent,
  TutorMemoryCapsule,
  TutorPolishBundle,
  TutorPolishBundleRequest,
  TutorWorkflowSummary,
} from "@/api.types";
import { api } from "@/lib/api";
import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ReviewQueueKey =
  | "exact_notes"
  | "editable_notes"
  | "memory_capsules"
  | "feedback"
  | "card_requests"
  | "reprime";

type TutorWorkflowPolishStudioProps = {
  workflow: TutorWorkflowSummary | null;
  primingBundleId?: number | null;
  capturedNotes: TutorCapturedNote[];
  feedbackEvents: TutorFeedbackEvent[];
  memoryCapsules: TutorMemoryCapsule[];
  existingBundle: TutorPolishBundle | null;
  isSaving: boolean;
  onBackToTutor: () => void;
  onSaveDraft: (payload: TutorPolishBundleRequest) => void;
  onFinalize: (payload: TutorPolishBundleRequest) => void;
};

function toLineItems(lines: string) {
  return lines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `line-${index}-${line}`,
      text: line,
    }));
}

function noteBadgeVariant(noteMode: TutorCapturedNote["note_mode"]) {
  return noteMode === "exact" ? "default" : "secondary";
}

function feedbackLabel(event: TutorFeedbackEvent) {
  return [event.sentiment, event.issue_type].filter(Boolean).join(" / ") || "feedback";
}

function buildAssistContext(
  summaryDraft: string,
  exactNotes: TutorCapturedNote[],
  editableNotes: TutorCapturedNote[],
  memoryCapsules: TutorMemoryCapsule[],
) {
  const sections = [
    summaryDraft.trim() ? `CURRENT SUMMARY\n${summaryDraft.trim()}` : "",
    exactNotes
      .slice(0, 8)
      .map((note) => `EXACT NOTE: ${note.title || "untitled"}\n${note.content}`)
      .join("\n\n"),
    editableNotes
      .slice(0, 8)
      .map((note) => `EDITABLE NOTE: ${note.title || "untitled"}\n${note.content}`)
      .join("\n\n"),
    memoryCapsules
      .slice(0, 6)
      .map((capsule) => `MEMORY CAPSULE v${capsule.capsule_version}\n${capsule.summary_text || ""}`)
      .join("\n\n"),
  ].filter(Boolean);
  return sections.join("\n\n");
}

export function TutorWorkflowPolishStudio({
  workflow,
  primingBundleId,
  capturedNotes,
  feedbackEvents,
  memoryCapsules,
  existingBundle,
  isSaving,
  onBackToTutor,
  onSaveDraft,
  onFinalize,
}: TutorWorkflowPolishStudioProps) {
  const exactNotes = useMemo(
    () => capturedNotes.filter((note) => note.note_mode === "exact"),
    [capturedNotes],
  );
  const editableNotes = useMemo(
    () => capturedNotes.filter((note) => note.note_mode === "editable"),
    [capturedNotes],
  );
  const feedbackQueue = useMemo(
    () => feedbackEvents.filter((event) => event.handoff_to_polish),
    [feedbackEvents],
  );
  const defaultSummary = useMemo(() => {
    const latestCapsuleSummary =
      [...memoryCapsules]
        .reverse()
        .find((capsule) => typeof capsule.summary_text === "string" && capsule.summary_text.trim().length > 0)
        ?.summary_text?.trim() || "";
    if (latestCapsuleSummary) return latestCapsuleSummary;
    return editableNotes[0]?.content || exactNotes[0]?.content || "";
  }, [editableNotes, exactNotes, memoryCapsules]);
  const defaultQuestion = useMemo(() => {
    const unresolved = [...memoryCapsules]
      .reverse()
      .flatMap((capsule) => capsule.unresolved_questions || [])
      .map((entry) => String((entry as Record<string, unknown>).text || "").trim())
      .filter(Boolean);
    return unresolved[0] || "";
  }, [memoryCapsules]);
  const defaultCards = useMemo(() => {
    const bundledCards =
      (existingBundle?.card_requests || [])
        .map((entry) => String((entry as Record<string, unknown>).text || "").trim())
        .filter(Boolean)
        .join("\n") || "";
    if (bundledCards) return bundledCards;
    return [...memoryCapsules]
      .reverse()
      .flatMap((capsule) => capsule.card_requests || [])
      .map((entry) => String((entry as Record<string, unknown>).text || "").trim())
      .filter(Boolean)
      .join("\n");
  }, [existingBundle?.card_requests, memoryCapsules]);
  const defaultReprime = useMemo(() => {
    const bundledReprime =
      (existingBundle?.reprime_requests || [])
        .map((entry) => String((entry as Record<string, unknown>).text || "").trim())
        .filter(Boolean)
        .join("\n") || "";
    if (bundledReprime) return bundledReprime;
    return feedbackQueue
      .filter((event) => event.sentiment === "disliked")
      .map((event) => event.message?.trim() || event.issue_type?.trim() || "")
      .filter(Boolean)
      .join("\n");
  }, [existingBundle?.reprime_requests, feedbackQueue]);

  const [selectedQueue, setSelectedQueue] = useState<ReviewQueueKey>("exact_notes");
  const [summaryDraft, setSummaryDraft] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [cardRequestText, setCardRequestText] = useState("");
  const [reprimeText, setReprimeText] = useState("");
  const [publishToObsidian, setPublishToObsidian] = useState(true);
  const [publishToAnki, setPublishToAnki] = useState(false);
  const [indexInBrain, setIndexInBrain] = useState(true);
  const [classificationNote, setClassificationNote] = useState("");
  const [assistResponse, setAssistResponse] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);

  useEffect(() => {
    setSummaryDraft(
      String(
        existingBundle?.summaries?.[0] &&
          typeof existingBundle.summaries[0] === "object" &&
          existingBundle.summaries[0] !== null
          ? (existingBundle.summaries[0] as Record<string, unknown>).content || defaultSummary
          : defaultSummary,
      ),
    );
    setAssistantQuestion(
      String(existingBundle?.studio_payload?.polish_question || defaultQuestion || ""),
    );
    setCardRequestText(defaultCards);
    setReprimeText(defaultReprime);
    setPublishToObsidian(existingBundle?.publish_targets?.obsidian !== false);
    setPublishToAnki(Boolean(existingBundle?.publish_targets?.anki || defaultCards.trim()));
    setIndexInBrain(existingBundle?.publish_targets?.brain !== false);
    setClassificationNote(String(existingBundle?.studio_payload?.classification_note || ""));
  }, [
    defaultCards,
    defaultQuestion,
    defaultReprime,
    defaultSummary,
    existingBundle?.publish_targets,
    existingBundle?.studio_payload,
    existingBundle?.summaries,
    workflow?.workflow_id,
  ]);

  const queueCounts = {
    exact_notes: exactNotes.length,
    editable_notes: editableNotes.length,
    memory_capsules: memoryCapsules.length,
    feedback: feedbackQueue.length,
    card_requests: toLineItems(cardRequestText).length,
    reprime: toLineItems(reprimeText).length,
  } satisfies Record<ReviewQueueKey, number>;

  const buildPayload = (status: string): TutorPolishBundleRequest => ({
    tutor_session_id: workflow?.active_tutor_session_id || null,
    priming_bundle_id: primingBundleId ?? null,
    exact_notes: exactNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      status: note.status,
      source_turn_id: note.source_turn_id,
      created_at: note.created_at,
    })),
    editable_notes: editableNotes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      status: note.status,
      source_turn_id: note.source_turn_id,
      created_at: note.created_at,
    })),
    summaries: summaryDraft.trim()
      ? [
          {
            id: existingBundle?.summaries?.[0]
              ? (existingBundle.summaries[0] as Record<string, unknown>).id || "summary-0"
              : "summary-0",
            title: "Polish final summary draft",
            content: summaryDraft.trim(),
          },
        ]
      : [],
    feedback_queue: feedbackQueue.map((event) => ({
      id: event.id,
      sentiment: event.sentiment,
      issue_type: event.issue_type,
      message: event.message,
      source_type: event.source_type,
      source_id: event.source_id,
    })),
    card_requests: toLineItems(cardRequestText).map((item) => ({
      id: item.id,
      text: item.text,
    })),
    reprime_requests: toLineItems(reprimeText).map((item) => ({
      id: item.id,
      text: item.text,
    })),
    studio_payload: {
      embedded_surface: "TutorWorkspaceSurface",
      selected_queue: selectedQueue,
      polish_question: assistantQuestion.trim(),
      classification_note: classificationNote.trim(),
    },
    publish_targets: {
      obsidian: publishToObsidian,
      anki: publishToAnki,
      brain: indexInBrain,
    },
    status,
  });

  const runAssist = async (action: "summarize" | "qa" | "rewrite_note" | "draft_cards") => {
    if (!workflow?.workflow_id) {
      toast.error("Workflow context is required for Polish Assist.");
      return;
    }
    setAssistBusy(true);
    try {
      const result = await api.tutor.runPolishAssist(workflow.workflow_id, {
        action,
        input_text: buildAssistContext(summaryDraft, exactNotes, editableNotes, memoryCapsules),
        question: action === "qa" ? assistantQuestion.trim() : undefined,
        max_cards: 8,
      });
      const text = String(result.result.text || "").trim();
      const cards = result.result.cards || [];
      if (action === "summarize" || action === "rewrite_note") {
        setSummaryDraft(text || summaryDraft);
      } else if (action === "qa") {
        setAssistResponse(text);
      } else if (action === "draft_cards") {
        const cardLines = cards.map((card) => `${card.front} :: ${card.back}`).join("\n");
        setCardRequestText(cardLines || text || cardRequestText);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Polish Assist failed");
    } finally {
      setAssistBusy(false);
    }
  };

  const queueButtons: Array<{
    key: ReviewQueueKey;
    label: string;
    icon: typeof StickyNote;
  }> = [
    { key: "exact_notes", label: "Exact notes", icon: StickyNote },
    { key: "editable_notes", label: "Editable notes", icon: ListTodo },
    { key: "memory_capsules", label: "Memory capsules", icon: Layers3 },
    { key: "feedback", label: "Feedback", icon: RefreshCw },
    { key: "card_requests", label: "Card queue", icon: Sparkles },
    { key: "reprime", label: "Re-prime", icon: Brain },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <Card className="rounded-none border-primary/30 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="font-arcade text-sm text-primary">REVIEW QUEUE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queueButtons.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedQueue(item.key)}
                  className={cn(
                    "flex w-full items-center justify-between border px-3 py-2 text-left transition-colors",
                    selectedQueue === item.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-primary/20 bg-black/20 text-zinc-200 hover:border-primary/40",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-terminal uppercase">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <Badge variant="outline" className="rounded-none border-primary/30 text-[10px]">
                    {queueCounts[item.key]}
                  </Badge>
                </button>
              );
            })}
            <div className="border border-primary/20 bg-black/30 p-3 text-[11px] text-zinc-300">
              <div className="font-terminal text-primary">Workflow</div>
              <div>{workflow?.course_name || "Unassigned course"}</div>
              <div>{workflow?.assignment_title || "No assignment linked"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-4">
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-3">
              <CardTitle className="font-arcade text-sm text-primary">POLISH STUDIO</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[520px]">
              <TutorWorkspaceSurface />
            </CardContent>
          </Card>
          <Card className="rounded-none border-primary/30 bg-black/40">
            <CardHeader className="pb-3">
              <CardTitle className="font-arcade text-sm text-primary">FINAL SUMMARY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
                placeholder="Final summary draft for Obsidian and Brain indexing"
                className="min-h-[140px] rounded-none border-primary/20 bg-black/30"
              />
              <Input
                value={classificationNote}
                onChange={(event) => setClassificationNote(event.target.value)}
                placeholder="Classification note / publish rationale"
                className="rounded-none border-primary/20 bg-black/30"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-none border-primary/30 bg-black/40">
          <CardHeader className="pb-3">
            <CardTitle className="font-arcade text-sm text-primary">POLISH ASSIST</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
                Assist prompt
              </div>
              <Input
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="Question to answer over the current study output"
                className="rounded-none border-primary/20 bg-black/30"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  setSummaryDraft(defaultSummary);
                }}
              >
                Draft from capsules
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  setReprimeText(defaultReprime);
                }}
              >
                Pull re-prime queue
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  void runAssist("summarize");
                }}
                disabled={assistBusy}
              >
                {assistBusy ? "Running..." : "LLM summarize"}
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  void runAssist("rewrite_note");
                }}
                disabled={assistBusy}
              >
                Rewrite notes
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  void runAssist("draft_cards");
                }}
                disabled={assistBusy}
              >
                Generate cards
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-[10px]"
                onClick={() => {
                  void runAssist("qa");
                }}
                disabled={assistBusy || !assistantQuestion.trim()}
              >
                Answer question
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
                Card requests
              </div>
              <Textarea
                value={cardRequestText}
                onChange={(event) => setCardRequestText(event.target.value)}
                placeholder="One flashcard request per line"
                className="min-h-[110px] rounded-none border-primary/20 bg-black/30"
              />
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
                Re-prime requests
              </div>
              <Textarea
                value={reprimeText}
                onChange={(event) => setReprimeText(event.target.value)}
                placeholder="One re-prime request per line"
                className="min-h-[110px] rounded-none border-primary/20 bg-black/30"
              />
            </div>
            <div className="space-y-2 border border-primary/20 bg-black/30 p-3">
              <div className="text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
                Assist response
              </div>
              <Textarea
                value={assistResponse}
                onChange={(event) => setAssistResponse(event.target.value)}
                placeholder="LLM output lands here for QA and note rewrite actions"
                className="min-h-[90px] rounded-none border-primary/20 bg-black/20"
              />
            </div>
            <div className="space-y-2 border border-primary/20 bg-black/30 p-3">
              <div className="text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
                Publish targets
              </div>
              <label className="flex items-center justify-between text-xs text-zinc-200">
                <span>Obsidian notes</span>
                <input
                  type="checkbox"
                  checked={publishToObsidian}
                  onChange={(event) => setPublishToObsidian(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-200">
                <span>Anki cards</span>
                <input
                  type="checkbox"
                  checked={publishToAnki}
                  onChange={(event) => setPublishToAnki(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-200">
                <span>Brain index + telemetry</span>
                <input
                  type="checkbox"
                  checked={indexInBrain}
                  onChange={(event) => setIndexInBrain(event.target.checked)}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none border-primary/30 bg-black/40">
        <CardHeader className="pb-3">
          <CardTitle className="font-arcade text-sm text-primary">QUEUE DETAIL</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[220px]">
            <div className="space-y-3 pr-3">
              {selectedQueue === "exact_notes" &&
                exactNotes.map((note) => (
                  <div key={note.id} className="border border-primary/20 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-terminal text-zinc-100">
                        {note.title || `Exact note ${note.id}`}
                      </div>
                      <Badge variant={noteBadgeVariant(note.note_mode)} className="rounded-none text-[10px]">
                        {note.note_mode}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-300">{note.content}</div>
                  </div>
                ))}
              {selectedQueue === "editable_notes" &&
                editableNotes.map((note) => (
                  <div key={note.id} className="border border-primary/20 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-terminal text-zinc-100">
                        {note.title || `Editable note ${note.id}`}
                      </div>
                      <Badge variant={noteBadgeVariant(note.note_mode)} className="rounded-none text-[10px]">
                        {note.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-300">{note.content}</div>
                  </div>
                ))}
              {selectedQueue === "memory_capsules" &&
                memoryCapsules.map((capsule) => (
                  <div key={capsule.id} className="border border-primary/20 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-terminal text-zinc-100">
                        Capsule v{capsule.capsule_version}
                      </div>
                      <Badge variant="outline" className="rounded-none text-[10px]">
                        {capsule.study_unit || "session"}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {capsule.summary_text || "No summary text captured yet."}
                    </div>
                  </div>
                ))}
              {selectedQueue === "feedback" &&
                feedbackQueue.map((event) => (
                  <div key={event.id} className="border border-primary/20 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-terminal text-zinc-100">{feedbackLabel(event)}</div>
                      <Badge variant="outline" className="rounded-none text-[10px]">
                        {event.source_type}
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {event.message || "No freeform message captured."}
                    </div>
                  </div>
                ))}
              {selectedQueue === "card_requests" &&
                toLineItems(cardRequestText).map((item) => (
                  <div key={item.id} className="border border-primary/20 bg-black/20 p-3 text-xs text-zinc-300">
                    {item.text}
                  </div>
                ))}
              {selectedQueue === "reprime" &&
                toLineItems(reprimeText).map((item) => (
                  <div key={item.id} className="border border-primary/20 bg-black/20 p-3 text-xs text-zinc-300">
                    {item.text}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-primary/20 bg-black/30 p-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-terminal uppercase tracking-[0.2em] text-zinc-400">
          <Badge variant="outline" className="rounded-none border-primary/30">
            Stage 4
          </Badge>
          <span>Queue hydrated from workflow detail</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            className="rounded-none font-arcade text-[10px]"
            onClick={onBackToTutor}
          >
            Back to Tutor
          </Button>
          <Button
            variant="outline"
            className="rounded-none font-arcade text-[10px]"
            onClick={() => onSaveDraft(buildPayload("draft"))}
            disabled={isSaving}
          >
            SAVE POLISH DRAFT
          </Button>
          <Button
            className="rounded-none font-arcade text-[10px]"
            onClick={() => onFinalize(buildPayload("finalized"))}
            disabled={isSaving}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            FINALIZE FOR SYNC
          </Button>
        </div>
      </div>
    </div>
  );
}
