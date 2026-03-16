import Layout from "@/components/layout";
import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import {
  CONTROL_CHIP,
  CONTROL_COPY,
  CONTROL_DECK_SECTION,
  CONTROL_KICKER,
  controlToggleButton,
} from "@/components/shell/controlStyles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCourseMap } from "@/api";
import { api } from "@/lib/api";
import type {
  AppLearningObjective,
  Material,
  TutorBoardScope,
  TutorAccuracyProfile,
  TutorHubEventSummary,
  TutorHubRecommendedAction,
  TutorHubResponse,
  TutorHubResumeCandidate,
  TutorObjectiveScope,
  TutorProjectShellResponse,
  TutorShellMode,
  TutorSessionSummary,
  TutorTemplateChain,
  TutorSessionWithTurns,
  TutorConfigCheck,
  TutorSessionPreflightResponse,
  TutorScholarStrategy,
  TutorStrategyFeedback,
  TutorWorkflowDetailResponse,
  TutorWorkflowSummary,
} from "@/lib/api";
import {
  clearTutorActiveSessionId,
  consumeTutorLaunchHandoff,
  normalizeTutorAccuracyProfile,
  normalizeTutorObjectiveScope,
  readTutorAccuracyProfile,
  readTutorActiveSessionId,
  readTutorObjectiveScope,
  readTutorSelectedMaterialIds,
  readTutorStoredStartState,
  readTutorVaultFolder,
  writeTutorAccuracyProfile,
  writeTutorActiveSessionId,
  writeLibraryLaunchFromTutor,
  writeTutorObjectiveScope,
  writeTutorSelectedMaterialIds,
  writeTutorStoredStartState,
  writeTutorVaultFolder,
  type TutorBrainLaunchContext,
} from "@/lib/tutorClientState";
import { COURSE_FOLDERS } from "@/config/courses";
import {
  TutorWorkflowLaunchHub,
  type TutorWorkflowLaunchFilters,
} from "@/components/TutorWorkflowLaunchHub";
import {
  TutorWorkflowPrimingPanel,
  type TutorPrimingReadinessItem,
} from "@/components/TutorWorkflowPrimingPanel";
import { TutorWorkflowPolishStudio } from "@/components/TutorWorkflowPolishStudio";
import { TutorWorkflowFinalSync } from "@/components/TutorWorkflowFinalSync";
import { TutorChat } from "@/components/TutorChat";
import type { ChatMessage } from "@/components/TutorChat.types";
import type { TutorPolishBundleRequest, TutorPrimingSourceInventoryItem } from "@/api.types";
import { TutorArtifacts, type TutorArtifact } from "@/components/TutorArtifacts";
import { TutorWorkspaceSurface } from "@/components/TutorWorkspaceSurface";
import { TutorStudioMode, type TutorStudioEntryRequest } from "@/components/TutorStudioMode";
import { TutorScheduleMode, type TutorScheduleLaunchIntent } from "@/components/TutorScheduleMode";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import {
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Clock,
  MessageSquare,
  PenTool,
  Eye,
  EyeOff,
  ListChecks,
  FileText,
  CreditCard,
  Check,
  X,
  Trash2,
  Square,
  Send,
  Loader2,
  Download,
  AlertTriangle,
  Timer,
  SkipForward,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  FileStack,
  Sparkles,
} from "lucide-react";
import {
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_SM,
  ICON_MD,
  BTN_TOOLBAR,
  BTN_TOOLBAR_ACTIVE,
  BTN_PRIMARY,
  CARD_BORDER,
} from "@/lib/theme";
import { CONTROL_PLANE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";

const INPUT_BASE = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const SELECT_BASE = "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";


type TutorShellQuery = {
  courseId?: number;
  sessionId?: string;
  mode?: TutorPageMode;
  boardScope?: TutorBoardScope;
  boardId?: number;
};

type TutorPageMode = TutorShellMode | "dashboard";

function readTutorShellQuery(): TutorShellQuery {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const parsedCourseId = Number.parseInt(params.get("course_id") || "", 10);
  const parsedBoardId = Number.parseInt(params.get("board_id") || "", 10);
  const rawMode = params.get("mode");
  const rawBoardScope = params.get("board_scope");
  return {
    courseId: Number.isFinite(parsedCourseId) ? parsedCourseId : undefined,
    sessionId: params.get("session_id") || undefined,
    mode:
      rawMode === "dashboard" ||
      rawMode === "studio" ||
      rawMode === "tutor" ||
      rawMode === "schedule"
        ? rawMode
        : rawMode === "publish"
          ? "dashboard"
        : undefined,
    boardScope:
      rawBoardScope === "session" || rawBoardScope === "project" || rawBoardScope === "overall"
        ? rawBoardScope
        : undefined,
    boardId: Number.isFinite(parsedBoardId) ? parsedBoardId : undefined,
  };
}

function writeTutorShellQuery(query: TutorShellQuery) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (typeof query.courseId === "number") params.set("course_id", String(query.courseId));
  else params.delete("course_id");
  if (query.sessionId) params.set("session_id", query.sessionId);
  else params.delete("session_id");
  if (query.mode) params.set("mode", query.mode);
  else params.delete("mode");
  if (query.boardScope) params.set("board_scope", query.boardScope);
  else params.delete("board_scope");
  if (typeof query.boardId === "number") params.set("board_id", String(query.boardId));
  else params.delete("board_id");

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

function parseFacilitationSteps(prompt: string | undefined | null): string[] {
  if (!prompt) return [];
  const lines = prompt.split(/\n/).filter((line) => line.trim());
  return lines
    .map((line) => line.replace(/^\s*(?:\d+[.)]\s*|[-*]\s+)/, "").trim())
    .filter(Boolean);
}

function normalizeArtifactType(
  value: unknown,
): "note" | "card" | "map" | "structured_notes" | null {
  if (value === "table") return "note";
  if (value === "structured_map") return "map";
  if (
    value === "note" ||
    value === "card" ||
    value === "map" ||
    value === "structured_notes"
  ) {
    return value;
  }
  return null;
}

function sanitizeVaultSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeStudyUnitLabel(value: string): string {
  const clean = sanitizeVaultSegment(value)
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
  const numbered = clean.match(
    /^(Week|Module|Construct|Topic)\s+0*([0-9]+)(?:\s*-\s*|\s+)?(.+)?$/i,
  );
  if (!numbered) {
    return clean;
  }
  const [, prefix, num, suffix] = numbered;
  const tail = String(suffix || "")
    .replace(/\s+/g, " ")
    .trim();
  return tail ? `${prefix} ${Number(num)} - ${tail}` : `${prefix} ${Number(num)}`;
}

function deriveVaultFolder(courseName: string, objectiveGroup: string): string {
  const safeCourse = sanitizeVaultSegment(courseName || "General");
  const normalizedGroup = normalizeStudyUnitLabel(objectiveGroup || "");
  if (!normalizedGroup) return `Courses/${safeCourse}`;
  return `Courses/${safeCourse}/${normalizedGroup}`;
}

function scoreStudyUnitCandidate(rawSegment: string): number {
  const segment = normalizeStudyUnitLabel(rawSegment);
  if (!segment || !/^(Week|Module|Construct|Topic)\s*0*\d+/i.test(segment)) {
    return Number.NEGATIVE_INFINITY;
  }
  let score = 1;
  if (/\s-\s.+/.test(segment)) score += 6;
  if (/\b(lecture|slides?|transcript|practice|todo|to do|notes?|objectives?|lo)\b/i.test(rawSegment)) {
    score -= 5;
  }
  if (/^(Week|Module|Construct|Topic)\s+\d+$/i.test(segment)) {
    score += 1;
  }
  return score;
}

function inferStudyUnitFromMaterial(material: Material): string {
  let bestUnit = "";
  let bestScore = Number.NEGATIVE_INFINITY;
  const folderSegments: string[] = [];
  if (material.folder_path) {
    folderSegments.push(...String(material.folder_path).split(/[\\/]/));
  }
  const sourceParentSegments: string[] = [];
  if (material.source_path) {
    const parts = String(material.source_path).split(/[\\/]/);
    sourceParentSegments.push(...parts.slice(0, -1));
  }

  const candidateGroups = [folderSegments, sourceParentSegments];
  for (const segments of candidateGroups) {
    const cleaned = segments
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => segment.replace(/\.[A-Za-z0-9]+$/, ""));

    for (let index = cleaned.length - 1; index >= 0; index -= 1) {
      const segment = cleaned[index];
      const score = scoreStudyUnitCandidate(segment);
      if (score > bestScore) {
        bestUnit = normalizeStudyUnitLabel(segment);
        bestScore = score;
      }
    }
  }

  const fileNameCandidates = [material.title || "", material.source_path || ""]
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => String(segment).split(/[\\/]/).pop() || "")
    .map((segment) => segment.replace(/\.[A-Za-z0-9]+$/, ""));
  for (const segment of fileNameCandidates) {
    const score = scoreStudyUnitCandidate(segment);
    if (score > bestScore) {
      bestUnit = normalizeStudyUnitLabel(segment);
      bestScore = score;
    }
  }
  return bestUnit;
}

type TutorWorkflowView = "launch" | "priming" | "polish" | "final_sync";

function parseLinesToRecords(value: string, key: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ [key]: line }));
}

function recordsToMultilineText(
  records: Record<string, unknown>[] | undefined,
  candidateKeys: string[],
): string {
  if (!Array.isArray(records) || records.length === 0) return "";
  return records
    .map((record) => {
      for (const key of candidateKeys) {
        const value = record?.[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      const firstStringValue = Object.values(record || {}).find(
        (value) => typeof value === "string" && value.trim().length > 0,
      );
      return typeof firstStringValue === "string" ? firstStringValue.trim() : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatSourceBlockText(
  records: Array<{ title: string; [key: string]: unknown }>,
  valueKey: string,
): string {
  return records
    .map((record) => {
      const value = record?.[valueKey];
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return "";
      return `[${record.title}]\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function formatSourceLineText(
  records: Array<{ [key: string]: unknown }>,
  valueKey: string,
): string {
  return records
    .map((record) => {
      const value = record?.[valueKey];
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean)
    .join("\n");
}

function mergePrimingSourceInventory(
  selectedMaterialIds: number[],
  materials: Material[],
  existingInventory: TutorPrimingSourceInventoryItem[],
): TutorPrimingSourceInventoryItem[] {
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const inventoryById = new Map(existingInventory.map((item) => [item.id, item]));
  return selectedMaterialIds
    .map((materialId) => {
      const material = materialById.get(materialId);
      const existing = inventoryById.get(materialId);
      if (!material && !existing) return null;
      return {
        id: materialId,
        title: existing?.title || material?.title || `Material ${materialId}`,
        source_path: existing?.source_path ?? material?.source_path ?? null,
        folder_path: existing?.folder_path ?? material?.folder_path ?? null,
        course_id: existing?.course_id ?? material?.course_id ?? null,
        content_type: existing?.content_type ?? material?.content_type ?? null,
        priming_output: existing?.priming_output ?? null,
      };
    })
    .filter((item): item is TutorPrimingSourceInventoryItem => Boolean(item));
}

function formatElapsedDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function useTutorShellState(initialRouteQuery: TutorShellQuery) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialRouteQuery.sessionId || readTutorActiveSessionId(),
  );
  const [hasRestored, setHasRestored] = useState(false);
  const [restoredTurns, setRestoredTurns] = useState<
    { question: string; answer: string | null }[] | undefined
  >();
  const [shellMode, setShellMode] = useState<TutorPageMode>(
    initialRouteQuery.mode ||
      (initialRouteQuery.sessionId || readTutorActiveSessionId() ? "tutor" : "dashboard"),
  );
  const [studioEntryRequest, setStudioEntryRequest] = useState<TutorStudioEntryRequest | null>(null);
  const [scheduleLaunchIntent, setScheduleLaunchIntent] =
    useState<TutorScheduleLaunchIntent | null>(null);
  const [activeBoardScope, setActiveBoardScope] = useState<TutorBoardScope>(
    initialRouteQuery.boardScope || "project",
  );
  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    initialRouteQuery.boardId ?? null,
  );
  const [viewerState, setViewerState] = useState<Record<string, unknown> | null>(null);
  const [shellRevision, setShellRevision] = useState(0);
  const [shellHydratedCourseId, setShellHydratedCourseId] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(
    () => !Boolean(initialRouteQuery.sessionId || readTutorActiveSessionId()),
  );
  const [brainLaunchContext, setBrainLaunchContext] = useState<TutorBrainLaunchContext | null>(
    null,
  );

  return {
    activeSessionId,
    setActiveSessionId,
    hasRestored,
    setHasRestored,
    restoredTurns,
    setRestoredTurns,
    shellMode,
    setShellMode,
    studioEntryRequest,
    setStudioEntryRequest,
    scheduleLaunchIntent,
    setScheduleLaunchIntent,
    activeBoardScope,
    setActiveBoardScope,
    activeBoardId,
    setActiveBoardId,
    viewerState,
    setViewerState,
    shellRevision,
    setShellRevision,
    shellHydratedCourseId,
    setShellHydratedCourseId,
    showSetup,
    setShowSetup,
    brainLaunchContext,
    setBrainLaunchContext,
  };
}

function useTutorLaunchConfig(initialRouteQuery: TutorShellQuery) {
  const [courseId, setCourseId] = useState<number | undefined>(initialRouteQuery.courseId);
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>(() =>
    readTutorSelectedMaterialIds(),
  );
  const [accuracyProfile, setAccuracyProfile] = useState<TutorAccuracyProfile>(() =>
    readTutorAccuracyProfile(),
  );
  const [chainId, setChainId] = useState<number | undefined>();
  const [customBlockIds, setCustomBlockIds] = useState<number[]>([]);
  const [topic, setTopic] = useState("");
  const [vaultFolder, setVaultFolder] = useState<string>(() => readTutorVaultFolder());
  const [selectedPaths, setSelectedPaths] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("tutor.vault_selected.v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* corrupted */
    }
    return [];
  });
  const [objectiveScope, setObjectiveScope] = useState<TutorObjectiveScope>(() =>
    readTutorObjectiveScope(),
  );
  const [selectedObjectiveId, setSelectedObjectiveId] = useState("");
  const [selectedObjectiveGroup, setSelectedObjectiveGroup] = useState("");

  useEffect(() => {
    writeTutorSelectedMaterialIds(selectedMaterials);
  }, [selectedMaterials]);

  useEffect(() => {
    writeTutorAccuracyProfile(accuracyProfile);
  }, [accuracyProfile]);

  useEffect(() => {
    writeTutorObjectiveScope(objectiveScope);
  }, [objectiveScope]);

  useEffect(() => {
    writeTutorVaultFolder(vaultFolder);
  }, [vaultFolder]);

  useEffect(() => {
    writeTutorStoredStartState({
      courseId,
      topic,
      selectedMaterials,
      chainId,
      customBlockIds,
      accuracyProfile,
      objectiveScope,
      selectedObjectiveId,
      selectedObjectiveGroup,
      selectedPaths,
    });
  }, [
    accuracyProfile,
    chainId,
    courseId,
    customBlockIds,
    objectiveScope,
    selectedMaterials,
    selectedObjectiveGroup,
    selectedObjectiveId,
    selectedPaths,
    topic,
  ]);

  return {
    courseId,
    setCourseId,
    selectedMaterials,
    setSelectedMaterials,
    accuracyProfile,
    setAccuracyProfile,
    chainId,
    setChainId,
    customBlockIds,
    setCustomBlockIds,
    topic,
    setTopic,
    vaultFolder,
    setVaultFolder,
    selectedPaths,
    setSelectedPaths,
    objectiveScope,
    setObjectiveScope,
    selectedObjectiveId,
    setSelectedObjectiveId,
    selectedObjectiveGroup,
    setSelectedObjectiveGroup,
  };
}

function useTutorSessionState() {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [chainBlocks, setChainBlocks] = useState<TutorTemplateChain["blocks"]>([]);
  const [artifacts, setArtifacts] = useState<TutorArtifact[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [scholarStrategyExpanded, setScholarStrategyExpanded] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [blockTimerSeconds, setBlockTimerSeconds] = useState<number | null>(null);
  const [timerWarningShown, setTimerWarningShown] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [scholarStrategy, setScholarStrategy] = useState<TutorScholarStrategy | null>(null);
  const [strategyFeedback, setStrategyFeedback] = useState<TutorStrategyFeedback | null>(null);
  const [strategyNotes, setStrategyNotes] = useState("");
  const [savingStrategyFeedback, setSavingStrategyFeedback] = useState(false);

  return {
    currentBlockIndex,
    setCurrentBlockIndex,
    chainBlocks,
    setChainBlocks,
    artifacts,
    setArtifacts,
    turnCount,
    setTurnCount,
    startedAt,
    setStartedAt,
    showArtifacts,
    setShowArtifacts,
    scholarStrategyExpanded,
    setScholarStrategyExpanded,
    showEndConfirm,
    setShowEndConfirm,
    isShipping,
    setIsShipping,
    blockTimerSeconds,
    setBlockTimerSeconds,
    timerWarningShown,
    setTimerWarningShown,
    timerPaused,
    setTimerPaused,
    scholarStrategy,
    setScholarStrategy,
    strategyFeedback,
    setStrategyFeedback,
    strategyNotes,
    setStrategyNotes,
    savingStrategyFeedback,
    setSavingStrategyFeedback,
  };
}

function useTutorSettingsState() {
  const [showSettings, setShowSettings] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  return {
    showSettings,
    setShowSettings,
    customInstructions,
    setCustomInstructions,
    settingsLoading,
    setSettingsLoading,
    settingsSaving,
    setSettingsSaving,
  };
}

function useTutorPageController() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const initialRouteQuery = useMemo(() => readTutorShellQuery(), []);
  const navigationTokenRef = useRef(0);
  const explicitShellModeRef = useRef<{ courseId: number; mode: TutorShellMode } | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const lastPersistedShellKeyRef = useRef("");
  const resumedFromProjectShellRef = useRef(false);
  const {
    activeSessionId,
    setActiveSessionId,
    hasRestored,
    setHasRestored,
    restoredTurns,
    setRestoredTurns,
    shellMode,
    setShellMode,
    studioEntryRequest,
    setStudioEntryRequest,
    scheduleLaunchIntent,
    setScheduleLaunchIntent,
    activeBoardScope,
    setActiveBoardScope,
    activeBoardId,
    setActiveBoardId,
    viewerState,
    setViewerState,
    shellRevision,
    setShellRevision,
    shellHydratedCourseId,
    setShellHydratedCourseId,
    setShowSetup,
    brainLaunchContext,
    setBrainLaunchContext,
  } = useTutorShellState(initialRouteQuery);
  const {
    courseId,
    setCourseId,
    selectedMaterials,
    setSelectedMaterials,
    accuracyProfile,
    setAccuracyProfile,
    chainId,
    setChainId,
    customBlockIds,
    setCustomBlockIds,
    topic,
    setTopic,
    vaultFolder,
    setVaultFolder,
    selectedPaths,
    setSelectedPaths,
    objectiveScope,
    setObjectiveScope,
    selectedObjectiveId,
    setSelectedObjectiveId,
    selectedObjectiveGroup,
    setSelectedObjectiveGroup,
  } = useTutorLaunchConfig(initialRouteQuery);
  const {
    currentBlockIndex,
    setCurrentBlockIndex,
    chainBlocks,
    setChainBlocks,
    artifacts,
    setArtifacts,
    turnCount,
    setTurnCount,
    startedAt,
    setStartedAt,
    showArtifacts,
    setShowArtifacts,
    scholarStrategyExpanded,
    setScholarStrategyExpanded,
    showEndConfirm,
    setShowEndConfirm,
    isShipping,
    setIsShipping,
    blockTimerSeconds,
    setBlockTimerSeconds,
    timerWarningShown,
    setTimerWarningShown,
    timerPaused,
    setTimerPaused,
    scholarStrategy,
    setScholarStrategy,
    strategyFeedback,
    setStrategyFeedback,
    strategyNotes,
    setStrategyNotes,
    savingStrategyFeedback,
    setSavingStrategyFeedback,
  } = useTutorSessionState();
  const {
    showSettings,
    setShowSettings,
    customInstructions,
    setCustomInstructions,
    settingsLoading,
    setSettingsLoading,
    settingsSaving,
    setSettingsSaving,
  } = useTutorSettingsState();
  const [workflowView, setWorkflowView] = useState<TutorWorkflowView>("launch");
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [workflowFilters, setWorkflowFilters] = useState<TutorWorkflowLaunchFilters>({
    search: "",
    courseId: "all",
    stage: "all",
    status: "all",
    dueBucket: "all",
  });
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [savingPrimingBundle, setSavingPrimingBundle] = useState(false);
  const [savingPolishBundle, setSavingPolishBundle] = useState(false);
  const [primingMethod, setPrimingMethod] = useState("summary_first");
  const [primingChainId, setPrimingChainId] = useState(
    "ingest_objectives_concepts_summary_gaps",
  );
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
  const [stageTimerRunning, setStageTimerRunning] = useState(false);
  const [stageTimerStartedAt, setStageTimerStartedAt] = useState<string | null>(null);
  const [stageTimerAccumulatedSeconds, setStageTimerAccumulatedSeconds] = useState(0);
  const [stageTimerPauseCount, setStageTimerPauseCount] = useState(0);
  const [stageTimerDisplaySeconds, setStageTimerDisplaySeconds] = useState(0);
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
  const [latestCommittedAssistantMessage, setLatestCommittedAssistantMessage] =
    useState<ChatMessage | null>(null);
  const hydratedWorkflowIdRef = useRef<string | null>(null);
  const stageTimerSessionRef = useRef<string | null>(null);

  const { data: chatMaterials = [] } = useQuery<Material[]>({
    queryKey: ["tutor-chat-materials-all-enabled"],
    queryFn: () => api.tutor.getMaterials({ enabled: true }),
    staleTime: 60 * 1000,
  });

  const { data: availableObjectives = [] } = useQuery<AppLearningObjective[]>({
    queryKey: ["learning-objectives", courseId],
    queryFn: () =>
      typeof courseId === "number"
        ? api.learningObjectives.getByCourse(courseId)
        : Promise.resolve([]),
    enabled: typeof courseId === "number",
    staleTime: 60 * 1000,
  });

  const { data: tutorContentSources } = useQuery({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    staleTime: 60 * 1000,
  });

  const courseLabel = useMemo(
    () =>
      typeof courseId === "number"
        ? tutorContentSources?.courses.find((course) => course.id === courseId)?.name || ""
        : "",
    [courseId, tutorContentSources],
  );

  const scopedObjectives = useMemo(
    () =>
      selectedObjectiveGroup
        ? availableObjectives.filter(
            (objective) =>
              String(objective.groupName || "").trim() === selectedObjectiveGroup,
          )
        : availableObjectives,
    [availableObjectives, selectedObjectiveGroup],
  );

  const studyUnitOptions = useMemo(() => {
    const unitMap = new Map<
      string,
      { value: string; objectiveCount: number; materialCount: number }
    >();

    for (const objective of availableObjectives) {
      const group = normalizeStudyUnitLabel(String(objective.groupName || ""));
      if (!group) continue;
      const entry = unitMap.get(group) || {
        value: group,
        objectiveCount: 0,
        materialCount: 0,
      };
      entry.objectiveCount += 1;
      unitMap.set(group, entry);
    }

    for (const material of chatMaterials) {
      if (typeof courseId !== "number" || material.course_id !== courseId) continue;
      const unit = inferStudyUnitFromMaterial(material);
      if (!unit) continue;
      const entry = unitMap.get(unit) || {
        value: unit,
        objectiveCount: 0,
        materialCount: 0,
      };
      entry.materialCount += 1;
      unitMap.set(unit, entry);
    }

    return Array.from(unitMap.values()).sort((a, b) =>
      a.value.localeCompare(b.value, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [availableObjectives, chatMaterials, courseId]);

  const selectedObjectiveRecord = useMemo(
    () =>
      availableObjectives.find(
        (objective) => String(objective.loCode || "") === selectedObjectiveId,
      ),
    [availableObjectives, selectedObjectiveId],
  );

  const { data: activeWorkflowDetail } = useQuery<TutorWorkflowDetailResponse>({
    queryKey: ["tutor-workflow-detail", activeWorkflowId],
    queryFn: () => api.tutor.getWorkflow(activeWorkflowId!),
    enabled: Boolean(activeWorkflowId),
    staleTime: 15 * 1000,
  });

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

    setCourseId(primingBundle?.course_id ?? workflow.course_id ?? undefined);
    setTopic(primingBundle?.topic ?? workflow.topic ?? "");
    setSelectedMaterials(primingBundle?.selected_material_ids ?? []);
    setSelectedPaths(primingBundle?.selected_paths ?? []);
    setSelectedObjectiveGroup(primingBundle?.study_unit ?? workflow.study_unit ?? "");
    setObjectiveScope(firstObjectiveCode ? "single_focus" : "module_all");
    setSelectedObjectiveId(firstObjectiveCode);
    setPrimingMethod(primingBundle?.priming_method || "summary_first");
    setPrimingChainId(
      primingBundle?.priming_chain_id || "ingest_objectives_concepts_summary_gaps",
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
    setCourseId,
    setObjectiveScope,
    setSelectedMaterials,
    setSelectedObjectiveGroup,
    setSelectedObjectiveId,
    setSelectedPaths,
    setPrimingSourceInventory,
    setTopic,
  ]);

  const derivedVaultFolder = useMemo(
    () =>
      vaultFolder.trim() ||
      (courseLabel && selectedObjectiveGroup
        ? deriveVaultFolder(courseLabel, selectedObjectiveGroup)
        : ""),
    [vaultFolder, courseLabel, selectedObjectiveGroup],
  );

  const effectiveTopic = useMemo(
    () =>
      selectedObjectiveRecord?.title ||
      selectedObjectiveGroup ||
      topic.trim() ||
      "",
    [topic, selectedObjectiveRecord, selectedObjectiveGroup],
  );

  const preflightPayload = useMemo(() => {
    if (typeof courseId !== "number") return null;
    return {
      course_id: courseId,
      topic: effectiveTopic || undefined,
      study_unit: selectedObjectiveGroup || undefined,
      module_name: selectedObjectiveGroup || undefined,
      objective_scope: objectiveScope,
      focus_objective_id: selectedObjectiveId || undefined,
      learning_objectives:
        scopedObjectives.length > 0
          ? scopedObjectives.map((objective) => ({
              ...(objective.loCode ? { lo_code: objective.loCode } : {}),
              title: objective.title,
              status: objective.status,
              group: objective.groupName || undefined,
            }))
          : undefined,
      content_filter: {
        ...(selectedPaths.length > 0 ? { folders: selectedPaths } : {}),
        material_ids: selectedMaterials,
        ...(derivedVaultFolder ? { vault_folder: derivedVaultFolder } : {}),
        accuracy_profile: accuracyProfile,
        objective_scope: objectiveScope,
        ...(selectedObjectiveId ? { focus_objective_id: selectedObjectiveId } : {}),
        web_search: false,
      },
    };
  }, [
    accuracyProfile,
    courseId,
    derivedVaultFolder,
    effectiveTopic,
    objectiveScope,
    scopedObjectives,
    selectedMaterials,
    selectedObjectiveGroup,
    selectedObjectiveId,
    selectedPaths,
  ]);

  const {
    data: preflight,
    isFetching: preflightLoading,
    error: preflightError,
  } = useQuery<TutorSessionPreflightResponse>({
    queryKey: [
      "tutor-session-preflight",
      JSON.stringify(preflightPayload || {}),
    ],
    queryFn: () => api.tutor.preflightSession(preflightPayload!),
    enabled:
      shellMode === "dashboard" &&
      !!preflightPayload &&
      selectedMaterials.length > 0 &&
      !!selectedObjectiveGroup,
    staleTime: 30 * 1000,
  });

  // Filter out stale/deleted material IDs from localStorage
  useEffect(() => {
    if (chatMaterials.length === 0) return;
    const validIds = new Set(chatMaterials.map((m) => m.id));
    setSelectedMaterials((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      // Only update if something was filtered out
      if (filtered.length < prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [chatMaterials]);

  // Recent sessions
  const { data: recentSessions = [] } = useQuery<TutorSessionSummary[]>({
    queryKey: ["tutor-sessions"],
    queryFn: () => api.tutor.listSessions({ limit: 10 }),
  });

  const { data: tutorHub, isFetching: tutorHubLoading } = useQuery<TutorHubResponse>({
    queryKey: ["tutor-hub", activeSessionId],
    queryFn: () => api.tutor.getHub(),
    enabled: hasRestored && shellMode === "dashboard",
    staleTime: 15 * 1000,
  });

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
    enabled: hasRestored && shellMode === "dashboard",
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

  const { data: projectShell } = useQuery<TutorProjectShellResponse>({
    queryKey: ["tutor-project-shell", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.getProjectShell({
        course_id: courseId!,
        ...(activeSessionId ? { session_id: activeSessionId } : {}),
      }),
    enabled: hasRestored && typeof courseId === "number",
    staleTime: 30 * 1000,
  });

  const { data: projectStudioItems } = useQuery({
    queryKey: ["tutor-studio-restore", "project", courseId, activeSessionId],
    queryFn: () =>
      api.tutor.restoreStudioItems({
        course_id: courseId!,
        tutor_session_id: activeSessionId || undefined,
        scope: "project",
      }),
    enabled: hasRestored && typeof courseId === "number",
    staleTime: 15 * 1000,
  });

  // Config check (runs once on mount)
  const { data: configStatus } = useQuery<TutorConfigCheck>({
    queryKey: ["tutor-config-check"],
    queryFn: () => api.tutor.configCheck(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: courseMapData } = useQuery({
    queryKey: ["course-map"],
    queryFn: fetchCourseMap,
    staleTime: 5 * 60 * 1000,
  });

  const apiCourses = courseMapData?.courses.map((c) => ({
    id: c.code.toLowerCase().replace("phyt_", ""),
    name: c.label,
    path: c.label,
  })) ?? [];

  const courseFolders = apiCourses.length > 0 ? apiCourses : COURSE_FOLDERS;

  const mergedPrimingSourceInventory = useMemo(
    () => mergePrimingSourceInventory(selectedMaterials, chatMaterials, primingSourceInventory),
    [chatMaterials, primingSourceInventory, selectedMaterials],
  );

  const primingReadinessItems = useMemo<TutorPrimingReadinessItem[]>(() => {
    const hasObjectives =
      selectedObjectiveGroup.trim().length > 0 &&
      (objectiveScope !== "single_focus" || selectedObjectiveId.trim().length > 0);
    const conceptCount = parseLinesToRecords(primingConceptsText, "concept").length;
    return [
      {
        label: "Materials loaded",
        ready: selectedMaterials.length > 0,
        detail:
          selectedMaterials.length > 0
            ? `${selectedMaterials.length} source materials selected`
            : "Add at least one source material.",
      },
      {
        label: "Study unit / objective scope",
        ready: hasObjectives,
        detail: hasObjectives
          ? selectedObjectiveGroup || selectedObjectiveId
          : "Select a study unit and focus objective when single-focus mode is enabled.",
      },
      {
        label: "Summary generated",
        ready: primingSummaryText.trim().length > 0,
        detail: primingSummaryText.trim().length > 0
          ? "Summary ready for Tutor handoff"
          : "Add at least one priming summary.",
      },
      {
        label: "Concept set generated",
        ready: conceptCount > 0,
        detail:
          conceptCount > 0
            ? `${conceptCount} concept lines ready`
            : "Capture at least one key concept.",
      },
    ];
  }, [
    objectiveScope,
    primingConceptsText,
    primingSummaryText,
    selectedMaterials.length,
    selectedObjectiveGroup,
    selectedObjectiveId,
  ]);

  const resetPrimingDraft = useCallback(() => {
    hydratedWorkflowIdRef.current = null;
    setCourseId(undefined);
    setSelectedMaterials([]);
    setSelectedPaths([]);
    setTopic("");
    setSelectedObjectiveGroup("");
    setSelectedObjectiveId("");
    setObjectiveScope("module_all");
    setPrimingMethod("summary_first");
    setPrimingChainId("ingest_objectives_concepts_summary_gaps");
    setPrimingSummaryText("");
    setPrimingConceptsText("");
    setPrimingTerminologyText("");
    setPrimingRootExplanationText("");
    setPrimingGapsText("");
    setPrimingStrategyText("");
    setPrimingSourceInventory([]);
  }, [
    setCourseId,
    setObjectiveScope,
    setSelectedMaterials,
    setSelectedObjectiveGroup,
    setSelectedObjectiveId,
    setSelectedPaths,
    setPrimingSourceInventory,
    setTopic,
  ]);

  const buildPrimingBundlePayload = useCallback(() => {
    const learningObjectives =
      scopedObjectives.length > 0
        ? scopedObjectives.map((objective) => ({
            ...(objective.loCode ? { lo_code: objective.loCode } : {}),
            title: objective.title,
            status: objective.status,
            group: objective.groupName || undefined,
          }))
        : [];

    const readinessBlockers = primingReadinessItems
      .filter((item) => !item.ready)
      .map((item) => ({ label: item.label, detail: item.detail }));

    return {
      course_id: courseId ?? null,
      study_unit: selectedObjectiveGroup || null,
      topic: topic || null,
      selected_material_ids: selectedMaterials,
      selected_paths: selectedPaths,
      source_inventory: mergedPrimingSourceInventory,
      priming_method: primingMethod,
      priming_chain_id: primingChainId,
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
    courseId,
    mergedPrimingSourceInventory,
    primingChainId,
    primingConceptsText,
    primingGapsText,
    primingMethod,
    primingReadinessItems,
    primingRootExplanationText,
    primingStrategyText,
    primingSummaryText,
    primingTerminologyText,
    scopedObjectives,
    selectedMaterials,
    selectedObjectiveGroup,
    selectedPaths,
    topic,
  ]);

  const saveWorkflowPriming = useCallback(
    async (mode: "draft" | "ready") => {
      if (!activeWorkflowId) {
        toast.error("Start or open a workflow before saving priming.");
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

  const runWorkflowPrimingAssist = useCallback(
    async (materialIds: number[]) => {
      if (!activeWorkflowId) {
        toast.error("Open a workflow before running Priming Assist.");
        return;
      }
      if (materialIds.length === 0) {
        toast.error("Select at least one source material first.");
        return;
      }
      setRunningPrimingAssist(true);
      setPrimingAssistTargetMaterialId(materialIds.length === 1 ? materialIds[0] : null);
      try {
        const response = await api.tutor.runPrimingAssist(activeWorkflowId, {
          material_ids: materialIds,
          study_unit: selectedObjectiveGroup || null,
          topic: topic || null,
          priming_method: primingMethod,
          priming_chain_id: primingChainId,
          source_inventory: mergedPrimingSourceInventory,
        });
        setPrimingSourceInventory(response.source_inventory);
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
      primingChainId,
      primingMethod,
      selectedObjectiveGroup,
      topic,
    ],
  );

  const createWorkflowAndOpenPriming = useCallback(async () => {
    setCreatingWorkflow(true);
    try {
      resetPrimingDraft();
      const result = await api.tutor.createWorkflow({
        current_stage: "priming",
        status: "priming_in_progress",
      });
      setActiveWorkflowId(result.workflow.workflow_id);
      setWorkflowView("priming");
      setShellMode("dashboard");
      await queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] });
      toast.success("New workflow created");
    } catch (err) {
      toast.error(
        `Failed to create workflow: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setCreatingWorkflow(false);
    }
  }, [queryClient, resetPrimingDraft]);

  const refreshChatMaterials = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] });
  }, [queryClient]);

  const applySessionState = useCallback((session: TutorSessionWithTurns) => {
    setActiveSessionId(session.session_id);
    setShellMode("tutor");
    setShowSetup(false);
    setTurnCount(session.turn_count);
    setStartedAt(session.started_at);
    setTopic(session.topic || "");
    setCourseId(session.course_id ?? undefined);
    setChainId(session.method_chain_id ?? undefined);
    setCurrentBlockIndex(session.current_block_index ?? 0);
    setChainBlocks(
      (session.chain_blocks || []).map((block) => ({
        id: block.id,
        name: block.name,
        category: block.category,
        description: block.description || "",
        duration: block.default_duration_min,
        facilitation_prompt: block.facilitation_prompt || "",
      }))
    );
    const materialIds = session.content_filter?.material_ids || [];
    setSelectedMaterials(materialIds);
    writeTutorSelectedMaterialIds(materialIds);
    setAccuracyProfile(
      normalizeTutorAccuracyProfile(session.content_filter?.accuracy_profile)
    );
    setObjectiveScope(
      normalizeTutorObjectiveScope(session.content_filter?.objective_scope),
    );
    setSelectedObjectiveId(String(session.content_filter?.focus_objective_id || ""));
    setSelectedObjectiveGroup(
      String(
        session.content_filter?.map_of_contents?.module_name ||
          session.content_filter?.module_name ||
          ""
      )
    );
    if (typeof session.content_filter?.vault_folder === "string") {
      setVaultFolder(session.content_filter.vault_folder);
    }
    setScholarStrategy(session.scholar_strategy || null);
    setStrategyFeedback(session.strategy_feedback || null);
    setStrategyNotes(session.strategy_feedback?.notes || "");
    if (session.artifacts_json) {
      try {
        const parsed = JSON.parse(session.artifacts_json);
        if (Array.isArray(parsed)) {
          setArtifacts(
            parsed
              .map((a: { type?: string; title?: string; content?: string; created_at?: string }) => {
                const type = normalizeArtifactType(a.type);
                if (!type) return null;
                return {
                  type,
                  title: a.title || "",
                  content: a.content || "",
                  createdAt: a.created_at || new Date().toISOString(),
                };
              })
              .filter((artifact): artifact is TutorArtifact => artifact !== null)
          );
        } else {
          setArtifacts([]);
        }
      } catch {
        setArtifacts([]);
      }
    } else {
      setArtifacts([]);
    }
    // Hydrate chat messages from server turns so navigation doesn't lose history
    if (session.turns && session.turns.length > 0) {
      setRestoredTurns(session.turns.map((t) => ({ question: t.question, answer: t.answer })));
    } else {
      setRestoredTurns(undefined);
    }
    writeTutorActiveSessionId(session.session_id);
  }, []);

  const openSettings = useCallback(async () => {
    setShowSettings(true);
    setSettingsLoading(true);
    try {
      const data = await api.tutor.getSettings();
      setCustomInstructions(data.custom_instructions);
    } catch {
      toast.error("Failed to load tutor settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await api.tutor.saveSettings({ custom_instructions: customInstructions });
      toast.success("Custom instructions saved");
      setShowSettings(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  }, [customInstructions]);

  const restoreDefaultInstructions = useCallback(async () => {
    setSettingsLoading(true);
    try {
      await api.tutor.saveSettings({ custom_instructions: "" });
      const data = await api.tutor.getSettings();
      setCustomInstructions(data.custom_instructions);
      toast.success("Restored default instructions");
    } catch {
      toast.error("Failed to restore defaults");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveScholarStrategyFeedback = useCallback(async (
    field: "pacing" | "scaffolds" | "retrievalPressure" | "explanationDensity",
    value: string,
  ) => {
    if (!activeSessionId) return;
    const nextFeedback: TutorStrategyFeedback = {
      ...(strategyFeedback || {}),
      [field]: value,
      notes: strategyNotes || null,
    };
    setSavingStrategyFeedback(true);
    try {
      const result = await api.tutor.saveStrategyFeedback(activeSessionId, nextFeedback);
      setStrategyFeedback(result.strategy_feedback);
      setStrategyNotes(result.strategy_feedback.notes || "");
    } catch {
      toast.error("Failed to save Scholar strategy feedback");
    } finally {
      setSavingStrategyFeedback(false);
    }
  }, [activeSessionId, strategyFeedback, strategyNotes]);

  const saveScholarStrategyNotes = useCallback(async () => {
    if (!activeSessionId) return;
    const nextFeedback: TutorStrategyFeedback = {
      ...(strategyFeedback || {}),
      notes: strategyNotes || null,
    };
    setSavingStrategyFeedback(true);
    try {
      const result = await api.tutor.saveStrategyFeedback(activeSessionId, nextFeedback);
      setStrategyFeedback(result.strategy_feedback);
      toast.success("Scholar strategy feedback saved");
    } catch {
      toast.error("Failed to save Scholar strategy notes");
    } finally {
      setSavingStrategyFeedback(false);
    }
  }, [activeSessionId, strategyFeedback, strategyNotes]);

  const startSession = useCallback(async () => {
    setIsStarting(true);
    try {
      if (objectiveScope === "single_focus" && !selectedObjectiveId) {
        toast.error("Choose a focus objective before starting a single-focus Tutor session.");
        return null;
      }
      if (!preflightPayload) {
        toast.error("Select a course, objective scope, and materials before starting the Tutor.");
        return null;
      }
      let resolvedChainId = chainId;
      if (!resolvedChainId && customBlockIds.length > 0) {
        const customChain = await api.tutor.createCustomChain(
          customBlockIds,
          `Custom ${effectiveTopic || "Chain"}`,
        );
        resolvedChainId = customChain.id;
      }
      const preflightResult = await api.tutor.preflightSession(preflightPayload);
      if (preflightResult.blockers.length > 0) {
        toast.error(preflightResult.blockers[0].message);
        return null;
      }

      const session = await api.tutor.createSession({
        preflight_id: preflightResult.preflight_id,
        phase: "first_pass",
        mode: "Core",
        method_chain_id: resolvedChainId,
      });
      const full = await api.tutor.getSession(session.session_id);
      applySessionState(full);
      // Force-refresh materials list so chat sidebar is up-to-date
      queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] });
      setShowSetup(false);
      setShellMode("tutor");

      toast.success("Tutor session started");
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      return full;
    } catch (err) {
      toast.error(`Failed to start session: ${err instanceof Error ? err.message : "Unknown"}`);
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [preflightPayload, objectiveScope, selectedObjectiveId, chainId, customBlockIds, topic, preflight, queryClient, applySessionState]);

  const clearActiveSessionState = useCallback(() => {
    setActiveSessionId(null);
    setLatestCommittedAssistantMessage(null);
    setRestoredTurns(undefined);
    setArtifacts([]);
    setTurnCount(0);
    setStartedAt(null);
    setCurrentBlockIndex(0);
    setChainBlocks([]);
    setScholarStrategy(null);
    setStrategyFeedback(null);
    setStrategyNotes("");
    setShowSetup(false);
    setShowArtifacts(false);
    setShowEndConfirm(false);
    setShellMode("dashboard");
    clearTutorActiveSessionId();
  }, []);

  const persistStageTimeSlice = useCallback(
    async (triggerSource: string, notes: Record<string, unknown>[] = []) => {
      if (!activeWorkflowId || !activeSessionId || !stageTimerStartedAt) return 0;
      const endTs = new Date().toISOString();
      const sliceSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(stageTimerStartedAt).getTime()) / 1000),
      );
      await api.tutor.logWorkflowStageTime(activeWorkflowId, {
        stage: "tutor",
        start_ts: stageTimerStartedAt,
        end_ts: endTs,
        seconds_active: sliceSeconds,
        pause_count: stageTimerPauseCount,
        notes,
        trigger_source: triggerSource,
      });
      setStageTimerAccumulatedSeconds((prev) => prev + sliceSeconds);
      setStageTimerDisplaySeconds((prev) => prev + sliceSeconds);
      setStageTimerStartedAt(null);
      return sliceSeconds;
    },
    [activeSessionId, activeWorkflowId, stageTimerPauseCount, stageTimerStartedAt],
  );

  const endSessionById = useCallback(async (sessionId: string) => {
    if (sessionId === activeSessionId && stageTimerRunning && stageTimerStartedAt) {
      try {
        await persistStageTimeSlice("session_end", [
          { kind: "study_timer", session_id: sessionId, block_index: currentBlockIndex },
        ]);
      } catch {
        toast.error("Failed to persist final tutor study-time slice");
      }
    }
    await api.tutor.endSession(sessionId);
    if (sessionId === activeSessionId) {
      clearTutorActiveSessionId();
      clearActiveSessionState();
    }
    queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
  }, [
    activeSessionId,
    clearActiveSessionState,
    currentBlockIndex,
    persistStageTimeSlice,
    queryClient,
    stageTimerRunning,
    stageTimerStartedAt,
  ]);

  const endSession = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await endSessionById(activeSessionId);
      toast.success("Session ended");
    } catch (err) {
      toast.error(`Failed to end session: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId, endSessionById]);

  const shipToBrainAndEnd = useCallback(async () => {
    if (!activeSessionId) return;
    setIsShipping(true);
    try {
      const full = await api.tutor.getSession(activeSessionId);
      if (full.turns && full.turns.length > 0) {
        const lines: string[] = [
          `# Tutor: ${topic || "Session"}`,
          `**Date:** ${new Date(startedAt || Date.now()).toLocaleDateString()}`,
          `**Turns:** ${turnCount}`,
          `**Artifacts:** ${artifacts.length}`,
          "",
          "---",
          "",
        ];
        for (const turn of full.turns) {
          lines.push(`## Q${turn.turn_number}`);
          lines.push(turn.question);
          lines.push("");
          if (turn.answer) {
            lines.push(`**Answer:**`);
            lines.push(turn.answer);
            lines.push("");
          }
        }
        const filename = `Tutor - ${(topic || "Session").replace(/[^a-zA-Z0-9 ]/g, "").trim()}`;
        const path = `Study Sessions/${filename}.md`;
        await api.obsidian.append(path, lines.join("\n"));
      }
      // Show toast AFTER ship succeeds but BEFORE endSession unmounts component
      setTimeout(() => {
        toast.success("Session shipped to Brain");
      }, 100);
      await endSession();
    } catch (err) {
      toast.error(`Ship failed: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setIsShipping(false);
      setShowEndConfirm(false);
    }
  }, [activeSessionId, topic, startedAt, turnCount, artifacts.length, endSession]);

  const handleArtifactCreated = useCallback(
    async (artifact: { type: string; content: string; title?: string }) => {
      if (!activeSessionId) return;
      const artifactType = normalizeArtifactType(artifact.type);
      if (!artifactType) {
        toast.error(`Unsupported artifact type: ${artifact.type}`);
        return;
      }
      try {
        const result = await api.tutor.createArtifact(activeSessionId, {
          type: artifactType,
          content: artifact.content,
          title: artifact.title,
        });
        const newArtifact: TutorArtifact = {
          type: artifactType,
          title: artifact.title || `${artifactType} #${artifacts.length + 1}`,
          content: artifact.content,
          createdAt: new Date().toISOString(),
          cardId: result.card_id,
        };
        setArtifacts((prev) => [...prev, newArtifact]);
        setShowArtifacts(true);
        toast.success(
          `${artifactType.charAt(0).toUpperCase() + artifactType.slice(1)} created`
        );
      } catch (err) {
        toast.error(`Failed to create artifact: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [activeSessionId, artifacts.length]
  );

  const handleStudioCapture = useCallback(
    async (capture: {
      content: string;
      title?: string;
      itemType?: string;
      target: "note" | "summary_board";
      sourceKind?: string;
      sourcePath?: string;
      sourceLocator?: Record<string, unknown>;
    }) => {
      if (typeof courseId !== "number") {
        toast.error("Select a course before sending items to Studio.");
        return;
      }
      try {
        await api.tutor.captureStudioItem({
          course_id: courseId,
          tutor_session_id: activeSessionId,
          scope: activeSessionId ? "session" : "project",
          item_type: capture.itemType || "note",
          title: capture.title,
          body_markdown: capture.content,
          source_kind: capture.sourceKind || "tutor_chat",
          source_path: capture.sourcePath,
          source_locator: capture.sourceLocator,
          status: capture.target === "summary_board" ? "boarded" : "captured",
        });
        setShellMode("studio");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
          queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
        ]);
        toast.success(
          capture.target === "summary_board"
            ? "Sent to Studio Summary Board"
            : "Sent to Studio Note",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send item to Studio");
      }
    },
    [activeSessionId, courseId, queryClient],
  );

  const advanceBlock = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      const result = await api.tutor.advanceBlock(activeSessionId);
      setCurrentBlockIndex(result.block_index);
      setTimerWarningShown(false);
      setTimerPaused(false);
      // Reset timer for new block
      if (result.block_duration) {
        setBlockTimerSeconds(result.block_duration * 60);
      } else {
        setBlockTimerSeconds(null);
      }
      if (result.complete) {
        setBlockTimerSeconds(null);
        toast.success("Chain complete!");
      } else {
        toast.success(`Advanced to: ${result.block_name}`);
      }
      if (result.vault_write_status === "success") {
        toast.success("Note saved", { duration: 2000 });
      } else if (result.vault_write_status === "failed" || result.vault_write_status === "unavailable") {
        toast.warning("Vault note failed — Obsidian may not be running", { duration: 5000 });
      }
      // "skipped" → silent (no toast)
    } catch (err) {
      toast.error(`Failed to advance block: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [activeSessionId]);

  // Block timer countdown
  useEffect(() => {
    if (blockTimerSeconds === null || blockTimerSeconds <= 0 || timerPaused) return;
    const interval = setInterval(() => {
      setBlockTimerSeconds((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [blockTimerSeconds, timerPaused]);

  useEffect(() => {
    if (blockTimerSeconds !== 60 || timerPaused || timerWarningShown) return;
    toast.info("1 minute remaining on this block", { duration: 5000 });
    setTimerWarningShown(true);
  }, [blockTimerSeconds, timerPaused, timerWarningShown]);

  // Start timer when session begins with a chain
  useEffect(() => {
    if (chainBlocks.length > 0 && activeSessionId && currentBlockIndex < chainBlocks.length) {
      const block = chainBlocks[currentBlockIndex];
      if (block.duration && blockTimerSeconds === null) {
        setBlockTimerSeconds(block.duration * 60);
      }
    }
  }, [chainBlocks, activeSessionId, currentBlockIndex]);

  const handleDeleteArtifacts = useCallback(
    async (sid: string, indexes: number[]) => {
      const result = await api.tutor.deleteArtifacts(sid, indexes);
      const skippedIndexes = new Set(result.skipped_indexes || []);
      const deletedIndexes = indexes.filter((index) => !skippedIndexes.has(index));
      // Only update local artifacts state if deleting from the active session
      if (sid === activeSessionId) {
        setArtifacts((prev) => {
          const sorted = [...deletedIndexes].sort((a, b) => b - a);
          const next = [...prev];
          for (const i of sorted) {
            if (i >= 0 && i < next.length) next.splice(i, 1);
          }
          return next;
        });
      }
      // Refresh session list so old session artifact counts update
      queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] });
      return result;
    },
    [activeSessionId, queryClient]
  );

  const resumeSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = await api.tutor.getSession(sessionId);
        applySessionState(session);
        setShellMode("tutor");
        toast.success("Session resumed");
      } catch (err) {
        toast.error(`Failed to resume session: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    },
    [applySessionState]
  );

  const openWorkflowRecord = useCallback(
    async (workflow: TutorWorkflowSummary) => {
      hydratedWorkflowIdRef.current = null;
      setActiveWorkflowId(workflow.workflow_id);
      setCourseId(workflow.course_id ?? undefined);

      if (workflow.current_stage === "tutor" && workflow.active_tutor_session_id) {
        await resumeSession(workflow.active_tutor_session_id);
        return;
      }

      if (workflow.current_stage === "launch") {
        try {
          await api.tutor.updateWorkflowStage(workflow.workflow_id, {
            current_stage: "priming",
            status: "priming_in_progress",
          });
          await queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] });
        } catch {
          toast.error("Failed to move workflow into priming");
        }
      }

      setShellMode("dashboard");
      setWorkflowView(
        workflow.current_stage === "final_sync"
          ? "final_sync"
          : workflow.current_stage === "polish"
            ? "polish"
            : "priming",
      );
    },
    [queryClient, resumeSession],
  );

  const startTutorFromWorkflow = useCallback(async () => {
    const ready = await saveWorkflowPriming("ready");
    if (!ready || !activeWorkflowId) return;
    const session = await startSession();
    if (!session) return;
    try {
      await api.tutor.updateWorkflowStage(activeWorkflowId, {
        current_stage: "tutor",
        status: "tutor_in_progress",
        active_tutor_session_id: session.session_id,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tutor-workflows"] }),
        queryClient.invalidateQueries({ queryKey: ["tutor-workflow-detail", activeWorkflowId] }),
      ]);
    } catch (err) {
      toast.error(
        `Tutor started but workflow stage update failed: ${
          err instanceof Error ? err.message : "Unknown"
        }`,
      );
    }
  }, [activeWorkflowId, queryClient, saveWorkflowPriming, startSession]);

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

    setShellMode("dashboard");
    setWorkflowView("polish");
  }, [activeWorkflowId, queryClient]);

  const saveWorkflowPolish = useCallback(
    async (payload: TutorPolishBundleRequest, finalize = false) => {
      if (!activeWorkflowId) {
        toast.error("Start or resume a workflow before using Polish.");
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

        setShellMode("dashboard");
        setWorkflowView(finalize ? "final_sync" : "polish");
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
    [activeSessionId, activeWorkflowDetail?.priming_bundle?.id, activeWorkflowId, queryClient],
  );

  useEffect(() => {
    if (shellMode !== "tutor" || !activeSessionId) {
      stageTimerSessionRef.current = null;
      setStageTimerRunning(false);
      setStageTimerStartedAt(null);
      setStageTimerDisplaySeconds(stageTimerAccumulatedSeconds);
      return;
    }
    if (stageTimerSessionRef.current === activeSessionId) return;
    stageTimerSessionRef.current = activeSessionId;
    const existingLogs = (activeWorkflowDetail?.stage_time_logs || []).filter(
      (log) => log.stage === "tutor",
    );
    const accumulated = existingLogs.reduce((sum, log) => sum + (log.seconds_active || 0), 0);
    const pauses = existingLogs.reduce((sum, log) => sum + (log.pause_count || 0), 0);
    setStageTimerAccumulatedSeconds(accumulated);
    setStageTimerPauseCount(pauses);
    setStageTimerDisplaySeconds(accumulated);
    if (activeWorkflowId) {
      setStageTimerStartedAt(new Date().toISOString());
      setStageTimerRunning(true);
    }
  }, [
    activeSessionId,
    activeWorkflowDetail?.stage_time_logs,
    activeWorkflowId,
    shellMode,
    stageTimerAccumulatedSeconds,
  ]);

  useEffect(() => {
    if (!stageTimerRunning || !stageTimerStartedAt) {
      setStageTimerDisplaySeconds(stageTimerAccumulatedSeconds);
      return;
    }
    const updateDisplay = () => {
      const elapsed =
        Math.max(0, Math.floor((Date.now() - new Date(stageTimerStartedAt).getTime()) / 1000)) +
        stageTimerAccumulatedSeconds;
      setStageTimerDisplaySeconds(elapsed);
    };
    updateDisplay();
    const interval = window.setInterval(updateDisplay, 1000);
    return () => window.clearInterval(interval);
  }, [stageTimerAccumulatedSeconds, stageTimerRunning, stageTimerStartedAt]);

  const toggleWorkflowStudyTimer = useCallback(async () => {
    if (!activeWorkflowId) {
      toast.error("Launch Tutor from a workflow to record study time.");
      return;
    }
    try {
      if (stageTimerRunning) {
        await persistStageTimeSlice("manual_pause", [
          { kind: "study_timer", session_id: activeSessionId, block_index: currentBlockIndex },
        ]);
        setStageTimerPauseCount((prev) => prev + 1);
        setStageTimerRunning(false);
        toast.success("Tutor study timer paused");
      } else {
        setStageTimerStartedAt(new Date().toISOString());
        setStageTimerRunning(true);
        toast.success("Tutor study timer resumed");
      }
    } catch (err) {
      toast.error(
        `Failed to update study timer: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    }
  }, [
    activeSessionId,
    activeWorkflowId,
    currentBlockIndex,
    persistStageTimeSlice,
    stageTimerRunning,
  ]);

  const saveWorkflowNoteCapture = useCallback(
    async (mode: "exact" | "editable") => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a workflow before saving notes.");
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

  const captureWorkflowMessageNote = useCallback(
    async (payload: {
      mode: "exact" | "editable";
      message: ChatMessage;
      index: number;
    }) => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a workflow before saving notes.");
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

  const saveWorkflowFeedbackEvent = useCallback(async () => {
    if (!activeWorkflowId || !activeSessionId) {
      toast.error("Start Tutor from a workflow before saving feedback.");
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
      toast.success("Workflow feedback saved");
    } catch (err) {
      toast.error(
        `Failed to save workflow feedback: ${err instanceof Error ? err.message : "Unknown"}`,
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

  const saveWorkflowMessageFeedback = useCallback(
    async (payload: {
      sentiment: "liked" | "disliked";
      message: ChatMessage;
      index: number;
    }) => {
      if (!activeWorkflowId || !activeSessionId) {
        toast.error("Start Tutor from a workflow before saving feedback.");
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

  const createWorkflowMemoryCapsule = useCallback(async (options?: {
    summaryOverride?: string | null;
  }) => {
    if (!activeWorkflowId || !activeSessionId) {
      toast.error("Start Tutor from a workflow before compacting memory.");
      return;
    }
    const fallbackSummary = options?.summaryOverride?.trim()
      ? options.summaryOverride.trim()
      : latestCommittedAssistantMessage?.content?.trim()
        ? latestCommittedAssistantMessage.content.trim().slice(0, 1200)
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
      const artifactRefs = artifacts.slice(-5).map((artifact, index) => ({
        index,
        type: artifact.type,
        title: artifact.title,
        created_at: artifact.createdAt,
      }));

      await api.tutor.createMemoryCapsule(activeWorkflowId, {
        tutor_session_id: activeSessionId,
        stage: "tutor",
        summary_text: memorySummaryText.trim() || fallbackSummary || null,
        current_objective: selectedObjectiveId || selectedObjectiveGroup || topic || null,
        study_unit: selectedObjectiveGroup || null,
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
    artifacts,
    memoryCardRequestsText,
    memorySummaryText,
    memoryUnresolvedText,
    memoryWeakPointsText,
    latestCommittedAssistantMessage,
    primingConceptsText,
    queryClient,
    selectedObjectiveGroup,
    selectedObjectiveId,
    topic,
  ]);

  const quickCompactWorkflowMemory = useCallback(async () => {
    const summary = latestCommittedAssistantMessage?.content?.trim() || memorySummaryText.trim();
    if (!summary) {
      toast.error("No completed assistant reply is available to compact yet.");
      return;
    }
    await createWorkflowMemoryCapsule({
      summaryOverride: summary,
    });
  }, [createWorkflowMemoryCapsule, latestCommittedAssistantMessage, memorySummaryText]);

  const nextNavigationToken = useCallback(() => {
    navigationTokenRef.current += 1;
    return navigationTokenRef.current;
  }, []);

  const openProjectFromHub = useCallback((nextCourseId: number) => {
    explicitShellModeRef.current = { courseId: nextCourseId, mode: "studio" };
    setCourseId(nextCourseId);
    setShellMode("studio");
    setShowSetup(false);
    setScheduleLaunchIntent(null);
    setStudioEntryRequest({ level: 2, token: nextNavigationToken() });
  }, [nextNavigationToken]);

  const openScheduleCourseFromHub = useCallback(
    (
      nextCourseId: number,
      kind: "manage_event" | "manage_exam",
    ) => {
      explicitShellModeRef.current = { courseId: nextCourseId, mode: "schedule" };
      setCourseId(nextCourseId);
      setShellMode("schedule");
      setShowSetup(false);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent({
        token: nextNavigationToken(),
        kind,
        courseId: nextCourseId,
      });
    },
    [nextNavigationToken],
  );

  const openScheduleEventFromHub = useCallback(
    (event: TutorHubEventSummary) => {
      explicitShellModeRef.current = { courseId: event.course_id, mode: "schedule" };
      setCourseId(event.course_id);
      setShellMode("schedule");
      setShowSetup(false);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent({
        token: nextNavigationToken(),
        kind: "open_event",
        courseId: event.course_id,
        courseEventId: event.id,
      });
    },
    [nextNavigationToken],
  );

  const openLibraryFromHub = useCallback(
    (params: {
      source: "assignment" | "exam" | "course";
      courseId: number;
      courseName?: string | null;
      courseEventId?: number;
      eventType?: string | null;
    }) => {
      writeLibraryLaunchFromTutor({
        source: params.source,
        courseId: params.courseId,
        courseName: params.courseName || undefined,
        courseEventId: params.courseEventId,
        eventType: params.eventType || null,
        target: "load_materials",
      });
      setLocation("/library");
    },
    [setLocation],
  );

  const resumeFromHubCandidate = useCallback(
    async (candidate: TutorHubResumeCandidate) => {
      if (candidate.can_resume && candidate.session_id) {
        await resumeSession(candidate.session_id);
        setShowSetup(false);
        setShellMode("tutor");
        return;
      }

      if (typeof candidate.course_id !== "number") return;

      explicitShellModeRef.current = {
        courseId: candidate.course_id,
        mode: candidate.last_mode || "studio",
      };
      setCourseId(candidate.course_id);
      setStudioEntryRequest(null);
      setScheduleLaunchIntent(null);

      if (!candidate.session_id) {
        clearTutorActiveSessionId();
        setActiveSessionId(null);
      }

      if (candidate.last_mode === "schedule") {
        setShellMode("schedule");
        setShowSetup(false);
        return;
      }

      if (candidate.last_mode === "publish") {
        setWorkflowView("launch");
        setShellMode("dashboard");
        setShowSetup(false);
        return;
      }

      if (candidate.last_mode === "studio") {
        setShellMode("studio");
        setShowSetup(false);
        return;
      }

      setShellMode("dashboard");
      setShowSetup(false);
    },
    [resumeSession],
  );

  const runRecommendedAction = useCallback(
    async (action: TutorHubRecommendedAction) => {
      if (action.kind === "resume_session" && action.session_id) {
        await resumeSession(action.session_id);
        setShowSetup(false);
        setShellMode("tutor");
        return;
      }

      if (action.kind === "wheel_course" && typeof action.course_id === "number") {
        openProjectFromHub(action.course_id);
        return;
      }

      if (
        (action.kind === "planner_task" || action.kind === "exam" || action.kind === "assignment") &&
        typeof action.course_id === "number"
      ) {
        if (typeof action.course_event_id === "number") {
          openScheduleEventFromHub({
            id: action.course_event_id,
            course_id: action.course_id,
            course_name: action.course_name || action.course_code || "Course",
            course_code: action.course_code,
            title: action.title,
            type: action.event_type || "other",
            scheduled_date: null,
            status: "pending",
          });
          return;
        }
        openScheduleCourseFromHub(
          action.course_id,
          action.kind === "exam" ? "manage_exam" : "manage_event",
        );
      }
    },
    [
      openProjectFromHub,
      openScheduleCourseFromHub,
      openScheduleEventFromHub,
      resumeSession,
    ],
  );

  const applyStoredStartState = useCallback(
    (
      savedStartState: ReturnType<typeof readTutorStoredStartState>,
      canonicalMaterialSelection: number[],
    ) => {
      if (!savedStartState) return false;

      let restoredCourseId = false;
      if (typeof savedStartState.courseId === "number") {
        setCourseId(savedStartState.courseId);
        restoredCourseId = true;
      }
      setTopic(savedStartState.topic);
      if (canonicalMaterialSelection.length === 0) {
        setSelectedMaterials(savedStartState.selectedMaterials);
      }
      setChainId(savedStartState.chainId);
      setCustomBlockIds(savedStartState.customBlockIds);
      setAccuracyProfile(savedStartState.accuracyProfile);
      setObjectiveScope(savedStartState.objectiveScope);
      setSelectedObjectiveId(savedStartState.selectedObjectiveId);
      setSelectedObjectiveGroup(savedStartState.selectedObjectiveGroup);
      setSelectedPaths(savedStartState.selectedPaths);
      return restoredCourseId;
    },
    [
      setAccuracyProfile,
      setChainId,
      setCourseId,
      setCustomBlockIds,
      setObjectiveScope,
      setSelectedMaterials,
      setSelectedObjectiveGroup,
      setSelectedObjectiveId,
      setSelectedPaths,
      setTopic,
    ],
  );

  const hydrateProjectShellState = useCallback(
    (
      nextProjectShell: TutorProjectShellResponse,
      nextCourseId: number,
      hasExplicitModeOverride: boolean,
    ) => {
      setShellHydratedCourseId(nextCourseId);
      setShellRevision(nextProjectShell.workspace_state.revision || 0);

      if (
        !hasExplicitModeOverride &&
        !initialRouteQuery.mode &&
        shellMode === "studio" &&
        nextProjectShell.workspace_state.last_mode
      ) {
        setShellMode(
          nextProjectShell.workspace_state.last_mode === "publish"
            ? "dashboard"
            : nextProjectShell.workspace_state.last_mode,
        );
      }
      if (
        !initialRouteQuery.boardScope &&
        activeBoardScope === "project" &&
        nextProjectShell.workspace_state.active_board_scope
      ) {
        setActiveBoardScope(nextProjectShell.workspace_state.active_board_scope);
      }
      if (
        initialRouteQuery.boardId === undefined &&
        typeof nextProjectShell.workspace_state.active_board_id === "number"
      ) {
        setActiveBoardId(nextProjectShell.workspace_state.active_board_id);
      }
      setViewerState(nextProjectShell.workspace_state.viewer_state || null);
      if (
        selectedMaterials.length === 0 &&
        Array.isArray(nextProjectShell.workspace_state.selected_material_ids) &&
        nextProjectShell.workspace_state.selected_material_ids.length > 0
      ) {
        setSelectedMaterials(
          writeTutorSelectedMaterialIds(nextProjectShell.workspace_state.selected_material_ids),
        );
      }
    },
    [
      activeBoardScope,
      initialRouteQuery.boardId,
      initialRouteQuery.boardScope,
      initialRouteQuery.mode,
      selectedMaterials.length,
      setActiveBoardId,
      setActiveBoardScope,
      setSelectedMaterials,
      setShellHydratedCourseId,
      setShellMode,
      setShellRevision,
      setViewerState,
      shellMode,
    ],
  );

  const restoreTutorShellState = useCallback(async () => {
    let restoredCourseId = false;
    const { fromLibraryHandoff, brainLaunchContext: nextBrainLaunchContext } =
      consumeTutorLaunchHandoff();
    const fromBrainHandoff = Boolean(nextBrainLaunchContext);
    if (nextBrainLaunchContext) {
      setBrainLaunchContext(nextBrainLaunchContext);
    }

    const resumeCandidateSessionId = initialRouteQuery.sessionId || readTutorActiveSessionId();
    try {
      if (resumeCandidateSessionId) {
        const session = await api.tutor.getSession(resumeCandidateSessionId);
        if (session.status === "active") {
          applySessionState(session);
          setShowSetup(false);
          return;
        }

        clearTutorActiveSessionId();
        if (!initialRouteQuery.mode) {
          setShellMode("dashboard");
        }
      }
    } catch {
      if (!initialRouteQuery.sessionId) {
        clearTutorActiveSessionId();
        if (!initialRouteQuery.mode) {
          setShellMode("dashboard");
        }
      }
    }

    setShowSetup(true);

    const canonicalMaterialSelection = readTutorSelectedMaterialIds();
    if (canonicalMaterialSelection.length > 0) {
      setSelectedMaterials(canonicalMaterialSelection);
    }

    if (!fromLibraryHandoff && !fromBrainHandoff) {
      restoredCourseId = applyStoredStartState(
        readTutorStoredStartState(),
        canonicalMaterialSelection,
      );
    }

    if (fromLibraryHandoff || fromBrainHandoff || !restoredCourseId) {
      try {
        const { currentCourse } = await api.studyWheel.getCurrentCourse();
        if (typeof currentCourse?.id === "number") {
          setCourseId((prev) => (typeof prev === "number" ? prev : currentCourse.id));
        }
      } catch {
        /* current course fetch failed — ignore */
      }
    }
  }, [
    applySessionState,
    applyStoredStartState,
    initialRouteQuery.mode,
    initialRouteQuery.sessionId,
    setBrainLaunchContext,
    setCourseId,
    setSelectedMaterials,
    setShellMode,
    setShowSetup,
  ]);

  useEffect(() => {
    if (hasRestored) return;
    setHasRestored(true);

    void restoreTutorShellState();
  }, [hasRestored, restoreTutorShellState]);

  useEffect(() => {
    if (!projectShell || typeof courseId !== "number") return;
    const explicitShellMode = explicitShellModeRef.current;
    const hasExplicitModeOverride =
      explicitShellMode?.courseId === courseId;

    if (shellHydratedCourseId !== courseId) {
      hydrateProjectShellState(projectShell, courseId, hasExplicitModeOverride);

      if (hasExplicitModeOverride) {
        explicitShellModeRef.current = null;
      }
    }

    if (
      !resumedFromProjectShellRef.current &&
      !activeSessionId &&
      projectShell.active_session?.session_id
    ) {
      resumedFromProjectShellRef.current = true;
      void api.tutor
        .getSession(projectShell.active_session.session_id)
        .then((session) => {
          applySessionState(session);
          setShowSetup(false);
        })
        .catch(() => {
          resumedFromProjectShellRef.current = false;
        });
    }
  }, [
    activeSessionId,
    activeBoardScope,
    applySessionState,
    courseId,
    hydrateProjectShellState,
    shellHydratedCourseId,
    initialRouteQuery.boardScope,
    initialRouteQuery.mode,
    projectShell,
  ]);

  useEffect(() => {
    writeTutorShellQuery({
      courseId,
      sessionId: activeSessionId || undefined,
      mode: shellMode,
      boardScope: activeBoardScope,
      boardId: activeBoardId ?? undefined,
    });
  }, [activeBoardId, activeBoardScope, activeSessionId, courseId, shellMode]);

  useEffect(() => {
    if (!hasRestored || typeof courseId !== "number" || shellMode === "dashboard") return;
    const persistKey = JSON.stringify({
      courseId,
      activeSessionId,
      shellMode,
      activeBoardScope,
      activeBoardId,
      viewerState,
      selectedMaterialIds: selectedMaterials,
    });
    if (persistKey === lastPersistedShellKeyRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      lastPersistedShellKeyRef.current = persistKey;
      try {
        const result = await api.tutor.saveProjectShellState({
          course_id: courseId,
          active_tutor_session_id: activeSessionId,
          last_mode: shellMode,
          active_board_scope: activeBoardScope,
          active_board_id: activeBoardId,
          viewer_state: viewerState,
          selected_material_ids: selectedMaterials,
          revision: shellRevision,
        });
        setShellRevision(result.workspace_state.revision);
        await queryClient.invalidateQueries({ queryKey: ["tutor-project-shell", courseId] });
      } catch (err) {
        // Best-effort shell persistence; do not interrupt the Tutor flow.
        // On 409 Conflict, we need to refresh the shell state to get the latest revision.
        // We do NOT clear lastPersistedShellKeyRef, because that causes an infinite save loop.
        await queryClient.invalidateQueries({ queryKey: ["tutor-project-shell", courseId] });
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    courseId,
    hasRestored,
    queryClient,
    selectedMaterials,
    shellMode,
    shellRevision,
    viewerState,
  ]);

  const toggleMaterial = useCallback((id: number) => {
    setSelectedMaterials((prev) => {
      const next = prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id];
      return writeTutorSelectedMaterialIds(next);
    });
  }, []);

  const selectAllMaterials = useCallback(() => {
    const allIds = chatMaterials.map((m) => m.id);
    setSelectedMaterials(writeTutorSelectedMaterialIds(allIds));
  }, [chatMaterials]);

  const clearMaterialSelection = useCallback(() => {
    setSelectedMaterials([]);
    writeTutorSelectedMaterialIds([]);
  }, []);

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path;
  };

  // ─── Derived state ───

  // ─── SESSION VIEW ─── (active session, full-screen chat)
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const currentBlock =
    chainBlocks.length > 0 && currentBlockIndex < chainBlocks.length
      ? chainBlocks[currentBlockIndex]
      : null;
  const hasChain = chainBlocks.length > 0;
  const isChainComplete = hasChain && currentBlockIndex >= chainBlocks.length;
  const progressCount = hasChain ? Math.min(currentBlockIndex + 1, chainBlocks.length) : 0;
  const facilitationSteps = parseFacilitationSteps(currentBlock?.facilitation_prompt);
  const promotedStudioItems =
    projectStudioItems?.items.filter((item) => item.status === "promoted") || [];

  const tutorHeroStats = [
    { label: "Mode", value: shellMode.toUpperCase() },
    {
      label: "Session",
      value: activeSessionId ? "LIVE" : "READY",
      tone: activeSessionId ? "success" : "info",
    } as const,
    {
      label: "Course",
      value: courseLabel || "UNSCOPED",
      tone: courseLabel ? "default" : "warn",
    } as const,
    {
      label: "Materials",
      value: String(selectedMaterials.length),
      tone: selectedMaterials.length > 0 ? "info" : "default",
    } as const,
  ];

  const tutorShellTopBar = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-2">
        <div>
          <div className={CONTROL_KICKER}>Tutor</div>
          <div className={cn(CONTROL_COPY, "text-[11px]")}>
            Brain&apos;s default live study surface for guided sessions, artifacts, and next-step handoff.
          </div>
        </div>
        {!activeSessionId ? (
          <Badge variant="outline" className="shrink-0 rounded-full border-primary/30 px-3 py-1 font-terminal text-[10px]">
            BRAIN TO TUTOR LIVE SURFACE
          </Badge>
        ) : null}
      </div>
      {!activeSessionId && brainLaunchContext?.title ? (
        <div
          data-testid="tutor-brain-handoff"
          className={cn(CONTROL_DECK_SECTION, "space-y-1")}
        >
          <div className={CONTROL_KICKER}>Opened From Brain</div>
          <div className="font-terminal text-xs text-white">{brainLaunchContext.title}</div>
          {brainLaunchContext.reason ? (
            <div className={cn(CONTROL_COPY, "text-[11px]")}>
              {brainLaunchContext.reason}
            </div>
          ) : null}
        </div>
      ) : null}
      {activeSessionId ? (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Badge variant="outline" className="min-h-[40px] shrink-0 rounded-full border-primary/30 px-3 font-terminal text-[11px]">
            <span className="text-muted-foreground mr-1">TOPIC:</span>
            <span className="text-foreground">{topic || "Freeform"}</span>
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Turns">
              <MessageSquare className={ICON_SM} />
              {turnCount}
            </span>
            {startedAt ? (
              <span className={cn(CONTROL_CHIP, "min-h-[40px] px-2.5 text-[11px]")} title="Started At">
                <Clock className={ICON_SM} />
                {new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : null}
          </div>

          {hasChain && currentBlock && !isChainComplete ? (
            <div className="flex items-center gap-2 px-2 shrink-0 border-l border-primary/20">
              <Badge
                variant="outline"
                className={`h-7 rounded-full px-2 text-[10px] font-arcade uppercase ${
                  CONTROL_PLANE_COLORS[currentBlock.control_stage?.toUpperCase?.() || currentBlock.category?.toUpperCase?.() || ""]?.badge
                  || "bg-secondary/20 text-muted-foreground"
                }`}
              >
                {currentBlock.control_stage || currentBlock.category || "BLOCK"}
              </Badge>
              <span className="text-xs font-terminal text-foreground truncate max-w-[120px]" title={currentBlock.name}>
                {currentBlock.name}
              </span>
              {blockTimerSeconds !== null ? (
                <span
                  className={`text-sm font-arcade tabular-nums ${
                    blockTimerSeconds <= 0
                      ? "text-destructive animate-pulse"
                      : blockTimerSeconds <= 60
                        ? "text-destructive"
                        : blockTimerSeconds <= 120
                          ? "text-warning"
                          : "text-foreground"
                  }`}
                >
                  {formatTimer(Math.max(0, blockTimerSeconds))}
                </span>
              ) : null}
              <span className="text-[10px] text-muted-foreground font-terminal">
                {progressCount}/{chainBlocks.length}
              </span>
              {blockTimerSeconds !== null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimerPaused((p) => !p)}
                  className={cn(controlToggleButton(false, "secondary", true), "h-8 w-8 p-0 text-muted-foreground")}
                  title={timerPaused ? "Resume timer" : "Pause timer"}
                >
                  {timerPaused ? <Timer className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={advanceBlock}
                className={cn(controlToggleButton(false, "secondary", true), "h-8 px-2 text-[10px]")}
                title="Skip to next block"
              >
                <SkipForward className="w-3 h-3" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("dashboard");
            setWorkflowView("launch");
          }}
          className={controlToggleButton(shellMode === "dashboard" && workflowView === "launch", "primary")}
        >
          <ListChecks className={`${ICON_MD} mr-1`} />
          LAUNCH
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("dashboard");
            setWorkflowView("priming");
          }}
          className={controlToggleButton(shellMode === "dashboard" && workflowView === "priming", "primary")}
          disabled={!activeWorkflowId}
        >
          <Sparkles className={`${ICON_MD} mr-1`} />
          PRIMING
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void openWorkflowPolish();
          }}
          className={controlToggleButton(shellMode === "dashboard" && workflowView === "polish", "primary")}
          disabled={!activeWorkflowId}
        >
          <FileStack className={`${ICON_MD} mr-1`} />
          POLISH
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("dashboard");
            setWorkflowView("final_sync");
          }}
          className={controlToggleButton(shellMode === "dashboard" && workflowView === "final_sync", "primary")}
          disabled={!activeWorkflowDetail?.polish_bundle}
        >
          <CheckCircle2 className={`${ICON_MD} mr-1`} />
          FINAL SYNC
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("studio");
          }}
          className={controlToggleButton(shellMode === "studio", "primary")}
        >
          <PenTool className={`${ICON_MD} mr-1`} />
          STUDIO
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("tutor");
          }}
          className={controlToggleButton(shellMode === "tutor", "primary")}
        >
          <MessageSquare className={`${ICON_MD} mr-1`} />
          TUTOR
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStudioEntryRequest(null);
            setScheduleLaunchIntent(null);
            setShellMode("schedule");
          }}
          className={controlToggleButton(shellMode === "schedule", "primary")}
        >
          <Clock className={`${ICON_MD} mr-1`} />
          SCHEDULE
        </Button>
        <Button variant="ghost" size="sm" onClick={openSettings} className={controlToggleButton(false)}>
          <SlidersHorizontal className={`${ICON_MD} mr-1`} />
          SETTINGS
        </Button>

        {activeSessionId && shellMode === "tutor" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArtifacts((prev) => !prev)}
              className={cn(controlToggleButton(showArtifacts), "ml-1")}
            >
              {showArtifacts ? (
                <PanelRightClose className={`${ICON_MD} mr-1`} />
              ) : (
                <PanelRightOpen className={`${ICON_MD} mr-1`} />
              )}
              ARTIFACTS
              {artifacts.length > 0 ? (
                <Badge variant="outline" className="ml-1 rounded-full border-primary/40 px-1.5 py-0.5 text-[10px]">
                  {artifacts.length}
                </Badge>
              ) : null}
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeSessionId) {
                    api.tutor.exportSession(activeSessionId).catch(() => {
                      toast.error("Failed to export session");
                    });
                  }
                }}
                className={controlToggleButton(false)}
                title="Export conversation as Markdown"
              >
                <Download className={`${ICON_MD} mr-1`} />
                EXPORT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEndConfirm(true)}
                className={cn(
                  controlToggleButton(false),
                  "h-11 border-destructive/18 text-destructive/80 hover:border-destructive/36 hover:text-destructive",
                )}
                title="End session"
              >
                <Square className={`${ICON_MD} mr-1`} />
                END
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <Layout>
      <PageScaffold
        eyebrow="Live Study Core"
        title="Tutor"
        subtitle="Run the staged Tutor workflow from Launch through Priming, then move into Tutor, Studio, schedule, and Final Sync without losing context."
        className="min-h-[calc(100vh-140px)]"
        contentClassName="gap-6"
        stats={tutorHeroStats}
        actions={
          <Button
            variant="shell"
            size="sm"
            className="font-arcade text-xs"
            onClick={() => {
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tutor-hub"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-sessions"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-project-shell"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-studio-restore"] }),
                queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] }),
                queryClient.invalidateQueries({ queryKey: ["obsidian"] }),
              ]);
            }}
          >
            <RefreshCw className="w-3 h-3 mr-2" /> REFRESH
          </Button>
        }
      >
        <CoreWorkspaceFrame topBar={tutorShellTopBar} contentClassName="relative min-h-0">
          {activeSessionId && scholarStrategy && (
            <div className="flex-none">
            <button
              type="button"
              onClick={() => setScholarStrategyExpanded((prev) => !prev)}
              className="w-full flex items-center gap-2 px-4 py-1.5 bg-black/55 border-b border-primary/15 hover:bg-black/40 transition-colors text-left"
            >
              <ChevronDown className={`h-3 w-3 text-primary/60 transition-transform duration-200 ${scholarStrategyExpanded ? "" : "-rotate-90"}`} />
              <span className={TEXT_BADGE}>SCHOLAR STRATEGY</span>
              <span className="font-terminal text-[11px] text-muted-foreground truncate flex-1">
                {scholarStrategy.hybridArchetype?.label || ""}
              </span>
            </button>
            {scholarStrategyExpanded && (
            <Card className={`mx-4 mt-1 mb-2 rounded-none ${CARD_BORDER} bg-black/55 border-primary/30`}>
              <div className="p-3 space-y-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="font-terminal text-xs text-muted-foreground max-w-3xl">
                      {scholarStrategy.summary}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                        BRAIN SNAPSHOT {scholarStrategy.profileSnapshotId ?? "N/A"}
                      </Badge>
                      <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                        {scholarStrategy.hybridArchetype?.label || "EMERGING PATTERN"}
                      </Badge>
                      {scholarStrategy.activeInvestigation?.title && (
                        <Badge variant="outline" className="rounded-none text-[10px] border-secondary/40">
                          RESEARCH: {scholarStrategy.activeInvestigation.title}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="font-terminal text-[11px] text-muted-foreground max-w-sm">
                    {scholarStrategy.boundedBy?.note}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(scholarStrategy.fields || {}).map(([fieldKey, field]) => (
                    <div key={fieldKey} className="border border-primary/20 bg-black/40 p-2 rounded-none space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-arcade text-[10px] text-primary/80">{fieldKey}</span>
                        <Badge variant="outline" className="rounded-none text-[10px] border-primary/30">
                          {field.value}
                        </Badge>
                      </div>
                      <div className="font-terminal text-[11px] text-muted-foreground">
                        {field.rationale}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-2">
                    <div className={TEXT_BADGE}>LEARNER FIT FEEDBACK</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {[
                        { key: "pacing", label: "PACING", options: ["slower", "good", "faster"] },
                        { key: "scaffolds", label: "SCAFFOLDS", options: ["less", "good", "more"] },
                        { key: "retrievalPressure", label: "RETRIEVAL", options: ["lighter", "good", "harder"] },
                        { key: "explanationDensity", label: "EXPLANATIONS", options: ["leaner", "good", "denser"] },
                      ].map((control) => (
                        <div key={control.key} className="border border-primary/20 bg-black/40 p-2 rounded-none space-y-2">
                          <div className="font-arcade text-[10px] text-primary/80">{control.label}</div>
                          <div className="flex flex-wrap gap-1">
                            {control.options.map((option) => {
                              const active = (strategyFeedback?.[control.key as keyof TutorStrategyFeedback] || "") === option;
                              return (
                                <Button
                                  key={option}
                                  variant="ghost"
                                  size="sm"
                                  disabled={savingStrategyFeedback}
                                  onClick={() => {
                                    void saveScholarStrategyFeedback(
                                      control.key as "pacing" | "scaffolds" | "retrievalPressure" | "explanationDensity",
                                      option,
                                    );
                                  }}
                                  className={active ? BTN_TOOLBAR_ACTIVE : BTN_TOOLBAR}
                                >
                                  {option.toUpperCase()}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        value={strategyNotes}
                        onChange={(event) => setStrategyNotes(event.target.value)}
                        placeholder="What about the strategy is helping or hurting right now?"
                        className="rounded-none bg-black/40 border-primary/20 min-h-[90px]"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-terminal text-[11px] text-muted-foreground">
                          Feedback is stored on the Tutor session so Brain and Scholar can inspect it later.
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={savingStrategyFeedback}
                          onClick={() => {
                            void saveScholarStrategyNotes();
                          }}
                          className={BTN_TOOLBAR}
                        >
                          SAVE FEEDBACK
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border border-secondary/20 bg-black/40 p-3 rounded-none">
                    <div className={TEXT_BADGE}>BOUNDARIES</div>
                    <div className="font-terminal text-[11px] text-muted-foreground space-y-2">
                      <div>
                        Allowed: {scholarStrategy.boundedBy?.allowedFields?.join(", ")}
                      </div>
                      <div>
                        Fixed: {scholarStrategy.boundedBy?.forbiddenFields?.join(", ")}
                      </div>
                      {scholarStrategy.activeInvestigation?.topFinding && (
                        <div>
                          Latest finding: {scholarStrategy.activeInvestigation.topFinding}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            )}
            </div>
          )}

          <div className="flex-1 flex min-h-0 relative">
            <div className="flex-1 bg-black/40 flex flex-col min-w-0">
              {shellMode === "studio" ? (
                <div key="studio" className="flex-1 min-h-0 animate-fade-slide-in">
                  <TutorStudioMode
                    courseId={courseId}
                    chainId={chainId}
                    activeSessionId={activeSessionId}
                    availableMaterials={chatMaterials}
                  selectedMaterialIds={selectedMaterials}
                  activeBoardScope={activeBoardScope}
                  activeBoardId={activeBoardId}
                  viewerState={viewerState}
                  onBoardScopeChange={(scope) => {
                    setActiveBoardScope(scope);
                    setActiveBoardId(null);
                  }}
                  onActiveBoardIdChange={setActiveBoardId}
                  onViewerStateChange={setViewerState}
                  onCourseChange={(id) => setCourseId(id)}
                  onLaunchSession={() => {
                    setShellMode("dashboard");
                    setShowSetup(false);
                  }}
                  entryRequest={studioEntryRequest}
                />
                </div>
              ) : shellMode === "dashboard" ? (
                <div key="dashboard-panel" className="flex-1 min-h-0 overflow-y-auto w-full p-4 animate-fade-slide-in">
                  {workflowView === "launch" ? (
                    <TutorWorkflowLaunchHub
                      workflows={filteredWorkflows}
                      totalCount={workflows.length}
                      courses={tutorContentSources?.courses || []}
                      filters={workflowFilters}
                      onFiltersChange={setWorkflowFilters}
                      onStartNew={() => {
                        void createWorkflowAndOpenPriming();
                      }}
                      onOpenWorkflow={(workflow) => {
                        void openWorkflowRecord(workflow);
                      }}
                      tutorHub={tutorHub}
                      tutorHubLoading={tutorHubLoading}
                      activeWorkflowId={activeWorkflowId}
                      isCreating={creatingWorkflow}
                    />
                  ) : workflowView === "priming" ? (
                    <TutorWorkflowPrimingPanel
                      workflow={activeWorkflowDetail?.workflow || null}
                      courses={tutorContentSources?.courses || []}
                      courseId={courseId}
                      setCourseId={setCourseId}
                      selectedMaterials={selectedMaterials}
                      setSelectedMaterials={setSelectedMaterials}
                      topic={topic}
                      setTopic={setTopic}
                      objectiveScope={objectiveScope}
                      setObjectiveScope={setObjectiveScope}
                      selectedObjectiveId={selectedObjectiveId}
                      setSelectedObjectiveId={setSelectedObjectiveId}
                      selectedObjectiveGroup={selectedObjectiveGroup}
                      setSelectedObjectiveGroup={setSelectedObjectiveGroup}
                      availableObjectives={availableObjectives}
                      studyUnitOptions={studyUnitOptions}
                      primingMethod={primingMethod}
                      setPrimingMethod={setPrimingMethod}
                      primingChainId={primingChainId}
                      setPrimingChainId={setPrimingChainId}
                      summaryText={primingSummaryText}
                      setSummaryText={setPrimingSummaryText}
                      conceptsText={primingConceptsText}
                      setConceptsText={setPrimingConceptsText}
                      terminologyText={primingTerminologyText}
                      setTerminologyText={setPrimingTerminologyText}
                      rootExplanationText={primingRootExplanationText}
                      setRootExplanationText={setPrimingRootExplanationText}
                      gapsText={primingGapsText}
                      setGapsText={setPrimingGapsText}
                      recommendedStrategyText={primingStrategyText}
                      setRecommendedStrategyText={setPrimingStrategyText}
                      sourceInventory={mergedPrimingSourceInventory}
                      vaultFolderPreview={derivedVaultFolder}
                      readinessItems={primingReadinessItems}
                      onBackToLaunch={() => setWorkflowView("launch")}
                      onSaveDraft={() => {
                        void saveWorkflowPriming("draft");
                      }}
                      onMarkReady={() => {
                        void saveWorkflowPriming("ready");
                      }}
                      onStartTutor={() => {
                        void startTutorFromWorkflow();
                      }}
                      onRunAssistForSelected={() => {
                        void runWorkflowPrimingAssist(selectedMaterials);
                      }}
                      onRunAssistForMaterial={(materialId) => {
                        void runWorkflowPrimingAssist([materialId]);
                      }}
                      isSaving={savingPrimingBundle}
                      isStartingTutor={isStarting}
                      isRunningAssist={runningPrimingAssist}
                      assistTargetMaterialId={primingAssistTargetMaterialId}
                    />
                  ) : workflowView === "polish" ? (
                    <TutorWorkflowPolishStudio
                      workflow={activeWorkflowDetail?.workflow || null}
                      primingBundleId={activeWorkflowDetail?.priming_bundle?.id || null}
                      capturedNotes={activeWorkflowDetail?.captured_notes || []}
                      feedbackEvents={activeWorkflowDetail?.feedback_events || []}
                      memoryCapsules={activeWorkflowDetail?.memory_capsules || []}
                      existingBundle={activeWorkflowDetail?.polish_bundle || null}
                      onBackToTutor={() => setShellMode("tutor")}
                      onSaveDraft={(payload) => {
                        void saveWorkflowPolish(payload, false);
                      }}
                      onFinalize={(payload) => {
                        void saveWorkflowPolish(payload, true);
                      }}
                      isSaving={savingPolishBundle}
                    />
                  ) : (
                    <TutorWorkflowFinalSync
                      workflowDetail={activeWorkflowDetail || null}
                      onBackToPolish={() => setWorkflowView("polish")}
                    />
                  )}
                </div>
              ) : shellMode === "schedule" ? (
                <div key="schedule" className="flex-1 min-h-0 overflow-y-auto p-4 animate-fade-slide-in">
                  <div className="mx-auto h-full w-full max-w-7xl">
                    <TutorScheduleMode
                      courseId={courseId ?? null}
                      courseName={courseLabel || null}
                      focusTopic={topic || null}
                      launchIntent={scheduleLaunchIntent}
                    />
                  </div>
                </div>
              ) : (
                <div key="chat" className="flex-1 flex flex-col min-h-0 animate-fade-slide-in">
                  {activeSessionId ? (
                    <div className="flex h-full min-h-0 flex-col gap-4">
                      <Card className={`rounded-none ${CARD_BORDER} bg-black/45 border-primary/20`}>
                        <CardHeader className="border-b border-primary/15 pb-3">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <CardTitle className="font-arcade text-xs text-primary">
                                TUTOR WORKFLOW RUNTIME
                              </CardTitle>
                              <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                                Timer slices, note capture, feedback, and manual memory compaction
                                now write into the active workflow.
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                                {activeWorkflowId ? "WORKFLOW LINKED" : "NO WORKFLOW"}
                              </Badge>
                              {activeWorkflowDetail?.captured_notes ? (
                                <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                                  {activeWorkflowDetail.captured_notes.length} NOTES
                                </Badge>
                              ) : null}
                              {activeWorkflowDetail?.feedback_events ? (
                                <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                                  {activeWorkflowDetail.feedback_events.length} FEEDBACK
                                </Badge>
                              ) : null}
                              {activeWorkflowDetail?.memory_capsules ? (
                                <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                                  {activeWorkflowDetail.memory_capsules.length} CAPSULES
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-4 xl:grid-cols-[0.92fr_1.08fr_1.02fr]">
                          <div className="space-y-4">
                            <div className="border border-primary/20 bg-black/35 p-3">
                              <div className="font-arcade text-[10px] text-primary/80">STUDY TIMER</div>
                              <div className="mt-2 font-terminal text-2xl text-foreground">
                                {formatElapsedDuration(stageTimerDisplaySeconds)}
                              </div>
                              <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                                Pause count {stageTimerPauseCount}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  className="rounded-none font-arcade text-[10px]"
                                  onClick={() => {
                                    void toggleWorkflowStudyTimer();
                                  }}
                                  disabled={!activeWorkflowId}
                                >
                                  {stageTimerRunning ? "PAUSE TIMER" : "RESUME TIMER"}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="rounded-none font-arcade text-[10px]"
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        const sliceSeconds = await persistStageTimeSlice("manual_save", [
                                          { kind: "study_timer", session_id: activeSessionId },
                                        ]);
                                        if (sliceSeconds > 0) {
                                          setStageTimerStartedAt(new Date().toISOString());
                                          setStageTimerRunning(true);
                                        }
                                      } catch (err) {
                                        toast.error(
                                          `Failed to save timer slice: ${
                                            err instanceof Error ? err.message : "Unknown"
                                          }`,
                                        );
                                      }
                                    })();
                                  }}
                                  disabled={!activeWorkflowId || !stageTimerRunning}
                                >
                                  SAVE SLICE
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                              <div className="font-arcade text-[10px] text-primary/80">SAVE EXACT NOTE</div>
                              <input
                                value={exactNoteTitle}
                                onChange={(event) => setExactNoteTitle(event.target.value)}
                                placeholder="Optional exact note title"
                                className={INPUT_BASE}
                              />
                              <Textarea
                                value={exactNoteContent}
                                onChange={(event) => setExactNoteContent(event.target.value)}
                                placeholder="Paste the exact wording you want preserved."
                                className="min-h-[110px] rounded-none bg-black/40 border-primary/20"
                              />
                              <Button
                                variant="outline"
                                className="rounded-none font-arcade text-[10px]"
                                onClick={() => {
                                  void saveWorkflowNoteCapture("exact");
                                }}
                                disabled={!activeWorkflowId || savingRuntimeEvent}
                              >
                                SAVE EXACT
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                              <div className="font-arcade text-[10px] text-primary/80">SAVE EDITABLE NOTE</div>
                              <input
                                value={editableNoteTitle}
                                onChange={(event) => setEditableNoteTitle(event.target.value)}
                                placeholder="Optional editable note title"
                                className={INPUT_BASE}
                              />
                              <Textarea
                                value={editableNoteContent}
                                onChange={(event) => setEditableNoteContent(event.target.value)}
                                placeholder="Save a revisable note for Polish and Obsidian."
                                className="min-h-[110px] rounded-none bg-black/40 border-primary/20"
                              />
                              <Button
                                variant="outline"
                                className="rounded-none font-arcade text-[10px]"
                                onClick={() => {
                                  void saveWorkflowNoteCapture("editable");
                                }}
                                disabled={!activeWorkflowId || savingRuntimeEvent}
                              >
                                SAVE EDITABLE
                              </Button>
                            </div>

                            <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                              <div className="font-arcade text-[10px] text-primary/80">SESSION FEEDBACK</div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <select
                                  value={feedbackSentiment}
                                  onChange={(event) =>
                                    setFeedbackSentiment(event.target.value as "liked" | "disliked")
                                  }
                                  className={SELECT_BASE}
                                >
                                  <option value="liked">Liked</option>
                                  <option value="disliked">Disliked</option>
                                </select>
                                <select
                                  value={feedbackIssueType}
                                  onChange={(event) => setFeedbackIssueType(event.target.value)}
                                  className={SELECT_BASE}
                                >
                                  <option value="good">Good</option>
                                  <option value="mistake">Mistake</option>
                                  <option value="incorrect">Incorrect</option>
                                  <option value="unclear">Unclear</option>
                                  <option value="missing_context">Missing context</option>
                                </select>
                              </div>
                              <Textarea
                                value={feedbackMessage}
                                onChange={(event) => setFeedbackMessage(event.target.value)}
                                placeholder="What worked or failed in this tutor run?"
                                className="min-h-[100px] rounded-none bg-black/40 border-primary/20"
                              />
                              <Button
                                variant="outline"
                                className="rounded-none font-arcade text-[10px]"
                                onClick={() => {
                                  void saveWorkflowFeedbackEvent();
                                }}
                                disabled={!activeWorkflowId || savingRuntimeEvent}
                              >
                                SAVE FEEDBACK
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                            <div className="font-arcade text-[10px] text-primary/80">MEMORY CAPSULE</div>
                            <Textarea
                              value={memorySummaryText}
                              onChange={(event) => setMemorySummaryText(event.target.value)}
                              placeholder="Compaction summary for the finished portion of the session."
                              className="min-h-[90px] rounded-none bg-black/40 border-primary/20"
                            />
                            <Textarea
                              value={memoryWeakPointsText}
                              onChange={(event) => setMemoryWeakPointsText(event.target.value)}
                              placeholder={"Weak points\nOne per line"}
                              className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                            />
                            <Textarea
                              value={memoryUnresolvedText}
                              onChange={(event) => setMemoryUnresolvedText(event.target.value)}
                              placeholder={"Unresolved questions\nOne per line"}
                              className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                            />
                            <Textarea
                              value={memoryCardRequestsText}
                              onChange={(event) => setMemoryCardRequestsText(event.target.value)}
                              placeholder={"Queued card requests\nOne per line"}
                              className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                            />
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-[10px]"
                              onClick={() => {
                                void createWorkflowMemoryCapsule();
                              }}
                              disabled={!activeWorkflowId || savingRuntimeEvent}
                            >
                              CREATE CAPSULE
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-[10px]"
                              onClick={() => {
                                void openWorkflowPolish();
                              }}
                              disabled={!activeWorkflowId}
                            >
                              OPEN POLISH
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="min-h-0 flex-1">
                        <TutorChat
                          sessionId={activeSessionId}
                          courseId={courseId}
                          availableMaterials={chatMaterials}
                          selectedMaterialIds={selectedMaterials}
                          accuracyProfile={accuracyProfile}
                          onAccuracyProfileChange={setAccuracyProfile}
                          onSelectedMaterialIdsChange={setSelectedMaterials}
                          onMaterialsChanged={refreshChatMaterials}
                          onArtifactCreated={handleArtifactCreated}
                          onStudioCapture={handleStudioCapture}
                          onCaptureNote={(payload) => {
                            void captureWorkflowMessageNote(payload);
                          }}
                          onFeedback={(payload) => {
                            void saveWorkflowMessageFeedback(payload);
                          }}
                          onCompact={() => {
                            void quickCompactWorkflowMemory();
                          }}
                          timerState={{
                            elapsedSeconds: stageTimerDisplaySeconds,
                            paused: !stageTimerRunning,
                          }}
                          onToggleTimer={() => {
                            void toggleWorkflowStudyTimer();
                          }}
                          onAssistantTurnCommitted={({ assistantMessage }) => {
                            setLatestCommittedAssistantMessage(assistantMessage);
                          }}
                          initialTurns={restoredTurns}
                          onTurnComplete={(masteryUpdate) => {
                            setTurnCount((prev) => prev + 1);
                            if (masteryUpdate) {
                              queryClient.invalidateQueries({ queryKey: ["mastery-dashboard"] });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-3">
                        <div className="font-arcade text-sm text-primary">
                          READY TO RUN A STUDY SESSION
                        </div>
                        <div className="font-terminal text-sm text-muted-foreground max-w-sm">
                          Tutor is the live study surface. Start or resume from DashBoard, or switch to STUDIO to prepare notes and captures before studying.
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            className={BTN_PRIMARY}
                            onClick={() => setShellMode("dashboard")}
                          >
                            <ListChecks className={`${ICON_MD} mr-1`} />
                            GO TO DASHBOARD
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className={BTN_TOOLBAR}
                            onClick={() => setShellMode("studio")}
                          >
                            <PenTool className={`${ICON_MD} mr-1`} />
                            GO TO STUDIO
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {showEndConfirm && (
                    <div className="absolute inset-x-0 bottom-0 z-50 bg-black/95 border-t-2 border-primary/50 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] animate-fade-slide-in">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="section-header">SESSION COMPLETE</div>
                        <div className={`flex items-center gap-4 ${TEXT_MUTED} text-xs`}>
                          <span className="text-foreground">{topic || "No topic"}</span>
                          <span>{turnCount} turns</span>
                          {startedAt && (
                            <span>
                              {Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)} min
                            </span>
                          )}
                          {artifacts.length > 0 && <span>{artifacts.length} artifacts</span>}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            onClick={shipToBrainAndEnd}
                            disabled={isShipping}
                            className={`${BTN_PRIMARY} w-auto gap-1.5 h-9 px-4`}
                          >
                            {isShipping ? <Loader2 className={`${ICON_MD} animate-spin`} /> : <Send className={ICON_MD} />}
                            {isShipping ? "SHIPPING..." : "SHIP TO BRAIN"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => { endSession(); setShowEndConfirm(false); }}
                            disabled={isShipping}
                            className={BTN_TOOLBAR}
                          >
                            END WITHOUT SAVING
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setShowEndConfirm(false)}
                            disabled={isShipping}
                            className={`${BTN_TOOLBAR} ml-auto`}
                          >
                            CANCEL
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right side panels overlaid when toggle is ON */}
            {activeSessionId && shellMode === "tutor" && showArtifacts && (
              <>
                {/* Mobile backdrop — click to close */}
                <div
                  className="fixed inset-0 z-20 bg-black/60 lg:hidden"
                  onClick={() => setShowArtifacts(false)}
                  aria-hidden="true"
                />
                <div className="absolute lg:static right-0 inset-y-0 z-30 w-[320px] shrink-0 border-l-2 border-primary/30 bg-black/90 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.5)] lg:shadow-none animate-fade-slide-in">
                  <div className="flex items-center justify-between p-2 border-b-2 border-primary/20 bg-primary/5">
                    <span className="section-header px-2">ARTIFACTS</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-none"
                      onClick={() => setShowArtifacts(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <TutorArtifacts
                      sessionId={activeSessionId}
                      artifacts={artifacts}
                      turnCount={turnCount}
                      topic={topic}
                      startedAt={startedAt}
                      onCreateArtifact={handleArtifactCreated}
                      recentSessions={recentSessions}
                      onResumeSession={resumeSession}
                      onDeleteArtifacts={handleDeleteArtifacts}
                      onEndSession={endSessionById}
                      onClearActiveSession={clearActiveSessionState}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </CoreWorkspaceFrame>
        {/* ── Settings Dialog ── */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className={`bg-black ${CARD_BORDER} max-w-lg`}>
            <DialogTitle className="section-header">
              TUTOR SETTINGS
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure tutor model, speed tier, and custom instructions
            </DialogDescription>
            <div className="space-y-3 mt-2">
              <label htmlFor="tutor-custom-instructions" className="section-header text-muted-foreground">
                Custom Instructions
              </label>
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading...
                </div>
              ) : (
                <Textarea
                  id="tutor-custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={10}
                  className="bg-black border-2 border-primary/40 rounded-none font-terminal text-sm resize-y"
                  placeholder="Enter custom instructions for the tutor..."
                />
              )}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={restoreDefaultInstructions}
                  disabled={settingsLoading || settingsSaving}
                  className={BTN_TOOLBAR}
                >
                  RESTORE DEFAULTS
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className={BTN_TOOLBAR}
                  >
                    CANCEL
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveSettings}
                    disabled={settingsLoading || settingsSaving}
                    className="h-8 rounded-none font-arcade text-xs bg-primary text-primary-foreground hover:bg-primary/80 border-2 border-primary"
                  >
                    {settingsSaving ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> SAVING...</>
                    ) : (
                      "SAVE"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageScaffold>
    </Layout>
  );
}

export default function Tutor() {
  return useTutorPageController();
}
