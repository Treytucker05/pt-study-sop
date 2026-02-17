import Layout from "@/components/layout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useBrainWorkspace } from "@/components/brain/useBrainWorkspace";
import { VaultSidebar } from "@/components/brain/VaultSidebar";
import { SidebarRail } from "@/components/brain/SidebarRail";
import { MainContent } from "@/components/brain/MainContent";
import { ChatSidePanel } from "@/components/brain/ChatSidePanel";
import { BrainModals } from "@/components/brain/BrainModals";
import { useState, useEffect, useRef } from "react";

export default function Brain() {
  const workspace = useBrainWorkspace();
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  // Staggered reveal: add --ready after paint (respects prefers-reduced-motion in CSS)
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // Ctrl+I keyboard shortcut for import modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault();
        workspace.setImportOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [workspace]);

  return (
    <Layout>
      <div
        className={`brain-workspace relative h-full w-full min-h-0 flex flex-col min-w-0 overflow-hidden z-30 ${ready ? "brain-workspace--ready" : ""} ${workspace.isFullscreen ? "brain-fullscreen" : ""}`}
        data-active-tab={workspace.mainMode}
      >
        {/* Desktop layout only: keep container stable and slide panels sideways */}
        <div className="flex-1 min-h-0">
          {workspace.isFullscreen ? (
            <div className="flex flex-1 min-h-0 h-full">
              <div className="brain-workspace__main-wrap brain-workspace__canvas flex-1 min-h-0 h-full overflow-hidden flex">
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <MainContent workspace={workspace} />
                </div>
                <ChatSidePanel
                  expanded={workspace.chatExpanded}
                  onToggle={workspace.toggleChat}
                />
              </div>
            </div>
          ) : workspace.sidebarExpanded ? (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="brain-workspace-v2"
              className="h-full"
            >
              <ResizablePanel defaultSize={20} minSize={12} maxSize={35}>
                <div className="brain-workspace__sidebar-wrap brain-sidebar-expand h-full border-r border-primary/30 bg-black/40">
                  <VaultSidebar workspace={workspace} onCollapse={workspace.toggleSidebar} />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="hover:bg-primary/10 transition-colors data-[resize-handle-active]:bg-primary/20" />

              <ResizablePanel defaultSize={80} minSize={50}>
                <div className="brain-workspace__main-wrap brain-workspace__canvas h-full min-h-0 overflow-hidden flex">
                  <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                    <MainContent workspace={workspace} />
                  </div>
                  <ChatSidePanel
                    expanded={workspace.chatExpanded}
                    onToggle={workspace.toggleChat}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-1 min-h-0 h-full">
              <SidebarRail onExpand={workspace.toggleSidebar} workspace={workspace} />
              <div className="brain-workspace__main-wrap brain-workspace__canvas flex-1 min-h-0 h-full overflow-hidden flex">
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <MainContent workspace={workspace} />
                </div>
                <ChatSidePanel
                  expanded={workspace.chatExpanded}
                  onToggle={workspace.toggleChat}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <BrainModals workspace={workspace} />
      </div>
    </Layout>
  );
}
