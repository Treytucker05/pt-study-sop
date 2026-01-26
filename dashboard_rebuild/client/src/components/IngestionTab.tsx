import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Course, Module, LearningObjective } from "@shared/schema";

const SCHEDULE_PROMPT = `I need you to extract schedule events from my course syllabus.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "type": "chapter" | "quiz" | "assignment" | "exam",
  "title": "string",
  "dueDate": "YYYY-MM-DD",
  "notes": "optional string or null"
}

Rules:
1. type must be EXACTLY one of: "chapter", "quiz", "assignment", "exam"
2. dueDate must be ISO format (YYYY-MM-DD) - if no date given, use null
3. Return ONLY the JSON array, nothing else

Here's my syllabus:

[PASTE YOUR SYLLABUS BELOW]`;

const LO_PROMPT = `I need you to extract learning objectives from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "loCode": "string",
  "title": "string"
}

Rules:
1. loCode: Preserve original numbering if present, or create sequential "1", "2", "3"...
2. title: Keep the objective text exactly as written
3. Return ONLY the JSON array, nothing else

Here are my learning objectives:

[PASTE YOUR LOs BELOW]`;

const WRAP_PROMPT = `I need you to convert my study session notes into WRAP format.

WRAP format has 4 sections:

Section A: Obsidian Notes
- Main concepts and insights from the session
- Key points to remember

Section B: Anki Cards
- Format: "front: [question]" on one line, "back: [answer]" on next line
- Create cards for important facts and concepts

Section C: Spaced Schedule
- R1=tomorrow
- R2=3d
- R3=1w
- R4=2w

Section D: JSON Logs
\`\`\`json
{
  "merged": {
    "topic": "[main topic]",
    "mode": "Core",
    "duration_minutes": [number],
    "understanding": [1-5],
    "retention": [1-5]
  }
}
\`\`\`

Return ONLY the WRAP formatted content, NO additional text or explanation.

Here are my study notes:

[PASTE YOUR NOTES BELOW]`;

export function IngestionTab() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [scheduleJson, setScheduleJson] = useState("");
  const [loJson, setLoJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [wrapContent, setWrapContent] = useState("");
  const [wrapFile, setWrapFile] = useState<File | null>(null);
  const [wrapStatus, setWrapStatus] = useState<{type: "success" | "error", message: string} | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: () => selectedCourseId ? api.modules.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const { data: learningObjectives = [] } = useQuery({
    queryKey: ["learningObjectives", selectedCourseId],
    queryFn: () => selectedCourseId ? api.learningObjectives.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const importScheduleMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const events = JSON.parse(jsonStr);
      return api.scheduleEvents.createBulk(selectedCourseId, events);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setScheduleJson("");
      setImportError(null);
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to import schedule");
    },
  });

  const importLosMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const los = JSON.parse(jsonStr);
      return api.learningObjectives.createBulk(selectedCourseId, selectedModuleId, los);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningObjectives"] });
      setLoJson("");
      setImportError(null);
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to import LOs");
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Module> }) =>
      api.modules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleWrapSubmit = async () => {
    try {
      setWrapStatus(null);
      const content = wrapFile ? await wrapFile.text() : wrapContent;
      const filename = wrapFile?.name || "pasted_wrap.md";
      const result = await api.brain.ingest(content, filename);
      
      if (result.sessionSaved) {
        setWrapStatus({
          type: "success",
          message: `✓ Session saved! ID: ${result.sessionId}, Cards: ${result.cardsCreated || 0}`
        });
        setWrapContent("");
        setWrapFile(null);
      } else {
        setWrapStatus({
          type: "error",
          message: result.errors?.join(", ") || result.message
        });
      }
    } catch (err: any) {
      setWrapStatus({type: "error", message: err.message || "Failed to ingest"});
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* WRAP SESSION INGESTION - First and prominent */}
      <div className="border-2 border-primary rounded-none p-4 bg-primary/5">
        <h2 className="text-xl font-arcade text-primary mb-4">WRAP SESSION INGESTION</h2>
        
        {wrapStatus && (
          <div className={`mb-4 p-3 rounded-none font-terminal text-sm ${
            wrapStatus.type === "success" 
              ? "bg-green-900/30 border border-green-500 text-green-400"
              : "bg-red-900/30 border border-red-500 text-red-400"
          }`}>
            {wrapStatus.message}
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={() => copyToClipboard(WRAP_PROMPT)}
            className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal mb-2"
            type="button"
          >
            Copy Prompt for ChatGPT
          </button>
          <p className="text-xs text-muted-foreground mb-2 font-terminal">
            Use ChatGPT to convert your notes to WRAP format, then paste or upload below:
          </p>
          
          <div>
            <label className="block text-sm mb-2 font-terminal text-muted-foreground">
              Upload WRAP File (.md, .txt)
            </label>
            <input
              type="file"
              accept=".md,.txt"
              onChange={(e) => {
                setWrapFile(e.target.files?.[0] || null);
                setWrapContent("");
                setWrapStatus(null);
              }}
              className="w-full bg-black border border-secondary rounded-none p-2 font-terminal text-sm"
            />
            {wrapFile && (
              <p className="text-xs text-muted-foreground mt-1 font-terminal">
                Selected: {wrapFile.name}
              </p>
            )}
          </div>
          
          <div className="text-center font-terminal text-xs text-muted-foreground">
            - OR -
          </div>
          
          <div>
            <label className="block text-sm mb-2 font-terminal text-muted-foreground">
              Paste WRAP Content
            </label>
            <textarea
              className="w-full bg-black border border-secondary rounded-none p-2 h-48 font-terminal text-sm"
              placeholder="Paste your WRAP session here..."
              value={wrapContent}
              onChange={(e) => {
                setWrapContent(e.target.value);
                setWrapFile(null);
                setWrapStatus(null);
              }}
            />
          </div>
          
          <button
            onClick={handleWrapSubmit}
            disabled={!wrapContent && !wrapFile}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 px-6 py-3 rounded-none font-arcade text-sm w-full"
            type="button"
          >
            INGEST WRAP SESSION
          </button>
        </div>
      </div>
      
      <h2 className="text-xl font-arcade text-primary">MATERIAL INGESTION</h2>

      <div>
        <label className="block text-sm mb-1 font-terminal text-muted-foreground">Select Course</label>
        <select
          className="w-full bg-black border border-secondary rounded-none p-2 font-terminal"
          value={selectedCourseId || ""}
          onChange={(e) => {
            setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null);
            setSelectedModuleId(null);
          }}
        >
          <option value="">-- Select Course --</option>
          {courses.map((c: Course) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {importError && (
        <div className="bg-destructive/20 border border-destructive rounded-none p-3 text-destructive font-terminal">
          {importError}
        </div>
      )}

      {selectedCourseId && (
        <>
          <div className="border border-secondary/50 rounded-none p-4">
            <h3 className="text-sm font-arcade mb-2 text-primary">SCHEDULE IMPORT</h3>
            <button
              onClick={() => copyToClipboard(SCHEDULE_PROMPT)}
              className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal mb-2"
              type="button"
            >
              Copy Prompt for ChatGPT
            </button>
            <p className="text-xs text-muted-foreground mb-2 font-terminal">
              Paste the ChatGPT response (JSON array) below:
            </p>
            <textarea
              className="w-full bg-black border border-secondary rounded-none p-2 h-32 font-terminal text-sm"
              placeholder='[{"type": "exam", "title": "...", "dueDate": "2026-01-20", "notes": null}]'
              value={scheduleJson}
              onChange={(e) => setScheduleJson(e.target.value)}
            />
            <button
              onClick={() => importScheduleMutation.mutate(scheduleJson)}
              disabled={!scheduleJson || importScheduleMutation.isPending}
              className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none mt-2 font-terminal text-xs"
              type="button"
            >
              {importScheduleMutation.isPending ? "Importing..." : "Import Schedule"}
            </button>
          </div>

          <div className="border border-secondary/50 rounded-none p-4">
            <h3 className="text-sm font-arcade mb-2 text-primary">MODULES</h3>
            {modules.length === 0 ? (
              <p className="text-xs text-muted-foreground font-terminal">No modules yet. Add modules manually or import.</p>
            ) : (
              <table className="w-full text-sm font-terminal">
                <thead>
                  <tr className="border-b border-secondary/50">
                    <th className="text-left p-2">Module</th>
                    <th className="text-center p-2">Files</th>
                    <th className="text-center p-2">NotebookLM</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m: Module) => (
                    <tr key={m.id} className="border-b border-secondary/30">
                      <td className="p-2">{m.name}</td>
                      <td className="text-center p-2">
                        <input
                          type="checkbox"
                          checked={m.filesDownloaded}
                          onChange={(e) => updateModuleMutation.mutate({
                            id: m.id,
                            data: { filesDownloaded: e.target.checked }
                          })}
                        />
                      </td>
                      <td className="text-center p-2">
                        <input
                          type="checkbox"
                          checked={m.notebooklmLoaded}
                          onChange={(e) => updateModuleMutation.mutate({
                            id: m.id,
                            data: { notebooklmLoaded: e.target.checked }
                          })}
                        />
                      </td>
                      <td className="text-center p-2">
                        {m.filesDownloaded && m.notebooklmLoaded ? (
                          <span className="text-green-400">Ready</span>
                        ) : (
                          <span className="text-yellow-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border border-secondary/50 rounded-none p-4">
            <h3 className="text-sm font-arcade mb-2 text-primary">LEARNING OBJECTIVES IMPORT</h3>

            <div className="mb-2">
              <label className="block text-xs mb-1 font-terminal text-muted-foreground">Target Module (optional)</label>
              <select
                className="w-full bg-black border border-secondary rounded-none p-2 font-terminal"
                value={selectedModuleId || ""}
                onChange={(e) => setSelectedModuleId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">-- No Module (Course-level) --</option>
                {modules.map((m: Module) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => copyToClipboard(LO_PROMPT)}
              className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal mb-2"
              type="button"
            >
              Copy Prompt for ChatGPT
            </button>
            <p className="text-xs text-muted-foreground mb-2 font-terminal">
              Paste the ChatGPT response (JSON array) below:
            </p>
            <textarea
              className="w-full bg-black border border-secondary rounded-none p-2 h-32 font-terminal text-sm"
              placeholder='[{"loCode": "1.1", "title": "Define..."}]'
              value={loJson}
              onChange={(e) => setLoJson(e.target.value)}
            />
            <button
              onClick={() => importLosMutation.mutate(loJson)}
              disabled={!loJson || importLosMutation.isPending}
              className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none mt-2 font-terminal text-xs"
              type="button"
            >
              {importLosMutation.isPending ? "Importing..." : "Import LOs"}
            </button>

            {learningObjectives.length > 0 && (
              <div className="mt-4">
                <h4 className="font-terminal text-xs mb-2">Current LOs ({learningObjectives.length})</h4>
                <div className="max-h-48 overflow-y-auto">
                  {learningObjectives.map((lo: LearningObjective) => (
                    <div key={lo.id} className="text-xs py-1 border-b border-secondary/30 font-terminal">
                      <span className="text-primary">{lo.loCode}</span>: {lo.title}
                      <span className={`ml-2 text-[10px] px-1 rounded ${
                        lo.status === "solid" ? "bg-green-600" :
                        lo.status === "in_progress" ? "bg-yellow-600" :
                        lo.status === "need_review" ? "bg-orange-600" :
                        "bg-gray-600"
                      }`}>
                        {lo.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
