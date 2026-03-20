import { useState, forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  FileText, CreditCard, Map, Table2, Network,
  CheckCircle2, XCircle, BookOpen, StickyNote,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TutorVerdict, TeachBackRubric } from "@/lib/api";
import type {
  ChatMessage,
  TutorTeachRuntimeStatus,
  TutorTeachRuntimeViewModel,
} from "./TutorChat.types";
import {
  detectMarkdownTable,
  detectMermaidBlock,
  summarizeProvenance,
  summarizeConfidence,
  TOOL_ICONS,
} from "./TutorChat.types";
import { ICON_SM, TEXT_BADGE } from "@/lib/theme";

function VerdictBadge({ verdict }: { verdict: TutorVerdict }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    verdict.verdict === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : verdict.verdict === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    verdict.verdict === "pass"
      ? "PASS"
      : verdict.verdict === "fail"
        ? "FAIL"
        : "PARTIAL";

  return (
    <div className={`mt-2 pt-2 border-t border-primary/20`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {verdict.verdict === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        {verdict.confidence != null && (
          <span className="font-terminal text-[10px] opacity-70">
            ({Math.round(verdict.confidence * 100)}%)
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {verdict.why_wrong && (
            <p>
              <span className="text-red-400">Why wrong:</span> {verdict.why_wrong}
            </p>
          )}
          {verdict.error_location?.node && (
            <p>
              <span className="text-yellow-400">Error at:</span>{" "}
              {verdict.error_location.node}
              {verdict.error_location.prereq_from &&
                ` (prereq: ${verdict.error_location.prereq_from} → ${verdict.error_location.prereq_to})`}
            </p>
          )}
          {verdict.next_hint && (
            <p>
              <span className="text-info">Hint:</span> {verdict.next_hint}
            </p>
          )}
          {verdict.next_question && (
            <p>
              <span className="text-primary">Next Q:</span> {verdict.next_question}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeachBackBadge({ rubric }: { rubric: TeachBackRubric }) {
  const [expanded, setExpanded] = useState(false);
  const color =
    rubric.overall_rating === "pass"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : rubric.overall_rating === "fail"
        ? "border-red-600 text-red-400 bg-red-950/30"
        : "border-yellow-600 text-yellow-400 bg-yellow-950/30";
  const label =
    rubric.overall_rating === "pass"
      ? "TEACH-BACK PASS"
      : rubric.overall_rating === "fail"
        ? "TEACH-BACK FAIL"
        : "TEACH-BACK PARTIAL";

  return (
    <div className="mt-2 pt-2 border-t border-primary/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${color}`}
      >
        {rubric.overall_rating === "pass" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {label}
        <span className="font-terminal text-[10px] opacity-70">
          A:{rubric.accuracy_score} B:{rubric.breadth_score} S:{rubric.synthesis_score}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          {rubric._mastery_blocked && (
            <p className="text-red-400">Teach-back flagged a repair block for deeper mastery.</p>
          )}
          {rubric.strengths && rubric.strengths.length > 0 && (
            <p>
              <span className="text-green-400">Strengths:</span> {rubric.strengths.join(", ")}
            </p>
          )}
          {rubric.misconceptions && rubric.misconceptions.length > 0 && (
            <p>
              <span className="text-red-400">Misconceptions:</span> {rubric.misconceptions.join(", ")}
            </p>
          )}
          {rubric.gaps && rubric.gaps.length > 0 && (
            <p>
              <span className="text-yellow-400">Gaps:</span>{" "}
              {rubric.gaps.map((g) => g.skill_id).join(", ")}
            </p>
          )}
          {rubric.next_focus && (
            <p>
              <span className="text-primary">Next focus:</span> {rubric.next_focus}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProvenanceBadge({ msg }: { msg: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  const summary = summarizeProvenance(msg);
  const confidence = summarizeConfidence(msg);
  const colorClass =
    summary.tone === "source"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : summary.tone === "notes"
        ? "border-info/60 text-info bg-info/10"
        : summary.tone === "mixed"
          ? "border-yellow-600 text-yellow-300 bg-yellow-950/30"
          : "border-zinc-600 text-zinc-300 bg-zinc-950/30";
  const confidenceClass =
    confidence.tone === "high"
      ? "border-green-600 text-green-400 bg-green-950/30"
      : confidence.tone === "medium"
        ? "border-yellow-600 text-yellow-300 bg-yellow-950/30"
        : "border-red-600 text-red-300 bg-red-950/30";

  return (
    <div className="mt-2 pt-2 border-t border-primary/20">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${colorClass}`}>
          {summary.label}
        </span>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 font-arcade text-xs border-2 ${confidenceClass}`}>
          {confidence.label}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="px-2 py-1 text-xs font-arcade border-2 border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/50"
        >
          WHERE FROM?
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-1 font-terminal text-xs text-zinc-300">
          <p className="text-primary">Confidence</p>
          {confidence.details.map((detail) => (
            <p key={`confidence-${detail}`}>{detail}</p>
          ))}
          <p className="pt-1 text-primary">Provenance</p>
          {summary.details.map((detail) => (
            <p key={`provenance-${detail}`}>{detail}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface MessageListProps {
  messages: ChatMessage[];
  teachRuntime?: TutorTeachRuntimeViewModel | null;
  onArtifactCreated: (artifact: { type: string; content: string; title?: string }) => void;
  onStudioCapture?: (capture: {
    content: string;
    title?: string;
    itemType?: string;
    target: "note" | "summary_board";
    sourceKind?: string;
    sourcePath?: string;
    sourceLocator?: Record<string, unknown>;
  }) => void;
  onCaptureNote?: (payload: {
    mode: "exact" | "editable";
    message: ChatMessage;
    index: number;
  }) => void;
  onFeedback?: (payload: {
    sentiment: "liked" | "disliked";
    message: ChatMessage;
    index: number;
  }) => void;
}

const RUNTIME_STATUS_STYLES: Record<TutorTeachRuntimeStatus, string> = {
  live: "border-primary/40 bg-primary/10 text-primary",
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  locked: "border-red-500/30 bg-red-500/10 text-red-200",
  complete: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  skipped: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  fallback: "border-secondary/40 bg-secondary/10 text-secondary-foreground",
};

function runtimeBadgeClasses(status: TutorTeachRuntimeStatus): string {
  return `rounded-none border px-2 py-1 font-arcade text-[10px] uppercase tracking-[0.18em] ${RUNTIME_STATUS_STYLES[status]}`;
}

function TeachRuntimeRail({ teachRuntime }: { teachRuntime: TutorTeachRuntimeViewModel }) {
  const fields = [
    teachRuntime.stage,
    teachRuntime.conceptType,
    {
      label: "Depth lane",
      value: `${teachRuntime.depth.current} (${teachRuntime.depth.start} -> ${teachRuntime.depth.ceiling})`,
      status: teachRuntime.depth.status,
    },
    teachRuntime.requiredArtifact,
    teachRuntime.functionConfirmation,
    teachRuntime.l4Unlock,
    teachRuntime.mnemonic,
  ];

  return (
    <div data-testid="message-runtime-rail" className="mt-2 border-t border-primary/20 pt-2">
      <div className="mb-2 font-arcade text-[10px] uppercase tracking-[0.18em] text-primary">
        Live TEACH Contract
      </div>
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <span key={`${field.label}-${field.value}`} className={runtimeBadgeClasses(field.status)}>
            {field.label}: {field.value}
          </span>
        ))}
      </div>
      {teachRuntime.missingBackendFields.length > 0 ? (
        <div className="mt-2 font-terminal text-xs leading-5 text-muted-foreground">
          Waiting on backend fields: {teachRuntime.missingBackendFields.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function getChatMessageKey(msg: ChatMessage) {
  if (msg.messageId) return msg.messageId;
  return [
    msg.role,
    msg.model ?? "",
    msg.content,
    msg.isStreaming ? "streaming" : "static",
    JSON.stringify(msg.citations ?? []),
    JSON.stringify(msg.toolActions ?? []),
    msg.verdict?.verdict ?? "",
    msg.teachBackRubric?.overall_rating ?? "",
  ].join("::");
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  function MessageList(
    { messages, teachRuntime, onArtifactCreated, onStudioCapture, onCaptureNote, onFeedback },
    ref,
  ) {
    const [openStudioMenuIndex, setOpenStudioMenuIndex] = useState<number | null>(null);

    return (
      <div ref={ref} className="flex-1 overflow-y-auto space-y-4 bg-black/40 p-4 lg:p-6">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="font-arcade text-sm text-primary">
              SESSION STARTED
            </div>
            <div className="font-terminal text-lg text-muted-foreground leading-7">
              Ask a question to begin learning. Use /note, /card, /map, /table, or /smap for artifacts.
            </div>
            {teachRuntime ? (
              <div className="mx-auto mt-4 max-w-4xl rounded-none border border-primary/20 bg-black/35 p-3 text-left">
                <div className="mb-3 font-arcade text-[10px] uppercase tracking-[0.18em] text-primary">
                  Current Teaching Contract
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    teachRuntime.stage,
                    teachRuntime.conceptType,
                    teachRuntime.bridge,
                    {
                      label: "Depth lane",
                      value: `${teachRuntime.depth.start} -> ${teachRuntime.depth.current} -> ${teachRuntime.depth.ceiling}`,
                      status: teachRuntime.depth.status,
                    },
                    teachRuntime.requiredArtifact,
                    teachRuntime.functionConfirmation,
                    teachRuntime.l4Unlock,
                    teachRuntime.mnemonic,
                  ].map((field) => (
                    <div key={`${field.label}-${field.value}`} className="rounded-none border border-primary/10 bg-black/40 p-2">
                      <div className="font-arcade text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {field.label}
                      </div>
                      <div className="mt-2 font-terminal text-xs leading-5 text-foreground">
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={getChatMessageKey(msg)}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-3 py-2 text-[17px] leading-7 font-terminal overflow-hidden ${msg.role === "user"
                ? "max-w-[72%]"
                : "max-w-[96%]"
                } ${msg.role === "user"
                  ? "bg-primary/15 border-2 border-primary/40 text-foreground"
                  : "bg-black/40 border-2 border-secondary text-foreground"
                }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-lg max-w-none font-terminal [&_p]:my-2 [&_li]:my-1 [&_p]:leading-7 [&_li]:leading-7 [&_code]:text-base [&_pre]:text-base [&_pre]:overflow-x-auto [&_code]:break-words [&_a]:break-all">
                  {msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.isStreaming ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : null}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                  )}
                </div>
              ) : (
                <div>{msg.content}</div>
              )}

              {msg.role === "assistant" && msg.toolActions?.length ? (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-primary/20">
                  {msg.toolActions.map((ta, j) => {
                    const Icon = TOOL_ICONS[ta.tool] ?? FileText;
                    return (
                      <div
                        key={j}
                        className={`flex items-center gap-1.5 px-2 py-1 text-xs font-terminal border ${ta.success
                          ? "border-green-600/50 text-green-400 bg-green-950/30"
                          : "border-red-600/50 text-red-400 bg-red-950/30"
                          }`}
                      >
                        {ta.success ? (
                          <CheckCircle2 className={`${ICON_SM} shrink-0`} />
                        ) : (
                          <XCircle className={`${ICON_SM} shrink-0`} />
                        )}
                        <Icon className={`${ICON_SM} shrink-0`} />
                        <span className="truncate max-w-[200px]">{ta.message}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {msg.verdict && !msg.isStreaming && (
                <VerdictBadge verdict={msg.verdict} />
              )}

              {msg.teachBackRubric && !msg.isStreaming && (
                <TeachBackBadge rubric={msg.teachBackRubric} />
              )}

              {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                <ProvenanceBadge msg={msg} />
              )}

              {msg.role === "assistant" && msg.content && !msg.isStreaming && teachRuntime && i === messages.length - 1 ? (
                <TeachRuntimeRail teachRuntime={teachRuntime} />
              ) : null}

              {msg.role === "assistant" && msg.content && !msg.isStreaming && (
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                  {onCaptureNote ? (
                    <>
                      <button
                        onClick={() =>
                          onCaptureNote({
                            mode: "exact",
                            message: msg,
                            index: i,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                      >
                        <FileText className={`${ICON_SM} text-primary/60`} /> Save Exact
                      </button>
                      <button
                        onClick={() =>
                          onCaptureNote({
                            mode: "editable",
                            message: msg,
                            index: i,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                      >
                        <StickyNote className={`${ICON_SM} text-primary/60`} /> Save Editable
                      </button>
                    </>
                  ) : null}
                  {onFeedback ? (
                    <>
                      <button
                        onClick={() =>
                          onFeedback({
                            sentiment: "liked",
                            message: msg,
                            index: i,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-green-300 hover:bg-green-500/10 border-2 border-primary/20 hover:border-green-500/50 transition-colors shadow-none"
                      >
                        <CheckCircle2 className={`${ICON_SM} text-green-400`} /> Like
                      </button>
                      <button
                        onClick={() =>
                          onFeedback({
                            sentiment: "disliked",
                            message: msg,
                            index: i,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-red-300 hover:bg-red-500/10 border-2 border-primary/20 hover:border-red-500/50 transition-colors shadow-none"
                      >
                        <XCircle className={`${ICON_SM} text-red-400`} /> Dislike
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() =>
                      onArtifactCreated({
                        type: "note",
                        content: msg.content,
                        title: `Tutor note ${i}`,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                  >
                    <FileText className={`${ICON_SM} text-primary/60`} /> Save Note
                  </button>
                  <button
                    onClick={() =>
                      onArtifactCreated({
                        type: "card",
                        content: msg.content,
                        title: `Tutor card ${i}`,
                      })
                    }
                    className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                  >
                    <CreditCard className={`${ICON_SM} text-primary/60`} /> Create Card
                  </button>
                  <button
                    onClick={() => {
                      onArtifactCreated({
                        type: "map",
                        content: msg.content,
                        title: `Tutor map ${i}`,
                      });
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                  >
                    <Map className={`${ICON_SM} text-primary/60`} /> Create Map
                  </button>
                  {detectMarkdownTable(msg.content) && (
                    <button
                      onClick={() => {
                        const table = detectMarkdownTable(msg.content);
                        if (table) {
                          onArtifactCreated({
                            type: "note",
                            content: table,
                            title: `Table ${i}`,
                          });
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <Table2 className={`${ICON_SM} text-primary/60`} /> Save Table
                    </button>
                  )}
                  {detectMermaidBlock(msg.content) && (
                    <button
                      onClick={() => {
                        const mermaid = detectMermaidBlock(msg.content);
                        if (mermaid) {
                          onArtifactCreated({
                            type: "map",
                            content: "```mermaid\n" + mermaid + "\n```",
                            title: `Structured map ${i}`,
                          });
                        }
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                    >
                      <Network className={`${ICON_SM} text-primary/60`} /> Save Map
                    </button>
                  )}
                  {onStudioCapture ? (
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenStudioMenuIndex((prev) => (prev === i ? null : i))
                        }
                        className="flex items-center gap-1 px-2 py-1 text-xs font-arcade text-muted-foreground hover:text-primary hover:bg-primary/10 border-2 border-primary/20 hover:border-primary/50 transition-colors shadow-none"
                      >
                        <StickyNote className={`${ICON_SM} text-primary/60`} />
                        To Studio
                      </button>
                      {openStudioMenuIndex === i ? (
                        <div className="absolute right-0 z-20 mt-1 w-48 border-2 border-primary/30 bg-black/95 p-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              onStudioCapture({
                                content: msg.content,
                                title: `Tutor note ${i}`,
                                itemType: "note",
                                target: "note",
                                sourceKind: "tutor_chat",
                              });
                              setOpenStudioMenuIndex(null);
                            }}
                            className="block w-full px-2 py-2 text-left font-arcade text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            NOTE
                            <div className="mt-1 font-terminal text-[11px] normal-case text-muted-foreground">
                              Send this response into Studio exactly as-is.
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onStudioCapture({
                                content: msg.content,
                                title: `Tutor summary ${i}`,
                                itemType: "summary",
                                target: "summary_board",
                                sourceKind: "tutor_chat",
                              });
                              setOpenStudioMenuIndex(null);
                            }}
                            className="block w-full px-2 py-2 text-left font-arcade text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            SUMMARY BOARD
                            <div className="mt-1 font-terminal text-[11px] normal-case text-muted-foreground">
                              Queue it for cleanup, merging, and later promotion.
                            </div>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Citations + Model */}
              {(msg.citations?.length || msg.model || msg.retrievalDebug) && !msg.isStreaming ? (
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-primary/20">
                  {msg.retrievalDebug ? (
                    <Badge variant="outline" className="text-[11px] rounded-none text-muted-foreground/80">
                      RAG debug | {msg.retrievalDebug.effective_accuracy_profile ?? msg.retrievalDebug.accuracy_profile ?? "strict"}{msg.retrievalDebug.profile_escalated ? " (escalated)" : ""} | conf {(msg.retrievalDebug.retrieval_confidence ?? 0).toFixed(2)} ({msg.retrievalDebug.retrieval_confidence_tier ?? "low"}) | uniq {msg.retrievalDebug.retrieved_material_unique_sources ?? 0} | top {Math.round((msg.retrievalDebug.material_top_source_share ?? 0) * 100)}% | dropped {msg.retrievalDebug.material_dropped_by_cap ?? 0}
                    </Badge>
                  ) : null}
                  {msg.citations?.map((c) =>
                    c.url ? (
                      <a
                        key={c.index}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge
                          variant="outline"
                          className={`${TEXT_BADGE} cursor-pointer hover:bg-primary/10`}
                        >
                          [{c.index}] {c.source}
                        </Badge>
                      </a>
                    ) : (
                      <Badge
                        key={c.index}
                        variant="outline"
                        className={TEXT_BADGE}
                      >
                        [{c.index}] {c.source}
                      </Badge>
                    )
                  )}
                  {msg.model && (
                    <Badge variant="outline" className={`${TEXT_BADGE} text-muted-foreground/60 ml-auto`}>
                      {msg.model}
                    </Badge>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }
);
