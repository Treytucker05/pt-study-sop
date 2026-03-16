import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

type AnkiStatus = Awaited<ReturnType<typeof api.anki.getStatus>>;
type AnkiDue = Awaited<ReturnType<typeof api.anki.getDue>>;
type AnkiDraft = Awaited<ReturnType<typeof api.anki.getDrafts>>[number];

interface AnkiIntegrationProps {
  totalCards: number;
  compact?: boolean;
}

interface EditDraftData {
  front: string;
  back: string;
  deckName: string;
}

function AnkiShell({
  compact,
  connected,
  children,
}: {
  compact?: boolean;
  connected?: boolean;
  children: ReactNode;
}) {
  if (compact) {
    return <div className="flex h-full min-h-0 flex-col p-3">{children}</div>;
  }

  return (
    <Card className="rounded-none border-[3px] border-double border-primary bg-black/40">
      <CardHeader className="border-b border-primary/50 p-4">
        <CardTitle className="flex items-center gap-3 font-arcade text-sm">
          <Layers className="h-4 w-4" />
          ANKI INTEGRATION
          {connected ? (
            <Check className="ml-auto h-3 w-3 text-success" />
          ) : (
            <X className="ml-auto h-3 w-3 text-destructive" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function AnkiStatusRow({
  totalCards,
  ankiStatus,
  ankiDue,
}: {
  totalCards: number;
  ankiStatus: AnkiStatus;
  ankiDue?: AnkiDue;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-4 font-terminal text-xs">
      <Badge variant="outline" className="border-success bg-success/20 text-success">
        Connected
      </Badge>
      <span className="text-muted-foreground">
        Cards: <span className="font-arcade text-primary">{totalCards}</span>
      </span>
      <span className="text-muted-foreground">
        Due: <span className="font-arcade text-secondary">{ankiDue?.dueCount || 0}</span>
      </span>
      <span className="text-muted-foreground">
        Reviewed: <span className="font-arcade">{ankiStatus.reviewedToday || 0}</span>
      </span>
      <span className="text-muted-foreground">
        Decks: <span className="font-arcade">{ankiStatus.decks?.length || 0}</span>
      </span>
    </div>
  );
}

function AnkiActionRow({
  onRefresh,
  onSync,
  syncPending,
}: {
  onRefresh: () => void;
  onSync: () => void;
  syncPending: boolean;
}) {
  return (
    <div className="flex shrink-0 gap-2 pt-2">
      <Button
        size="sm"
        variant="outline"
        className="flex-1 font-terminal text-xs"
        onClick={onRefresh}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        Refresh
      </Button>
      <Button
        size="sm"
        className="flex-1 bg-secondary font-terminal text-xs hover:bg-secondary/80"
        onClick={onSync}
        disabled={syncPending}
      >
        {syncPending ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="mr-1 h-3 w-3" />
        )}
        {syncPending ? "Syncing..." : "Sync Cards"}
      </Button>
    </div>
  );
}

function SyncErrorNotice({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="border border-destructive/30 bg-destructive/10 p-2 font-terminal text-xs text-destructive">
      <span className="font-arcade">SYNC ERROR:</span> {message}
      <Button
        size="sm"
        variant="outline"
        className="ml-2 h-5 border-destructive/50 px-2 font-terminal text-xs text-destructive"
        onClick={onRetry}
        disabled={retrying}
      >
        Retry
      </Button>
    </div>
  );
}

function PendingDraftsSection({
  pendingDrafts,
  selectedDrafts,
  onToggleSelectAll,
  onToggleDraft,
  onEditDraft,
  onApproveDraft,
  onDeleteDraft,
  onApproveSelected,
  onDeleteSelected,
  approvePending,
  deletePending,
}: {
  pendingDrafts: AnkiDraft[];
  selectedDrafts: Set<number>;
  onToggleSelectAll: () => void;
  onToggleDraft: (id: number, checked: boolean) => void;
  onEditDraft: (draft: AnkiDraft) => void;
  onApproveDraft: (id: number) => void;
  onDeleteDraft: (id: number) => void;
  onApproveSelected: () => void;
  onDeleteSelected: () => void;
  approvePending: boolean;
  deletePending: boolean;
}) {
  if (pendingDrafts.length === 0) {
    return null;
  }

  const hasSelection = selectedDrafts.size > 0;

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-secondary/30 pt-3">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="font-arcade text-xs text-warning">
          PENDING CARDS ({pendingDrafts.length})
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-5 px-2 font-terminal text-xs"
          onClick={onToggleSelectAll}
        >
          {selectedDrafts.size === pendingDrafts.length ? "None" : "All"}
        </Button>
      </div>

      {hasSelection && (
        <div className="mb-2 flex shrink-0 gap-1">
          <Button
            size="sm"
            className="h-6 bg-success px-2 font-terminal text-xs hover:bg-success/80"
            onClick={onApproveSelected}
            disabled={!hasSelection || approvePending || deletePending}
          >
            <Check className="mr-1 h-3 w-3" />
            Approve ({selectedDrafts.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 px-2 font-terminal text-xs"
            onClick={onDeleteSelected}
            disabled={!hasSelection || deletePending || approvePending}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete ({selectedDrafts.size})
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2">
          {pendingDrafts.map((draft) => (
            <div
              key={draft.id}
              className={`border p-2 text-xs ${selectedDrafts.has(draft.id) ? "border-primary" : "border-secondary/30"} bg-black/40`}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={selectedDrafts.has(draft.id)}
                  onCheckedChange={(checked) => onToggleDraft(draft.id, checked === true)}
                  className="mt-1 border-secondary data-[state=checked]:bg-primary"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate font-terminal text-primary">{draft.front}</div>
                  <div className="mt-1 truncate font-terminal text-muted-foreground">{draft.back}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="shrink-0 border-info/50 text-info text-xs"
                    >
                      {draft.deckName}
                    </Badge>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-5 w-5 shrink-0 border-warning/50 text-warning hover:bg-warning/20"
                      onClick={() => onEditDraft(draft)}
                      title="Edit card"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-5 w-5 shrink-0 border-success/50 text-success hover:bg-success/20"
                      onClick={() => onApproveDraft(draft.id)}
                      title="Approve card"
                      disabled={approvePending || deletePending}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-5 w-5 shrink-0 border-destructive/50 text-destructive hover:bg-destructive/20"
                      onClick={() => onDeleteDraft(draft.id)}
                      title="Delete card"
                      disabled={approvePending || deletePending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function AnkiConnectedView({
  totalCards,
  ankiStatus,
  ankiDue,
  pendingDrafts,
  selectedDrafts,
  onRefresh,
  onSync,
  syncPending,
  syncError,
  onToggleSelectAll,
  onToggleDraft,
  onEditDraft,
  onApproveDraft,
  onDeleteDraft,
  onApproveSelected,
  onDeleteSelected,
  approvePending,
  deletePending,
}: {
  totalCards: number;
  ankiStatus: AnkiStatus;
  ankiDue?: AnkiDue;
  pendingDrafts: AnkiDraft[];
  selectedDrafts: Set<number>;
  onRefresh: () => void;
  onSync: () => void;
  syncPending: boolean;
  syncError?: Error | null;
  onToggleSelectAll: () => void;
  onToggleDraft: (id: number, checked: boolean) => void;
  onEditDraft: (draft: AnkiDraft) => void;
  onApproveDraft: (id: number) => void;
  onDeleteDraft: (id: number) => void;
  onApproveSelected: () => void;
  onDeleteSelected: () => void;
  approvePending: boolean;
  deletePending: boolean;
}) {
  return (
    <>
      <AnkiStatusRow totalCards={totalCards} ankiStatus={ankiStatus} ankiDue={ankiDue} />
      <AnkiActionRow onRefresh={onRefresh} onSync={onSync} syncPending={syncPending} />
      {syncError && (
        <SyncErrorNotice
          message={syncError.message || "Unknown error"}
          onRetry={onSync}
          retrying={syncPending}
        />
      )}
      <PendingDraftsSection
        pendingDrafts={pendingDrafts}
        selectedDrafts={selectedDrafts}
        onToggleSelectAll={onToggleSelectAll}
        onToggleDraft={onToggleDraft}
        onEditDraft={onEditDraft}
        onApproveDraft={onApproveDraft}
        onDeleteDraft={onDeleteDraft}
        onApproveSelected={onApproveSelected}
        onDeleteSelected={onDeleteSelected}
        approvePending={approvePending}
        deletePending={deletePending}
      />
    </>
  );
}

function AnkiDisconnectedView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-2 text-center">
      <p className="font-terminal text-xs text-destructive">{message}</p>
      <p className="font-terminal text-xs text-muted-foreground">
        Open Anki with AnkiConnect plugin
      </p>
      <Button
        size="sm"
        variant="outline"
        className="font-terminal text-xs"
        onClick={onRetry}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}

function DraftEditDialog({
  open,
  onOpenChange,
  editDraftData,
  setEditDraftData,
  onSave,
  savePending,
  ankiStatus,
  idBase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDraftData: EditDraftData;
  setEditDraftData: Dispatch<SetStateAction<EditDraftData>>;
  onSave: () => void;
  savePending: boolean;
  ankiStatus?: AnkiStatus;
  idBase: string;
}) {
  const editFrontId = `${idBase}-edit-front`;
  const editBackId = `${idBase}-edit-back`;
  const editDeckId = `${idBase}-edit-deck`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-modal="brain-edit-draft"
        className="max-w-lg rounded-none border-[3px] border-double border-primary bg-black"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-arcade text-primary">
            <Pencil className="h-5 w-5" />
            EDIT CARD
          </DialogTitle>
          <DialogDescription className="font-terminal text-muted-foreground">
            Edit card content and select target deck
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 font-terminal">
          <div>
            <label htmlFor={editFrontId} className="text-sm text-muted-foreground">
              Front (Question)
            </label>
            <Textarea
              id={editFrontId}
              value={editDraftData.front}
              onChange={(event) =>
                setEditDraftData((prev) => ({ ...prev, front: event.target.value }))
              }
              placeholder="Card front..."
              className="min-h-[80px] rounded-none border-secondary"
            />
          </div>
          <div>
            <label htmlFor={editBackId} className="text-sm text-muted-foreground">
              Back (Answer)
            </label>
            <Textarea
              id={editBackId}
              value={editDraftData.back}
              onChange={(event) =>
                setEditDraftData((prev) => ({ ...prev, back: event.target.value }))
              }
              placeholder="Card back..."
              className="min-h-[80px] rounded-none border-secondary"
            />
          </div>
          <div>
            <label htmlFor={editDeckId} className="text-sm text-muted-foreground">
              Target Deck
            </label>
            <Select
              value={editDraftData.deckName}
              onValueChange={(value) =>
                setEditDraftData((prev) => ({ ...prev, deckName: value }))
              }
            >
              <SelectTrigger id={editDeckId} className="rounded-none border-secondary">
                <SelectValue placeholder="Select deck" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] rounded-none border-secondary bg-black">
                <SelectItem value="PT::EBP">PT::EBP (Evidence Based Practice)</SelectItem>
                <SelectItem value="PT::ExPhys">PT::ExPhys (Exercise Physiology)</SelectItem>
                <SelectItem value="PT::MS1">PT::MS1 (Movement Science 1)</SelectItem>
                <SelectItem value="PT::Neuro">PT::Neuro (Neuroscience)</SelectItem>
                <SelectItem value="PT::TI">PT::TI (Therapeutic Intervention)</SelectItem>
                <SelectItem value="PT::General">PT::General</SelectItem>
                {ankiStatus?.decks
                  ?.filter((deck) => !deck.startsWith("PT::"))
                  .map((deck) => (
                    <SelectItem key={deck} value={deck}>
                      {deck}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Current: <span className="text-blue-400">{editDraftData.deckName}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-none border-secondary font-terminal hover:bg-secondary/20"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={savePending}
            className="rounded-none bg-primary font-terminal hover:bg-primary/80"
          >
            <Save className="mr-2 h-4 w-4" />
            {savePending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AnkiIntegration({ totalCards, compact }: AnkiIntegrationProps) {
  const idBase = useId();
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set());
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [editDraftData, setEditDraftData] = useState<EditDraftData>({
    front: "",
    back: "",
    deckName: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: ankiStatus,
    isLoading: ankiLoading,
    refetch: refetchAnki,
  } = useQuery({
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

  const pendingDrafts = ankiDrafts.filter((draft) => draft.status === "pending");

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
    onError: (error: Error) => {
      toast({
        title: "Anki sync failed",
        description: error.message,
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
      const previousDrafts = queryClient.getQueryData(["anki", "drafts"]);
      queryClient.setQueryData(["anki", "drafts"], (old: AnkiDraft[] | undefined) =>
        old ? old.filter((draft) => draft.id !== id) : []
      );
      return { previousDrafts };
    },
    onError: (_error, _id, context) => {
      if (context?.previousDrafts) {
        queryClient.setQueryData(["anki", "drafts"], context.previousDrafts);
      }
    },
    onSettled: () => refetchDrafts(),
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EditDraftData> }) =>
      api.anki.updateDraft(id, data),
    onSuccess: () => {
      refetchDrafts();
      setEditingDraft(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditDraft = (draft: AnkiDraft) => {
    setEditingDraft(draft.id);
    setEditDraftData({
      front: draft.front,
      back: draft.back,
      deckName: draft.deckName,
    });
  };

  const handleSaveDraft = () => {
    if (editingDraft === null) return;
    updateDraftMutation.mutate({ id: editingDraft, data: editDraftData });
  };

  const handleToggleDraft = (id: number, checked: boolean) => {
    setSelectedDrafts((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedDrafts.size === pendingDrafts.length) {
      setSelectedDrafts(new Set());
      return;
    }
    setSelectedDrafts(new Set(pendingDrafts.map((draft) => draft.id)));
  };

  const handleApproveSelected = () => {
    if (selectedDrafts.size === 0 || approveDraftMutation.isPending || deleteDraftMutation.isPending) {
      return;
    }
    selectedDrafts.forEach((id) => approveDraftMutation.mutate(id));
    setSelectedDrafts(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedDrafts.size === 0 || deleteDraftMutation.isPending || approveDraftMutation.isPending) {
      return;
    }
    selectedDrafts.forEach((id) => deleteDraftMutation.mutate(id));
    setSelectedDrafts(new Set());
  };

  let content: ReactNode;
  if (ankiLoading) {
    content = <p className="font-terminal text-xs text-muted-foreground">Checking Anki...</p>;
  } else if (ankiStatus?.connected) {
    content = (
      <AnkiConnectedView
        totalCards={totalCards}
        ankiStatus={ankiStatus}
        ankiDue={ankiDue}
        pendingDrafts={pendingDrafts}
        selectedDrafts={selectedDrafts}
        onRefresh={() => refetchAnki()}
        onSync={() => syncAnkiMutation.mutate()}
        syncPending={syncAnkiMutation.isPending}
        syncError={syncAnkiMutation.isError ? (syncAnkiMutation.error as Error) : null}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleDraft={handleToggleDraft}
        onEditDraft={handleEditDraft}
        onApproveDraft={(id) => approveDraftMutation.mutate(id)}
        onDeleteDraft={(id) => deleteDraftMutation.mutate(id)}
        onApproveSelected={handleApproveSelected}
        onDeleteSelected={handleDeleteSelected}
        approvePending={approveDraftMutation.isPending}
        deletePending={deleteDraftMutation.isPending}
      />
    );
  } else {
    content = (
      <AnkiDisconnectedView
        message={ankiStatus?.error || "Anki not connected"}
        onRetry={() => refetchAnki()}
      />
    );
  }

  return (
    <>
      <AnkiShell compact={compact} connected={ankiStatus?.connected}>
        {content}
      </AnkiShell>

      <DraftEditDialog
        open={editingDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDraft(null);
          }
        }}
        editDraftData={editDraftData}
        setEditDraftData={setEditDraftData}
        onSave={handleSaveDraft}
        savePending={updateDraftMutation.isPending}
        ankiStatus={ankiStatus}
        idBase={idBase}
      />
    </>
  );
}
