import { useState, useRef, useEffect, useCallback, useMemo, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  api,
  type BehaviorOverride,
  type TutorAccuracyProfile,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TEXT_SECTION_LABEL,
  TEXT_MUTED,
  INPUT_BASE,
  BTN_TOOLBAR,
  BTN_TOOLBAR_ACTIVE,
  ICON_MD,
} from "@/lib/theme";

import type { TutorChatProps, NorthStarSummary } from "./TutorChat.types";
export type { ChainBlock } from "./TutorChat.types";
import { useSSEStream } from "./useSSEStream";
import { MessageList } from "./MessageList";
import { SourcesPanel } from "./SourcesPanel";

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
  onTurnComplete,
  initialTurns,
}: TutorChatProps) {
  const vaultSelectionKey = "tutor.chat.selected_vault_paths.v1";

  // ── Sources panel state ───────────────────────────────────────────────────
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [selectedVaultPaths, setSelectedVaultPaths] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(vaultSelectionKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  });
  const [northStarSummary, setNorthStarSummary] = useState<NorthStarSummary | null>(null);

  // ── Speed tier toggles — all off = chat-only (codex-spark, no RAG) ────────
  const [materialsOn, setMaterialsOn] = useState(defaultMaterialsOn);
  const [obsidianOn, setObsidianOn] = useState(false);
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [deepThinkOn, setDeepThinkOn] = useState(false);
  const [geminiVisionOn, setGeminiVisionOn] = useState(false);
  const [materialsOverrideActive, setMaterialsOverrideActive] = useState(false);

  // ── Behavior override ─────────────────────────────────────────────────────
  const [behaviorOverride, setBehaviorOverride] = useState<BehaviorOverride | null>(null);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── SSE stream hook ───────────────────────────────────────────────────────
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
    selectedVaultPaths,
    accuracyProfile,
    behaviorOverride,
    onBehaviorOverrideReset: useCallback(() => setBehaviorOverride(null), []),
    onArtifactCreated,
    onTurnComplete,
    initialTurns,
    materialsOn,
    obsidianOn,
    webSearchOn,
    deepThinkOn,
    geminiVisionOn,
  });

  // ── Abort streaming ──────────────────────────────────────────────────────
  const abortStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
  }, [streamAbortRef]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isScrolledToBottom) {
        scrollRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  // ── Focus input on mount ──────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  useEffect(() => {
    setMaterialsOverrideActive(false);
  }, [sessionId]);

  useEffect(() => {
    if (!materialsOverrideActive) {
      setMaterialsOn(defaultMaterialsOn);
    }
  }, [defaultMaterialsOn, materialsOverrideActive]);

  // ── Persist vault paths ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(vaultSelectionKey, JSON.stringify(selectedVaultPaths));
    } catch {
      /* ignore localStorage write errors */
    }
  }, [selectedVaultPaths]);

  // ── Load session context (north star, vault folders) ──────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    const loadSessionContext = async () => {
      try {
        const session = await api.tutor.getSession(sessionId);
        const filter = (session.content_filter || {}) as Record<string, unknown>;
        const defaultMode = (
          filter.default_mode && typeof filter.default_mode === "object"
            ? filter.default_mode
            : null
        ) as Record<string, unknown> | null;
        const folders = Array.isArray(filter.folders)
          ? filter.folders.filter((v): v is string => typeof v === "string")
          : [];
        if (alive && folders.length > 0) {
          setSelectedVaultPaths((prev) => (prev.length > 0 ? prev : folders));
        }
        if (alive && !materialsOverrideActive) {
          // Wizard-selected materials default the Materials pill on until the learner changes it.
          setMaterialsOn(defaultMaterialsOn || Boolean(defaultMode?.materials));
        }
        const northStar = filter.map_of_contents || filter.north_star;
        const refs = Array.isArray(filter.reference_targets)
          ? filter.reference_targets.filter((v): v is string => typeof v === "string")
          : [];
        if (alive && northStar && typeof northStar === "object") {
          const rec = northStar as Record<string, unknown>;
          setNorthStarSummary({
            path: typeof rec.path === "string" ? rec.path : undefined,
            status: typeof rec.status === "string" ? rec.status : undefined,
            module_name: typeof rec.module_name === "string" ? rec.module_name : undefined,
            course_name: typeof rec.course_name === "string" ? rec.course_name : undefined,
            subtopic_name: typeof rec.subtopic_name === "string" ? rec.subtopic_name : undefined,
            objective_ids: Array.isArray(rec.objective_ids)
              ? rec.objective_ids.filter((v): v is string => typeof v === "string")
              : [],
            reference_targets: refs,
          });
        } else if (alive) {
          setNorthStarSummary(null);
        }
      } catch {
        if (alive) setNorthStarSummary(null);
      }
    };
    void loadSessionContext();
    return () => {
      alive = false;
    };
  }, [defaultMaterialsOn, isSourcesOpen, materialsOverrideActive, sessionId]);

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploadingMaterial(true);
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
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setIsUploadingMaterial(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [courseId, onMaterialsChanged, onSelectedMaterialIdsChange, selectedMaterialIds],
  );

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── No session guard ──────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className={TEXT_SECTION_LABEL}>
            NO ACTIVE SESSION
          </div>
          <div className={TEXT_MUTED}>
            Configure content filter and start a session
          </div>
        </div>
      </div>
    );
  }

  // ── Speed tier config ─────────────────────────────────────────────────────
  const selectedMp4Count = availableMaterials.filter(
    (m) => selectedMaterialIds.includes(m.id) && (m.file_type === "mp4" || m.source_path?.toLowerCase().endsWith(".mp4"))
  ).length;
  const geminiLabel = geminiVisionOn && selectedMp4Count === 0
    ? "🎬 Gemini Vision (no MP4)"
    : `🎬 Gemini Vision${geminiVisionOn && selectedMp4Count > 0 ? ` (${selectedMp4Count})` : ""}`;

  const speedTiers: { key: string; label: string; on: boolean; set: Dispatch<SetStateAction<boolean>> }[] = [
    { key: "materials", label: "📚 Materials", on: materialsOn, set: setMaterialsOn },
    { key: "obsidian", label: "🗂️ Obsidian", on: obsidianOn, set: setObsidianOn },
    { key: "gemini", label: geminiLabel, on: geminiVisionOn, set: setGeminiVisionOn },
    { key: "web", label: "🔍 Web", on: webSearchOn, set: setWebSearchOn },
    { key: "deep", label: "🧠 Deep Think", on: deepThinkOn, set: setDeepThinkOn },
  ];

  return (
    <div className="relative flex h-full min-h-0">
      <div className="flex flex-col h-full min-h-0 flex-1">
        {/* Messages */}
        <MessageList
          ref={scrollRef}
          messages={messages}
          onArtifactCreated={onArtifactCreated}
        />

        <div className="flex flex-col gap-3 p-4 lg:p-5 border-t-2 border-primary/20 bg-black/50">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void handleUploadFiles(e.target.files)}
          />

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSourcesOpen((prev) => !prev)}
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
                onChange={(e) => onAccuracyProfileChange(e.target.value as TutorAccuracyProfile)}
                disabled={isStreaming}
                className="h-9 bg-black border-2 border-secondary px-2 text-xs font-terminal text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
              >
                <option value="balanced">Balanced</option>
                <option value="strict">Strict</option>
                <option value="coverage">Coverage</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["socratic", "evaluate", "concept_map", "teach_back"] as const).map((mode) => {
                const active = behaviorOverride === mode;
                const labels: Record<BehaviorOverride, string> = {
                  socratic: "ASK / SOCRATIC",
                  evaluate: "EVALUATE",
                  concept_map: "CONCEPT MAP",
                  teach_back: "TEACH-BACK",
                };
                const titles: Record<BehaviorOverride, string> = {
                  socratic: "Socratic — respond with questions only",
                  evaluate: "Evaluate — assess your answer",
                  concept_map: "Concept Map — generate Mermaid diagram",
                  teach_back: "Teach-Back — explain as if teaching a novice",
                };
                return (
                  <button
                    key={mode}
                    type="button"
                    title={titles[mode]}
                    onClick={() => setBehaviorOverride(active ? null : mode)}
                    disabled={isStreaming}
                    className={`h-8 px-3 font-arcade text-[10px] tracking-wider border-2 transition-colors disabled:opacity-50 ${active
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-secondary/40 text-muted-foreground hover:border-secondary hover:text-foreground"
                      }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>
          {/* ── Speed Tier Toggles ─────────────────────────────── */}
          <div className="flex gap-1.5 px-2 pb-1 flex-wrap">
            {speedTiers.map(({ key, label, on, set }) => (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (key === "materials") {
                    setMaterialsOverrideActive(true);
                  }
                  set((prev) => !prev);
                }}
                className={cn(
                  "rounded-none px-2.5 py-0.5 text-xs font-terminal border transition-colors",
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {/* ─────────────────────────────────────────────────────── */}
          <div className="flex flex-row items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className={`flex-1 min-w-[180px] ${INPUT_BASE} disabled:opacity-50 shadow-none`}
            />
            {isStreaming ? (
              <Button
                onClick={abortStream}
                aria-label="Stop generating"
                title="Stop generating"
                className="rounded-none border-[3px] border-double border-destructive h-11 w-11 p-0 shrink-0 hover:bg-destructive/20"
              >
                <Square className="w-5 h-5 mx-auto text-destructive" />
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim()}
                aria-label="Send message"
                className="rounded-none border-[3px] border-double border-primary h-11 w-11 p-0 shrink-0"
              >
                <Send className="w-5 h-5 mx-auto" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <SourcesPanel
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        availableMaterials={availableMaterials}
        selectedMaterialIds={selectedMaterialIds}
        onSelectedMaterialIdsChange={onSelectedMaterialIdsChange}
        onUploadFiles={handleUploadFiles}
        isUploadingMaterial={isUploadingMaterial}
        fileInputRef={fileInputRef}
        selectedVaultPaths={selectedVaultPaths}
        onSelectedVaultPathsChange={setSelectedVaultPaths}
        northStarSummary={northStarSummary}
        isStreaming={isStreaming}
      />
    </div>
  );
}
