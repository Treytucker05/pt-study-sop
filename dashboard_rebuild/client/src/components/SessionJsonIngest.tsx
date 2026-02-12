import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/use-toast";
// Session shape from the API (not the Drizzle schema — API serializes differently)
interface ApiSession {
  id: number;
  date?: string;
  topic?: string;
  mainTopic?: string;
  mode?: string;
  createdAt?: string;
}

type JsonType = "tracker" | "enhanced" | "auto";

export function SessionJsonIngest() {
  const [jsonText, setJsonText] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [jsonType, setJsonType] = useState<JsonType>("auto");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawSessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });
  
  // Map to ApiSession shape
  const sessions: ApiSession[] = rawSessions.map((s) => ({
    id: s.id,
    date: s.date,
    topic: s.topic,
    mainTopic: s.mainTopic,
    mode: s.mode,
    createdAt: s.createdAt,
  }));

  const recentSessions = sessions
    .slice()
    .sort((a, b) => {
      const da = a.date || a.createdAt || "";
      const db = b.date || b.createdAt || "";
      return db.localeCompare(da);
    })
    .slice(0, 20);

   const generateMutation = useMutation({
     mutationFn: () => api.planner.generate(),
     onSuccess: (data) => {
       toast({
         title: "Planner tasks generated",
         description: `${data.tasks_created} review tasks created`,
       });
       queryClient.invalidateQueries({ queryKey: ["planner", "queue"] });
     },
     onError: (err: Error) => {
       toast({
         title: "Failed to generate tasks",
         description: err.message,
         variant: "destructive",
       });
     },
   });

   const mutation = useMutation({
     mutationFn: async () => {
       if (!selectedSessionId) throw new Error("Select a session first");

       let parsed: Record<string, unknown>;
       try {
         parsed = JSON.parse(jsonText);
       } catch {
         throw new Error("Invalid JSON — check syntax");
       }

       // Detect type if auto
       let type = jsonType;
       if (type === "auto") {
         const keys = Object.keys(parsed);
         const enhancedKeys = [
           "source_lock", "plan_of_attack", "frameworks_used", "buckets",
           "confusables_interleaved", "anki_cards", "glossary",
           "exit_ticket_blurt", "exit_ticket_muddiest", "exit_ticket_next_action",
           "retrospective_status", "spaced_reviews", "next_session",
           "errors_by_type", "errors_by_severity", "error_patterns",
           "spacing_algorithm", "rsr_adaptive_adjustment", "adaptive_multipliers",
         ];
         type = keys.some(k => enhancedKeys.includes(k)) ? "enhanced" : "tracker";
       }

       const tracker = type === "tracker" ? parsed : undefined;
       const enhanced = type === "enhanced" ? parsed : undefined;

       return api.brain.ingestSessionJson(selectedSessionId, tracker, enhanced);
     },
     onSuccess: (data) => {
       toast({ title: "JSON ingested", description: `${data.fields_updated} fields updated on session #${data.session_id}` });
       queryClient.invalidateQueries({ queryKey: ["sessions"] });
       queryClient.invalidateQueries({ queryKey: ["brain", "metrics"] });
       
       // Show CTA toast for planner generation
       toast({
         title: "Next step: Generate planner tasks?",
         description: "Create review tasks from weak anchors",
         duration: 10000,
         action: (
           <Button
             size="sm"
             onClick={() => generateMutation.mutate()}
             disabled={generateMutation.isPending}
             className="bg-primary text-black hover:bg-primary/80"
           >
             {generateMutation.isPending ? "Generating..." : "Generate Now"}
           </Button>
         ),
       });
       
       setJsonText("");
       setValidationErrors([]);
     },
     onError: (err: Error) => {
       toast({ title: "Ingestion failed", description: err.message, variant: "destructive" });
     },
   });

  function validate() {
    const errs: string[] = [];
    if (!selectedSessionId) errs.push("Select a session");
    if (!jsonText.trim()) {
      errs.push("Paste JSON first");
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          errs.push("JSON must be an object, not array");
        }
        if (parsed.schema_version && parsed.schema_version !== "9.4") {
          errs.push(`Expected schema_version 9.4, got ${parsed.schema_version}`);
        }
      } catch {
        errs.push("Invalid JSON syntax");
      }
    }
    setValidationErrors(errs);
    return errs.length === 0;
  }

  return (
    <Card className="bg-black/40 border-[3px] border-double border-primary rounded-none">
      <CardHeader className="border-b border-primary/50 p-4">
        <CardTitle className="font-arcade text-sm flex items-center gap-2">
          <div className="w-4 h-4 bg-primary inline-block" />
          SESSION_JSON_INGEST
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Session selector */}
        <div>
          <label className="font-terminal text-xs text-muted-foreground block mb-1">
            TARGET SESSION
          </label>
          <select
            value={selectedSessionId ?? ""}
            onChange={e => setSelectedSessionId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-black border border-primary/50 text-white font-terminal text-xs p-2 rounded-none focus:border-primary outline-none"
          >
            <option value="">-- select session --</option>
            {recentSessions.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.id} | {s.date?.slice(0, 10) || "?"} | {s.topic || s.mainTopic || "Untitled"} | {s.mode || "?"}
              </option>
            ))}
          </select>
        </div>

        {/* JSON type */}
        <div>
          <label className="font-terminal text-xs text-muted-foreground block mb-1">
            JSON TYPE
          </label>
          <div className="flex gap-2">
            {(["auto", "tracker", "enhanced"] as JsonType[]).map(t => (
              <button
                key={t}
                onClick={() => setJsonType(t)}
                className={`px-3 py-1 font-arcade text-xs rounded-none border ${
                  jsonType === t
                    ? "bg-primary text-black border-primary"
                    : "border-primary/30 text-muted-foreground hover:text-white"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* JSON textarea */}
        <div>
          <label className="font-terminal text-xs text-muted-foreground block mb-1">
            PASTE TRACKER OR ENHANCED JSON
          </label>
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='{"schema_version": "9.4", "topic": "...", "mode": "Core", ...}'
            rows={10}
            className="w-full bg-black border border-primary/50 text-green-400 font-terminal text-xs p-2 rounded-none focus:border-primary outline-none resize-y"
          />
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="border border-red-500/50 bg-red-500/10 p-2 font-terminal text-xs text-red-400 space-y-1">
            {validationErrors.map((e, i) => (
              <div key={i}>- {e}</div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { if (validate()) mutation.mutate(); }}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-primary text-black font-arcade text-xs rounded-none hover:bg-primary/80 disabled:opacity-50"
          >
            {mutation.isPending ? "INGESTING..." : "INGEST"}
          </button>
          <button
            onClick={validate}
            className="px-4 py-2 border border-primary/50 text-primary font-arcade text-xs rounded-none hover:bg-primary/10"
          >
            VALIDATE
          </button>
          <button
            onClick={() => { setJsonText(""); setValidationErrors([]); }}
            className="px-4 py-2 border border-primary/30 text-muted-foreground font-arcade text-xs rounded-none hover:text-white"
          >
            CLEAR
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
