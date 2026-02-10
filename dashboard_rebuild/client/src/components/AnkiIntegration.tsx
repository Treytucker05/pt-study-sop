import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Layers, RefreshCw, Check, X, Trash2, Pencil, Save, Loader2,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AnkiIntegrationProps {
  totalCards: number;
  compact?: boolean;
}

export function AnkiIntegration({ totalCards, compact }: AnkiIntegrationProps) {
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [editDraftData, setEditDraftData] = useState({ front: "", back: "", deckName: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ankiStatus, isLoading: ankiLoading, refetch: refetchAnki } = useQuery({
    queryKey: ["anki", "status"],
    queryFn: api.anki.getStatus,
    refetchInterval: 30000,
  });

  const { data: ankiDue } = useQuery({
    queryKey: ["anki", "due"],
    queryFn: api.anki.getDue,
    enabled: ankiStatus?.connected === true,
  });

  const { data: ankiDrafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ["anki", "drafts"],
    queryFn: api.anki.getDrafts,
  });

  const pendingDrafts = ankiDrafts.filter(d => d.status === "pending");

  const syncAnkiMutation = useMutation({
    mutationFn: api.anki.sync,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["anki"] });
      refetchDrafts();
      toast({
        title: "Anki sync complete",
        description: data.output || "Cards synced successfully",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Anki sync failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const approveDraftMutation = useMutation({
    mutationFn: (id: number) => api.anki.approveDraft(id),
    onSuccess: () => refetchDrafts(),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id: number) => api.anki.deleteDraft(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["anki", "drafts"] });
      const prev = queryClient.getQueryData(["anki", "drafts"]);
      queryClient.setQueryData(["anki", "drafts"], (old: typeof ankiDrafts) =>
        old ? old.filter((d) => d.id !== id) : []
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(["anki", "drafts"], context.prev);
    },
    onSettled: () => refetchDrafts(),
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { front?: string; back?: string; deckName?: string } }) =>
      api.anki.updateDraft(id, data),
    onSuccess: () => {
      refetchDrafts();
      setEditingDraft(null);
    },
  });

  const handleEditDraft = (draft: typeof pendingDrafts[0]) => {
    setEditingDraft(draft.id);
    setEditDraftData({ front: draft.front, back: draft.back, deckName: draft.deckName });
  };

  const handleSaveDraft = () => {
    if (editingDraft === null) return;
    updateDraftMutation.mutate({ id: editingDraft, data: editDraftData });
  };

  const content = (
        <div className={compact ? "p-3 space-y-3" : "p-4 space-y-3"}>
          {ankiLoading ? (
            <p className="font-terminal text-xs text-muted-foreground">Checking Anki...</p>
          ) : ankiStatus?.connected ? (
            <>
              <div className="flex flex-wrap items-center gap-4 font-terminal text-xs">
                <Badge variant="outline" className="bg-success/20 text-success border-success">Connected</Badge>
                <span className="text-muted-foreground">Cards: <span className="text-primary font-arcade">{totalCards}</span></span>
                <span className="text-muted-foreground">Due: <span className="text-secondary font-arcade">{ankiDue?.dueCount || 0}</span></span>
                <span className="text-muted-foreground">Reviewed: <span className="font-arcade">{ankiStatus.reviewedToday || 0}</span></span>
                <span className="text-muted-foreground">Decks: <span className="font-arcade">{ankiStatus.decks?.length || 0}</span></span>
              </div>
              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 font-terminal text-xs"
                  onClick={() => refetchAnki()}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  className="flex-1 font-terminal text-xs bg-secondary hover:bg-secondary/80"
                  onClick={() => syncAnkiMutation.mutate()}
                  disabled={syncAnkiMutation.isPending}
                >
                  {syncAnkiMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  {syncAnkiMutation.isPending ? "Syncing..." : "Sync Cards"}
                </Button>
              </div>
              {syncAnkiMutation.isError && (
                <div className="p-2 bg-destructive/10 border border-destructive/30 text-destructive font-terminal text-[10px]">
                  <span className="font-arcade">SYNC ERROR:</span>{" "}
                  {(syncAnkiMutation.error as Error)?.message || "Unknown error"}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2 h-5 px-2 text-[10px] font-terminal border-destructive/50 text-destructive"
                    onClick={() => syncAnkiMutation.mutate()}
                    disabled={syncAnkiMutation.isPending}
                  >
                    Retry
                  </Button>
                </div>
              )}
              {pendingDrafts.length > 0 && (
                <div className="pt-3 border-t border-secondary/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-arcade text-[10px] text-warning">PENDING CARDS ({pendingDrafts.length})</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 px-2 text-[10px] font-terminal"
                        onClick={() => {
                          if (selectedDrafts.size === pendingDrafts.length) {
                            setSelectedDrafts(new Set());
                          } else {
                            setSelectedDrafts(new Set(pendingDrafts.map(d => d.id)));
                          }
                        }}
                      >
                        {selectedDrafts.size === pendingDrafts.length ? "None" : "All"}
                      </Button>
                    </div>
                  </div>
                  {selectedDrafts.size > 0 && (
                    <div className="flex gap-1 mb-2">
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px] font-terminal bg-success hover:bg-success/80"
                        onClick={() => {
                          selectedDrafts.forEach(id => approveDraftMutation.mutate(id));
                          setSelectedDrafts(new Set());
                        }}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve ({selectedDrafts.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-[10px] font-terminal"
                        onClick={() => {
                          selectedDrafts.forEach(id => deleteDraftMutation.mutate(id));
                          setSelectedDrafts(new Set());
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete ({selectedDrafts.size})
                      </Button>
                    </div>
                  )}
                  <ScrollArea className="h-[140px]">
                    <div className="space-y-2">
                      {pendingDrafts.map((draft) => (
                        <div key={draft.id} className={`p-2 bg-black/40 border text-xs ${selectedDrafts.has(draft.id) ? 'border-primary' : 'border-secondary/30'}`}>
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
                              className="mt-1 border-secondary data-[state=checked]:bg-primary"
                            />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="font-terminal text-primary truncate">{draft.front}</div>
                              <div className="font-terminal text-muted-foreground mt-1 truncate">{draft.back}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[9px] border-info/50 text-info shrink-0">
                                  {draft.deckName}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-5 w-5 shrink-0 border-warning/50 text-warning hover:bg-warning/20"
                                  onClick={() => handleEditDraft(draft)}
                                  title="Edit card"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-5 w-5 shrink-0 border-success/50 text-success hover:bg-success/20"
                                  onClick={() => approveDraftMutation.mutate(draft.id)}
                                  title="Approve card"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-5 w-5 shrink-0 border-destructive/50 text-destructive hover:bg-destructive/20"
                                  onClick={() => deleteDraftMutation.mutate(draft.id)}
                                  title="Delete card"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-2">
              <p className="font-terminal text-xs text-destructive">
                {ankiStatus?.error || "Anki not connected"}
              </p>
              <p className="font-terminal text-xs text-muted-foreground">
                Open Anki with AnkiConnect plugin
              </p>
              <Button
                size="sm"
                variant="outline"
                className="font-terminal text-xs"
                onClick={() => refetchAnki()}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>
  );

  return (
    <>
      {compact ? content : (
        <Card className="bg-black/40 border-2 border-primary rounded-none">
          <CardHeader className="border-b border-primary/50 p-4">
            <CardTitle className="font-arcade text-sm flex items-center gap-3">
              <Layers className="w-4 h-4" />
              ANKI INTEGRATION
              {ankiStatus?.connected ? (
                <Check className="w-3 h-3 text-success ml-auto" />
              ) : (
                <X className="w-3 h-3 text-destructive ml-auto" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {content}
          </CardContent>
        </Card>
      )}

      {/* Edit Card Draft Dialog */}
      <Dialog
        open={editingDraft !== null}
        onOpenChange={(open) => {
          if (!open) setEditingDraft(null);
        }}
      >
        <DialogContent
          data-modal="brain-edit-draft"
          className="bg-black border-2 border-primary rounded-none max-w-lg translate-y-0"
          style={{ zIndex: 100005, top: "6rem", left: "50%", transform: "translate(-50%, 0)" }}
        >
          <DialogHeader>
            <DialogTitle className="font-arcade text-primary flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              EDIT CARD
            </DialogTitle>
            <DialogDescription className="font-terminal text-muted-foreground">
              Edit card content and select target deck
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 font-terminal">
            <div>
              <label className="text-sm text-muted-foreground">Front (Question)</label>
              <Textarea
                value={editDraftData.front}
                onChange={(e) => setEditDraftData(prev => ({ ...prev, front: e.target.value }))}
                placeholder="Card front..."
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Back (Answer)</label>
              <Textarea
                value={editDraftData.back}
                onChange={(e) => setEditDraftData(prev => ({ ...prev, back: e.target.value }))}
                placeholder="Card back..."
                className="rounded-none border-secondary min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Target Deck</label>
              <Select
                value={editDraftData.deckName}
                onValueChange={(value) => setEditDraftData(prev => ({ ...prev, deckName: value }))}
              >
                <SelectTrigger className="rounded-none border-secondary">
                  <SelectValue placeholder="Select deck" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-secondary bg-black max-h-[200px]">
                  <SelectItem value="PT::EBP">PT::EBP (Evidence Based Practice)</SelectItem>
                  <SelectItem value="PT::ExPhys">PT::ExPhys (Exercise Physiology)</SelectItem>
                  <SelectItem value="PT::MS1">PT::MS1 (Movement Science 1)</SelectItem>
                  <SelectItem value="PT::Neuro">PT::Neuro (Neuroscience)</SelectItem>
                  <SelectItem value="PT::TI">PT::TI (Therapeutic Intervention)</SelectItem>
                  <SelectItem value="PT::General">PT::General</SelectItem>
                  {ankiStatus?.decks?.filter(d => !d.startsWith("PT::")).map((deck) => (
                    <SelectItem key={deck} value={deck}>
                      {deck}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Current: <span className="text-blue-400">{editDraftData.deckName}</span>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingDraft(null)}
              className="font-terminal rounded-none border-secondary hover:bg-secondary/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={updateDraftMutation.isPending}
              className="font-terminal rounded-none bg-primary hover:bg-primary/80"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateDraftMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
