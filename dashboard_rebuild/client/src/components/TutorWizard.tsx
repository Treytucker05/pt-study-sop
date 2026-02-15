import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  TutorMode,
  TutorSessionSummary,
  TutorTemplateChain,
  TutorContentSources,
} from "@/lib/api";
import {
  TEXT_PANEL_TITLE,
  TEXT_SECTION_LABEL,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_BADGE,
  INPUT_BASE,
  SELECT_BASE,
  BTN_PRIMARY,
  ICON_SM,
  ICON_MD,
  SECTION_GAP,
} from "@/lib/theme";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MaterialSelector } from "@/components/MaterialSelector";
import { TutorChainBuilder } from "@/components/TutorChainBuilder";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Link2,
  Zap,
  Check,
  Loader2,
  Clock,
  MessageSquare,
  Play,
  Cpu,
  Globe,
  Wand2,
} from "lucide-react";

// ─── Constants ───

const PRIMARY_MODES: { value: TutorMode; label: string; desc: string }[] = [
  { value: "Core", label: "LEARN", desc: "Prime + encode" },
  { value: "Sprint", label: "REVIEW", desc: "Retrieve + refine" },
  { value: "Quick Sprint", label: "QUICK", desc: "Quick retrieval" },
  { value: "Light", label: "LIGHT", desc: "Low energy" },
  { value: "Drill", label: "FIX", desc: "Target weak spots" },
];

const OPENROUTER_MODELS: { value: string; label: string }[] = [
  { value: "arcee-ai/trinity-large-preview:free", label: "Trinity Large (free)" },
  { value: "qwen/qwen3-coder-next", label: "Qwen3 Coder Next" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

type ChainMode = "template" | "custom" | "auto";

// ─── Props ───

interface TutorWizardProps {
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
  topic: string;
  setTopic: (topic: string) => void;
  chainId: number | undefined;
  setChainId: (id: number | undefined) => void;
  customBlockIds: number[];
  setCustomBlockIds: (ids: number[]) => void;
  mode: TutorMode;
  setMode: (mode: TutorMode) => void;
  model: string;
  setModel: (model: string) => void;
  webSearch: boolean;
  setWebSearch: (enabled: boolean) => void;
  onStartSession: () => void;
  isStarting: boolean;
  recentSessions: TutorSessionSummary[];
  onResumeSession: (id: string) => void;
}

// ─── Component ───

export function TutorWizard({
  courseId,
  setCourseId,
  selectedMaterials,
  setSelectedMaterials,
  topic,
  setTopic,
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
  mode,
  setMode,
  model,
  setModel,
  webSearch,
  setWebSearch,
  onStartSession,
  isStarting,
  recentSessions,
  onResumeSession,
}: TutorWizardProps) {
  const wizardProgressKey = "tutor.wizard.progress.v1";
  const [step, setStep] = useState(0);
  const [chainMode, setChainMode] = useState<ChainMode>("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(wizardProgressKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (typeof parsed?.step === "number") {
        const nextStep = Math.max(0, Math.min(2, parsed.step));
        setStep(nextStep);
      }
      if (parsed?.chainMode === "template" || parsed?.chainMode === "custom" || parsed?.chainMode === "auto") {
        setChainMode(parsed.chainMode);
      }
    } catch (error) {
      void error;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(wizardProgressKey, JSON.stringify({ step, chainMode }));
    } catch (error) {
      void error;
    }
  }, [step, chainMode]);

  // Fetch content sources (courses, openrouter status)
  const { data: sources } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
  });

  // Fetch template chains
  const { data: templateChains = [] } = useQuery<TutorTemplateChain[]>({
    queryKey: ["tutor-chains-templates"],
    queryFn: () => api.tutor.getTemplateChains(),
  });

  const courses = sources?.courses ?? [];
  const openrouterEnabled = sources?.openrouter_enabled ?? false;

  // Currently selected chain name
  const selectedChainName = useMemo(() => {
    if (chainMode === "auto") return "Auto (system picks)";
    if (chainMode === "custom") return `Custom (${customBlockIds.length} blocks)`;
    const chain = templateChains.find((c) => c.id === chainId);
    return chain?.name ?? "None selected";
  }, [chainMode, chainId, customBlockIds.length, templateChains]);

  // Step labels
  const steps = [
    { label: "COURSE", icon: BookOpen },
    { label: "CHAIN", icon: Link2 },
    { label: "START", icon: Zap },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── Step Progress Bar ─── */}
      <div className="shrink-0 flex items-center gap-0 px-4 py-3 bg-black/60 border-b-2 border-primary/30">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    isDone ? "bg-primary" : "bg-primary/20"
                  }`}
                />
              )}
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary"
                    : isDone
                    ? "border-primary/50 bg-primary/5 text-primary/70"
                    : "border-primary/20 text-primary/30"
                } ${i <= step ? "cursor-pointer hover:bg-primary/10" : "cursor-default"}`}
              >
                {isDone ? (
                  <Check className={ICON_SM} />
                ) : (
                  <Icon className={ICON_SM} />
                )}
                <span className="font-arcade text-xs tracking-wider">
                  {i + 1}. {s.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── Step Content ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-4 px-4">
          {step === 0 && (
            <StepCourseAndMaterials
              courses={courses}
              courseId={courseId}
              setCourseId={setCourseId}
              topic={topic}
              setTopic={setTopic}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          )}

          {step === 1 && (
            <StepChain
              chainMode={chainMode}
              setChainMode={setChainMode}
              templateChains={templateChains}
              chainId={chainId}
              setChainId={setChainId}
              customBlockIds={customBlockIds}
              setCustomBlockIds={setCustomBlockIds}
            />
          )}

          {step === 2 && (
            <StepConfirm
              courseId={courseId}
              courses={courses}
              topic={topic}
              selectedMaterials={selectedMaterials}
              selectedChainName={selectedChainName}
              mode={mode}
              setMode={setMode}
              model={model}
              setModel={setModel}
              webSearch={webSearch}
              setWebSearch={setWebSearch}
              openrouterEnabled={openrouterEnabled}
              onStartSession={onStartSession}
              isStarting={isStarting}
            />
          )}
        </div>
      </div>

      {/* ─── Navigation Footer ─── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/60 border-t-2 border-primary/30">
        {/* Left: Back button or recent sessions */}
        <div className="flex items-center gap-2">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              className="rounded-none font-arcade text-xs text-primary gap-1 h-8 px-3"
            >
              <ArrowLeft className={ICON_SM} /> BACK
            </Button>
          ) : recentSessions.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="font-arcade text-xs text-primary/50 shrink-0">RECENT:</span>
              {recentSessions.slice(0, 5).map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => onResumeSession(s.session_id)}
                  className="shrink-0 border border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/10 px-2 py-0.5 font-terminal text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      s.status === "active" ? "bg-green-400" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="truncate max-w-[80px]">{s.topic || s.mode}</span>
                  <span className="text-muted-foreground/50">{s.turn_count}t</span>
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* Right: Next button */}
        {step < 2 && (
          <Button
            onClick={() => setStep(step + 1)}
            className="rounded-none font-arcade text-xs bg-primary/10 hover:bg-primary/20 border-2 border-primary text-primary gap-1 h-8 px-4"
          >
            NEXT <ArrowRight className={ICON_SM} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Course + Materials ───

function StepCourseAndMaterials({
  courses,
  courseId,
  setCourseId,
  topic,
  setTopic,
  selectedMaterials,
  setSelectedMaterials,
}: {
  courses: TutorContentSources["courses"];
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  topic: string;
  setTopic: (topic: string) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
}) {
  return (
    <div className={SECTION_GAP}>
      {/* Course selector */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>COURSE</span>
        </div>
        <div className="p-3">
          <select
            value={courseId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setCourseId(v ? Number(v) : undefined);
            }}
            className={SELECT_BASE}
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id ?? "null"} value={c.id ?? ""}>
                {c.code ? `${c.code} — ` : ""}
                {c.name} ({c.doc_count} docs)
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Topic */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>TOPIC</span>
        </div>
        <div className="p-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Hip joint anatomy, Gait cycle..."
            className={INPUT_BASE}
          />
        </div>
      </Card>

      {/* Materials */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30 flex items-center justify-between">
          <span className={TEXT_SECTION_LABEL}>STUDY MATERIALS</span>
          {selectedMaterials.length > 0 && (
            <Badge variant="outline" className={`${TEXT_BADGE} text-primary border-primary/50`}>
              {selectedMaterials.length} selected
            </Badge>
          )}
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-3">
            <MaterialSelector
              courseId={courseId}
              selectedMaterials={selectedMaterials}
              setSelectedMaterials={setSelectedMaterials}
            />
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// ─── Step 2: Chain Selection ───

function StepChain({
  chainMode,
  setChainMode,
  templateChains,
  chainId,
  setChainId,
  customBlockIds,
  setCustomBlockIds,
}: {
  chainMode: ChainMode;
  setChainMode: (mode: ChainMode) => void;
  templateChains: TutorTemplateChain[];
  chainId: number | undefined;
  setChainId: (id: number | undefined) => void;
  customBlockIds: number[];
  setCustomBlockIds: (ids: number[]) => void;
}) {
  return (
    <div className={SECTION_GAP}>
      {/* Mode cards */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            {
              key: "template" as const,
              label: "PRE-BUILT",
              desc: "Pick a chain template",
              icon: Link2,
            },
            {
              key: "custom" as const,
              label: "CUSTOM",
              desc: "Build your own chain",
              icon: Cpu,
            },
            {
              key: "auto" as const,
              label: "AUTO",
              desc: "System picks for you",
              icon: Wand2,
            },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const isActive = chainMode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => {
                setChainMode(opt.key);
                if (opt.key === "auto") {
                  setChainId(undefined);
                  setCustomBlockIds([]);
                }
                if (opt.key === "template") {
                  setCustomBlockIds([]);
                }
                if (opt.key === "custom") {
                  setChainId(undefined);
                }
              }}
              className={`p-3 border-2 text-left transition-colors ${
                isActive
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-primary/20 bg-black/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <Icon className={`${ICON_MD} mb-1.5`} />
              <div className="font-arcade text-xs tracking-wider">{opt.label}</div>
              <div className="font-terminal text-sm mt-0.5 opacity-70">{opt.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Template chain selector */}
      {chainMode === "template" && (
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <div className="px-3 py-2 border-b border-primary/30">
            <span className={TEXT_SECTION_LABEL}>TEMPLATE CHAINS</span>
          </div>
          <ScrollArea className="max-h-[350px]">
            <div className="p-2 space-y-1">
              {templateChains.map((chain) => {
                const isSelected = chainId === chain.id;
                const totalMin = chain.blocks.reduce((s, b) => s + (b.duration || 0), 0);
                return (
                  <button
                    key={chain.id}
                    onClick={() => setChainId(isSelected ? undefined : chain.id)}
                    className={`w-full text-left px-3 py-2 border-2 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-terminal text-base text-foreground">
                        {chain.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`${TEXT_BADGE} text-muted-foreground`}
                        >
                          {chain.blocks.length} blocks
                        </Badge>
                        <span className={`flex items-center gap-0.5 ${TEXT_MUTED}`}>
                          <Clock className={ICON_SM} />
                          ~{totalMin}m
                        </span>
                      </div>
                    </div>
                    <div className={`${TEXT_MUTED} mt-0.5 text-sm`}>{chain.description}</div>
                    {isSelected && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {chain.blocks.map((b, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs rounded-none text-primary/80 border-primary/30"
                          >
                            {b.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Custom chain builder */}
      {chainMode === "custom" && (
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <div className="px-3 py-2 border-b border-primary/30">
            <span className={TEXT_SECTION_LABEL}>BUILD YOUR CHAIN</span>
          </div>
          <div className="p-2">
            <TutorChainBuilder
              selectedBlockIds={customBlockIds}
              setSelectedBlockIds={setCustomBlockIds}
            />
          </div>
        </Card>
      )}

      {/* Auto mode message */}
      {chainMode === "auto" && (
        <Card className="bg-black/40 border-2 border-primary/40 rounded-none">
          <div className="p-4 flex items-start gap-3">
            <Wand2 className="w-5 h-5 text-primary/70 mt-0.5 shrink-0" />
            <div>
              <div className={TEXT_BODY}>No chain selected</div>
              <div className={`${TEXT_MUTED} mt-1`}>
                The tutor will use its default PEIRRO flow based on your mode and topic.
                You can always switch to a specific chain later.
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Step 3: Confirm + Start ───

function StepConfirm({
  courseId,
  courses,
  topic,
  selectedMaterials,
  selectedChainName,
  mode,
  setMode,
  model,
  setModel,
  webSearch,
  setWebSearch,
  openrouterEnabled,
  onStartSession,
  isStarting,
}: {
  courseId: number | undefined;
  courses: TutorContentSources["courses"];
  topic: string;
  selectedMaterials: number[];
  selectedChainName: string;
  mode: TutorMode;
  setMode: (mode: TutorMode) => void;
  model: string;
  setModel: (model: string) => void;
  webSearch: boolean;
  setWebSearch: (enabled: boolean) => void;
  openrouterEnabled: boolean;
  onStartSession: () => void;
  isStarting: boolean;
}) {
  const courseName = useMemo(() => {
    if (!courseId) return "All courses";
    const c = courses.find((c) => c.id === courseId);
    return c ? (c.code ? `${c.code} — ${c.name}` : c.name) : "Unknown";
  }, [courseId, courses]);

  return (
    <div className={SECTION_GAP}>
      {/* Summary */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>SESSION SUMMARY</span>
        </div>
        <div className="p-3 space-y-2">
          <SummaryRow label="COURSE" value={courseName} />
          <SummaryRow label="TOPIC" value={topic || "(not set)"} muted={!topic} />
          <SummaryRow
            label="MATERIALS"
            value={
              selectedMaterials.length > 0
                ? `${selectedMaterials.length} file${selectedMaterials.length === 1 ? "" : "s"}`
                : "None selected"
            }
            muted={selectedMaterials.length === 0}
          />
          <SummaryRow label="CHAIN" value={selectedChainName} />
        </div>
      </Card>

      {/* Mode selector */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>STUDY MODE</span>
        </div>
        <div className="p-3 grid grid-cols-5 gap-1.5">
          {PRIMARY_MODES.map((m) => {
            const isActive = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`p-2 border-2 text-center transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-primary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <div className="font-arcade text-xs">{m.label}</div>
                <div className="font-terminal text-xs mt-0.5 opacity-60">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Model + Web Search */}
      <Card className="bg-black/40 border-2 border-primary/40 rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>ENGINE</span>
        </div>
        <div className="p-3 space-y-3">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={SELECT_BASE}
          >
            <option value="codex">Codex (default)</option>
            {openrouterEnabled &&
              OPENROUTER_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={webSearch}
              onChange={(e) => setWebSearch(e.target.checked)}
              className="accent-primary"
            />
            <span className={TEXT_BODY}>
              <Globe className="inline w-4 h-4 mr-1 opacity-60" />
              Enable web search
            </span>
          </label>
        </div>
      </Card>

      {/* Start button */}
      <Button
        onClick={onStartSession}
        disabled={isStarting}
        className={`${BTN_PRIMARY} h-12 text-base gap-2`}
      >
        {isStarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> STARTING...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" /> START SESSION
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Helpers ───

function SummaryRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-primary/10 last:border-0">
      <span className="font-arcade text-xs text-primary/60">{label}</span>
      <span className={`font-terminal text-base ${muted ? "text-muted-foreground/50" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
