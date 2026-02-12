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
import { useState, useEffect, useCallback, useRef } from "react";
import { FolderOpen, Pencil } from "lucide-react";

type MobileTab = "vault" | "main";

const VALID_MOBILE_TABS: MobileTab[] = ["vault", "main"];

function getMobileTabFromUrl(): MobileTab {
  if (typeof window === "undefined") return "main";
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return VALID_MOBILE_TABS.includes(tab as MobileTab) ? (tab as MobileTab) : "main";
}

function updateUrlWithMobileTab(tab: MobileTab) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("tab", tab);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

export default function Brain() {
  const workspace = useBrainWorkspace();
  const [mobileTab, setMobileTabState] = useState<MobileTab>("main");
  const [ready, setReady] = useState(false);
  const mounted = useRef(false);

  // Initialize from URL on mount
  useEffect(() => {
    setMobileTabState(getMobileTabFromUrl());
  }, []);

  // Staggered reveal: add --ready after paint (respects prefers-reduced-motion in CSS)
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  // Update URL when tab changes
  const setMobileTab = useCallback((tab: MobileTab) => {
    setMobileTabState(tab);
    updateUrlWithMobileTab(tab);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setMobileTabState(getMobileTabFromUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
        className={`brain-workspace fixed inset-x-0 top-[68px] bottom-[48px] flex flex-col min-w-0 overflow-hidden z-30 ${ready ? "brain-workspace--ready" : ""} ${workspace.isFullscreen ? "brain-fullscreen" : ""}`}
        data-active-tab={workspace.mainMode}
      >
        {/* Desktop: conditional sidebar (expanded vs collapsed rail) */}
        <div className="hidden lg:flex flex-1 min-h-0">
          {workspace.isFullscreen ? (
            <div className="flex flex-1 min-h-0 h-full">
              <div className="brain-workspace__main-wrap brain-workspace__canvas flex-1 min-h-0 h-full overflow-hidden flex">
                <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                  <MainContent workspace={workspace} />
                </div>
                {workspace.mainMode === "canvas" && (
                  <ChatSidePanel
                    expanded={workspace.chatExpanded}
                    onToggle={workspace.toggleChat}
                  />
                )}
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
                  {workspace.mainMode === "canvas" && (
                    <ChatSidePanel
                      expanded={workspace.chatExpanded}
                      onToggle={workspace.toggleChat}
                    />
                  )}
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
                {workspace.mainMode === "canvas" && (
                  <ChatSidePanel
                    expanded={workspace.chatExpanded}
                    onToggle={workspace.toggleChat}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile: single column with bottom tabs */}
        <div className="flex flex-col flex-1 min-h-0 lg:hidden">
          <div className="brain-workspace__canvas flex-1 min-h-0 overflow-auto">
            {mobileTab === "vault" && <VaultSidebar workspace={workspace} />}
            {mobileTab === "main" && <MainContent workspace={workspace} />}
          </div>

          <nav
            className="flex items-center border-t-2 border-primary/50 bg-black/80 shrink-0"
            aria-label="Mobile navigation"
          >
            <button
              onClick={() => setMobileTab("vault")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-terminal transition-colors ${
                mobileTab === "vault" ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={mobileTab === "vault" ? "page" : undefined}
              aria-label="Vault"
            >
              <FolderOpen className="w-5 h-5" aria-hidden="true" />
              Vault
            </button>
            <button
              onClick={() => setMobileTab("main")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-terminal transition-colors ${
                mobileTab === "main" ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={mobileTab === "main" ? "page" : undefined}
              aria-label="Content"
            >
              <Pencil className="w-5 h-5" aria-hidden="true" />
              Content
            </button>
          </nav>
        </div>

        {/* Modals */}
        <BrainModals workspace={workspace} />
      </div>
    </Layout>
  );
}
