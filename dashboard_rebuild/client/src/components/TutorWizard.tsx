import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, CATEGORY_COLORS } from "@/lib/api";
import type {
  TutorMode,
  TutorObjectiveScope,
  TutorSessionSummary,
  TutorTemplateChain,
  TutorContentSources,
  MethodCategory,
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
import { toast } from "sonner";
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
  Globe,
  Wand2,
  Cpu,
} from "lucide-react";

// ─── Constants ───

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
  objectiveScope: TutorObjectiveScope;
  setObjectiveScope: (scope: TutorObjectiveScope) => void;
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
  objectiveScope,
  setObjectiveScope,
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

  // Fetch content sources (courses)
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
                  className={`w-8 h-0.5 mx-1 ${isDone ? "bg-primary" : "bg-primary/20"
                    }`}
                />
              )}
              <button
                onClick={() => i <= step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-2 transition-colors ${isActive
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
        <div className="w-full py-4 px-4">
          {step === 0 && (
            <StepCourseAndMaterials
              courses={courses}
              courseId={courseId}
              setCourseId={setCourseId}
              topic={topic}
              setTopic={setTopic}
              objectiveScope={objectiveScope}
              setObjectiveScope={setObjectiveScope}
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
              objectiveScope={objectiveScope}
              selectedMaterials={selectedMaterials}
              selectedChainName={selectedChainName}
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
                  className="shrink-0 border-2 border-primary/20 hover:border-primary/50 hover:bg-black/40 px-2 py-0.5 font-arcade text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 shadow-none"
                >
                  {(() => {
                    const displayMode = s.mode || "Core";
                    const displayTopic = s.topic || displayMode || "Tutor Session";
                    return (
                      <>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${s.status === "active" ? "bg-green-400" : "bg-muted-foreground/40"
                            }`}
                        />
                        <span className="truncate max-w-[80px]">{displayTopic}</span>
                        <span className="text-muted-foreground/50">{s.turn_count}t</span>
                      </>
                    );
                  })()}
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
  objectiveScope,
  setObjectiveScope,
  selectedMaterials,
  setSelectedMaterials,
}: {
  courses: TutorContentSources["courses"];
  courseId: number | undefined;
  setCourseId: (id: number | undefined) => void;
  topic: string;
  setTopic: (topic: string) => void;
  objectiveScope: TutorObjectiveScope;
  setObjectiveScope: (scope: TutorObjectiveScope) => void;
  selectedMaterials: number[];
  setSelectedMaterials: (ids: number[]) => void;
}) {
  return (
    <div className={`${SECTION_GAP} w-full max-w-full min-w-0`}>
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
              toast.success("Course selection saved");
            }}
            className={`${SELECT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
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
            onChange={(e) => {
              setTopic(e.target.value);
            }}
            onBlur={(e) => {
              if (e.target.value) toast.success("Topic saved");
            }}
            placeholder="e.g., Hip joint anatomy, Gait cycle..."
            className={`${INPUT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
          />
        </div>
      </Card>

      {/* PRIME scope */}
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>PRIME SCOPE</span>
        </div>
        <div className="p-3">
          <select
            value={objectiveScope}
            onChange={(e) => {
              const next = (e.target.value === "single_focus" ? "single_focus" : "module_all") as TutorObjectiveScope;
              setObjectiveScope(next);
              toast.success("PRIME scope saved");
            }}
            className={`${SELECT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
          >
            <option value="module_all">Whole module first (big picture)</option>
            <option value="single_focus">Single objective first (zoom-in)</option>
          </select>
          <div className={`${TEXT_MUTED} mt-2 text-xs`}>
            Module-first shows all active North Star objectives, then you pick one objective to focus.
          </div>
        </div>
      </Card>

      {/* Materials */}
      <Card className="bg-black/40 border-2 border-primary rounded-none overflow-hidden">
        <div className="px-3 py-2 border-b border-primary/30 flex items-center justify-between">
          <span className={TEXT_SECTION_LABEL}>STUDY MATERIALS</span>
          {selectedMaterials.length > 0 && (
            <Badge variant="outline" className={`${TEXT_BADGE} text-primary border-primary/50`}>
              {selectedMaterials.length} selected
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[400px] w-full">
          <div className="p-3 w-full">
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
              className={`p-3 border-2 text-left transition-colors ${isActive
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
          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-2 space-y-1">
              {templateChains.map((chain) => {
                const isSelected = chainId === chain.id;
                const totalMin = chain.blocks.reduce((s, b) => s + (b.duration || 0), 0);
                // Category breakdown for the chain
                const catCounts: Record<string, number> = {};
                for (const b of chain.blocks) {
                  const stage = b.control_stage || b.category || 'ENCODE';
                  catCounts[stage] = (catCounts[stage] || 0) + 1;
                }
                // Parse context_tags for recommendation hints
                const tags = chain.context_tags?.toLowerCase() || "";
                const isIntake = tags.includes("intake") || tags.includes("first_exposure") || tags.includes("new");
                return (
                  <button
                    key={chain.id}
                    onClick={() => setChainId(isSelected ? undefined : chain.id)}
                    className={`w-full text-left px-3 py-2 border-2 transition-colors ${isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-primary/30 hover:bg-primary/5"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-terminal text-base text-foreground">
                          {chain.name}
                        </span>
                        {isIntake && (
                          <Badge variant="outline" className="text-xs rounded-none text-green-400 border-green-400/40">
                            NEW TOPICS
                          </Badge>
                        )}
                      </div>
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
                    {/* Category mini-badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(catCounts).map(([cat, count]) => (
                        <span
                          key={cat}
                          className="text-xs font-terminal px-1 border"
                          style={{ color: CATEGORY_COLORS[cat as MethodCategory] || "#888", borderColor: (CATEGORY_COLORS[cat as MethodCategory] || "#888") + "40" }}
                        >
                          {count} {cat}
                        </span>
                      ))}
                    </div>
                    {/* Expanded block detail when selected */}
                    {isSelected && (
                      <div className="mt-2 space-y-1 border-t border-primary/20 pt-2">
                        {chain.blocks.map((b, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="shrink-0 w-5 h-5 flex items-center justify-center border text-xs mt-0.5"
                              style={{ borderColor: CATEGORY_COLORS[(b.control_stage || b.category) as MethodCategory] || "#888", color: CATEGORY_COLORS[(b.control_stage || b.category) as MethodCategory] || "#888" }}
                            >
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-terminal text-sm text-foreground/80">{b.name}</span>
                                <span className={`${TEXT_MUTED} text-xs`}>~{b.duration}m</span>
                              </div>
                              {b.facilitation_prompt && (
                                <div className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-2">
                                  {b.facilitation_prompt.split('\n').slice(0, 2).join(' ').slice(0, 120)}
                                  {b.facilitation_prompt.length > 120 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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

      {/* Auto mode explainer */}
      {chainMode === "auto" && (
        <Card className="bg-black/40 border-2 border-primary/40 rounded-none">
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-primary/70 mt-0.5 shrink-0" />
              <div>
                <div className={TEXT_BODY}>No structured chain</div>
                <div className={`${TEXT_MUTED} mt-1`}>
                  The tutor follows the general First Pass protocol based on your study mode.
                  No block-by-block guidance — conversation flows naturally.
                </div>
              </div>
            </div>
            <div className="border border-primary/20 p-2 space-y-1">
              <div className="font-arcade text-xs text-primary/80 mb-1">MODE POLICY</div>
              <div className={`${TEXT_MUTED} text-xs`}>
                The system determines pacing and content delivery entirely based on the chain blocks or an automatic strategy.
              </div>
            </div>
            {templateChains.length > 0 && (
              <div className={`${TEXT_MUTED} text-xs`}>
                Want more structure? Switch to <button onClick={() => setChainMode("template")} className="text-primary underline">Pre-Built</button> for guided block-by-block sessions.
              </div>
            )}
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
  objectiveScope,
  selectedMaterials,
  selectedChainName,
  onStartSession,
  isStarting,
}: {
  courseId: number | undefined;
  courses: TutorContentSources["courses"];
  topic: string;
  objectiveScope: TutorObjectiveScope;
  selectedMaterials: number[];
  selectedChainName: string;
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
          <SummaryRow
            label="PRIME SCOPE"
            value={objectiveScope === "module_all" ? "Whole module first" : "Single objective first"}
          />
          <SummaryRow label="CHAIN" value={selectedChainName} />
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
