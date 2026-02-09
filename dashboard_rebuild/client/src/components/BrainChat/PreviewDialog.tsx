import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObsidianRenderer } from "@/components/ObsidianRenderer";
import { FileText, CheckCircle } from "lucide-react";
import type { BrainOrganizePreviewResponse } from "@/lib/api";
import type { ChecklistState } from "./types";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  rawNotes: string;
  organized: BrainOrganizePreviewResponse["organized"] | null;
  destination: BrainOrganizePreviewResponse["destination"] | null;
  selectedDestinationId: string;
  setSelectedDestinationId: (id: string) => void;
  customDestination: string;
  setCustomDestination: (path: string) => void;
  checklistState: ChecklistState;
  onToggleChecklist: (item: string) => void;
  diffLines: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

function DiffLine({ line, index }: { line: string; index: number }) {
  const isAddition = line.startsWith("+");
  const isRemoval = line.startsWith("-");

  return (
    <div
      className={`font-terminal text-[11px] px-2 ${
        isAddition
          ? "bg-green-900/30 text-green-400"
          : isRemoval
          ? "bg-red-900/30 text-red-400"
          : "text-muted-foreground"
      }`}
    >
      {line}
    </div>
  );
}

export function PreviewDialog({
  open,
  onOpenChange,
  loading,
  error,
  rawNotes,
  organized,
  destination,
  selectedDestinationId,
  setSelectedDestinationId,
  customDestination,
  setCustomDestination,
  checklistState,
  onToggleChecklist,
  diffLines,
  onConfirm,
  onCancel,
}: PreviewDialogProps) {
  const allChecklistChecked =
    Object.values(checklistState).length === 0
      ? true
      : Object.values(checklistState).every(Boolean);

  const getSelectedDestinationPath = () => {
    if (!destination) return "";
    if (selectedDestinationId === "custom") {
      return customDestination.trim();
    }
    const match = destination.options.find((opt) => opt.id === selectedDestinationId);
    return match?.path || "";
  };

  const selectedPath = getSelectedDestinationPath();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[85vh] bg-black border-2 border-primary rounded-none p-4 overflow-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-arcade text-sm text-primary flex items-center gap-2">
            <FileText className="w-4 h-4" />
            ORGANIZE + REVIEW
          </DialogTitle>
          <DialogDescription className="font-terminal text-[11px] text-muted-foreground">
            Review the organized notes, compare to raw, then choose where to save.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="border border-red-500/50 bg-red-900/20 text-red-200 font-terminal text-xs p-2 rounded-none">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 h-[70vh]">
          {/* Left column: Tabs with preview/raw/diff */}
          <div className="col-span-2 flex flex-col gap-3">
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="grid grid-cols-3 rounded-none">
                <TabsTrigger value="preview" className="rounded-none text-xs">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="raw" className="rounded-none text-xs">
                  Raw
                </TabsTrigger>
                <TabsTrigger value="diff" className="rounded-none text-xs">
                  Diff
                </TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-2">
                <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-3">
                  <div className="space-y-2">
                    <div className="font-arcade text-xs text-primary">
                      {organized?.title || "Untitled"}
                    </div>
                    <ObsidianRenderer content={organized?.markdown || ""} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="raw" className="mt-2">
                <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-3">
                  <pre className="whitespace-pre-wrap font-terminal text-[11px] text-foreground">
                    {rawNotes}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="diff" className="mt-2">
                <ScrollArea className="h-[56vh] border border-secondary/40 rounded-none bg-black/40 p-0">
                  <div className="p-2">
                    {diffLines.length === 0 ? (
                      <div className="text-muted-foreground font-terminal text-xs">
                        No diff available.
                      </div>
                    ) : (
                      diffLines.map((line, idx) => (
                        <DiffLine key={idx} line={line} index={idx} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column: Destination, Checklist, Actions */}
          <div className="col-span-1 flex flex-col gap-3">
            {/* Destination selection */}
            <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
              <div className="font-arcade text-[10px] text-primary mb-2">
                DESTINATION
              </div>
              <RadioGroup
                value={selectedDestinationId}
                onValueChange={setSelectedDestinationId}
                className="space-y-2"
              >
                {(destination?.options || []).map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <RadioGroupItem value={opt.id} className="mt-1" />
                    <div className="space-y-1">
                      <div className="font-terminal text-[11px] text-foreground flex items-center gap-1">
                        {opt.label}
                        {opt.exists && (
                          <Badge variant="outline" className="text-[9px]">
                            existing
                          </Badge>
                        )}
                      </div>
                      <div className="font-terminal text-[10px] text-muted-foreground break-all">
                        {opt.path || "Custom path"}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {selectedDestinationId === "custom" && (
                <div className="mt-2 space-y-1">
                  <div className="font-terminal text-[10px] text-muted-foreground">
                    Custom path
                  </div>
                  <Input
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    placeholder="School/Therapeutic Intervention/Module 01 - Title.md"
                    className="bg-black border-secondary/60 rounded-none text-xs font-terminal"
                  />
                </div>
              )}
            </div>

            {/* Review checklist */}
            <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
              <div className="font-arcade text-[10px] text-primary mb-2">
                REVIEW CHECKLIST
              </div>
              <div className="space-y-2">
                {(organized?.checklist || []).map((item) => (
                  <label
                    key={item}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={Boolean(checklistState[item])}
                      onCheckedChange={() => onToggleChecklist(item)}
                    />
                    <span className="font-terminal text-[11px] text-foreground">
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Suggested links */}
            {(organized?.suggested_links || []).length > 0 && (
              <div className="border border-secondary/50 bg-black/40 p-3 rounded-none">
                <div className="font-arcade text-[10px] text-primary mb-2">
                  SUGGESTED LINKS
                </div>
                <div className="space-y-1">
                  {organized?.suggested_links?.map((link) => (
                    <div
                      key={link}
                      className="font-terminal text-[11px] text-muted-foreground"
                    >
                      [[{link}]]
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-auto">
              <Button
                variant="outline"
                className="flex-1 rounded-none font-terminal text-xs"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
                onClick={onConfirm}
                disabled={!allChecklistChecked || loading || !selectedPath}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {loading ? "Saving..." : "Confirm & Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
