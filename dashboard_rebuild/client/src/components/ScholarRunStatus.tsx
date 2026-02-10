import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Brain, BookOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CARD_BORDER_SECONDARY,
  ICON_SM,
  STATUS_SUCCESS,
  STATUS_ERROR,
} from "@/lib/theme";

interface ScholarStatus {
  running: boolean;
  last_run?: string;
  status?: string;
  progress?: number;
  current_step?: string;
  errors?: string[];
}

export function ScholarRunStatus() {
  const queryClient = useQueryClient();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [studyMode, setStudyMode] = useState<"brain" | "tutor">("brain");

  const { data: status, isLoading } = useQuery<ScholarStatus>({
    queryKey: ["scholarStatus"],
    queryFn: async () => {
      const response = await fetch("/api/scholar/status");
      if (!response.ok) throw new Error("Failed to fetch Scholar status");
      return response.json();
    },
    refetchInterval: pollingEnabled ? 2000 : false,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/scholar/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "ui", mode: studyMode }),
      });
      const payload = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      if (!response.ok) {
        const msg =
          (payload && (payload.message || payload.error)) ||
          `Failed to start Scholar run (${response.status})`;
        throw new Error(msg);
      }
      return payload;
    },
    onSuccess: () => {
      setPollingEnabled(true);
      queryClient.invalidateQueries({ queryKey: ["scholarStatus"] });
    },
  });

  useEffect(() => {
    if (status?.running) {
      setPollingEnabled(true);
    } else if (pollingEnabled && !status?.running) {
      setPollingEnabled(false);
      queryClient.invalidateQueries({ queryKey: ["scholarStatus"] });
    }
  }, [status?.running, pollingEnabled, queryClient]);

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status?.running) return <RefreshCw className="w-4 h-4 animate-spin text-primary" />;
    if (status?.status === "complete") return <CheckCircle className={`w-4 h-4 ${STATUS_SUCCESS}`} />;
    if (status?.status === "error") return <XCircle className={`w-4 h-4 ${STATUS_ERROR}`} />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusBadge = () => {
    if (status?.running) {
      return (
        <Badge className="bg-primary/20 text-primary border-primary/50">
          Running
        </Badge>
      );
    }
    if (status?.status === "complete") {
      return (
        <Badge className={`bg-success/20 ${STATUS_SUCCESS}`}>
          Complete
        </Badge>
      );
    }
    if (status?.status === "error") {
      return (
        <Badge className={`bg-destructive/20 ${STATUS_ERROR}`}>
          Error
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Idle
      </Badge>
    );
  };

  return (
    <Card className={`bg-black/40 ${CARD_BORDER_SECONDARY}`}>
      <CardHeader className="border-b border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="font-arcade text-sm text-primary">
              SCHOLAR ORCHESTRATOR
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Status Info */}
        <div className="space-y-2">
          {runMutation.isError && (
            <div className="p-2 bg-destructive/10 border border-destructive/50 rounded-none">
              <div className={`font-terminal text-xs ${STATUS_ERROR}`}>Run Error:</div>
              <div className="font-terminal text-xs text-destructive/80">
                {(runMutation.error as Error)?.message || "Unknown error"}
              </div>
            </div>
          )}

          {status?.running && (
            <>
              {status.current_step && (
                <div className="space-y-1">
                  <div className="font-terminal text-xs text-muted-foreground">
                    Current Step:
                  </div>
                  <div className="font-terminal text-xs text-secondary">
                    {status.current_step}
                  </div>
                </div>
              )}
              {status.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-terminal text-xs text-muted-foreground">
                      Progress:
                    </span>
                    <span className="font-terminal text-xs text-primary">
                      {Math.round(status.progress)}%
                    </span>
                  </div>
                  <Progress
                    value={status.progress}
                    className="h-2 bg-black border border-primary/30"
                  />
                </div>
              )}
            </>
          )}

          {!status?.running && status?.last_run && (
            <div className="space-y-1">
              <div className="font-terminal text-xs text-muted-foreground">
                Last Run:
              </div>
              <div className="font-terminal text-xs text-secondary">
                {new Date(status.last_run).toLocaleString()}
              </div>
            </div>
          )}

          {status?.errors && status.errors.length > 0 && (
            <div className="space-y-1">
              <div className={`font-terminal text-xs ${STATUS_ERROR}`}>
                Errors:
              </div>
              <div className="space-y-1 p-2 bg-destructive/10 border border-destructive/50 rounded-none">
                {status.errors.map((error, idx) => (
                  <div key={idx} className={`font-terminal text-xs ${STATUS_ERROR}`}>
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Study mode selector */}
        <div className="space-y-1">
          <div className="font-terminal text-xs text-muted-foreground">Study mode</div>
          <Select value={studyMode} onValueChange={(v) => setStudyMode(v as "brain" | "tutor")} disabled={status?.running || runMutation.isPending}>
            <SelectTrigger className="rounded-none font-terminal text-xs border-primary/40 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-black border-primary">
              <SelectItem value="brain" className="font-terminal text-xs rounded-none">
                <span className="flex items-center gap-2">
                  <Brain className={ICON_SM} /> Brain Study
                </span>
              </SelectItem>
              <SelectItem value="tutor" className="font-terminal text-xs rounded-none">
                <span className="flex items-center gap-2">
                  <BookOpen className={ICON_SM} /> Tutor Study
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => runMutation.mutate()}
            disabled={status?.running || runMutation.isPending}
            className="flex-1 bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
          >
            <Play className={`${ICON_SM} mr-1`} />
            {runMutation.isPending ? "Starting..." : "Run Scholar"}
          </Button>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["scholarStatus"] })}
            variant="outline"
            className="rounded-none font-terminal text-xs"
            disabled={isLoading}
          >
            <RefreshCw className={`${ICON_SM} ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Info */}
        <div className="pt-2 border-t border-primary/30">
          <p className="font-terminal text-xs text-muted-foreground">
            {studyMode === "brain"
              ? "Brain Study: session logs + SOP. Tutor Study: SOP library only (no telemetry)."
              : "Tutor Study: evaluates sop/library, researches learning science, proposes changes."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
