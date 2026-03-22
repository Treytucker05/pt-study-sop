import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  FileText,
  FolderOpen,
  Link,
  ListChecks,
  PenTool,
  Presentation,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import type {
  AppLearningObjective,
  Material,
  MethodChain,
  TutorStudioActivityItem,
  TutorStudioItem,
  TutorStudioOverviewCardDraft,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const ROW = "border border-primary/15 bg-black/30 px-3 py-2";
const BADGE = "rounded-none text-ui-2xs border-primary/30 shrink-0";

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="font-terminal text-sm text-muted-foreground">{text}</div>
    </div>
  );
}

function getFileName(path: string | null | undefined): string {
  if (!path) return "Untitled";
  return path.replace(/\\/g, "/").split("/").pop() || "Untitled";
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMaterialIcon(fileType: string | null | undefined) {
  const ft = (fileType ?? "").toLowerCase();
  if (ft === "pdf") return { Icon: FileText, color: "text-red-400" };
  if (ft === "pptx" || ft === "ppt") return { Icon: Presentation, color: "text-orange-400" };
  if (ft === "doc" || ft === "docx") return { Icon: FileText, color: "text-blue-400" };
  if (ft === "url" || ft === "link") return { Icon: Link, color: "text-cyan-400" };
  return { Icon: FileText, color: "text-primary/50" };
}

function renderObjectivesList(objectives: AppLearningObjective[]) {
  const grouped = new Map<string, AppLearningObjective[]>();
  for (const objective of objectives) {
    const group = objective.groupName ?? "Ungrouped";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(objective);
  }

  return (
    <div className="space-y-3">
      {[...grouped.entries()].map(([group, items]) => (
        <div key={group}>
          <div className="mb-1 font-arcade text-ui-3xs text-primary/60">{group}</div>
          <div className="space-y-1">
            {items.map((objective) => (
              <div key={objective.id} className={`${ROW} flex items-center justify-between gap-2`}>
                <div className="min-w-0">
                  <div className="truncate font-arcade text-ui-2xs text-primary">
                    {objective.loCode ? `${objective.loCode} — ` : ""}
                    {objective.title}
                  </div>
                </div>
                <Badge variant="outline" className={BADGE}>
                  {objective.status?.toUpperCase().split("_").join(" ") || "NOT STARTED"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderCardDrafts(drafts: TutorStudioOverviewCardDraft[]) {
  if (drafts.length === 0) {
    return <EmptyState text="No card drafts for this course." />;
  }

  return (
    <div className="space-y-1.5">
      {drafts.map((draft) => (
        <div key={draft.id} className={ROW}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-arcade text-ui-2xs text-primary">
                {draft.front.slice(0, 80)}
              </div>
              <div className="font-terminal text-ui-xs text-muted-foreground">
                {draft.deckName} · {draft.cardType?.toUpperCase() || "BASIC"}
              </div>
            </div>
            <Badge variant="outline" className={BADGE}>
              {draft.status?.toUpperCase() || "DRAFT"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderVaultItems(items: TutorStudioItem[]) {
  if (items.length === 0) {
    return <EmptyState text="No promoted Studio resources for this course yet." />;
  }

  return (
    <div className="space-y-1.5">
      <div className="font-terminal text-xs text-muted-foreground">
        Promoted course resources ready for Publish and Vault handoff.
      </div>
      {items.map((item) => (
        <div key={item.id} className={ROW}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-arcade text-ui-2xs text-primary">
                {item.title?.trim() || `${item.item_type.toUpperCase()} ${item.id}`}
              </div>
              <div className="font-terminal text-ui-xs text-muted-foreground">
                {(item.source_kind || "studio").toUpperCase()} · {formatTimestamp(item.created_at)}
              </div>
            </div>
            <Badge variant="outline" className={BADGE}>
              {item.item_type.toUpperCase()}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderChains(chains: MethodChain[]) {
  if (chains.length === 0) {
    return <EmptyState text="No method chains available." />;
  }

  return (
    <div className="space-y-1.5">
      {chains.map((chain) => (
        <div key={chain.id} className={ROW}>
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-arcade text-ui-2xs text-primary">{chain.name}</div>
            <div className="font-terminal text-ui-xs text-muted-foreground shrink-0">
              {chain.block_ids?.length ?? 0} blocks
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderActivity(items: TutorStudioActivityItem[]) {
  if (items.length === 0) {
    return <EmptyState text="No recent activity for this course yet." />;
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className={ROW}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-arcade text-ui-2xs text-primary">{item.title}</div>
              <div className="font-terminal text-ui-xs text-muted-foreground">
                {[item.subtitle, item.status?.toUpperCase(), formatTimestamp(item.created_at)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <Badge variant="outline" className={BADGE}>
              {item.kind === "session" ? "SESSION" : "STUDIO"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudioClassDetail({
  courseId,
  onLaunchSession,
  onDrillToWorkspace,
}: StudioClassDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>("materials");

  const {
    data: overview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tutor-studio-overview", courseId],
    queryFn: () => api.tutor.getStudioOverview(courseId),
    staleTime: 30 * 1000,
  });
  const { data: chains } = useQuery({
    queryKey: ["chains"],
    queryFn: () => api.chains.getAll(),
    staleTime: 60 * 1000,
  });

  if (isLoading && !overview) {
    return <EmptyState text="Loading class overview..." />;
  }

  if (isError || !overview) {
    return <EmptyState text="Failed to load this class overview." />;
  }

  const courseName = overview.course.name ?? "Course";
  const courseCode = overview.course.code ?? "";
  const courseMaterials = overview.materials ?? [];
  const courseObjectives = overview.objectives ?? [];
  const courseDrafts = overview.card_drafts.items ?? [];
  const vaultResources = overview.vault_resources.items ?? [];
  const cardDraftTotal = overview.card_drafts.counts.total;
  const vaultResourceTotal = overview.vault_resources.counts.total;
  const shellCounts = overview.shell.counts;
  const recentActivity = overview.recent_activity ?? [];

  const materialsContent =
    courseMaterials.length === 0 ? (
      <EmptyState text="No materials linked to this course." />
    ) : (
      <div className="space-y-1.5">
        {courseMaterials.map((material: Material) => {
          const { Icon: MaterialIcon, color } = getMaterialIcon(material.file_type);
          return (
            <div key={material.id} className={ROW}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <MaterialIcon className={cn("h-4 w-4 shrink-0", color)} />
                  <div className="truncate font-arcade text-ui-2xs text-primary">
                    {material.title || getFileName(material.source_path)}
                  </div>
                </div>
                <span className="shrink-0 font-terminal text-ui-xs text-muted-foreground">
                  {material.file_type?.toUpperCase() || "FILE"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );

  const objectivesContent =
    courseObjectives.length === 0 ? (
      <EmptyState text="No objectives for this course yet." />
    ) : (
      renderObjectivesList(courseObjectives)
    );

  const statsContent = (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: "SESSIONS", value: shellCounts.session_count },
          { label: "ACTIVE", value: shellCounts.active_sessions },
          { label: "CARD DRAFTS", value: cardDraftTotal },
          { label: "PROMOTED", value: vaultResourceTotal },
          { label: "CAPTURED", value: shellCounts.studio_captured_items },
          { label: "SCHEDULE", value: shellCounts.pending_schedule_events },
        ].map((stat) => (
          <div key={stat.label} className="border border-primary/20 bg-black/35 px-3 py-3">
            <div className="font-arcade text-ui-2xs text-primary/70">{stat.label}</div>
            <div className="mt-1 font-terminal text-lg text-white">{stat.value}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 font-arcade text-ui-2xs text-primary/70">RECENT ACTIVITY</div>
        {renderActivity(recentActivity)}
      </div>
    </div>
  );

  let activeTabContent;
  switch (activeTab) {
    case "materials":
      activeTabContent = materialsContent;
      break;
    case "objectives":
      activeTabContent = objectivesContent;
      break;
    case "cards":
      activeTabContent = renderCardDrafts(courseDrafts);
      break;
    case "vault":
      activeTabContent = renderVaultItems(vaultResources);
      break;
    case "chains":
      activeTabContent = renderChains(chains ?? []);
      break;
    case "stats":
      activeTabContent = statsContent;
      break;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-primary/20 bg-black/40 px-6 py-5">
        <div>
          <div className="font-arcade text-xl tracking-wide text-primary">
            {courseCode ? `${courseCode} — ${courseName}` : courseName}
          </div>
          <div className="mt-1 font-terminal text-sm text-muted-foreground">
            {courseMaterials.length} materials · {courseDrafts.length} cards
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onDrillToWorkspace} variant="ghost" className={BTN_TOOLBAR}>
            <PenTool className="mr-1 h-3 w-3" /> WORKSPACE
          </Button>
          <Button
            onClick={onLaunchSession}
            className="h-12 rounded-none border-2 border-primary bg-primary/20 px-8 font-arcade text-sm text-primary transition-colors hover:bg-primary/30"
          >
            <Zap className="mr-1 h-4 w-4" /> LAUNCH SESSION
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-primary/20 bg-black/30 px-4 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 font-arcade text-ui-xs transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-primary/70",
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 px-4 py-3">{activeTabContent}</ScrollArea>
    </div>
  );
}
