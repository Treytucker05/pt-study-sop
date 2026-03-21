import { useEffect, useRef, useState } from "react";

import { CoreWorkspaceFrame } from "@/components/CoreWorkspaceFrame";
import { PageScaffold } from "@/components/PageScaffold";

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
      <PageScaffold
        eyebrow="Evidence Ledger"
        title="Brain"
        subtitle="Review stored WRAP sessions, derived evidence rollups, integration status, and annotation-only analysis without exposing launch, planning, or live-study controls."
        className="min-h-[calc(100vh-140px)]"
        contentClassName="gap-6"
        stats={[
          { label: "View", value: "READ ONLY", tone: "info" },
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
            label: "Sessions",
            value: String(workspace.metrics?.totalSessions ?? "--"),
            tone: "default",
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
  );
}
