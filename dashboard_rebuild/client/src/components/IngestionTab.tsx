import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, CalendarDays, Layers, BookOpen } from "lucide-react";
import { SessionJsonIngest } from "@/components/SessionJsonIngest";
import type { Course, Module, LearningObjective } from "@shared/schema";

const SCHEDULE_PROMPT = `You are extracting a course schedule for ingestion.

Return ONLY a valid JSON object with NO additional text, NO markdown code blocks, NO explanation.

Structure:
{
  "name": "Course Name (e.g. Anatomy & Physiology II)",
  "term": {
    "startDate": "2026-01-05",
    "endDate": "2026-04-24",
    "timezone": "America/Chicago"
  },
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
1. Include ALL schedule items: class meetings, assignments, quizzes, exams, readings, virtual activities, and learning assessments (EA).
2. For repeating class meetings, set daysOfWeek + startTime/endTime, and include term start/end.
3. For one-off items, set date or dueDate.
4. Do NOT include a "modules" array — schedule only.
5. Return ONLY the JSON object, nothing else.

Here's my syllabus:

[PASTE YOUR SYLLABUS BELOW]`;

const MODULES_PROMPT = `You are extracting course module structure for ingestion.

Return ONLY a valid JSON object with NO additional text, NO markdown code blocks, NO explanation.

Structure:
{
  "modules": [
    {
      "name": "Module 1: Topic Name",
      "orderIndex": 1,
      "topics": ["Topic A", "Topic B"],
      "readings": ["Chapter 1", "Article X"],
      "assessments": ["Quiz 1", "Exam 1"]
    }
  ]
}

Rules:
1. Include ALL modules/units with their topics, readings, and assessments.
2. orderIndex should be sequential starting at 1.
3. Do NOT include dates or events — structure only.
4. Return ONLY the JSON object, nothing else.

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

type IngestionSubTab = "schedule" | "modules" | "objectives";

export function IngestionTab() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<IngestionSubTab>("schedule");

  const [scheduleJson, setScheduleJson] = useState("");
  const [modulesJson, setModulesJson] = useState("");
  const [loJson, setLoJson] = useState("");
  const [wrapContent, setWrapContent] = useState("");

  const [importError, setImportError] = useState<string | null>(null);
  const [wrapStatus, setWrapStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modulesStatus, setModulesStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [scheduleValidation, setScheduleValidation] = useState<{
    isValid: boolean;
    errors: string[];
    preview?: { courseName: string; eventCount: number; startDate?: string; endDate?: string };
  } | null>(null);

  const [modulesValidation, setModulesValidation] = useState<{
    isValid: boolean;
    errors: string[];
    preview?: { moduleCount: number };
  } | null>(null);

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

  const extractJsonPayload = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;
    const firstBracket = candidate.indexOf("[");
    const lastBracket = candidate.lastIndexOf("]");
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket &&
        (firstBrace === -1 || firstBracket < firstBrace)) {
      return candidate.slice(firstBracket, lastBracket + 1).trim();
    }
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return candidate.slice(firstBrace, lastBrace + 1).trim();
    }
    return candidate;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Schedule import ---
  const importScheduleMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const parsed = JSON.parse(extractJsonPayload(jsonStr));
      const payload = { ...parsed, modules: [] };
      return api.syllabus.importBulk(selectedCourseId, payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setScheduleJson("");
      setScheduleValidation(null);
      setScheduleStatus({
        type: "success",
        message: `Imported: ${result.eventsCreated} events (${result.classMeetingsExpanded} class meetings expanded)`,
      });
      setImportError(null);
    },
    onError: (err: any) => {
      setScheduleStatus({ type: "error", message: err.message || "Failed to import schedule" });
    },
  });

  // --- Modules import ---
  const importModulesMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const parsed = JSON.parse(extractJsonPayload(jsonStr));
      const modulesArr = parsed.modules || parsed;
      return api.modules.createBulk(selectedCourseId, modulesArr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setModulesJson("");
      setModulesValidation(null);
      setModulesStatus({ type: "success", message: "Modules imported successfully" });
      setImportError(null);
    },
    onError: (err: any) => {
      setModulesStatus({ type: "error", message: err.message || "Failed to import modules" });
    },
  });

  // --- LO import ---
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

  // --- Validation ---
  const validateScheduleJson = (jsonStr: string) => {
    const errors: string[] = [];
    try {
      const extracted = extractJsonPayload(jsonStr);
      if (!extracted) { setScheduleValidation({ isValid: false, errors: ["No JSON found"] }); return; }
      const parsed = JSON.parse(extracted);
      if (!parsed || typeof parsed !== "object") errors.push("JSON must be an object");
      if (!parsed.name || typeof parsed.name !== "string") errors.push("Missing 'name' field");
      if (!parsed.term || typeof parsed.term !== "object") errors.push("Missing 'term' object");
      else {
        if (!parsed.term.startDate) errors.push("term.startDate is required");
        if (!parsed.term.endDate) errors.push("term.endDate is required");
      }
      if (!Array.isArray(parsed.events)) errors.push("Missing 'events' array");
      if (errors.length === 0) {
        setScheduleValidation({
          isValid: true, errors: [],
          preview: {
            courseName: parsed.name,
            eventCount: parsed.events.length,
            startDate: parsed.term?.startDate,
            endDate: parsed.term?.endDate,
          },
        });
      } else {
        setScheduleValidation({ isValid: false, errors });
      }
    } catch (err: any) {
      setScheduleValidation({ isValid: false, errors: [`Invalid JSON: ${err.message}`] });
    }
  };

  const validateModulesJson = (jsonStr: string) => {
    const errors: string[] = [];
    try {
      const extracted = extractJsonPayload(jsonStr);
      if (!extracted) { setModulesValidation({ isValid: false, errors: ["No JSON found"] }); return; }
      const parsed = JSON.parse(extracted);
      const modulesArr = parsed.modules || (Array.isArray(parsed) ? parsed : null);
      if (!Array.isArray(modulesArr)) errors.push("Missing 'modules' array");
      else if (modulesArr.length === 0) errors.push("modules array is empty");
      if (errors.length === 0) {
        setModulesValidation({ isValid: true, errors: [], preview: { moduleCount: modulesArr.length } });
      } else {
        setModulesValidation({ isValid: false, errors });
      }
    } catch (err: any) {
      setModulesValidation({ isValid: false, errors: [`Invalid JSON: ${err.message}`] });
    }
  };

  const handleWrapSubmit = async () => {
    try {
      setWrapStatus(null);
      const result = await api.brain.chat(wrapContent, false, "wrap");
      if (result.sessionSaved) {
        setWrapStatus({ type: "success", message: `Session saved! ID: ${result.sessionId}, Cards: ${result.cardsCreated || 0}` });
        setWrapContent("");
      } else {
        setWrapStatus({ type: "error", message: result.sessionError || "Failed to process WRAP content" });
      }
    } catch (err: any) {
      setWrapStatus({ type: "error", message: err.message || "Failed to ingest" });
    }
  };

  const SUB_TABS: { key: IngestionSubTab; label: string; icon: React.ReactNode }[] = [
    { key: "schedule", label: "SCHEDULE", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: "modules", label: "MODULES", icon: <Layers className="w-3.5 h-3.5" /> },
    { key: "objectives", label: "OBJECTIVES", icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* Session JSON Ingest (v9.4) */}
      <SessionJsonIngest />

      {/* Global Course Selector */}
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

      {!selectedCourseId && (
        <p className="text-center text-muted-foreground font-terminal text-sm py-8">Select a course above to begin ingestion.</p>
      )}

      {/* WRAP SESSION INGESTION */}
      {selectedCourseId && (
        <Card className="bg-black/40 border-2 border-primary rounded-none mb-6">
          <CardHeader className="border-b border-primary/50 p-4">
            <CardTitle className="font-arcade text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              WRAP SESSION INGESTION
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {wrapStatus && (
              <div className={`mb-4 p-3 rounded-none font-terminal text-sm ${wrapStatus.type === "success"
                ? "bg-success/20 border border-success text-success"
                : "bg-destructive/20 border border-destructive text-destructive"
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
                <label className="block text-sm mb-2 font-terminal text-muted-foreground">Paste WRAP Content</label>
                <textarea
                  className="w-full bg-black border border-secondary rounded-none p-2 h-48 font-terminal text-sm"
                  placeholder="Paste your WRAP session here..."
                  value={wrapContent}
                  onChange={(e) => { setWrapContent(e.target.value); setWrapStatus(null); }}
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
          </CardContent>
        </Card>
      )}

      {selectedCourseId && importError && (
        <div className="bg-destructive/20 border border-destructive rounded-none p-3 text-destructive font-terminal">
          {importError}
        </div>
      )}

      {/* Sub-tab navigation */}
      {selectedCourseId && (
        <div className="space-y-4">
          <div className="flex border-b border-primary/50">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 font-arcade text-xs border-b-2 transition-colors ${
                  activeSubTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-primary/70"
                }`}
                type="button"
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* SCHEDULE TAB */}
          {activeSubTab === "schedule" && (
            <Card className="bg-black/40 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/50 p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  SCHEDULE IMPORT
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <button
                  onClick={() => copyToClipboard(SCHEDULE_PROMPT)}
                  className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal"
                  type="button"
                >
                  Copy Prompt for ChatGPT
                </button>
                <p className="text-xs text-muted-foreground font-terminal">
                  Paste the ChatGPT response (schedule JSON) below:
                </p>
                <textarea
                  className="w-full bg-black border border-secondary rounded-none p-2 h-40 font-terminal text-sm"
                  placeholder='{"name":"...","term":{...},"events":[...]}'
                  value={scheduleJson}
                  onChange={(e) => {
                    setScheduleJson(e.target.value);
                    setScheduleStatus(null);
                    if (e.target.value.trim()) validateScheduleJson(e.target.value);
                    else setScheduleValidation(null);
                  }}
                />
                {scheduleValidation && !scheduleValidation.isValid && (
                  <div className="p-2 border border-destructive bg-destructive/20 rounded-none font-terminal text-xs text-destructive">
                    <div className="font-bold mb-1">Validation Errors:</div>
                    {scheduleValidation.errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                )}
                {scheduleValidation?.isValid && scheduleValidation.preview && (
                  <div className="p-3 border border-primary bg-primary/10 rounded-none font-terminal text-xs text-primary">
                    <div className="font-bold mb-2">Valid JSON Preview:</div>
                    <div className="space-y-1">
                      <div><span className="text-muted-foreground">Course:</span> {scheduleValidation.preview.courseName}</div>
                      <div><span className="text-muted-foreground">Events:</span> {scheduleValidation.preview.eventCount}</div>
                      {scheduleValidation.preview.startDate && (
                        <div><span className="text-muted-foreground">Start:</span> {scheduleValidation.preview.startDate}</div>
                      )}
                      {scheduleValidation.preview.endDate && (
                        <div><span className="text-muted-foreground">End:</span> {scheduleValidation.preview.endDate}</div>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => importScheduleMutation.mutate(scheduleJson)}
                  disabled={!scheduleValidation?.isValid || importScheduleMutation.isPending}
                  className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none font-terminal text-xs"
                  type="button"
                >
                  {importScheduleMutation.isPending ? "Importing..." : "Import Schedule"}
                </button>
                {scheduleStatus && (
                  <div className={`p-2 border font-terminal text-xs ${scheduleStatus.type === "success"
                    ? "border-success text-success" : "border-destructive text-destructive"
                  }`}>
                    {scheduleStatus.message}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* MODULES TAB */}
          {activeSubTab === "modules" && (
            <Card className="bg-black/40 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/50 p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  MODULES IMPORT
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <button
                  onClick={() => copyToClipboard(MODULES_PROMPT)}
                  className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal"
                  type="button"
                >
                  Copy Prompt for ChatGPT
                </button>
                <p className="text-xs text-muted-foreground font-terminal">
                  Paste the ChatGPT response (modules JSON) below:
                </p>
                <textarea
                  className="w-full bg-black border border-secondary rounded-none p-2 h-40 font-terminal text-sm"
                  placeholder='{"modules":[{"name":"Module 1: ...","orderIndex":1,"topics":[...],"readings":[...],"assessments":[...]}]}'
                  value={modulesJson}
                  onChange={(e) => {
                    setModulesJson(e.target.value);
                    setModulesStatus(null);
                    if (e.target.value.trim()) validateModulesJson(e.target.value);
                    else setModulesValidation(null);
                  }}
                />
                {modulesValidation && !modulesValidation.isValid && (
                  <div className="p-2 border border-destructive bg-destructive/20 rounded-none font-terminal text-xs text-destructive">
                    <div className="font-bold mb-1">Validation Errors:</div>
                    {modulesValidation.errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                )}
                {modulesValidation?.isValid && modulesValidation.preview && (
                  <div className="p-3 border border-primary bg-primary/10 rounded-none font-terminal text-xs text-primary">
                    <div className="font-bold mb-2">Valid JSON Preview:</div>
                    <div><span className="text-muted-foreground">Modules:</span> {modulesValidation.preview.moduleCount}</div>
                  </div>
                )}
                <button
                  onClick={() => importModulesMutation.mutate(modulesJson)}
                  disabled={!modulesValidation?.isValid || importModulesMutation.isPending}
                  className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none font-terminal text-xs"
                  type="button"
                >
                  {importModulesMutation.isPending ? "Importing..." : "Import Modules"}
                </button>
                {modulesStatus && (
                  <div className={`p-2 border font-terminal text-xs ${modulesStatus.type === "success"
                    ? "border-success text-success" : "border-destructive text-destructive"
                  }`}>
                    {modulesStatus.message}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* OBJECTIVES TAB */}
          {activeSubTab === "objectives" && (
            <Card className="bg-black/40 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/50 p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  LEARNING OBJECTIVES IMPORT
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
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
                  className="bg-primary hover:bg-primary/80 px-3 py-1 rounded-none text-xs font-terminal"
                  type="button"
                >
                  Copy Prompt for ChatGPT
                </button>
                <p className="text-xs text-muted-foreground font-terminal">
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
                  className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none font-terminal text-xs"
                  type="button"
                >
                  {importLosMutation.isPending ? "Importing..." : "Import LOs"}
                </button>

                {learningObjectives.length > 0 && (
                  <div>
                    <h4 className="font-terminal text-xs mb-2">Current LOs ({learningObjectives.length})</h4>
                    <div className="max-h-48 overflow-y-auto">
                      {learningObjectives.map((lo: LearningObjective) => (
                        <div key={lo.id} className="text-xs py-1 border-b border-secondary/30 font-terminal">
                          <span className="text-primary">{lo.loCode}</span>: {lo.title}
                          <span className={`ml-2 text-[10px] px-1 rounded-none ${lo.status === "solid" ? "bg-success" :
                            lo.status === "in_progress" ? "bg-warning" :
                              lo.status === "need_review" ? "bg-urgent" :
                                "bg-secondary"
                          }`}>
                            {lo.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
