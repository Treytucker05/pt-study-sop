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
import type { TutorShellQuery, TutorPageMode } from "@/lib/tutorUtils";

export interface UseTutorHubParams {
  initialRouteQuery: TutorShellQuery;
  hasRestored: boolean;
  shellMode: TutorPageMode;
  activeSessionId: string | null;
}

export function useTutorHub({
  initialRouteQuery,
  hasRestored,
  shellMode,
  activeSessionId,
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

  // ─── Hub + sessions queries ───
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

    // Data
    chatMaterials,
    availableObjectives,
    tutorContentSources,
    courseLabel,
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
    refreshChatMaterials,
  };
}

export type UseTutorHubReturn = ReturnType<typeof useTutorHub>;
