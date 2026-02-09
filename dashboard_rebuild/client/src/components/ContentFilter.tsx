import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { TutorContentSources, TutorMode, TutorTemplateChain } from "@/lib/api";
import type { Course } from "@shared/schema";
import {
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  SELECT_BASE,
  BTN_PRIMARY,
  PANEL_PADDING,
  SECTION_GAP,
  ICON_SM,
  ICON_MD,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  FileText,
  Globe,
  Loader2,
  Zap,
  Link,
  Cpu,
  Cloud,
} from "lucide-react";
import { MaterialUploader } from "@/components/MaterialUploader";
import { MaterialSelector } from "@/components/MaterialSelector";

interface ContentFilterProps {
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
  mode: TutorMode;
  setMode: (mode: TutorMode) => void;
  chainId: number | undefined;
  setChainId: (id: number | undefined) => void;
  topic: string;
  setTopic: (topic: string) => void;
  model: string;
  setModel: (model: string) => void;
  webSearch: boolean;
  setWebSearch: (enabled: boolean) => void;
  onStartSession: () => void;
  isStarting: boolean;
  hasActiveSession: boolean;
}

const OPENROUTER_MODELS: { value: string; label: string }[] = [
  { value: "arcee-ai/trinity-large-preview:free", label: "Trinity Large (free)" },
  { value: "qwen/qwen3-coder-next", label: "Qwen3 Coder Next" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

const PRIMARY_MODES: { value: TutorMode; label: string; desc: string }[] = [
  { value: "Core", label: "LEARN", desc: "Prime + encode" },
  { value: "Sprint", label: "REVIEW", desc: "Retrieve + refine" },
  { value: "Quick Sprint", label: "QUICK", desc: "Quick retrieval" },
  { value: "Light", label: "LIGHT", desc: "Low energy" },
  { value: "Drill", label: "FIX", desc: "Target weak spots" },
];

const LEGACY_MODES: TutorMode[] = ["Teaching Sprint", "Diagnostic Sprint"];

const MODE_TO_RECOMMENDED_CHAIN: Partial<Record<TutorMode, string>> = {
  Core: "First Exposure (Core)",
  Sprint: "Review Sprint",
  "Quick Sprint": "Quick Drill",
  Light: "Low Energy",
  Drill: "Mastery Review",
  "Teaching Sprint": "First Exposure (Core)",
  "Diagnostic Sprint": "Review Sprint",
};

const LS_AUTOPICK_CHAIN_KEY = "tutor.autopick_chain.v1";
const LS_LAST_OPENROUTER_MODEL_KEY = "tutor.last_openrouter_model.v1";
const LS_LAST_CODEX_MODEL_KEY = "tutor.last_codex_model.v1";

function _lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function _lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function _lsGetBool(key: string, fallback: boolean): boolean {
  const raw = _lsGet(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`${TEXT_SECTION_LABEL} flex items-center gap-1.5 pb-1 border-b border-primary/20 mb-2`}>
      {icon}
      {children}
    </div>
  );
}

export function ContentFilter({
  courseId,
  setCourseId,
  selectedMaterials,
  setSelectedMaterials,
  mode,
  setMode,
  chainId,
  setChainId,
  topic,
  setTopic,
  model,
  setModel,
  webSearch,
  setWebSearch,
  onStartSession,
  isStarting,
  hasActiveSession,
}: ContentFilterProps) {
  const {
    data: sources,
    isLoading: sourcesLoading,
    isError: sourcesError,
  } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
  });

  const {
    data: templateChains = [],
    isLoading: chainsLoading,
    isError: templateChainsError,
  } = useQuery<TutorTemplateChain[]>({
    queryKey: ["tutor-template-chains"],
    queryFn: () => api.tutor.getTemplateChains(),
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
  });

  const openrouterEnabled = sources?.openrouter_enabled ?? false;

  const provider: "codex" | "openrouter" = model.includes("/") ? "openrouter" : "codex";

  useEffect(() => {
    if (!openrouterEnabled && provider === "openrouter") {
      // Prevent an OpenRouter model from being selected when the key is missing.
      setModel("codex");
    }
  }, [openrouterEnabled, provider, setModel]);

  // Persist last-used model per provider for quick switching.
  useEffect(() => {
    if (!model) return;
    if (model.includes("/")) _lsSet(LS_LAST_OPENROUTER_MODEL_KEY, model);
    else _lsSet(LS_LAST_CODEX_MODEL_KEY, model);
  }, [model]);

  const [autoPickChain, setAutoPickChain] = useState<boolean>(() =>
    _lsGetBool(LS_AUTOPICK_CHAIN_KEY, true)
  );
  const [lastAutoPickMode, setLastAutoPickMode] = useState<TutorMode | null>(null);

  useEffect(() => {
    _lsSet(LS_AUTOPICK_CHAIN_KEY, String(autoPickChain));
  }, [autoPickChain]);

  const recommendedChainName = MODE_TO_RECOMMENDED_CHAIN[mode];
  const recommendedChain = useMemo(() => {
    if (!recommendedChainName) return undefined;
    return templateChains.find((c) => c.name === recommendedChainName);
  }, [templateChains, recommendedChainName]);

  // Auto-pick recommended chain once we know the template list (only when Freeform).
  useEffect(() => {
    if (!autoPickChain) return;
    if (chainId !== undefined) return;
    if (!recommendedChain) return;
    if (lastAutoPickMode === mode) return;
    setChainId(recommendedChain.id);
    setLastAutoPickMode(mode);
  }, [autoPickChain, chainId, recommendedChain?.id, lastAutoPickMode, mode, setChainId]);

  const applyMode = (next: TutorMode) => {
    setMode(next);
    if (!autoPickChain) return;
    if (chainId !== undefined) return;
    const nextName = MODE_TO_RECOMMENDED_CHAIN[next];
    if (!nextName) return;
    const nextChain = templateChains.find((c) => c.name === nextName);
    if (nextChain) {
      setChainId(nextChain.id);
      setLastAutoPickMode(next);
    }
  };

  const toCodex = () => {
    const last = _lsGet(LS_LAST_CODEX_MODEL_KEY);
    const next = last && !last.includes("/") ? last : "codex";
    setModel(next);
  };

  const toOpenrouter = () => {
    if (!openrouterEnabled) return;
    const last = _lsGet(LS_LAST_OPENROUTER_MODEL_KEY);
    const next = last && last.includes("/") ? last : OPENROUTER_MODELS[0].value;
    setModel(next);
  };

  // Keep OpenRouter models constrained to the curated list.
  useEffect(() => {
    if (provider !== "openrouter") return;
    if (OPENROUTER_MODELS.some((m) => m.value === model)) return;
    setModel(OPENROUTER_MODELS[0].value);
  }, [provider, model, setModel]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <div className={`shrink-0 ${PANEL_PADDING} pb-2 border-b-2 border-primary/30`}>
        <div className={TEXT_PANEL_TITLE}>CONTENT FILTER</div>
        {(sourcesError || templateChainsError) && (
          <div className={`${TEXT_MUTED} text-red-400`}>
            Tutor API unavailable. Start the dashboard via <span className="font-arcade">Start_Dashboard.bat</span>.
          </div>
        )}
        <div className={`flex items-center gap-2 mt-1 ${TEXT_MUTED}`}>
          <Database className={ICON_SM} />
          {sources?.total_materials ?? 0} materials
          <span className="text-muted-foreground/40">|</span>
          {sources?.total_instructions ?? 0} SOP
        </div>
      </div>

      {/* Scrollable body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className={`${PANEL_PADDING} ${SECTION_GAP}`}>
          {/* Mode selector */}
          <div>
            <SectionLabel>Mode</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {PRIMARY_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => applyMode(m.value)}
                  className={`text-left px-2 py-1.5 border-2 transition-colors ${
                    mode === m.value
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted-foreground/30 text-foreground/80 hover:border-muted-foreground/50 hover:text-foreground hover:bg-black/30"
                  }`}
                >
                  <div className="font-arcade text-sm leading-tight truncate">
                    {m.label}
                  </div>
                  <div className={`${TEXT_MUTED} text-sm leading-tight truncate`}>
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>

            <div className={`${TEXT_MUTED} text-sm mt-2`}>
              Auto-picks a chain template. Override below.
            </div>

            {LEGACY_MODES.includes(mode) && (
              <div className={`${TEXT_MUTED} text-sm mt-1`}>Legacy mode active: {mode}</div>
            )}
          </div>

          {/* Chain selector */}
          <div>
            <SectionLabel icon={<Link className={ICON_SM} />}>
              Chain
            </SectionLabel>

            {/* Recommended chain row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className={`${TEXT_MUTED} text-sm min-w-0`}>
                <span className="opacity-70">Recommended:</span>{" "}
                {recommendedChain ? (
                  <>
                    <span className="text-foreground truncate">{recommendedChain.name}</span>
                    <Badge variant="outline" className={`ml-1.5 ${TEXT_BADGE} h-4 px-1`}>
                      {recommendedChain.blocks.length}
                    </Badge>
                  </>
                ) : chainsLoading ? (
                  <Skeleton className="inline-block w-20 h-4 bg-primary/10" />
                ) : (
                  <span className="opacity-70">—</span>
                )}
              </div>

              {recommendedChain && chainId !== recommendedChain.id && (
                <Button
                  size="sm"
                  onClick={() => setChainId(recommendedChain.id)}
                  className="rounded-none h-7 px-3 font-arcade text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  APPLY
                </Button>
              )}
            </div>

            <label className={`flex items-center gap-2 ${TEXT_BODY} text-muted-foreground mb-2 cursor-pointer`}>
              <Checkbox
                checked={autoPickChain}
                onCheckedChange={(v) => setAutoPickChain(v === true)}
                className="w-3 h-3"
              />
              <span className="select-none text-sm">Auto-pick recommended chain</span>
            </label>

            {/* Scrollable chain list with max-height */}
            <ScrollArea className="h-48 border border-primary/20">
              <div className="space-y-0.5 p-1">
                <button
                  onClick={() => {
                    setChainId(undefined);
                    setLastAutoPickMode(mode);
                  }}
                  className={`w-full text-left px-2 py-1 ${TEXT_BODY} text-sm border-l-2 transition-colors ${
                    !chainId
                      ? "border-primary text-primary bg-primary/10"
                      : "border-transparent text-foreground/80 hover:text-foreground hover:border-muted-foreground/40 hover:bg-black/30"
                  }`}
                >
                  Freeform
                </button>
                {chainsLoading ? (
                  <div className="space-y-1 p-2">
                    <Skeleton className="w-full h-5 bg-primary/10" />
                    <Skeleton className="w-full h-5 bg-primary/10" />
                    <Skeleton className="w-full h-5 bg-primary/10" />
                    <Skeleton className="w-full h-5 bg-primary/10" />
                  </div>
                ) : (
                  templateChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => setChainId(chain.id)}
                      className={`w-full text-left px-2 py-1 ${TEXT_BODY} text-sm border-l-2 transition-colors ${
                        chainId === chain.id
                          ? "border-primary text-primary bg-primary/10"
                          : "border-transparent text-foreground/80 hover:text-foreground hover:border-muted-foreground/40 hover:bg-black/30"
                      }`}
                    >
                      <span className="truncate">{chain.name}</span>
                      <Badge variant="outline" className={`ml-1.5 ${TEXT_BADGE} h-4 px-1`}>
                        {chain.blocks.length}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Topic */}
          <div>
            <SectionLabel>Topic</SectionLabel>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Hip Flexors"
              className={INPUT_BASE}
            />
          </div>

          {/* Model selector */}
          <div>
            <SectionLabel>Model</SectionLabel>

            <div className="grid grid-cols-2 gap-1 mb-1">
              <button
                onClick={toCodex}
                className={`text-left px-2 py-1 border-2 transition-colors ${
                  provider === "codex"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-muted-foreground/30 text-foreground/80 hover:border-muted-foreground/50 hover:text-foreground hover:bg-black/30"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Cpu className={ICON_SM} />
                  <div className="font-arcade text-xs leading-tight">CODEX</div>
                </div>
                <div className={`${TEXT_MUTED} leading-tight`}>ChatGPT login</div>
              </button>

              <button
                onClick={toOpenrouter}
                disabled={!openrouterEnabled}
                className={`text-left px-2 py-1 border-2 transition-colors ${
                  provider === "openrouter"
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-muted-foreground/30 text-foreground/80 hover:border-muted-foreground/50 hover:text-foreground hover:bg-black/30"
                } ${!openrouterEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <Cloud className={ICON_SM} />
                  <div className="font-arcade text-xs leading-tight">OPENROUTER</div>
                </div>
                <div className={`${TEXT_MUTED} leading-tight`}>
                  {openrouterEnabled ? "API key enabled" : "API key missing"}
                </div>
              </button>
            </div>

            {provider === "openrouter" ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={SELECT_BASE}
              >
                {OPENROUTER_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model === "codex" ? "" : model}
                onChange={(e) => setModel(e.target.value.trim() ? e.target.value : "codex")}
                placeholder="Codex model override (optional)"
                className={INPUT_BASE}
              />
            )}
          </div>

          {/* Web search toggle - always visible to prevent layout shift */}
          <label className={`flex items-center gap-2 cursor-pointer ${provider !== "codex" ? "opacity-50" : ""}`}>
            <Checkbox
              checked={webSearch}
              onCheckedChange={(v) => provider === "codex" && setWebSearch(!!v)}
              disabled={provider !== "codex"}
            />
            <Globe className={ICON_SM} />
            <span className={`${TEXT_BODY} text-sm`}>Web search</span>
            {provider !== "codex" && (
              <span className="text-xs text-muted-foreground">(Codex only)</span>
            )}
          </label>

          {/* Course selector */}
          <div>
            <SectionLabel>Course</SectionLabel>
            {coursesLoading ? (
              <Skeleton className="w-full h-10 bg-primary/10" />
            ) : (
              <select
                value={courseId ?? ""}
                onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : undefined)}
                className={SELECT_BASE}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Materials selector */}
          <div>
            <SectionLabel icon={<FileText className={ICON_SM} />}>
              Materials
            </SectionLabel>
            <MaterialSelector
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>

          {/* Quick upload */}
          <div className="border-t border-primary/10 pt-2">
            <SectionLabel>Upload</SectionLabel>
            <MaterialUploader courseId={courseId} />
          </div>
        </div>
      </ScrollArea>

      {/* Fixed footer — Start button */}
      <div className={`shrink-0 ${PANEL_PADDING} pt-2 border-t-2 border-primary/30`}>
        <Button
          onClick={onStartSession}
          disabled={isStarting || hasActiveSession}
          className={`w-full rounded-none border-2 font-arcade text-sm h-10 ${
            hasActiveSession
              ? "border-green-500/50 bg-green-500/10 text-green-400 cursor-default"
              : isStarting
              ? "border-primary/50 bg-primary/10 text-primary cursor-wait"
              : "border-primary bg-primary/10 hover:bg-primary/20"
          }`}
        >
          {isStarting ? (
            <Loader2 className={`${ICON_MD} animate-spin mr-1.5`} />
          ) : hasActiveSession ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              SESSION ACTIVE
            </span>
          ) : (
            <Zap className={`${ICON_MD} mr-1.5`} />
          )}
          {!isStarting && !hasActiveSession && "START SESSION"}
        </Button>
      </div>
    </div>
  );
}
