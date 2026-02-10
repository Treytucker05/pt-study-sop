import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Trash2, Pencil } from "lucide-react";

interface CardDraft {
  id: number;
  front: string;
  back: string;
  status: string;
  tags?: string;
  source_citation?: string;
  created_at: string;
}

interface CardReviewTabsProps {
  drafts: CardDraft[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onEdit: (draft: CardDraft) => void;
}

export function CardReviewTabs({
  drafts,
  onApprove,
  onReject,
  onEdit,
}: CardReviewTabsProps) {
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());

  const highConfidence = drafts.filter(d => d.status === "high_confidence");
  const lowConfidence = drafts.filter(d => d.status === "low_confidence");
  const regularDrafts = drafts.filter(d => d.status === "draft" || d.status === "pending");

  const getConfidenceScore = (draft: CardDraft): number => {
    let score = 0;
    if (draft.source_citation) score += 0.3;
    if (draft.front && draft.front.length > 10) score += 0.2;
    if (draft.back && draft.back.length > 20) score += 0.3;
    if (draft.back && (draft.back.includes("(") || draft.back.match(/\d/))) score += 0.2;
    return score;
  };

  const renderDraftCard = (draft: CardDraft, showConfidence: boolean = false) => {
    const confidence = getConfidenceScore(draft);
    
    return (
      <div
        key={draft.id}
        className={`p-2 bg-black/40 border text-xs ${
          selectedDrafts.has(draft.id) ? "border-primary" : "border-secondary/30"
        }`}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={selectedDrafts.has(draft.id)}
            onCheckedChange={(checked) => {
              const newSet = new Set(selectedDrafts);
              if (checked) {
                newSet.add(draft.id);
              } else {
                newSet.delete(draft.id);
              }
              setSelectedDrafts(newSet);
            }}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              {showConfidence && (
                <Badge
                  variant="outline"
                  className={`text-xs font-terminal ${
                    confidence >= 0.8
                      ? "border-success/50 text-success"
                      : confidence >= 0.5
                      ? "border-warning/50 text-warning"
                      : "border-destructive/50 text-destructive"
                  }`}
                >
                  {Math.round(confidence * 100)}%
                </Badge>
              )}
              <span className="font-terminal text-muted-foreground">
                {draft.front}
              </span>
            </div>
            <div className="font-terminal text-xs text-secondary">
              {draft.back.substring(0, 100)}
              {draft.back.length > 100 && "..."}
            </div>
            {draft.source_citation && (
              <div className="font-terminal text-xs text-muted-foreground italic">
                Source: {draft.source_citation}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onEdit(draft)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkActions = (count: number) => {
    if (count === 0) return null;

    return (
      <div className="flex gap-1 mb-2">
        <Button
          size="sm"
          className="h-6 px-2 text-xs font-terminal bg-success hover:bg-success/80"
          onClick={() => {
            selectedDrafts.forEach(id => onApprove(id));
            setSelectedDrafts(new Set());
          }}
        >
          <Check className="w-3 h-3 mr-1" />
          Approve ({count})
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="h-6 px-2 text-xs font-terminal"
          onClick={() => {
            selectedDrafts.forEach(id => onReject(id));
            setSelectedDrafts(new Set());
          }}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Reject ({count})
        </Button>
      </div>
    );
  };

  return (
    <Tabs defaultValue="high" className="w-full">
      <TabsList className="grid w-full grid-cols-3 rounded-none bg-black border border-secondary/40">
        <TabsTrigger
          value="high"
          className="font-arcade text-xs rounded-none data-[state=active]:bg-success/20 data-[state=active]:text-success"
        >
          HIGH ({highConfidence.length})
        </TabsTrigger>
        <TabsTrigger
          value="low"
          className="font-arcade text-xs rounded-none data-[state=active]:bg-warning/20 data-[state=active]:text-warning"
        >
          LOW ({lowConfidence.length})
        </TabsTrigger>
        <TabsTrigger
          value="regular"
          className="font-arcade text-xs rounded-none data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
        >
          DRAFT ({regularDrafts.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="high" className="border border-t-0 border-secondary/40 rounded-none p-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-terminal text-xs text-success">
              High confidence cards - ready for one-click approval
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 px-2 text-xs font-terminal"
              onClick={() => {
                if (selectedDrafts.size === highConfidence.length) {
                  setSelectedDrafts(new Set());
                } else {
                  setSelectedDrafts(new Set(highConfidence.map(d => d.id)));
                }
              }}
            >
              {selectedDrafts.size === highConfidence.length ? "None" : "All"}
            </Button>
          </div>
          {renderBulkActions(selectedDrafts.size)}
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {highConfidence.map(draft => renderDraftCard(draft, true))}
              {highConfidence.length === 0 && (
                <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                  No high confidence cards
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="low" className="border border-t-0 border-secondary/40 rounded-none p-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-terminal text-xs text-warning">
              Low confidence cards - review and edit before approval
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 px-2 text-xs font-terminal"
              onClick={() => {
                if (selectedDrafts.size === lowConfidence.length) {
                  setSelectedDrafts(new Set());
                } else {
                  setSelectedDrafts(new Set(lowConfidence.map(d => d.id)));
                }
              }}
            >
              {selectedDrafts.size === lowConfidence.length ? "None" : "All"}
            </Button>
          </div>
          {renderBulkActions(selectedDrafts.size)}
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {lowConfidence.map(draft => renderDraftCard(draft, true))}
              {lowConfidence.length === 0 && (
                <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                  No low confidence cards
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>

      <TabsContent value="regular" className="border border-t-0 border-secondary/40 rounded-none p-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-terminal text-xs text-muted-foreground">
              Regular draft cards
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-5 px-2 text-xs font-terminal"
              onClick={() => {
                if (selectedDrafts.size === regularDrafts.length) {
                  setSelectedDrafts(new Set());
                } else {
                  setSelectedDrafts(new Set(regularDrafts.map(d => d.id)));
                }
              }}
            >
              {selectedDrafts.size === regularDrafts.length ? "None" : "All"}
            </Button>
          </div>
          {renderBulkActions(selectedDrafts.size)}
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {regularDrafts.map(draft => renderDraftCard(draft, false))}
              {regularDrafts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                  No draft cards
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>
    </Tabs>
  );
}
