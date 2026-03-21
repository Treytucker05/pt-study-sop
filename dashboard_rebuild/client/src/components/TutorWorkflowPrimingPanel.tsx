import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Cpu, Link2, Loader2, Play, RefreshCw, Save, Sparkles, Wand2 } from "lucide-react";

import type { MethodBlock, TutorPrimingMethodRun, TutorPrimingSourceInventoryItem } from "@/api.types";
import { CATEGORY_COLORS } from "@/api.types";
import { CONTROL_PLANE_COLORS, CONTROL_PLANE_DEFAULT } from "@/lib/colors";
import MethodBlockCard from "@/components/MethodBlockCard";
import { MaterialSelector } from "@/components/MaterialSelector";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { PrimingLayout } from "@/components/priming/PrimingLayout";
import { PrimingMaterialReader } from "@/components/priming/PrimingMaterialReader";
import { TutorChainBuilder } from "@/components/TutorChainBuilder";
import { ConceptMapStructured } from "@/components/brain/ConceptMapStructured";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AppLearningObjective,
  TutorContentSources,
  TutorObjectiveScope,
  TutorTemplateChain,
  TutorWorkflowSummary,
} from "@/lib/api";
import { api } from "@/lib/api";
import { getMethodControlStage, getMethodStageBadgeLabel, getMethodStageColorKey } from "@/lib/controlStages";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import { extractMermaidBlock, parseLinesToRecords } from "@/lib/tutorUtils";
import { cn } from "@/lib/utils";
import { formatWorkflowStatus, truncateWorkflowId } from "@/lib/workflowStatus";

type StudyUnitOption = {
  value: string;
  objectiveCount: number;
  materialCount: number;
};

type ChainMode = "auto" | "template" | "custom";
type PrimingObjectiveItem = {
  title: string;
  loCode?: string | null;
};

const PRIME_METHOD_DISPLAY_ORDER = [
  "M-PRE-002",
  "M-PRE-004",
  "M-PRE-005",
  "M-PRE-006",
  "M-PRE-008",
  "M-PRE-009",
  "M-PRE-010",
  "M-PRE-011",
  "M-PRE-012",
  "M-PRE-013",
  "M-PRE-014",
] as const;

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
  primingMethods: string[];
  setPrimingMethods: (value: string[]) => void;
  primingMethodRuns: TutorPrimingMethodRun[];
  chainId: number | undefined;
  setChainId: (value: number | undefined) => void;
  customBlockIds: number[];
  setCustomBlockIds: (ids: number[]) => void;
  templateChains: TutorTemplateChain[];
  templateChainsLoading: boolean;
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
  preflightBlockers: { code?: string; message: string }[];
  preflightLoading: boolean;
  preflightError: string | null;
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

function normalizeObjectiveItems(value: unknown): PrimingObjectiveItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: PrimingObjectiveItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rawTitle = typeof (item as { title?: unknown }).title === "string" ? (item as { title: string }).title.trim() : "";
    if (!rawTitle) continue;
    const rawCode =
      typeof (item as { lo_code?: unknown }).lo_code === "string"
        ? (item as { lo_code: string }).lo_code.trim()
        : typeof (item as { loCode?: unknown }).loCode === "string"
          ? (item as { loCode: string }).loCode.trim()
          : "";
    const key = `${rawCode.toLowerCase()}::${rawTitle.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ title: rawTitle, loCode: rawCode || null });
  }
  return result;
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
    return `${compact.slice(0, maxLength - 1).trim()}...`;
  };

  const lines = ["graph TD", `  ROOT["${sanitize(title, 28) || "Study Map"}"]`];
  nodes.forEach((node, index) => {
    lines.push(`  N${index}["${sanitize(node)}"]`);
    lines.push(index === 0 ? `  ROOT --> N${index}` : `  N${index - 1} --> N${index}`);
  });
  return lines.join("\n");
}

function renderStringList(title: string, values: string[]) {
  if (values.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="font-arcade text-[10px] text-primary/80">{title}</div>
      <div className="space-y-1">
        {values.map((value) => (
          <div key={`${title}-${value}`} className="font-terminal text-sm text-foreground/90">
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderObjectiveCards(title: string | null, objectives: PrimingObjectiveItem[]) {
  if (objectives.length === 0) return null;
  return (
    <div className="space-y-3">
      {title ? <div className="font-arcade text-[10px] text-primary/80">{title}</div> : null}
      <div className="space-y-2">
        {objectives.map((objective, index) => (
          <div
            key={`${title || "objectives"}-${objective.loCode || "no-code"}-${objective.title}-${index}`}
            className="flex items-start gap-3 border border-primary/15 bg-black/30 p-3"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-primary/20 bg-black/45 font-arcade text-[10px] text-primary/80">
              {index + 1}
            </div>
            <div className="min-w-0 space-y-1">
              {objective.loCode ? (
                <Badge variant="outline" className="rounded-none border-primary/25 text-[10px] text-primary/80">
                  {objective.loCode}
                </Badge>
              ) : null}
              <div className="font-terminal text-sm text-foreground/95">{objective.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderMapOutput(title: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const mermaid = extractMermaidBlock(trimmed);
  const fallbackMermaid = mermaid ? null : buildFallbackMapMermaid(title, trimmed);
  if (mermaid || fallbackMermaid) {
    return (
      <div className="space-y-2">
        <div className="font-arcade text-[10px] text-primary/80">{title}</div>
        <div className="h-[280px] overflow-hidden border border-primary/20 bg-black/50">
          <ConceptMapStructured
            key={mermaid || fallbackMermaid || title}
            initialMermaid={mermaid || fallbackMermaid || "graph TD"}
            hideToolbar
            className="h-full"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="font-arcade text-[10px] text-primary/80">{title}</div>
      <div className="border border-primary/15 bg-black/35 p-4">
        <ObsidianRenderer content={trimmed} />
      </div>
    </div>
  );
}

function renderMethodEntry(entry: Record<string, unknown>) {
  const objectives = normalizeObjectiveItems(entry.learning_objectives);
  const concepts = Array.isArray(entry.concepts)
    ? (entry.concepts as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const terminology = Array.isArray(entry.terminology)
    ? (entry.terminology as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const questions = Array.isArray(entry.questions)
    ? (entry.questions as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const majorSections = Array.isArray(entry.major_sections)
    ? (entry.major_sections as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const branchPoints = Array.isArray(entry.branch_points)
    ? (entry.branch_points as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const gaps = Array.isArray(entry.gaps)
    ? (entry.gaps as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const unsupportedJumps = Array.isArray(entry.unsupported_jumps)
    ? (entry.unsupported_jumps as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const followUpTargets = Array.isArray(entry.follow_up_targets)
    ? (entry.follow_up_targets as unknown[]).filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
  const drawingBrief = typeof entry.drawing_brief === "string" ? entry.drawing_brief.trim() : "";
  const map = typeof entry.map === "string" ? entry.map.trim() : "";

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="border border-primary/15 bg-black/35 p-4">
          <ObsidianRenderer content={summary} />
        </div>
      ) : null}
      {renderObjectiveCards("Learning Objectives", objectives)}
      {renderStringList("Questions", questions)}
      {renderStringList("Major Sections", majorSections)}
      {renderStringList("Concepts", concepts)}
      {renderMapOutput("Structure Map", map)}
      {renderStringList("Follow-Up Targets", followUpTargets)}
      {renderStringList("Terminology", terminology)}
      {renderStringList("Ambiguities", gaps)}
      {renderStringList("Unsupported Jumps", unsupportedJumps)}
      {drawingBrief ? (
        <div className="space-y-2">
          <div className="font-arcade text-[10px] text-primary/80">Drawing Brief</div>
          <div className="border border-primary/15 bg-black/35 p-4 font-terminal text-sm text-foreground/90">
            {drawingBrief}
          </div>
        </div>
      ) : null}
      {renderStringList("Branch Points", branchPoints)}
    </div>
  );
}

function buildMethodWindowStates(
  sourceInventory: TutorPrimingSourceInventoryItem[],
  methodIds: string[],
  primeMethods: MethodBlock[],
  fallbackRuns: TutorPrimingMethodRun[],
) {
  return methodIds.map((methodId) => {
    const block = primeMethods.find((entry) => entry.method_id === methodId) || null;
    const entries = sourceInventory
      .flatMap((item) =>
        (item.method_outputs || [])
          .filter((run) => run.method_id === methodId)
          .map((run) => ({
            material_id: item.id,
            title: item.title,
            source_path: item.source_path ?? null,
            ...(run.outputs || {}),
          })),
      )
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
    const fallbackRun = fallbackRuns.find((entry) => entry.method_id === methodId) || null;
    return {
      methodId,
      block,
      run: fallbackRun,
      entries,
    };
  });
}

function summarizeTemplateChain(chain: TutorTemplateChain) {
  const blockCounts: Record<string, number> = {};
  for (const block of chain.blocks) {
    const stage = getMethodControlStage(block) || "ENCODE";
    blockCounts[stage] = (blockCounts[stage] || 0) + 1;
  }
  return blockCounts;
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
  primingMethods,
  setPrimingMethods,
  primingMethodRuns,
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
  templateChains,
  templateChainsLoading,
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
  preflightBlockers,
  preflightLoading,
  preflightError,
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
  const [editingHandoff, setEditingHandoff] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [chainMode, setChainMode] = useState<ChainMode>("auto");

  useEffect(() => {
    if (customBlockIds.length > 0) {
      setChainMode("custom");
      return;
    }
    if (typeof chainId === "number") {
      setChainMode("template");
      return;
    }
    setChainMode("auto");
  }, [chainId, customBlockIds.length]);

  useEffect(() => {
    if (objectiveScope !== "module_all") {
      setObjectiveScope("module_all");
    }
    if (selectedObjectiveId) {
      setSelectedObjectiveId("");
    }
  }, [objectiveScope, selectedObjectiveId, setObjectiveScope, setSelectedObjectiveId]);

  const {
    data: primeMethodResponse = [],
    isLoading: primeMethodsLoading,
    error: primeMethodsError,
  } = useQuery({
    queryKey: ["methods", "PRIME"],
    queryFn: () => api.methods.getAll("PRIME"),
    staleTime: 60_000,
  });

  const groupedObjectives = useMemo(
    () =>
      availableObjectives.reduce<Record<string, AppLearningObjective[]>>((acc, objective) => {
        const key = String(objective.groupName || "").trim() || "Ungrouped";
        if (!acc[key]) acc[key] = [];
        acc[key].push(objective);
        return acc;
      }, {}),
    [availableObjectives],
  );

  const activeObjectives = selectedObjectiveGroup ? groupedObjectives[selectedObjectiveGroup] || [] : [];
  const objectiveItems = normalizeObjectiveItems(
    activeObjectives.map((objective) => ({
      title: objective.title,
      loCode: objective.loCode || null,
    })),
  );
  const primeMethods = useMemo(() => {
    return (primeMethodResponse || [])
      .filter((block) => String(block.control_stage || "").toUpperCase() === "PRIME" && block.method_id)
      .sort((a, b) => {
        const aIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf((a.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number]);
        const bIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf((b.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number]);
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [primeMethodResponse]);
  const selectedSourceInventory = sourceInventory.filter((item) => selectedMaterials.includes(item.id));
  const extractedObjectiveItems = normalizeObjectiveItems(
    selectedSourceInventory.flatMap((item) => item.priming_output?.learning_objectives || []),
  );
  const extractedSourceCount = selectedSourceInventory.filter((item) => item.priming_output).length;
  const selectedMethodValues = primingMethods;
  const hasSelectedMethods = selectedMethodValues.length > 0;
  const selectedPrimeMethods = primeMethods.filter((method) => selectedMethodValues.includes(method.method_id || ""));
  const selectedMethodLabels = selectedPrimeMethods.map((method) => method.name);
  const extractedMethodIds = selectedSourceInventory.flatMap((item) =>
    (item.method_outputs || [])
      .map((run) => run.method_id)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );
  const uniqueExtractedMethodIds = extractedMethodIds.filter(
    (methodId, index) => extractedMethodIds.indexOf(methodId) === index,
  );
  const selectedMethodRuns = buildMethodWindowStates(
    selectedSourceInventory,
    selectedMethodValues,
    primeMethods,
    primingMethodRuns,
  );
  const extractedMethodRuns = buildMethodWindowStates(
    selectedSourceInventory,
    uniqueExtractedMethodIds,
    primeMethods,
    primingMethodRuns,
  );
  const nonSelectedExtractedMethodRuns = extractedMethodRuns.filter(
    ({ methodId, entries }) => entries.length > 0 && !selectedMethodValues.includes(methodId),
  );
  const hasLegacyPrimeOutputs =
    objectiveItems.length > 0 ||
    extractedObjectiveItems.length > 0 ||
    summaryText.trim().length > 0 ||
    conceptsText.trim().length > 0 ||
    terminologyText.trim().length > 0 ||
    rootExplanationText.trim().length > 0 ||
    gapsText.trim().length > 0;

  const readyForTutor = readinessItems.every((item) => item.ready);
  const hasPreflightIssues = Boolean(preflightError) || preflightBlockers.length > 0;
  const tutorLaunchDisabled = !readyForTutor || preflightLoading || hasPreflightIssues;

  const selectedTemplateChain =
    typeof chainId === "number" ? templateChains.find((chain) => chain.id === chainId) || null : null;

  const tutorChainSummary =
    chainMode === "custom"
      ? customBlockIds.length > 0
        ? `Custom chain (${customBlockIds.length} blocks)`
        : "Custom chain not built yet"
      : chainMode === "template"
        ? selectedTemplateChain?.name || "Choose a pre-built chain"
        : "Auto session structure";

  const togglePrimingMethod = (value: string) => {
    const current = selectedMethodValues;
    if (current.includes(value)) {
      setPrimingMethods(current.filter((method) => method !== value));
      return;
    }
    setPrimingMethods([...current, value]);
  };

  const sourceViewerSection = (
    <div className="flex h-[60vh] min-h-[24rem] max-h-[52rem] flex-col">
      <div className="border-b border-primary/20 bg-black/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-arcade text-xs text-primary">SOURCE VIEWER</div>
            <p className={`${TEXT_MUTED} mt-1 text-xs`}>
              Reference-only view of the materials in scope. Extraction now runs from the PRIME workspace above.
            </p>
          </div>
          <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
            {selectedMaterials.length > 0
              ? `${selectedMaterials.length} materials in viewer`
              : "No materials selected"}
          </Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <PrimingMaterialReader courseId={courseId} selectedMaterials={selectedMaterials} />
      </div>
    </div>
  );

  const sections = [
    <div key="setup" className="p-4">
      <Card className="rounded-none border-2 border-primary/30 bg-black/45">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">SETUP</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Select the course, study unit, and source materials that Tutor will inherit from PRIME.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
              {formatWorkflowStatus(workflow?.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
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

              <div className="space-y-2">
                <label className={`${TEXT_MUTED} block text-xs`}>STUDY UNIT</label>
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
                <div className={`${TEXT_MUTED} text-xs`}>
                  Use the broader week or module here. Tutor launch depends on this study-unit context.
                </div>
              </div>

              <div className="space-y-2">
                <label className={`${TEXT_MUTED} block text-xs`}>TOPIC (OPTIONAL)</label>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Optional narrow focus for this study run"
                  className={INPUT_BASE}
                />
              </div>
            </div>

            <div className="space-y-3 border border-primary/20 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-arcade text-[10px] text-primary/80">TUTOR LAUNCH CONTRACT</div>
                <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                  {readyForTutor ? "READY" : "INCOMPLETE"}
                </Badge>
              </div>
              <div className="space-y-2">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 border border-primary/10 bg-black/30 p-3">
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

              {preflightLoading ? (
                <div className="flex items-center gap-2 border border-primary/10 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Tutor launch blockers...
                </div>
              ) : null}

              {preflightError ? (
                <div className="border border-destructive/30 bg-destructive/10 p-3">
                  <div className="font-arcade text-[10px] text-destructive">TUTOR LAUNCH BLOCKERS</div>
                  <div className="mt-2 font-terminal text-sm text-foreground">{preflightError}</div>
                </div>
              ) : null}

              {!preflightError && preflightBlockers.length > 0 ? (
                <div className="space-y-2 border border-destructive/30 bg-destructive/10 p-3">
                  <div className="font-arcade text-[10px] text-destructive">TUTOR LAUNCH BLOCKERS</div>
                  {preflightBlockers.map((blocker) => (
                    <div key={`${blocker.code || "blocker"}-${blocker.message}`} className="font-terminal text-sm text-foreground">
                      {blocker.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 border border-primary/20 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-arcade text-[10px] text-primary/80">MATERIALS IN SCOPE</div>
                <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                  Pick the exact files Tutor should inherit from this study plan.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                  {selectedMaterials.length} selected
                </Badge>
                <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                  {extractedSourceCount} extracted
                </Badge>
              </div>
            </div>
            <MaterialSelector
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>
        </CardContent>
      </Card>
    </div>,
    <div key="workspace" className="p-4">
      <Card className="rounded-none border-2 border-primary/30 bg-black/45">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">PRIME ARTIFACT WORKSPACE</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Pick the real PRIME methods, run extraction once, then review only the outputs those methods generated.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
              {selectedMethodRuns.filter((item) => item.entries.length > 0).length}/{selectedMethodRuns.length || selectedMethodValues.length} generated
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-arcade text-[10px] text-primary/80">PRIMING METHODS</div>
                <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                  These come from the real PRIME method library. Extraction only runs the methods selected here.
                </p>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                {selectedMethodValues.length} selected
              </Badge>
            </div>
            {primeMethodsLoading ? (
              <div className="flex items-center gap-2 border border-primary/15 bg-black/35 p-4 font-terminal text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading PRIME methods...
              </div>
            ) : primeMethodsError ? (
              <div className="border border-destructive/30 bg-destructive/10 p-4 font-terminal text-sm text-foreground">
                Failed to load PRIME methods from the library.
              </div>
            ) : (
              <div className="grid auto-rows-fr gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {primeMethods.map((block) => {
                  const methodId = block.method_id || String(block.id);
                  const selected = selectedMethodValues.includes(methodId);
                  const stageLabel = getMethodStageBadgeLabel(block);
                  const stageColorKey = getMethodStageColorKey(block);
                  const stageColors = CONTROL_PLANE_COLORS[stageColorKey] || CONTROL_PLANE_DEFAULT;
                  return (
                    <div
                      key={methodId}
                      className={cn(
                        `flex min-h-[160px] flex-col border-2 transition-colors ${stageColors.border}`,
                        !selected && "opacity-50",
                      )}
                    >
                      <div className="px-3 pt-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-arcade text-sm leading-tight">{block.name}</span>
                          <span className={`shrink-0 rounded-none px-1.5 py-0.5 font-arcade text-xs ${stageColors.badge}`}>
                            {stageLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-end">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-none border-primary/25 text-[10px]",
                              selected ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {selected ? "SELECTED" : "OPTIONAL"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 px-3 pb-3 pt-1">
                        <MethodBlockCard block={block} compact onClick={() => togglePrimingMethod(methodId)} hideHeader />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {hasSelectedMethods ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border border-primary/20 bg-black/35 p-4">
                <div>
                  <div className="font-arcade text-xs text-primary">SELECTED PRIME METHOD WINDOWS</div>
                  <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                    Each selected method gets its own output window below. Run extraction here after choosing the methods you want.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                    {selectedMethodValues.length} selected
                  </Badge>
                  <Button
                    type="button"
                    className="rounded-none font-arcade text-xs"
                    onClick={onRunAssistForSelected}
                    disabled={isRunningAssist || selectedMaterials.length === 0 || selectedMethodValues.length === 0}
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

              {selectedMethodRuns.map(({ methodId, block, run, entries }) => (
                <div key={methodId} className="space-y-3 border border-primary/20 bg-black/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-arcade text-xs text-primary">
                        {block?.name || run?.method_name || methodId}
                      </div>
                      <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                        {block?.outputs_summary ||
                          block?.description ||
                          "Selected PRIME method output."}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                      {entries.length > 0 ? `${entries.length} source${entries.length === 1 ? "" : "s"}` : "Pending"}
                    </Badge>
                  </div>

                  {entries.length > 0 ? (
                    <div className="space-y-3">
                      {entries.map((entry, index) => {
                        const materialId = typeof entry.material_id === "number" ? entry.material_id : null;
                        const sourceTitle =
                          typeof entry.title === "string" && entry.title.trim().length > 0
                            ? entry.title
                            : materialId != null
                              ? `Material ${materialId}`
                              : `Source ${index + 1}`;
                        const sourcePath = typeof entry.source_path === "string" ? entry.source_path : "";
                        return (
                          <div key={`${methodId}-${materialId ?? index}`} className="space-y-3 border border-primary/15 bg-black/30 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="break-words font-terminal text-sm text-foreground">{sourceTitle}</div>
                                {sourcePath ? (
                                  <div className="mt-1 break-all font-terminal text-[11px] text-muted-foreground">
                                    {sourcePath}
                                  </div>
                                ) : null}
                              </div>
                              {materialId != null ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-none"
                                  onClick={() => onRunAssistForMaterial(materialId)}
                                  disabled={isRunningAssist}
                                >
                                  {isRunningAssist && assistTargetMaterialId === materialId ? (
                                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                  )}
                                  RERUN SOURCE
                                </Button>
                              ) : null}
                            </div>
                            {renderMethodEntry(entry)}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="font-terminal text-sm text-muted-foreground">
                      No output for this method yet. Use Extract PRIME above to generate it.
                    </div>
                  )}
                </div>
              ))}

              {objectiveItems.length > 0 ? (
                <div className="space-y-3 border border-primary/20 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-arcade text-xs text-primary">EXISTING STUDY-UNIT OBJECTIVES</div>
                      <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                        These objectives are already available to Tutor from the selected study unit. They are separate from the methods currently queued for extraction.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                      {objectiveItems.length} ready
                    </Badge>
                  </div>
                  {renderObjectiveCards(null, objectiveItems)}
                </div>
              ) : null}

              {nonSelectedExtractedMethodRuns.length > 0 ? (
                <div className="space-y-4 border border-primary/20 bg-black/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-arcade text-xs text-primary">ALREADY EXTRACTED PRIME METHODS</div>
                      <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                        These outputs already exist on the selected materials but are not part of the method set currently queued for the next extract.
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                      {nonSelectedExtractedMethodRuns.length} extracted
                    </Badge>
                  </div>

                  {nonSelectedExtractedMethodRuns.map(({ methodId, block, run, entries }) => (
                    <div key={`existing-${methodId}`} className="space-y-3 border border-primary/15 bg-black/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-arcade text-xs text-primary">
                            {block?.name || run?.method_name || methodId}
                          </div>
                          <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                            Existing extracted output on the currently selected materials.
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                          {entries.length} source{entries.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {entries.map((entry, index) => {
                          const materialId = typeof entry.material_id === "number" ? entry.material_id : null;
                          const sourceTitle =
                            typeof entry.title === "string" && entry.title.trim().length > 0
                              ? entry.title
                              : materialId != null
                                ? `Material ${materialId}`
                                : `Source ${index + 1}`;
                          const sourcePath = typeof entry.source_path === "string" ? entry.source_path : "";
                          return (
                            <div key={`existing-${methodId}-${materialId ?? index}`} className="space-y-3 border border-primary/15 bg-black/25 p-4">
                              <div className="min-w-0">
                                <div className="break-words font-terminal text-sm text-foreground">{sourceTitle}</div>
                                {sourcePath ? (
                                  <div className="mt-1 break-all font-terminal text-[11px] text-muted-foreground">
                                    {sourcePath}
                                  </div>
                                ) : null}
                              </div>
                              {renderMethodEntry(entry)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {hasLegacyPrimeOutputs && primingMethodRuns.length === 0 ? (
                <details className="border border-primary/15 bg-black/35 p-4">
                  <summary className="cursor-pointer font-arcade text-xs text-primary">LEGACY PRIME OUTPUTS</summary>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      {summaryText.trim() ? (
                        <div>
                          <div className="font-arcade text-[10px] text-primary/80">Summary</div>
                          <div className="mt-2 border border-primary/15 bg-black/30 p-4">
                            <ObsidianRenderer content={summaryText} />
                          </div>
                        </div>
                      ) : null}
                      {conceptsText.trim() ? renderStringList("Study Spine", conceptsText.split(/\r?\n/).filter(Boolean)) : null}
                      {terminologyText.trim() ? renderStringList("Terms", terminologyText.split(/\r?\n/).filter(Boolean)) : null}
                    </div>
                    <div className="space-y-3">
                      {rootExplanationText.trim() ? renderMapOutput("Hierarchy", rootExplanationText) : null}
                      {gapsText.trim() ? renderStringList("Ambiguities", gapsText.split(/\r?\n/).filter(Boolean)) : null}
                      {extractedObjectiveItems.length > 0
                        ? renderObjectiveCards("Extracted Objective Candidates", extractedObjectiveItems)
                        : null}
                    </div>
                  </div>
                </details>
              ) : null}

              <div className="border border-primary/15 bg-black/35 p-4">
                <div className="font-arcade text-[10px] text-primary/80">PRIME BOUNDARY</div>
                <div className="mt-2 font-terminal text-sm text-muted-foreground">
                  Need root mechanism understanding? That belongs to TEACH after PRIME finishes structure. Use a TEACH move like Mechanism Trace once Tutor starts.
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>,
    <div key="source-viewer">{sourceViewerSection}</div>,
    <div key="handoff" className="p-4">
      <Card className="rounded-none border-2 border-primary/30 bg-black/45">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">TUTOR HANDOFF</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Choose the Tutor chain, review the handoff notes, then launch into Tutor when Setup and PRIME are complete.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
              {tutorLaunchDisabled ? "NOT READY" : "READY"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="space-y-3 border border-primary/20 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-arcade text-[10px] text-primary/80">TUTOR CHAIN</div>
                <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                  This selection applies to the Tutor session launch, not the Priming extraction.
                </div>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                {tutorChainSummary}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "template" as const, label: "PRE-BUILT", icon: Link2 },
                { key: "custom" as const, label: "CUSTOM", icon: Cpu },
                { key: "auto" as const, label: "AUTO", icon: Wand2 },
              ].map((option) => {
                const Icon = option.icon;
                const isActive = chainMode === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setChainMode(option.key);
                      if (option.key === "auto") {
                        setChainId(undefined);
                        setCustomBlockIds([]);
                      }
                      if (option.key === "template") {
                        setCustomBlockIds([]);
                      }
                      if (option.key === "custom") {
                        setChainId(undefined);
                      }
                    }}
                    className={`p-3 border-2 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-primary/20 bg-black/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="mb-1.5 h-4 w-4" />
                    <div className="font-arcade text-xs tracking-wider">{option.label}</div>
                  </button>
                );
              })}
            </div>

            {chainMode === "template" ? (
              templateChainsLoading ? (
                <div className="flex items-center gap-2 border border-primary/10 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading template chains...
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {templateChains.length === 0 ? (
                    <div className="border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                      No template Tutor chains are available yet.
                    </div>
                  ) : (
                    templateChains.map((chain) => {
                      const isSelected = chainId === chain.id;
                      const blockCounts = summarizeTemplateChain(chain);
                      return (
                        <button
                          key={chain.id}
                          type="button"
                          onClick={() => setChainId(isSelected ? undefined : chain.id)}
                          className={`w-full border-2 px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-primary/10 bg-black/30 hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-terminal text-sm text-foreground">{chain.name}</span>
                            <Badge variant="outline" className="rounded-none text-[10px]">
                              {chain.blocks.length} blocks
                            </Badge>
                          </div>
                          <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                            {chain.description || "No chain description"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(blockCounts).map(([stage, count]) => {
                              const colorKey = getMethodStageColorKey({ control_stage: stage });
                              const color = CATEGORY_COLORS[colorKey] || "#888";
                              return (
                                <span
                                  key={`${chain.id}-${stage}`}
                                  className="border px-1 text-xs font-terminal"
                                  style={{ borderColor: `${color}55`, color }}
                                >
                                  {count} {getMethodStageBadgeLabel({ control_stage: stage })}
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )
            ) : null}

            {chainMode === "custom" ? (
              <TutorChainBuilder
                selectedBlockIds={customBlockIds}
                setSelectedBlockIds={setCustomBlockIds}
              />
            ) : null}

            {chainMode === "auto" ? (
              <div className="border border-primary/10 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                Auto launch lets Tutor choose the live session structure without a fixed chain.
              </div>
            ) : null}
          </div>

          <div className="space-y-4 border border-primary/20 bg-black/35 p-4">
            <div className="flex items-center justify-between gap-3">
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
                    placeholder="Optional guidance for Tutor pacing, focus, scaffold depth, or retrieval pressure."
                    className={`${INPUT_BASE} min-h-[120px] resize-y`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
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

          <div className="space-y-3 border border-primary/20 bg-black/35 p-4">
            <div className="font-arcade text-[10px] text-primary/80">TUTOR HANDOFF STATUS</div>
            <div className="font-terminal text-sm text-foreground">
              {tutorLaunchDisabled
                ? "Tutor is still blocked. Finish the Setup and PRIME requirements above before starting a session."
                : "The handoff packet is ready. You can launch Tutor with the selected chain mode."}
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
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
                disabled={isSaving || tutorLaunchDisabled}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                MARK READY
              </Button>
              <Button
                className="rounded-none font-arcade text-xs"
                onClick={onStartTutor}
                disabled={tutorLaunchDisabled || isStartingTutor}
              >
                <Play className="mr-2 h-3.5 w-3.5" />
                {isStartingTutor ? "STARTING TUTOR..." : "START TUTOR SESSION"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>,
    <div key="context" className="p-4">
      <Card className="rounded-none border-2 border-primary/20 bg-black/40">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">WORKFLOW CONTEXT</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Metadata only. Priming methods live in the workspace above, and Tutor chain selection lives in the handoff section.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none"
              onClick={() => setShowContext((current) => !current)}
            >
              {showContext ? "HIDE CONTEXT" : "SHOW CONTEXT"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[10px] text-primary/80">SELECTED PRIMING METHODS</div>
              <div className="mt-2 font-terminal text-sm text-foreground">
                {selectedMethodLabels.join(", ")}
              </div>
            </div>
            <div className="border border-primary/20 bg-black/35 p-3">
              <div className="font-arcade text-[10px] text-primary/80">TUTOR CHAIN MODE</div>
              <div className="mt-2 font-terminal text-sm text-foreground">{tutorChainSummary}</div>
            </div>
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

          {showContext ? (
            <div className="space-y-4 border-t border-primary/15 pt-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="border border-primary/20 bg-black/35 p-3">
                  <div className="font-arcade text-[10px] text-primary/80">STUDY UNIT OPTIONS</div>
                  <div className="mt-2 space-y-2 font-terminal text-sm text-foreground">
                    {studyUnitOptions.length > 0 ? (
                      studyUnitOptions.map((option) => (
                        <div key={option.value} className="border border-primary/10 bg-black/25 p-2">
                          <div>{option.value}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {option.objectiveCount} objectives / {option.materialCount} materials
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">No study unit suggestions loaded yet.</div>
                    )}
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
              Open this section when you want workflow metadata or the Obsidian target path. Priming extraction decisions now live in the workspace above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>,
  ];

  return <PrimingLayout sections={sections} />;
}
