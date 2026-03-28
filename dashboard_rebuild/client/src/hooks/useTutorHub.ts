import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCourseMap } from "@/api";
import { api } from "@/lib/api";
import type {
  AppLearningObjective,
  Material,
  TutorAccuracyProfile,
  TutorHubResponse,
  TutorObjectiveScope,
  TutorSessionSummary,
} from "@/lib/api";
import {
  readTutorAccuracyProfile,
  readTutorObjectiveScope,
  readTutorSelectedMaterialIds,
  readTutorVaultFolder,
  writeTutorAccuracyProfile,
  writeTutorObjectiveScope,
  writeTutorSelectedMaterialIds,
  writeTutorStoredStartState,
  writeTutorVaultFolder,
} from "@/lib/tutorClientState";
import { COURSE_FOLDERS } from "@/config/courses";
import {
  normalizeStudyUnitLabel,
  inferStudyUnitFromMaterial,
  deriveVaultFolder,
} from "@/lib/tutorUtils";
import type { TutorShellQuery } from "@/lib/tutorUtils";

function collectStudyUnitMaterialCandidates(material: Material): string[] {
  const candidates = new Set<string>();
  const inferred = normalizeStudyUnitLabel(inferStudyUnitFromMaterial(material));
  if (inferred) candidates.add(inferred);

  const titleCandidate = normalizeStudyUnitLabel(material.title || "");
  if (titleCandidate) candidates.add(titleCandidate);

  const fileStem = normalizeStudyUnitLabel(
    String(material.source_path || "").split(/[\\/]/).pop()?.replace(/\.[A-Za-z0-9]+$/, "") ||
      "",
  );
  if (fileStem) candidates.add(fileStem);

  return Array.from(candidates);
}

function inferStudyUnitFromSelection(
  materials: Material[],
  options: { value: string }[],
): string {
  if (materials.length === 0 || options.length === 0) return "";

  const normalizedOptionLookup = new Map(
    options
      .map((option) => {
        const normalized = normalizeStudyUnitLabel(option.value);
        return normalized ? [normalized.toLowerCase(), option.value] : null;
      })
      .filter(
        (entry): entry is [string, string] => Array.isArray(entry) && entry.length === 2,
      ),
  );

  const matched = new Set<string>();
  for (const material of materials) {
    for (const candidate of collectStudyUnitMaterialCandidates(material)) {
      const resolved = normalizedOptionLookup.get(candidate.toLowerCase());
      if (resolved) {
        matched.add(resolved);
      }
    }
  }

  return matched.size === 1 ? Array.from(matched)[0] : "";
}

export interface UseTutorHubParams {
  initialRouteQuery: TutorShellQuery;
  hasRestored: boolean;
  activeSessionId: string | null;
  persistClientState?: boolean;
}

export function useTutorHub({
  initialRouteQuery,
  hasRestored,
  activeSessionId,
  persistClientState = true,
}: UseTutorHubParams) {
  const queryClient = useQueryClient();

  // ─── Launch config state ───
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

  // ─── Persist to localStorage ───
  useEffect(() => {
    if (!persistClientState) return;
    writeTutorSelectedMaterialIds(selectedMaterials);
  }, [persistClientState, selectedMaterials]);

  useEffect(() => {
    if (!persistClientState) return;
    writeTutorAccuracyProfile(accuracyProfile);
  }, [accuracyProfile, persistClientState]);

  useEffect(() => {
    if (!persistClientState) return;
    writeTutorObjectiveScope(objectiveScope);
  }, [objectiveScope, persistClientState]);

  useEffect(() => {
    if (!persistClientState) return;
    writeTutorVaultFolder(vaultFolder);
  }, [persistClientState, vaultFolder]);

  useEffect(() => {
    if (!persistClientState) return;
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
    persistClientState,
    selectedMaterials,
    selectedObjectiveGroup,
    selectedObjectiveId,
    selectedPaths,
    topic,
  ]);

  // ─── Data queries ───
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

  // ─── Course map ───
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

  const courseLabel = useMemo(
    () =>
      typeof courseId === "number"
        ? tutorContentSources?.courses.find((course) => course.id === courseId)?.name || ""
        : "",
    [courseId, tutorContentSources],
  );

  const selectedMaterialRecords = useMemo(() => {
    if (selectedMaterials.length === 0) return [];
    const selectedMaterialIdSet = new Set(selectedMaterials);
    return chatMaterials.filter((material) => selectedMaterialIdSet.has(material.id));
  }, [chatMaterials, selectedMaterials]);

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

  const inferredStudyUnit = useMemo(
    () => inferStudyUnitFromSelection(selectedMaterialRecords, studyUnitOptions),
    [selectedMaterialRecords, studyUnitOptions],
  );

  const effectiveStudyUnit = useMemo(
    () => normalizeStudyUnitLabel(selectedObjectiveGroup) || inferredStudyUnit || "",
    [inferredStudyUnit, selectedObjectiveGroup],
  );

  const scopedObjectives = useMemo(
    () =>
      effectiveStudyUnit
        ? availableObjectives.filter(
            (objective) =>
              normalizeStudyUnitLabel(String(objective.groupName || "")) === effectiveStudyUnit,
          )
        : availableObjectives,
    [availableObjectives, effectiveStudyUnit],
  );

  const selectedObjectiveRecord = useMemo(
    () =>
      availableObjectives.find(
        (objective) => String(objective.loCode || "") === selectedObjectiveId,
      ),
    [availableObjectives, selectedObjectiveId],
  );

  const configuredCourseFolder = useMemo(() => {
    const normalizedCourseLabel = normalizeStudyUnitLabel(courseLabel);
    if (!normalizedCourseLabel) {
      return "";
    }

    return (
      courseFolders.find(
        (course) =>
          normalizeStudyUnitLabel(course.name).toLowerCase() ===
          normalizedCourseLabel.toLowerCase(),
      )?.path || courseLabel
    );
  }, [courseFolders, courseLabel]);

  const derivedVaultFolder = useMemo(
    () =>
      configuredCourseFolder
        ? deriveVaultFolder(configuredCourseFolder, effectiveStudyUnit).replace(
            /^Courses\//i,
            "",
          )
        : vaultFolder.trim(),
    [vaultFolder, configuredCourseFolder, effectiveStudyUnit],
  );

  const effectiveTopic = useMemo(
    () =>
      selectedObjectiveRecord?.title ||
      effectiveStudyUnit ||
      topic.trim() ||
      "",
    [effectiveStudyUnit, topic, selectedObjectiveRecord],
  );

  // ─── Hub + sessions queries ───
  const { data: recentSessions = [] } = useQuery<TutorSessionSummary[]>({
    queryKey: ["tutor-sessions"],
    queryFn: () => api.tutor.listSessions({ limit: 20 }),
  });

  const { data: tutorHub, isFetching: tutorHubLoading } = useQuery<TutorHubResponse>({
    queryKey: ["tutor-hub", activeSessionId],
    queryFn: () => api.tutor.getHub(),
    enabled: hasRestored,
    staleTime: 15 * 1000,
  });

  // ─── Filter stale material IDs ───
  useEffect(() => {
    if (chatMaterials.length === 0) return;
    const validIds = new Set(chatMaterials.map((m) => m.id));
    setSelectedMaterials((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      if (filtered.length < prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [chatMaterials]);

  // ─── Material selection helpers ───
  const toggleMaterial = useCallback((id: number) => {
    setSelectedMaterials((prev) => {
      const next = prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id];
      return persistClientState ? writeTutorSelectedMaterialIds(next) : next;
    });
  }, [persistClientState]);

  const selectAllMaterials = useCallback(() => {
    const allIds = chatMaterials.map((m) => m.id);
    setSelectedMaterials(
      persistClientState ? writeTutorSelectedMaterialIds(allIds) : allIds,
    );
  }, [chatMaterials, persistClientState]);

  const clearMaterialSelection = useCallback(() => {
    setSelectedMaterials([]);
    if (persistClientState) {
      writeTutorSelectedMaterialIds([]);
    }
  }, [persistClientState]);

  const getCourseMaterialIds = useCallback(
    (targetCourseId?: number) => {
      if (typeof targetCourseId !== "number") {
        return [];
      }
      return chatMaterials
        .filter((material) => material.course_id === targetCourseId)
        .map((material) => material.id);
    },
    [chatMaterials],
  );

  const loadCourseMaterials = useCallback(
    (targetCourseId?: number) => {
      const nextIds = getCourseMaterialIds(targetCourseId);
      setSelectedMaterials(
        persistClientState ? writeTutorSelectedMaterialIds(nextIds) : nextIds,
      );
      return nextIds;
    },
    [getCourseMaterialIds, persistClientState],
  );

  const refreshChatMaterials = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tutor-chat-materials-all-enabled"] });
  }, [queryClient]);

  return {
    // Launch config state + setters
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
    effectiveStudyUnit,

    // Data
    chatMaterials,
    availableObjectives,
    tutorContentSources,
    courseLabel,
    selectedMaterialRecords,
    scopedObjectives,
    studyUnitOptions,
    selectedObjectiveRecord,
    derivedVaultFolder,
    effectiveTopic,
    recentSessions,
    tutorHub,
    tutorHubLoading,
    courseMapData,
    courseFolders,

    // Material helpers
    toggleMaterial,
    selectAllMaterials,
    clearMaterialSelection,
    getCourseMaterialIds,
    loadCourseMaterials,
    refreshChatMaterials,
  };
}

export type UseTutorHubReturn = ReturnType<typeof useTutorHub>;
