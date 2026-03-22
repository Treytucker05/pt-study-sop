import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Link2,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Check,
} from "lucide-react";

import type { MethodBlock, TutorPrimingMethodRun, TutorPrimingSourceInventoryItem } from "@/api.types";
import { CATEGORY_COLORS } from "@/api.types";
import MethodBlockCard from "@/components/MethodBlockCard";
import { MaterialSelector } from "@/components/MaterialSelector";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import {
  PrimingLayout,
  type PrimingLayoutStep,
  type PrimingStepId,
} from "@/components/priming/PrimingLayout";
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
import { getMethodStageBadgeLabel, getMethodStageColorKey } from "@/lib/controlStages";
import { INPUT_BASE, SELECT_BASE, TEXT_MUTED } from "@/lib/theme";
import { extractMermaidBlock } from "@/lib/tutorUtils";
import { cn } from "@/lib/utils";
import { formatWorkflowStatus, truncateWorkflowId } from "@/lib/workflowStatus";
import { toast } from "sonner";

type StudyUnitOption = {
  value: string;
  objectiveCount: number;
  materialCount: number;
};

type ChainMode = "auto" | "template" | "custom";

const PRIME_METHOD_DISPLAY_ORDER = [
  "M-PRE-002",
  "M-PRE-004",
  "M-PRE-005",
  "M-PRE-006",
  "M-PRE-008",
  "M-PRE-009",
  "M-PRE-010",
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

function renderObjectives(objectives: AppLearningObjective[] | Array<{ lo_code?: string; title?: string }>) {
  const items = objectives
    .map((item) => ({
      code: "loCode" in item ? item.loCode || "" : item.lo_code || "",
      title: item.title || "",
    }))
    .filter((item) => item.title.trim().length > 0);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.code}-${item.title}-${index}`} className="border border-primary/15 bg-black/30 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-primary/20 bg-black/45 font-arcade text-ui-2xs text-primary/80">
              {index + 1}
            </div>
            <div className="space-y-1">
              {item.code ? (
                <Badge variant="outline" className="rounded-none border-primary/25 text-ui-2xs text-primary/80">
                  {item.code}
                </Badge>
              ) : null}
              <div className="font-terminal text-sm text-foreground/95">{item.title}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderTextList(title: string, lines: string[]) {
  const values = lines.map((line) => line.trim()).filter(Boolean);
  if (values.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="font-arcade text-ui-2xs text-primary/80">{title}</div>
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

function renderMethodOutput(entry: Record<string, unknown>) {
  const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
  const map = typeof entry.map === "string" ? entry.map.trim() : "";
  const mermaid = map ? extractMermaidBlock(map) : null;
  const objectives = Array.isArray(entry.learning_objectives)
    ? (entry.learning_objectives as Array<{ lo_code?: string; title?: string }>)
    : [];
  const concepts = Array.isArray(entry.concepts) ? entry.concepts.filter((value): value is string => typeof value === "string") : [];
  const terms = Array.isArray(entry.terminology) ? entry.terminology.filter((value): value is string => typeof value === "string") : [];
  const gaps = Array.isArray(entry.gaps) ? entry.gaps.filter((value): value is string => typeof value === "string") : [];
  return (
    <div className="space-y-4">
      {summary ? <div className="border border-primary/15 bg-black/35 p-4"><ObsidianRenderer content={summary} /></div> : null}
      {objectives.length > 0 ? renderObjectives(objectives) : null}
      {mermaid ? <div className="space-y-2"><div className="font-arcade text-ui-2xs text-primary/80">Structure Map</div><div className="h-[260px] overflow-hidden border border-primary/20 bg-black/50"><ConceptMapStructured initialMermaid={mermaid} hideToolbar className="h-full" /></div></div> : map ? <div className="border border-primary/15 bg-black/35 p-4"><ObsidianRenderer content={map} /></div> : null}
      {renderTextList("Concepts", concepts)}
      {renderTextList("Terminology", terms)}
      {renderTextList("Ambiguities", gaps)}
    </div>
  );
}

type MethodWindowState = {
  methodId: string;
  block: MethodBlock | null;
  run: TutorPrimingMethodRun | null;
  entries: Record<string, unknown>[];
};

function renderPreview(value: string, fallback: string) {
  return value.trim().length > 0 ? value : fallback;
}

function buildMethodWindowStates(
  sourceInventory: TutorPrimingSourceInventoryItem[],
  methodIds: string[],
  primeMethods: MethodBlock[],
  fallbackRuns: TutorPrimingMethodRun[],
): MethodWindowState[] {
  return methodIds.map((methodId) => {
    const block = primeMethods.find((entry) => entry.method_id === methodId) || null;
    const fallbackRun = fallbackRuns.find((entry) => entry.method_id === methodId) || null;
    const sourceEntries = sourceInventory
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
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
    const fallbackEntries =
      fallbackRun?.outputs && typeof fallbackRun.outputs === "object" && Array.isArray(fallbackRun.outputs.entries)
        ? fallbackRun.outputs.entries.filter(
            (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object",
          )
        : [];

    return {
      methodId,
      block,
      run: fallbackRun,
      entries: sourceEntries.length > 0 ? sourceEntries : fallbackEntries,
    };
  });
}

function summarizeTemplateChain(chain: TutorTemplateChain) {
  const blockCounts: Record<string, number> = {};
  for (const block of chain.blocks) {
    const stageKey = getMethodStageColorKey(block);
    blockCounts[stageKey] = (blockCounts[stageKey] || 0) + 1;
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
  const [activeStepId, setActiveStepId] = useState<PrimingStepId>("setup");
  const [editingHandoff, setEditingHandoff] = useState(false);
  const [chainMode, setChainMode] = useState<ChainMode>("auto");
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const queryClient = useQueryClient();

  // Study unit edit/delete state
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editingUnitValue, setEditingUnitValue] = useState("");
  const [unitBusy, setUnitBusy] = useState(false);

  const handleRenameStudyUnit = useCallback(
    async (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName) {
        setEditingUnit(null);
        return;
      }
      setUnitBusy(true);
      try {
        const objectives = availableObjectives.filter(
          (o) => String(o.groupName || "") === oldName,
        );
        await Promise.all(
          objectives.map((o) =>
            api.learningObjectives.update(o.id, { groupName: trimmed }),
          ),
        );
        if (selectedObjectiveGroup === oldName) {
          setSelectedObjectiveGroup(trimmed);
        }
        await queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
        toast.success(`Renamed "${oldName}" → "${trimmed}"`);
      } catch {
        toast.error("Failed to rename study unit");
      } finally {
        setUnitBusy(false);
        setEditingUnit(null);
      }
    },
    [availableObjectives, selectedObjectiveGroup, setSelectedObjectiveGroup, queryClient],
  );

  const handleDeleteStudyUnit = useCallback(
    async (unitName: string) => {
      const objectives = availableObjectives.filter(
        (o) => String(o.groupName || "") === unitName,
      );
      if (objectives.length === 0) return;
      const confirmed = window.confirm(
        `Delete study unit "${unitName}" and its ${objectives.length} objective${objectives.length === 1 ? "" : "s"}?`,
      );
      if (!confirmed) return;
      setUnitBusy(true);
      try {
        await Promise.all(objectives.map((o) => api.learningObjectives.delete(o.id)));
        if (selectedObjectiveGroup === unitName) {
          setSelectedObjectiveGroup("");
        }
        await queryClient.invalidateQueries({ queryKey: ["tutor-content-sources"] });
        toast.success(`Deleted study unit "${unitName}"`);
      } catch {
        toast.error("Failed to delete study unit");
      } finally {
        setUnitBusy(false);
      }
    },
    [availableObjectives, selectedObjectiveGroup, setSelectedObjectiveGroup, queryClient],
  );

  useEffect(() => {
    headingRef.current?.focus();
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeStepId]);

  useEffect(() => {
    if (objectiveScope !== "module_all") {
      setObjectiveScope("module_all");
    }
    if (selectedObjectiveId) {
      setSelectedObjectiveId("");
    }
  }, [objectiveScope, selectedObjectiveId, setObjectiveScope, setSelectedObjectiveId]);

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

  const {
    data: primeMethodResponse = [],
    isLoading: primeMethodsLoading,
    error: primeMethodsError,
  } = useQuery<MethodBlock[]>({
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

  const primeMethods = useMemo(() => {
    return primeMethodResponse
      .filter(
        (block) => String(block.control_stage || "").toUpperCase() === "PRIME" && Boolean(block.method_id),
      )
      .sort((a, b) => {
        const aIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf(
          (a.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number],
        );
        const bIndex = PRIME_METHOD_DISPLAY_ORDER.indexOf(
          (b.method_id || "") as (typeof PRIME_METHOD_DISPLAY_ORDER)[number],
        );
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [primeMethodResponse]);

  const activeObjectives = selectedObjectiveGroup ? groupedObjectives[selectedObjectiveGroup] || [] : [];
  const objectiveItems = activeObjectives.filter((objective) => objective.title.trim().length > 0);
  const selectedSourceInventory = sourceInventory.filter((item) => selectedMaterials.includes(item.id));
  const selectedMethodRuns = buildMethodWindowStates(
    selectedSourceInventory,
    primingMethods,
    primeMethods,
    primingMethodRuns,
  );
  const uniqueExtractedMethodIds = Array.from(
    new Set([
      ...selectedSourceInventory.flatMap((item) =>
        (item.method_outputs || [])
          .map((run) => run.method_id)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      ),
      ...primingMethodRuns
        .filter(
          (run) =>
            run.source_ids.length === 0 ||
            run.source_ids.some((materialId) => selectedMaterials.includes(materialId)),
        )
        .map((run) => run.method_id),
    ]),
  );
  const extractedMethodRuns = buildMethodWindowStates(
    selectedSourceInventory,
    uniqueExtractedMethodIds,
    primeMethods,
    primingMethodRuns,
  );
  const nonSelectedExtractedMethodRuns = extractedMethodRuns.filter(
    ({ methodId, entries, run }) =>
      !primingMethods.includes(methodId) &&
      (entries.length > 0 || Boolean(run && Object.keys(run.outputs || {}).length > 0)),
  );
  const hasLegacyPrimeOutputs =
    objectiveItems.length > 0 ||
    summaryText.trim().length > 0 ||
    conceptsText.trim().length > 0 ||
    terminologyText.trim().length > 0 ||
    rootExplanationText.trim().length > 0 ||
    gapsText.trim().length > 0;
  const readyForTutor = readinessItems.every((item) => item.ready);
  const hasPreflightIssues = Boolean(preflightError) || preflightBlockers.length > 0;
  const tutorLaunchDisabled = !readyForTutor || preflightLoading || hasPreflightIssues;
  const selectedTemplateChain =
    typeof chainId === "number" ? templateChains.find((entry) => entry.id === chainId) || null : null;
  const tutorChainSummary =
    chainMode === "custom"
      ? customBlockIds.length > 0
        ? `Custom chain (${customBlockIds.length} blocks)`
        : "Custom chain not built yet"
      : chainMode === "template"
        ? selectedTemplateChain?.name || "Choose a pre-built chain"
        : "Auto session structure";
  const extractBlockerText =
    selectedMaterials.length === 0
      ? "Select at least one source material first."
      : primingMethods.length === 0
        ? "Choose at least one PRIME method to run."
        : isRunningAssist
          ? assistTargetMaterialId
            ? "Extraction is running for the selected source."
            : "Extraction is running for the materials in scope."
          : "Run the selected PRIME methods on the materials in scope.";

  const stepOrder: PrimingStepId[] = ["setup", "materials", "methods", "outputs", "handoff"];
  const steps: PrimingLayoutStep[] = [
    {
      id: "setup",
      label: "SETUP",
      summary: "Set the course, study unit, topic, and launch contract before any Tutor handoff.",
    },
    {
      id: "materials",
      label: "MATERIALS",
      summary: "Scope the exact materials you want Priming to read and keep visible in the source viewer.",
    },
    {
      id: "methods",
      label: "PRIME METHODS",
      summary: "Pick the PRIME methods, see extraction blockers, and run the extraction pass.",
      disabled: selectedMaterials.length === 0,
      helperText: "Select at least one material first so Priming has a source scope.",
    },
    {
      id: "outputs",
      label: "OUTPUTS",
      summary: "Review selected-method windows, existing objectives, and already extracted PRIME results.",
      disabled: selectedMaterials.length === 0 || primingMethods.length === 0,
      helperText:
        selectedMaterials.length === 0
          ? "Select materials first."
          : "Choose a PRIME method first so there is a workspace to review.",
    },
    {
      id: "handoff",
      label: "TUTOR HANDOFF",
      summary: "Choose the Tutor chain, refine notes, save the draft, and launch Tutor when ready.",
    },
  ];

  const selectedStepIndex = stepOrder.indexOf(activeStepId);
  const previousStepId = selectedStepIndex > 0 ? stepOrder[selectedStepIndex - 1] : null;
  const nextStepId = selectedStepIndex < stepOrder.length - 1 ? stepOrder[selectedStepIndex + 1] : null;
  const nextStepDisabled = nextStepId
    ? steps.find((step) => step.id === nextStepId)?.disabled ?? false
    : true;

  const renderStepFooter = () => (
    <div className="mt-5 flex flex-col gap-2 border-t border-primary/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-terminal text-xs text-muted-foreground">
        Step {selectedStepIndex + 1} of {stepOrder.length}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => previousStepId && setActiveStepId(previousStepId)}
          disabled={!previousStepId}
        >
          PREVIOUS
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-arcade text-ui-2xs"
          onClick={() => nextStepId && !nextStepDisabled && setActiveStepId(nextStepId)}
          disabled={!nextStepId || nextStepDisabled}
        >
          NEXT
        </Button>
      </div>
    </div>
  );

  const togglePrimingMethod = (methodId: string) => {
    if (primingMethods.includes(methodId)) {
      setPrimingMethods(primingMethods.filter((entry) => entry !== methodId));
      return;
    }
    setPrimingMethods([...primingMethods, methodId]);
  };

  const sourceViewer = (
    <div className="flex h-[60vh] min-h-[24rem] max-h-[52rem] flex-col">
      <div className="border-b border-primary/20 bg-black/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-arcade text-xs text-primary">SOURCE VIEWER</div>
            <p className={`${TEXT_MUTED} mt-1 text-xs`}>
              Keep the scoped source visible while you work. Priming now stays in one flow instead of
              sending you below the fold.
            </p>
          </div>
          <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
            {selectedMaterials.length > 0
              ? `${selectedMaterials.length} materials in scope`
              : "No materials selected"}
          </Badge>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <PrimingMaterialReader courseId={courseId} selectedMaterials={selectedMaterials} />
      </div>
    </div>
  );

  const setupContent = (
    <div className="space-y-4">
      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">SETUP</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Select the course, study unit, and topic that Tutor will inherit from Priming.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
              {formatWorkflowStatus(workflow?.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
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
              <label className={`${TEXT_MUTED} block text-xs`}>TOPIC</label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Optional topic or module focus"
                className={INPUT_BASE}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`${TEXT_MUTED} block text-xs`}>STUDY UNIT</label>
            <input
              value={selectedObjectiveGroup}
              onChange={(event) => {
                setSelectedObjectiveGroup(event.target.value);
                setSelectedObjectiveId("");
              }}
              placeholder="Type a new study unit or select below"
              className={INPUT_BASE}
            />
            {studyUnitOptions.length > 0 && (
              <div className="space-y-1 rounded border border-primary/15 bg-black/30 p-2">
                <div className="font-mono text-ui-2xs text-foreground/50 uppercase tracking-wider">
                  Existing units
                </div>
                {studyUnitOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "group flex items-center gap-2 rounded px-2 py-1.5 transition-colors",
                      selectedObjectiveGroup === option.value
                        ? "bg-primary/10 text-white"
                        : "text-foreground/75 hover:bg-primary/5 hover:text-white",
                    )}
                  >
                    {editingUnit === option.value ? (
                      <div className="flex flex-1 items-center gap-1">
                        <input
                          value={editingUnitValue}
                          onChange={(e) => setEditingUnitValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void handleRenameStudyUnit(option.value, editingUnitValue);
                            } else if (e.key === "Escape") {
                              setEditingUnit(null);
                            }
                          }}
                          className={cn(INPUT_BASE, "h-7 flex-1 text-sm")}
                          disabled={unitBusy}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => void handleRenameStudyUnit(option.value, editingUnitValue)}
                          disabled={unitBusy}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                          title="Confirm rename"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUnit(null)}
                          disabled={unitBusy}
                          className="p-1 text-foreground/50 hover:text-foreground/80"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedObjectiveGroup(option.value);
                            setSelectedObjectiveId("");
                          }}
                          className="flex-1 text-left font-mono text-sm"
                        >
                          {option.value}
                          <span className="ml-2 text-foreground/40 text-xs">
                            {option.objectiveCount} obj
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUnit(option.value);
                            setEditingUnitValue(option.value);
                          }}
                          disabled={unitBusy}
                          className="p-1 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
                          title="Rename study unit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteStudyUnit(option.value)}
                          disabled={unitBusy}
                          className="p-1 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          title="Delete study unit and its objectives"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className={`${TEXT_MUTED} text-xs`}>
              Use a broad unit label here so the priming scope covers the whole module instead of isolated fragments.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <CardTitle className="font-arcade text-xs text-primary">TUTOR LAUNCH CONTRACT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "border p-3",
                  item.ready
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-primary/15 bg-black/30",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-arcade text-ui-2xs text-primary/80">{item.label}</div>
                    <div className="mt-2 font-terminal text-sm text-foreground/90">{item.detail}</div>
                  </div>
                  {item.ready ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  ) : (
                    <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                      BLOCKED
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {preflightLoading ? (
            <div className="flex items-center gap-2 border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking Tutor launch blockers...
            </div>
          ) : null}

          {preflightError ? (
            <div className="border border-destructive/35 bg-destructive/10 p-3 font-terminal text-sm text-destructive/90">
              {preflightError}
            </div>
          ) : null}

          {preflightBlockers.length > 0 ? (
            <div className="space-y-3 border border-destructive/35 bg-destructive/10 p-4">
              <div className="font-arcade text-xs text-destructive/90">TUTOR LAUNCH BLOCKERS</div>
              <div className="space-y-2">
                {preflightBlockers.map((blocker, index) => (
                  <div key={`${blocker.code || blocker.message}-${index}`} className="font-terminal text-sm text-destructive/90">
                    {blocker.message}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <details className="border border-primary/20 bg-black/35">
        <summary className="cursor-pointer px-4 py-3 font-arcade text-xs text-primary">
          WORKFLOW CONTEXT
        </summary>
        <div className="space-y-4 border-t border-primary/15 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="border border-primary/15 bg-black/30 p-3">
              <div className="font-arcade text-ui-2xs text-primary/80">WORKFLOW</div>
              <div className="mt-2 break-all font-terminal text-sm text-foreground">
                {truncateWorkflowId(workflow?.workflow_id)}
              </div>
            </div>
            <div className="border border-primary/15 bg-black/30 p-3">
              <div className="font-arcade text-ui-2xs text-primary/80">LAST UPDATED</div>
              <div className="mt-2 font-terminal text-sm text-foreground">
                {formatWorkflowDate(workflow?.updated_at)}
              </div>
            </div>
            <div className="border border-primary/15 bg-black/30 p-3">
              <div className="font-arcade text-ui-2xs text-primary/80">STATUS</div>
              <div className="mt-2 font-terminal text-sm text-foreground">
                {formatWorkflowStatus(workflow?.status)}
              </div>
            </div>
            <div className="border border-primary/15 bg-black/30 p-3">
              <div className="font-arcade text-ui-2xs text-primary/80">OBSIDIAN TARGET</div>
              <div className="mt-2 break-all font-terminal text-xs text-foreground">
                {vaultFolderPreview || "Select a class to derive the folder path."}
              </div>
            </div>
          </div>
        </div>
      </details>

      {renderStepFooter()}
    </div>
  );

  const materialsContent = (
    <div className="space-y-4">
      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <CardTitle className="font-arcade text-xs text-primary">MATERIALS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="border border-primary/15 bg-black/30 p-4 font-terminal text-sm text-muted-foreground">
            Scope the actual source materials for this study unit here. Priming and Tutor both use this exact
            list, so this is the place to keep the coverage honest.
          </div>
          <MaterialSelector
            courseId={courseId}
            selectedMaterials={selectedMaterials}
            setSelectedMaterials={setSelectedMaterials}
          />
        </CardContent>
      </Card>

      {renderStepFooter()}
    </div>
  );

  const methodsContent = (
    <div className="space-y-4">
      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">PRIMING METHODS</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Pick the methods that cover the whole module. Do not cherry-pick narrow examples unless the
                selected method itself is broad enough to cover the full scope.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
              {primingMethods.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {primeMethodsLoading ? (
            <div className="flex items-center gap-2 border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading PRIME methods...
            </div>
          ) : primeMethodsError ? (
            <div className="border border-destructive/35 bg-destructive/10 p-3 font-terminal text-sm text-destructive/90">
              Failed to load PRIME methods.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {primeMethods.map((method) => {
                const methodId = method.method_id || "";
                const selected = primingMethods.includes(methodId);
                return (
                  <div
                    key={method.id}
                    className={cn(
                      "border p-2 transition-colors",
                      selected ? "border-primary/40 bg-primary/10" : "border-primary/15 bg-black/25",
                    )}
                  >
                    <MethodBlockCard block={method} compact onClick={() => togglePrimingMethod(methodId)} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 border border-primary/20 bg-black/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-arcade text-xs text-primary">EXTRACT PRIME</div>
                <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                  Run the currently selected PRIME methods on the materials in scope. The results open in the
                  next step.
                </p>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                {selectedMaterials.length} sources
              </Badge>
            </div>
            <div className="font-terminal text-sm text-muted-foreground">{extractBlockerText}</div>
            <Button
              type="button"
              onClick={() => {
                onRunAssistForSelected();
                setActiveStepId("outputs");
              }}
              disabled={selectedMaterials.length === 0 || primingMethods.length === 0 || isRunningAssist}
              className="rounded-none font-arcade text-ui-2xs"
            >
              {isRunningAssist ? (
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-3.5 w-3.5" />
              )}
              EXTRACT PRIME
            </Button>
          </div>
        </CardContent>
      </Card>

      {renderStepFooter()}
    </div>
  );

  const outputsContent = (
    <div className="space-y-4">
      {selectedMethodRuns.length > 0 ? (
        <Card className="rounded-none border-primary/20 bg-black/35">
          <CardHeader className="border-b border-primary/15 pb-3">
            <CardTitle className="font-arcade text-xs text-primary">SELECTED PRIME METHOD WINDOWS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {selectedMethodRuns.map(({ methodId, block, run, entries }) => (
              <div key={methodId} className="space-y-4 border border-primary/15 bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-arcade text-xs text-primary">
                      {block?.name || run?.method_name || methodId}
                    </div>
                    <p className={`${TEXT_MUTED} mt-1 text-xs`}>
                      Outputs for the methods currently selected in this Priming pass.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                    {entries.length > 0 ? `${entries.length} source${entries.length === 1 ? "" : "s"}` : "Queued"}
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
                        <div
                          key={`${methodId}-${materialId ?? index}`}
                          className="space-y-3 border border-primary/15 bg-black/25 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-words font-terminal text-sm text-foreground">{sourceTitle}</div>
                              {sourcePath ? (
                                <div className="mt-1 break-all font-terminal text-ui-xs text-muted-foreground">
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
                          {renderMethodOutput(entry)}
                        </div>
                      );
                    })}
                  </div>
                ) : run && Object.keys(run.outputs || {}).length > 0 ? (
                  renderMethodOutput(run.outputs as Record<string, unknown>)
                ) : (
                  <div className="font-terminal text-sm text-muted-foreground">
                    No output for this method yet. Run Extract PRIME in the previous step.
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {objectiveItems.length > 0 ? (
        <Card className="rounded-none border-primary/20 bg-black/35">
          <CardHeader className="border-b border-primary/15 pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-arcade text-xs text-primary">EXISTING STUDY-UNIT OBJECTIVES</CardTitle>
                <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                  These objectives already exist on the selected study unit and will be available to Tutor.
                </p>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                {objectiveItems.length} ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">{renderObjectives(objectiveItems)}</CardContent>
        </Card>
      ) : null}

      {nonSelectedExtractedMethodRuns.length > 0 ? (
        <Card className="rounded-none border-primary/20 bg-black/35">
          <CardHeader className="border-b border-primary/15 pb-3">
            <CardTitle className="font-arcade text-xs text-primary">ALREADY EXTRACTED PRIME METHODS</CardTitle>
            <p className={`${TEXT_MUTED} mt-2 text-xs`}>
              These outputs already exist on the selected materials but are not part of the method set
              currently queued for the next extract.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
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
                    {entries.length > 0 ? `${entries.length} source${entries.length === 1 ? "" : "s"}` : "Saved"}
                  </Badge>
                </div>

                {entries.length > 0 ? (
                  <div className="space-y-3">
                    {entries.map((entry, index) => (
                      <div
                        key={`existing-${methodId}-${index}`}
                        className="space-y-3 border border-primary/15 bg-black/25 p-4"
                      >
                        {renderMethodOutput(entry)}
                      </div>
                    ))}
                  </div>
                ) : run && Object.keys(run.outputs || {}).length > 0 ? (
                  renderMethodOutput(run.outputs as Record<string, unknown>)
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {hasLegacyPrimeOutputs && primingMethodRuns.length === 0 ? (
        <details className="border border-primary/20 bg-black/35">
          <summary className="cursor-pointer px-4 py-3 font-arcade text-xs text-primary">
            LEGACY PRIME OUTPUTS
          </summary>
          <div className="grid gap-4 border-t border-primary/15 p-4 lg:grid-cols-2">
            <div className="space-y-4">
              {summaryText.trim() ? (
                <div>
                  <div className="font-arcade text-ui-2xs text-primary/80">Summary</div>
                  <div className="mt-2 border border-primary/15 bg-black/30 p-4">
                    <ObsidianRenderer content={summaryText} />
                  </div>
                </div>
              ) : null}
              {conceptsText.trim()
                ? renderTextList("Study Spine", conceptsText.split(/\r?\n/).filter(Boolean))
                : null}
              {terminologyText.trim()
                ? renderTextList("Terminology", terminologyText.split(/\r?\n/).filter(Boolean))
                : null}
            </div>
            <div className="space-y-4">
              {rootExplanationText.trim() ? renderMethodOutput({ map: rootExplanationText }) : null}
              {gapsText.trim() ? renderTextList("Ambiguities", gapsText.split(/\r?\n/).filter(Boolean)) : null}
            </div>
          </div>
        </details>
      ) : null}

      <div className="border border-primary/15 bg-black/35 p-4">
        <div className="font-arcade text-ui-2xs text-primary/80">PRIME BOUNDARY</div>
        <div className="mt-2 font-terminal text-sm text-muted-foreground">
          Need root mechanism understanding? That belongs to TEACH after PRIME finishes structure. Keep
          Priming focused on orientation, scope, and handoff quality.
        </div>
      </div>

      {renderStepFooter()}
    </div>
  );

  const handoffContent = (
    <div className="space-y-4">
      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-arcade text-xs text-primary">TUTOR HANDOFF</CardTitle>
              <p className={`${TEXT_MUTED} mt-2 text-xs`}>
                Choose the Tutor chain, refine the handoff notes, then save or launch when the contract is ready.
              </p>
            </div>
            <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
              {tutorLaunchDisabled ? "NOT READY" : "READY"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-3 border border-primary/20 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-arcade text-xs text-primary">TUTOR CHAIN</div>
                <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                  This applies to the Tutor session launch, not to the Priming extraction.
                </div>
              </div>
              <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                {tutorChainSummary}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { key: "template" as const, label: "PRE-BUILT", icon: Link2 },
                { key: "custom" as const, label: "CUSTOM", icon: Cpu },
                { key: "auto" as const, label: "AUTO", icon: Wand2 },
              ].map((option) => {
                const Icon = option.icon;
                const active = chainMode === option.key;
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
                    className={cn(
                      "border-2 p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-primary/20 bg-black/35 text-muted-foreground hover:border-primary/35",
                    )}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <div className="font-arcade text-ui-2xs">{option.label}</div>
                  </button>
                );
              })}
            </div>

            {chainMode === "template" ? (
              templateChainsLoading ? (
                <div className="flex items-center gap-2 border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading template chains...
                </div>
              ) : templateChains.length === 0 ? (
                <div className="border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                  No template Tutor chains are available yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {templateChains.map((chain) => {
                    const selected = chain.id === chainId;
                    const stageCounts = summarizeTemplateChain(chain);
                    return (
                      <button
                        key={chain.id}
                        type="button"
                        onClick={() => setChainId(selected ? undefined : chain.id)}
                        className={cn(
                          "w-full border-2 px-3 py-2 text-left transition-colors",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-primary/15 bg-black/25 hover:border-primary/30 hover:bg-primary/5",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-terminal text-sm text-foreground">{chain.name}</span>
                          <Badge variant="outline" className="rounded-none border-primary/25 text-primary/80">
                            {chain.blocks.length} blocks
                          </Badge>
                        </div>
                        <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                          {chain.description || "No chain description"}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(stageCounts).map(([stage, count]) => {
                            const color = CATEGORY_COLORS[stage] || "#999999";
                            return (
                              <span
                                key={`${chain.id}-${stage}`}
                                className="border px-1 py-0.5 font-terminal text-ui-2xs"
                                style={{ borderColor: `${color}55`, color }}
                              >
                                {count} {getMethodStageBadgeLabel({ control_stage: stage })}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : null}

            {chainMode === "custom" ? (
              <TutorChainBuilder selectedBlockIds={customBlockIds} setSelectedBlockIds={setCustomBlockIds} />
            ) : null}

            {chainMode === "auto" ? (
              <div className="border border-primary/15 bg-black/30 p-3 font-terminal text-sm text-muted-foreground">
                Auto launch lets Tutor choose the live teaching structure without a fixed chain.
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border border-primary/20 bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-arcade text-xs text-primary">HANDOFF NOTES</div>
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
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className={`${TEXT_MUTED} block text-xs`}>OPEN QUESTIONS / AMBIGUITIES</label>
                  <textarea
                    value={gapsText}
                    onChange={(event) => setGapsText(event.target.value)}
                    placeholder="List open questions, weak evidence, or unresolved ambiguities."
                    className={`${INPUT_BASE} min-h-[10rem] resize-y`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`${TEXT_MUTED} block text-xs`}>RECOMMENDED TUTOR STRATEGY</label>
                  <textarea
                    value={recommendedStrategyText}
                    onChange={(event) => setRecommendedStrategyText(event.target.value)}
                    placeholder="Optional guidance for Tutor pacing, focus, scaffold depth, or retrieval pressure."
                    className={`${INPUT_BASE} min-h-[10rem] resize-y`}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="border border-primary/15 bg-black/25 p-3">
                  <div className="font-arcade text-ui-2xs text-primary/80">OPEN QUESTIONS / AMBIGUITIES</div>
                  <div className="mt-2 font-terminal whitespace-pre-wrap text-sm text-foreground/90">
                    {renderPreview(gapsText, "No open questions or ambiguities captured yet.")}
                  </div>
                </div>
                <div className="border border-primary/15 bg-black/25 p-3">
                  <div className="font-arcade text-ui-2xs text-primary/80">RECOMMENDED TUTOR STRATEGY</div>
                  <div className="mt-2 font-terminal whitespace-pre-wrap text-sm text-foreground/90">
                    {renderPreview(recommendedStrategyText, "No Tutor strategy note captured yet.")}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 border border-primary/20 bg-black/30 p-4">
            <div className="font-arcade text-xs text-primary">TUTOR HANDOFF STATUS</div>
            <div className="font-terminal text-sm text-foreground">
              {tutorLaunchDisabled
                ? "Tutor is still blocked. Finish the launch contract and resolve the blockers before starting a session."
                : "The handoff packet is ready. You can launch Tutor from here."}
            </div>
            {preflightBlockers.length > 0 ? (
              <div className="space-y-2 border border-destructive/35 bg-destructive/10 p-3">
                <div className="font-arcade text-ui-2xs text-destructive/90">CURRENT BLOCKERS</div>
                {preflightBlockers.map((blocker, index) => (
                  <div
                    key={`handoff-${blocker.code || blocker.message}-${index}`}
                    className="font-terminal text-sm text-destructive/90"
                  >
                    {blocker.message}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={onBackToLaunch}
              >
                BACK TO LAUNCH
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={onSaveDraft}
                disabled={isSaving}
              >
                <Save className="mr-2 h-3.5 w-3.5" />
                {isSaving ? "SAVING..." : "SAVE DRAFT"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none font-arcade text-ui-2xs"
                onClick={onMarkReady}
                disabled={isSaving || tutorLaunchDisabled}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                MARK READY
              </Button>
              <Button
                type="button"
                className="rounded-none font-arcade text-ui-2xs"
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

      <Card className="rounded-none border-primary/20 bg-black/35">
        <CardHeader className="border-b border-primary/15 pb-3">
          <CardTitle className="font-arcade text-xs text-primary">TUTOR WILL RECEIVE</CardTitle>
          <p className={`${TEXT_MUTED} mt-2 text-xs`}>
            Preview of the data packet that will be passed to your Tutor session.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {(() => {
            const truncate = (text: string, max = 100): string => {
              const trimmed = text.trim();
              if (trimmed.length === 0) return "";
              return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
            };

            const selectedChainName =
              chainMode === "template" && selectedTemplateChain
                ? selectedTemplateChain.name
                : chainMode === "custom" && customBlockIds.length > 0
                  ? `Custom chain (${customBlockIds.length} blocks)`
                  : "Auto-selected";

            const fields: Array<{
              label: string;
              value: string;
              warning: string;
              isTruncated?: boolean;
            }> = [
              { label: "Topic", value: topic, warning: "Not set" },
              { label: "Study Unit", value: selectedObjectiveGroup, warning: "Not set" },
              {
                label: "Materials",
                value:
                  selectedMaterials.length > 0
                    ? `${selectedMaterials.length} material${selectedMaterials.length === 1 ? "" : "s"} in scope`
                    : "",
                warning: "No materials selected",
              },
              { label: "Chain", value: selectedChainName, warning: "" },
              {
                label: "Summary",
                value: truncate(summaryText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
              {
                label: "Key Concepts",
                value: truncate(conceptsText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
              {
                label: "Terminology",
                value: truncate(terminologyText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
              {
                label: "Root Explanation",
                value: truncate(rootExplanationText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
              {
                label: "Gaps",
                value: truncate(gapsText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
              {
                label: "Strategy",
                value: truncate(recommendedStrategyText),
                warning: "Not provided \u2014 Tutor will start without this",
                isTruncated: true,
              },
            ];

            return fields.map((field) => (
              <div key={field.label} className="flex items-start gap-3 border-b border-primary/10 pb-2 last:border-b-0 last:pb-0">
                <div className={`${TEXT_MUTED} w-28 shrink-0 text-xs`}>{field.label}</div>
                <div className="min-w-0 flex-1">
                  {field.value ? (
                    <div className="font-mono text-sm text-foreground/80">{field.value}</div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-sm">{field.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>

      {renderStepFooter()}
    </div>
  );

  const activeContent =
    activeStepId === "setup"
      ? setupContent
      : activeStepId === "materials"
        ? materialsContent
        : activeStepId === "methods"
          ? methodsContent
          : activeStepId === "outputs"
            ? outputsContent
            : handoffContent;

  return (
    <PrimingLayout
      steps={steps}
      activeStepId={activeStepId}
      activeContent={activeContent}
      sourceViewer={activeStepId === "setup" ? undefined : sourceViewer}
      headingRef={headingRef}
      onStepChange={setActiveStepId}
    />
  );
}
