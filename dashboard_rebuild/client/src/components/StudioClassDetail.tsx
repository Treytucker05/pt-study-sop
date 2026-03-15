import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Material, AppLearningObjective, CardDraft, MethodChain } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, ListChecks, CreditCard, FolderOpen,
  Link, BarChart3, PenTool, Zap, Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_TOOLBAR } from "@/lib/theme";

type TabId = "materials" | "objectives" | "cards" | "vault" | "chains" | "stats";

type StudioClassDetailProps = {
  courseId: number;
  onLaunchSession: () => void;
  onDrillToWorkspace: () => void;
};

const TABS = [
  { id: "materials", label: "MATERIALS", icon: FileText },
  { id: "objectives", label: "OBJECTIVES", icon: ListChecks },
  { id: "cards", label: "CARDS & TESTS", icon: CreditCard },
  { id: "vault", label: "VAULT", icon: FolderOpen },
  { id: "chains", label: "CHAINS", icon: Link },
  { id: "stats", label: "STATS", icon: BarChart3 },
] as const;

function getFileName(path: string | null | undefined): string {
  if (!path) return "Untitled";
  return path.replace(/\\/g, "/").split("/").pop() || "Untitled";
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="font-terminal text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

const ROW = "border border-primary/15 bg-black/30 px-3 py-2";
const BADGE = "rounded-none text-[10px] border-primary/30 shrink-0";

export function StudioClassDetail({
  courseId, onLaunchSession, onDrillToWorkspace,
}: StudioClassDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("materials");

  const { data: contentSources } = useQuery({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    staleTime: 60 * 1000,
  });
  const { data: materials } = useQuery({
    queryKey: ["tutor-chat-materials-all-enabled"],
    queryFn: () => api.tutor.getMaterials({ enabled: true }),
    staleTime: 60 * 1000,
  });
  const { data: objectives } = useQuery({
    queryKey: ["learning-objectives", courseId],
    queryFn: () => api.learningObjectives.getByCourse(courseId),
  });
  const { data: drafts } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: () => api.anki.getDrafts(),
  });
  const { data: chains } = useQuery({
    queryKey: ["chains"],
    queryFn: () => api.chains.getAll(),
  });
  const { data: projectShell } = useQuery({
    queryKey: ["tutor-project-shell", courseId],
    queryFn: () => api.tutor.getProjectShell({ course_id: courseId }),
    staleTime: 30 * 1000,
  });

  const course = contentSources?.courses.find((c) => c.id === courseId);
  const courseName = course?.name ?? projectShell?.course.name ?? "Course";
  const courseCode = course?.code ?? projectShell?.course.code ?? "";
  const courseMaterials = materials?.filter((m: Material) => m.course_id === courseId) ?? [];
  const courseDrafts = drafts?.filter(
    (d: CardDraft) => d.deckName?.toLowerCase().includes(courseName.toLowerCase()),
  ) ?? [];

  function getMaterialIcon(fileType: string | null | undefined) {
    const ft = (fileType ?? "").toLowerCase();
    if (ft === "pdf") return { Icon: FileText, color: "text-red-400" };
    if (ft === "pptx" || ft === "ppt") return { Icon: Presentation, color: "text-orange-400" };
    if (ft === "doc" || ft === "docx") return { Icon: FileText, color: "text-blue-400" };
    if (ft === "url" || ft === "link") return { Icon: Link, color: "text-cyan-400" };
    return { Icon: FileText, color: "text-primary/50" };
  }

  function renderMaterials() {
    if (courseMaterials.length === 0) return <EmptyState text="No materials linked to this course." />;
    return (
      <div className="space-y-1.5">
        {courseMaterials.map((m: Material) => {
          const { Icon: MatIcon, color } = getMaterialIcon(m.file_type);
          return (
            <div key={m.id} className={ROW}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MatIcon className={cn("h-4 w-4 shrink-0", color)} />
                  <div className="font-arcade text-[10px] text-primary truncate">
                    {m.title || getFileName(m.source_path)}
                  </div>
                </div>
                <span className="font-terminal text-[11px] text-muted-foreground shrink-0">
                  {m.file_type?.toUpperCase() || "FILE"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderObjectives() {
    if (!objectives || objectives.length === 0) return <EmptyState text="No objectives for this course yet." />;
    const grouped = new Map<string, AppLearningObjective[]>();
    for (const lo of objectives) {
      const group = lo.groupName ?? "Ungrouped";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(lo);
    }
    return (
      <div className="space-y-3">
        {[...grouped.entries()].map(([group, los]) => (
          <div key={group}>
            <div className="font-arcade text-[9px] text-primary/60 mb-1">{group}</div>
            <div className="space-y-1">
              {los.map((lo) => (
                <div key={lo.id} className={ROW + " flex items-center justify-between gap-2"}>
                  <div className="min-w-0">
                    <div className="font-arcade text-[10px] text-primary truncate">
                      {lo.loCode ? `${lo.loCode} \u2014 ` : ""}{lo.title}
                    </div>
                  </div>
                  <Badge variant="outline" className={BADGE}>
                    {lo.status?.toUpperCase().replace("_", " ") || "NOT STARTED"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderCards() {
    if (courseDrafts.length === 0) return <EmptyState text="No card drafts for this course." />;
    return (
      <div className="space-y-1.5">
        {courseDrafts.map((d: CardDraft) => (
          <div key={d.id} className={ROW}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-arcade text-[10px] text-primary truncate">
                  {d.front.slice(0, 60)}
                </div>
                <div className="font-terminal text-[11px] text-muted-foreground">
                  {d.cardType?.toUpperCase() || "BASIC"}
                </div>
              </div>
              <Badge variant="outline" className={BADGE}>
                {d.status?.toUpperCase() || "DRAFT"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderVault() {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="h-8 w-8 text-primary/30 mb-3" />
        <div className="font-arcade text-[10px] text-primary/50">VAULT INTEGRATION</div>
        <div className="font-terminal text-sm text-muted-foreground mt-1">Coming soon</div>
      </div>
    );
  }

  function renderChains() {
    if (!chains || chains.length === 0) return <EmptyState text="No method chains available." />;
    return (
      <div className="space-y-1.5">
        {chains.map((c: MethodChain) => (
          <div key={c.id} className={ROW}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-arcade text-[10px] text-primary truncate">{c.name}</div>
              <div className="font-terminal text-[11px] text-muted-foreground shrink-0">
                {c.block_ids?.length ?? 0} blocks
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderStats() {
    const counts = projectShell?.counts;
    const stats = [
      { label: "SESSIONS", value: counts?.session_count ?? 0 },
      { label: "ACTIVE", value: counts?.active_sessions ?? 0 },
      { label: "STUDIO ITEMS", value: counts?.studio_total_items ?? 0 },
      { label: "CAPTURED", value: counts?.studio_captured_items ?? 0 },
      { label: "PROMOTED", value: counts?.studio_promoted_items ?? 0 },
      { label: "SCHEDULE", value: counts?.pending_schedule_events ?? 0 },
    ];
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border border-primary/20 bg-black/35 px-3 py-3">
            <div className="font-arcade text-[10px] text-primary/70">{s.label}</div>
            <div className="mt-1 font-terminal text-lg text-white">{s.value}</div>
          </div>
        ))}
      </div>
    );
  }

  const TAB_RENDERERS: Record<TabId, () => ReactNode> = {
    materials: renderMaterials,
    objectives: renderObjectives,
    cards: renderCards,
    vault: renderVault,
    chains: renderChains,
    stats: renderStats,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-primary/20 bg-black/40">
        <div>
          <div className="font-arcade text-xl text-primary tracking-wide">
            {courseCode ? `${courseCode} — ${courseName}` : courseName}
          </div>
          <div className="font-terminal text-sm text-muted-foreground mt-1">
            {courseMaterials.length} materials · {courseDrafts.length} cards
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onDrillToWorkspace} variant="ghost" className={BTN_TOOLBAR}>
            <PenTool className="mr-1 h-3 w-3" /> WORKSPACE
          </Button>
          <Button
            onClick={onLaunchSession}
            className="rounded-none border-2 border-primary bg-primary/20 hover:bg-primary/30 font-arcade text-sm h-12 px-8 text-primary transition-colors"
          >
            <Zap className="mr-1 h-4 w-4" /> LAUNCH SESSION
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-primary/20 bg-black/30 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 font-arcade text-[11px] transition-colors border-b-2",
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-primary/70"
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <ScrollArea className="flex-1 px-4 py-3">
        {TAB_RENDERERS[activeTab]()}
      </ScrollArea>
    </div>
  );
}
