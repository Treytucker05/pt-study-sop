import { useState, useCallback, useEffect, useMemo, useReducer } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  BTN_OUTLINE,
  PANEL_PADDING,
  ICON_SM,
  ICON_MD,
  ICON_LG,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  CreditCard,
  Map,
  Clock,
  MessageSquare,
  BookOpen,
  Trash2,
  FolderOpen,
  Check,
  X,
  Loader2,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { TutorSessionSummary, TutorSessionWrapSummary } from "@/lib/api";

export interface TutorArtifact {
  type: "note" | "card" | "map" | "structured_notes";
  title: string;
  content: string;
  createdAt: string;
  cardId?: number;
}

interface TutorArtifactsProps {
  sessionId: string | null;
  artifacts: TutorArtifact[];
  turnCount: number;
  topic: string;
  startedAt: string | null;
  onCreateArtifact: (artifact: { type: "note" | "card" | "map" | "structured_notes"; content: string; title: string }) => void;
  isSessionCompleted?: boolean;
  recentSessions: TutorSessionSummary[];
  onResumeSession: (sessionId: string) => void;
  /** Delete selected artifact entries by index (persists to session). Called after API success. */
  onDeleteArtifacts?: (
    sessionId: string,
    indexes: number[]
  ) => Promise<ArtifactDeleteResult | void>;
  onEndSession?: (sessionId: string) => Promise<void> | void;
  /** Clear active session UI state without calling the API (for bulk ops that already ended via API). */
  onClearActiveSession?: () => void;
}

interface BulkDeleteFailureDetail {
  sessionId: string;
  reason: string;
}

interface BulkActionReport {
  title: string;
  requested: number;
  deleted: number;
  skipped: number;
  requestId?: string;
  skippedIndexes?: number[];
  failures: BulkDeleteFailureDetail[];
}

interface ArtifactDeleteResult {
  request_id?: string;
  requested_count?: number;
  applied_count?: number;
  skipped_indexes?: number[];
}

const ARTIFACT_ICONS: Record<string, typeof FileText> = {
  note: FileText,
  card: CreditCard,
  map: Map,
  structured_notes: FileText,
};

const ARTIFACT_COLORS: Record<string, string> = {
  note: "text-primary",
  card: "text-yellow-400",
  map: "text-green-400",
  structured_notes: "text-info",
};

const VISIBLE_SESSIONS_LIMIT = 8;

// ---------------------------------------------------------------------------
// Markdown table parser
// ---------------------------------------------------------------------------

function parseMarkdownTable(md: string): { headers: string[]; rows: string[][] } | null {
  const lines = md.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const parseLine = (line: string): string[] =>
    line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);

  const headers = parseLine(lines[0]);
  if (headers.length === 0) return null;

  // Check for separator row (must contain dashes)
  const sep = lines[1];
  if (!/^[\s|:-]+$/.test(sep)) return null;

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    if (cells.length > 0) rows.push(cells);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Table artifact renderer
// ---------------------------------------------------------------------------

function ArtifactTable({ content }: { content: string }) {
  const table = parseMarkdownTable(content);
  if (!table) {
    return <div className={`${TEXT_MUTED} mt-1 line-clamp-3`}>{content.slice(0, 200)}</div>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="border-2 border-primary w-full border-collapse">
        <thead>
          <tr className="bg-primary/20">
            {table.headers.map((h) => (
              <th
                key={h}
                className="font-arcade text-xs uppercase text-primary/80 px-2 py-1.5 text-left border border-primary/30"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={row.join("|")} className={ri % 2 === 0 ? "bg-card/50" : ""}>
              {row.map((cell) => (
                <td
                  key={`${row.join("|")}-${cell}`}
                  className="font-terminal text-sm px-2 py-1 border border-primary/20 text-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isMarkdownTable(content: string): boolean {
  return Boolean(parseMarkdownTable(content));
}

// ---------------------------------------------------------------------------
// Structured map artifact renderer
// ---------------------------------------------------------------------------

/**
 * Convert mermaid graph content into Obsidian .canvas JSON format.
 * Parses nodes and edges from simple mermaid graph/flowchart syntax.
 */
function mermaidToCanvasJson(mermaidContent: string, title: string): string {
  const raw = mermaidContent.replace(/```mermaid\s*\n?/, "").replace(/```\s*$/, "").trim();
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const nodes: { id: string; x: number; y: number; width: number; height: number; type: string; text: string }[] = [];
  const edges: { id: string; fromNode: string; toNode: string; fromSide: string; toSide: string }[] = [];
  const nodeSet = new Set<string>();
  let edgeIdx = 0;

  const ensureNode = (id: string, label?: string) => {
    if (nodeSet.has(id)) return;
    nodeSet.add(id);
    const col = nodes.length % 3;
    const row = Math.floor(nodes.length / 3);
    nodes.push({
      id,
      x: col * 280 + 40,
      y: row * 160 + 40,
      width: 240,
      height: 80,
      type: "text",
      text: label || id,
    });
  };

  // Parse mermaid lines for nodes and edges (simple flowchart patterns)
  for (const line of lines) {
    if (/^(graph|flowchart|mindmap)\b/i.test(line)) continue;
    // Match: A --> B, A["label"] --> B["label"], A --- B, A --> |text| B
    const edgeMatch = line.match(
      /^(\w+)(?:\["([^"]+)"\]|\(["']?([^)"']+)["']?\))?\s*(?:-->|---|==>|-.->)\s*(?:\|[^|]*\|\s*)?(\w+)(?:\["([^"]+)"\]|\(["']?([^)"']+)["']?\))?/
    );
    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const fromLabel = edgeMatch[2] || edgeMatch[3];
      const toId = edgeMatch[4];
      const toLabel = edgeMatch[5] || edgeMatch[6];
      ensureNode(fromId, fromLabel);
      ensureNode(toId, toLabel);
      edges.push({
        id: `edge-${edgeIdx++}`,
        fromNode: fromId,
        toNode: toId,
        fromSide: "right",
        toSide: "left",
      });
      continue;
    }
    // Standalone node: A["label"] or A("label")
    const nodeMatch = line.match(/^(\w+)(?:\["([^"]+)"\]|\(["']?([^)"']+)["']?\))\s*$/);
    if (nodeMatch) {
      ensureNode(nodeMatch[1], nodeMatch[2] || nodeMatch[3]);
    }
  }

  // If no nodes parsed, create a single node with the raw content
  if (nodes.length === 0) {
    nodes.push({
      id: "root",
      x: 40,
      y: 40,
      width: 400,
      height: 200,
      type: "text",
      text: `# ${title}\n\n${raw}`,
    });
  }

  return JSON.stringify({ nodes, edges }, null, 2);
}

function ArtifactStructuredMap({ content, title }: { content: string; title: string }) {
  const [saving, setSaving] = useState(false);
  const isMermaid = content.trimStart().startsWith("```mermaid");
  const figmaUrl = content.match(/https?:\/\/(?:www\.)?figma\.com\/\S+/)?.[0];

  const handleSaveCanvas = async () => {
    setSaving(true);
    try {
      const canvasJson = mermaidToCanvasJson(content, title || "Structured Map");
      const safeName = (title || "Structured Map").replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Map";
      const path = `Study Sessions/${safeName}.canvas`;
      await api.obsidian.saveFile(path, canvasJson);
      toast.success(`Canvas saved: ${path}`);
    } catch (err) {
      toast.error(`Canvas save failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 relative">
      <Badge
        variant="outline"
        className="absolute top-1 right-1 z-10 border-primary/50 text-primary font-arcade text-[8px] px-1 h-4"
      >
        STRUCTURED MAP
      </Badge>
      {isMermaid ? (
        <div className={`${TEXT_MUTED} mt-1 line-clamp-3`}>
          {content.replace(/```mermaid\n?/, "").replace(/```$/, "").slice(0, 120)}
        </div>
      ) : (
        <div className={`${TEXT_MUTED} mt-1 line-clamp-2`}>{content.slice(0, 100)}</div>
      )}
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {figmaUrl && (
          <a
            href={figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-terminal text-sm text-primary hover:text-white border border-primary/40 px-2 py-0.5"
          >
            <ExternalLink className={ICON_SM} />
            Open in Figma
          </a>
        )}
        {isMermaid && (
          <Button
            variant="outline"
            size="sm"
            className={`${BTN_OUTLINE} gap-1`}
            disabled={saving}
            onClick={handleSaveCanvas}
          >
            {saving ? <Loader2 className={`${ICON_SM} animate-spin`} /> : <FolderOpen className={ICON_SM} />}
            {saving ? "Saving..." : "Save as Canvas"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session Wrap Panel
// ---------------------------------------------------------------------------

function SessionWrapPanel({
  sessionId,
  isCompleted,
}: {
  sessionId: string;
  isCompleted: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const {
    data: summary = null,
    error,
    isLoading: loading,
  } = useQuery<TutorSessionWrapSummary>({
    queryKey: ["tutor-session-summary", sessionId],
    queryFn: () => api.tutor.getSessionSummary(sessionId),
    enabled: isCompleted && Boolean(sessionId),
    staleTime: 60 * 1000,
  });

  if (!isCompleted) return null;

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.tutor.getSessionSummary(sessionId, { save: true });
      toast.success("Summary saved to Obsidian");
    } catch (err) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-2 border-accent bg-card p-4 space-y-3">
      <div className="font-arcade text-sm text-accent tracking-wider flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        SESSION WRAP
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground font-terminal text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading summary...
        </div>
      )}

      {error && (
        <div className="font-terminal text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load summary"}
        </div>
      )}

      {summary && (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="border border-primary/30 bg-black/40 px-2 py-1 text-center min-w-[60px]">
              <div className="font-arcade text-xs text-primary">{formatDuration(summary.duration_seconds)}</div>
              <div className="font-terminal text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="border border-primary/30 bg-black/40 px-2 py-1 text-center min-w-[60px]">
              <div className="font-arcade text-xs text-primary">{summary.turn_count}</div>
              <div className="font-terminal text-xs text-muted-foreground">Turns</div>
            </div>
            <div className="border border-primary/30 bg-black/40 px-2 py-1 text-center min-w-[60px]">
              <div className="font-arcade text-xs text-primary">{summary.artifact_count}</div>
              <div className="font-terminal text-xs text-muted-foreground">Artifacts</div>
            </div>
          </div>

          {/* Objectives covered */}
          {summary.objectives_covered.length > 0 && (
            <div className="space-y-1">
              <div className="font-arcade text-xs text-primary/70 uppercase tracking-wider">Objectives</div>
              {summary.objectives_covered.map((obj) => (
                <div key={obj.id} className="flex items-center gap-2 font-terminal text-sm">
                  <span
                    className={
                      obj.status === "covered"
                        ? "text-green-400"
                        : obj.status === "partial"
                        ? "text-yellow-400"
                        : "text-muted-foreground/50"
                    }
                  >
                    {obj.status === "covered" ? "+" : obj.status === "partial" ? "~" : "-"}
                  </span>
                  <span className="text-foreground">{obj.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chain progress */}
          {summary.chain_progress && (
            <div className="space-y-1">
              <div className="font-arcade text-xs text-primary/70 uppercase tracking-wider">
                Chain: {summary.chain_progress.chain_name}
              </div>
              <div className="w-full h-2 bg-black/60 border border-primary/30">
                <div
                  className="h-full bg-primary/60"
                  style={{
                    width: `${Math.round(
                      (summary.chain_progress.current_block / summary.chain_progress.total_blocks) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="font-terminal text-xs text-muted-foreground">
                {summary.chain_progress.current_block}/{summary.chain_progress.total_blocks} blocks
              </div>
            </div>
          )}

          {/* Save button */}
          <Button
            variant="outline"
            size="sm"
            className={`${BTN_OUTLINE} w-full gap-1.5`}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? <Loader2 className={`${ICON_SM} animate-spin`} /> : <FolderOpen className={ICON_SM} />}
            {saving ? "Saving..." : "Save to Obsidian"}
          </Button>
        </>
      )}
    </div>
  );
}

type BulkPrompt =
  | { type: "sessions"; action: "delete" | "end"; count: number }
  | { type: "artifacts"; count: number }
  | null;

type TutorArtifactsUiState = {
  deleteConfirm: string | null;
  endConfirm: string | null;
  savingSession: string | null;
  endingSession: string | null;
  deletingSessions: boolean;
  deletingArtifacts: boolean;
  endingSessions: boolean;
  bulkActionReport: BulkActionReport | null;
  bulkPrompt: BulkPrompt;
  selectedSessionIds: Set<string>;
  selectedArtifactIndices: Set<number>;
};

type TutorArtifactsUiPatch = Partial<
  Omit<TutorArtifactsUiState, "selectedSessionIds" | "selectedArtifactIndices">
>;

type TutorArtifactsUiAction =
  | { type: "patch"; patch: TutorArtifactsUiPatch }
  | { type: "toggleSession"; sessionId: string }
  | { type: "setSelectedSessions"; sessionIds: string[] }
  | { type: "pruneSelectedSessions"; visibleIds: Set<string> }
  | { type: "removeSelectedSession"; sessionId: string }
  | { type: "clearSelectedSessions" }
  | { type: "toggleArtifact"; index: number }
  | { type: "setSelectedArtifacts"; indices: number[] }
  | { type: "pruneSelectedArtifacts"; artifactCount: number }
  | { type: "clearSelectedArtifacts" };

function createTutorArtifactsUiState(): TutorArtifactsUiState {
  return {
    deleteConfirm: null,
    endConfirm: null,
    savingSession: null,
    endingSession: null,
    deletingSessions: false,
    deletingArtifacts: false,
    endingSessions: false,
    bulkActionReport: null,
    bulkPrompt: null,
    selectedSessionIds: new Set(),
    selectedArtifactIndices: new Set(),
  };
}

function tutorArtifactsUiReducer(
  state: TutorArtifactsUiState,
  action: TutorArtifactsUiAction,
): TutorArtifactsUiState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "toggleSession": {
      const next = new Set(state.selectedSessionIds);
      if (next.has(action.sessionId)) next.delete(action.sessionId);
      else next.add(action.sessionId);
      return { ...state, selectedSessionIds: next };
    }
    case "setSelectedSessions":
      return { ...state, selectedSessionIds: new Set(action.sessionIds) };
    case "pruneSelectedSessions": {
      const next = new Set<string>();
      let changed = false;
      state.selectedSessionIds.forEach((sessionId) => {
        if (action.visibleIds.has(sessionId)) {
          next.add(sessionId);
        } else {
          changed = true;
        }
      });
      return changed ? { ...state, selectedSessionIds: next } : state;
    }
    case "removeSelectedSession": {
      if (!state.selectedSessionIds.has(action.sessionId)) return state;
      const next = new Set(state.selectedSessionIds);
      next.delete(action.sessionId);
      return { ...state, selectedSessionIds: next };
    }
    case "clearSelectedSessions":
      return state.selectedSessionIds.size === 0
        ? state
        : { ...state, selectedSessionIds: new Set() };
    case "toggleArtifact": {
      const next = new Set(state.selectedArtifactIndices);
      if (next.has(action.index)) next.delete(action.index);
      else next.add(action.index);
      return { ...state, selectedArtifactIndices: next };
    }
    case "setSelectedArtifacts":
      return { ...state, selectedArtifactIndices: new Set(action.indices) };
    case "pruneSelectedArtifacts": {
      const next = new Set<number>();
      let changed = false;
      state.selectedArtifactIndices.forEach((index) => {
        if (index >= 0 && index < action.artifactCount) {
          next.add(index);
        } else {
          changed = true;
        }
      });
      return changed ? { ...state, selectedArtifactIndices: next } : state;
    }
    case "clearSelectedArtifacts":
      return state.selectedArtifactIndices.size === 0
        ? state
        : { ...state, selectedArtifactIndices: new Set() };
    default:
      return state;
  }
}

function getSessionDisplay(session: TutorSessionSummary) {
  const mode = session.mode || "Core";
  return {
    mode,
    topic: session.topic || mode || "Tutor Session",
  };
}

async function saveTutorSessionToObsidian(
  session: TutorSessionSummary,
  setSavingSession: (value: string | null) => void,
) {
  const displayMode = session.mode || "Core";
  const displayTopic = session.topic || displayMode || "Tutor Session";

  setSavingSession(session.session_id);
  try {
    const full = await api.tutor.getSession(session.session_id);
    if (!full.turns || full.turns.length === 0) {
      toast.error("No turns to save");
      return;
    }

    const lines: string[] = [
      `# Tutor: ${displayTopic}`,
      `**Date:** ${new Date(session.started_at).toLocaleDateString()}`,
      `**Mode:** ${displayMode} | **Turns:** ${session.turn_count}`,
      "",
      "---",
      "",
    ];

    for (const turn of full.turns) {
      lines.push(`## Q${turn.turn_number}`);
      lines.push(turn.question);
      lines.push("");
      if (turn.answer) {
        lines.push(`**Answer:**`);
        lines.push(turn.answer);
        lines.push("");
      }
    }

    if (full.artifacts_json) {
      try {
        const artifacts = JSON.parse(full.artifacts_json);
        if (Array.isArray(artifacts) && artifacts.length > 0) {
          lines.push("---", "", "## Artifacts", "");
          for (const artifact of artifacts) {
            if (artifact.type === "note" && artifact.content) {
              lines.push(`### Note: ${artifact.title}`, artifact.content, "");
            } else if (artifact.type === "map" && artifact.content) {
              lines.push(`### Mind Map: ${artifact.title}`, "```mermaid", artifact.content, "```", "");
            } else if (artifact.type === "card") {
              lines.push(
                `### Card: ${artifact.title}`,
                `**Front:** ${artifact.title}`,
                `**Back:** ${artifact.content || ""}`,
                "",
              );
            }
          }
        }
      } catch {
        /* ignore parse errors */
      }
    }

    const filename = `Tutor - ${displayTopic.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Session"}`;
    const path = `Study Sessions/${filename}.md`;

    await api.obsidian.append(path, lines.join("\n"));
    toast.success(`Saved to Obsidian: ${path}`);
  } catch (err) {
    toast.error(`Save failed: ${err instanceof Error ? err.message : "Unknown"}`);
  } finally {
    setSavingSession(null);
  }
}

async function deleteSingleTutorArtifact({
  index,
  sessionId,
  onDeleteArtifacts,
  selectedArtifactIndices,
  onReport,
  onSelectedArtifactIndicesChange,
}: {
  index: number;
  sessionId: string;
  onDeleteArtifacts: (
    sessionId: string,
    indexes: number[],
  ) => Promise<ArtifactDeleteResult | void>;
  selectedArtifactIndices: Set<number>;
  onReport: (report: BulkActionReport) => void;
  onSelectedArtifactIndicesChange: (indices: number[]) => void;
}) {
  try {
    const result = await onDeleteArtifacts(sessionId, [index]);
    if (result) {
      const requested = result.requested_count ?? 1;
      const deleted = result.applied_count ?? 1;
      if (result.request_id || deleted < requested) {
        onReport({
          title: "Artifact delete completed",
          requested,
          deleted,
          skipped: Math.max(requested - deleted, 0),
          requestId: result.request_id,
          skippedIndexes: result.skipped_indexes,
          failures: [],
        });
      }
    }
    onSelectedArtifactIndicesChange(
      Array.from(selectedArtifactIndices).filter((selectedIndex) => selectedIndex !== index),
    );
    toast.success("Artifact deleted");
  } catch {
    toast.error("Delete failed");
  }
}

async function deleteTutorSession({
  targetSessionId,
  activeSessionId,
  queryClient,
  onClearActiveSession,
  onBeforeDelete,
  onAfterDelete,
}: {
  targetSessionId: string;
  activeSessionId: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
  onClearActiveSession?: () => void;
  onBeforeDelete: () => void;
  onAfterDelete: (deleted: boolean) => void;
}) {
  onBeforeDelete();
  try {
    const result = await api.tutor.deleteSession(targetSessionId);
    await queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    if (result.deleted) {
      toast.success("Session deleted");
    } else {
      toast.success("Session already deleted");
    }
    if (targetSessionId === activeSessionId && onClearActiveSession) {
      onClearActiveSession();
    }
    onAfterDelete(true);
  } catch (err) {
    toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    onAfterDelete(false);
  }
}

async function endTutorSession({
  targetSessionId,
  onEndSession,
  queryClient,
  onBeforeEnd,
  onAfterEnd,
}: {
  targetSessionId: string;
  onEndSession?: (sessionId: string) => Promise<void> | void;
  queryClient: ReturnType<typeof useQueryClient>;
  onBeforeEnd: () => void;
  onAfterEnd: (ended: boolean) => void;
}) {
  onBeforeEnd();
  try {
    if (onEndSession) {
      await onEndSession(targetSessionId);
    } else {
      await api.tutor.endSession(targetSessionId);
    }
    toast.success("Session ended");
    queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    onAfterEnd(true);
  } catch (err) {
    toast.error(`End failed: ${err instanceof Error ? err.message : "Unknown"}`);
    onAfterEnd(false);
  }
}

function BulkPromptOverlay({
  bulkPrompt,
  bulkDeleteIncludesActive,
  bulkPromptBusy,
  onCancel,
  onConfirm,
}: {
  bulkPrompt: Exclude<BulkPrompt, null>;
  bulkDeleteIncludesActive: boolean;
  bulkPromptBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-3">
      <div className="w-full max-w-sm border-[3px] border-double border-primary bg-black p-3 space-y-3 shadow-[0_0_0_1px_rgba(255,0,0,0.25)]">
        <div className="font-arcade text-xs tracking-wider text-primary">
          {bulkPrompt.type === "sessions" && bulkPrompt.action === "end"
            ? "END SESSIONS?"
            : "CONFIRM DELETE"}
        </div>
        <div className="font-terminal text-sm text-muted-foreground">
          {bulkPrompt.type === "sessions" && (
            <>
              {`${bulkPrompt.action === "end" ? "End" : "Delete"} ${bulkPrompt.count} selected session${bulkPrompt.count > 1 ? "s" : ""}? ${bulkPrompt.action === "end" ? "This will complete them." : "This cannot be undone."}`}
              {bulkDeleteIncludesActive && (
                <span className="block mt-2 text-yellow-300">
                  Warning: your active session is selected. You will be returned to WIZARD after
                  delete.
                </span>
              )}
            </>
          )}
          {bulkPrompt.type === "artifacts" &&
            `Delete ${bulkPrompt.count} selected artifact${bulkPrompt.count > 1 ? "s" : ""}? This cannot be undone.`}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-none font-terminal text-xs border-2 border-primary/50 bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-foreground"
            disabled={bulkPromptBusy}
            onClick={onCancel}
          >
            CANCEL
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-none font-arcade text-xs bg-primary/20 text-primary border-2 border-primary hover:bg-primary/30"
            disabled={bulkPromptBusy}
            onClick={onConfirm}
          >
            {bulkPromptBusy ? (
              <Loader2 className={`${ICON_SM} animate-spin`} />
            ) : bulkPrompt.type === "sessions" && bulkPrompt.action === "end" ? (
              "END"
            ) : (
              "DELETE"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkActionReportBanner({
  bulkActionReport,
  onDismiss,
}: {
  bulkActionReport: BulkActionReport;
  onDismiss: () => void;
}) {
  return (
    <div className={`${PANEL_PADDING} pt-2 pb-0 shrink-0`}>
      <div className="border-[3px] border-double border-yellow-500/50 bg-black/70 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="font-arcade text-[10px] tracking-wider text-yellow-300">
            {bulkActionReport.title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 rounded-none text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className={ICON_SM} />
          </Button>
        </div>
        <div className="font-terminal text-xs text-muted-foreground">
          Requested {bulkActionReport.requested} · Deleted {bulkActionReport.deleted} · Already
          gone {bulkActionReport.skipped} · Failed {bulkActionReport.failures.length}
          {bulkActionReport.requestId ? ` · request_id ${bulkActionReport.requestId}` : ""}
          {bulkActionReport.skippedIndexes && bulkActionReport.skippedIndexes.length > 0
            ? ` · skipped indexes ${bulkActionReport.skippedIndexes.join(",")}`
            : ""}
        </div>
        {bulkActionReport.failures.length > 0 && (
          <div className="font-terminal text-xs text-red-300 space-y-0.5 max-h-20 overflow-auto">
            {bulkActionReport.failures.slice(0, 5).map((failure) => (
              <div key={failure.sessionId}>
                {failure.sessionId}: {failure.reason}
              </div>
            ))}
            {bulkActionReport.failures.length > 5 && (
              <div className="text-muted-foreground">
                ...and {bulkActionReport.failures.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveSessionSummary({
  sessionId,
  topic,
  turnCount,
  startedAt,
}: {
  sessionId: string | null;
  topic: string;
  turnCount: number;
  startedAt: string | null;
}) {
  if (!sessionId) {
    return (
      <div className={`${TEXT_BODY} text-muted-foreground/50 py-3 text-center`}>No active session</div>
    );
  }

  return (
    <div className="space-y-2 pb-3 border-b border-muted-foreground/20">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-1.5 text-primary`}>
          FIRST PASS
        </Badge>
      </div>
      {topic && <div className={`${TEXT_BODY} text-sm`}>{topic}</div>}
      <div className={`flex items-center gap-3 ${TEXT_MUTED}`}>
        <span className="flex items-center gap-1">
          <MessageSquare className={ICON_SM} />
          {turnCount} turns
        </span>
        {startedAt && (
          <span className="flex items-center gap-1">
            <Clock className={ICON_SM} />
            {new Date(startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

/** For existing drafts with generic titles, derive a display title from back content. */
function deriveCardDisplayTitle(artifact: TutorArtifact, index: number): string {
  const title = artifact.title || "";
  // If title is meaningful (not generic pattern), use it as-is
  if (title && !/^Tutor flashcard\s*\d*$/i.test(title)) {
    return title;
  }
  // Try first meaningful line from back content
  if (artifact.content) {
    for (const line of artifact.content.split("\n")) {
      const stripped = line.replace(/^[#\-*>\s]+/, "").trim();
      if (stripped.length >= 5) {
        return stripped.length > 80 ? stripped.slice(0, 77) + "..." : stripped;
      }
    }
  }
  return title || `${artifact.type} #${index + 1}`;
}

function ArtifactCard({
  artifact,
  index,
  selected,
  sessionId,
  onToggle,
  onDelete,
  onSendToBrain,
}: {
  artifact: TutorArtifact;
  index: number;
  selected: boolean;
  sessionId: string | null;
  onToggle: (index: number) => void;
  onDelete?: (index: number) => Promise<void>;
  onSendToBrain: (content: string) => void;
}) {
  const Icon = ARTIFACT_ICONS[artifact.type] || FileText;
  const color = ARTIFACT_COLORS[artifact.type] || "text-muted-foreground";

  return (
    <div className="border-[3px] border-double border-muted-foreground/20 p-2.5 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-1.5">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggle(index)}
          onClick={(event) => event.stopPropagation()}
          className="w-3 h-3 shrink-0"
        />
        <Icon className={`${ICON_MD} ${color}`} />
        <span className={`${TEXT_BODY} text-sm truncate flex-1`}>
          {artifact.type === "card"
            ? deriveCardDisplayTitle(artifact, index)
            : artifact.title || `${artifact.type} #${index + 1}`}
        </span>
        {sessionId && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 rounded-none text-muted-foreground/50 hover:text-red-400 shrink-0"
            onClick={async (event) => {
              event.stopPropagation();
              await onDelete(index);
            }}
          >
            <Trash2 className={ICON_SM} />
          </Button>
        )}
      </div>
      {artifact.type === "note" && artifact.content && isMarkdownTable(artifact.content) ? (
        <ArtifactTable content={artifact.content} />
      ) : artifact.type === "map" &&
        artifact.content &&
        artifact.content.trimStart().startsWith("```mermaid") ? (
        <ArtifactStructuredMap content={artifact.content} title={artifact.title || ""} />
      ) : artifact.content ? (
        <div className={`${TEXT_MUTED} mt-1 line-clamp-2`}>{artifact.content.slice(0, 100)}</div>
      ) : null}
      {artifact.type === "map" && artifact.content && (
        <Button
          variant="outline"
          size="sm"
          className={`${BTN_OUTLINE} mt-1`}
          onClick={() => onSendToBrain(artifact.content)}
        >
          <Map className={ICON_SM} /> Send to Brain
        </Button>
      )}
    </div>
  );
}

function ArtifactsSection({
  artifacts,
  selectedArtifactIndices,
  deletingArtifacts,
  sessionId,
  onDeleteArtifacts,
  onToggleArtifact,
  onToggleAllArtifacts,
  onBulkDeleteArtifacts,
  onDeleteSingleArtifact,
  onSendToBrain,
}: {
  artifacts: TutorArtifact[];
  selectedArtifactIndices: Set<number>;
  deletingArtifacts: boolean;
  sessionId: string | null;
  onDeleteArtifacts?: (
    sessionId: string,
    indexes: number[],
  ) => Promise<ArtifactDeleteResult | void>;
  onToggleArtifact: (index: number) => void;
  onToggleAllArtifacts: () => void;
  onBulkDeleteArtifacts: () => void;
  onDeleteSingleArtifact: (index: number) => Promise<void>;
  onSendToBrain: (content: string) => void;
}) {
  if (artifacts.length === 0) {
    if (!sessionId) return null;
    return (
      <div className="text-center space-y-1 py-4">
        <BookOpen className={`${ICON_LG} text-muted-foreground/30 mx-auto`} />
        <div className={`${TEXT_MUTED} text-muted-foreground/50`}>No artifacts yet</div>
        <div className={`${TEXT_MUTED} text-muted-foreground/30`}>
          Use /note, /card, /map, /table, or /smap
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-muted-foreground/10 pb-1.5">
        <div className={TEXT_SECTION_LABEL}>Artifacts</div>
        <label
          className={`flex items-center gap-1.5 cursor-pointer ${TEXT_BODY} text-muted-foreground hover:text-foreground text-xs shrink-0`}
        >
          <Checkbox
            checked={artifacts.length > 0 && selectedArtifactIndices.size === artifacts.length}
            onCheckedChange={onToggleAllArtifacts}
            className="w-3 h-3 shrink-0"
          />
          <span>Select all</span>
          <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 shrink-0`}>
            {selectedArtifactIndices.size}/{artifacts.length}
          </Badge>
        </label>
        {selectedArtifactIndices.size > 0 && sessionId && onDeleteArtifacts && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 rounded-none font-terminal text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 shrink-0 ml-auto"
            disabled={deletingArtifacts}
            onClick={onBulkDeleteArtifacts}
          >
            {deletingArtifacts ? <Loader2 className={ICON_SM} /> : <Trash2 className={ICON_SM} />}
            {deletingArtifacts ? "..." : "Delete"}
          </Button>
        )}
      </div>
      {artifacts.map((artifact, index) => (
        <ArtifactCard
          key={`${artifact.createdAt}-${artifact.type}-${artifact.title}`}
          artifact={artifact}
          index={index}
          selected={selectedArtifactIndices.has(index)}
          sessionId={sessionId}
          onToggle={onToggleArtifact}
          onDelete={sessionId && onDeleteArtifacts ? onDeleteSingleArtifact : undefined}
          onSendToBrain={onSendToBrain}
        />
      ))}
    </div>
  );
}

function RecentSessionRow({
  session,
  deleteConfirm,
  endConfirm,
  deletingSessions,
  endingSessions,
  endingSession,
  savingSession,
  isSelected,
  onResumeSession,
  onToggleSession,
  onSaveToObsidian,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onAskEnd,
  onCancelEnd,
  onConfirmEnd,
}: {
  session: TutorSessionSummary;
  deleteConfirm: string | null;
  endConfirm: string | null;
  deletingSessions: boolean;
  endingSessions: boolean;
  endingSession: string | null;
  savingSession: string | null;
  isSelected: boolean;
  onResumeSession: (sessionId: string) => void;
  onToggleSession: (sessionId: string) => void;
  onSaveToObsidian: (session: TutorSessionSummary) => void;
  onAskDelete: (sessionId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (sessionId: string) => void;
  onAskEnd: (sessionId: string) => void;
  onCancelEnd: () => void;
  onConfirmEnd: (sessionId: string) => void;
}) {
  const { mode, topic } = getSessionDisplay(session);
  const isDeleteConfirming = deleteConfirm === session.session_id;
  const isEndConfirming = endConfirm === session.session_id;

  return (
    <div className="border-[3px] border-double border-muted-foreground/10 hover:border-muted-foreground/30 transition-colors">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onResumeSession(session.session_id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onResumeSession(session.session_id);
          }
        }}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSession(session.session_id)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.stopPropagation();
            }
          }}
          className="w-3 h-3 shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${TEXT_BADGE} h-5 px-1.5 shrink-0 ${
                session.status === "active"
                  ? "text-green-400 border-green-400/50"
                  : "text-muted-foreground"
              }`}
            >
              {session.status === "active" ? "LIVE" : "DONE"}
            </Badge>
            <span className="font-terminal text-sm truncate flex-1">{topic}</span>
          </div>
          <div className={`flex items-center gap-2 mt-1.5 ${TEXT_MUTED}`}>
            <span className="flex items-center gap-1">
              <MessageSquare className={ICON_SM} />
              {session.turn_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className={ICON_SM} />
              {new Date(session.started_at).toLocaleDateString()}
            </span>
            <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 ml-auto`}>
              {mode}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-primary/20 px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 rounded-none text-muted-foreground hover:text-primary font-terminal text-sm"
          disabled={savingSession === session.session_id}
          onClick={(event) => {
            event.stopPropagation();
            onSaveToObsidian(session);
          }}
        >
          <FolderOpen className={`${ICON_SM} mr-1`} />
          {savingSession === session.session_id ? "SAVING..." : "SAVE"}
        </Button>

        {session.status === "active" &&
          (isEndConfirming ? (
            <div className="flex items-center gap-0.5">
              <span className="font-terminal text-sm text-red-400 mr-1">End?</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
                disabled={endingSession === session.session_id}
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmEnd(session.session_id);
                }}
              >
                <Check className={ICON_SM} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancelEnd();
                }}
              >
                <X className={ICON_SM} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 rounded-none text-muted-foreground hover:text-red-400"
              disabled={endingSession === session.session_id || deletingSessions || endingSessions}
              onClick={(event) => {
                event.stopPropagation();
                onAskEnd(session.session_id);
              }}
            >
              END
            </Button>
          ))}

        <div className="ml-auto">
          {isDeleteConfirming ? (
            <div className="flex items-center gap-0.5">
              <span className="font-terminal text-sm text-red-400 mr-1">Delete?</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
                disabled={deletingSessions || endingSessions}
                onClick={(event) => {
                  event.stopPropagation();
                  onConfirmDelete(session.session_id);
                }}
              >
                <Check className={ICON_SM} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onCancelDelete();
                }}
              >
                <X className={ICON_SM} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-red-400"
              disabled={deletingSessions || endingSessions}
              onClick={(event) => {
                event.stopPropagation();
                onAskDelete(session.session_id);
              }}
            >
              <Trash2 className={ICON_SM} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentSessionsSection({
  visibleSessions,
  selectedSessionIds,
  selectedVisibleSessionsCount,
  selectedActiveVisibleSessionsCount,
  deleteConfirm,
  endConfirm,
  deletingSessions,
  endingSessions,
  endingSession,
  savingSession,
  onToggleAllSessions,
  onBulkDeleteSessions,
  onBulkEndSessions,
  onResumeSession,
  onToggleSession,
  onSaveToObsidian,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onAskEnd,
  onCancelEnd,
  onConfirmEnd,
}: {
  visibleSessions: TutorSessionSummary[];
  selectedSessionIds: Set<string>;
  selectedVisibleSessionsCount: number;
  selectedActiveVisibleSessionsCount: number;
  deleteConfirm: string | null;
  endConfirm: string | null;
  deletingSessions: boolean;
  endingSessions: boolean;
  endingSession: string | null;
  savingSession: string | null;
  onToggleAllSessions: () => void;
  onBulkDeleteSessions: () => void;
  onBulkEndSessions: () => void;
  onResumeSession: (sessionId: string) => void;
  onToggleSession: (sessionId: string) => void;
  onSaveToObsidian: (session: TutorSessionSummary) => void;
  onAskDelete: (sessionId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (sessionId: string) => void;
  onAskEnd: (sessionId: string) => void;
  onCancelEnd: () => void;
  onConfirmEnd: (sessionId: string) => void;
}) {
  if (visibleSessions.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-muted-foreground/20">
      <div className="flex items-center gap-1.5 flex-wrap border-b border-muted-foreground/10 pb-1.5">
        <div className={TEXT_SECTION_LABEL}>Recent Sessions</div>
        <label
          className={`flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer ${TEXT_BODY} text-muted-foreground hover:text-foreground text-xs`}
        >
          <Checkbox
            checked={visibleSessions.length > 0 && selectedVisibleSessionsCount === visibleSessions.length}
            onCheckedChange={onToggleAllSessions}
            className="w-3 h-3 shrink-0"
          />
          <span>Select all</span>
          <Badge variant="outline" className={`ml-auto ${TEXT_BADGE} h-4 px-1 shrink-0`}>
            {selectedVisibleSessionsCount}/{visibleSessions.length}
          </Badge>
        </label>
        {selectedVisibleSessionsCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 rounded-none font-terminal text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
            disabled={deletingSessions}
            onClick={onBulkDeleteSessions}
          >
            {deletingSessions ? <Loader2 className={ICON_SM} /> : <Trash2 className={ICON_SM} />}
            {deletingSessions ? "..." : "Delete"}
          </Button>
        )}
        {selectedActiveVisibleSessionsCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 rounded-none font-terminal text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
            disabled={endingSessions}
            onClick={onBulkEndSessions}
          >
            {endingSessions ? <Loader2 className={ICON_SM} /> : "END"}
          </Button>
        )}
      </div>
      {visibleSessions.map((session) => (
        <RecentSessionRow
          key={session.session_id}
          session={session}
          deleteConfirm={deleteConfirm}
          endConfirm={endConfirm}
          deletingSessions={deletingSessions}
          endingSessions={endingSessions}
          endingSession={endingSession}
          savingSession={savingSession}
          isSelected={selectedSessionIds.has(session.session_id)}
          onResumeSession={onResumeSession}
          onToggleSession={onToggleSession}
          onSaveToObsidian={onSaveToObsidian}
          onAskDelete={onAskDelete}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={onConfirmDelete}
          onAskEnd={onAskEnd}
          onCancelEnd={onCancelEnd}
          onConfirmEnd={onConfirmEnd}
        />
      ))}
    </div>
  );
}

function useTutorArtifactsModel({
  sessionId,
  artifacts,
  turnCount,
  topic,
  startedAt,
  recentSessions,
  onResumeSession,
  onDeleteArtifacts,
  onEndSession,
  onClearActiveSession,
  isSessionCompleted,
}: TutorArtifactsProps) {
  const queryClient = useQueryClient();
  const [uiState, dispatch] = useReducer(
    tutorArtifactsUiReducer,
    undefined,
    createTutorArtifactsUiState,
  );

  const visibleSessions = recentSessions.slice(0, VISIBLE_SESSIONS_LIMIT);
  const selectedVisibleSessionsCount = visibleSessions.reduce(
    (count, session) => (uiState.selectedSessionIds.has(session.session_id) ? count + 1 : count),
    0,
  );
  const selectedActiveSessionIds = useMemo(() => {
    return visibleSessions
      .filter(
        (session) =>
          uiState.selectedSessionIds.has(session.session_id) && session.status === "active",
      )
      .map((session) => session.session_id);
  }, [uiState.selectedSessionIds, visibleSessions]);
  const selectedActiveVisibleSessionsCount = selectedActiveSessionIds.length;

  useEffect(() => {
    dispatch({
      type: "pruneSelectedSessions",
      visibleIds: new Set(visibleSessions.map((session) => session.session_id)),
    });
  }, [visibleSessions]);

  useEffect(() => {
    dispatch({ type: "pruneSelectedArtifacts", artifactCount: artifacts.length });
  }, [artifacts.length]);

  useEffect(() => {
    // Session boundary: never carry artifact selection across sessions.
    dispatch({ type: "clearSelectedArtifacts" });
  }, [sessionId]);

  const toggleSession = useCallback((sid: string) => {
    dispatch({ type: "toggleSession", sessionId: sid });
  }, []);

  const toggleAllSessions = useCallback(() => {
    dispatch({
      type: "setSelectedSessions",
      sessionIds:
        selectedVisibleSessionsCount === visibleSessions.length
          ? []
          : visibleSessions.map((session) => session.session_id),
    });
  }, [selectedVisibleSessionsCount, visibleSessions]);

  const toggleArtifact = useCallback((index: number) => {
    dispatch({ type: "toggleArtifact", index });
  }, []);

  const toggleAllArtifacts = useCallback(() => {
    if (artifacts.length === 0) return;
    dispatch({
      type: "setSelectedArtifacts",
      indices:
        uiState.selectedArtifactIndices.size === artifacts.length
          ? []
          : artifacts.map((_, index) => index),
    });
  }, [artifacts, uiState.selectedArtifactIndices.size]);

  const handleBulkDeleteSessionsConfirm = useCallback(async () => {
    const ids = Array.from(uiState.selectedSessionIds);
    if (ids.length === 0) return;
    dispatch({
      type: "patch",
      patch: {
        bulkActionReport: null,
        deletingSessions: true,
      },
    });
    let deleted = 0;
    let skipped = 0;
    const failures: BulkDeleteFailureDetail[] = [];
    try {
      for (const sid of ids) {
        try {
          const result = await api.tutor.deleteSession(sid);
          if (result.deleted) {
            deleted++;
          } else {
            skipped++;
          }
          dispatch({ type: "removeSelectedSession", sessionId: sid });
        } catch (err) {
          failures.push({
            sessionId: sid,
            reason: err instanceof Error ? err.message : "Unknown",
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      const failed = failures.length;
      if (deleted > 0 && failed === 0 && skipped === 0) {
        toast.success(`${deleted} session${deleted > 1 ? "s" : ""} deleted`);
      } else {
        toast.error(`Delete finished: ${deleted} deleted, ${skipped} already gone, ${failed} failed`);
      }
      if (failed > 0 || skipped > 0) {
        dispatch({
          type: "patch",
          patch: {
            bulkActionReport: {
              title: "Bulk delete completed with issues",
              requested: ids.length,
              deleted,
              skipped,
              failures,
            },
          },
        });
      }
    } finally {
      dispatch({ type: "patch", patch: { deletingSessions: false } });
      if (deleted > 0 && sessionId && ids.includes(sessionId) && onClearActiveSession) {
        onClearActiveSession();
      }
    }
  }, [uiState.selectedSessionIds, sessionId, onClearActiveSession, queryClient]);

  const handleBulkEndSessionsConfirm = useCallback(async () => {
    if (selectedActiveSessionIds.length === 0) return;
    const ids = [...selectedActiveSessionIds];
    const hadActiveSession = sessionId && ids.includes(sessionId);
    dispatch({ type: "patch", patch: { endingSessions: true } });
    let ended = 0;
    let failed = 0;
    try {
      for (const sid of ids) {
        try {
          // Call API directly — onEndSession clears active state which
          // unmounts this component mid-loop, causing the black-screen bug.
          await api.tutor.endSession(sid);
          ended++;
          dispatch({ type: "removeSelectedSession", sessionId: sid });
        } catch (err) {
          failed++;
          toast.error(`End failed: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }
      if (ended > 0) {
        toast.success(`${ended} session${ended > 1 ? "s" : ""} ended${failed > 0 ? ` (${failed} failed)` : ""}`);
      }
    } finally {
      dispatch({ type: "patch", patch: { endingSessions: false } });
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      // Clear active session UI state ONCE after all API calls complete,
      // so the component stays mounted throughout the loop.
      if (hadActiveSession && onClearActiveSession) {
        onClearActiveSession();
      }
    }
  }, [selectedActiveSessionIds, sessionId, onClearActiveSession, queryClient]);

  const handleBulkDeleteArtifactsConfirm = useCallback(async () => {
    if (!sessionId || uiState.selectedArtifactIndices.size === 0 || !onDeleteArtifacts) return;
    const indexes = Array.from(uiState.selectedArtifactIndices).sort((a, b) => a - b);
    dispatch({ type: "patch", patch: { deletingArtifacts: true } });
    try {
      const result = await onDeleteArtifacts(sessionId, indexes);
      if (result) {
        const requested = result.requested_count ?? indexes.length;
        const deleted = result.applied_count ?? indexes.length;
        const skipped = Math.max(requested - deleted, 0);
        if (result.request_id || skipped > 0) {
          dispatch({
            type: "patch",
            patch: {
              bulkActionReport: {
                title: "Artifact delete completed",
                requested,
                deleted,
                skipped,
                requestId: result.request_id,
                skippedIndexes: result.skipped_indexes,
                failures: [],
              },
            },
          });
        }
      }
      dispatch({ type: "clearSelectedArtifacts" });
      toast.success(`${indexes.length} artifact${indexes.length > 1 ? "s" : ""} deleted`);
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      dispatch({ type: "patch", patch: { deletingArtifacts: false } });
    }
  }, [sessionId, uiState.selectedArtifactIndices, onDeleteArtifacts]);

  const handleBulkDeleteSessionsClick = useCallback(() => {
    const count = uiState.selectedSessionIds.size;
    if (count === 0 || uiState.deletingSessions) return;
    dispatch({
      type: "patch",
      patch: {
        bulkActionReport: null,
        endConfirm: null,
        bulkPrompt: { type: "sessions", action: "delete", count },
      },
    });
  }, [uiState.selectedSessionIds.size, uiState.deletingSessions]);

  const handleBulkEndSessionsClick = useCallback(() => {
    const count = selectedActiveVisibleSessionsCount;
    if (count === 0 || uiState.endingSessions) return;
    dispatch({
      type: "patch",
      patch: {
        deleteConfirm: null,
        endConfirm: null,
        bulkPrompt: { type: "sessions", action: "end", count },
      },
    });
  }, [selectedActiveVisibleSessionsCount, uiState.endingSessions]);

  const handleBulkDeleteArtifactsClick = useCallback(() => {
    const count = uiState.selectedArtifactIndices.size;
    if (!sessionId || count === 0 || !onDeleteArtifacts || uiState.deletingArtifacts) return;
    dispatch({
      type: "patch",
      patch: {
        bulkPrompt: { type: "artifacts", count },
      },
    });
  }, [sessionId, uiState.selectedArtifactIndices.size, onDeleteArtifacts, uiState.deletingArtifacts]);

  const handleBulkPromptConfirm = useCallback(() => {
    if (!uiState.bulkPrompt) return;
    const prompt = uiState.bulkPrompt;
    dispatch({ type: "patch", patch: { bulkPrompt: null } });
    if (prompt.type === "sessions" && prompt.action === "delete") {
      void handleBulkDeleteSessionsConfirm();
      return;
    }
    if (prompt.type === "sessions" && prompt.action === "end") {
      void handleBulkEndSessionsConfirm();
      return;
    }
    if (prompt.type === "artifacts") {
      void handleBulkDeleteArtifactsConfirm();
    }
  }, [uiState.bulkPrompt, handleBulkDeleteSessionsConfirm, handleBulkEndSessionsConfirm, handleBulkDeleteArtifactsConfirm]);

  const bulkPromptBusy =
    uiState.deletingSessions || uiState.deletingArtifacts || uiState.endingSessions;
  const bulkDeleteIncludesActive = Boolean(
    uiState.bulkPrompt &&
      uiState.bulkPrompt.type === "sessions" &&
      uiState.bulkPrompt.action === "delete" &&
      sessionId &&
      uiState.selectedSessionIds.has(sessionId)
  );

  const handleDelete = async (sid: string) => {
    if (uiState.deletingSessions || uiState.endingSessions) return;
    await deleteTutorSession({
      targetSessionId: sid,
      activeSessionId: sessionId,
      queryClient,
      onClearActiveSession,
      onBeforeDelete: () =>
        dispatch({
          type: "patch",
          patch: {
            bulkActionReport: null,
            deletingSessions: true,
          },
        }),
      onAfterDelete: (deleted) => {
        dispatch({
          type: "patch",
          patch: {
            deleteConfirm: null,
            deletingSessions: false,
          },
        });
        if (deleted) {
          dispatch({ type: "removeSelectedSession", sessionId: sid });
        }
      },
    });
  };

  const handleEnd = async (sid: string) => {
    if (uiState.endingSession) return;
    await endTutorSession({
      targetSessionId: sid,
      onEndSession,
      queryClient,
      onBeforeEnd: () =>
        dispatch({
          type: "patch",
          patch: {
            endConfirm: null,
            endingSession: sid,
          },
        }),
      onAfterEnd: (ended) => {
        if (ended) {
          dispatch({ type: "removeSelectedSession", sessionId: sid });
        }
        dispatch({ type: "patch", patch: { endingSession: null } });
      },
    });
  };

  const handleSaveToObsidian = useCallback((session: TutorSessionSummary) => {
    void saveTutorSessionToObsidian(session, (value) => {
      dispatch({ type: "patch", patch: { savingSession: value } });
    });
  }, []);

  const handleDeleteSingleArtifact = useCallback(
    async (index: number) => {
      if (!sessionId || !onDeleteArtifacts) return;
      await deleteSingleTutorArtifact({
        index,
        sessionId,
        onDeleteArtifacts,
        selectedArtifactIndices: uiState.selectedArtifactIndices,
        onReport: (report) =>
          dispatch({
            type: "patch",
            patch: {
              bulkActionReport: report,
            },
          }),
        onSelectedArtifactIndicesChange: (indices) =>
          dispatch({ type: "setSelectedArtifacts", indices }),
      });
    },
    [sessionId, onDeleteArtifacts, uiState.selectedArtifactIndices],
  );

  const sendArtifactToBrain = useCallback((content: string) => {
    localStorage.setItem("tutor-mermaid-import", content);
    window.location.href = "/brain";
  }, []);

  const dismissBulkPrompt = useCallback(() => {
    dispatch({ type: "patch", patch: { bulkPrompt: null } });
  }, []);

  const dismissBulkActionReport = useCallback(() => {
    dispatch({ type: "patch", patch: { bulkActionReport: null } });
  }, []);

  const askDelete = useCallback((sessionIdToDelete: string) => {
    dispatch({ type: "patch", patch: { deleteConfirm: sessionIdToDelete } });
  }, []);

  const cancelDelete = useCallback(() => {
    dispatch({ type: "patch", patch: { deleteConfirm: null } });
  }, []);

  const confirmDelete = useCallback((sessionIdToDelete: string) => {
    void handleDelete(sessionIdToDelete);
  }, [handleDelete]);

  const askEnd = useCallback((sessionIdToEnd: string) => {
    dispatch({
      type: "patch",
      patch: {
        deleteConfirm: null,
        endConfirm: sessionIdToEnd,
      },
    });
  }, []);

  const cancelEnd = useCallback(() => {
    dispatch({ type: "patch", patch: { endConfirm: null } });
  }, []);

  const confirmEnd = useCallback((sessionIdToEnd: string) => {
    void handleEnd(sessionIdToEnd);
  }, [handleEnd]);

  return {
    sessionId,
    artifacts,
    turnCount,
    topic,
    startedAt,
    isSessionCompleted,
    onDeleteArtifacts,
    onResumeSession,
    uiState,
    visibleSessions,
    selectedVisibleSessionsCount,
    selectedActiveVisibleSessionsCount,
    bulkDeleteIncludesActive,
    bulkPromptBusy,
    dismissBulkPrompt,
    handleBulkPromptConfirm,
    dismissBulkActionReport,
    toggleArtifact,
    toggleAllArtifacts,
    handleBulkDeleteArtifactsClick,
    handleDeleteSingleArtifact,
    sendArtifactToBrain,
    toggleAllSessions,
    handleBulkDeleteSessionsClick,
    handleBulkEndSessionsClick,
    toggleSession,
    handleSaveToObsidian,
    askDelete,
    cancelDelete,
    confirmDelete,
    askEnd,
    cancelEnd,
    confirmEnd,
  };
}

type TutorArtifactsModel = ReturnType<typeof useTutorArtifactsModel>;

function renderTutorArtifacts(model: TutorArtifactsModel) {
  const {
    sessionId,
    artifacts,
    turnCount,
    topic,
    startedAt,
    isSessionCompleted,
    onDeleteArtifacts,
    onResumeSession,
    uiState,
    visibleSessions,
    selectedVisibleSessionsCount,
    selectedActiveVisibleSessionsCount,
    bulkDeleteIncludesActive,
    bulkPromptBusy,
    dismissBulkPrompt,
    handleBulkPromptConfirm,
    dismissBulkActionReport,
    toggleArtifact,
    toggleAllArtifacts,
    handleBulkDeleteArtifactsClick,
    handleDeleteSingleArtifact,
    sendArtifactToBrain,
    toggleAllSessions,
    handleBulkDeleteSessionsClick,
    handleBulkEndSessionsClick,
    toggleSession,
    handleSaveToObsidian,
    askDelete,
    cancelDelete,
    confirmDelete,
    askEnd,
    cancelEnd,
    confirmEnd,
  } = model;

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {uiState.bulkPrompt && (
        <BulkPromptOverlay
          bulkPrompt={uiState.bulkPrompt}
          bulkDeleteIncludesActive={bulkDeleteIncludesActive}
          bulkPromptBusy={bulkPromptBusy}
          onCancel={dismissBulkPrompt}
          onConfirm={handleBulkPromptConfirm}
        />
      )}

      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-[3px] border-double border-primary/30`}>
        <div className={TEXT_PANEL_TITLE}>ARTIFACTS</div>
      </div>

      {uiState.bulkActionReport && (
        <BulkActionReportBanner
          bulkActionReport={uiState.bulkActionReport}
          onDismiss={dismissBulkActionReport}
        />
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className={`${PANEL_PADDING} space-y-3`}>
          <ActiveSessionSummary
            sessionId={sessionId}
            topic={topic}
            turnCount={turnCount}
            startedAt={startedAt}
          />

          <ArtifactsSection
            artifacts={artifacts}
            selectedArtifactIndices={uiState.selectedArtifactIndices}
            deletingArtifacts={uiState.deletingArtifacts}
            sessionId={sessionId}
            onDeleteArtifacts={onDeleteArtifacts}
            onToggleArtifact={toggleArtifact}
            onToggleAllArtifacts={toggleAllArtifacts}
            onBulkDeleteArtifacts={handleBulkDeleteArtifactsClick}
            onDeleteSingleArtifact={handleDeleteSingleArtifact}
            onSendToBrain={sendArtifactToBrain}
          />

          {sessionId && isSessionCompleted && (
            <SessionWrapPanel sessionId={sessionId} isCompleted={true} />
          )}

          <RecentSessionsSection
            visibleSessions={visibleSessions}
            selectedSessionIds={uiState.selectedSessionIds}
            selectedVisibleSessionsCount={selectedVisibleSessionsCount}
            selectedActiveVisibleSessionsCount={selectedActiveVisibleSessionsCount}
            deleteConfirm={uiState.deleteConfirm}
            endConfirm={uiState.endConfirm}
            deletingSessions={uiState.deletingSessions}
            endingSessions={uiState.endingSessions}
            endingSession={uiState.endingSession}
            savingSession={uiState.savingSession}
            onToggleAllSessions={toggleAllSessions}
            onBulkDeleteSessions={handleBulkDeleteSessionsClick}
            onBulkEndSessions={handleBulkEndSessionsClick}
            onResumeSession={onResumeSession}
            onToggleSession={toggleSession}
            onSaveToObsidian={handleSaveToObsidian}
            onAskDelete={askDelete}
            onCancelDelete={cancelDelete}
            onConfirmDelete={confirmDelete}
            onAskEnd={askEnd}
            onCancelEnd={cancelEnd}
            onConfirmEnd={confirmEnd}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

export function TutorArtifacts(props: TutorArtifactsProps) {
  const model = useTutorArtifactsModel(props);
  return renderTutorArtifacts(model);
}
