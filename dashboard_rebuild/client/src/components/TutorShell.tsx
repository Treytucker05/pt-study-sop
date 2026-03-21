import { TutorErrorBoundary } from "@/components/TutorErrorBoundary";
import { TutorEmptyState } from "@/components/TutorEmptyState";
import {
  TutorWorkflowLaunchHub,
} from "@/components/TutorWorkflowLaunchHub";
import {
  TutorWorkflowPrimingPanel,
} from "@/components/TutorWorkflowPrimingPanel";
import { TutorWorkflowPolishStudio } from "@/components/TutorWorkflowPolishStudio";
import { TutorWorkflowFinalSync } from "@/components/TutorWorkflowFinalSync";
import { TutorChat } from "@/components/TutorChat";
import { TutorArtifacts } from "@/components/TutorArtifacts";
import { TutorStudioMode } from "@/components/TutorStudioMode";
import type { TutorStudioEntryRequest } from "@/components/TutorStudioMode";
import { TutorScheduleMode } from "@/components/TutorScheduleMode";
import type { TutorScheduleLaunchIntent } from "@/components/TutorScheduleMode";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronDown,
  ListChecks,
  PenTool,
  MessageSquare,
  Loader2,
  Send,
  Square,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  TEXT_MUTED,
  TEXT_BADGE,
  ICON_MD,
  BTN_TOOLBAR,
  BTN_TOOLBAR_ACTIVE,
  BTN_PRIMARY,
  CARD_BORDER,
} from "@/lib/theme";
import { CONTROL_PLANE_COLORS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { controlToggleButton } from "@/components/shell/controlStyles";
import { formatElapsedDuration, INPUT_BASE, SELECT_BASE } from "@/lib/tutorUtils";
import type { TutorPageMode } from "@/lib/tutorUtils";
import { api } from "@/lib/api";
import type { TutorTemplateChain } from "@/lib/api";
import type { UseTutorHubReturn } from "@/hooks/useTutorHub";
import type { UseTutorSessionReturn } from "@/hooks/useTutorSession";
import type { UseTutorWorkflowReturn } from "@/hooks/useTutorWorkflow";
import type { TutorBoardScope } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export interface TutorShellProps {
  shellMode: TutorPageMode;
  setShellMode: (mode: TutorPageMode) => void;
  activeSessionId: string | null;
  hub: UseTutorHubReturn;
  session: UseTutorSessionReturn;
  workflow: UseTutorWorkflowReturn;
  restoredTurns: { question: string; answer: string | null }[] | undefined;
  studioEntryRequest: TutorStudioEntryRequest | null;
  scheduleLaunchIntent: TutorScheduleLaunchIntent | null;
  activeBoardScope: TutorBoardScope;
  activeBoardId: number | null;
  viewerState: Record<string, unknown> | null;
  setActiveBoardScope: (scope: TutorBoardScope) => void;
  setActiveBoardId: (id: number | null) => void;
  setViewerState: (state: Record<string, unknown> | null) => void;
  setShowSetup: (show: boolean) => void;
  queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>;
  // Settings
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  settingsLoading: boolean;
  settingsSaving: boolean;
  isPreviewMode: boolean;
  setIsPreviewMode: (value: boolean) => void;
  saveSettings: () => void;
  restoreDefaultInstructions: () => void;
}

export function TutorShell({
  shellMode,
  setShellMode,
  activeSessionId,
  hub,
  session,
  workflow,
  restoredTurns,
  studioEntryRequest,
  scheduleLaunchIntent,
  activeBoardScope,
  activeBoardId,
  viewerState,
  setActiveBoardScope,
  setActiveBoardId,
  setViewerState,
  setShowSetup,
  queryClient,
  showSettings,
  setShowSettings,
  customInstructions,
  setCustomInstructions,
  settingsLoading,
  settingsSaving,
  isPreviewMode,
  setIsPreviewMode,
  saveSettings,
  restoreDefaultInstructions,
}: TutorShellProps) {
  const { data: templateChains = [], isLoading: templateChainsLoading } = useQuery<TutorTemplateChain[]>({
    queryKey: ["tutor-chains-templates"],
    queryFn: () => api.tutor.getTemplateChains(),
    enabled: shellMode === "dashboard" && workflow.workflowView === "priming",
    staleTime: 60 * 1000,
  });

  return (
    <>
      {/* Scholar strategy panel */}
      {shellMode === "tutor" && activeSessionId && session.scholarStrategy && (
        <div className="flex-none">
        <button
          type="button"
          onClick={() => session.setScholarStrategyExpanded((prev: boolean) => !prev)}
          className="w-full flex items-center gap-2 px-4 py-1.5 bg-black/55 border-b border-primary/15 hover:bg-black/40 transition-colors text-left"
        >
          <ChevronDown className={`h-3 w-3 text-primary/60 transition-transform duration-200 ${session.scholarStrategyExpanded ? "" : "-rotate-90"}`} />
          <span className={TEXT_BADGE}>SCHOLAR STRATEGY</span>
          <span className="font-terminal text-[11px] text-muted-foreground truncate flex-1">
            {session.scholarStrategy.hybridArchetype?.label || ""}
          </span>
        </button>
        {session.scholarStrategyExpanded && (
        <Card className={`mx-4 mt-1 mb-2 rounded-none ${CARD_BORDER} bg-black/55 border-primary/30`}>
          <div className="p-3 space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <div className="font-terminal text-xs text-muted-foreground max-w-3xl">
                  {session.scholarStrategy.summary}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                    BRAIN SNAPSHOT {session.scholarStrategy.profileSnapshotId ?? "N/A"}
                  </Badge>
                  <Badge variant="outline" className="rounded-none text-[10px] border-primary/40">
                    {session.scholarStrategy.hybridArchetype?.label || "EMERGING PATTERN"}
                  </Badge>
                  {session.scholarStrategy.activeInvestigation?.title && (
                    <Badge variant="outline" className="rounded-none text-[10px] border-secondary/40">
                      RESEARCH: {session.scholarStrategy.activeInvestigation.title}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="font-terminal text-[11px] text-muted-foreground max-w-sm">
                {session.scholarStrategy.boundedBy?.note}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(session.scholarStrategy.fields || {}).map(([fieldKey, field]) => (
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
                          const active = (session.strategyFeedback?.[control.key as keyof typeof session.strategyFeedback] || "") === option;
                          return (
                            <Button
                              key={option}
                              variant="ghost"
                              size="sm"
                              disabled={session.savingStrategyFeedback}
                              onClick={() => {
                                void session.saveScholarStrategyFeedback(
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
                    value={session.strategyNotes}
                    onChange={(event) => session.setStrategyNotes(event.target.value)}
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
                      disabled={session.savingStrategyFeedback}
                      onClick={() => {
                        void session.saveScholarStrategyNotes();
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
                    Allowed: {session.scholarStrategy.boundedBy?.allowedFields?.join(", ")}
                  </div>
                  <div>
                    Fixed: {session.scholarStrategy.boundedBy?.forbiddenFields?.join(", ")}
                  </div>
                  {session.scholarStrategy.activeInvestigation?.topFinding && (
                    <div>
                      Latest finding: {session.scholarStrategy.activeInvestigation.topFinding}
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

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 bg-black/40 flex flex-col min-w-0" role="tabpanel" aria-labelledby={`tutor-tab-${shellMode === "dashboard" ? workflow.workflowView : shellMode}`}>
          {shellMode === "studio" ? (
            <div key="studio" className="flex-1 min-h-0 animate-fade-slide-in">
              <TutorErrorBoundary fallbackLabel="Studio">
              <TutorStudioMode
                courseId={hub.courseId}
                chainId={hub.chainId}
                activeSessionId={activeSessionId}
                availableMaterials={hub.chatMaterials}
                selectedMaterialIds={hub.selectedMaterials}
                activeBoardScope={activeBoardScope}
                activeBoardId={activeBoardId}
                viewerState={viewerState}
                onBoardScopeChange={(scope) => {
                  setActiveBoardScope(scope);
                  setActiveBoardId(null);
                }}
                onActiveBoardIdChange={setActiveBoardId}
                onViewerStateChange={setViewerState}
                onCourseChange={(id) => hub.setCourseId(id)}
                onLaunchSession={() => {
                  setShellMode("dashboard");
                  setShowSetup(false);
                }}
                entryRequest={studioEntryRequest}
              />
              </TutorErrorBoundary>
            </div>
          ) : shellMode === "dashboard" ? (
            <div key="dashboard-panel" className="flex-1 min-h-0 overflow-y-auto w-full p-4 animate-fade-slide-in">
              <TutorErrorBoundary fallbackLabel="Dashboard">
              {workflow.workflowView === "launch" ? (
                <TutorWorkflowLaunchHub
                  workflows={workflow.filteredWorkflows}
                  totalCount={workflow.workflows.length}
                  courses={hub.tutorContentSources?.courses || []}
                  filters={workflow.workflowFilters}
                  onFiltersChange={workflow.setWorkflowFilters}
                  onStartNew={() => {
                    void workflow.createWorkflowAndOpenPriming();
                  }}
                  onOpenWorkflow={(wf) => {
                    void workflow.openWorkflowRecord(wf);
                  }}
                  onDeleteWorkflow={(wf) => {
                    void workflow.deleteWorkflowRecord(wf);
                  }}
                  tutorHub={hub.tutorHub}
                  tutorHubLoading={hub.tutorHubLoading}
                  activeWorkflowId={workflow.activeWorkflowId}
                  isCreating={workflow.creatingWorkflow}
                  deletingWorkflowId={workflow.deletingWorkflowId}
                />
              ) : workflow.workflowView === "priming" ? (
                <TutorWorkflowPrimingPanel
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
                  onBackToLaunch={() => workflow.setWorkflowView("launch")}
                  onSaveDraft={() => {
                    void workflow.saveWorkflowPriming("draft");
                  }}
                  onMarkReady={() => {
                    void workflow.saveWorkflowPriming("ready");
                  }}
                  onStartTutor={() => {
                    void workflow.startTutorFromWorkflow();
                  }}
                  onRunAssistForSelected={() => {
                    void workflow.runWorkflowPrimingAssist(hub.selectedMaterials);
                  }}
                  onRunAssistForMaterial={(materialId) => {
                    void workflow.runWorkflowPrimingAssist([materialId]);
                  }}
                  isSaving={workflow.savingPrimingBundle}
                  isStartingTutor={session.isStarting}
                  isRunningAssist={workflow.runningPrimingAssist}
                  assistTargetMaterialId={workflow.primingAssistTargetMaterialId}
                />
              ) : workflow.workflowView === "polish" ? (
                <TutorWorkflowPolishStudio
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
              ) : (
                <TutorWorkflowFinalSync
                  workflowDetail={workflow.activeWorkflowDetail || null}
                  onBackToPolish={() => workflow.setWorkflowView("polish")}
                />
              )}
              </TutorErrorBoundary>
            </div>
          ) : shellMode === "schedule" ? (
            <div key="schedule" className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 animate-fade-slide-in">
              <TutorErrorBoundary fallbackLabel="Schedule">
              <div className="mx-auto h-full w-full max-w-7xl overflow-hidden">
                <TutorScheduleMode
                  courseId={hub.courseId ?? null}
                  courseName={hub.courseLabel || null}
                  focusTopic={hub.topic || null}
                  launchIntent={scheduleLaunchIntent}
                />
              </div>
              </TutorErrorBoundary>
            </div>
          ) : (
            <div key="chat" className="flex-1 flex flex-col min-h-0 animate-fade-slide-in">
              <TutorErrorBoundary fallbackLabel="Tutor">
              {activeSessionId ? (
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <Card className={`rounded-none ${CARD_BORDER} bg-black/45 border-primary/20`}>
                    <CardHeader className="border-b border-primary/15 pb-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <CardTitle className="font-arcade text-xs text-primary">
                            STUDY SESSION
                          </CardTitle>
                          <div className={`${TEXT_MUTED} mt-2 text-xs`}>
                            Your notes, feedback, and timer are connected to this study plan.
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-none border-primary/30 text-primary/80">
                            {workflow.activeWorkflowId ? "STUDY PLAN ACTIVE" : "NO STUDY PLAN"}
                          </Badge>
                          {workflow.activeWorkflowDetail?.captured_notes ? (
                            <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                              {workflow.activeWorkflowDetail.captured_notes.length} NOTES
                            </Badge>
                          ) : null}
                          {workflow.activeWorkflowDetail?.feedback_events ? (
                            <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                              {workflow.activeWorkflowDetail.feedback_events.length} FEEDBACK
                            </Badge>
                          ) : null}
                          {workflow.activeWorkflowDetail?.memory_capsules ? (
                            <Badge variant="outline" className="rounded-none border-primary/20 text-muted-foreground">
                              {workflow.activeWorkflowDetail.memory_capsules.length} CAPSULES
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-4 xl:grid-cols-[0.92fr_1.08fr_1.02fr]">
                      {/* Timer + Exact Note */}
                      <div className="space-y-4">
                        <div className="border border-primary/20 bg-black/35 p-3">
                          <div className="font-arcade text-[10px] text-primary/80">STUDY TIMER</div>
                          <div className="mt-2 font-terminal text-2xl text-foreground">
                            {formatElapsedDuration(session.stageTimerDisplaySeconds)}
                          </div>
                          <div className={`${TEXT_MUTED} mt-1 text-xs`}>
                            Pause count {session.stageTimerPauseCount}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-[10px]"
                              onClick={() => {
                                void session.toggleWorkflowStudyTimer();
                              }}
                              disabled={!workflow.activeWorkflowId}
                            >
                              {session.stageTimerRunning ? "PAUSE TIMER" : "RESUME TIMER"}
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-none font-arcade text-[10px]"
                              onClick={() => {
                                void (async () => {
                                  try {
                                    const sliceSeconds = await session.persistStageTimeSlice("manual_save", [
                                      { kind: "study_timer", session_id: activeSessionId },
                                    ]);
                                    if (sliceSeconds > 0) {
                                      // Timer will auto-restart via the effect
                                    }
                                  } catch (err) {
                                    // toast handled in persistStageTimeSlice
                                  }
                                })();
                              }}
                              disabled={!workflow.activeWorkflowId || !session.stageTimerRunning}
                            >
                              SAVE SLICE
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                          <div className="font-arcade text-[10px] text-primary/80">SAVE EXACT NOTE</div>
                          <input
                            value={workflow.exactNoteTitle}
                            onChange={(event) => workflow.setExactNoteTitle(event.target.value)}
                            placeholder="Optional exact note title"
                            className={INPUT_BASE}
                          />
                          <Textarea
                            value={workflow.exactNoteContent}
                            onChange={(event) => workflow.setExactNoteContent(event.target.value)}
                            placeholder="Paste the exact wording you want preserved."
                            className="min-h-[110px] rounded-none bg-black/40 border-primary/20"
                          />
                          <Button
                            variant="outline"
                            className="rounded-none font-arcade text-[10px]"
                            onClick={() => {
                              void workflow.saveWorkflowNoteCapture("exact");
                            }}
                            disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
                          >
                            SAVE EXACT
                          </Button>
                        </div>
                      </div>

                      {/* Editable Note + Feedback */}
                      <div className="space-y-4">
                        <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                          <div className="font-arcade text-[10px] text-primary/80">SAVE EDITABLE NOTE</div>
                          <input
                            value={workflow.editableNoteTitle}
                            onChange={(event) => workflow.setEditableNoteTitle(event.target.value)}
                            placeholder="Optional editable note title"
                            className={INPUT_BASE}
                          />
                          <Textarea
                            value={workflow.editableNoteContent}
                            onChange={(event) => workflow.setEditableNoteContent(event.target.value)}
                            placeholder="Save a revisable note for Polish and Obsidian."
                            className="min-h-[110px] rounded-none bg-black/40 border-primary/20"
                          />
                          <Button
                            variant="outline"
                            className="rounded-none font-arcade text-[10px]"
                            onClick={() => {
                              void workflow.saveWorkflowNoteCapture("editable");
                            }}
                            disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
                          >
                            SAVE EDITABLE
                          </Button>
                        </div>

                        <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                          <div className="font-arcade text-[10px] text-primary/80">SESSION FEEDBACK</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select
                              value={workflow.feedbackSentiment}
                              onChange={(event) =>
                                workflow.setFeedbackSentiment(event.target.value as "liked" | "disliked")
                              }
                              className={SELECT_BASE}
                            >
                              <option value="liked">Liked</option>
                              <option value="disliked">Disliked</option>
                            </select>
                            <select
                              value={workflow.feedbackIssueType}
                              onChange={(event) => workflow.setFeedbackIssueType(event.target.value)}
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
                            value={workflow.feedbackMessage}
                            onChange={(event) => workflow.setFeedbackMessage(event.target.value)}
                            placeholder="What worked or failed in this tutor run?"
                            className="min-h-[100px] rounded-none bg-black/40 border-primary/20"
                          />
                          <Button
                            variant="outline"
                            className="rounded-none font-arcade text-[10px]"
                            onClick={() => {
                              void workflow.saveWorkflowFeedbackEvent();
                            }}
                            disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
                          >
                            SAVE FEEDBACK
                          </Button>
                        </div>
                      </div>

                      {/* Memory capsule */}
                      <div className="space-y-3 border border-primary/20 bg-black/35 p-3">
                        <div className="font-arcade text-[10px] text-primary/80">MEMORY CAPSULE</div>
                        <Textarea
                          value={workflow.memorySummaryText}
                          onChange={(event) => workflow.setMemorySummaryText(event.target.value)}
                          placeholder="Compaction summary for the finished portion of the session."
                          className="min-h-[90px] rounded-none bg-black/40 border-primary/20"
                        />
                        <Textarea
                          value={workflow.memoryWeakPointsText}
                          onChange={(event) => workflow.setMemoryWeakPointsText(event.target.value)}
                          placeholder={"Weak points\nOne per line"}
                          className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                        />
                        <Textarea
                          value={workflow.memoryUnresolvedText}
                          onChange={(event) => workflow.setMemoryUnresolvedText(event.target.value)}
                          placeholder={"Unresolved questions\nOne per line"}
                          className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                        />
                        <Textarea
                          value={workflow.memoryCardRequestsText}
                          onChange={(event) => workflow.setMemoryCardRequestsText(event.target.value)}
                          placeholder={"Queued card requests\nOne per line"}
                          className="min-h-[75px] rounded-none bg-black/40 border-primary/20"
                        />
                        <Button
                          variant="outline"
                          className="rounded-none font-arcade text-[10px]"
                          onClick={() => {
                            void workflow.createWorkflowMemoryCapsule();
                          }}
                          disabled={!workflow.activeWorkflowId || workflow.savingRuntimeEvent}
                        >
                          CREATE CAPSULE
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-none font-arcade text-[10px]"
                          onClick={() => {
                            void workflow.openWorkflowPolish();
                          }}
                          disabled={!workflow.activeWorkflowId}
                        >
                          OPEN POLISH
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="min-h-0 flex-1">
                    <TutorChat
                      sessionId={activeSessionId}
                      courseId={hub.courseId}
                      availableMaterials={hub.chatMaterials}
                      selectedMaterialIds={hub.selectedMaterials}
                      accuracyProfile={hub.accuracyProfile}
                      onAccuracyProfileChange={hub.setAccuracyProfile}
                      onSelectedMaterialIdsChange={hub.setSelectedMaterials}
                      onMaterialsChanged={hub.refreshChatMaterials}
                      onArtifactCreated={session.handleArtifactCreated}
                      onStudioCapture={session.handleStudioCapture}
                      onCaptureNote={(payload) => {
                        void workflow.captureWorkflowMessageNote(payload);
                      }}
                      onFeedback={(payload) => {
                        void workflow.saveWorkflowMessageFeedback(payload);
                      }}
                      onCompact={() => {
                        void workflow.quickCompactWorkflowMemory();
                      }}
                      timerState={{
                        elapsedSeconds: session.stageTimerDisplaySeconds,
                        paused: !session.stageTimerRunning,
                      }}
                      onToggleTimer={() => {
                        void session.toggleWorkflowStudyTimer();
                      }}
                      onAssistantTurnCommitted={({ assistantMessage }) => {
                        session.setLatestCommittedAssistantMessage(assistantMessage);
                      }}
                      initialTurns={restoredTurns}
                      onTurnComplete={(masteryUpdate) => {
                        session.setTurnCount((prev: number) => prev + 1);
                        if (masteryUpdate) {
                          queryClient.invalidateQueries({ queryKey: ["mastery-dashboard"] });
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <TutorEmptyState
                  icon={MessageSquare}
                  title="READY TO RUN A STUDY SESSION"
                  description="Tutor is the live study surface. Start or resume from Dashboard, or switch to Studio to prepare notes and captures before studying."
                  actions={[
                    {
                      label: "GO TO DASHBOARD",
                      icon: ListChecks,
                      onClick: () => setShellMode("dashboard"),
                      variant: "primary",
                    },
                    {
                      label: "GO TO STUDIO",
                      icon: PenTool,
                      onClick: () => setShellMode("studio"),
                      variant: "ghost",
                    },
                  ]}
                />
              )}
              </TutorErrorBoundary>

              {session.showEndConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 animate-fade-slide-in">
                  <div className="bg-black/95 border-2 border-primary/50 rounded-lg p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-w-md w-full mx-4 space-y-3">
                    <div className="section-header">SESSION COMPLETE</div>
                    <div className={`flex items-center gap-4 ${TEXT_MUTED} text-xs`}>
                      <span className="text-foreground">{hub.topic || "No topic"}</span>
                      <span>{session.turnCount} turns</span>
                      {session.startedAt && (
                        <span>
                          {Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)} min
                        </span>
                      )}
                      {session.artifacts.length > 0 && <span>{session.artifacts.length} artifacts</span>}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={session.shipToBrainAndEnd}
                        disabled={session.isShipping}
                        className={`${BTN_PRIMARY} w-auto gap-1.5 h-9 px-4`}
                      >
                        {session.isShipping ? <Loader2 className={`${ICON_MD} animate-spin`} /> : <Send className={ICON_MD} />}
                        {session.isShipping ? "SHIPPING..." : "SHIP TO BRAIN"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { session.endSession(); session.setShowEndConfirm(false); }}
                        disabled={session.isShipping}
                        className={BTN_TOOLBAR}
                      >
                        END WITHOUT SAVING
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => session.setShowEndConfirm(false)}
                        disabled={session.isShipping}
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

        {/* Right side artifact panel */}
        {activeSessionId && shellMode === "tutor" && session.showArtifacts && (
          <>
            <div
              className="fixed inset-0 z-20 bg-black/60 lg:hidden"
              onClick={() => session.setShowArtifacts(false)}
              aria-hidden="true"
            />
            <div className="absolute lg:static right-0 inset-y-0 z-30 w-[320px] shrink-0 border-l-2 border-primary/30 bg-black/90 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.5)] lg:shadow-none animate-fade-slide-in">
              <div className="flex items-center justify-between p-2 border-b-2 border-primary/20 bg-primary/5">
                <span className="section-header px-2">ARTIFACTS</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-none"
                  onClick={() => session.setShowArtifacts(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <TutorArtifacts
                  sessionId={activeSessionId}
                  artifacts={session.artifacts}
                  turnCount={session.turnCount}
                  topic={hub.topic}
                  startedAt={session.startedAt}
                  onCreateArtifact={session.handleArtifactCreated}
                  recentSessions={hub.recentSessions}
                  onResumeSession={session.resumeSession}
                  onDeleteArtifacts={session.handleDeleteArtifacts}
                  onEndSession={session.endSessionById}
                  onClearActiveSession={session.clearActiveSessionState}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className={`bg-black ${CARD_BORDER} max-w-lg`}>
          <DialogTitle className="section-header">
            TUTOR SETTINGS
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure tutor model, speed tier, and custom instructions
          </DialogDescription>
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <label htmlFor="tutor-custom-instructions" className="section-header text-muted-foreground">
                Custom Instructions
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                disabled={settingsLoading}
                className={BTN_TOOLBAR}
              >
                {isPreviewMode ? (
                  <><EyeOff className="w-3.5 h-3.5 mr-1" /> EDIT</>
                ) : (
                  <><Eye className="w-3.5 h-3.5 mr-1" /> PREVIEW</>
                )}
              </Button>
            </div>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : isPreviewMode ? (
              <div className="bg-black border-2 border-primary/40 rounded-none font-terminal text-sm p-3 min-h-[240px] max-h-[400px] overflow-y-auto text-foreground">
                {customInstructions ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => <h1 className="font-arcade text-base text-primary mb-2 mt-3 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-arcade text-sm text-primary/90 mb-1.5 mt-2.5">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-arcade text-xs text-primary/80 mb-1 mt-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                      strong: ({ children }) => <strong className="text-foreground font-bold">{children}</strong>,
                      em: ({ children }) => <em className="text-primary/70">{children}</em>,
                      code: ({ children }) => <code className="bg-primary/10 text-primary px-1 rounded text-xs">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>,
                    }}
                  >
                    {customInstructions}
                  </ReactMarkdown>
                ) : (
                  <span className="text-muted-foreground italic">No custom instructions set.</span>
                )}
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
    </>
  );
}
