import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Brain() {
  const [graphMode, setGraphMode] = useState<"vault" | "mindmap">("vault");
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

  const pendingDrafts = ankiDrafts.filter(d => d.status === "pending");

  return (
    <Layout>
      <div className="space-y-6 min-w-0 overflow-hidden">
        <div className="space-y-6 min-w-0 overflow-hidden">
          <BrainChat />

          <div className="space-y-6">
            {/* System Status */}
            <Card className="bg-black/40 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/50 p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary inline-block"></div>
                  SYSTEM_STATUS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 font-terminal text-xs">
                  <div className="flex flex-wrap items-center gap-4">
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
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <span>Cards: <span className="text-white">{metrics?.totalCards || 0}</span></span>
                    <span>Drafts: <span className="text-white">{pendingDrafts.length}</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="ingestion" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-5 rounded-none bg-black/40 border-2 border-primary p-0 h-auto">
              <TabsTrigger value="ingestion" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r last:border-r-0 border-primary/30">
                INGESTION
              </TabsTrigger>
              <TabsTrigger value="data" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r last:border-r-0 border-primary/30">
                DATA
              </TabsTrigger>
              <TabsTrigger value="integrations" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r last:border-r-0 border-primary/30">
                INTEGRATIONS
              </TabsTrigger>
              <TabsTrigger value="syllabus" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground border-r last:border-r-0 border-primary/30">
                MODULES / LOS
              </TabsTrigger>
              <TabsTrigger value="graph" className="font-arcade text-xs py-3 rounded-none data-[state=active]:bg-primary data-[state=active]:text-black data-[state=inactive]:text-muted-foreground">
                GRAPH
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ingestion" className="border border-t-0 border-secondary/40 rounded-none">
              <IngestionTab />
            </TabsContent>

            <TabsContent value="data" className="border border-t-0 border-secondary/40 rounded-none">
              <DataTablesSection />
              <SessionEvidence />
            </TabsContent>

            <TabsContent value="integrations" className="border border-t-0 border-secondary/40 rounded-none mt-6">
              <div className="space-y-6 p-6 min-w-0">
                <ObsidianVaultBrowser />
                <AnkiIntegration totalCards={metrics?.totalCards || 0} />
              </div>
            </TabsContent>

            <TabsContent value="syllabus" className="border border-t-0 border-secondary/40 rounded-none">
              <SyllabusViewTab />
            </TabsContent>

            <TabsContent value="graph" className="border border-t-0 border-secondary/40 rounded-none overflow-hidden">
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
              <div className="h-[calc(100vh-200px)] flex flex-col min-w-0 overflow-hidden">
                {graphMode === "vault" ? <VaultGraphView /> : <MindMapView />}
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </Layout>
  );
}
