import Layout from "@/components/layout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useBrainWorkspace } from "@/components/brain/useBrainWorkspace";
import { BrainWorkspaceTopBar } from "@/components/brain/BrainWorkspaceTopBar";
import { VaultSidebar } from "@/components/brain/VaultSidebar";
import { MainContent } from "@/components/brain/MainContent";
import { BrainModals } from "@/components/brain/BrainModals";
import { useState, useEffect, useCallback } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    setMobileTabState(getMobileTabFromUrl());
  }, []);

  // Update URL when tab changes
  const setMobileTab = useCallback((tab: MobileTab) => {
    setMobileTabState(tab);
    updateUrlWithMobileTab(tab);
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setMobileTabState(getMobileTabFromUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <Layout>
      {/* 
        Layout has:
        - Header: h-16 (64px) + border-b-4 (4px) = 68px  
        - Footer: ~32px + we need extra space for mobile tab bar
        
        We use z-30 to appear above the layout footer (z-20)
        bottom-[72px] gives room for footer + mobile tab bar
      */}
      <div className="fixed inset-x-0 top-[68px] bottom-[72px] flex flex-col min-w-0 overflow-hidden z-30">
        <BrainWorkspaceTopBar workspace={workspace} />

        {/* Desktop: 2-column resizable layout */}
        <div className="hidden lg:flex flex-1 min-h-0">
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="brain-workspace-v2"
            className="h-full"
          >
            {/* Left: Vault sidebar */}
            <ResizablePanel defaultSize={20} minSize={12} maxSize={35}>
              <div className="h-full border-r border-primary/30 bg-black/30">
                <VaultSidebar workspace={workspace} />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Main: Editor / Chat / Graph / Table / Anki */}
            <ResizablePanel defaultSize={80} minSize={50}>
              <div className="h-full">
                <MainContent workspace={workspace} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile: single column with bottom tabs */}
        <div className="flex flex-col flex-1 min-h-0 lg:hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            {mobileTab === "vault" && <VaultSidebar workspace={workspace} />}
            {mobileTab === "main" && <MainContent workspace={workspace} />}
          </div>

          {/* Bottom tab bar - now visible above footer */}
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

        {/* DEBUG: Yellow reference lines */}
        <div className="fixed inset-x-0 pointer-events-none z-[100]" style={{ bottom: '0px' }}>
          <div className="w-full h-[2px] bg-yellow-400 relative">
            <span className="absolute right-2 -top-4 text-yellow-400 font-arcade text-xs">0</span>
          </div>
        </div>
        <div className="fixed inset-x-0 pointer-events-none z-[100]" style={{ bottom: '20px' }}>
          <div className="w-full h-[2px] bg-yellow-400 relative">
            <span className="absolute right-2 -top-4 text-yellow-400 font-arcade text-xs">20</span>
          </div>
        </div>
        <div className="fixed inset-x-0 pointer-events-none z-[100]" style={{ bottom: '40px' }}>
          <div className="w-full h-[2px] bg-yellow-400 relative">
            <span className="absolute right-2 -top-4 text-yellow-400 font-arcade text-xs">40</span>
          </div>
        </div>
        <div className="fixed inset-x-0 pointer-events-none z-[100]" style={{ bottom: '60px' }}>
          <div className="w-full h-[2px] bg-yellow-400 relative">
            <span className="absolute right-2 -top-4 text-yellow-400 font-arcade text-xs">60</span>
          </div>
        </div>
        <div className="fixed inset-x-0 pointer-events-none z-[100]" style={{ bottom: '80px' }}>
          <div className="w-full h-[2px] bg-yellow-400 relative">
            <span className="absolute right-2 -top-4 text-yellow-400 font-arcade text-xs">80</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
