import { MaterialSelector } from "@/components/MaterialSelector";
import type { TutorPrimingSourceInventoryItem } from "@/api.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  AppLearningObjective,
  TutorContentSources,
  TutorObjectiveScope,
  TutorWorkflowSummary,
} from "@/lib/api";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import { formatWorkflowStatus, truncateWorkflowId } from "@/lib/workflowStatus";
import { CheckCircle2, Clock3, Play, RefreshCw, Save, Sparkles } from "lucide-react";

type StudyUnitOption = {
  value: string;
  objectiveCount: number;
  materialCount: number;
};

export type TutorPrimingReadinessItem = {
  label: string;
  ready: boolean;
  detail: string;
};

interface TutorWorkflowPrimingPanelProps {
  workflow: TutorWorkflowSummary | null;
  courses: TutorContentSources["courses"];
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
  topic: string;
  setTopic: (topic: string) => void;
  objectiveScope: TutorObjectiveScope;
  setObjectiveScope: (scope: TutorObjectiveScope) => void;
  selectedObjectiveId: string;
  setSelectedObjectiveId: (value: string) => void;
  selectedObjectiveGroup: string;
  setSelectedObjectiveGroup: (value: string) => void;
  availableObjectives: AppLearningObjective[];
  studyUnitOptions: StudyUnitOption[];
  primingMethod: string;
  setPrimingMethod: (value: string) => void;
  primingChainId: string;
  setPrimingChainId: (value: string) => void;
  summaryText: string;
  setSummaryText: (value: string) => void;
  conceptsText: string;
  setConceptsText: (value: string) => void;
  terminologyText: string;
  setTerminologyText: (value: string) => void;
  rootExplanationText: string;
  setRootExplanationText: (value: string) => void;
  gapsText: string;
  setGapsText: (value: string) => void;
  recommendedStrategyText: string;
  setRecommendedStrategyText: (value: string) => void;
  sourceInventory: TutorPrimingSourceInventoryItem[];
  vaultFolderPreview: string;
  readinessItems: TutorPrimingReadinessItem[];
  onBackToLaunch: () => void;
  onSaveDraft: () => void;
  onMarkReady: () => void;
  onStartTutor: () => void;
  onRunAssistForSelected: () => void;
  onRunAssistForMaterial: (materialId: number) => void;
  isSaving: boolean;
  isStartingTutor: boolean;
  isRunningAssist: boolean;
  assistTargetMaterialId: number | null;
}

const PRIMING_METHOD_OPTIONS = [
  { value: "summary_first", label: "Summary-first" },
  { value: "learning_objectives", label: "Learning objective extraction" },
  { value: "concept_mapping", label: "Concept mapping" },
  { value: "root_understanding", label: "Root-level understanding" },
  { value: "weak_point_surfacing", label: "Weak-point surfacing" },
  { value: "terminology_extraction", label: "Terminology extraction" },
];

const PRIMING_CHAIN_OPTIONS = [
  {
    value: "ingest_objectives_concepts_summary_gaps",
    label: "Ingest -> Objectives -> Concepts -> Summary -> Gaps",
  },
  {
    value: "ingest_root_dependencies_summary",
    label: "Ingest -> Root explanation -> Dependencies -> Summary",
  },
  {
    value: "ingest_terms_concepts_alignment",
    label: "Ingest -> Terminology -> Concepts -> Objective alignment",
  },
];

function formatWorkflowDate(value: string | null | undefined) {
  if (!value) return "Not saved yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not saved yet";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TutorWorkflowPrimingPanel({
  workflow,
  courses,
  courseId,
  setCourseId,
  selectedMaterials,
  setSelectedMaterials,
  topic,
  setTopic,
  objectiveScope,
  setObjectiveScope,
  selectedObjectiveId,
  setSelectedObjectiveId,
  selectedObjectiveGroup,
  setSelectedObjectiveGroup,
  availableObjectives,
  studyUnitOptions,
  primingMethod,
  setPrimingMethod,
  primingChainId,
  setPrimingChainId,
  summaryText,
  setSummaryText,
  conceptsText,
  setConceptsText,
  terminologyText,
  setTerminologyText,
  rootExplanationText,
  setRootExplanationText,
  gapsText,
  setGapsText,
  recommendedStrategyText,
  setRecommendedStrategyText,
  sourceInventory,
  vaultFolderPreview,
  readinessItems,
  onBackToLaunch,
  onSaveDraft,
  onMarkReady,
  onStartTutor,
  onRunAssistForSelected,
  onRunAssistForMaterial,
  isSaving,
  isStartingTutor,
  isRunningAssist,
  assistTargetMaterialId,
}: TutorWorkflowPrimingPanelProps) {
  const groupedObjectives = availableObjectives.reduce<Record<string, AppLearningObjective[]>>(
    (acc, objective) => {
      const key = String(objective.groupName || "").trim() || "Ungrouped";
      if (!acc[key]) acc[key] = [];
      acc[key].push(objective);
      return acc;
    },
    {},
  );

  const activeObjectives = selectedObjectiveGroup
    ? groupedObjectives[selectedObjectiveGroup] || []
    : [];
  const readyForTutor = readinessItems.every((item) => item.ready);
  const selectedSourceInventory = sourceInventory.filter((item) =>
    selectedMaterials.includes(item.id),
  );

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 xl:grid-cols-[0.92fr_1.08fr_0.95fr]">
      <div className="space-y-4">
        <Card className="rounded-none border-2 border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/15 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-arcade text-xs text-primary">
                  PRIMING WORKSTATION
                </CardTitle>
                <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                  Stage 2. Load class context, select materials, and build a Tutor-ready bundle.
                </p>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                {formatWorkflowStatus(workflow?.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-arcade text-[10px] text-primary/80">WORKFLOW</div>
                <div className="mt-2 font-terminal text-xs text-foreground break-all">
                  {truncateWorkflowId(workflow?.workflow_id)}
                </div>
              </div>
              <div className="border border-primary/20 bg-black/35 p-3">
                <div className="font-arcade text-[10px] text-primary/80">LAST UPDATED</div>
                <div className="mt-2 font-terminal text-sm text-foreground">
                  {formatWorkflowDate(workflow?.updated_at)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>CLASS</label>
              <select
                value={courseId ?? ""}
                onChange={(event) =>
                  setCourseId(event.target.value ? Number(event.target.value) : undefined)
                }
                className={SELECT_BASE}
              >
                <option value="">Select class</option>
                {courses
                  .filter((course) => typeof course.id === "number")
                  .map((course) => (
                    <option key={course.id} value={course.id ?? ""}>
                      {course.code ? `${course.code} - ` : ""}
                      {course.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>STUDY UNIT</label>
              <select
                value={selectedObjectiveGroup}
                onChange={(event) => {
                  setSelectedObjectiveGroup(event.target.value);
                  setSelectedObjectiveId("");
                }}
                className={SELECT_BASE}
              >
                <option value="">Select study unit</option>
                {studyUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                    {option.objectiveCount > 0
                      ? ` (${option.objectiveCount} objectives)`
                      : option.materialCount > 0
                        ? ` (${option.materialCount} materials)`
                        : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>OBJECTIVE SCOPE</label>
              <select
                value={objectiveScope}
                onChange={(event) =>
                  setObjectiveScope(
                    event.target.value === "single_focus" ? "single_focus" : "module_all",
                  )
                }
                className={SELECT_BASE}
              >
                <option value="module_all">Whole study unit first</option>
                <option value="single_focus">Single focus objective</option>
              </select>
            </div>

            {objectiveScope === "single_focus" ? (
              <div className="space-y-2">
                <label className={`${TEXT_MUTED} block text-xs`}>FOCUS OBJECTIVE</label>
                <select
                  value={selectedObjectiveId}
                  onChange={(event) => setSelectedObjectiveId(event.target.value)}
                  className={SELECT_BASE}
                >
                  <option value="">Select one objective</option>
                  {activeObjectives.map((objective) => (
                    <option
                      key={`${objective.id}-${objective.loCode}`}
                      value={String(objective.loCode || "")}
                    >
                      {objective.loCode ? `${objective.loCode} - ` : ""}
                      {objective.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>TOPIC</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Optional focus topic"
                className={INPUT_BASE}
              />
            </div>

            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[10px] text-primary/80">OBSIDIAN TARGET</div>
              <div className="mt-2 font-terminal text-xs text-foreground break-all">
                {vaultFolderPreview || "Select a class and study unit to derive the folder path."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-2 border-primary/20 bg-black/40 overflow-hidden">
          <CardHeader className="border-b border-primary/15 pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="font-arcade text-xs text-primary">SOURCE MATERIALS</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={onRunAssistForSelected}
                disabled={isRunningAssist || selectedMaterials.length === 0}
              >
                {isRunningAssist && assistTargetMaterialId == null ? (
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                Extract selected
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-[420px] w-full">
            <div className="space-y-4 p-4">
              <MaterialSelector
                courseId={courseId}
                selectedMaterials={selectedMaterials}
                setSelectedMaterials={setSelectedMaterials}
              />
              {selectedSourceInventory.length > 0 ? (
                <div className="space-y-3">
                  <div className="font-arcade text-[10px] text-primary/80">
                    SOURCE-LINKED PRIMING OUTPUTS
                  </div>
                  {selectedSourceInventory.map((item) => {
                    const output = item.priming_output;
                    const concepts = output?.concepts || [];
                    const gaps = output?.gaps || [];
                    const objectives = output?.learning_objectives || [];
                    return (
                      <div
                        key={item.id}
                        className="space-y-2 border border-primary/15 bg-black/35 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-terminal text-sm text-foreground break-words">
                              {item.title}
                            </div>
                            <div className="mt-1 font-terminal text-[11px] text-muted-foreground break-all">
                              {item.source_path || "No source path"}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-none"
                            onClick={() => onRunAssistForMaterial(item.id)}
                            disabled={isRunningAssist}
                          >
                            {isRunningAssist && assistTargetMaterialId === item.id ? (
                              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            )}
                            Rerun source
                          </Button>
                        </div>
                        {output ? (
                          <div className="space-y-2 text-xs text-foreground">
                            <div>
                              <span className="font-arcade text-[10px] text-primary/80">
                                SUMMARY
                              </span>
                              <div className="mt-1 whitespace-pre-wrap text-xs">
                                {output.summary || "No summary extracted yet."}
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <div className="font-arcade text-[10px] text-primary/80">
                                  CONCEPTS
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-xs">
                                  {concepts.length > 0 ? concepts.join("\n") : "No concepts yet."}
                                </div>
                              </div>
                              <div>
                                <div className="font-arcade text-[10px] text-primary/80">
                                  OBJECTIVES
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-xs">
                                  {objectives.length > 0
                                    ? objectives
                                        .map((objective) => objective.title || "Untitled objective")
                                        .join("\n")
                                    : "No objectives yet."}
                                </div>
                              </div>
                              <div>
                                <div className="font-arcade text-[10px] text-primary/80">GAPS</div>
                                <div className="mt-1 whitespace-pre-wrap text-xs">
                                  {gaps.length > 0 ? gaps.join("\n") : "No gaps yet."}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="font-terminal text-xs text-muted-foreground">
                            No source-linked extraction yet. Run Priming Assist on this source.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-none border-2 border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/15 pb-3">
            <CardTitle className="font-arcade text-xs text-primary">PRIMING CONFIG</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>PRIMING METHOD</label>
              <select
                value={primingMethod}
                onChange={(event) => setPrimingMethod(event.target.value)}
                className={SELECT_BASE}
              >
                {PRIMING_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>PRIMING CHAIN</label>
              <select
                value={primingChainId}
                onChange={(event) => setPrimingChainId(event.target.value)}
                className={SELECT_BASE}
              >
                {PRIMING_CHAIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={`${TEXT_MUTED} block text-xs`}>SUMMARY</label>
              <textarea
                value={summaryText}
                onChange={(event) => setSummaryText(event.target.value)}
                placeholder="Write or paste the priming summary that Tutor should teach from."
                className={`${INPUT_BASE} min-h-[120px] resize-y`}
              />
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>KEY CONCEPTS (ONE PER LINE)</label>
              <textarea
                value={conceptsText}
                onChange={(event) => setConceptsText(event.target.value)}
                placeholder={"Concept one\nConcept two\nConcept three"}
                className={`${INPUT_BASE} min-h-[140px] resize-y`}
              />
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>TERMINOLOGY (ONE PER LINE)</label>
              <textarea
                value={terminologyText}
                onChange={(event) => setTerminologyText(event.target.value)}
                placeholder={"Term one\nTerm two"}
                className={`${INPUT_BASE} min-h-[140px] resize-y`}
              />
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>ROOT EXPLANATION</label>
              <textarea
                value={rootExplanationText}
                onChange={(event) => setRootExplanationText(event.target.value)}
                placeholder="Explain the underlying model or first-principles logic here."
                className={`${INPUT_BASE} min-h-[140px] resize-y`}
              />
            </div>

            <div className="space-y-2">
              <label className={`${TEXT_MUTED} block text-xs`}>GAPS / AMBIGUITIES</label>
              <textarea
                value={gapsText}
                onChange={(event) => setGapsText(event.target.value)}
                placeholder="List open questions, weak evidence, or unresolved ambiguities."
                className={`${INPUT_BASE} min-h-[140px] resize-y`}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className={`${TEXT_MUTED} block text-xs`}>RECOMMENDED TUTOR STRATEGY</label>
              <textarea
                value={recommendedStrategyText}
                onChange={(event) => setRecommendedStrategyText(event.target.value)}
                placeholder="Optional guidance for Tutor Core: pacing, focus, scaffold depth, retrieval pressure."
                className={`${INPUT_BASE} min-h-[90px] resize-y`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-none border-2 border-primary/30 bg-black/45">
          <CardHeader className="border-b border-primary/15 pb-3">
            <CardTitle className="font-arcade text-xs text-primary">READINESS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 border border-primary/15 bg-black/35 p-3"
              >
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                )}
                <div className="min-w-0">
                  <div className="font-arcade text-[10px] text-primary/80">{item.label}</div>
                  <div className="mt-1 font-terminal text-sm text-foreground">{item.detail}</div>
                </div>
              </div>
            ))}

            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[10px] text-primary/80">TUTOR HANDOFF</div>
              <div className="mt-2 font-terminal text-sm text-foreground">
                {readyForTutor
                  ? "Priming bundle satisfies the minimum handoff contract."
                  : "Priming is still missing required handoff data."}
              </div>
            </div>

            <div className="grid gap-2">
              <Button
                variant="outline"
                className="rounded-none font-arcade text-xs"
                onClick={onBackToLaunch}
              >
                Back to Launch
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-xs"
                onClick={onSaveDraft}
                disabled={isSaving}
              >
                <Save className="mr-2 h-3.5 w-3.5" />
                {isSaving ? "SAVING..." : "SAVE DRAFT"}
              </Button>
              <Button
                variant="outline"
                className="rounded-none font-arcade text-xs"
                onClick={onMarkReady}
                disabled={isSaving}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                MARK READY
              </Button>
              <Button
                className="rounded-none font-arcade text-xs"
                onClick={onStartTutor}
                disabled={!readyForTutor || isStartingTutor}
              >
                <Play className="mr-2 h-3.5 w-3.5" />
                {isStartingTutor ? "STARTING TUTOR..." : "START TUTOR SESSION"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
