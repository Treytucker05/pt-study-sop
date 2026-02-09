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
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
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
  return (
    <div className="flex flex-col h-full gap-3 p-3">
      <div className="font-arcade text-xs text-primary tracking-wider">
        ARTIFACTS
      </div>

      {/* Session info */}
      {sessionId ? (
        <div className="space-y-1 pb-2 border-b border-muted-foreground/20">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] rounded-none">
              {mode}
            </Badge>
            <Badge variant="outline" className="text-[10px] rounded-none text-primary">
              FIRST PASS
            </Badge>
          </div>
          {topic && (
            <div className="text-xs font-terminal text-foreground truncate">
              {topic}
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] font-terminal text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {turnCount} turns
            </span>
            {startedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs font-terminal text-muted-foreground/50 py-4 text-center">
          No active session
        </div>
      )}

      {/* Artifacts list */}
      {artifacts.length > 0 ? (
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {artifacts.map((a, i) => {
              const Icon = ARTIFACT_ICONS[a.type];
              const color = ARTIFACT_COLORS[a.type];
              return (
                <div
                  key={i}
                  className="border-2 border-muted-foreground/20 p-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-[10px] font-terminal text-foreground truncate flex-1">
                      {a.title || `${a.type} #${i + 1}`}
                    </span>
                  </div>
                  {a.content && (
                    <div className="text-[10px] font-terminal text-muted-foreground mt-1 line-clamp-2">
                      {a.content.slice(0, 100)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : sessionId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-1">
            <BookOpen className="w-6 h-6 text-muted-foreground/30 mx-auto" />
            <div className="text-[10px] font-terminal text-muted-foreground/50">
              No artifacts yet
            </div>
            <div className="text-[10px] font-terminal text-muted-foreground/30">
              Use /note, /card, or /map
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-muted-foreground/20">
          <div className="text-[10px] font-terminal text-muted-foreground uppercase tracking-wider">
            Recent Sessions
          </div>
          <div className="space-y-1">
            {recentSessions.slice(0, 5).map((s) => (
              <button
                key={s.session_id}
                onClick={() => onResumeSession(s.session_id)}
                className="w-full text-left px-2 py-1.5 border-2 border-transparent hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] rounded-none ${
                      s.status === "active"
                        ? "text-green-400 border-green-400/50"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.status === "active" ? "LIVE" : "DONE"}
                  </Badge>
                  <span className="text-[10px] font-terminal text-foreground truncate flex-1">
                    {s.topic || s.mode}
                  </span>
                </div>
                <div className="text-[10px] font-terminal text-muted-foreground/50 mt-0.5">
                  {s.turn_count} turns ·{" "}
                  {new Date(s.started_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
