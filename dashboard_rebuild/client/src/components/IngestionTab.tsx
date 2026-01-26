import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Course, Module, LearningObjective, ScheduleEvent } from "@shared/schema";

const SYLLABUS_PROMPT = `You are extracting a full course syllabus for ingestion.

Return ONLY a valid JSON object with NO additional text, NO markdown code blocks, NO explanation.

Top-level structure:
{
  "term": {
    "startDate": "2026-01-05",
    "endDate": "2026-04-24",
    "timezone": "America/Chicago"
  },
  "modules": [
    {
      "name": "Module 1: ...",
      "orderIndex": 1,
      "topics": ["..."],
      "readings": ["..."],
      "assessments": ["..."]
    }
  ],
  "events": [
    {
      "type": "class" | "lecture" | "reading" | "topic" | "assignment" | "quiz" | "exam" | "assessment",
      "title": "string",
      "date": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD | null",
      "startTime": "HH:MM | null",
      "endTime": "HH:MM | null",
      "daysOfWeek": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      "delivery": "in_person" | "virtual_sync" | "virtual_async" | "hybrid",
      "assessmentType": "EA | null",
      "moduleName": "Module 1: ... | null",
      "notes": "string | null"
    }
  ]
}

Rules:
1. Include ALL items: class meetings, assignments, quizzes, exams, topics, readings, virtual synchronous/asynchronous activities, and learning assessments (EA).
2. For repeating class meetings, set daysOfWeek + startTime/endTime, and include term start/end.
3. For one-off items, set date or dueDate.
4. Keep moduleName when items belong to a module.
5. Return ONLY the JSON object, nothing else.

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
  const [syllabusJson, setSyllabusJson] = useState("");
  const [loJson, setLoJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [wrapContent, setWrapContent] = useState("");
  const [wrapStatus, setWrapStatus] = useState<{type: "success" | "error", message: string} | null>(null);
  const [syllabusStatus, setSyllabusStatus] = useState<{type: "success" | "error", message: string} | null>(null);
  const [moduleEdits, setModuleEdits] = useState<Record<number, Partial<Module>>>({});
  const [scheduleEdits, setScheduleEdits] = useState<Record<number, (Partial<ScheduleEvent> & { delivery?: string })>>({});
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<number>>(new Set());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<number>>(new Set());
  const [bulkDelete, setBulkDelete] = useState<{
    type: "modules" | "schedule";
    ids: number[];
    label: string;
  } | null>(null);
  const bulkDeleteRef = useRef<typeof bulkDelete>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: () => selectedCourseId ? api.modules.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const { data: scheduleEvents = [] } = useQuery({
    queryKey: ["scheduleEvents", selectedCourseId],
    queryFn: () => selectedCourseId ? api.scheduleEvents.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const { data: learningObjectives = [] } = useQuery({
    queryKey: ["learningObjectives", selectedCourseId],
    queryFn: () => selectedCourseId ? api.learningObjectives.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  const importSyllabusMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const payload = JSON.parse(extractJsonPayload(jsonStr));
      return api.syllabus.importBulk(selectedCourseId, payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setSyllabusJson("");
      setSyllabusStatus({
        type: "success",
        message: `Imported: ${result.modulesCreated} modules, ${result.eventsCreated} events (${result.classMeetingsExpanded} class meetings expanded)`,
      });
      setImportError(null);
    },
    onError: (err: any) => {
      setSyllabusStatus({ type: "error", message: err.message || "Failed to import syllabus" });
      setImportError(err.message || "Failed to import syllabus");
    },
  });

  const importLosMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const los = JSON.parse(extractJsonPayload(jsonStr));
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

  const deleteModuleMutation = useMutation({
    mutationFn: (id: number) => api.modules.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  const deleteModulesMutation = useMutation({
    mutationFn: (ids: number[]) => api.modules.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setSelectedModuleIds(new Set());
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to delete modules");
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScheduleEvent> }) =>
      api.scheduleEvents.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => api.scheduleEvents.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
    },
  });

  const deleteSchedulesMutation = useMutation({
    mutationFn: (ids: number[]) => api.scheduleEvents.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setSelectedScheduleIds(new Set());
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to delete schedule items");
    },
  });
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const extractJsonPayload = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return candidate.slice(firstBrace, lastBrace + 1).trim();
    }
    return candidate;
  };

  const openBulkDelete = (type: "modules" | "schedule", ids: number[], label: string) => {
    if (!ids.length) return;
    const payload = { type, ids, label };
    bulkDeleteRef.current = payload;
    setBulkDelete(payload);
  };

  const handleWrapSubmit = async () => {
    try {
      setWrapStatus(null);
      const content = wrapContent;
      const filename = "pasted_wrap.md";
      const result = await api.brain.ingest(content, filename);
      
      if (result.sessionSaved) {
        setWrapStatus({
          type: "success",
          message: `✓ Session saved! ID: ${result.sessionId}, Cards: ${result.cardsCreated || 0}`
        });
        setWrapContent("");
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
              Paste WRAP Content
            </label>
            <textarea
              className="w-full bg-black border border-secondary rounded-none p-2 h-48 font-terminal text-sm"
              placeholder="Paste your WRAP session here..."
              value={wrapContent}
              onChange={(e) => {
                setWrapContent(e.target.value);
                setWrapStatus(null);
              }}
            />
          </div>
          
          <button
            onClick={handleWrapSubmit}
            disabled={!wrapContent}
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
        <Accordion type="multiple" className="border border-secondary/40 rounded-none divide-y divide-secondary/40">
          <AccordionItem value="syllabus-import" className="border-secondary/40">
            <AccordionTrigger className="font-arcade text-xs text-primary px-3 hover:no-underline">
              SYLLABUS IMPORT (MODULES + SCHEDULE)
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <button
                onClick={() => copyToClipboard(SYLLABUS_PROMPT)}
                className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal mb-2"
                type="button"
              >
                Copy Prompt for ChatGPT
              </button>
              <p className="text-xs text-muted-foreground mb-2 font-terminal">
                Paste the ChatGPT response (combined JSON object) below:
              </p>
              <textarea
                className="w-full bg-black border border-secondary rounded-none p-2 h-40 font-terminal text-sm"
                placeholder='{"term":{"startDate":"2026-01-15","endDate":"2026-05-01","timezone":"America/Chicago"},"modules":[...],"events":[...]}'
                value={syllabusJson}
                onChange={(e) => {
                  setSyllabusJson(e.target.value);
                  setSyllabusStatus(null);
                }}
              />
              <button
                onClick={() => importSyllabusMutation.mutate(syllabusJson)}
                disabled={!syllabusJson || importSyllabusMutation.isPending}
                className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none mt-2 font-terminal text-xs"
                type="button"
              >
                {importSyllabusMutation.isPending ? "Importing..." : "Import Syllabus"}
              </button>
              {syllabusStatus && (
                <div className={`mt-2 p-2 border font-terminal text-xs ${
                  syllabusStatus.type === "success"
                    ? "border-green-500 text-green-400"
                    : "border-red-500 text-red-400"
                }`}>
                  {syllabusStatus.message}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="modules" className="border-secondary/40">
            <AccordionTrigger className="font-arcade text-xs text-primary px-3 hover:no-underline">
              MODULES
            </AccordionTrigger>
            <AccordionContent className="px-3">
              {modules.length === 0 ? (
                <p className="text-xs text-muted-foreground font-terminal">No modules yet. Add modules manually or import.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      onClick={() => {
                        const next = new Set<number>();
                        if (selectedModuleIds.size !== modules.length) {
                          modules.forEach((m: Module) => next.add(m.id));
                        }
                        setSelectedModuleIds(next);
                      }}
                    >
                      {selectedModuleIds.size === modules.length ? "Uncheck All" : "Check All"}
                    </button>
                    <button
                      className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      disabled={selectedModuleIds.size === 0}
                      onClick={() => {
                        openBulkDelete("modules", Array.from(selectedModuleIds), `Delete ${selectedModuleIds.size} module(s)? This cannot be undone.`);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      disabled={selectedModuleIds.size === 0}
                      onClick={() => {
                        selectedModuleIds.forEach((id) => {
                          const edit = moduleEdits[id];
                          if (edit) {
                            updateModuleMutation.mutate({ id, data: edit });
                          }
                        });
                        setModuleEdits((prev) => {
                          const next = { ...prev };
                          selectedModuleIds.forEach((id) => {
                            delete next[id];
                          });
                          return next;
                        });
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <table className="w-full text-sm font-terminal">
                    <thead>
                      <tr className="border-b border-secondary/50">
                        <th className="text-center p-2 w-8">Select</th>
                        <th className="text-left p-2">Module</th>
                        <th className="text-center p-2">Order</th>
                        <th className="text-center p-2">Files</th>
                        <th className="text-center p-2">NotebookLM</th>
                        <th className="text-center p-2">Status</th>
                        <th className="text-center p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m: Module) => (
                        <tr key={m.id} className="border-b border-secondary/30">
                          <td className="text-center p-2">
                            <Checkbox
                              checked={selectedModuleIds.has(m.id)}
                              onCheckedChange={(checked) =>
                                setSelectedModuleIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(m.id);
                                  else next.delete(m.id);
                                  return next;
                                })
                              }
                              className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                            />
                          </td>
                        <td className="p-2">
                          <input
                            className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                            value={moduleEdits[m.id]?.name ?? m.name}
                            onChange={(e) =>
                              setModuleEdits((prev) => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], name: e.target.value },
                              }))
                            }
                          />
                        </td>
                        <td className="text-center p-2">
                          <input
                            type="number"
                            className="w-16 bg-black border border-secondary rounded-none p-1 text-xs font-terminal text-center"
                            value={moduleEdits[m.id]?.orderIndex ?? m.orderIndex ?? 0}
                            onChange={(e) =>
                              setModuleEdits((prev) => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], orderIndex: parseInt(e.target.value || "0", 10) },
                              }))
                            }
                          />
                        </td>
                        <td className="text-center p-2">
                          <Checkbox
                            checked={m.filesDownloaded}
                            onCheckedChange={(checked) => updateModuleMutation.mutate({
                              id: m.id,
                              data: { filesDownloaded: !!checked }
                            })}
                            className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                          />
                        </td>
                        <td className="text-center p-2">
                          <Checkbox
                            checked={m.notebooklmLoaded}
                            onCheckedChange={(checked) => updateModuleMutation.mutate({
                              id: m.id,
                              data: { notebooklmLoaded: !!checked }
                            })}
                            className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                          />
                        </td>
                        <td className="text-center p-2">
                          {m.filesDownloaded && m.notebooklmLoaded ? (
                            <span className="text-green-400">Ready</span>
                          ) : (
                            <span className="text-yellow-400">Pending</span>
                          )}
                        </td>
                        <td className="text-center p-2 space-x-2">
                          <button
                            className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                            type="button"
                            disabled={!moduleEdits[m.id]}
                            onClick={() => {
                              const edit = moduleEdits[m.id];
                              if (!edit) return;
                              updateModuleMutation.mutate({ id: m.id, data: edit });
                              setModuleEdits((prev) => {
                                const next = { ...prev };
                                delete next[m.id];
                                return next;
                              });
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                            type="button"
                            onClick={() => deleteModuleMutation.mutate(m.id)}
                          >
                            Delete
                          </button>
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="schedule-items" className="border-secondary/40">
            <AccordionTrigger className="font-arcade text-xs text-primary px-3 hover:no-underline">
              SCHEDULE ITEMS
            </AccordionTrigger>
            <AccordionContent className="px-3">
              {scheduleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground font-terminal">No schedule items yet. Import the syllabus or add events manually.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      onClick={() => {
                        const next = new Set<number>();
                        if (selectedScheduleIds.size !== scheduleEvents.length) {
                          scheduleEvents.forEach((ev: ScheduleEvent) => next.add(ev.id));
                        }
                        setSelectedScheduleIds(next);
                      }}
                    >
                      {selectedScheduleIds.size === scheduleEvents.length ? "Uncheck All" : "Check All"}
                    </button>
                    <button
                      className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      disabled={selectedScheduleIds.size === 0}
                      onClick={() => {
                        openBulkDelete("schedule", Array.from(selectedScheduleIds), `Delete ${selectedScheduleIds.size} schedule item(s)? This cannot be undone.`);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                      type="button"
                      disabled={selectedScheduleIds.size === 0}
                      onClick={() => {
                        selectedScheduleIds.forEach((id) => {
                          const edit = scheduleEdits[id];
                          if (edit) {
                            updateScheduleMutation.mutate({ id, data: edit });
                          }
                        });
                        setScheduleEdits((prev) => {
                          const next = { ...prev };
                          selectedScheduleIds.forEach((id) => {
                            delete next[id];
                          });
                          return next;
                        });
                      }}
                    >
                      Save
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-terminal">
                      <thead>
                        <tr className="border-b border-secondary/50">
                          <th className="text-center p-2 w-8">Select</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Delivery</th>
                          <th className="text-left p-2">Title</th>
                          <th className="text-center p-2">Date</th>
                          <th className="text-center p-2">Start</th>
                          <th className="text-center p-2">End</th>
                          <th className="text-center p-2">Due</th>
                          <th className="text-left p-2">Notes</th>
                          <th className="text-center p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleEvents.map((ev: ScheduleEvent) => {
                          const edit = scheduleEdits[ev.id] || {};
                          const type = edit.type ?? ev.type ?? "";
                          const delivery = edit.delivery ?? (ev as ScheduleEvent & { delivery?: string }).delivery ?? "";
                          const title = edit.title ?? ev.title ?? "";
                          const date = edit.date ?? ev.date ?? "";
                          const startTime = edit.startTime ?? ev.startTime ?? "";
                          const endTime = edit.endTime ?? ev.endTime ?? "";
                          const dueDate = edit.dueDate ?? ev.dueDate ?? "";
                          const notes = edit.notes ?? ev.notes ?? "";
                          const hasEdits = !!scheduleEdits[ev.id];

                        return (
                          <tr key={ev.id} className="border-b border-secondary/30 align-top">
                            <td className="text-center p-2">
                              <Checkbox
                                checked={selectedScheduleIds.has(ev.id)}
                                onCheckedChange={(checked) =>
                                  setSelectedScheduleIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.add(ev.id);
                                    else next.delete(ev.id);
                                    return next;
                                  })
                                }
                                className="rounded-none border-secondary data-[state=checked]:bg-secondary w-4 h-4"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={type}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], type: e.target.value },
                                  }))
                                }
                              >
                                {["class", "lecture", "reading", "topic", "assignment", "quiz", "exam", "assessment", "other"].map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={delivery}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], delivery: e.target.value },
                                  }))
                                }
                              >
                                {["", "in_person", "virtual_sync", "virtual_async", "online_module", "hybrid"].map((opt) => (
                                  <option key={opt} value={opt}>{opt || "--"}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={title}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], title: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="date"
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={date || ""}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], date: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="time"
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={startTime || ""}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], startTime: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="time"
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={endTime || ""}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], endTime: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2">
                              <input
                                type="date"
                                className="bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={dueDate || ""}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], dueDate: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-full bg-black border border-secondary rounded-none p-1 text-xs font-terminal"
                                value={notes || ""}
                                onChange={(e) =>
                                  setScheduleEdits((prev) => ({
                                    ...prev,
                                    [ev.id]: { ...prev[ev.id], notes: e.target.value },
                                  }))
                                }
                              />
                            </td>
                            <td className="text-center p-2 space-x-2">
                              <button
                                className="bg-secondary hover:bg-secondary/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                                type="button"
                                disabled={!hasEdits}
                                onClick={() => {
                                  updateScheduleMutation.mutate({
                                    id: ev.id,
                                    data: { type, title, date, startTime, endTime, dueDate, notes, delivery },
                                  });
                                  setScheduleEdits((prev) => {
                                    const next = { ...prev };
                                    delete next[ev.id];
                                    return next;
                                  });
                                }}
                              >
                                Save
                              </button>
                              <button
                                className="bg-destructive hover:bg-destructive/80 px-2 py-1 rounded-none text-[10px] font-terminal"
                                type="button"
                                onClick={() => deleteScheduleMutation.mutate(ev.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="learning-objectives" className="border-secondary/40">
            <AccordionTrigger className="font-arcade text-xs text-primary px-3 hover:no-underline">
              LEARNING OBJECTIVES IMPORT
            </AccordionTrigger>
            <AccordionContent className="px-3">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <AlertDialog open={!!bulkDelete} onOpenChange={(open) => !open && setBulkDelete(null)}>
      <AlertDialogContent
        className="bg-black border-2 border-primary rounded-none font-terminal text-primary shadow-none max-w-md translate-y-0"
        style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
      >
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="font-arcade text-destructive">CONFIRM_DELETE</AlertDialogTitle>
            <AlertDialogDescription className="font-terminal text-muted-foreground">
              {bulkDelete?.label}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              className="rounded-none border-secondary font-terminal text-xs hover:bg-secondary/20"
              onClick={() => {
                bulkDeleteRef.current = null;
                setBulkDelete(null);
              }}
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-destructive text-destructive-foreground font-arcade text-xs hover:bg-destructive/80"
              type="button"
              onClick={() => {
                const payload = bulkDeleteRef.current;
                if (!payload) return;
                if (payload.type === "modules") {
                  deleteModulesMutation.mutate(payload.ids);
                } else {
                  deleteSchedulesMutation.mutate(payload.ids);
                }
                bulkDeleteRef.current = null;
                setBulkDelete(null);
              }}
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
