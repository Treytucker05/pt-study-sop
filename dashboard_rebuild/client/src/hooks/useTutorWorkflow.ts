import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TutorWorkflowDetailResponse,
  TutorWorkflowSummary,
} from "@/lib/api";
import type {
  TutorPolishBundleRequest,
  TutorPrimingMethodRun,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";
import type { TutorPrimingReadinessItem } from "@/components/TutorWorkflowPrimingPanel";
import type { TutorWorkflowLaunchFilters } from "@/components/TutorWorkflowLaunchHub";
import type { ChatMessage } from "@/components/TutorChat.types";
import {
  parseLinesToRecords,
  recordsToMultilineText,
  formatSourceBlockText,
  formatSourceLineText,
  mergePrimingSourceInventory,
  resolveStudioViewFromWorkflowStage,
} from "@/lib/tutorUtils";
import type { TutorPageMode, TutorStudioView } from "@/lib/tutorUtils";
import { toast } from "sonner";
import type { UseTutorHubReturn } from "./useTutorHub";
import type { UseTutorSessionReturn } from "./useTutorSession";

export interface UseTutorWorkflowParams {
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  activeSessionId: string | null;
  shellMode: TutorPageMode;
  setShellMode: (mode: TutorPageMode) => void;
  hasRestored: boolean;
}

type PrimingObjectiveRecord = {
  lo_code?: string;
  title: string;
  status?: string;
  group?: string;
};

const LEGACY_PRIMING_METHOD_MAP: Record<string, string> = {
  summary_first: "M-PRE-013",
  learning_objectives: "M-PRE-010",
  concept_mapping: "M-PRE-005",
  weak_point_surfacing: "M-PRE-014",
  terminology_extraction: "M-PRE-012",
};

const DEFAULT_PRIMING_METHOD_IDS = ["M-PRE-010", "M-PRE-008"];
const PRIME_OBJECTIVE_METHOD_IDS = new Set(["M-PRE-010"]);
const PRIME_STRUCTURAL_METHOD_IDS = new Set(["M-PRE-004", "M-PRE-005", "M-PRE-006", "M-PRE-008", "M-PRE-009"]);

function normalizePrimingMethodId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (/^M-PRE-\d{3}$/.test(upper)) return upper;
  if (trimmed.toLowerCase() === "root_understanding") return null;
  return LEGACY_PRIMING_METHOD_MAP[trimmed.toLowerCase()] || null;
}

function normalizePrimingMethods(value: unknown, legacyValue?: string | null): string[] {
  const raw = Array.isArray(value) ? value : [];
  const normalized = raw
    .map(normalizePrimingMethodId)
    .filter((item): item is string => typeof item === "string" && item.length > 0);
  if (normalized.length > 0) {
    return Array.from(new Set(normalized));
  }
  const legacy = normalizePrimingMethodId(legacyValue);
  if (legacy) return [legacy];
  return [...DEFAULT_PRIMING_METHOD_IDS];
}

function dedupePrimingObjectives(records: PrimingObjectiveRecord[]): PrimingObjectiveRecord[] {
  const seen = new Set<string>();
  const result: PrimingObjectiveRecord[] = [];
  for (const record of records) {
    const title = String(record.title || "").trim();
    const loCode = typeof record.lo_code === "string" ? record.lo_code.trim() : "";
    if (!title) continue;
    const key = `${loCode.toLowerCase()}::${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...(loCode ? { lo_code: loCode } : {}),
      title,
      ...(typeof record.status === "string" && record.status.trim()
        ? { status: record.status.trim() }
        : {}),
      ...(typeof record.group === "string" && record.group.trim()
        ? { group: record.group.trim() }
        : {}),
    });
  }
  return result;
}

function normalizePrimingMethodRuns(value: unknown): TutorPrimingMethodRun[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const run = item as Record<string, unknown>;
      const methodId = normalizePrimingMethodId(run.method_id);
      if (!methodId) return null;
      return {
        method_id: methodId,
        method_name: typeof run.method_name === "string" && run.method_name.trim().length > 0 ? run.method_name.trim() : methodId,
        output_family:
          typeof run.output_family === "string" && run.output_family.trim().length > 0
            ? run.output_family.trim()
            : "notes",
        outputs: run.outputs && typeof run.outputs === "object" ? (run.outputs as Record<string, unknown>) : {},
        source_ids: Array.isArray(run.source_ids)
          ? run.source_ids.filter((entry): entry is number => typeof entry === "number")
          : [],
        status: typeof run.status === "string" && run.status.trim().length > 0 ? run.status.trim() : "complete",
        updated_at: typeof run.updated_at === "string" ? run.updated_at : null,
      } satisfies TutorPrimingMethodRun;
    })
    .filter((item): item is TutorPrimingMethodRun => item !== null);
}

function buildPrimingMethodRunsFromInventory(
  sourceInventory: TutorPrimingSourceInventoryItem[],
  selectedMethodIds: string[] = [],
): TutorPrimingMethodRun[] {
  const discoveredMethodIds = sourceInventory.flatMap((item) =>
    (item.method_outputs || [])
      .map((run) => normalizePrimingMethodId(run.method_id))
      .filter((value): value is string => Boolean(value)),
  );
  const methodIds = [
    ...selectedMethodIds,
    ...discoveredMethodIds.filter((methodId) => !selectedMethodIds.includes(methodId)),
  ];

  return methodIds.map((methodId) => {
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
      );
    return {
      method_id: methodId,
      method_name:
        (sourceInventory
          .flatMap((item) => item.method_outputs || [])
          .find((run) => run.method_id === methodId)?.method_name || methodId),
      output_family:
        (sourceInventory
          .flatMap((item) => item.method_outputs || [])
          .find((run) => run.method_id === methodId)?.output_family || "notes"),
      outputs: { entries },
      source_ids: entries
        .map((entry) => entry.material_id)
        .filter((value): value is number => typeof value === "number"),
      status: entries.length > 0 ? "complete" : "pending",
      updated_at:
        sourceInventory
          .flatMap((item) => item.method_outputs || [])
          .find((run) => run.method_id === methodId)?.updated_at || null,
    };
  });
}

export function useTutorWorkflow({
  hub,
  session,
  activeSessionId,
  shellMode,
  setShellMode,
  hasRestored,
}: UseTutorWorkflowParams) {
  const queryClient = useQueryClient();

  // ─── Workflow view state ───
  const [studioView, setStudioView] = useState<TutorStudioView>("workbench");
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowFilters, setWorkflowFilters] = useState<TutorWorkflowLaunchFilters>({
    search: "",
    courseId: "all",
    stage: "all",
    status: "all",
    dueBucket: "all",
  });
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [bootstrappingPriming, setBootstrappingPriming] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);
  const [savingPrimingBundle, setSavingPrimingBundle] = useState(false);
  const [savingPolishBundle, setSavingPolishBundle] = useState(false);

  // ─── PRIME artifact states ───
  const [primingMethods, setPrimingMethods] = useState<string[]>(DEFAULT_PRIMING_METHOD_IDS);
  const [primingMethodRuns, setPrimingMethodRuns] = useState<TutorPrimingMethodRun[]>([]);
  const [primingSummaryText, setPrimingSummaryText] = useState("");
  const [primingConceptsText, setPrimingConceptsText] = useState("");
  const [primingTerminologyText, setPrimingTerminologyText] = useState("");
  const [primingRootExplanationText, setPrimingRootExplanationText] = useState("");
  const [primingGapsText, setPrimingGapsText] = useState("");
  const [primingStrategyText, setPrimingStrategyText] = useState("");
  const [primingSourceInventory, setPrimingSourceInventory] = useState<
    TutorPrimingSourceInventoryItem[]
  >([]);
  const [runningPrimingAssist, setRunningPrimingAssist] = useState(false);
  const [primingAssistTargetMaterialId, setPrimingAssistTargetMaterialId] = useState<number | null>(
    null,
  );

  // ─── Note capture states ───
  const [exactNoteTitle, setExactNoteTitle] = useState("");
  const [exactNoteContent, setExactNoteContent] = useState("");
  const [editableNoteTitle, setEditableNoteTitle] = useState("");
  const [editableNoteContent, setEditableNoteContent] = useState("");
  const [feedbackSentiment, setFeedbackSentiment] = useState<"liked" | "disliked">("liked");
  const [feedbackIssueType, setFeedbackIssueType] = useState("good");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [memorySummaryText, setMemorySummaryText] = useState("");
  const [memoryWeakPointsText, setMemoryWeakPointsText] = useState("");
  const [memoryUnresolvedText, setMemoryUnresolvedText] = useState("");
  const [memoryCardRequestsText, setMemoryCardRequestsText] = useState("");
  const [savingRuntimeEvent, setSavingRuntimeEvent] = useState(false);
  const hydratedWorkflowIdRef = useRef<string | null>(null);
  const primingBootstrapInFlightRef = useRef(false);
  const studioPrimingBootstrapContextRef = useRef<{
    courseId?: number;
    topic: string;
    selectedMaterials: number[];
    selectedPaths: string[];
    selectedObjectiveGroup: string;
    selectedObjectiveId: string;
    objectiveScope: TutorObjectiveScope;
  } | null>(null);

  // ─── Workflow list query ───
  const { data: workflowListResponse } = useQuery({
    queryKey: [
      "tutor-workflows",
      workflowFilters.courseId,
      workflowFilters.stage,
      workflowFilters.status,
    ],
    queryFn: () =>
      api.tutor.listWorkflows({
        ...(typeof workflowFilters.courseId === "number"
          ? { course_id: workflowFilters.courseId }
          : {}),
        ...(workflowFilters.stage !== "all" ? { stage: workflowFilters.stage } : {}),
        ...(workflowFilters.status !== "all" ? { status: workflowFilters.status } : {}),
        limit: 50,
      }),
    enabled: hasRestored && shellMode === "launch",
    staleTime: 15 * 1000,
  });

  const workflows = workflowListResponse?.items || [];

  const filteredWorkflows = useMemo(() => {
    const now = Date.now();
    const search = workflowFilters.search.trim().toLowerCase();
    return workflows
      .filter((workflow) => {
        if (!search) return true;
        return [
          workflow.course_name,
          workflow.course_code,
          workflow.assignment_title,
          workflow.study_unit,
          workflow.topic,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .filter((workflow) => {
        if (workflowFilters.dueBucket === "all") return true;
        if (!workflow.due_date) return workflowFilters.dueBucket === "undated";
        const dueTime = new Date(workflow.due_date).getTime();
        if (!Number.isFinite(dueTime)) return workflowFilters.dueBucket === "undated";
        if (workflowFilters.dueBucket === "overdue") return dueTime < now;
        if (workflowFilters.dueBucket === "upcoming") return dueTime >= now;
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return bTime - aTime;
      });
  }, [workflowFilters.dueBucket, workflowFilters.search, workflows]);

  // ─── Workflow detail query ───
  const { data: activeWorkflowDetail } = useQuery<TutorWorkflowDetailResponse>({
    queryKey: ["tutor-workflow-detail", activeWorkflowId],
    queryFn: () => api.tutor.getWorkflow(activeWorkflowId!),
    enabled: Boolean(activeWorkflowId),
    staleTime: 15 * 1000,
  });

  // ─── Hydrate from workflow detail ───
  useEffect(() => {
    if (!activeWorkflowDetail?.workflow) return;
    const workflowId = activeWorkflowDetail.workflow.workflow_id;
    if (hydratedWorkflowIdRef.current === workflowId) return;
    hydratedWorkflowIdRef.current = workflowId;

    const workflow = activeWorkflowDetail.workflow;
    const primingBundle = activeWorkflowDetail.priming_bundle;
    const bundledObjectives = Array.isArray(primingBundle?.learning_objectives)
      ? primingBundle.learning_objectives
      : [];
    const firstObjectiveCode =
      bundledObjectives.length === 1 &&
      typeof bundledObjectives[0]?.lo_code === "string"
        ? bundledObjectives[0].lo_code
        : "";
    const preservedContext = studioPrimingBootstrapContextRef.current;

    hub.setCourseId(
      primingBundle?.course_id ?? workflow.course_id ?? preservedContext?.courseId ?? undefined,
    );
    hub.setTopic(primingBundle?.topic ?? workflow.topic ?? preservedContext?.topic ?? "");
    hub.setSelectedMaterials(primingBundle?.selected_material_ids ?? preservedContext?.selectedMaterials ?? []);
    hub.setSelectedPaths(primingBundle?.selected_paths ?? preservedContext?.selectedPaths ?? []);
    hub.setSelectedObjectiveGroup(
      primingBundle?.study_unit ?? workflow.study_unit ?? preservedContext?.selectedObjectiveGroup ?? "",
    );
    hub.setObjectiveScope(
      firstObjectiveCode
        ? "single_focus"
        : preservedContext?.objectiveScope ?? "module_all",
    );
    hub.setSelectedObjectiveId(firstObjectiveCode || preservedContext?.selectedObjectiveId || "");
    studioPrimingBootstrapContextRef.current = null;
    const normalizedBundleMethods = normalizePrimingMethods(
      primingBundle?.priming_methods,
      primingBundle?.priming_method,
    );
    const normalizedBundleMethodRuns = normalizePrimingMethodRuns(primingBundle?.priming_method_runs);
    setPrimingMethods(normalizedBundleMethods);
    setPrimingMethodRuns(
      normalizedBundleMethodRuns.length > 0
        ? normalizedBundleMethodRuns
        : buildPrimingMethodRunsFromInventory(
            Array.isArray(primingBundle?.source_inventory) ? primingBundle.source_inventory : [],
          ),
    );
    setPrimingSourceInventory(
      Array.isArray(primingBundle?.source_inventory) ? primingBundle.source_inventory : [],
    );
    setPrimingSummaryText(recordsToMultilineText(primingBundle?.summaries, ["summary", "text"]));
    setPrimingConceptsText(recordsToMultilineText(primingBundle?.concepts, ["concept", "name", "text"]));
    setPrimingTerminologyText(recordsToMultilineText(primingBundle?.terminology, ["term", "name", "text"]));
    setPrimingRootExplanationText(
      recordsToMultilineText(primingBundle?.root_explanations, ["text", "summary", "title"]),
    );
    setPrimingGapsText(recordsToMultilineText(primingBundle?.identified_gaps, ["gap", "text", "question"]));
    setPrimingStrategyText(
      typeof primingBundle?.recommended_tutor_strategy?.note === "string"
        ? primingBundle.recommended_tutor_strategy.note
        : "",
    );
  }, [
    activeWorkflowDetail,
    hub,
  ]);

  // ─── Merged priming source inventory ───
  const mergedPrimingSourceInventory = useMemo(
    () => mergePrimingSourceInventory(hub.selectedMaterials, hub.chatMaterials, primingSourceInventory),
    [hub.chatMaterials, primingSourceInventory, hub.selectedMaterials],
  );

  const derivedPrimingMethodRuns = useMemo(() => {
    if (primingMethodRuns.length > 0) return primingMethodRuns;
    return buildPrimingMethodRunsFromInventory(mergedPrimingSourceInventory);
  }, [mergedPrimingSourceInventory, primingMethodRuns]);

  // ─── PRIME readiness ───
  const primingReadinessItems = useMemo<TutorPrimingReadinessItem[]>(() => {
    const extractedObjectiveCount = mergedPrimingSourceInventory.flatMap(
      (item) => item.priming_output?.learning_objectives || [],
    ).length;
    const approvedObjectiveCount = hub.scopedObjectives.length;
    const hasStudyUnit = hub.selectedObjectiveGroup.trim().length > 0;
    const hasApprovedObjectives = approvedObjectiveCount > 0;
    const hasObjectiveMethod = derivedPrimingMethodRuns.some(
      (run) =>
        PRIME_OBJECTIVE_METHOD_IDS.has(run.method_id) &&
        Array.isArray((run.outputs as Record<string, unknown>).entries) &&
        ((run.outputs as Record<string, unknown>).entries as unknown[]).length > 0,
    );
    const hasObjectives = hasApprovedObjectives || extractedObjectiveCount > 0 || hasObjectiveMethod;
    const hasStructuralMethod = derivedPrimingMethodRuns.some(
      (run) =>
        PRIME_STRUCTURAL_METHOD_IDS.has(run.method_id) &&
        Array.isArray((run.outputs as Record<string, unknown>).entries) &&
        ((run.outputs as Record<string, unknown>).entries as unknown[]).length > 0,
    );
    return [
      {
        label: "Study unit selected",
        ready: hasStudyUnit,
        detail: hasStudyUnit
          ? hub.selectedObjectiveGroup
          : "Choose the study unit before handing PRIME off to Tutor.",
      },
      {
        label: "Materials loaded",
        ready: hub.selectedMaterials.length > 0,
        detail:
          hub.selectedMaterials.length > 0
            ? `${hub.selectedMaterials.length} source materials selected`
            : "Add at least one source material.",
      },
      {
        label: "Learning objectives captured",
        ready: hasObjectives,
        detail: hasApprovedObjectives
          ? `${approvedObjectiveCount} approved objective${approvedObjectiveCount === 1 ? "" : "s"} for ${hub.selectedObjectiveGroup || "the selected study unit"}`
          : extractedObjectiveCount > 0
            ? `${extractedObjectiveCount} extracted objective candidate${extractedObjectiveCount === 1 ? "" : "s"}`
            : "Use existing study-unit objectives or run Learning Objectives Primer.",
      },
      {
        label: "Structural organizer captured",
        ready: hasStructuralMethod,
        detail:
          hasStructuralMethod
            ? "At least one structural PRIME method produced a study scaffold."
            : "Run a structural PRIME method such as Hierarchical Advance Organizer or Structural Extraction.",
      },
    ];
  }, [
    derivedPrimingMethodRuns,
    mergedPrimingSourceInventory,
    hub.scopedObjectives.length,
    hub.selectedMaterials.length,
    hub.selectedObjectiveGroup,
  ]);

  // ─── Reset priming draft ───
  const resetPrimingArtifacts = useCallback(() => {
    hydratedWorkflowIdRef.current = null;
    setPrimingMethods([...DEFAULT_PRIMING_METHOD_IDS]);
    setPrimingMethodRuns([]);
    setPrimingSummaryText("");
    setPrimingConceptsText("");
    setPrimingTerminologyText("");
    setPrimingRootExplanationText("");
    setPrimingGapsText("");
    setPrimingStrategyText("");
    setPrimingSourceInventory([]);
    setRunningPrimingAssist(false);
    setPrimingAssistTargetMaterialId(null);
  }, []);

  const resetPrimingDraft = useCallback(() => {
    hydratedWorkflowIdRef.current = null;
    studioPrimingBootstrapContextRef.current = null;
    hub.setCourseId(undefined);
    hub.setSelectedMaterials([]);
    hub.setSelectedPaths([]);
    hub.setTopic("");
    hub.setVaultFolder("");
    hub.setSelectedObjectiveGroup("");
    hub.setSelectedObjectiveId("");
    hub.setObjectiveScope("module_all");
    resetPrimingArtifacts();
  }, [hub, resetPrimingArtifacts]);

  // ─── Build priming bundle payload ───
  const buildPrimingBundlePayload = useCallback(() => {
    const learningObjectives = dedupePrimingObjectives(
      hub.scopedObjectives.length > 0
        ? hub.scopedObjectives.map((objective) => ({
            ...(objective.loCode ? { lo_code: objective.loCode } : {}),
            title: objective.title,
            status: objective.status,
            group: objective.groupName || undefined,
          }))
        : mergedPrimingSourceInventory.flatMap((item) =>
            (item.priming_output?.learning_objectives || []).map((objective) => ({
              ...(typeof objective.lo_code === "string" && objective.lo_code.trim()
                ? { lo_code: objective.lo_code.trim() }
                : {}),
              title: objective.title,
              status: "active",
              group: hub.selectedObjectiveGroup || undefined,
            })),
          ),
    );

    const readinessBlockers = primingReadinessItems
      .filter((item) => !item.ready)
      .map((item) => ({ label: item.label, detail: item.detail }));

    return {
      course_id: hub.courseId ?? null,
      study_unit: hub.selectedObjectiveGroup || null,
      topic: hub.topic || null,
      selected_material_ids: hub.selectedMaterials,
      selected_paths: hub.selectedPaths,
      source_inventory: mergedPrimingSourceInventory,
      priming_methods: primingMethods,
      priming_method: primingMethods[0] || null,
      priming_method_runs: derivedPrimingMethodRuns,
      learning_objectives: learningObjectives,
      concepts: parseLinesToRecords(primingConceptsText, "concept"),
      concept_graph: {},
      terminology: parseLinesToRecords(primingTerminologyText, "term"),
      root_explanations: primingRootExplanationText.trim()
        ? [{ text: primingRootExplanationText.trim() }]
        : [],
      summaries: primingSummaryText.trim() ? [{ summary: primingSummaryText.trim() }] : [],
      identified_gaps: parseLinesToRecords(primingGapsText, "gap"),
      confidence_flags: {},
      readiness_status: readinessBlockers.length > 0 ? "blocked" : "ready",
      readiness_blockers: readinessBlockers,
      recommended_tutor_strategy: primingStrategyText.trim()
        ? { note: primingStrategyText.trim() }
        : {},
    };
  }, [
    hub.courseId,
    mergedPrimingSourceInventory,
    primingConceptsText,
    primingGapsText,
    primingMethods,
    derivedPrimingMethodRuns,
    primingReadinessItems,
    primingRootExplanationText,
    primingStrategyText,
    primingSummaryText,
    primingTerminologyText,
    hub.scopedObjectives,
    hub.selectedMaterials,
    hub.selectedObjectiveGroup,
    hub.selectedPaths,
    hub.topic,
  ]);

  // ─── Save priming ───
  const saveWorkflowPriming = useCallback(
    async (mode: "draft" | "ready") => {
      if (!activeWorkflowId) {
        toast.error("Start or open a study plan before saving priming.");
        return false;
      }
      setSavingPrimingBundle(true);
      try {
        const payload = buildPrimingBundlePayload();
        if (mode === "ready" && payload.readiness_blockers.length > 0) {
          toast.error("Resolve the priming blockers before marking the bundle ready.");
          return false;
        }
        await api.tutor.savePrimingBundle(activeWorkflowId, payload);
        await api.tutor.updateWorkflowStage(activeWorkflowId, {
          current_stage: "priming",
          status: mode === "ready" ? "priming_complete" : "priming_in_progress",
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
          queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] }),
        ]);
        toast.success(mode === "ready" ? "Priming bundle marked ready" : "Priming draft saved");
        return true;
      } catch (err) {
        toast.error(
          `Failed to save priming bundle: ${err instanceof Error ? err.message : "Unknown"}`,
        );
        return false;
      } finally {
        setSavingPrimingBundle(false);
      }
    },
    [activeWorkflowId, buildPrimingBundlePayload, queryClient],
  );

  // ─── Run priming assist ───
  const runWorkflowPrimingAssist = useCallback(
    async (materialIds: number[]) => {
      if (!activeWorkflowId) {
        toast.error("Open a study plan before running Priming Assist.");
        return;
      }
      if (materialIds.length === 0) {
        toast.error("Select at least one source material first.");
        return;
      }
      if (primingMethods.length === 0) {
        toast.error("Select at least one PRIME method before extraction.");
        return;
      }
      setRunningPrimingAssist(true);
      setPrimingAssistTargetMaterialId(materialIds.length === 1 ? materialIds[0] : null);
      try {
        const response = await api.tutor.runPrimingAssist(activeWorkflowId, {
          material_ids: materialIds,
          study_unit: hub.selectedObjectiveGroup || null,
          topic: hub.topic || null,
          priming_methods: primingMethods,
          priming_method: primingMethods[0] || null,
          source_inventory: mergedPrimingSourceInventory,
        });
        setPrimingSourceInventory(response.source_inventory);
        setPrimingMethodRuns(normalizePrimingMethodRuns(response.priming_method_runs));
        setPrimingSummaryText(formatSourceBlockText(response.aggregate.summaries, "summary"));
        setPrimingConceptsText(formatSourceLineText(response.aggregate.concepts, "concept"));
        setPrimingTerminologyText(formatSourceLineText(response.aggregate.terminology, "term"));
        setPrimingRootExplanationText(
          formatSourceBlockText(response.aggregate.root_explanations, "text"),
        );
        setPrimingGapsText(formatSourceLineText(response.aggregate.identified_gaps, "gap"));
        toast.success(
          materialIds.length === 1
            ? "Source-linked priming output refreshed"
            : "Priming Assist extracted source-linked outputs",
        );
      } catch (err) {
        toast.error(
          `Priming Assist failed: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      } finally {
        setRunningPrimingAssist(false);
        setPrimingAssistTargetMaterialId(null);
      }
    },
    [
      activeWorkflowId,
      mergedPrimingSourceInventory,
      primingMethods,
      hub.selectedObjectiveGroup,
      hub.topic,
    ],
  );

  // ─── Create workflow ───
  const createWorkflowAndOpenPriming = useCallback(async () => {
    setCreatingWorkflow(true);
    try {
      studioPrimingBootstrapContextRef.current = null;
      resetPrimingDraft();
      const result = await api.tutor.createWorkflow({
        current_stage: "priming",
        status: "priming_in_progress",
      });
      setActiveWorkflowId(result.workflow.workflow_id);
      setStudioView("priming");
      setShellMode("studio");
      await queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] });
      toast.success("New study plan created");
    } catch (err) {
      toast.error(
        `Failed to create study plan: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setCreatingWorkflow(false);
    }
  }, [queryClient, resetPrimingDraft, setShellMode]);

  const openStudioPriming = useCallback(async () => {
    if (activeWorkflowId) {
      setShellMode("studio");
      setStudioView("priming");
      return activeWorkflowId;
    }
    if (creatingWorkflow || primingBootstrapInFlightRef.current) {
      return null;
    }

    primingBootstrapInFlightRef.current = true;
    setBootstrappingPriming(true);
    try {
      studioPrimingBootstrapContextRef.current = {
        courseId: hub.courseId,
        topic: hub.topic,
        selectedMaterials: [...hub.selectedMaterials],
        selectedPaths: [...hub.selectedPaths],
        selectedObjectiveGroup: hub.selectedObjectiveGroup,
        selectedObjectiveId: hub.selectedObjectiveId,
        objectiveScope: hub.objectiveScope,
      };
      resetPrimingArtifacts();
      const result = await api.tutor.createWorkflow({
        current_stage: "priming",
        status: "priming_in_progress",
      });
      setActiveWorkflowId(result.workflow.workflow_id);
      setStudioView("priming");
      setShellMode("studio");
      await queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] });
      toast.success("Priming workspace ready");
      return result.workflow.workflow_id;
    } catch (err) {
      toast.error(
        `Failed to open Priming: ${err instanceof Error ? err.message : "Unknown"}`,
      );
      return null;
    } finally {
      primingBootstrapInFlightRef.current = false;
      setBootstrappingPriming(false);
    }
  }, [
    activeWorkflowId,
    creatingWorkflow,
    hub.courseId,
    hub.objectiveScope,
    hub.selectedMaterials,
    hub.selectedObjectiveGroup,
    hub.selectedObjectiveId,
    hub.selectedPaths,
    hub.topic,
    queryClient,
    resetPrimingArtifacts,
    setShellMode,
  ]);

  // ─── Delete workflow ───
  const deleteWorkflowRecord = useCallback(
    async (workflow: TutorWorkflowSummary) => {
      if (deletingWorkflowId === workflow.workflow_id) return false;
      setDeletingWorkflowId(workflow.workflow_id);
      try {
        await api.tutor.deleteWorkflow(workflow.workflow_id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
          queryClient.removeQueries({
            queryKey: ["tutor-workflow-detail", workflow.workflow_id],
            exact: true,
          }),
        ]);

        const deletingActiveWorkflow = activeWorkflowId === workflow.workflow_id;
        if (deletingActiveWorkflow) {
          resetPrimingDraft();
          setActiveWorkflowId(null);
          setStudioView("workbench");
          setShellMode("launch");
          if (
            activeSessionId &&
            workflow.active_tutor_session_id &&
            workflow.active_tutor_session_id === activeSessionId
          ) {
            session.clearActiveSessionState();
          }
        }

        toast.success("Study plan deleted");
        return true;
      } catch (err) {
        toast.error(
          `Failed to delete study plan: ${err instanceof Error ? err.message : "Unknown"}`,
        );
        return false;
      } finally {
        setDeletingWorkflowId((current) =>
          current === workflow.workflow_id ? null : current,
        );
      }
    },
    [
      activeSessionId,
      activeWorkflowId,
      deletingWorkflowId,
      queryClient,
      resetPrimingDraft,
      session,
      setShellMode,
    ],
  );

  // ─── Start tutor from workflow ───
  const startTutorFromWorkflow = useCallback(async () => {
    const ready = await saveWorkflowPriming("ready");
    if (!ready || !activeWorkflowId) return;
    const newSession = await session.startSession();
    if (!newSession) return;
    try {
      await api.tutor.updateWorkflowStage(activeWorkflowId, {
        current_stage: "tutor",
        status: "tutor_in_progress",
        active_tutor_session_id: newSession.session_id,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] }),
      ]);
    } catch (err) {
      toast.error(
        `Tutor started but stage update failed: ${
          err instanceof Error ? err.message : "Unknown"
        }`,
      );
    }
  }, [activeWorkflowId, queryClient, saveWorkflowPriming, session]);

  // ─── Open Polish stage ───
  const openWorkflowPolish = useCallback(async () => {
    if (!activeWorkflowId) return;
    try {
      await api.tutor.updateWorkflowStage(activeWorkflowId, {
        current_stage: "polish",
        status: "polish_in_progress",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] }),
      ]);
    } catch (err) {
      toast.error(
        `Failed to open Polish stage: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      return;
    }

    setShellMode("studio");
    setStudioView("polish");
  }, [activeWorkflowId, queryClient, setShellMode]);

  // ─── Save Polish bundle ───
  const saveWorkflowPolish = useCallback(
    async (payload: TutorPolishBundleRequest, finalize = false) => {
      if (!activeWorkflowId) {
        toast.error("Start or resume a study plan before using Polish.");
        return false;
      }

      setSavingPolishBundle(true);
      try {
        await api.tutor.savePolishBundle(activeWorkflowId, {
          ...payload,
          tutor_session_id: activeSessionId || null,
          priming_bundle_id: activeWorkflowDetail?.priming_bundle?.id || null,
          status: finalize ? "finalized" : payload.status || "draft",
        });

        await api.tutor.updateWorkflowStage(activeWorkflowId, {
          current_stage: finalize ? "final_sync" : "polish",
          status: finalize ? "polish_complete" : "polish_in_progress",
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
          queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] }),
        ]);

        setShellMode("studio");
        setStudioView(finalize ? "final_sync" : "polish");
        toast.success(finalize ? "Polish bundle finalized for final sync." : "Polish bundle saved.");
        return true;
      } catch (err) {
        toast.error(
          `Failed to save Polish bundle: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        return false;
      } finally {
        setSavingPolishBundle(false);
      }
    },
    [activeSessionId, activeWorkflowDetail?.priming_bundle?.id, activeWorkflowId, queryClient, setShellMode],
  );

  // ─── Open workflow record ───
  const openWorkflowRecord = useCallback(
    async (workflow: TutorWorkflowSummary) => {
      const currentCourseId = hub.courseId;
      hydratedWorkflowIdRef.current = null;
      setActiveWorkflowId(workflow.workflow_id);
      hub.setCourseId(workflow.course_id ?? undefined);

      if (
        activeSessionId &&
        typeof workflow.course_id === "number" &&
        typeof currentCourseId === "number" &&
        workflow.course_id !== currentCourseId
      ) {
        session.clearActiveSessionState();
      }

      if (workflow.current_stage === "tutor" && workflow.active_tutor_session_id) {
        await session.resumeSession(workflow.active_tutor_session_id);
        return;
      }

      const resolvedStage =
        workflow.current_stage === "launch" ? "priming" : workflow.current_stage;

      if (workflow.current_stage === "launch") {
        try {
          await api.tutor.updateWorkflowStage(workflow.workflow_id, {
            current_stage: "priming",
            status: "priming_in_progress",
          });
          await queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] });
        } catch {
          toast.error("Failed to move study plan into priming");
        }
      }

      if (resolvedStage === "tutor") {
        setShellMode("tutor");
        return;
      }

      setShellMode("studio");
      setStudioView(resolveStudioViewFromWorkflowStage(resolvedStage));
    },
    [activeSessionId, hub, queryClient, session, setShellMode],
  );

  // ─── Note capture ───
  const saveWorkflowNoteCapture = useCallback(
    async (mode: "exact" | "editable") => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a study plan before saving notes.");
        return;
      }
      const title = mode === "exact" ? exactNoteTitle : editableNoteTitle;
      const content = mode === "exact" ? exactNoteContent : editableNoteContent;
      if (!content.trim()) {
        toast.error(`Add ${mode} note content before saving.`);
        return;
      }
      setSavingRuntimeEvent(true);
      try {
        await api.tutor.captureWorkflowNote(activeWorkflowId, {
          tutor_session_id: activeSessionId,
          stage: "tutor",
          note_mode: mode,
          title: title.trim() || null,
          content: content.trim(),
          status: "captured",
        });
        if (mode === "exact") {
          setExactNoteTitle("");
          setExactNoteContent("");
        } else {
          setEditableNoteTitle("");
          setEditableNoteContent("");
        }
        await queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] });
        toast.success(mode === "exact" ? "Exact note saved" : "Editable note saved");
      } catch (err) {
        toast.error(`Failed to save note: ${err instanceof Error ? err.message : "Unknown"}`);
      } finally {
        setSavingRuntimeEvent(false);
      }
    },
    [
      activeSessionId,
      activeWorkflowId,
      editableNoteContent,
      editableNoteTitle,
      exactNoteContent,
      exactNoteTitle,
      queryClient,
    ],
  );

  // ─── Capture message note ───
  const captureWorkflowMessageNote = useCallback(
    async (payload: {
      mode: "exact" | "editable";
      message: ChatMessage;
      index: number;
    }) => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a study plan before saving notes.");
        return;
      }
      if (!payload.message.content.trim()) {
        toast.error("That reply is empty and cannot be saved.");
        return;
      }
      setSavingRuntimeEvent(true);
      try {
        await api.tutor.captureWorkflowNote(activeWorkflowId, {
          tutor_session_id: activeSessionId,
          stage: "tutor",
          note_mode: payload.mode,
          title:
            payload.mode === "exact"
              ? `Tutor exact reply ${payload.message.sessionTurnNumber ?? payload.index + 1}`
              : `Tutor editable reply ${payload.message.sessionTurnNumber ?? payload.index + 1}`,
          content: payload.message.content.trim(),
          status: "captured",
        });
        await queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] });
        toast.success(payload.mode === "exact" ? "Exact reply saved" : "Editable reply saved");
      } catch (err) {
        toast.error(
          `Failed to save reply note: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      } finally {
        setSavingRuntimeEvent(false);
      }
    },
    [activeSessionId, activeWorkflowId, queryClient],
  );

  // ─── Save feedback ───
  const saveWorkflowFeedbackEvent = useCallback(async () => {
    if (!activeWorkflowId || !activeSessionId) {
      toast.error("Start Tutor from a study plan before saving feedback.");
      return;
    }
    setSavingRuntimeEvent(true);
    try {
      await api.tutor.saveWorkflowFeedback(activeWorkflowId, {
        tutor_session_id: activeSessionId,
        stage: "tutor",
        source_type: "session",
        source_id: activeSessionId,
        sentiment: feedbackSentiment,
        issue_type: feedbackIssueType || null,
        message: feedbackMessage.trim() || null,
        handoff_to_polish: true,
      });
      setFeedbackMessage("");
      await queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] });
      toast.success("Feedback saved");
    } catch (err) {
      toast.error(
        `Failed to save feedback: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setSavingRuntimeEvent(false);
    }
  }, [
    activeSessionId,
    activeWorkflowId,
    feedbackIssueType,
    feedbackMessage,
    feedbackSentiment,
    queryClient,
  ]);

  // ─── Save message feedback ───
  const saveWorkflowMessageFeedback = useCallback(
    async (payload: {
      sentiment: "liked" | "disliked";
      message: ChatMessage;
      index: number;
    }) => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a study plan before saving feedback.");
        return;
      }
      setSavingRuntimeEvent(true);
      try {
        await api.tutor.saveWorkflowFeedback(activeWorkflowId, {
          tutor_session_id: activeSessionId,
          stage: "tutor",
          source_type: "assistant_message",
          source_id: payload.message.messageId || `message-${payload.index + 1}`,
          sentiment: payload.sentiment,
          issue_type: payload.sentiment === "liked" ? "good" : "mistake",
          message:
            payload.sentiment === "liked"
              ? `Marked liked on tutor reply ${payload.message.sessionTurnNumber ?? payload.index + 1}`
              : `Marked disliked on tutor reply ${payload.message.sessionTurnNumber ?? payload.index + 1}`,
          handoff_to_polish: true,
        });
        await queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] });
        toast.success(payload.sentiment === "liked" ? "Reply liked" : "Reply flagged for review");
      } catch (err) {
        toast.error(
          `Failed to save reply feedback: ${err instanceof Error ? err.message : "Unknown"}`,
        );
      } finally {
        setSavingRuntimeEvent(false);
      }
    },
    [activeSessionId, activeWorkflowId, queryClient],
  );

  // ─── Memory capsule ───
  const createWorkflowMemoryCapsule = useCallback(async (options?: {
    summaryOverride?: string | null;
  }) => {
    if (!activeWorkflowId || !activeSessionId) {
      toast.error("Start Tutor from a study plan before compacting memory.");
      return;
    }
    const fallbackSummary = options?.summaryOverride?.trim()
      ? options.summaryOverride.trim()
      : session.latestCommittedAssistantMessage?.content?.trim()
        ? session.latestCommittedAssistantMessage.content.trim().slice(0, 1200)
        : "";
    if (
      !memorySummaryText.trim() &&
      !fallbackSummary &&
      !memoryWeakPointsText.trim() &&
      !memoryUnresolvedText.trim() &&
      !memoryCardRequestsText.trim()
    ) {
      toast.error("Add a summary or runtime notes before creating a memory capsule.");
      return;
    }
    setSavingRuntimeEvent(true);
    try {
      const exactNotes = (activeWorkflowDetail?.captured_notes || [])
        .filter((note) => note.note_mode === "exact")
        .slice(-5)
        .map((note) => ({ id: note.id, title: note.title, content: note.content }));
      const editableNotes = (activeWorkflowDetail?.captured_notes || [])
        .filter((note) => note.note_mode === "editable")
        .slice(-5)
        .map((note) => ({ id: note.id, title: note.title, content: note.content }));
      const feedbackRefs = (activeWorkflowDetail?.feedback_events || [])
        .slice(-5)
        .map((event) => ({
          id: event.id,
          sentiment: event.sentiment,
          issue_type: event.issue_type,
          message: event.message,
        }));
      const artifactRefs = session.artifacts.slice(-5).map((artifact, index) => ({
        index,
        type: artifact.type,
        title: artifact.title,
        created_at: artifact.createdAt,
      }));

      await api.tutor.createMemoryCapsule(activeWorkflowId, {
        tutor_session_id: activeSessionId,
        stage: "tutor",
        summary_text: memorySummaryText.trim() || fallbackSummary || null,
        current_objective: hub.selectedObjectiveId || hub.selectedObjectiveGroup || hub.topic || null,
        study_unit: hub.selectedObjectiveGroup || null,
        concept_focus: parseLinesToRecords(primingConceptsText, "concept"),
        weak_points: parseLinesToRecords(memoryWeakPointsText, "weak_point"),
        unresolved_questions: parseLinesToRecords(memoryUnresolvedText, "question"),
        exact_notes: exactNotes,
        editable_notes: editableNotes,
        feedback: feedbackRefs,
        card_requests: parseLinesToRecords(memoryCardRequestsText, "card_request"),
        artifact_refs: artifactRefs,
        source_turn_ids: [],
      });
      setMemorySummaryText("");
      setMemoryWeakPointsText("");
      setMemoryUnresolvedText("");
      setMemoryCardRequestsText("");
      await queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] });
      toast.success("Memory capsule created");
    } catch (err) {
      toast.error(
        `Failed to create memory capsule: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setSavingRuntimeEvent(false);
    }
  }, [
    activeSessionId,
    activeWorkflowDetail?.captured_notes,
    activeWorkflowDetail?.feedback_events,
    activeWorkflowId,
    session.artifacts,
    memoryCardRequestsText,
    memorySummaryText,
    memoryUnresolvedText,
    memoryWeakPointsText,
    session.latestCommittedAssistantMessage,
    primingConceptsText,
    queryClient,
    hub.selectedObjectiveGroup,
    hub.selectedObjectiveId,
    hub.topic,
  ]);

  const quickCompactWorkflowMemory = useCallback(async () => {
    const summary = session.latestCommittedAssistantMessage?.content?.trim() || memorySummaryText.trim();
    if (!summary) {
      toast.error("No completed assistant reply is available to compact yet.");
      return;
    }
    await createWorkflowMemoryCapsule({
      summaryOverride: summary,
    });
  }, [createWorkflowMemoryCapsule, session.latestCommittedAssistantMessage, memorySummaryText]);

  return {
    // Workflow view state
    studioView,
    setStudioView,
    activeWorkflowId,
    setActiveWorkflowId,
    workflowFilters,
    setWorkflowFilters,
    creatingWorkflow,
    bootstrappingPriming,
    deletingWorkflowId,
    savingPrimingBundle,
    savingPolishBundle,

    // Priming state
    primingMethods,
    setPrimingMethods,
    primingMethodRuns: derivedPrimingMethodRuns,
    primingSummaryText,
    setPrimingSummaryText,
    primingConceptsText,
    setPrimingConceptsText,
    primingTerminologyText,
    setPrimingTerminologyText,
    primingRootExplanationText,
    setPrimingRootExplanationText,
    primingGapsText,
    setPrimingGapsText,
    primingStrategyText,
    setPrimingStrategyText,
    primingSourceInventory,
    runningPrimingAssist,
    primingAssistTargetMaterialId,

    // Note capture state
    exactNoteTitle,
    setExactNoteTitle,
    exactNoteContent,
    setExactNoteContent,
    editableNoteTitle,
    setEditableNoteTitle,
    editableNoteContent,
    setEditableNoteContent,
    feedbackSentiment,
    setFeedbackSentiment,
    feedbackIssueType,
    setFeedbackIssueType,
    feedbackMessage,
    setFeedbackMessage,
    memorySummaryText,
    setMemorySummaryText,
    memoryWeakPointsText,
    setMemoryWeakPointsText,
    memoryUnresolvedText,
    setMemoryUnresolvedText,
    memoryCardRequestsText,
    setMemoryCardRequestsText,
    savingRuntimeEvent,

    // Computed
    workflows,
    filteredWorkflows,
    activeWorkflowDetail,
    mergedPrimingSourceInventory,
    primingReadinessItems,

    // Actions
    resetPrimingDraft,
    saveWorkflowPriming,
    runWorkflowPrimingAssist,
    createWorkflowAndOpenPriming,
    openStudioPriming,
    deleteWorkflowRecord,
    startTutorFromWorkflow,
    openWorkflowPolish,
    saveWorkflowPolish,
    openWorkflowRecord,
    saveWorkflowNoteCapture,
    captureWorkflowMessageNote,
    saveWorkflowFeedbackEvent,
    saveWorkflowMessageFeedback,
    createWorkflowMemoryCapsule,
    quickCompactWorkflowMemory,
  };
}

export type UseTutorWorkflowReturn = ReturnType<typeof useTutorWorkflow>;
