import { useState } from "react";
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

export function TutorArtifacts({
  sessionId,
  artifacts,
  turnCount,
  mode,
  topic,
  startedAt,
  recentSessions,
  onResumeSession,
}: TutorArtifactsProps) {
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState<string | null>(null);

  const handleDelete = async (sid: string) => {
    try {
      await api.tutor.deleteSession(sid);
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      setDeleteConfirm(null);
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
      {/* Header */}
      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-2 border-primary/30`}>
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
              <div className={TEXT_SECTION_LABEL}>Artifacts</div>
              {artifacts.map((a, i) => {
                const Icon = ARTIFACT_ICONS[a.type];
                const color = ARTIFACT_COLORS[a.type];
                return (
                  <div
                    key={i}
                    className="border-2 border-muted-foreground/20 p-2.5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`${ICON_MD} ${color}`} />
                      <span className={`${TEXT_BODY} text-sm truncate flex-1`}>
                        {a.title || `${a.type} #${i + 1}`}
                      </span>
                    </div>
                    {a.content && (
                      <div className={`${TEXT_MUTED} mt-1 line-clamp-2`}>
                        {a.content.slice(0, 100)}
                      </div>
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
              <div className={TEXT_SECTION_LABEL}>Recent Sessions</div>
              {recentSessions.slice(0, 8).map((s) => (
                <div
                  key={s.session_id}
                  className="border-2 border-muted-foreground/10 hover:border-muted-foreground/30 transition-colors"
                >
                  {/* Clickable session info */}
                  <button
                    onClick={() => onResumeSession(s.session_id)}
                    className="w-full text-left px-3 py-2.5"
                  >
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
                  </button>

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
