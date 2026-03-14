import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, CATEGORY_COLORS } from "@/lib/api";
import type {
  MethodCategory,
  TutorConfigCheck,
  TutorContentSources,
  TutorObjectiveScope,
  TutorSessionSummary,
  TutorTemplateChain,
} from "@/lib/api";
import {
  BTN_PRIMARY,
  ICON_MD,
  ICON_SM,
  INPUT_BASE,
  SECTION_GAP,
  SELECT_BASE,
  TEXT_BADGE,
  TEXT_BODY,
  TEXT_MUTED,
  TEXT_SECTION_LABEL,
} from "@/lib/theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MaterialSelector } from "@/components/MaterialSelector";
import { TutorChainBuilder } from "@/components/TutorChainBuilder";
import { toast } from "sonner";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Link2,
  Loader2,
  MessageSquare,
  Play,
  Wand2,
  X,
} from "lucide-react";

type ChainMode = "template" | "custom" | "auto";

interface TutorStartPanelProps {
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
  vaultFolder: string;
  setVaultFolder: (folder: string) => void;
  onStartSession: () => void;
  isStarting: boolean;
  recentSessions: TutorSessionSummary[];
  onResumeSession: (id: string) => void;
  onDeleteSession?: (id: string) => Promise<void>;
  configStatus?: TutorConfigCheck;
}

export function TutorStartPanel({
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
  vaultFolder,
  setVaultFolder,
  onStartSession,
  isStarting,
  recentSessions,
  onResumeSession,
  onDeleteSession,
  configStatus,
}: TutorStartPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(() =>
    !courseId && selectedMaterials.length === 0,
  );
  const [chainMode, setChainMode] = useState<ChainMode>(() => {
    if (customBlockIds.length > 0) return "custom";
    if (typeof chainId === "number") return "template";
    return "auto";
  });

  const { data: sources } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
  });
  const { data: templateChains = [] } = useQuery<TutorTemplateChain[]>({
    queryKey: ["tutor-chains-templates"],
    queryFn: () => api.tutor.getTemplateChains(),
  });

  const courses = sources?.courses ?? [];
  const courseName = useMemo(() => {
    if (!courseId) return "All courses";
    const match = courses.find((course) => course.id === courseId);
    if (!match) return "Unknown course";
    return match.code ? `${match.code} — ${match.name}` : match.name;
  }, [courseId, courses]);
  const selectedChainName = useMemo(() => {
    if (chainMode === "auto") return "Auto";
    if (chainMode === "custom") {
      return customBlockIds.length > 0
        ? `Custom (${customBlockIds.length} blocks)`
        : "Custom";
    }
    const match = templateChains.find((chain) => chain.id === chainId);
    return match?.name ?? "Template";
  }, [chainId, chainMode, customBlockIds.length, templateChains]);
  const highlightedSession = useMemo(() => {
    if (recentSessions.length === 0) return null;
    return recentSessions.find((session) => session.status === "active") ?? recentSessions[0];
  }, [recentSessions]);
  const secondarySessions = useMemo(() => {
    if (!highlightedSession) return [];
    return recentSessions
      .filter((session) => session.session_id !== highlightedSession.session_id)
      .slice(0, 4);
  }, [highlightedSession, recentSessions]);
  const hasExplicitLaunchScope = Boolean(courseId) || selectedMaterials.length > 0;
  const readinessItems = [
    {
      label: "Launch scope",
      detail: courseId
        ? courseName
        : selectedMaterials.length > 0
          ? `Material-scoped launch (${selectedMaterials.length} selected)`
          : "No explicit course or materials",
      ready: hasExplicitLaunchScope,
      fallback: "Select a course or launch from Brain/Library with materials.",
    },
    {
      label: "Materials",
      detail:
        selectedMaterials.length > 0
          ? `${selectedMaterials.length} selected`
          : "No explicit scope",
      ready: selectedMaterials.length > 0,
      fallback: "Tutor can still start, but course-scoped materials are recommended.",
    },
    {
      label: "Tutor config",
      detail: configStatus?.ok ? "Ready" : "Unchecked",
      ready: configStatus?.ok !== false,
      fallback: "Runtime config check did not report a hard blocker.",
    },
  ];

  const formatSessionTime = (value: string | undefined) => {
    if (!value) return "Time unavailable";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Time unavailable";
    return parsed.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={`${SECTION_GAP} w-full max-w-full min-w-0`}>
      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30 flex items-center justify-between">
          <span className={TEXT_SECTION_LABEL}>LAUNCH SUMMARY</span>
          <Badge
            variant="outline"
            className={`${TEXT_BADGE} border-primary/50 text-primary`}
          >
            TUTOR START
          </Badge>
        </div>
        <div className="p-3 space-y-2">
          <SummaryRow label="COURSE" value={courseName} />
          <SummaryRow label="TOPIC" value={topic || "(not set)"} muted={!topic} />
          <SummaryRow
            label="MATERIALS"
            value={
              selectedMaterials.length > 0
                ? `${selectedMaterials.length} selected`
                : "No explicit scope"
            }
            muted={selectedMaterials.length === 0}
          />
          <SummaryRow
            label="PRIME SCOPE"
            value={
              objectiveScope === "single_focus"
                ? "Single objective first"
                : "Whole module first"
            }
          />
          <SummaryRow label="CHAIN" value={selectedChainName} />
        </div>
      </Card>

      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>RECENT SESSIONS</span>
        </div>
        <div className="p-3 space-y-2">
          {highlightedSession ? (
            <div className="space-y-2">
              <div className="border-2 border-primary/30 bg-primary/10 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-arcade text-xs text-primary">
                    {highlightedSession.status === "active" ? "ACTIVE SESSION READY" : "LAST SESSION"}
                  </div>
                  <Badge
                    variant="outline"
                    className={`${TEXT_BADGE} border-primary/40 text-primary`}
                  >
                    {highlightedSession.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="font-terminal text-base text-foreground break-words">
                  {highlightedSession.topic || highlightedSession.mode || "Session"}
                </div>
                <div className={`${TEXT_MUTED} text-xs flex flex-wrap gap-x-3 gap-y-1`}>
                  <span>{highlightedSession.turn_count} turns</span>
                  <span>{formatSessionTime(highlightedSession.started_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onResumeSession(highlightedSession.session_id)}
                    className={`${BTN_PRIMARY} h-10 px-4 gap-2`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {highlightedSession.status === "active"
                      ? "RESUME ACTIVE SESSION"
                      : "RESUME LAST SESSION"}
                  </Button>
                  {onDeleteSession ? (
                    <Button
                      variant="outline"
                      onClick={() => onDeleteSession(highlightedSession.session_id)}
                      className="h-10 rounded-none font-arcade text-xs"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      DELETE
                    </Button>
                  ) : null}
                </div>
              </div>

              {secondarySessions.length > 0 ? (
                <div className="space-y-2">
                  <div className="font-arcade text-[10px] tracking-wide text-primary/70">
                    OTHER RECENT SESSIONS
                  </div>
                  {secondarySessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="flex items-center justify-between gap-2 border-2 border-primary/20 px-2 py-2"
                    >
                      <div className="min-w-0">
                        <div className="font-terminal text-sm text-foreground truncate">
                          {session.topic || session.mode || "Session"}
                        </div>
                        <div className={`${TEXT_MUTED} text-xs flex flex-wrap gap-x-3 gap-y-1`}>
                          <span>{session.turn_count} turns</span>
                          <span>{formatSessionTime(session.started_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={`${TEXT_BADGE} border-primary/30 text-primary/80`}
                        >
                          {session.status.toUpperCase()}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => onResumeSession(session.session_id)}
                          className="h-8 rounded-none font-arcade text-[10px]"
                        >
                          RESUME
                        </Button>
                        {onDeleteSession ? (
                          <button
                            onClick={() => onDeleteSession(session.session_id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete session"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={TEXT_MUTED}>No recent sessions to resume.</div>
          )}
        </div>
      </Card>

      <Card className="bg-black/40 border-2 border-primary rounded-none">
        <div className="px-3 py-2 border-b border-primary/30">
          <span className={TEXT_SECTION_LABEL}>READINESS</span>
        </div>
        <div className="p-3 space-y-3">
          {readinessItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 border border-primary/20 p-2"
            >
              {item.ready ? (
                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-yellow-300 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-arcade text-xs text-primary/80">
                  {item.label}
                </div>
                <div className="font-terminal text-sm text-foreground">
                  {item.detail}
                </div>
                {!item.ready ? (
                  <div className={`${TEXT_MUTED} text-xs mt-1`}>
                    {item.fallback}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

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
                <Play className="w-4 h-4" /> START NEW SESSION
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="bg-black/40 border-2 border-primary rounded-none overflow-hidden">
        <button
          onClick={() => setShowAdvanced((value) => !value)}
          className="w-full px-3 py-2 border-b border-primary/30 flex items-center justify-between text-left"
        >
          <span className={TEXT_SECTION_LABEL}>ADJUST LAUNCH OPTIONS</span>
          {showAdvanced ? (
            <ChevronDown className={ICON_SM} />
          ) : (
            <ChevronRight className={ICON_SM} />
          )}
        </button>
        {showAdvanced ? (
          <div className="p-3 space-y-4">
            <Card className="bg-black/30 border-2 border-primary rounded-none">
              <div className="px-3 py-2 border-b border-primary/30">
                <span className={TEXT_SECTION_LABEL}>COURSE</span>
              </div>
              <div className="p-3">
                <select
                  value={courseId ?? ""}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setCourseId(nextValue ? Number(nextValue) : undefined);
                    toast.success("Launch course updated");
                  }}
                  className={`${SELECT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
                >
                  <option value="">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id ?? "null"} value={course.id ?? ""}>
                      {course.code ? `${course.code} — ` : ""}
                      {course.name} ({course.doc_count} docs)
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card className="bg-black/30 border-2 border-primary rounded-none">
              <div className="px-3 py-2 border-b border-primary/30">
                <span className={TEXT_SECTION_LABEL}>TOPIC</span>
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Optional topic or study focus"
                  className={`${INPUT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
                />
              </div>
            </Card>

            <Card className="bg-black/30 border-2 border-primary rounded-none">
              <div className="px-3 py-2 border-b border-primary/30">
                <span className={TEXT_SECTION_LABEL}>PRIME SCOPE</span>
              </div>
              <div className="p-3">
                <select
                  value={objectiveScope}
                  onChange={(event) =>
                    setObjectiveScope(
                      event.target.value === "single_focus"
                        ? "single_focus"
                        : "module_all",
                    )
                  }
                  className={`${SELECT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
                >
                  <option value="module_all">Whole module first</option>
                  <option value="single_focus">Single objective first</option>
                </select>
              </div>
            </Card>

            <Card className="bg-black/30 border-2 border-primary rounded-none overflow-hidden">
              <div className="px-3 py-2 border-b border-primary/30 flex items-center justify-between">
                <span className={TEXT_SECTION_LABEL}>STUDY MATERIALS</span>
                {selectedMaterials.length > 0 ? (
                  <Badge
                    variant="outline"
                    className={`${TEXT_BADGE} border-primary/50 text-primary`}
                  >
                    {selectedMaterials.length} selected
                  </Badge>
                ) : null}
              </div>
              <ScrollArea className="h-[320px] w-full">
                <div className="p-3">
                  <MaterialSelector
                    courseId={courseId}
                    selectedMaterials={selectedMaterials}
                    setSelectedMaterials={setSelectedMaterials}
                  />
                </div>
              </ScrollArea>
            </Card>

            <Card className="bg-black/30 border-2 border-primary rounded-none">
              <div className="px-3 py-2 border-b border-primary/30">
                <span className={TEXT_SECTION_LABEL}>CHAIN</span>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        key: "template" as const,
                        label: "PRE-BUILT",
                        icon: Link2,
                      },
                      {
                        key: "custom" as const,
                        label: "CUSTOM",
                        icon: Cpu,
                      },
                      {
                        key: "auto" as const,
                        label: "AUTO",
                        icon: Wand2,
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const isActive = chainMode === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => {
                          setChainMode(option.key);
                          if (option.key === "auto") {
                            setChainId(undefined);
                            setCustomBlockIds([]);
                          }
                          if (option.key === "template") {
                            setCustomBlockIds([]);
                          }
                          if (option.key === "custom") {
                            setChainId(undefined);
                          }
                        }}
                        className={`p-3 border-2 text-left transition-colors ${
                          isActive
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-primary/20 bg-black/40 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`${ICON_MD} mb-1.5`} />
                        <div className="font-arcade text-xs tracking-wider">
                          {option.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {chainMode === "template" ? (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {templateChains.map((chain) => {
                      const isSelected = chainId === chain.id;
                      const blockCounts: Record<string, number> = {};
                      for (const block of chain.blocks) {
                        const stage =
                          block.control_stage || block.category || "ENCODE";
                        blockCounts[stage] = (blockCounts[stage] || 0) + 1;
                      }
                      return (
                        <button
                          key={chain.id}
                          onClick={() =>
                            setChainId(isSelected ? undefined : chain.id)
                          }
                          className={`w-full text-left px-3 py-2 border-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-transparent hover:border-primary/30 hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-terminal text-sm text-foreground">
                              {chain.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`${TEXT_BADGE} text-muted-foreground`}
                            >
                              {chain.blocks.length} blocks
                            </Badge>
                          </div>
                          <div className={`${TEXT_MUTED} text-xs mt-1`}>
                            {chain.description}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(blockCounts).map(([stage, count]) => (
                              <span
                                key={stage}
                                className="text-xs font-terminal px-1 border"
                                style={{
                                  color:
                                    CATEGORY_COLORS[stage as MethodCategory] ||
                                    "#888",
                                  borderColor: `${
                                    CATEGORY_COLORS[stage as MethodCategory] ||
                                    "#888"
                                  }40`,
                                }}
                              >
                                {count} {stage}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {chainMode === "custom" ? (
                  <TutorChainBuilder
                    selectedBlockIds={customBlockIds}
                    setSelectedBlockIds={setCustomBlockIds}
                  />
                ) : null}

                {chainMode === "auto" ? (
                  <div className={`${TEXT_MUTED} text-xs border border-primary/20 p-2`}>
                    Auto launch lets Tutor choose the session structure without a
                    fixed block chain.
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="bg-black/30 border-2 border-primary rounded-none">
              <div className="px-3 py-2 border-b border-primary/30">
                <span className={TEXT_SECTION_LABEL}>OBSIDIAN SAVE FOLDER</span>
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={vaultFolder}
                  onChange={(event) => setVaultFolder(event.target.value)}
                  placeholder="Leave blank for auto-generated path"
                  className={`${INPUT_BASE} bg-black/40 border-2 border-primary font-terminal shadow-none`}
                />
                <div className={`${TEXT_MUTED} text-xs mt-2`}>
                  Persisted for convenience only. It is no longer treated as
                  launch authority.
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

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
      <span
        className={`font-terminal text-base ${
          muted ? "text-muted-foreground/50" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
