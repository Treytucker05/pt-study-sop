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

export function IngestionTab() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [scheduleJson, setScheduleJson] = useState("");
  const [loJson, setLoJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 p-4">
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
