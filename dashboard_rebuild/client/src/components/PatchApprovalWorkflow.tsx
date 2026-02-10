import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Pencil, FileText } from "lucide-react";

interface PatchData {
  id: string;
  session_id: string;
  note_path: string;
  timestamp: string;
  original_length: number;
  modified_length: number;
  can_rollback: boolean;
  diff_lines: string[];
}

interface PatchApprovalWorkflowProps {
  patches: PatchData[];
  onApply: (patchId: string, modifiedDiff?: string) => Promise<void>;
  onDecline: (patchId: string) => void;
}

export function PatchApprovalWorkflow({
  patches,
  onApply,
  onDecline,
}: PatchApprovalWorkflowProps) {
  const [selectedPatch, setSelectedPatch] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedDiff, setEditedDiff] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async (patchId: string) => {
    setIsApplying(true);
    try {
      await onApply(patchId, editMode ? editedDiff : undefined);
      setSelectedPatch(null);
      setEditMode(false);
      setEditedDiff("");
    } catch (error) {
      console.error("Failed to apply patch:", error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDecline = (patchId: string) => {
    onDecline(patchId);
    if (selectedPatch === patchId) {
      setSelectedPatch(null);
      setEditMode(false);
      setEditedDiff("");
    }
  };

  const handleEdit = (patch: PatchData) => {
    setEditMode(true);
    setEditedDiff(patch.diff_lines.join("\n"));
  };

  const renderDiffLine = (line: string, index: number) => {
    const isAddition = line.startsWith("+");
    const isRemoval = line.startsWith("-");
    const isContext = !isAddition && !isRemoval;

    return (
      <div
        key={index}
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
  };

  if (patches.length === 0) {
    return (
      <Card className="brain-card rounded-none">
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-terminal text-xs text-muted-foreground">
            No pending Obsidian patches
          </p>
        </CardContent>
      </Card>
    );
  }

  const selected = selectedPatch
    ? patches.find((p) => p.id === selectedPatch)
    : null;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Patch List */}
      <Card className="brain-card rounded-none col-span-1">
        <CardHeader className="border-b border-secondary/50">
          <CardTitle className="font-arcade text-sm text-primary">
            PENDING PATCHES ({patches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-secondary/30">
              {patches.map((patch) => (
                <button
                  key={patch.id}
                  onClick={() => {
                    setSelectedPatch(patch.id);
                    setEditMode(false);
                  }}
                  className={`w-full p-3 text-left hover:bg-primary/10 transition-colors ${
                    selectedPatch === patch.id ? "bg-primary/20" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-terminal text-xs text-primary">
                      {patch.note_path}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-terminal border-secondary/50"
                      >
                        {patch.session_id}
                      </Badge>
                    </div>
                    <div className="font-terminal text-[10px] text-muted-foreground">
                      {new Date(patch.timestamp).toLocaleString()}
                    </div>
                    <div className="font-terminal text-[10px] text-secondary">
                      +{patch.modified_length - patch.original_length} lines
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Diff Viewer/Editor */}
      <Card className="brain-card rounded-none col-span-2">
        <CardHeader className="border-b border-secondary/50">
          <div className="flex items-center justify-between">
            <CardTitle className="font-arcade text-sm text-primary">
              {selected ? (editMode ? "EDIT PATCH" : "DIFF PREVIEW") : "SELECT A PATCH"}
            </CardTitle>
            {selected && !editMode && (
              <Button
                onClick={() => handleEdit(selected)}
                variant="outline"
                size="sm"
                className="rounded-none font-terminal text-xs"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {!selected ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="font-terminal text-xs text-muted-foreground">
                Select a patch from the list to preview
              </p>
            </div>
          ) : editMode ? (
            <div className="space-y-2">
              <Textarea
                value={editedDiff}
                onChange={(e) => setEditedDiff(e.target.value)}
                className="h-[350px] font-terminal text-[11px] bg-black rounded-none border-secondary"
                placeholder="Edit diff content..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setEditMode(false)}
                  variant="outline"
                  className="rounded-none font-terminal text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleApply(selected.id)}
                  className="bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs"
                  disabled={isApplying}
                >
                  {isApplying ? "Applying..." : "Apply Edited"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Metadata */}
              <div className="p-2 bg-black/40 border border-secondary/40 rounded-none">
                <div className="grid grid-cols-2 gap-2 font-terminal text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Note:</span>{" "}
                    <span className="text-primary">{selected.note_path}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Session:</span>{" "}
                    <span className="text-secondary">{selected.session_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Original Lines:</span>{" "}
                    <span className="text-primary">{selected.original_length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modified Lines:</span>{" "}
                    <span className="text-primary">{selected.modified_length}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Rollback:</span>{" "}
                    <Badge
                      variant="outline"
                      className={`text-[9px] ml-1 ${
                        selected.can_rollback
                          ? "border-green-500/50 text-green-400"
                          : "border-red-500/50 text-red-400"
                      }`}
                    >
                      {selected.can_rollback ? "Available" : "Not Available"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Diff Display */}
              <ScrollArea className="h-[250px] border border-secondary/40 rounded-none bg-black">
                <div className="p-0">
                  {selected.diff_lines.map((line, idx) => renderDiffLine(line, idx))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDecline(selected.id)}
                  variant="outline"
                  className="flex-1 rounded-none font-terminal"
                >
                  <X className="w-4 h-4 mr-1" />
                  Decline
                </Button>
                <Button
                  onClick={() => handleApply(selected.id)}
                  className="flex-1 bg-primary hover:bg-primary/80 rounded-none font-terminal"
                  disabled={isApplying}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {isApplying ? "Applying..." : "Apply"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
