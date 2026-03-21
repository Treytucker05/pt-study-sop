import { useState } from "react";
import { ConceptMapStructured } from "@/components/brain/ConceptMapStructured";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { MaterialSelector } from "@/components/MaterialSelector";
import type { TutorPrimingSourceInventoryItem } from "@/api.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrimingLayout } from "@/components/priming/PrimingLayout";
import { PrimingMaterialReader } from "@/components/priming/PrimingMaterialReader";
import type {
  AppLearningObjective,
  TutorContentSources,
  TutorObjectiveScope,
  TutorWorkflowSummary,
} from "@/lib/api";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import {
  extractMermaidBlock,
  formatPrimeArtifactMarkdown,
  formatPrimeArtifactPreviewText,
  parseLinesToRecords,
  type PrimeArtifactFormatKey,
} from "@/lib/tutorUtils";
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

const PRIME_ARTIFACTS: Array<{
  key: PrimeArtifactFormatKey;
  label: string;
  empty: string;
  editable: boolean;
}> = [
  {
    key: "objectives",
    label: "Learning Objectives",
    empty: "Run PRIME to extract learning objectives from the selected materials.",
    editable: false,
  },
  { key: "spine", label: "Study Spine", empty: "Run PRIME extraction to build the study spine.", editable: true },
  { key: "map", label: "Hierarchical Map", empty: "Run PRIME extraction to build the hierarchy.", editable: true },
  { key: "summary", label: "Summary", empty: "Run PRIME extraction to generate the summary.", editable: true },
  { key: "terms", label: "Terms", empty: "Run PRIME extraction to capture the key terms.", editable: true },
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

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

function previewForArtifact(item: TutorPrimingSourceInventoryItem, artifact: PrimeArtifactFormatKey): string {
  const output = item.priming_output;
  if (!output) return "";
  if (artifact === "objectives") {
    return output.learning_objectives
      .map((objective) => (objective.lo_code ? `${objective.lo_code} - ${objective.title}` : objective.title))
      .join("\n");
  }
  if (artifact === "spine") return output.concepts.join("\n");
  if (artifact === "map") return output.root_explanation || "";
  if (artifact === "summary") return output.summary || "";
  return output.terminology.join("\n");
}

function renderPreview(value: string, fallback: string) {
  return value.trim().length > 0 ? value : fallback;
}

function buildFallbackMapMermaid(title: string, studySpineText: string): string | null {
  const nodes = parseLinesToRecords(studySpineText, "concept")
    .map((record) => record.concept)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, 8);
  if (nodes.length === 0) return null;

  const sanitize = (value: string, maxLength = 52) => {
    const compact = value.replace(/["[\]{}]/g, "").replace(/\s+/g, " ").trim();
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, maxLength - 1).trim()}…`;
  };

  const lines = [`graph TD`, `  ROOT["${sanitize(title, 28) || "Study Map"}"]`];
  nodes.forEach((node, index) => {
    lines.push(`  N${index}["${sanitize(node)}"]`);
    lines.push(index === 0 ? `  ROOT --> N${index}` : `  N${index - 1} --> N${index}`);
  });
  return lines.join("\n");
}

function PrimeArtifactContent({
  artifact,
  value,
  fallback,
  fallbackMermaid,
}: {
  artifact: PrimeArtifactFormatKey;
  value: string;
  fallback: string;
  fallbackMermaid?: string | null;
}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return <div className="font-terminal text-sm text-muted-foreground">{fallback}</div>;
  }

  const markdown = formatPrimeArtifactMarkdown(artifact, trimmed);
  const extractedMermaid = artifact === "map" ? extractMermaidBlock(markdown) : null;
  const mermaid = extractedMermaid || (artifact === "map" ? fallbackMermaid || null : null);

  if (mermaid) {
    return (
      <div className="space-y-3">
        <div className="h-[360px] overflow-hidden border border-primary/20 bg-black/50">
          <ConceptMapStructured key={mermaid} initialMermaid={mermaid} hideToolbar className="h-full" />
        </div>
        <div className="flex items-center justify-between gap-3 border border-primary/15 bg-black/35 p-4">
          <div>
            <div className="font-arcade text-[10px] text-primary/80">MERMAID MAP READY</div>
            <div className="mt-1 font-terminal text-sm text-muted-foreground">
              {extractedMermaid
                ? "The extracted hierarchy is rendered above as a structured map instead of a text blob."
                : "The extractor returned prose for the map, so the visual above is derived from the Study Spine as a fallback."}
            </div>
          </div>
          <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
            VISUAL MAP
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-primary/15 bg-black/35 p-4">
      <ObsidianRenderer content={markdown} />
    </div>
  );
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
  const [activeArtifact, setActiveArtifact] = useState<PrimeArtifactFormatKey>("objectives");
  const [editingArtifact, setEditingArtifact] = useState<PrimeArtifactFormatKey | null>(null);
  const [editingHandoff, setEditingHandoff] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const groupedObjectives = availableObjectives.reduce<Record<string, AppLearningObjective[]>>(
    (acc, objective) => {
      const key = String(objective.groupName || "").trim() || "Ungrouped";
      if (!acc[key]) acc[key] = [];
      acc[key].push(objective);
      return acc;
    },
    {},
  );

  const activeObjectives = selectedObjectiveGroup ? groupedObjectives[selectedObjectiveGroup] || [] : [];
  const displayedObjectives =
    objectiveScope === "single_focus"
      ? activeObjectives.filter((objective) => String(objective.loCode || "") === selectedObjectiveId)
      : activeObjectives;
  const objectiveLines = displayedObjectives.map((objective) =>
    objective.loCode ? `${objective.loCode} - ${objective.title}` : objective.title,
  );
  const selectedSourceInventory = sourceInventory.filter((item) => selectedMaterials.includes(item.id));
  const extractedObjectiveLines = dedupeLines(
    selectedSourceInventory.flatMap((item) =>
      (item.priming_output?.learning_objectives || []).map((objective) =>
        objective.lo_code ? `${objective.lo_code} - ${objective.title}` : objective.title,
      ),
    ),
  );
  const extractedSourceCount = selectedSourceInventory.filter((item) => item.priming_output).length;
  const readyForTutor = readinessItems.every((item) => item.ready);

  const artifactValues = {
    spine: conceptsText,
    map: rootExplanationText,
    summary: summaryText,
    terms: terminologyText,
  } as const;

  const setArtifactValue = (artifact: Exclude<PrimeArtifactFormatKey, "objectives">, value: string) => {
    if (artifact === "spine") setConceptsText(value);
    else if (artifact === "map") setRootExplanationText(value);
    else if (artifact === "summary") setSummaryText(value);
    else setTerminologyText(value);
  };

  const activeConfig = PRIME_ARTIFACTS.find((artifact) => artifact.key === activeArtifact) || PRIME_ARTIFACTS[0];
  const activeValue = activeArtifact === "objectives" ? "" : artifactValues[activeArtifact];
  const sourcePreviews = selectedSourceInventory
    .map((item) => ({
      item,
      preview: previewForArtifact(item, activeArtifact),
    }))
    .filter(({ preview }) => preview.trim().length > 0);
  const activeGenerated =
    activeArtifact === "objectives"
      ? objectiveLines.length > 0 || extractedObjectiveLines.length > 0
      : activeValue.trim().length > 0 || sourcePreviews.length > 0;
  const generatedArtifactCount = PRIME_ARTIFACTS.filter((artifact) => {
    if (artifact.key === "objectives") {
      return objectiveLines.length > 0 || extractedObjectiveLines.length > 0;
    }
    return artifactValues[artifact.key].trim().length > 0;
  }).length;
  const selectedChainLabel =
    PRIMING_CHAIN_OPTIONS.find((option) => option.value === primingChainId)?.label ||
    "Choose a priming chain";
  const selectedMethodLabel =
    PRIMING_METHOD_OPTIONS.find((option) => option.value === primingMethod)?.label || "Choose a priming method";
  const selectedChainSteps = selectedChainLabel
    .split("->")
    .map((step) => step.trim())
    .filter(Boolean);

  return (
    <PrimingLayout
      leftRail={
        <div className="space-y-4 p-4">
          <Card className="rounded-none border-2 border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/15 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-arcade text-xs text-primary">SETUP</CardTitle>
                  <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                    Pick a class, then load the material.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                  {formatWorkflowStatus(workflow?.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className={`${TEXT_MUTED} block text-xs`}>CLASS</label>
                <select
                  value={courseId ?? ""}
                  onChange={(event) => {
                    setCourseId(event.target.value ? Number(event.target.value) : undefined);
                    setSelectedMaterials([]);
                    setSelectedObjectiveGroup("");
                    setSelectedObjectiveId("");
                  }}
                  className={SELECT_BASE}
                >
                  <option value="">Select class</option>
                  {courses.filter((course) => typeof course.id === "number").map((course) => (
                    <option key={course.id} value={course.id ?? ""}>
                      {course.code ? `${course.code} - ` : ""}
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 border-primary/20 bg-black/40">
            <CardHeader className="border-b border-primary/15 pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-arcade text-xs text-primary">MATERIALS IN SCOPE</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                    {selectedMaterials.length} selected
                  </Badge>
                  <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                    {extractedSourceCount} extracted
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <p className={`${TEXT_MUTED} text-xs`}>
                Pick or upload the exact materials for this run here. Library stays the browse-everything
                surface.
              </p>
              <MaterialSelector
                courseId={courseId}
                selectedMaterials={selectedMaterials}
                setSelectedMaterials={setSelectedMaterials}
              />
            </CardContent>
          </Card>
        </div>
      }
      centerPanel={
        <div className="flex h-[60vh] min-h-[24rem] max-h-[52rem] flex-col lg:h-[70vh]">
          <div className="border-b border-primary/20 bg-black/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-arcade text-xs text-primary">SOURCE VIEWER</div>
                <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                  Review the exact PDFs, docs, and notes the LLM is using for Studio PRIME.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                  {selectedMaterials.length > 0
                    ? `${selectedMaterials.length} materials in viewer`
                    : "No materials selected"}
                </Badge>
                <Button
                  type="button"
                  className="rounded-none font-arcade text-xs"
                  onClick={onRunAssistForSelected}
                  disabled={isRunningAssist || selectedMaterials.length === 0}
                >
                  {isRunningAssist && assistTargetMaterialId == null ? (
                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  {selectedMaterials.length === 0 ? "SELECT MATERIALS TO EXTRACT" : "EXTRACT PRIME"}
                </Button>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <PrimingMaterialReader
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              onExtractMaterial={onRunAssistForMaterial}
            />
          </div>
        </div>
      }
      rightPanel={
        <div className="space-y-4 p-4">
          <Card className="rounded-none border-2 border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/15 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-arcade text-xs text-primary">
                    PRIME ARTIFACT WORKSPACE
                  </CardTitle>
                  <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                    Generated first. Manual edits are only a fallback when the extracted output needs a
                    small correction.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                  {generatedArtifactCount}/{PRIME_ARTIFACTS.length} ready
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {PRIME_ARTIFACTS.map((artifact) => {
                  const hasContent =
                    artifact.key === "objectives"
                      ? objectiveLines.length > 0 || extractedObjectiveLines.length > 0
                      : artifactValues[artifact.key].trim().length > 0;
                  return (
                    <button
                      key={artifact.key}
                      type="button"
                      onClick={() => {
                        setActiveArtifact(artifact.key);
                        if (editingArtifact && editingArtifact !== artifact.key) {
                          setEditingArtifact(null);
                        }
                      }}
                      className={`border p-3 text-left transition-colors ${
                        activeArtifact === artifact.key
                          ? "border-primary/50 bg-primary/10"
                          : "border-primary/15 bg-black/35 hover:border-primary/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-arcade text-[10px] text-primary/80">{artifact.label}</div>
                        <Badge
                          variant="outline"
                          className="rounded-none border-primary/20 text-[10px] text-primary/70"
                        >
                          {hasContent ? (artifact.key === "objectives" ? "READY" : "GENERATED") : "PENDING"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3 border border-primary/20 bg-black/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-arcade text-xs text-primary">{activeConfig.label}</div>
                    <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                      {activeArtifact === "objectives"
                        ? "Resolved from the selected scope and checked against source-linked extraction."
                        : "Generated from the selected materials and reviewed before Tutor handoff."}
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                    {activeGenerated ? "GENERATED" : "PENDING"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
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
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    REGENERATE FROM SOURCES
                  </Button>
                  {activeConfig.editable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-none"
                      onClick={() =>
                        setEditingArtifact((current) => (current === activeArtifact ? null : activeArtifact))
                      }
                    >
                      {editingArtifact === activeArtifact ? "HIDE MANUAL EDIT" : "ADJUST MANUALLY"}
                    </Button>
                  ) : null}
                </div>

                {activeArtifact === "objectives" ? (
                  <div className="grid gap-3">
                    <div className="border border-primary/15 bg-black/40 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">
                        MANUAL SCOPE (OPTIONAL)
                      </div>
                      <div className="mt-2 space-y-2">
                        {objectiveLines.length > 0 ? (
                          objectiveLines.map((line) => (
                            <div key={line} className="font-terminal text-sm text-foreground/90">
                              {line}
                            </div>
                          ))
                        ) : (
                          <div className="font-terminal text-sm text-muted-foreground">
                            No manual study unit or focus objective selected.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border border-primary/15 bg-black/40 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">
                        EXTRACTED OBJECTIVE CANDIDATES
                      </div>
                      <div className="mt-2 space-y-2">
                        {extractedObjectiveLines.length > 0 ? (
                          extractedObjectiveLines.map((line) => (
                            <div key={line} className="font-terminal text-sm text-foreground/90">
                              {line}
                            </div>
                          ))
                        ) : (
                          <div className="font-terminal text-sm text-muted-foreground">
                            {activeConfig.empty}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : editingArtifact === activeArtifact ? (
                  <div className="space-y-2">
                    <textarea
                      value={activeValue}
                      onChange={(event) => setArtifactValue(activeArtifact, event.target.value)}
                      className={`${INPUT_BASE} min-h-[220px] resize-y`}
                    />
                    <p className={`${TEXT_MUTED} text-xs`}>
                      Manual edits are a fallback. Regenerate from the selected materials whenever you
                      want to refresh the extracted version.
                    </p>
                  </div>
                ) : (
                  <PrimeArtifactContent
                    artifact={activeArtifact}
                    value={activeValue}
                    fallback={activeConfig.empty}
                    fallbackMermaid={
                      activeArtifact === "map"
                        ? buildFallbackMapMermaid(
                            workflow?.topic || workflow?.assignment_title || workflow?.course_name || "Study Map",
                            artifactValues.spine,
                          )
                        : null
                    }
                  />
                )}

                <div className="space-y-3 border-t border-primary/15 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-arcade text-[10px] text-primary/80">
                      SOURCE-LINKED EXTRACTION
                    </div>
                    <Badge variant="outline" className="rounded-none border-primary/20 text-primary/70">
                      {sourcePreviews.length}/{selectedSourceInventory.length} sources
                    </Badge>
                  </div>
                  {selectedSourceInventory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSourceInventory.map((item) => {
                        const preview = previewForArtifact(item, activeArtifact);
                        return (
                          <div
                            key={item.id}
                            className="space-y-2 border border-primary/15 bg-black/40 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="break-words font-terminal text-sm text-foreground">
                                  {item.title}
                                </div>
                                <div className="mt-1 break-all font-terminal text-[11px] text-muted-foreground">
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
                                RERUN SOURCE
                              </Button>
                            </div>
                            <div className="border border-primary/10 bg-black/25 p-3">
                              <div className="font-terminal whitespace-pre-wrap text-xs text-foreground/90">
                                {preview.trim().length > 0
                                  ? formatPrimeArtifactPreviewText(activeArtifact, preview)
                                  : `No ${activeConfig.label.toLowerCase()} extracted for this source yet.`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="font-terminal text-sm text-muted-foreground">
                      Select one or more materials in the setup rail to see source-linked extraction here.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 border-primary/30 bg-black/45">
            <CardHeader className="border-b border-primary/15 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-arcade text-xs text-primary">TUTOR HANDOFF</CardTitle>
                  <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                    Review readiness, add any final notes, then hand the PRIME bundle into Tutor.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                  {readyForTutor ? "READY" : "INCOMPLETE"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                <div className="font-arcade text-[10px] text-primary/80">READINESS</div>
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
              </div>

              <div className="border-t border-primary/15 pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-arcade text-[10px] text-primary/80">HANDOFF NOTES</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={() => setEditingHandoff((current) => !current)}
                  >
                    {editingHandoff ? "HIDE MANUAL EDIT" : "ADJUST HANDOFF"}
                  </Button>
                </div>

                {editingHandoff ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className={`${TEXT_MUTED} block text-xs`}>OPEN QUESTIONS / AMBIGUITIES</label>
                      <textarea
                        value={gapsText}
                        onChange={(event) => setGapsText(event.target.value)}
                        placeholder="List open questions, weak evidence, or unresolved ambiguities."
                        className={`${INPUT_BASE} min-h-[120px] resize-y`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`${TEXT_MUTED} block text-xs`}>RECOMMENDED TUTOR STRATEGY</label>
                      <textarea
                        value={recommendedStrategyText}
                        onChange={(event) => setRecommendedStrategyText(event.target.value)}
                        placeholder="Optional guidance for Tutor Core: pacing, focus, scaffold depth, retrieval pressure."
                        className={`${INPUT_BASE} min-h-[120px] resize-y`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="border border-primary/15 bg-black/40 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">OPEN QUESTIONS / AMBIGUITIES</div>
                      <div className="mt-2 font-terminal whitespace-pre-wrap text-sm text-foreground/90">
                        {renderPreview(gapsText, "No open questions or ambiguities captured yet.")}
                      </div>
                    </div>
                    <div className="border border-primary/15 bg-black/40 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">RECOMMENDED TUTOR STRATEGY</div>
                      <div className="mt-2 font-terminal whitespace-pre-wrap text-sm text-foreground/90">
                        {renderPreview(recommendedStrategyText, "No Tutor strategy note captured yet.")}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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

          <Card className="rounded-none border-2 border-primary/20 bg-black/40">
            <CardHeader className="border-b border-primary/15 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-arcade text-xs text-primary">ADVANCED PRIME CONTROLS</CardTitle>
                  <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                    Chain selection and workflow metadata stay here when you need them, without crowding the
                    main study flow.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none"
                  onClick={() => setShowAdvanced((current) => !current)}
                >
                  {showAdvanced ? "HIDE ADVANCED" : "SHOW ADVANCED"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">PRIMING METHOD</div>
                  <div className="mt-2 font-terminal text-sm text-foreground">{selectedMethodLabel}</div>
                </div>
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">PRIMING CHAIN</div>
                  <div className="mt-2 font-terminal text-sm text-foreground">{selectedChainLabel}</div>
                </div>
              </div>

              {showAdvanced ? (
                <div className="space-y-5 border-t border-primary/15 pt-4">
                  <div className="space-y-4">
                    <div className="font-arcade text-[10px] text-primary/80">PRIME CHAIN</div>

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

                    <div className="space-y-2 border border-primary/20 bg-black/35 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">CHAIN PREVIEW</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedChainSteps.map((step) => (
                          <Badge
                            key={step}
                            variant="outline"
                            className="rounded-none border-primary/25 text-primary/80"
                          >
                            {step}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-primary/15 pt-4">
                    <div className="font-arcade text-[10px] text-primary/80">WORKFLOW CONTEXT</div>

                    <div className="space-y-2">
                      <label className={`${TEXT_MUTED} block text-xs`}>STUDY UNIT (OPTIONAL)</label>
                      <input
                        value={selectedObjectiveGroup}
                        onChange={(event) => {
                          setSelectedObjectiveGroup(event.target.value);
                          setSelectedObjectiveId("");
                        }}
                        list="priming-study-unit-options"
                        placeholder="Type or choose a study unit"
                        className={INPUT_BASE}
                      />
                      <datalist id="priming-study-unit-options">
                        {studyUnitOptions.map((option) => (
                          <option key={option.value} value={option.value} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className={`${TEXT_MUTED} block text-xs`}>OBJECTIVE SCOPE (OPTIONAL)</label>
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
                        <label className={`${TEXT_MUTED} block text-xs`}>FOCUS OBJECTIVE (OPTIONAL)</label>
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
                      <label className={`${TEXT_MUTED} block text-xs`}>TOPIC (OPTIONAL)</label>
                      <input
                        value={topic}
                        onChange={(event) => setTopic(event.target.value)}
                        placeholder="Optional focus topic"
                        className={INPUT_BASE}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="border border-primary/20 bg-black/35 p-3">
                        <div className="font-arcade text-[10px] text-primary/80">WORKFLOW</div>
                        <div className="mt-2 break-all font-terminal text-xs text-foreground">
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

                    <div className="border border-primary/20 bg-black/35 p-3">
                      <div className="font-arcade text-[10px] text-primary/80">OBSIDIAN TARGET</div>
                      <div className="mt-2 break-all font-terminal text-xs text-foreground">
                        {vaultFolderPreview || "Select a class to derive the folder path."}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-terminal text-sm text-muted-foreground">
                  Open this section when you need to change the priming method, swap chains, narrow
                  objective scope, or inspect workflow metadata.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}
