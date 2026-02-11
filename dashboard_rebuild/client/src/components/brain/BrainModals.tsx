import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IngestionTab } from "@/components/IngestionTab";
import { Download } from "lucide-react";
import type { BrainWorkspace } from "./useBrainWorkspace";

interface BrainModalsProps {
  workspace: BrainWorkspace;
}

export function BrainModals({ workspace }: BrainModalsProps) {
  return (
    <Dialog open={workspace.importOpen} onOpenChange={workspace.setImportOpen}>
      <DialogContent
        data-modal="brain-import"
        className="max-w-2xl bg-black border-2 border-primary rounded-none"
      >
        <DialogHeader>
          <DialogTitle className="font-arcade text-sm text-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            IMPORT / INGEST
          </DialogTitle>
          <DialogDescription className="font-terminal text-xs text-muted-foreground">
            Import study materials, JSON session data, or documents into the system.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <IngestionTab />
        </div>
      </DialogContent>
    </Dialog>
  );
}
