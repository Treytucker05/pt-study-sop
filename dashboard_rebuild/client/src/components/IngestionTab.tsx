import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Layers } from "lucide-react";
import type { Course, Module, LearningObjective } from "@shared/schema";

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
  const [wrapStatus, setWrapStatus] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [syllabusStatus, setSyllabusStatus] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [syllabusValidation, setSyllabusValidation] = useState<{
    isValid: boolean;
    errors: string[];
    preview?: {
      courseName: string;
      moduleCount: number;
      eventCount: number;
      startDate?: string;
      endDate?: string;
    };
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

  const validateSyllabusJson = (jsonStr: string) => {
    const errors: string[] = [];
    let parsed: any = null;

    // Try to parse JSON
    try {
      const extracted = extractJsonPayload(jsonStr);
      if (!extracted) {
        errors.push("No JSON found in input");
        setSyllabusValidation({ isValid: false, errors });
        return;
      }
      parsed = JSON.parse(extracted);
    } catch (err: any) {
      errors.push(`Invalid JSON: ${err.message}`);
      setSyllabusValidation({ isValid: false, errors });
      return;
    }

    // Validate required fields
    if (!parsed || typeof parsed !== "object") {
      errors.push("JSON must be an object");
    }

    // Check for required top-level fields
    const hasName = parsed.name && typeof parsed.name === "string" && parsed.name.trim();
    const hasTerm = parsed.term && typeof parsed.term === "object";
    const hasModules = Array.isArray(parsed.modules);
    const hasEvents = Array.isArray(parsed.events);

    if (!hasName) errors.push("Missing or invalid 'name' field");
    if (!hasTerm) errors.push("Missing or invalid 'term' object");
    if (!hasModules) errors.push("Missing or invalid 'modules' array");
    if (!hasEvents) errors.push("Missing or invalid 'events' array");

    // If we have term, validate its structure
    if (hasTerm) {
      if (!parsed.term.startDate) errors.push("term.startDate is required");
      if (!parsed.term.endDate) errors.push("term.endDate is required");
    }

    // If validation passed, build preview
    if (errors.length === 0) {
      const preview = {
        courseName: parsed.name,
        moduleCount: parsed.modules?.length || 0,
        eventCount: parsed.events?.length || 0,
        startDate: parsed.term?.startDate,
        endDate: parsed.term?.endDate,
      };
      setSyllabusValidation({ isValid: true, errors: [], preview });
    } else {
      setSyllabusValidation({ isValid: false, errors });
    }
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
      setWrapStatus({ type: "error", message: err.message || "Failed to ingest" });
    }
  };

  return (
    <div className="space-y-6 p-4">
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

      {/* WRAP SESSION INGESTION - First and prominent */}
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
          </CardContent>
        </Card>
      )}

      {
        selectedCourseId && (
          <Card className="bg-black/40 border-2 border-primary rounded-none">
            <CardHeader className="border-b border-primary/50 p-4">
              <CardTitle className="font-arcade text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" />
                MATERIAL INGESTION
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">

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
                          if (e.target.value.trim()) {
                            validateSyllabusJson(e.target.value);
                          } else {
                            setSyllabusValidation(null);
                          }
                        }}
                      />
                      {syllabusValidation && !syllabusValidation.isValid && (
                        <div className="mt-2 p-2 border border-red-500 bg-red-900/30 rounded-none font-terminal text-xs text-red-400">
                          <div className="font-bold mb-1">Validation Errors:</div>
                          {syllabusValidation.errors.map((error, idx) => (
                            <div key={idx}>• {error}</div>
                          ))}
                        </div>
                      )}
                      {syllabusValidation && syllabusValidation.isValid && syllabusValidation.preview && (
                        <div className="mt-2 p-3 border border-primary bg-primary/10 rounded-none font-terminal text-xs text-primary">
                          <div className="font-bold mb-2">✓ Valid JSON Preview:</div>
                          <div className="space-y-1">
                            <div><span className="text-muted-foreground">Course:</span> {syllabusValidation.preview.courseName}</div>
                            <div><span className="text-muted-foreground">Modules:</span> {syllabusValidation.preview.moduleCount}</div>
                            <div><span className="text-muted-foreground">Events:</span> {syllabusValidation.preview.eventCount}</div>
                            {syllabusValidation.preview.startDate && (
                              <div><span className="text-muted-foreground">Start:</span> {syllabusValidation.preview.startDate}</div>
                            )}
                            {syllabusValidation.preview.endDate && (
                              <div><span className="text-muted-foreground">End:</span> {syllabusValidation.preview.endDate}</div>
                            )}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => importSyllabusMutation.mutate(syllabusJson)}
                        disabled={!syllabusValidation?.isValid || importSyllabusMutation.isPending}
                        className="bg-secondary hover:bg-secondary/80 disabled:opacity-50 px-4 py-2 rounded-none mt-2 font-terminal text-xs"
                        type="button"
                      >
                        {importSyllabusMutation.isPending ? "Importing..." : "Import Syllabus"}
                      </button>
                      {syllabusStatus && (
                        <div className={`mt-2 p-2 border font-terminal text-xs ${syllabusStatus.type === "success"
                          ? "border-green-500 text-green-400"
                          : "border-red-500 text-red-400"
                          }`}>
                          {syllabusStatus.message}
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
                                <span className={`ml-2 text-[10px] px-1 rounded ${lo.status === "solid" ? "bg-green-600" :
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
            </CardContent>
          </Card>
        )
      }
    </div >
  );
}
