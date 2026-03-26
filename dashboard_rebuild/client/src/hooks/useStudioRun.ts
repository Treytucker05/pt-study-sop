import { useEffect, useMemo, useState } from "react";

import type {
  TutorAccuracyProfile,
  TutorBoardScope,
  TutorObjectiveScope,
} from "@/lib/api";
import type { TutorBrainLaunchContext } from "@/lib/tutorClientState";
import {
  writeTutorAccuracyProfile,
  writeTutorObjectiveScope,
  writeTutorSelectedMaterialIds,
  writeTutorStoredStartState,
  writeTutorVaultFolder,
} from "@/lib/tutorClientState";
import type {
  StudioDocumentTab,
  StudioPanelLayoutItem,
} from "@/lib/studioPanelLayout";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";
import type { StudioPolishPromotedNote } from "@/lib/studioPacketSections";
import type { StudioRunRuntimeState } from "@/lib/studioRunRuntimeState";
import type { TutorPageMode, TutorShellQuery } from "@/lib/tutorUtils";
import { writeTutorShellQuery } from "@/lib/tutorUtils";

export type StudioRunEntryKind = "workspace_home" | "exact_resume";

export interface UseStudioRunParams {
  initialRouteQuery: TutorShellQuery;
  storedActiveSessionId: string | null;
  pendingLaunchHandoff: {
    fromLibraryHandoff: boolean;
    brainLaunchContext: TutorBrainLaunchContext | null;
  };
  persistStartState?: boolean;
  persistShellQuery?: boolean;
  courseId?: number;
  topic: string;
  selectedMaterialIds: number[];
  chainId?: number;
  customBlockIds: number[];
  accuracyProfile: TutorAccuracyProfile;
  objectiveScope: TutorObjectiveScope;
  selectedObjectiveId: string;
  selectedObjectiveGroup: string;
  selectedPaths: string[];
  vaultFolder: string;
}

export function useStudioRun({
  initialRouteQuery,
  storedActiveSessionId,
  pendingLaunchHandoff,
  persistStartState = true,
  persistShellQuery = true,
  courseId,
  topic,
  selectedMaterialIds,
  chainId,
  customBlockIds,
  accuracyProfile,
  objectiveScope,
  selectedObjectiveId,
  selectedObjectiveGroup,
  selectedPaths,
  vaultFolder,
}: UseStudioRunParams) {
  const shouldSuppressStoredSessionResume = useMemo(
    () =>
      !initialRouteQuery.sessionId &&
      (pendingLaunchHandoff.fromLibraryHandoff ||
        Boolean(pendingLaunchHandoff.brainLaunchContext)),
    [
      initialRouteQuery.sessionId,
      pendingLaunchHandoff.brainLaunchContext,
      pendingLaunchHandoff.fromLibraryHandoff,
    ],
  );

  const resolvedStoredSessionId = shouldSuppressStoredSessionResume
    ? null
    : storedActiveSessionId;
  const initialSessionId = initialRouteQuery.sessionId || resolvedStoredSessionId;
  const initialShellMode: TutorPageMode =
    initialRouteQuery.mode || (initialSessionId ? "tutor" : "studio");

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId,
  );
  const [hasRestored, setHasRestored] = useState(false);
  const [restoredTurns, setRestoredTurns] = useState<
    { question: string; answer: string | null }[] | undefined
  >();
  const [shellMode, setShellMode] = useState<TutorPageMode>(initialShellMode);
  const [activeBoardScope, setActiveBoardScope] =
    useState<TutorBoardScope>(initialRouteQuery.boardScope || "project");
  const [activeBoardId, setActiveBoardId] = useState<number | null>(
    initialRouteQuery.boardId ?? null,
  );
  const [viewerState, setViewerState] = useState<Record<string, unknown> | null>(
    null,
  );
  const [panelLayout, setPanelLayout] = useState<StudioPanelLayoutItem[]>([]);
  const [documentTabs, setDocumentTabs] = useState<StudioDocumentTab[]>([]);
  const [activeDocumentTabId, setActiveDocumentTabId] = useState<string | null>(
    null,
  );
  const [runtimeState, setRuntimeState] = useState<StudioRunRuntimeState>({
    activeMemoryCapsuleId: null,
    compactionTelemetry: null,
    directNoteSaveStatus: null,
  });
  const [tutorChainId, setTutorChainId] = useState<number | undefined>(chainId);
  const [tutorCustomBlockIds, setTutorCustomBlockIds] = useState<number[]>(
    customBlockIds,
  );
  const [showSetup, setShowSetup] = useState<boolean>(() => !Boolean(initialSessionId));
  const [brainLaunchContext, setBrainLaunchContext] =
    useState<TutorBrainLaunchContext | null>(
      pendingLaunchHandoff.brainLaunchContext,
    );
  const [shellRevision, setShellRevision] = useState(0);
  const [shellHydratedCourseId, setShellHydratedCourseId] = useState<
    number | null
  >(null);
  const [promotedPrimePacketObjects, setPromotedPrimePacketObjects] = useState<
    StudioWorkspaceObject[]
  >([]);
  const [promotedPolishPacketNotes, setPromotedPolishPacketNotes] = useState<
    StudioPolishPromotedNote[]
  >([]);

  const entryKind: StudioRunEntryKind = activeSessionId
    ? "exact_resume"
    : "workspace_home";

  useEffect(() => {
    if (!persistStartState) return;
    writeTutorSelectedMaterialIds(selectedMaterialIds);
    writeTutorAccuracyProfile(accuracyProfile);
    writeTutorObjectiveScope(objectiveScope);
    writeTutorVaultFolder(vaultFolder);
    writeTutorStoredStartState({
      courseId,
      topic,
      selectedMaterials: selectedMaterialIds,
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
    persistStartState,
    selectedMaterialIds,
    selectedObjectiveGroup,
    selectedObjectiveId,
    selectedPaths,
    topic,
    vaultFolder,
  ]);

  useEffect(() => {
    if (!persistShellQuery) return;
    writeTutorShellQuery({
      courseId,
      sessionId: activeSessionId || undefined,
      mode: shellMode,
      boardScope: activeBoardScope,
      boardId: activeBoardId ?? undefined,
    });
  }, [
    activeBoardId,
    activeBoardScope,
    activeSessionId,
    courseId,
    persistShellQuery,
    shellMode,
  ]);

  return {
    initialRouteQuery,
    entryKind,
    shouldSuppressStoredSessionResume,
    activeSessionId,
    setActiveSessionId,
    hasRestored,
    setHasRestored,
    restoredTurns,
    setRestoredTurns,
    shellMode,
    setShellMode,
    activeBoardScope,
    setActiveBoardScope,
    activeBoardId,
    setActiveBoardId,
    viewerState,
    setViewerState,
    panelLayout,
    setPanelLayout,
    documentTabs,
    setDocumentTabs,
    activeDocumentTabId,
    setActiveDocumentTabId,
    runtimeState,
    setRuntimeState,
    setActiveMemoryCapsuleId: (activeMemoryCapsuleId: number | null) =>
      setRuntimeState((current) => ({
        ...current,
        activeMemoryCapsuleId,
      })),
    setCompactionTelemetry: (
      compactionTelemetry: Record<string, unknown> | null,
    ) =>
      setRuntimeState((current) => ({
        ...current,
        compactionTelemetry,
      })),
    setDirectNoteSaveStatus: (
      directNoteSaveStatus: Record<string, unknown> | null,
    ) =>
      setRuntimeState((current) => ({
        ...current,
        directNoteSaveStatus,
      })),
    tutorChainId,
    setTutorChainId,
    tutorCustomBlockIds,
    setTutorCustomBlockIds,
    showSetup,
    setShowSetup,
    brainLaunchContext,
    setBrainLaunchContext,
    shellRevision,
    setShellRevision,
    shellHydratedCourseId,
    setShellHydratedCourseId,
    promotedPrimePacketObjects,
    setPromotedPrimePacketObjects,
    promotedPolishPacketNotes,
    setPromotedPolishPacketNotes,
  };
}

export type UseStudioRunReturn = ReturnType<typeof useStudioRun>;
