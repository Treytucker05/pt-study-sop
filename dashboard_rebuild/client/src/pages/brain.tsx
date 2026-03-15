import { useEffect, useRef, useState } from "react";

import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";
import Layout from "@/components/layout";
import { MainContent } from "@/components/brain/MainContent";
import { useBrainWorkspace } from "@/components/brain/useBrainWorkspace";

export default function Brain() {
  const workspace = useBrainWorkspace();
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Layout>
      <PageScaffold
        eyebrow="System Command Core"
        title="Brain"
        subtitle="Run the primary operating surface for focus, course routing, profile state, and downstream study-system handoff without breaking the central command deck feel."
        className="min-h-[calc(100vh-140px)]"
        contentClassName="gap-6"
        stats={[
          { label: "Mode", value: String(workspace.mainMode).toUpperCase() },
          {
            label: "Obsidian",
            value: workspace.obsidianStatus?.connected ? "Connected" : "Offline",
            tone: workspace.obsidianStatus?.connected ? "success" : "warn",
          },
          {
            label: "Anki",
            value: workspace.ankiStatus?.connected ? "Connected" : "Offline",
            tone: workspace.ankiStatus?.connected ? "success" : "warn",
          },
          {
            label: "Drafts",
            value: String(workspace.pendingDrafts.length),
            tone: workspace.pendingDrafts.length > 0 ? "info" : "default",
          },
        ]}
      >
        <CoreWorkspaceFrame
          ready={ready}
          className="relative z-30"
          mainClassName="bg-black/25"
          contentClassName="min-h-0 bg-black/25"
        >
          <MainContent workspace={workspace} />
        </CoreWorkspaceFrame>
      </PageScaffold>
    </Layout>
  );
}
