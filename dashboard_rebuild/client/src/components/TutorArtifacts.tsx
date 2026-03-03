import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Table2,
  Network,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import type { TutorSessionSummary, TutorSessionWrapSummary } from "@/lib/api";

export interface TutorArtifact {
  type: "note" | "card" | "map" | "table" | "structured_map";
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
  onCreateArtifact: (artifact: { type: "note" | "card" | "map" | "table" | "structured_map"; content: string; title: string }) => void;
  isSessionCompleted?: boolean;
  recentSessions: TutorSessionSummary[];
  onResumeSession: (sessionId: string) => void;
  /** Delete selected artifact entries by index (persists to session). Called after API success. */
  onDeleteArtifacts?: (sessionId: string, indexes: number[]) => Promise<void>;
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
  failures: BulkDeleteFailureDetail[];
}

const ARTIFACT_ICONS: Record<string, typeof FileText> = {
  note: FileText,
  card: CreditCard,
  map: Map,
  table: Table2,
  structured_map: Network,
};

const ARTIFACT_COLORS: Record<string, string> = {
  note: "text-blue-400",
  card: "text-yellow-400",
  map: "text-green-400",
  table: "text-cyan-400",
  structured_map: "text-purple-400",
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
            {table.headers.map((h, i) => (
              <th
                key={i}
                className="font-arcade text-xs uppercase text-primary/80 px-2 py-1.5 text-left border border-primary/30"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-card/50" : ""}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
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
        className="absolute top-1 right-1 z-10 text-purple-400 border-purple-400/50 font-arcade text-[8px] px-1 h-4"
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
            className="inline-flex items-center gap-1 font-terminal text-sm text-purple-400 hover:text-purple-300 border border-purple-400/40 px-2 py-0.5"
          >
            <ExternalLink className="w-3 h-3" />
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
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
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
  const [summary, setSummary] = useState<TutorSessionWrapSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isCompleted || !sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.tutor
      .getSessionSummary(sessionId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load summary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [sessionId, isCompleted]);

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
        <div className="font-terminal text-sm text-red-400">{error}</div>
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
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
            {saving ? "Saving..." : "Save to Obsidian"}
          </Button>
        </>
      )}
    </div>
  );
}

export function TutorArtifacts({
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [endConfirm, setEndConfirm] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState<string | null>(null);
  const [endingSession, setEndingSession] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set());
  const [selectedArtifactIndices, setSelectedArtifactIndices] = useState<Set<number>>(() => new Set());
  const [deletingSessions, setDeletingSessions] = useState(false);
  const [deletingArtifacts, setDeletingArtifacts] = useState(false);
  const [endingSessions, setEndingSessions] = useState(false);
  const [bulkActionReport, setBulkActionReport] = useState<BulkActionReport | null>(null);
  const [bulkPrompt, setBulkPrompt] = useState<
    null | { type: "sessions"; action: "delete" | "end"; count: number } | { type: "artifacts"; count: number }
  >(null);

  const visibleSessions = recentSessions.slice(0, VISIBLE_SESSIONS_LIMIT);
  const selectedVisibleSessionsCount = visibleSessions.reduce(
    (count, session) => (selectedSessionIds.has(session.session_id) ? count + 1 : count),
    0
  );
  const selectedActiveSessionIds = useMemo(() => {
    return visibleSessions
      .filter((session) => selectedSessionIds.has(session.session_id) && session.status === "active")
      .map((session) => session.session_id);
  }, [selectedSessionIds, visibleSessions]);
  const selectedActiveVisibleSessionsCount = selectedActiveSessionIds.length;

  useEffect(() => {
    const visibleIds = new Set(visibleSessions.map((s) => s.session_id));
    setSelectedSessionIds((prev) => {
      const next = new Set<string>();
      let changed = false;
      prev.forEach((sid) => {
        if (visibleIds.has(sid)) {
          next.add(sid);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [visibleSessions]);

  useEffect(() => {
    setSelectedArtifactIndices((prev) => {
      const next = new Set<number>();
      let changed = false;
      prev.forEach((index) => {
        if (index >= 0 && index < artifacts.length) {
          next.add(index);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [artifacts.length]);

  useEffect(() => {
    // Session boundary: never carry artifact selection across sessions.
    setSelectedArtifactIndices(new Set());
  }, [sessionId]);

  const toggleSession = useCallback((sid: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }, []);

  const toggleAllSessions = useCallback(() => {
    if (selectedVisibleSessionsCount === visibleSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(visibleSessions.map((s) => s.session_id)));
    }
  }, [selectedVisibleSessionsCount, visibleSessions]);

  const toggleArtifact = useCallback((index: number) => {
    setSelectedArtifactIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleAllArtifacts = useCallback(() => {
    if (artifacts.length === 0) return;
    if (selectedArtifactIndices.size === artifacts.length) {
      setSelectedArtifactIndices(new Set());
    } else {
      setSelectedArtifactIndices(new Set(artifacts.map((_, i) => i)));
    }
  }, [artifacts.length, selectedArtifactIndices.size]);

  const handleBulkDeleteSessionsConfirm = useCallback(async () => {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;
    setBulkActionReport(null);
    setDeletingSessions(true);
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
          setSelectedSessionIds((prev) => {
            const next = new Set(prev);
            next.delete(sid);
            return next;
          });
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
        setBulkActionReport({
          title: "Bulk delete completed with issues",
          requested: ids.length,
          deleted,
          skipped,
          failures,
        });
      }
    } finally {
      setDeletingSessions(false);
      if (deleted > 0 && sessionId && ids.includes(sessionId) && onClearActiveSession) {
        onClearActiveSession();
      }
    }
  }, [selectedSessionIds, sessionId, onClearActiveSession, queryClient]);

  const handleBulkEndSessionsConfirm = useCallback(async () => {
    if (selectedActiveSessionIds.length === 0) return;
    const ids = [...selectedActiveSessionIds];
    const hadActiveSession = sessionId && ids.includes(sessionId);
    setEndingSessions(true);
    let ended = 0;
    let failed = 0;
    try {
      for (const sid of ids) {
        try {
          // Call API directly — onEndSession clears active state which
          // unmounts this component mid-loop, causing the black-screen bug.
          await api.tutor.endSession(sid);
          ended++;
          setSelectedSessionIds((prev) => {
            const next = new Set(prev);
            next.delete(sid);
            return next;
          });
        } catch (err) {
          failed++;
          toast.error(`End failed: ${err instanceof Error ? err.message : "Unknown"}`);
        }
      }
      if (ended > 0) {
        toast.success(`${ended} session${ended > 1 ? "s" : ""} ended${failed > 0 ? ` (${failed} failed)` : ""}`);
      }
    } finally {
      setEndingSessions(false);
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      // Clear active session UI state ONCE after all API calls complete,
      // so the component stays mounted throughout the loop.
      if (hadActiveSession && onClearActiveSession) {
        onClearActiveSession();
      }
    }
  }, [selectedActiveSessionIds, sessionId, onClearActiveSession, queryClient]);

  const handleBulkDeleteArtifactsConfirm = useCallback(async () => {
    if (!sessionId || selectedArtifactIndices.size === 0 || !onDeleteArtifacts) return;
    const indexes = Array.from(selectedArtifactIndices).sort((a, b) => a - b);
    setDeletingArtifacts(true);
    try {
      await onDeleteArtifacts(sessionId, indexes);
      setSelectedArtifactIndices(new Set());
      toast.success(`${indexes.length} artifact${indexes.length > 1 ? "s" : ""} deleted`);
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setDeletingArtifacts(false);
    }
  }, [sessionId, selectedArtifactIndices, onDeleteArtifacts]);

  const handleBulkDeleteSessionsClick = useCallback(() => {
    const count = selectedSessionIds.size;
    if (count === 0 || deletingSessions) return;
    setBulkActionReport(null);
    setEndConfirm(null);
    setBulkPrompt({ type: "sessions", action: "delete", count });
  }, [selectedSessionIds.size, deletingSessions]);

  const handleBulkEndSessionsClick = useCallback(() => {
    const count = selectedActiveVisibleSessionsCount;
    if (count === 0 || endingSessions) return;
    setDeleteConfirm(null);
    setEndConfirm(null);
    setBulkPrompt({ type: "sessions", action: "end", count });
  }, [selectedActiveVisibleSessionsCount, endingSessions]);

  const handleBulkDeleteArtifactsClick = useCallback(() => {
    const count = selectedArtifactIndices.size;
    if (!sessionId || count === 0 || !onDeleteArtifacts || deletingArtifacts) return;
    setBulkPrompt({ type: "artifacts", count });
  }, [sessionId, selectedArtifactIndices.size, onDeleteArtifacts, deletingArtifacts]);

  const handleBulkPromptConfirm = useCallback(() => {
    if (!bulkPrompt) return;
    const prompt = bulkPrompt;
    setBulkPrompt(null);
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
  }, [bulkPrompt, handleBulkDeleteSessionsConfirm, handleBulkEndSessionsConfirm, handleBulkDeleteArtifactsConfirm]);

  const bulkPromptBusy = deletingSessions || deletingArtifacts || endingSessions;
  const bulkDeleteIncludesActive = Boolean(
    bulkPrompt &&
      bulkPrompt.type === "sessions" &&
      bulkPrompt.action === "delete" &&
      sessionId &&
      selectedSessionIds.has(sessionId)
  );

  const handleDelete = async (sid: string) => {
    if (deletingSessions || endingSessions) return;
    setBulkActionReport(null);
    setDeletingSessions(true);
    try {
      const result = await api.tutor.deleteSession(sid);
      await queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      if (result.deleted) {
        toast.success("Session deleted");
      } else {
        toast.success("Session already deleted");
      }
      if (sid === sessionId && onClearActiveSession) {
        onClearActiveSession();
      }
      setDeleteConfirm(null);
      setSelectedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setDeletingSessions(false);
    }
  };

  const handleEnd = async (sid: string) => {
    setEndConfirm(null);
    if (endingSession) return;
    setEndingSession(sid);
    try {
      if (onEndSession) {
        await onEndSession(sid);
      } else {
        await api.tutor.endSession(sid);
      }
      toast.success("Session ended");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      setSelectedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    } catch (err) {
      toast.error(`End failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setEndingSession(null);
    }
  };

  const handleSaveToObsidian = async (session: TutorSessionSummary) => {
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
            for (const a of artifacts) {
              if (a.type === "note" && a.content) {
                lines.push(`### Note: ${a.title}`, a.content, "");
              } else if (a.type === "map" && a.content) {
                lines.push(`### Mind Map: ${a.title}`, "```mermaid", a.content, "```", "");
              } else if (a.type === "card") {
                lines.push(`### Card: ${a.title}`, `**Front:** ${a.title}`, `**Back:** ${a.content || ""}`, "");
              }
            }
          }
        } catch { /* ignore parse errors */ }
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
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {bulkPrompt && (
        <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-3">
          <div className="w-full max-w-sm border-[3px] border-double border-primary bg-black p-3 space-y-3 shadow-[0_0_0_1px_rgba(255,0,0,0.25)]">
            <div className="font-arcade text-xs tracking-wider text-primary">
              {bulkPrompt.type === "sessions" && bulkPrompt.action === "end" ? "END SESSIONS?" : "CONFIRM DELETE"}
            </div>
            <div className="font-terminal text-sm text-muted-foreground">
              {bulkPrompt.type === "sessions" && (
                <>
                  {`${bulkPrompt.action === "end" ? "End" : "Delete"} ${bulkPrompt.count} selected session${bulkPrompt.count > 1 ? "s" : ""}? ${bulkPrompt.action === "end" ? "This will complete them." : "This cannot be undone."}`}
                  {bulkDeleteIncludesActive && (
                    <span className="block mt-2 text-yellow-300">
                      Warning: your active session is selected. You will be returned to WIZARD after delete.
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
                onClick={() => setBulkPrompt(null)}
              >
                CANCEL
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-none font-arcade text-xs bg-primary/20 text-primary border-2 border-primary hover:bg-primary/30"
                disabled={bulkPromptBusy}
                onClick={handleBulkPromptConfirm}
              >
                {bulkPromptBusy ? <Loader2 className={`${ICON_SM} animate-spin`} /> : (bulkPrompt.type === "sessions" && bulkPrompt.action === "end" ? "END" : "DELETE")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-[3px] border-double border-primary/30`}>
        <div className={TEXT_PANEL_TITLE}>ARTIFACTS</div>
      </div>

      {bulkActionReport && (
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
                onClick={() => setBulkActionReport(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="font-terminal text-xs text-muted-foreground">
              Requested {bulkActionReport.requested} · Deleted {bulkActionReport.deleted} · Already gone {bulkActionReport.skipped} · Failed {bulkActionReport.failures.length}
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
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className={`${PANEL_PADDING} space-y-3`}>
          {/* Session info */}
          {sessionId ? (
            <div className="space-y-2 pb-3 border-b border-muted-foreground/20">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-1.5 text-primary`}>
                  FIRST PASS
                </Badge>
              </div>
              {topic && (
                <div className={`${TEXT_BODY} text-sm`}>{topic}</div>
              )}
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
          ) : (
            <div className={`${TEXT_BODY} text-muted-foreground/50 py-3 text-center`}>
              No active session
            </div>
          )}

          {/* Artifacts list */}
          {artifacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-muted-foreground/10 pb-1.5">
                <div className={TEXT_SECTION_LABEL}>Artifacts</div>
                <label className={`flex items-center gap-1.5 cursor-pointer ${TEXT_BODY} text-muted-foreground hover:text-foreground text-xs shrink-0`}>
                  <Checkbox
                    checked={artifacts.length > 0 && selectedArtifactIndices.size === artifacts.length}
                    onCheckedChange={toggleAllArtifacts}
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
                    onClick={handleBulkDeleteArtifactsClick}
                  >
                    {deletingArtifacts ? <Loader2 className={ICON_SM} /> : <Trash2 className={ICON_SM} />}
                    {deletingArtifacts ? "..." : "Delete"}
                  </Button>
                )}
              </div>
              {artifacts.map((a, i) => {
                const Icon = ARTIFACT_ICONS[a.type] || FileText;
                const color = ARTIFACT_COLORS[a.type] || "text-muted-foreground";
                return (
                  <div
                    key={i}
                    className="border-[3px] border-double border-muted-foreground/20 p-2.5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        checked={selectedArtifactIndices.has(i)}
                        onCheckedChange={() => toggleArtifact(i)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3 h-3 shrink-0"
                      />
                      <Icon className={`${ICON_MD} ${color}`} />
                      <span className={`${TEXT_BODY} text-sm truncate flex-1`}>
                        {a.title || `${a.type} #${i + 1}`}
                      </span>
                      {sessionId && onDeleteArtifacts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 rounded-none text-muted-foreground/50 hover:text-red-400 shrink-0"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await onDeleteArtifacts(sessionId, [i]);
                              toast.success("Artifact deleted");
                            } catch {
                              toast.error("Delete failed");
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {a.type === "table" && a.content ? (
                      <ArtifactTable content={a.content} />
                    ) : a.type === "structured_map" && a.content ? (
                      <ArtifactStructuredMap content={a.content} title={a.title || ""} />
                    ) : a.content ? (
                      <div className={`${TEXT_MUTED} mt-1 line-clamp-2`}>
                        {a.content.slice(0, 100)}
                      </div>
                    ) : null}
                    {a.type === "map" && a.content && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`${BTN_OUTLINE} mt-1`}
                        onClick={() => {
                          localStorage.setItem("tutor-mermaid-import", a.content);
                          window.location.href = "/brain";
                        }}
                      >
                        <Map className={ICON_SM} /> Send to Brain
                      </Button>
                    )}
                    {a.type === "structured_map" && a.content && a.content.trimStart().startsWith("```mermaid") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={`${BTN_OUTLINE} mt-1`}
                        onClick={() => {
                          localStorage.setItem("tutor-mermaid-import", a.content);
                          window.location.href = "/brain";
                        }}
                      >
                        <Map className={ICON_SM} /> Send to Brain
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {sessionId && artifacts.length === 0 && (
            <div className="text-center space-y-1 py-4">
              <BookOpen className={`${ICON_LG} text-muted-foreground/30 mx-auto`} />
              <div className={`${TEXT_MUTED} text-muted-foreground/50`}>
                No artifacts yet
              </div>
              <div className={`${TEXT_MUTED} text-muted-foreground/30`}>
                Use /note, /card, /map, /table, or /smap
              </div>
            </div>
          )}

          {/* Session wrap summary (only when completed) */}
          {sessionId && isSessionCompleted && (
            <SessionWrapPanel sessionId={sessionId} isCompleted={true} />
          )}

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-muted-foreground/20">
              <div className="flex items-center gap-1.5 flex-wrap border-b border-muted-foreground/10 pb-1.5">
                <div className={TEXT_SECTION_LABEL}>Recent Sessions</div>
                <label className={`flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer ${TEXT_BODY} text-muted-foreground hover:text-foreground text-xs`}>
                  <Checkbox
                    checked={visibleSessions.length > 0 && selectedVisibleSessionsCount === visibleSessions.length}
                    onCheckedChange={toggleAllSessions}
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
                    onClick={handleBulkDeleteSessionsClick}
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
                    onClick={handleBulkEndSessionsClick}
                  >
                    {endingSessions ? <Loader2 className={ICON_SM} /> : "END"}
                  </Button>
                )}
              </div>
              {visibleSessions.map((s) => (
                <div
                  key={s.session_id}
                  className="border-[3px] border-double border-muted-foreground/10 hover:border-muted-foreground/30 transition-colors"
                >
                  {/* Clickable session info (div role avoids nested interactive controls) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onResumeSession(s.session_id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onResumeSession(s.session_id);
                      }
                    }}
                    className="w-full text-left px-3 py-2.5 flex items-start gap-2"
                  >
                    <Checkbox
                      checked={selectedSessionIds.has(s.session_id)}
                      onCheckedChange={() => toggleSession(s.session_id)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.stopPropagation();
                        }
                      }}
                      className="w-3 h-3 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const mode = s.mode || "Core";
                        const topic = s.topic || mode || "Tutor Session";
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${TEXT_BADGE} h-5 px-1.5 shrink-0 ${s.status === "active"
                                    ? "text-green-400 border-green-400/50"
                                    : "text-muted-foreground"
                                  }`}
                              >
                                {s.status === "active" ? "LIVE" : "DONE"}
                              </Badge>
                              <span className={`font-terminal text-sm truncate flex-1`}>
                                {topic}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 mt-1.5 ${TEXT_MUTED}`}>
                              <span className="flex items-center gap-1">
                                <MessageSquare className={ICON_SM} />
                                {s.turn_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className={ICON_SM} />
                                {new Date(s.started_at).toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className={`${TEXT_BADGE} h-4 px-1 ml-auto`}>
                                {mode}
                              </Badge>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center border-t border-primary/20 px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-none text-muted-foreground hover:text-primary font-terminal text-sm"
                      disabled={savingSession === s.session_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveToObsidian(s);
                      }}
                    >
                      <FolderOpen className={`${ICON_SM} mr-1`} />
                      {savingSession === s.session_id ? "SAVING..." : "SAVE"}
                    </Button>

                    {s.status === "active" && (
                      endConfirm === s.session_id ? (
                        <div className="flex items-center gap-0.5">
                          <span className="font-terminal text-sm text-red-400 mr-1">End?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            disabled={endingSession === s.session_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnd(s.session_id);
                              setDeleteConfirm(null);
                              setEndConfirm(null);
                            }}
                          >
                            <Check className={ICON_SM} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEndConfirm(null);
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
                          disabled={endingSession === s.session_id || deletingSessions || endingSessions}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                            setEndConfirm(s.session_id);
                          }}
                        >
                          END
                        </Button>
                      )
                    )}

                    <div className="ml-auto">
                      {deleteConfirm === s.session_id ? (
                        <div className="flex items-center gap-0.5">
                          <span className="font-terminal text-sm text-red-400 mr-1">Delete?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            disabled={deletingSessions || endingSessions}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(s.session_id);
                            }}
                          >
                            <Check className={ICON_SM} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-none text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(null);
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deletingSessions || endingSessions) return;
                            setDeleteConfirm(s.session_id);
                          }}
                        >
                          <Trash2 className={ICON_SM} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
