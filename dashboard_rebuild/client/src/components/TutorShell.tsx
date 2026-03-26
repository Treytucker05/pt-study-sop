import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { TutorWorkflowLaunchHub } from "@/components/TutorWorkflowLaunchHub";
import { Button } from "@/components/ui/button";
import { SourceShelf } from "@/components/studio/SourceShelf";
import { RunConfigPanel } from "@/components/studio/RunConfigPanel";
import { StudioDocumentDock } from "@/components/studio/StudioDocumentDock";
import { StudioTldrawWorkspaceLazy } from "@/components/studio/StudioTldrawWorkspaceLazy";
import { StudioWorkspaceHome } from "@/components/studio/StudioWorkspaceHome";
import { PrimePacketPanel } from "@/components/studio/PrimePacketPanel";
import { PolishPacketPanel } from "@/components/studio/PolishPacketPanel";
import { TutorStatusPanel } from "@/components/studio/TutorStatusPanel";
import { MemoryPanel } from "@/components/studio/MemoryPanel";
import { RepairCandidatesPanel } from "@/components/studio/RepairCandidatesPanel";
import { TutorArtifactsDrawer } from "@/components/tutor-shell/TutorArtifactsDrawer";
import { TutorLiveStudyPane } from "@/components/tutor-shell/TutorLiveStudyPane";
import { TutorScholarStrategyPanel } from "@/components/tutor-shell/TutorScholarStrategyPanel";
import {
  TutorWorkflowFinalSyncLazy,
  TutorWorkflowPolishStudioLazy,
  TutorWorkflowPrimingPanelLazy,
} from "@/components/tutor-shell/TutorShellDeferredPanels";
import { TutorStudioShellPane } from "@/components/tutor-shell/TutorStudioShellPane";
import { cn } from "@/lib/utils";
import {
  buildStudioWorkspaceObjects,
  createStudioRepairWorkspaceObject,
  type StudioWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";
import {
  buildPolishPacketSections,
  buildPrimePacketSections,
  type StudioPolishPromotedNote,
} from "@/lib/studioPacketSections";
import { serializeStudioPacketSectionsForTutor } from "@/lib/studioPacketSerializer";
import { buildStudioMemoryStatus } from "@/lib/studioMemoryStatus";
import {
  buildStudioRepairCandidates,
  type StudioRepairCandidate,
} from "@/lib/studioRepairCandidates";
import { buildStudioTutorStatus } from "@/lib/studioTutorStatus";
import type { ChatMessage } from "@/components/TutorChat.types";
import type { TutorPageMode } from "@/lib/tutorUtils";
import { api } from "@/lib/api";
import type { TutorTemplateChain } from "@/lib/api";
import type { TutorHubResumeCandidate } from "@/lib/api";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";
import { useBrainFeedback } from "@/hooks/useBrainFeedback";
import type { TutorBoardScope } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { TUTOR_SHELL_BACKDROP } from "@/components/tutor-shell/tutorShellStyles";

type PrimePromotedWorkspaceObject = Extract<
  StudioWorkspaceObject,
  { kind: "excerpt" | "text_note" }
>;

export interface TutorShellProps {
  shellMode: TutorPageMode;
  setShellMode: (mode: TutorPageMode) => void;
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  activeBoardScope: TutorBoardScope;
  activeBoardId: number | null;
  viewerState: Record<string, unknown> | null;
  setActiveBoardScope: (scope: TutorBoardScope) => void;
  setActiveBoardId: (id: number | null) => void;
  setViewerState: (state: Record<string, unknown> | null) => void;
  setShowSetup: (show: boolean) => void;
  queryClient: ReturnType<
    typeof import("@tanstack/react-query").useQueryClient
  >;
  promotedPrimePacketObjects?: PrimePromotedWorkspaceObject[];
  promotedPolishPacketNotes?: StudioPolishPromotedNote[];
  onPromotePrimePacketObject?: (
    workspaceObject: PrimePromotedWorkspaceObject,
  ) => void;
  onPromotePolishPacketNote?: (note: StudioPolishPromotedNote) => void;
  onResumeHubCandidate: (
    candidate: TutorHubResumeCandidate,
  ) => void | Promise<void>;
}

export function TutorShell({
  shellMode,
  setShellMode,
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  activeBoardScope,
  activeBoardId,
  viewerState,
  setActiveBoardScope,
  setActiveBoardId,
  setViewerState,
  setShowSetup,
  queryClient,
  promotedPrimePacketObjects: controlledPromotedPrimePacketObjects,
  promotedPolishPacketNotes: controlledPromotedPolishPacketNotes,
  onPromotePrimePacketObject,
  onPromotePolishPacketNote,
  onResumeHubCandidate,
}: TutorShellProps) {
  const currentRunWorkspaceObjects = useMemo(
    () =>
      buildStudioWorkspaceObjects({
        materials: hub.chatMaterials,
        selectedMaterialIds: hub.selectedMaterials,
        selectedPaths: hub.selectedPaths,
      }),
    [hub.chatMaterials, hub.selectedMaterials, hub.selectedPaths],
  );
  const [canvasObjectIds, setCanvasObjectIds] = useState<string[]>([]);
  const [workspaceDraftObjects, setWorkspaceDraftObjects] = useState<
    StudioWorkspaceObject[]
  >([]);
  const [localPromotedPrimePacketObjects, setLocalPromotedPrimePacketObjects] =
    useState<PrimePromotedWorkspaceObject[]>([]);
  const [localPromotedPolishNotes, setLocalPromotedPolishNotes] = useState<
    StudioPolishPromotedNote[]
  >([]);
  const promotedPrimePacketObjects = useMemo(() => {
    const merged = new Map<string, PrimePromotedWorkspaceObject>();

    for (const workspaceObject of controlledPromotedPrimePacketObjects ?? []) {
      merged.set(workspaceObject.id, workspaceObject);
    }

    for (const workspaceObject of localPromotedPrimePacketObjects) {
      merged.set(workspaceObject.id, workspaceObject);
    }

    return Array.from(merged.values());
  }, [controlledPromotedPrimePacketObjects, localPromotedPrimePacketObjects]);
  const promotedPrimeObjectIds = useMemo(
    () => promotedPrimePacketObjects.map((workspaceObject) => workspaceObject.id),
    [promotedPrimePacketObjects],
  );
  const promotedPolishPacketNotes = useMemo(() => {
    const merged = new Map<string, StudioPolishPromotedNote>();

    for (const note of controlledPromotedPolishPacketNotes ?? []) {
      merged.set(note.id, note);
    }

    for (const note of localPromotedPolishNotes) {
      merged.set(note.id, note);
    }

    return Array.from(merged.values());
  }, [controlledPromotedPolishPacketNotes, localPromotedPolishNotes]);
  const canvasObjects = useMemo(
    () => [
      ...currentRunWorkspaceObjects.filter((workspaceObject) =>
        canvasObjectIds.includes(workspaceObject.id),
      ),
      ...workspaceDraftObjects,
    ],
    [canvasObjectIds, currentRunWorkspaceObjects, workspaceDraftObjects],
  );
  const promotedPrimeExcerptObjects = useMemo(
    () =>
      promotedPrimePacketObjects.filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "excerpt" }> =>
          workspaceObject.kind === "excerpt",
      ),
    [promotedPrimePacketObjects],
  );
  const promotedPrimeTextNoteObjects = useMemo(
    () =>
      promotedPrimePacketObjects.filter(
        (
          workspaceObject,
        ): workspaceObject is Extract<StudioWorkspaceObject, { kind: "text_note" }> =>
          workspaceObject.kind === "text_note",
      ),
    [promotedPrimePacketObjects],
  );
  const workspaceRepairCandidateIds = useMemo(
    () =>
      workspaceDraftObjects.flatMap((workspaceObject) =>
        workspaceObject.kind === "text_note" &&
        workspaceObject.provenance.sourceType === "repair_candidate"
          ? [workspaceObject.provenance.candidateId]
          : [],
      ),
    [workspaceDraftObjects],
  );
  const primePacketSections = useMemo(
    () =>
      buildPrimePacketSections({
        materials: hub.chatMaterials,
        selectedMaterialIds: hub.selectedMaterials,
        selectedPaths: hub.selectedPaths,
        primingBundle: workflow.activeWorkflowDetail?.priming_bundle ?? null,
        primingSummaryText: workflow.primingSummaryText,
        primingConceptsText: workflow.primingConceptsText,
        primingTerminologyText: workflow.primingTerminologyText,
        primingRootExplanationText: workflow.primingRootExplanationText,
        primingGapsText: workflow.primingGapsText,
        primingStrategyText: workflow.primingStrategyText,
        promotedExcerptObjects: promotedPrimeExcerptObjects,
        promotedNoteObjects: promotedPrimeTextNoteObjects,
      }),
    [
      hub.chatMaterials,
      hub.selectedMaterials,
      hub.selectedPaths,
      workflow.activeWorkflowDetail?.priming_bundle,
      workflow.primingSummaryText,
      workflow.primingConceptsText,
      workflow.primingTerminologyText,
      workflow.primingRootExplanationText,
      workflow.primingGapsText,
      workflow.primingStrategyText,
      promotedPrimeExcerptObjects,
      promotedPrimeTextNoteObjects,
    ],
  );
  const primePacketContext = useMemo(
    () => serializeStudioPacketSectionsForTutor(primePacketSections),
    [primePacketSections],
  );
  const polishPacketSections = useMemo(
    () =>
      buildPolishPacketSections({
        promotedNotes: promotedPolishPacketNotes,
        capturedNotes: workflow.activeWorkflowDetail?.captured_notes ?? [],
        polishBundle: workflow.activeWorkflowDetail?.polish_bundle ?? null,
        publishResults: workflow.activeWorkflowDetail?.publish_results ?? [],
      }),
    [
      promotedPolishPacketNotes,
      workflow.activeWorkflowDetail?.captured_notes,
      workflow.activeWorkflowDetail?.polish_bundle,
      workflow.activeWorkflowDetail?.publish_results,
    ],
  );
  const tutorStatus = useMemo(
    () =>
      buildStudioTutorStatus({
        scholarStrategy: session.scholarStrategy,
        turnCount: session.turnCount ?? 0,
        memoryCapsuleCount:
          workflow.activeWorkflowDetail?.memory_capsules?.length ?? 0,
        latestAssistantContent:
          session.latestCommittedAssistantMessage?.content ?? null,
        latestVerdict: session.latestCommittedAssistantMessage?.verdict ?? null,
        latestTeachBackRubric:
          session.latestCommittedAssistantMessage?.teachBackRubric ?? null,
        stageTimerDisplaySeconds: session.stageTimerDisplaySeconds ?? 0,
        stageTimerRunning: session.stageTimerRunning ?? false,
      }),
    [
      session.scholarStrategy,
      session.turnCount,
      workflow.activeWorkflowDetail?.memory_capsules?.length,
      session.latestCommittedAssistantMessage?.content,
      session.latestCommittedAssistantMessage?.verdict,
      session.latestCommittedAssistantMessage?.teachBackRubric,
      session.stageTimerDisplaySeconds,
      session.stageTimerRunning,
    ],
  );
  const repairCandidates = useMemo(
    () =>
      buildStudioRepairCandidates({
        messageHistory: session.committedAssistantMessages.map((message) => ({
          sessionTurnNumber: message.sessionTurnNumber,
          verdict: message.verdict ?? null,
          teachBackRubric: message.teachBackRubric ?? null,
        })),
        latestVerdict: session.latestCommittedAssistantMessage?.verdict ?? null,
        latestTeachBackRubric:
          session.latestCommittedAssistantMessage?.teachBackRubric ?? null,
      }),
    [
      session.committedAssistantMessages,
      session.latestCommittedAssistantMessage?.verdict,
      session.latestCommittedAssistantMessage?.teachBackRubric,
    ],
  );
  const memoryStatus = useMemo(
    () =>
      buildStudioMemoryStatus({
        memoryCapsules: workflow.activeWorkflowDetail?.memory_capsules ?? [],
        turnCount: session.turnCount ?? 0,
        latestAssistantContent:
          session.latestCommittedAssistantMessage?.content ?? null,
        stageTimerDisplaySeconds: session.stageTimerDisplaySeconds ?? 0,
      }),
    [
      workflow.activeWorkflowDetail?.memory_capsules,
      session.turnCount,
      session.latestCommittedAssistantMessage?.content,
      session.stageTimerDisplaySeconds,
    ],
  );
  const handleAddWorkspaceObject = useCallback(
    (workspaceObject: StudioWorkspaceObject) => {
      setCanvasObjectIds((prev) =>
        prev.includes(workspaceObject.id) ? prev : [...prev, workspaceObject.id],
      );
    },
    [],
  );
  const handleClipExcerpt = useCallback((workspaceObject: StudioWorkspaceObject) => {
    setWorkspaceDraftObjects((prev) =>
      prev.some((existingObject) => existingObject.id === workspaceObject.id)
        ? prev
        : [...prev, workspaceObject],
    );
  }, []);
  const handlePromoteExcerptToPrime = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "excerpt" }>) => {
      if (onPromotePrimePacketObject) {
        onPromotePrimePacketObject(workspaceObject);
        return;
      }
      setLocalPromotedPrimePacketObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
    },
    [onPromotePrimePacketObject],
  );
  const handlePromoteTextNoteToPrime = useCallback(
    (workspaceObject: Extract<StudioWorkspaceObject, { kind: "text_note" }>) => {
      if (onPromotePrimePacketObject) {
        onPromotePrimePacketObject(workspaceObject);
        return;
      }
      setLocalPromotedPrimePacketObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
    },
    [onPromotePrimePacketObject],
  );
  const handlePromoteTutorReplyToPolish = useCallback(
    (payload: { message: ChatMessage; index: number }) => {
      const content = payload.message.content.trim();
      if (!content) return;

      const turnNumber = payload.message.sessionTurnNumber ?? payload.index + 1;
      const noteId = payload.message.messageId || `assistant-message-${turnNumber}`;
      const promotedNote = {
        id: noteId,
        title: `Tutor Reply ${turnNumber}`,
        content,
        badge: "TUTOR",
      } satisfies StudioPolishPromotedNote;

      if (onPromotePolishPacketNote) {
        onPromotePolishPacketNote(promotedNote);
        toast.success("Promoted to Polish Packet");
        return;
      }

      setLocalPromotedPolishNotes((prev) =>
        prev.some((note) => note.id === noteId)
          ? prev
          : [
              ...prev,
              promotedNote,
            ],
      );
      toast.success("Promoted to Polish Packet");
    },
    [onPromotePolishPacketNote],
  );
  const handleSendRepairCandidateToWorkspace = useCallback(
    (candidate: StudioRepairCandidate) => {
      const workspaceObject = createStudioRepairWorkspaceObject(candidate);
      setWorkspaceDraftObjects((prev) =>
        prev.some((existingObject) => existingObject.id === workspaceObject.id)
          ? prev
          : [...prev, workspaceObject],
      );
      toast.success("Repair candidate sent to Workspace");
    },
    [],
  );

  const { data: templateChains = [], isLoading: templateChainsLoading } =
    useQuery<TutorTemplateChain[]>({
      queryKey: ["tutor-chains-templates"],
      queryFn: () => api.tutor.getTemplateChains(),
      enabled: shellMode === "studio" && workflow.studioView === "priming",
      staleTime: 60 * 1000,
    });

  const { submitBrainFeedback } = useBrainFeedback();

  const currentWorkflowStage =
    workflow.activeWorkflowDetail?.workflow?.current_stage ?? null;
  const hasTutorWork =
    Boolean(activeSessionId) ||
    currentWorkflowStage === "tutor" ||
    currentWorkflowStage === "polish" ||
    currentWorkflowStage === "final_sync" ||
    (workflow.activeWorkflowDetail?.captured_notes?.length ?? 0) > 0;
  const hasFinalSyncAccess =
    Boolean(workflow.activeWorkflowDetail?.polish_bundle) ||
    currentWorkflowStage === "final_sync";
  const studioStageNav = (
    <>
      {[
        { key: "home", label: "HOME", available: true },
        { key: "workspace", label: "WORKSPACE", available: true },
        {
          key: "priming",
          label: workflow.bootstrappingPriming ? "PRIMING..." : "PRIMING",
          available: !workflow.bootstrappingPriming,
        },
        { key: "polish", label: "POLISH", available: hasTutorWork },
        {
          key: "final_sync",
          label: "FINAL SYNC",
          available: hasFinalSyncAccess,
        },
      ].map((stage) => {
        const isActive = workflow.studioView === stage.key;
        return (
          <Button
            key={stage.key}
            type="button"
            variant="ghost"
            disabled={!stage.available}
            aria-pressed={isActive}
            onClick={() => {
              if (stage.key === "priming") {
                void workflow.openStudioPriming();
                return;
              }
              workflow.setStudioView(stage.key as typeof workflow.studioView);
            }}
            className={cn(
              "h-9 rounded-full border px-3 font-mono text-[10px] uppercase tracking-[0.18em]",
              isActive
                ? "border-[rgba(255,112,138,0.40)] bg-[linear-gradient(180deg,rgba(255,72,104,0.18),rgba(12,2,5,0.94)_52%,rgba(0,0,0,0.98)_100%)] text-white"
                : "border-[rgba(255,70,104,0.12)] bg-black/25 text-[#ffd4dc]/78 hover:border-[rgba(255,108,136,0.26)] hover:text-white",
              !stage.available && "cursor-not-allowed opacity-35",
            )}
          >
            {stage.label}
          </Button>
        );
      })}
    </>
  );

  // ── Save Gist: summarize a reply via LLM and capture as workflow note ──
  const handleSaveGist = useCallback(
    async (content: string) => {
      if (!activeSessionId) {
        toast.error("No active session");
        return;
      }
      try {
        const { summary } = await api.tutor.summarizeReply(
          activeSessionId,
          content,
        );
        if (workflow.activeWorkflowId) {
          await api.tutor.captureWorkflowNote(workflow.activeWorkflowId, {
            tutor_session_id: activeSessionId,
            stage: "tutor",
            note_mode: "exact",
            title: `[Gist] ${summary.slice(0, 50)}`,
            content: summary,
            status: "captured",
          });
          await queryClient.invalidateQueries({
            queryKey: ["tutor-workflow-detail", workflow.activeWorkflowId],
          });
        }
        toast.success("Saved gist to Packet");
      } catch (err) {
        toast.error(
          `Failed to save gist: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    },
    [activeSessionId, workflow.activeWorkflowId, queryClient],
  );

  const studioWorkspaceContent =
    workflow.studioView === "home" ? (
      <StudioWorkspaceHome
        workflow={
          workflow.activeWorkflowDetail?.workflow
            ? {
                workflowId: workflow.activeWorkflowDetail.workflow.workflow_id,
                currentStage:
                  workflow.activeWorkflowDetail.workflow.current_stage,
                status: workflow.activeWorkflowDetail.workflow.status,
                updatedAt: workflow.activeWorkflowDetail.workflow.updated_at,
              }
            : null
        }
        launchHub={
          <TutorWorkflowLaunchHub
            workflows={workflow.filteredWorkflows}
            totalCount={workflow.workflowCount}
            courses={hub.tutorContentSources?.courses || []}
            filters={workflow.workflowFilters}
            onFiltersChange={workflow.setWorkflowFilters}
            onStartNew={() => {
              void workflow.createWorkflowAndOpenPriming();
            }}
            onResumeCandidate={onResumeHubCandidate}
            onOpenWorkflow={workflow.openWorkflowRecord}
            onDeleteWorkflow={workflow.deleteWorkflowRecord}
            resumeCandidate={hub.tutorHub?.resume_candidate ?? null}
            tutorHub={hub.tutorHub}
            tutorHubLoading={hub.tutorHubLoading}
            activeWorkflowId={workflow.activeWorkflowId}
            isCreating={workflow.creatingWorkflow}
            deletingWorkflowId={workflow.deletingWorkflowId}
          />
        }
        courseName={
          hub.courseLabel ||
          workflow.activeWorkflowDetail?.workflow?.course_name ||
          null
        }
        studyUnit={
          hub.selectedObjectiveGroup ||
          workflow.activeWorkflowDetail?.workflow?.study_unit ||
          null
        }
        topic={
          hub.topic || workflow.activeWorkflowDetail?.workflow?.topic || null
        }
        selectedMaterialCount={hub.selectedMaterials.length}
        hasTutorWork={hasTutorWork}
        hasFinalSyncAccess={hasFinalSyncAccess}
        hasActiveSession={Boolean(activeSessionId)}
        resumeCandidate={hub.tutorHub?.resume_candidate ?? null}
        bootstrappingPriming={workflow.bootstrappingPriming}
        onResumeTutor={() => setShellMode("tutor")}
        onResumeCandidate={(candidate) => {
          void onResumeHubCandidate(candidate);
        }}
        onOpenWorkspace={() => workflow.setStudioView("workspace")}
        onOpenPriming={() => {
          void workflow.openStudioPriming();
        }}
        onOpenPolish={() => workflow.setStudioView("polish")}
        onOpenFinalSync={() => workflow.setStudioView("final_sync")}
      />
    ) : workflow.studioView === "workspace" ? (
      <div className="flex-1 min-h-0 flex flex-col">
        <StudioTldrawWorkspaceLazy
          canvasObjects={canvasObjects}
          courseName={hub.courseLabel || null}
          currentRunObjects={currentRunWorkspaceObjects}
          promotedPrimeObjectIds={promotedPrimeObjectIds}
          selectedMaterialCount={hub.selectedMaterials.length}
          onPromoteExcerptToPrime={handlePromoteExcerptToPrime}
          onPromoteTextNoteToPrime={handlePromoteTextNoteToPrime}
        />
      </div>
    ) : workflow.studioView === "priming" ? (
      <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
        <TutorWorkflowPrimingPanelLazy
          workflow={workflow.activeWorkflowDetail?.workflow || null}
          courses={hub.tutorContentSources?.courses || []}
          courseId={hub.courseId}
          setCourseId={hub.setCourseId}
          selectedMaterials={hub.selectedMaterials}
          setSelectedMaterials={hub.setSelectedMaterials}
          topic={hub.topic}
          setTopic={hub.setTopic}
          objectiveScope={hub.objectiveScope}
          setObjectiveScope={hub.setObjectiveScope}
          selectedObjectiveId={hub.selectedObjectiveId}
          setSelectedObjectiveId={hub.setSelectedObjectiveId}
          selectedObjectiveGroup={hub.selectedObjectiveGroup}
          setSelectedObjectiveGroup={hub.setSelectedObjectiveGroup}
          availableObjectives={hub.availableObjectives}
          studyUnitOptions={hub.studyUnitOptions}
          primingMethods={workflow.primingMethods}
          setPrimingMethods={workflow.setPrimingMethods}
          primingMethodRuns={workflow.primingMethodRuns}
          chainId={hub.chainId}
          setChainId={hub.setChainId}
          customBlockIds={hub.customBlockIds}
          setCustomBlockIds={hub.setCustomBlockIds}
          templateChains={templateChains}
          templateChainsLoading={templateChainsLoading}
          summaryText={workflow.primingSummaryText}
          setSummaryText={workflow.setPrimingSummaryText}
          conceptsText={workflow.primingConceptsText}
          setConceptsText={workflow.setPrimingConceptsText}
          terminologyText={workflow.primingTerminologyText}
          setTerminologyText={workflow.setPrimingTerminologyText}
          rootExplanationText={workflow.primingRootExplanationText}
          setRootExplanationText={workflow.setPrimingRootExplanationText}
          gapsText={workflow.primingGapsText}
          setGapsText={workflow.setPrimingGapsText}
          recommendedStrategyText={workflow.primingStrategyText}
          setRecommendedStrategyText={workflow.setPrimingStrategyText}
          sourceInventory={workflow.mergedPrimingSourceInventory}
          vaultFolderPreview={hub.derivedVaultFolder}
          readinessItems={workflow.primingReadinessItems}
          preflightBlockers={session.preflight?.blockers || []}
          preflightLoading={session.preflightLoading}
          preflightError={session.preflightError}
          onBackToStudio={() => {
            workflow.setStudioView("home");
            setShellMode("studio");
          }}
          onSaveDraft={() => {
            void workflow.saveWorkflowPriming("draft");
          }}
          onMarkReady={() => {
            void workflow.saveWorkflowPriming("ready");
          }}
          onStartTutor={() => {
            void workflow.startTutorFromWorkflow(
              primePacketContext ? { packet_context: primePacketContext } : undefined,
            );
          }}
          onRunAssistForSelected={() => {
            void workflow.runWorkflowPrimingAssist(
              hub.selectedMaterials,
              primePacketContext ? { packet_context: primePacketContext } : undefined,
            );
          }}
          onRunAssistForMaterial={(materialId) => {
            void workflow.runWorkflowPrimingAssist(
              [materialId],
              primePacketContext ? { packet_context: primePacketContext } : undefined,
            );
          }}
          isSaving={workflow.savingPrimingBundle}
          isStartingTutor={session.isStarting}
          isRunningAssist={workflow.runningPrimingAssist}
          assistTargetMaterialId={workflow.primingAssistTargetMaterialId}
        />
      </div>
    ) : workflow.studioView === "polish" ? (
      <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
        <TutorWorkflowPolishStudioLazy
          workflow={workflow.activeWorkflowDetail?.workflow || null}
          primingBundleId={workflow.activeWorkflowDetail?.priming_bundle?.id || null}
          capturedNotes={workflow.activeWorkflowDetail?.captured_notes || []}
          feedbackEvents={workflow.activeWorkflowDetail?.feedback_events || []}
          memoryCapsules={workflow.activeWorkflowDetail?.memory_capsules || []}
          existingBundle={workflow.activeWorkflowDetail?.polish_bundle || null}
          onBackToTutor={() => setShellMode("tutor")}
          onSaveDraft={(payload) => {
            void workflow.saveWorkflowPolish(payload, false);
          }}
          onFinalize={(payload) => {
            void workflow.saveWorkflowPolish(payload, true);
          }}
          isSaving={workflow.savingPolishBundle}
        />
      </div>
    ) : (
      <div className="flex-1 min-h-0 overflow-y-auto w-full p-4">
        <TutorWorkflowFinalSyncLazy
          workflowDetail={workflow.activeWorkflowDetail || null}
          onBackToPolish={() => workflow.setStudioView("polish")}
        />
      </div>
    );

  return (
    <>
      {/* Scholar strategy panel */}
      {shellMode === "tutor" && activeSessionId && session.scholarStrategy && (
        <TutorScholarStrategyPanel session={session} />
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 relative">
        <div
          className={cn("flex-1 flex flex-col min-w-0", TUTOR_SHELL_BACKDROP)}
          role="tabpanel"
          aria-labelledby={`tutor-tab-${shellMode}`}
        >
          {shellMode === "studio" ? (
            <TutorStudioShellPane
              view={workflow.studioView}
              sourceShelf={
                <SourceShelf
                  courseName={
                    hub.courseLabel ||
                    workflow.activeWorkflowDetail?.workflow?.course_name ||
                    null
                  }
                  studyUnit={
                    hub.selectedObjectiveGroup ||
                    workflow.activeWorkflowDetail?.workflow?.study_unit ||
                    null
                  }
                  topic={
                    hub.topic ||
                    workflow.activeWorkflowDetail?.workflow?.topic ||
                    null
                  }
                  materials={hub.chatMaterials}
                  selectedMaterialIds={hub.selectedMaterials}
                  selectedMaterialCount={hub.selectedMaterials.length}
                  selectedPaths={hub.selectedPaths}
                  vaultFolder={hub.derivedVaultFolder || null}
                  workspaceObjectIds={canvasObjectIds}
                  onAddToWorkspace={handleAddWorkspaceObject}
                />
              }
              documentDock={
                <StudioDocumentDock
                  materials={hub.chatMaterials}
                  selectedMaterialIds={hub.selectedMaterials}
                  selectedPaths={hub.selectedPaths}
                  viewerState={viewerState}
                  onClipExcerpt={handleClipExcerpt}
                />
              }
              runConfig={
                <RunConfigPanel
                  primingMethodIds={workflow.primingMethods}
                  chainId={hub.chainId}
                  customBlockIds={hub.customBlockIds}
                  hasActiveSession={Boolean(activeSessionId)}
                />
              }
              tutorStatus={<TutorStatusPanel status={tutorStatus} />}
              repairCandidates={
                <RepairCandidatesPanel
                  candidates={repairCandidates}
                  sentCandidateIds={workspaceRepairCandidateIds}
                  onSendToWorkspace={handleSendRepairCandidateToWorkspace}
                />
              }
              memory={<MemoryPanel status={memoryStatus} />}
              primePacket={<PrimePacketPanel sections={primePacketSections} />}
              polishPacket={<PolishPacketPanel sections={polishPacketSections} />}
              workspace={studioWorkspaceContent}
              stageNav={studioStageNav}
            />
          ) : (
            <div
              key="chat"
              className="flex-1 flex flex-col min-h-0 animate-fade-slide-in"
            >
              <TutorErrorBoundary fallbackLabel="Tutor">
                <TutorLiveStudyPane
                  activeSessionId={activeSessionId}
                  hub={hub}
                  session={session}
                  workflow={workflow}
                  restoredTurns={restoredTurns}
                  queryClient={queryClient}
                  setShellMode={setShellMode}
                  onSaveGist={handleSaveGist}
                  onPromoteTutorReplyToPolish={handlePromoteTutorReplyToPolish}
                  submitBrainFeedback={submitBrainFeedback}
                />
              </TutorErrorBoundary>
            </div>
          )}
        </div>

        {/* Right side artifact panel */}
        <TutorArtifactsDrawer
          activeSessionId={activeSessionId}
          shellMode={shellMode}
          hub={hub}
          session={session}
        />
      </div>
    </>
  );
}
