import { useState, useCallback, useEffect } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
} from "lucide-react";
import { toast } from "sonner";
import type { TutorSessionSummary } from "@/lib/api";

export interface TutorArtifact {
  type: "note" | "card" | "map";
  title: string;
  content: string;
  createdAt: string;
  cardId?: number;
}

interface TutorArtifactsProps {
  sessionId: string | null;
  artifacts: TutorArtifact[];
  turnCount: number;
  mode: string;
  topic: string;
  startedAt: string | null;
  onCreateArtifact: (artifact: { type: "note" | "card" | "map"; content: string; title: string }) => void;
  recentSessions: TutorSessionSummary[];
  onResumeSession: (sessionId: string) => void;
  /** Delete selected artifact entries by index (persists to session). Called after API success. */
  onDeleteArtifacts?: (sessionId: string, indexes: number[]) => Promise<void>;
}

const ARTIFACT_ICONS = {
  note: FileText,
  card: CreditCard,
  map: Map,
} as const;

const ARTIFACT_COLORS = {
  note: "text-blue-400",
  card: "text-yellow-400",
  map: "text-green-400",
} as const;

const VISIBLE_SESSIONS_LIMIT = 8;

export function TutorArtifacts({
  sessionId,
  artifacts,
  turnCount,
  mode,
  topic,
  startedAt,
  recentSessions,
  onResumeSession,
  onDeleteArtifacts,
}: TutorArtifactsProps) {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(() => new Set());
  const [selectedArtifactIndices, setSelectedArtifactIndices] = useState<Set<number>>(() => new Set());
  const [deletingSessions, setDeletingSessions] = useState(false);
  const [deletingArtifacts, setDeletingArtifacts] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<
    null | { type: "sessions"; count: number } | { type: "artifacts"; count: number }
  >(null);

  const visibleSessions = recentSessions.slice(0, VISIBLE_SESSIONS_LIMIT);
  const selectedVisibleSessionsCount = visibleSessions.reduce(
    (count, session) => (selectedSessionIds.has(session.session_id) ? count + 1 : count),
    0
  );

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

  const handleBulkDeleteSessionsClick = useCallback(() => {
    const count = selectedSessionIds.size;
    if (count === 0) return;
    setBulkConfirm({ type: "sessions", count });
  }, [selectedSessionIds.size]);

  const handleBulkDeleteSessionsConfirm = useCallback(async () => {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;
    setBulkConfirm(null);
    setDeletingSessions(true);
    let deleted = 0;
    for (const sid of ids) {
      try {
        await api.tutor.deleteSession(sid);
        deleted++;
        setSelectedSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sid);
          return next;
        });
      } catch (err) {
        toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
    setDeletingSessions(false);
    if (deleted > 0) {
      toast.success(`${deleted} session${deleted > 1 ? "s" : ""} deleted`);
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
    }
  }, [selectedSessionIds, queryClient]);

  const handleBulkDeleteArtifactsClick = useCallback(() => {
    if (!sessionId || selectedArtifactIndices.size === 0 || !onDeleteArtifacts) return;
    setBulkConfirm({ type: "artifacts", count: selectedArtifactIndices.size });
  }, [sessionId, selectedArtifactIndices.size, onDeleteArtifacts]);

  const handleBulkDeleteArtifactsConfirm = useCallback(async () => {
    if (!sessionId || selectedArtifactIndices.size === 0 || !onDeleteArtifacts) return;
    const indexes = Array.from(selectedArtifactIndices).sort((a, b) => a - b);
    setBulkConfirm(null);
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

  const handleDelete = async (sid: string) => {
    try {
      await api.tutor.deleteSession(sid);
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      setDeleteConfirm(null);
      setSelectedSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const handleSaveToObsidian = async (session: TutorSessionSummary) => {
    setSavingSession(session.session_id);
    try {
      const full = await api.tutor.getSession(session.session_id);
      if (!full.turns || full.turns.length === 0) {
        toast.error("No turns to save");
        return;
      }

      const lines: string[] = [
        `# Tutor: ${session.topic || session.mode}`,
        `**Date:** ${new Date(session.started_at).toLocaleDateString()}`,
        `**Mode:** ${session.mode} | **Turns:** ${session.turn_count}`,
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

      const filename = `Tutor - ${(session.topic || session.mode).replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Themed bulk delete confirmation */}
      <AlertDialog open={bulkConfirm !== null} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent className="bg-black/95 border-[3px] border-double border-primary rounded-none shadow-lg gap-4 p-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-arcade text-primary tracking-wider text-sm">
              DELETE?
            </AlertDialogTitle>
            <AlertDialogDescription className={`${TEXT_BODY} font-terminal text-muted-foreground`}>
              {bulkConfirm?.type === "sessions" &&
                `Delete ${bulkConfirm.count} selected session${bulkConfirm.count > 1 ? "s" : ""}? This cannot be undone.`}
              {bulkConfirm?.type === "artifacts" &&
                `Delete ${bulkConfirm.count} selected artifact${bulkConfirm.count > 1 ? "s" : ""}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-end">
            <AlertDialogCancel
              className="rounded-none font-terminal text-xs border-2 border-primary/50 bg-transparent text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              onClick={() => setBulkConfirm(null)}
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none font-arcade text-xs bg-primary/20 text-primary border-2 border-primary hover:bg-primary/30"
              onClick={() => {
                if (bulkConfirm?.type === "sessions") handleBulkDeleteSessionsConfirm();
                if (bulkConfirm?.type === "artifacts") handleBulkDeleteArtifactsConfirm();
              }}
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-[3px] border-double border-primary/30`}>
        <div className={TEXT_PANEL_TITLE}>ARTIFACTS</div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className={`${PANEL_PADDING} space-y-3`}>
          {/* Session info */}
          {sessionId ? (
            <div className="space-y-2 pb-3 border-b border-muted-foreground/20">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`${TEXT_BADGE} h-5 px-1.5`}>
                  {mode}
                </Badge>
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
                const Icon = ARTIFACT_ICONS[a.type];
                const color = ARTIFACT_COLORS[a.type];
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
                    {a.content && (
                      <div className={`${TEXT_MUTED} mt-1 line-clamp-2`}>
                        {a.content.slice(0, 100)}
                      </div>
                    )}
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
                Use /note, /card, or /map
              </div>
            </div>
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
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${TEXT_BADGE} h-5 px-1.5 shrink-0 ${
                            s.status === "active"
                              ? "text-green-400 border-green-400/50"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s.status === "active" ? "LIVE" : "DONE"}
                        </Badge>
                        <span className={`font-terminal text-sm truncate flex-1`}>
                          {s.topic || s.mode}
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
                          {s.mode}
                        </Badge>
                      </div>
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

                    <div className="ml-auto">
                      {deleteConfirm === s.session_id ? (
                        <div className="flex items-center gap-0.5">
                          <span className="font-terminal text-sm text-red-400 mr-1">Delete?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-none text-red-400 hover:text-red-300 hover:bg-red-400/10"
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
                          onClick={(e) => {
                            e.stopPropagation();
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
