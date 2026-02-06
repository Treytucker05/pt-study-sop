import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IngestionTab } from "@/components/IngestionTab";
import { DataTablesSection } from "@/components/DataTablesSection";
import { SyllabusViewTab } from "@/components/SyllabusViewTab";
import { BrainChat } from "@/components/BrainChat";
import { VaultGraphView } from "@/components/VaultGraphView";
import { MindMapView } from "@/components/MindMapView";
import { ObsidianVaultBrowser } from "@/components/ObsidianVaultBrowser";
import { AnkiIntegration } from "@/components/AnkiIntegration";
import { SessionEvidence } from "@/components/SessionEvidence";
import { NextActions } from "@/components/NextActions";
import { TopicNoteBuilder } from "@/components/TopicNoteBuilder";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react";

const FLOW_STEPS = [
  { id: "study", label: "Study (Tutor)", tab: null, section: null },
  { id: "wrap", label: "Lite Wrap Ledger", tab: null, section: null },
  { id: "generate", label: "Generate JSON", tab: "today", section: "section-ingestion" },
  { id: "attach", label: "Attach JSON", tab: "today", section: "section-ingestion" },
  { id: "planner", label: "Planner Queue", tab: "this_week", section: "section-planner" },
  { id: "actions", label: "Next Actions", tab: "today", section: "section-actions" },
] as const;

export default function Brain() {
  const [graphMode, setGraphMode] = useState<"vault" | "mindmap">("vault");
  const [activeTab, setActiveTab] = useState("today");

  const { data: obsidianStatus } = useQuery({
    queryKey: ["obsidian", "status"],
    queryFn: api.obsidian.getStatus,
    refetchInterval: 30000,
  });

  const { data: ankiStatus } = useQuery({
    queryKey: ["anki", "status"],
    queryFn: api.anki.getStatus,
    refetchInterval: 30000,
  });

  const { data: ankiDrafts = [] } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
  });

  const { data: metrics } = useQuery({
    queryKey: ["brain", "metrics"],
    queryFn: api.brain.getMetrics,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: plannerQueue = [] } = useQuery({
    queryKey: ["planner-queue"],
    queryFn: api.planner.getQueue,
  });

  const pendingDrafts = ankiDrafts.filter(d => d.status === "pending");

  // Deterministic done logic for each flow step (local date, not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hasRecentSession = sessions.some(
    (s: { session_date?: string }) => s.session_date === today
  );
  const hasPlannerTasks = plannerQueue.length > 0;
  const hasJsonAttached = sessions.some(
    (s: { session_date?: string; understanding_level?: number | null }) =>
      s.session_date === today && s.understanding_level != null
  );

  const stepDone: Record<string, boolean> = {
    study: hasRecentSession,
    wrap: hasRecentSession, // wrap is prerequisite to having a session logged
    generate: hasJsonAttached,
    attach: hasJsonAttached,
    planner: hasPlannerTasks,
    actions: hasPlannerTasks,
  };

  const navigateToStep = useCallback((step: typeof FLOW_STEPS[number]) => {
    if (!step.tab) return;
    setActiveTab(step.tab);
    if (step.section) {
      // Scroll after tab switch renders
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(step.section!);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            el.classList.add("ring-2", "ring-primary/50");
            setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 1500);
          }
        });
      });
    }
  }, []);

  return (
    <Layout>
      <div className="space-y-4 min-w-0 overflow-hidden">
        {/* Flow Status */}
        <Card className="bg-black/40 border-2 border-primary/50 rounded-none">
          <CardHeader className="p-3 border-b border-primary/30">
            <CardTitle className="font-arcade text-[10px] text-primary">
              STUDY FLOW
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {FLOW_STEPS.map((step, i) => {
                const done = stepDone[step.id] ?? false;
                return (
                  <div key={step.id} className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => navigateToStep(step)}
                      className={`flex items-center gap-1 px-2 py-1 text-[9px] font-terminal border rounded-none transition-colors ${
                        done
                          ? "border-green-500/50 text-green-400 bg-green-500/10"
                          : "border-secondary/30 text-muted-foreground hover:text-white hover:border-secondary"
                      } ${step.tab ? "cursor-pointer" : "cursor-default"}`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                      {step.label}
                    </button>
                    {i < FLOW_STEPS.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <BrainChat />

        {/* System Status — compact */}
        <div className="flex flex-wrap items-center gap-4 font-terminal text-xs px-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${obsidianStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-muted-foreground">Obsidian</span>
            <span className="text-white">{obsidianStatus?.connected ? "Online" : "Offline"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${ankiStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-muted-foreground">Anki</span>
            <span className="text-white">{ankiStatus?.connected ? "Connected" : "Offline"}</span>
          </div>
          <span className="text-muted-foreground">Cards: <span className="text-white">{metrics?.totalCards || 0}</span></span>
          <span className="text-muted-foreground">Drafts: <span className="text-white">{pendingDrafts.length}</span></span>
          {metrics?.averages && (
            <>
              <span className="text-muted-foreground">Avg Understanding: <span className="text-white">{metrics.averages.understanding}</span></span>
              <span className="text-muted-foreground">Avg Retention: <span className="text-white">{metrics.averages.retention}</span></span>
            </>
          )}
        </div>

        {/* Main Tabs: TODAY / THIS WEEK / TOOLS / DATA */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-4 rounded-none bg-black/40 border-2 border-primary p-0 h-auto">
            <TabsTrigger value="today" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r border-primary/30">
              TODAY
            </TabsTrigger>
            <TabsTrigger value="this_week" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r border-primary/30">
              THIS WEEK
            </TabsTrigger>
            <TabsTrigger value="tools" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r border-primary/30">
              TOOLS
            </TabsTrigger>
            <TabsTrigger value="data" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground">
              DATA
            </TabsTrigger>
          </TabsList>

          {/* ─── TODAY TAB ─── */}
          <TabsContent value="today" className="space-y-6">
            {/* Empty state */}
            {!hasRecentSession && (
              <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
                <CardContent className="p-6 text-center">
                  <p className="font-arcade text-xs text-primary mb-2">NO SESSIONS TODAY</p>
                  <p className="font-terminal text-xs text-muted-foreground">
                    Start a study session with the Tutor → complete a Lite Wrap → come back here to generate and attach JSON.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Attach JSON to Session */}
            <div id="section-ingestion" className="transition-all duration-300">
              <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
                <CardHeader className="p-3 border-b border-secondary/30">
                  <CardTitle className="font-arcade text-xs">ATTACH JSON TO SESSION</CardTitle>
                  <p className="font-terminal text-[10px] text-muted-foreground mt-1">
                    Paste your Tracker or Enhanced JSON from Brain ingestion prompt. Auto-detects format.
                  </p>
                </CardHeader>
                <CardContent className="p-4">
                  <IngestionTab />
                </CardContent>
              </Card>
            </div>

            {/* Next Actions (today only) */}
            <div id="section-actions" className="transition-all duration-300">
              <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
                <CardHeader className="p-3 border-b border-secondary/30">
                  <CardTitle className="font-arcade text-xs">TODAY'S ACTIONS</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {hasPlannerTasks ? (
                    <NextActions filter="today" />
                  ) : (
                    <div className="text-center py-4">
                      <p className="font-terminal text-xs text-muted-foreground">
                        No planner tasks yet. Attach session JSON with weak_anchors to auto-generate review tasks.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Session Evidence */}
            <SessionEvidence />
          </TabsContent>

          {/* ─── THIS WEEK TAB ─── */}
          <TabsContent value="this_week" className="space-y-6">
            {/* Planner — full view */}
            <div id="section-planner" className="transition-all duration-300">
              <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
                <CardHeader className="p-3 border-b border-secondary/30">
                  <CardTitle className="font-arcade text-xs">PLANNER QUEUE</CardTitle>
                  <p className="font-terminal text-[10px] text-muted-foreground mt-1">
                    Full planner queue with upcoming tasks. Use settings to adjust spacing strategy.
                  </p>
                </CardHeader>
                <CardContent className="p-4">
                  <NextActions filter="all" />
                </CardContent>
              </Card>
            </div>

            {/* Stale Topics Alert */}
            {metrics?.staleTopics && metrics.staleTopics.length > 0 && (
              <Card className="bg-black/40 border-2 border-destructive/50 rounded-none">
                <CardHeader className="p-3 border-b border-destructive/30">
                  <CardTitle className="font-arcade text-xs text-destructive">STALE TOPICS (14+ DAYS)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {metrics.staleTopics.map((t, i) => (
                      <div key={i} className="flex justify-between font-terminal text-xs">
                        <span>{t.topic}</span>
                        <Badge variant="outline" className="rounded-none text-[9px] border-destructive/50 text-destructive">
                          {t.daysSince}d ago
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── TOOLS TAB ─── */}
          <TabsContent value="tools" className="space-y-6">
            {/* Six-Phase Topic Note Builder */}
            <TopicNoteBuilder />

            {/* Integrations */}
            <div className="space-y-6 min-w-0">
              <ObsidianVaultBrowser />
              <AnkiIntegration totalCards={metrics?.totalCards || 0} />
            </div>

            {/* Modules / LOs */}
            <SyllabusViewTab />

            {/* Graph */}
            <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
              <CardHeader className="p-0">
                <div className="flex items-center gap-0 border-b border-secondary/40">
                  <button
                    onClick={() => setGraphMode("vault")}
                    className={`px-4 py-2 font-arcade text-xs transition-colors ${graphMode === "vault" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    VAULT GRAPH
                  </button>
                  <button
                    onClick={() => setGraphMode("mindmap")}
                    className={`px-4 py-2 font-arcade text-xs transition-colors ${graphMode === "mindmap" ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    MIND MAP
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[calc(100vh-200px)] flex flex-col min-w-0 overflow-hidden">
                  {graphMode === "vault" ? <VaultGraphView /> : <MindMapView />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── DATA TAB ─── */}
          <TabsContent value="data" className="space-y-6">
            {/* Data Tables */}
            <Card className="bg-black/40 border-2 border-secondary/50 rounded-none">
              <CardHeader className="p-3 border-b border-secondary/30">
                <CardTitle className="font-arcade text-xs">SESSION DATA</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTablesSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
