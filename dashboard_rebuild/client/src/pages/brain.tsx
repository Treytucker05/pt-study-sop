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
import { useState } from "react";
import { FolderOpen, Pencil } from "lucide-react";

type MobileTab = "vault" | "main";

export default function Brain() {
  const workspace = useBrainWorkspace();
  const [mobileTab, setMobileTab] = useState<MobileTab>("main");

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-64px-40px)] min-w-0 overflow-hidden">
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

          {/* Bottom tab bar */}
          <div className="flex items-center border-t-2 border-primary/50 bg-black/80 shrink-0">
            <button
              onClick={() => setMobileTab("vault")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-terminal transition-colors ${
                mobileTab === "vault" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Vault
            </button>
            <button
              onClick={() => setMobileTab("main")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-terminal transition-colors ${
                mobileTab === "main" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Pencil className="w-4 h-4" />
              Content
            </button>
          </div>
        </div>

        {/* Modals */}
        <BrainModals workspace={workspace} />
      </div>
    </Layout>
  );
}
