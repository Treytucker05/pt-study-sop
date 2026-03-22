import {
  useRef,
  useEffect,
  useCallback,
  useReducer,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  Clock3,
  Pause,
  Play,
  Send,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  api,
  type BehaviorOverride,
  type TutorAccuracyProfile,
  type TutorSessionWithTurns,
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
import {
  resolveTutorTeachRuntime,
  type TutorChatProps,
  type NorthStarSummary,
  type TutorTeachRuntimeField,
  type TutorTeachRuntimeStatus,
} from "./TutorChat.types";
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
  sessionSnapshot: Record<string, unknown> | null;
  currentBlock:
    | NonNullable<TutorSessionWithTurns["chain_blocks"]>[number]
    | null;
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
        ? filter.folders.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      const refs = Array.isArray(filter.reference_targets)
        ? filter.reference_targets.filter(
            (value): value is string => typeof value === "string",
          )
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
                typeof (northStar as Record<string, unknown>).status ===
                "string"
                  ? ((northStar as Record<string, unknown>).status as string)
                  : undefined,
              module_name:
                typeof (northStar as Record<string, unknown>).module_name ===
                "string"
                  ? ((northStar as Record<string, unknown>)
                      .module_name as string)
                  : undefined,
              course_name:
                typeof (northStar as Record<string, unknown>).course_name ===
                "string"
                  ? ((northStar as Record<string, unknown>)
                      .course_name as string)
                  : undefined,
              subtopic_name:
                typeof (northStar as Record<string, unknown>).subtopic_name ===
                "string"
                  ? ((northStar as Record<string, unknown>)
                      .subtopic_name as string)
                  : undefined,
              objective_ids: Array.isArray(
                (northStar as Record<string, unknown>).objective_ids,
              )
                ? (
                    (northStar as Record<string, unknown>)
                      .objective_ids as unknown[]
                  ).filter(
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
        sessionSnapshot: session as Record<string, unknown>,
        currentBlock:
          Array.isArray(session.chain_blocks) &&
          typeof session.current_block_index === "number" &&
          session.current_block_index >= 0 &&
          session.current_block_index < session.chain_blocks.length
            ? session.chain_blocks[session.current_block_index]
            : null,
      };
    },
  });
}

const RUNTIME_STATUS_STYLES: Record<TutorTeachRuntimeStatus, string> = {
  live: "border-primary/40 bg-primary/10 text-primary",
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  locked: "border-red-500/30 bg-red-500/10 text-red-200",
  complete: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  skipped: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  fallback: "border-secondary/40 bg-secondary/10 text-secondary-foreground",
};

const TUTOR_CHAT_PANEL =
  "rounded-none border border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.1)_26%,rgba(0,0,0,0.24)_100%),linear-gradient(135deg,rgba(255,42,76,0.07),rgba(0,0,0,0.03)_48%,rgba(0,0,0,0.12)_100%)] backdrop-blur-sm";

const TUTOR_CHAT_PANEL_SOFT =
  "rounded-none border border-primary/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(0,0,0,0.08)_24%,rgba(0,0,0,0.18)_100%),linear-gradient(135deg,rgba(255,42,76,0.05),rgba(0,0,0,0.03)_48%,rgba(0,0,0,0.1)_100%)] backdrop-blur-sm";

function runtimeBadgeClasses(status: TutorTeachRuntimeStatus): string {
  return cn(
    "rounded-none border px-2 py-1 font-arcade text-ui-2xs uppercase tracking-[0.18em]",
    RUNTIME_STATUS_STYLES[status],
  );
}

function TutorRuntimeChip({ field }: { field: TutorTeachRuntimeField }) {
  return (
    <div className={cn(TUTOR_CHAT_PANEL_SOFT, "p-2")}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-arcade text-ui-2xs uppercase tracking-[0.18em] text-muted-foreground">
          {field.label}
        </div>
        <Badge variant="outline" className={runtimeBadgeClasses(field.status)}>
          {field.status}
        </Badge>
      </div>
      <div className="mt-2 font-terminal text-xs leading-5 text-foreground">
        {field.value}
      </div>
    </div>
  );
}

function TutorTeachRuntimeStrip({
  isLoading,
  teachRuntime,
}: {
  isLoading: boolean;
  teachRuntime: ReturnType<typeof resolveTutorTeachRuntime> | null;
}) {
  if (isLoading) {
    return (
      <div
        data-testid="tutor-teach-runtime-strip-loading"
        className={cn(
          TUTOR_CHAT_PANEL,
          "grid grid-cols-1 gap-2 p-3 sm:grid-cols-2",
        )}
      >
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="animate-pulse rounded-none border border-primary/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.12)_24%,rgba(0,0,0,0.2)_100%)] p-3 backdrop-blur-sm"
          >
            <div className="h-3 w-20 bg-primary/20" />
            <div className="mt-3 h-4 w-32 bg-primary/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!teachRuntime) return null;

  return (
    <div
      data-testid="tutor-teach-runtime-strip"
      className={cn(
        TUTOR_CHAT_PANEL,
        "p-3 shadow-[0_14px_30px_rgba(0,0,0,0.14)]",
      )}
    >
      <div className="flex flex-col gap-2 border-b border-primary/15 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-arcade text-ui-2xs uppercase tracking-[0.18em] text-primary">
            Live TEACH Packet
          </div>
          <div className="mt-1 font-terminal text-xs leading-5 text-muted-foreground">
            Current stage, lane, close artifact, and unlock states stay visible
            while you chat.
          </div>
        </div>
        <Badge
          variant="outline"
          className={runtimeBadgeClasses(teachRuntime.stage.status)}
        >
          {teachRuntime.packetSource === "backend"
            ? "backend packet"
            : teachRuntime.packetSource === "mixed"
              ? "mixed packet"
              : "inferred fallback"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <TutorRuntimeChip field={teachRuntime.stage} />
        <TutorRuntimeChip field={teachRuntime.conceptType} />
        <TutorRuntimeChip
          field={{
            label: "Depth lane",
            value: `${teachRuntime.depth.start} -> ${teachRuntime.depth.current} -> ${teachRuntime.depth.ceiling}`,
            status: teachRuntime.depth.status,
          }}
        />
        <TutorRuntimeChip field={teachRuntime.bridge} />
        <TutorRuntimeChip field={teachRuntime.requiredArtifact} />
        <TutorRuntimeChip field={teachRuntime.functionConfirmation} />
        <TutorRuntimeChip field={teachRuntime.l4Unlock} />
        <TutorRuntimeChip field={teachRuntime.mnemonic} />
      </div>

      <div className="mt-3 border-t border-primary/15 pt-3 font-terminal text-xs leading-5 text-muted-foreground">
        {teachRuntime.note}
        {teachRuntime.missingBackendFields.length > 0 ? (
          <div className="mt-2">
            Waiting on backend fields:{" "}
            {teachRuntime.missingBackendFields.join(", ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TutorChatEmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <div className={TEXT_SECTION_LABEL}>NO ACTIVE SESSION</div>
        <div className={TEXT_MUTED}>
          Configure content filter and start a session
        </div>
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
      {(["socratic", "evaluate", "concept_map", "teach_back"] as const).map(
        (mode) => {
          const active = activeMode === mode;
          return (
            <button
              key={mode}
              type="button"
              title={BEHAVIOR_TITLES[mode]}
              onClick={() => onSelect(mode)}
              disabled={disabled}
              className={`h-8 px-3 font-arcade text-ui-2xs tracking-wider border-2 transition-colors disabled:opacity-50 ${
                active
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
              }`}
            >
              {BEHAVIOR_LABELS[mode]}
            </button>
          );
        },
      )}
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
  const sessionContextQuery = useTutorSessionContext(
    sessionId,
    defaultMaterialsOn,
  );
  const sessionContext = sessionContextQuery.data;
  const effectiveMaterialsOn =
    chatState.materialsPreference ??
    sessionContext?.materialsDefault ??
    defaultMaterialsOn;
  const northStarSummary = sessionContext?.northStarSummary ?? null;
  const teachRuntime = sessionContext
    ? resolveTutorTeachRuntime({
        workflowDetail: sessionContext.sessionSnapshot,
        workflowStage: sessionContext.currentBlock?.category || null,
        currentBlock: sessionContext.currentBlock,
      })
    : null;
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
          const result = await api.tutor.uploadMaterial(file, {
            course_id: courseId,
          });
          uploadedIds.push(result.duplicate_of?.id ?? result.id);
        }
        if (onMaterialsChanged) {
          await onMaterialsChanged();
        }
        const merged = Array.from(
          new Set([...selectedMaterialIds, ...uploadedIds]),
        );
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
          teachRuntime={teachRuntime}
          onArtifactCreated={onArtifactCreated}
          onStudioCapture={onStudioCapture}
          onCaptureNote={onCaptureNote}
          onFeedback={onFeedback}
        />

        <div className="flex flex-col gap-3 border-t border-primary/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(0,0,0,0.09)_18%,rgba(0,0,0,0.2)_100%),linear-gradient(135deg,rgba(255,42,76,0.05),rgba(0,0,0,0.03)_44%,rgba(0,0,0,0.14)_100%)] p-4 backdrop-blur-md lg:p-5">
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
              patchChatState((state) => ({
                isSourcesOpen: !state.isSourcesOpen,
              }))
            }
            onAccuracyProfileChange={onAccuracyProfileChange}
            onBehaviorSelect={handleBehaviorSelect}
            onToggleTimer={onToggleTimer}
            onCompact={onCompact}
          />

          <TutorTeachRuntimeStrip
            isLoading={sessionContextQuery.isLoading}
            teachRuntime={teachRuntime}
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
