import {
  useRef,
  useEffect,
  useCallback,
  useReducer,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, Clock3, Pause, Play, Send, SlidersHorizontal, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  api,
  type BehaviorOverride,
  type TutorAccuracyProfile,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  TEXT_SECTION_LABEL,
  TEXT_MUTED,
  INPUT_BASE,
  BTN_TOOLBAR,
  BTN_TOOLBAR_ACTIVE,
  ICON_MD,
} from "@/lib/theme";
import type { TutorChatProps, NorthStarSummary } from "./TutorChat.types";
import { useSSEStream } from "./useSSEStream";
import { MessageList } from "./MessageList";
import { SourcesPanel } from "./SourcesPanel";

type TutorChatState = {
  isSourcesOpen: boolean;
  isUploadingMaterial: boolean;
  selectedVaultPaths: string[];
  materialsPreference: boolean | null;
  obsidianOn: boolean;
  webSearchOn: boolean;
  deepThinkOn: boolean;
  geminiVisionOn: boolean;
  behaviorOverride: BehaviorOverride | null;
};

type TutorChatPatch =
  | Partial<TutorChatState>
  | ((state: TutorChatState) => Partial<TutorChatState>);

type TutorSessionContext = {
  folders: string[];
  materialsDefault: boolean;
  northStarSummary: NorthStarSummary | null;
};

type SpeedTierControl = {
  key: "materials" | "obsidian" | "gemini" | "web" | "deep";
  label: string;
  on: boolean;
  onToggle: () => void;
};

const BEHAVIOR_LABELS: Record<BehaviorOverride, string> = {
  socratic: "ASK / SOCRATIC",
  evaluate: "EVALUATE",
  concept_map: "CONCEPT MAP",
  teach_back: "TEACH-BACK",
};

const BEHAVIOR_TITLES: Record<BehaviorOverride, string> = {
  socratic: "Socratic — respond with questions only",
  evaluate: "Evaluate — assess your answer",
  concept_map: "Concept Map — generate Mermaid diagram",
  teach_back: "Teach-Back — explain as if teaching a novice",
};

function createTutorChatState({
  vaultSelectionKey,
}: {
  vaultSelectionKey: string;
}): TutorChatState {
  let selectedVaultPaths: string[] = [];
  try {
    const raw = localStorage.getItem(vaultSelectionKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      selectedVaultPaths = Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    }
  } catch {
    selectedVaultPaths = [];
  }

  return {
    isSourcesOpen: false,
    isUploadingMaterial: false,
    selectedVaultPaths,
    materialsPreference: null,
    obsidianOn: false,
    webSearchOn: false,
    deepThinkOn: false,
    geminiVisionOn: false,
    behaviorOverride: null,
  };
}

function tutorChatReducer(
  state: TutorChatState,
  patch: TutorChatPatch,
): TutorChatState {
  const nextPatch = typeof patch === "function" ? patch(state) : patch;
  return { ...state, ...nextPatch };
}

function useTutorSessionContext(
  sessionId: string | null,
  defaultMaterialsOn: boolean,
) {
  return useQuery<TutorSessionContext>({
    queryKey: ["tutor", "session-context", sessionId, defaultMaterialsOn],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const session = await api.tutor.getSession(sessionId!);
      const filter = (session.content_filter || {}) as Record<string, unknown>;
      const defaultMode =
        filter.default_mode && typeof filter.default_mode === "object"
          ? (filter.default_mode as Record<string, unknown>)
          : null;
      const folders = Array.isArray(filter.folders)
        ? filter.folders.filter((value): value is string => typeof value === "string")
        : [];
      const refs = Array.isArray(filter.reference_targets)
        ? filter.reference_targets.filter((value): value is string => typeof value === "string")
        : [];
      const northStar = filter.map_of_contents || filter.north_star;
      const northStarSummary =
        northStar && typeof northStar === "object"
          ? {
              path:
                typeof (northStar as Record<string, unknown>).path === "string"
                  ? ((northStar as Record<string, unknown>).path as string)
                  : undefined,
              status:
                typeof (northStar as Record<string, unknown>).status === "string"
                  ? ((northStar as Record<string, unknown>).status as string)
                  : undefined,
              module_name:
                typeof (northStar as Record<string, unknown>).module_name === "string"
                  ? ((northStar as Record<string, unknown>).module_name as string)
                  : undefined,
              course_name:
                typeof (northStar as Record<string, unknown>).course_name === "string"
                  ? ((northStar as Record<string, unknown>).course_name as string)
                  : undefined,
              subtopic_name:
                typeof (northStar as Record<string, unknown>).subtopic_name === "string"
                  ? ((northStar as Record<string, unknown>).subtopic_name as string)
                  : undefined,
              objective_ids: Array.isArray(
                (northStar as Record<string, unknown>).objective_ids,
              )
                ? ((northStar as Record<string, unknown>).objective_ids as unknown[]).filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
              reference_targets: refs,
            }
          : null;

      return {
        folders,
        materialsDefault: defaultMaterialsOn || Boolean(defaultMode?.materials),
        northStarSummary,
      };
    },
  });
}

function TutorChatEmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className={TEXT_SECTION_LABEL}>NO ACTIVE SESSION</div>
        <div className={TEXT_MUTED}>Configure content filter and start a session</div>
      </div>
    </div>
  );
}

function TutorBehaviorButtons({
  activeMode,
  disabled,
  onSelect,
}: {
  activeMode: BehaviorOverride | null;
  disabled: boolean;
  onSelect: (mode: BehaviorOverride) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["socratic", "evaluate", "concept_map", "teach_back"] as const).map((mode) => {
        const active = activeMode === mode;
        return (
          <button
            key={mode}
            type="button"
            title={BEHAVIOR_TITLES[mode]}
            onClick={() => onSelect(mode)}
            disabled={disabled}
            className={`h-8 px-3 font-arcade text-[10px] tracking-wider border-2 transition-colors disabled:opacity-50 ${
              active
                ? "bg-primary/20 border-primary text-primary"
                : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
            }`}
          >
            {BEHAVIOR_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}

function TutorSpeedTierRow({ controls }: { controls: SpeedTierControl[] }) {
  return (
    <div className="flex gap-1.5 px-2 pb-1 flex-wrap">
      {controls.map((control) => (
        <button
          key={control.key}
          type="button"
          aria-pressed={control.on}
          onClick={control.onToggle}
          className={cn(
            "rounded-none px-2.5 py-0.5 text-xs font-terminal border transition-colors",
            control.on
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-transparent text-muted-foreground border-border hover:border-primary",
          )}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}

function TutorChatToolbar({
  isSourcesOpen,
  accuracyProfile,
  isStreaming,
  behaviorOverride,
  timerState,
  onToggleSources,
  onAccuracyProfileChange,
  onBehaviorSelect,
  onToggleTimer,
  onCompact,
}: {
  isSourcesOpen: boolean;
  accuracyProfile: TutorAccuracyProfile;
  isStreaming: boolean;
  behaviorOverride: BehaviorOverride | null;
  timerState?: {
    elapsedSeconds: number;
    paused: boolean;
  };
  onToggleSources: () => void;
  onAccuracyProfileChange: (profile: TutorAccuracyProfile) => void;
  onBehaviorSelect: (mode: BehaviorOverride) => void;
  onToggleTimer?: () => void;
  onCompact?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggleSources}
        className={isSourcesOpen ? BTN_TOOLBAR_ACTIVE : BTN_TOOLBAR}
      >
        <SlidersHorizontal className={`${ICON_MD} mr-1.5`} />
        SOURCES
      </Button>
      <div className="flex items-center gap-2 min-w-0">
        <label
          htmlFor="accuracy-profile-select"
          className={`${TEXT_MUTED} text-xs whitespace-nowrap`}
        >
          Profile
        </label>
        <select
          id="accuracy-profile-select"
          value={accuracyProfile}
          onChange={(event) =>
            onAccuracyProfileChange(event.target.value as TutorAccuracyProfile)
          }
          disabled={isStreaming}
          className="h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        >
          <option value="balanced">Balanced</option>
          <option value="strict">Strict</option>
          <option value="coverage">Coverage</option>
        </select>
      </div>
      <TutorBehaviorButtons
        activeMode={behaviorOverride}
        disabled={isStreaming}
        onSelect={onBehaviorSelect}
      />
      {timerState ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 border-2 border-primary/20 px-3 py-1.5 font-terminal text-xs text-foreground">
            <Clock3 className="h-3.5 w-3.5 text-primary/80" />
            {Math.max(0, Math.floor(timerState.elapsedSeconds / 60))}m{" "}
            {String(timerState.elapsedSeconds % 60).padStart(2, "0")}s
          </div>
          {onToggleTimer ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onToggleTimer}
              className={BTN_TOOLBAR}
            >
              {timerState.paused ? (
                <Play className={`${ICON_MD} mr-1.5`} />
              ) : (
                <Pause className={`${ICON_MD} mr-1.5`} />
              )}
              {timerState.paused ? "RESUME TIMER" : "PAUSE TIMER"}
            </Button>
          ) : null}
          {onCompact ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCompact}
              className={BTN_TOOLBAR}
              disabled={isStreaming}
            >
              <Archive className={`${ICON_MD} mr-1.5`} />
              COMPACT
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TutorInputComposer({
  input,
  isStreaming,
  inputRef,
  onInputChange,
  onKeyDown,
  onSend,
  onAbort,
}: {
  input: string;
  isStreaming: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onSend: () => void;
  onAbort: () => void;
}) {
  return (
    <div className="flex flex-row items-center gap-2">
      <input
        ref={inputRef}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a question..."
        disabled={isStreaming}
        className={`flex-1 min-w-[180px] ${INPUT_BASE} disabled:opacity-50 shadow-none`}
      />
      {isStreaming ? (
        <Button
          onClick={onAbort}
          aria-label="Stop generating"
          title="Stop generating"
          className="rounded-none border-[3px] border-double border-destructive h-11 w-11 p-0 shrink-0 hover:bg-destructive/20"
        >
          <Square className="w-5 h-5 mx-auto text-destructive" />
        </Button>
      ) : (
        <Button
          onClick={onSend}
          disabled={!input.trim()}
          aria-label="Send message"
          className="rounded-none border-[3px] border-double border-primary h-11 w-11 p-0 shrink-0"
        >
          <Send className="w-5 h-5 mx-auto" />
        </Button>
      )}
    </div>
  );
}

export function TutorChat({
  sessionId,
  courseId,
  availableMaterials,
  selectedMaterialIds,
  defaultMaterialsOn = false,
  accuracyProfile,
  onAccuracyProfileChange,
  onSelectedMaterialIdsChange,
  onMaterialsChanged,
  onArtifactCreated,
  onStudioCapture,
  onCaptureNote,
  onFeedback,
  onCompact,
  timerState,
  onToggleTimer,
  onAssistantTurnCommitted,
  onTurnComplete,
  initialTurns,
}: TutorChatProps) {
  const vaultSelectionKey = "tutor.chat.selected_vault_paths.v1";
  const [chatState, patchChatState] = useReducer(
    tutorChatReducer,
    { vaultSelectionKey },
    createTutorChatState,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionContextQuery = useTutorSessionContext(sessionId, defaultMaterialsOn);
  const sessionContext = sessionContextQuery.data;
  const effectiveMaterialsOn =
    chatState.materialsPreference ?? sessionContext?.materialsDefault ?? defaultMaterialsOn;
  const northStarSummary = sessionContext?.northStarSummary ?? null;
  const selectedMp4Count = availableMaterials.filter(
    (material) =>
      selectedMaterialIds.includes(material.id) &&
      (material.file_type === "mp4" ||
        material.source_path?.toLowerCase().endsWith(".mp4")),
  ).length;

  const {
    messages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    streamAbortRef,
  } = useSSEStream({
    sessionId,
    selectedMaterialIds,
    selectedVaultPaths: chatState.selectedVaultPaths,
    accuracyProfile,
    behaviorOverride: chatState.behaviorOverride,
    onBehaviorOverrideReset: useCallback(
      () => patchChatState({ behaviorOverride: null }),
      [],
    ),
    onArtifactCreated,
    onAssistantTurnCommitted,
    onTurnComplete,
    initialTurns,
    materialsOn: effectiveMaterialsOn,
    obsidianOn: chatState.obsidianOn,
    webSearchOn: chatState.webSearchOn,
    deepThinkOn: chatState.deepThinkOn,
    geminiVisionOn: chatState.geminiVisionOn,
  });

  const abortStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
  }, [streamAbortRef]);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        scrollRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  useEffect(() => {
    patchChatState({ materialsPreference: null, behaviorOverride: null });
  }, [sessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        vaultSelectionKey,
        JSON.stringify(chatState.selectedVaultPaths),
      );
    } catch {
      /* ignore localStorage write errors */
    }
  }, [chatState.selectedVaultPaths, vaultSelectionKey]);

  useEffect(() => {
    if (!sessionContext?.folders.length) {
      return;
    }
    patchChatState((state) =>
      state.selectedVaultPaths.length > 0
        ? {}
        : { selectedVaultPaths: sessionContext.folders },
    );
  }, [sessionContext?.folders]);

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      patchChatState({ isUploadingMaterial: true });
      try {
        const uploadedIds: number[] = [];
        for (const file of Array.from(files)) {
          const result = await api.tutor.uploadMaterial(file, { course_id: courseId });
          uploadedIds.push(result.duplicate_of?.id ?? result.id);
        }
        if (onMaterialsChanged) {
          await onMaterialsChanged();
        }
        const merged = Array.from(new Set([...selectedMaterialIds, ...uploadedIds]));
        onSelectedMaterialIdsChange(merged);
        toast.success(
          uploadedIds.length === 1
            ? "Material uploaded and added to this chat"
            : `${uploadedIds.length} materials uploaded and added to this chat`,
        );
      } catch (error) {
        toast.error(
          `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        patchChatState({ isUploadingMaterial: false });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      courseId,
      onMaterialsChanged,
      onSelectedMaterialIdsChange,
      selectedMaterialIds,
    ],
  );

  const handleBehaviorSelect = useCallback((mode: BehaviorOverride) => {
    patchChatState((state) => ({
      behaviorOverride: state.behaviorOverride === mode ? null : mode,
    }));
  }, []);

  const handleMaterialsToggle = useCallback(() => {
    patchChatState((state) => ({
      materialsPreference:
        (state.materialsPreference ?? effectiveMaterialsOn) ? false : true,
    }));
  }, [effectiveMaterialsOn]);

  const speedTiers: SpeedTierControl[] = [
    {
      key: "materials",
      label: "📚 Materials",
      on: effectiveMaterialsOn,
      onToggle: handleMaterialsToggle,
    },
    {
      key: "obsidian",
      label: "🗂️ Obsidian",
      on: chatState.obsidianOn,
      onToggle: () =>
        patchChatState((state) => ({ obsidianOn: !state.obsidianOn })),
    },
    {
      key: "gemini",
      label:
        chatState.geminiVisionOn && selectedMp4Count === 0
          ? "🎬 Gemini Vision (no MP4)"
          : `🎬 Gemini Vision${
              chatState.geminiVisionOn && selectedMp4Count > 0
                ? ` (${selectedMp4Count})`
                : ""
            }`,
      on: chatState.geminiVisionOn,
      onToggle: () =>
        patchChatState((state) => ({ geminiVisionOn: !state.geminiVisionOn })),
    },
    {
      key: "web",
      label: "🔍 Web",
      on: chatState.webSearchOn,
      onToggle: () =>
        patchChatState((state) => ({ webSearchOn: !state.webSearchOn })),
    },
    {
      key: "deep",
      label: "🧠 Deep Think",
      on: chatState.deepThinkOn,
      onToggle: () =>
        patchChatState((state) => ({ deepThinkOn: !state.deepThinkOn })),
    },
  ];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!sessionId) {
    return <TutorChatEmptyState />;
  }

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex flex-col h-full min-h-0 flex-1">
        <MessageList
          ref={scrollRef}
          messages={messages}
          onArtifactCreated={onArtifactCreated}
          onStudioCapture={onStudioCapture}
          onCaptureNote={onCaptureNote}
          onFeedback={onFeedback}
        />

        <div className="flex flex-col gap-3 p-4 lg:p-5 border-t-2 border-primary/20 bg-black/50">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => void handleUploadFiles(event.target.files)}
          />

          <TutorChatToolbar
            isSourcesOpen={chatState.isSourcesOpen}
            accuracyProfile={accuracyProfile}
            isStreaming={isStreaming}
            behaviorOverride={chatState.behaviorOverride}
            timerState={timerState}
            onToggleSources={() =>
              patchChatState((state) => ({ isSourcesOpen: !state.isSourcesOpen }))
            }
            onAccuracyProfileChange={onAccuracyProfileChange}
            onBehaviorSelect={handleBehaviorSelect}
            onToggleTimer={onToggleTimer}
            onCompact={onCompact}
          />

          <TutorSpeedTierRow controls={speedTiers} />

          <TutorInputComposer
            input={input}
            isStreaming={isStreaming}
            inputRef={inputRef}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
            onAbort={abortStream}
          />
        </div>
      </div>

      <SourcesPanel
        isOpen={chatState.isSourcesOpen}
        onClose={() => patchChatState({ isSourcesOpen: false })}
        availableMaterials={availableMaterials}
        selectedMaterialIds={selectedMaterialIds}
        onSelectedMaterialIdsChange={onSelectedMaterialIdsChange}
        onUploadFiles={handleUploadFiles}
        isUploadingMaterial={chatState.isUploadingMaterial}
        fileInputRef={fileInputRef}
        selectedVaultPaths={chatState.selectedVaultPaths}
        onSelectedVaultPathsChange={(paths) =>
          patchChatState({ selectedVaultPaths: paths })
        }
        northStarSummary={northStarSummary}
        isStreaming={isStreaming}
      />
    </div>
  );
}
