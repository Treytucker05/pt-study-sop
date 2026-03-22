import { useEffect, useId, useReducer, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Blocks, Link2, BarChart3, Plus, Star, Play, Loader2, ChevronDown, ChevronRight, Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import MethodBlockCard from "@/components/MethodBlockCard";
import ChainBuilder from "@/components/ChainBuilder";
import MethodAnalytics from "@/components/MethodAnalytics";
import RatingDialog from "@/components/RatingDialog";
import { PageScaffold } from "@/components/PageScaffold";
import { SupportWorkspaceFrame } from "@/components/SupportWorkspaceFrame";
import { api } from "@/lib/api";
import { DISPLAY_STAGE_LABELS, getDisplayStage, type DisplayStage } from "@/lib/displayStage";
import type { MethodBlock, MethodChain, MethodChainExpanded, ChainRunResult, ChainRunSummary, MethodCategory } from "@/api";

const DISPLAY_STAGES: Array<DisplayStage | "all" | "favorites"> = [
  "all",
  "favorites",
  "priming",
  "teaching",
  "calibrate",
  "encoding",
  "reference",
  "retrieval",
  "overlearning",
];

const TAB_ITEMS = [
  { id: "library", label: "LIBRARY", icon: Blocks },
  { id: "chains", label: "CHAINS", icon: Link2 },
  { id: "analytics", label: "ANALYTICS", icon: BarChart3 },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

type AddBlockDialogState = {
  name: string;
  category: MethodCategory;
  description: string;
  duration: number;
  energyCost: string;
  bestStage: string;
};

type EditBlockDialogState = {
  name: string;
  category: MethodCategory;
  description: string;
  facilitationPrompt: string;
  knobsJson: string;
  knobError: string | null;
  fullScreenText: boolean;
  templateLoading: boolean;
  duration: number;
  energyCost: string;
  bestStage: string;
};

type ChainRunDialogState = {
  topic: string;
  courseId: string;
  writeObsidian: boolean;
  draftCards: boolean;
  running: boolean;
  error: string | null;
};

function createAddBlockDialogState(): AddBlockDialogState {
  return {
    name: "",
    category: "PRIME",
    description: "",
    duration: 5,
    energyCost: "medium",
    bestStage: "",
  };
}

function addBlockDialogReducer(
  state: AddBlockDialogState,
  patch: Partial<AddBlockDialogState>,
): AddBlockDialogState {
  return { ...state, ...patch };
}

function createChainRunDialogState(): ChainRunDialogState {
  return {
    topic: "",
    courseId: "",
    writeObsidian: true,
    draftCards: true,
    running: false,
    error: null,
  };
}

function chainRunDialogReducer(
  state: ChainRunDialogState,
  patch: Partial<ChainRunDialogState>,
): ChainRunDialogState {
  return { ...state, ...patch };
}

function createEditBlockDialogState(): EditBlockDialogState {
  return {
    name: "",
    category: "PRIME",
    description: "",
    facilitationPrompt: "",
    knobsJson: "{}",
    knobError: null,
    fullScreenText: false,
    templateLoading: false,
    duration: 5,
    energyCost: "medium",
    bestStage: "",
  };
}

function normalizeBlockCategory(block: MethodBlock): MethodCategory {
  const categoryOptions: MethodCategory[] = [
    "PRIME",
    "TEACH",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
  ];
  const legacyToControl: Record<string, MethodCategory> = {
    PREPARE: "PRIME",
    TEACH: "TEACH",
    ENCODE: "ENCODE",
    INTERROGATE: "REFERENCE",
    RETRIEVE: "RETRIEVE",
    REFINE: "OVERLEARN",
    OVERLEARN: "OVERLEARN",
  };
  const control = String(block.control_stage ?? "").toUpperCase();
  if (categoryOptions.includes(control as MethodCategory)) return control as MethodCategory;
  const raw = String(block.category ?? "").toUpperCase();
  if (categoryOptions.includes(raw as MethodCategory)) return raw as MethodCategory;
  return legacyToControl[raw] ?? "PRIME";
}

function editBlockDialogReducer(
  state: EditBlockDialogState,
  patch: Partial<EditBlockDialogState>,
): EditBlockDialogState {
  return { ...state, ...patch };
}

function hydrateEditBlockDialogState(block: MethodBlock): EditBlockDialogState {
  return {
    name: block.name ?? "",
    category: normalizeBlockCategory(block),
    description: block.description ?? "",
    facilitationPrompt: block.facilitation_prompt ?? "",
    knobsJson: JSON.stringify(block.knobs ?? {}, null, 2),
    knobError: null,
    fullScreenText: false,
    templateLoading: false,
    duration: block.default_duration_min ?? 5,
    energyCost: block.energy_cost ?? "medium",
    bestStage: block.best_stage ?? "",
  };
}

function getQueryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

function MethodsLoadErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[1rem] border border-destructive/40 bg-destructive/10 p-4 text-left" data-testid="methods-load-error">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-2">
          <div className="font-arcade text-xs tracking-[0.2em] text-destructive">{title}</div>
          <p className="font-terminal text-sm text-white">{message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none border-[3px] border-double border-destructive/60 bg-black/40 font-arcade text-xs text-destructive hover:bg-destructive/15"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function useMethodsPageController() {
  const [activeTab, setActiveTab] = useState<TabId>("library");
  const [stageFilter, setStageFilter] = useState<DisplayStage | "all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddChain, setShowAddChain] = useState(false);
  const [selectedChain, setSelectedChain] = useState<MethodChainExpanded | null>(null);
  const [editingBlock, setEditingBlock] = useState<MethodBlock | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ id: number; name: string; type: "method" | "chain" } | null>(null);
  const [runTarget, setRunTarget] = useState<{ id: number; name: string } | null>(null);
  const [runResult, setRunResult] = useState<ChainRunResult | null>(null);
  const [favoriteMethodIds, setFavoriteMethodIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("methods.favoriteIds");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("methods.favoriteIds", JSON.stringify(favoriteMethodIds));
  }, [favoriteMethodIds]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: blocks = [],
    isLoading: blocksLoading,
    isError: blocksIsError,
    error: blocksError,
    refetch: refetchBlocks,
  } = useQuery({
    queryKey: ["methods"],
    queryFn: () => api.methods.getAll(),
  });

  const {
    data: chains = [],
    isLoading: chainsLoading,
    isError: chainsIsError,
    error: chainsError,
    refetch: refetchChains,
  } = useQuery({
    queryKey: ["chains"],
    queryFn: () => api.chains.getAll(),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["methods-analytics"],
    queryFn: () => api.methods.analytics(),
    enabled: activeTab === "analytics",
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.getActive(),
    enabled: !!runTarget,
  });

  const { data: runHistory = [] } = useQuery({
    queryKey: ["chain-run-history"],
    queryFn: () => api.chainRun.getHistory(),
    enabled: activeTab === "chains",
  });

  // Mutations
  const createBlockMutation = useMutation({
    mutationFn: api.methods.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      setShowAddBlock(false);
      toast({ title: "Method block created" });
    },
    onError: (error: Error) => {
      toast({ title: "Create failed", description: error.message || "Could not create method block.", variant: "destructive" });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: api.methods.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Method block deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message || "Could not delete method block.", variant: "destructive" });
    },
  });

  const createChainMutation = useMutation({
    mutationFn: api.chains.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      setShowAddChain(false);
      toast({ title: "Chain created" });
    },
    onError: (error: Error) => {
      toast({ title: "Create failed", description: error.message || "Could not create chain.", variant: "destructive" });
    },
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MethodBlock> }) =>
      api.methods.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      setEditingBlock(null);
      toast({ title: "Method block updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message || "Could not update method block.", variant: "destructive" });
    },
  });

  const updateChainMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MethodChain> }) =>
      api.chains.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
      toast({ title: "Chain updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message || "Could not update chain.", variant: "destructive" });
    },
  });

  const deleteChainMutation = useMutation({
    mutationFn: api.chains.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      setSelectedChain(null);
      toast({ title: "Chain deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message || "Could not delete chain.", variant: "destructive" });
    },
  });

  const rateMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { effectiveness: number; engagement: number; notes: string } }) =>
      api.methods.rate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Rating submitted" });
    },
    onError: (error: Error) => {
      toast({ title: "Rating failed", description: error.message || "Could not submit rating.", variant: "destructive" });
    },
  });

  const rateChainMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { effectiveness: number; engagement: number; notes: string } }) =>
      api.chains.rate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Rating submitted" });
    },
    onError: (error: Error) => {
      toast({ title: "Rating failed", description: error.message || "Could not submit rating.", variant: "destructive" });
    },
  });

  // Filter blocks
  const filteredBlocks = blocks.filter((b) => {
    const displayStage = getDisplayStage(b);
    if (stageFilter === "favorites" && !favoriteMethodIds.includes(b.id)) return false;
    if (stageFilter !== "all" && stageFilter !== "favorites" && displayStage !== stageFilter) return false;
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleFavorite = (id: number) => {
    setFavoriteMethodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectChain = async (chain: MethodChain) => {
    try {
      const expanded = await api.chains.getOne(chain.id);
      setSelectedChain(expanded);
    } catch (error) {
      toast({ title: "Failed to load chain", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleRateSubmit = (rating: { effectiveness: number; engagement: number; notes: string }) => {
    if (!ratingTarget) return;
    if (ratingTarget.type === "method") {
      rateMethodMutation.mutate({ id: ratingTarget.id, data: rating });
    } else {
      rateChainMutation.mutate({ id: ratingTarget.id, data: rating });
    }
  };

  const selectedStageLabel =
    stageFilter === "all"
      ? "ALL STAGES"
      : stageFilter === "favorites"
        ? "FAVORITES"
        : DISPLAY_STAGE_LABELS[stageFilter];
  const methodsSidebar = (
    <div className="flex h-full min-h-0 flex-col gap-4 p-3 md:p-4 overflow-auto">
      <div className="space-y-2">
        <div className="font-arcade text-ui-xs uppercase tracking-[0.24em] text-primary/80">
          Workspace
        </div>
        <div className="grid gap-2">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] rounded-[1rem] border px-3 py-2 text-left transition ${
                activeTab === tab.id
                  ? "border-primary/45 bg-primary/12 text-primary shadow-[0_0_18px_rgba(255,86,86,0.12)]"
                  : "border-primary/15 bg-black/20 text-muted-foreground hover:border-primary/30 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="font-arcade text-xs">{tab.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
        <div className="font-arcade text-ui-xs uppercase tracking-[0.24em] text-primary/80">
          Current Focus
        </div>
        <div className="font-terminal text-sm text-white">
          {activeTab === "library" ? "Method block library" : activeTab === "chains" ? "Tutor chains" : "Method analytics"}
        </div>
        <div className="font-terminal text-xs text-muted-foreground">
          {activeTab === "library"
            ? `${filteredBlocks.length} visible block${filteredBlocks.length === 1 ? "" : "s"} in ${selectedStageLabel}.`
            : activeTab === "chains"
              ? `${chains.length} chain${chains.length === 1 ? "" : "s"}, ${chains.filter((chain) => chain.is_template).length} template${chains.filter((chain) => chain.is_template).length === 1 ? "" : "s"}, ${runHistory.length} run${runHistory.length === 1 ? "" : "s"} logged.`
              : "Review usage, ratings, and adoption before changing Tutor defaults."}
        </div>
      </div>

      {activeTab === "library" ? (
        <div className="space-y-2 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
          <div className="font-arcade text-ui-xs uppercase tracking-[0.24em] text-primary/80">
            Stage Filter
          </div>
          <div className="grid gap-2">
            {DISPLAY_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(stage)}
                className={`min-h-[42px] rounded-[0.95rem] border px-3 py-2 text-left transition ${
                  stageFilter === stage
                    ? "border-primary/45 bg-primary/12 text-primary"
                    : "border-primary/15 bg-black/10 text-muted-foreground hover:border-primary/25 hover:text-white"
                }`}
              >
                <div className="font-arcade text-ui-xs">
                  {stage === "all"
                    ? "ALL"
                    : stage === "favorites"
                      ? "FAVORITES"
                      : DISPLAY_STAGE_LABELS[stage]}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "chains" ? (
        <div className="space-y-2 rounded-[1rem] border border-primary/20 bg-black/20 p-3">
          <div className="font-arcade text-ui-xs uppercase tracking-[0.24em] text-primary/80">
            Chain Snapshot
          </div>
          {selectedChain ? (
            <>
              <div className="font-terminal text-sm text-white">{selectedChain.name}</div>
              <div className="font-terminal text-xs text-muted-foreground">
                {(selectedChain.block_ids || []).length} block{(selectedChain.block_ids || []).length === 1 ? "" : "s"}
                {selectedChain.is_template ? " • template" : " • editable"}
              </div>
              {selectedChain.description ? (
                <div className="font-terminal text-xs text-muted-foreground">
                  {selectedChain.description}
                </div>
              ) : null}
            </>
          ) : (
            <div className="font-terminal text-xs text-muted-foreground">
              Select a chain to inspect the sequence, rate it, or launch a run.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
  const methodsCommandBand = (
    <div className="flex flex-col gap-3 p-3 md:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <div className="font-arcade text-xs text-primary">
            {activeTab === "library" ? "Method library" : activeTab === "chains" ? "Chains" : "Analytics"}
          </div>
          <div className="font-terminal text-sm text-muted-foreground">
            {activeTab === "library"
              ? "Search blocks, narrow to the right stage, and keep the catalog clean."
              : activeTab === "chains"
                ? "Review templates, edit chain order, and keep run history visible."
                : "Check the system-level signal before promoting or retiring a method."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "library" ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-[3px] border-double font-arcade text-sm h-10"
              onClick={() => setShowAddBlock(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> ADD BLOCK
            </Button>
          ) : null}
          {activeTab === "chains" ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-[3px] border-double font-arcade text-sm h-10"
              onClick={() => setShowAddChain(true)}
            >
              <Plus className="w-3 h-3 mr-1" /> NEW CHAIN
            </Button>
          ) : null}
        </div>
      </div>

      {activeTab === "library" ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            placeholder="Search methods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full lg:max-w-sm bg-black/40"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs font-terminal text-muted-foreground">
            <span className="rounded-full border border-primary/20 px-2 py-1">{selectedStageLabel}</span>
            <span className="rounded-full border border-primary/20 px-2 py-1">{filteredBlocks.length} visible</span>
            <span className="rounded-full border border-primary/20 px-2 py-1">{favoriteMethodIds.length} favorites</span>
          </div>
        </div>
      ) : null}

      {activeTab === "chains" ? (
        <div className="flex flex-wrap items-center gap-2 text-xs font-terminal text-muted-foreground">
          <span className="rounded-full border border-primary/20 px-2 py-1">{chains.length} chains</span>
          <span className="rounded-full border border-primary/20 px-2 py-1">
            {chains.filter((chain) => chain.is_template).length} templates
          </span>
          <span className="rounded-full border border-primary/20 px-2 py-1">{runHistory.length} recorded runs</span>
        </div>
      ) : null}
    </div>
  );

  return (
      <PageScaffold
        eyebrow="Tutor Support System"
        title="Method Library"
        subtitle="Control the building blocks, chains, and ratings that shape how Tutor teaches, evaluates, and sequences study moves."
        className="mx-auto max-w-7xl"
        contentClassName="space-y-6"
        stats={[
          { label: "Blocks", value: String(blocks.length) },
          { label: "Chains", value: String(chains.length), tone: "info" },
          { label: "Favorites", value: String(favoriteMethodIds.length), tone: "warn" },
          { label: "Runs", value: String(runHistory.length), tone: "success" },
        ]}
      >
        <SupportWorkspaceFrame
          sidebar={methodsSidebar}
          commandBand={methodsCommandBand}
          contentClassName="gap-4"
        >

        {/* Library Tab */}
        {activeTab === "library" && (
          <div className="space-y-4">
            {blocksLoading ? (
              <p className="font-terminal text-base text-muted-foreground">Loading methods...</p>
            ) : blocksIsError ? (
              <MethodsLoadErrorPanel
                title="METHODS FAILED TO LOAD"
                message={getQueryErrorMessage(blocksError, "The method library request failed.")}
                onRetry={() => {
                  void refetchBlocks();
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 card-stagger">
                {filteredBlocks.map((block) => (
                  <div key={block.id} className="relative">
                    <MethodBlockCard block={block} showLegacyCategory />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        className={`inline-flex items-center gap-1 px-2 py-1 border-[3px] border-double transition-colors font-arcade text-ui-2xs tracking-wide ${
                          favoriteMethodIds.includes(block.id)
                            ? "border-warning bg-warning/20 text-warning hover:bg-warning/30"
                            : "border-muted-foreground/40 bg-black/50 text-muted-foreground hover:text-warning hover:border-warning/60 hover:bg-warning/10"
                        }`}
                        onClick={() => toggleFavorite(block.id)}
                        title={favoriteMethodIds.includes(block.id) ? "Remove favorite" : "Add favorite"}
                      >
                        <Star className={`w-3 h-3 ${favoriteMethodIds.includes(block.id) ? "fill-current" : ""}`} />
                        FAV
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 border-[3px] border-double border-primary/40 bg-black/50 text-primary hover:border-primary hover:bg-primary/15 transition-colors font-arcade text-ui-2xs tracking-wide"
                        onClick={() => setRatingTarget({ id: block.id, name: block.name, type: "method" })}
                        title="Rate block"
                      >
                        <BarChart3 className="w-3 h-3" />
                        RATE
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 border-[3px] border-double border-primary/30 bg-black/50 text-muted-foreground hover:text-foreground hover:border-primary/60 hover:bg-primary/10 transition-colors font-arcade text-ui-2xs tracking-wide"
                        onClick={() => setEditingBlock(block)}
                        title="Edit block settings"
                      >
                        <Pencil className="w-3 h-3" />
                        EDIT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!blocksLoading && !blocksIsError && filteredBlocks.length === 0 && (
              <p className="font-terminal text-base text-muted-foreground text-center py-8">
                {stageFilter === "favorites"
                  ? "No favorites yet. Mark blocks with FAV to pin them here."
                  : `No methods found. ${stageFilter !== "all" ? "Try a different category." : "Add your first method block."}`}
              </p>
            )}
          </div>
        )}

        {/* Chains Tab */}
        {activeTab === "chains" && (
          <div className="space-y-4">
            {chainsLoading ? (
              <p className="font-terminal text-base text-muted-foreground">Loading chains...</p>
            ) : chainsIsError ? (
              <MethodsLoadErrorPanel
                title="CHAINS FAILED TO LOAD"
                message={getQueryErrorMessage(chainsError, "The chain library request failed.")}
                onRetry={() => {
                  void refetchChains();
                }}
              />
            ) : chains.length === 0 ? (
              <p className="font-terminal text-base text-muted-foreground text-center py-8">
                No chains yet. Create your first chain to combine method blocks into a study workflow.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chain List */}
                <div className="space-y-2">
                  {chains.map((chain) => (
                    <div
                      key={chain.id}
                      onClick={() => handleSelectChain(chain)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectChain(chain);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedChain?.id === chain.id}
                      className={`border-[3px] border-double p-3 rounded-none cursor-pointer transition-colors ${
                        selectedChain?.id === chain.id
                          ? "border-primary bg-primary/10"
                          : "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-black/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-arcade text-sm">{chain.name}</span>
                        <div className="flex items-center gap-2">
                          {chain.is_template ? (
                            <span className="text-xs font-arcade bg-primary/20 text-primary px-1.5 py-0.5">TEMPLATE</span>
                          ) : null}
                          <button
                            className="p-0.5 hover:text-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRunTarget({ id: chain.id, name: chain.name });
                            }}
                            title="Run chain"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                          <button
                            className="p-0.5 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRatingTarget({ id: chain.id, name: chain.name, type: "chain" });
                            }}
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {chain.description && (
                        <p className="font-terminal text-base text-muted-foreground line-clamp-1">{chain.description}</p>
                      )}
                      <div className="flex gap-1 mt-1.5">
                        {(chain.block_ids || []).length > 0 && (
                          <span className="text-sm font-terminal text-muted-foreground">
                            {(chain.block_ids || []).length} blocks
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chain Detail / Builder */}
                <div className="border-[3px] border-double border-primary/30 bg-black/40 p-4 rounded-none">
                  {selectedChain ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-arcade text-sm text-primary">{selectedChain.name}</span>
                        <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-none border-[3px] border-double border-success text-success font-arcade text-xs h-8"
                              onClick={() => setRunTarget({ id: selectedChain.id, name: selectedChain.name })}
                            >
                              <Play className="w-3 h-3 mr-1" /> RUN
                            </Button>
                          {!selectedChain.is_template && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive rounded-none text-xs font-arcade h-8"
                              onClick={() => {
                                if (confirm(`Delete chain "${selectedChain.name}"?`)) {
                                  deleteChainMutation.mutate(selectedChain.id);
                                }
                              }}
                            >
                              DELETE
                            </Button>
                          )}
                        </div>
                      </div>
                      {selectedChain.description && (
                        <p className="font-terminal text-base text-muted-foreground">{selectedChain.description}</p>
                      )}
                      <ChainBuilder
                        key={selectedChain.id}
                        chain={selectedChain}
                        allBlocks={blocks}
                        readOnly={!!selectedChain.is_template}
                        onSave={(blockIds) => {
                          updateChainMutation.mutate({
                            id: selectedChain.id,
                            data: { block_ids: blockIds },
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <p className="font-terminal text-base text-muted-foreground">
                        Select a chain to view or edit
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Run History */}
            {runHistory.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-arcade text-sm text-muted-foreground">RUN HISTORY</h3>
                <div className="border-[3px] border-double border-primary/30 rounded-none overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-primary/30 bg-black/60">
                        <th className="text-left px-3 py-1.5 font-arcade text-xs text-muted-foreground">CHAIN</th>
                        <th className="text-left px-3 py-1.5 font-arcade text-xs text-muted-foreground">TOPIC</th>
                        <th className="text-left px-3 py-1.5 font-arcade text-xs text-muted-foreground">STATUS</th>
                        <th className="text-left px-3 py-1.5 font-arcade text-xs text-muted-foreground">STEPS</th>
                        <th className="text-left px-3 py-1.5 font-arcade text-xs text-muted-foreground">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runHistory.slice(0, 10).map((run) => (
                        <tr
                          key={run.id}
                          className="border-b border-primary/20 hover:bg-primary/5 cursor-pointer"
                          onClick={async () => {
                            try {
                              const full = await api.chainRun.getOne(run.id);
                              setRunResult(full);
                            } catch (error) {
                              toast({ title: "Failed to load run", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
                            }
                          }}
                        >
                          <td className="px-3 py-1.5 font-terminal text-base">{run.chain_name}</td>
                          <td className="px-3 py-1.5 font-terminal text-base text-muted-foreground">{run.topic}</td>
                          <td className="px-3 py-1.5">
                            <span className={`text-xs font-arcade px-1.5 py-0.5 ${
                              run.status === "completed" ? "bg-success/20 text-success" :
                              run.status === "failed" ? "bg-destructive/20 text-destructive" :
                              "bg-warning/20 text-warning"
                            }`}>
                              {run.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-terminal text-base text-muted-foreground">
                            {run.current_step}/{run.total_steps}
                          </td>
                          <td className="px-3 py-1.5 font-terminal text-base text-muted-foreground">
                            {new Date(run.started_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            {analyticsLoading ? (
              <p className="font-terminal text-base text-muted-foreground">Loading analytics...</p>
            ) : analytics ? (
              <MethodAnalytics data={analytics} />
            ) : (
              <p className="font-terminal text-base text-muted-foreground">Failed to load analytics.</p>
            )}
          </div>
        )}
        </SupportWorkspaceFrame>

        {/* Add Block Dialog */}
        <AddBlockDialog
          open={showAddBlock}
          onClose={() => setShowAddBlock(false)}
          onSubmit={(data) => createBlockMutation.mutate(data)}
        />

        {/* Edit Block Dialog */}
        <EditBlockDialog
          open={!!editingBlock}
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
          onSave={(id, data) => updateBlockMutation.mutate({ id, data })}
          onDelete={(id) => {
            if (confirm(`Delete "${editingBlock?.name || "this block"}"?`)) {
              deleteBlockMutation.mutate(id);
              setEditingBlock(null);
            }
          }}
        />

        {/* Add Chain Dialog */}
        <AddChainDialog
          open={showAddChain}
          onClose={() => setShowAddChain(false)}
          onSubmit={(data) => createChainMutation.mutate(data)}
        />

        {/* Chain Run Dialog */}
        {runTarget && (
          <ChainRunDialog
            open={!!runTarget}
            chainId={runTarget.id}
            chainName={runTarget.name}
            courses={courses}
            onClose={() => setRunTarget(null)}
            onComplete={(result) => {
              setRunResult(result);
              setRunTarget(null);
              queryClient.invalidateQueries({ queryKey: ["chain-run-history"] });
              toast({ title: `${result.chain_name} ${result.status}` });
            }}
          />
        )}

        {/* Run Result Viewer */}
        {runResult && (
          <ChainRunResultDialog
            open={!!runResult}
            result={runResult}
            onClose={() => setRunResult(null)}
          />
        )}

        {/* Rating Dialog */}
        {ratingTarget && (
          <RatingDialog
            open={!!ratingTarget}
            onClose={() => setRatingTarget(null)}
            onSubmit={handleRateSubmit}
            targetName={ratingTarget.name}
            targetType={ratingTarget.type}
          />
        )}
      </PageScaffold>
  );
}

// ---------------------------------------------------------------------------
// Add Block Dialog
// ---------------------------------------------------------------------------
function AddBlockDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MethodBlock, "id" | "created_at">) => void;
}) {
  const idBase = useId();
  const [state, updateState] = useReducer(
    addBlockDialogReducer,
    undefined,
    createAddBlockDialogState,
  );
  // Control Plane categories (CP-MSS v2.0)
  const categoryOptions: MethodCategory[] = [
    "PRIME",
    "TEACH",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
  ];

  const handleSubmit = () => {
    if (!state.name.trim()) return;
    onSubmit({
      name: state.name.trim(),
      category: state.category,
      description: state.description.trim() || null,
      default_duration_min: state.duration,
      energy_cost: state.energyCost,
      best_stage: state.bestStage || null,
      tags: [],
      evidence: null,
    });
    updateState(createAddBlockDialogState());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
        <DialogTitle className="font-arcade text-sm text-primary">NEW METHOD BLOCK</DialogTitle>
        <DialogDescription className="sr-only">Create a new method block</DialogDescription>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Method name"
            value={state.name}
            onChange={(e) => updateState({ name: e.target.value })}
            className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
          />
          <select
            value={state.category}
            onChange={(e) => updateState({ category: e.target.value as MethodCategory })}
            className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c} className="bg-black text-white">
                {c}
              </option>
            ))}
          </select>
          <Textarea
            placeholder="Description (optional)"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            className="h-16 rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${idBase}-add-duration`} className="font-arcade text-xs text-muted-foreground">DURATION</label>
              <Input
                id={`${idBase}-add-duration`}
                type="number"
                value={state.duration}
                onChange={(e) => updateState({ duration: Number(e.target.value) })}
                className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
              />
            </div>
            <div>
              <label htmlFor={`${idBase}-add-energy`} className="font-arcade text-xs text-muted-foreground">ENERGY</label>
              <select
                id={`${idBase}-add-energy`}
                value={state.energyCost}
                onChange={(e) => updateState({ energyCost: e.target.value })}
                className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {["low", "medium", "high"].map((e) => (
                  <option key={e} value={e} className="bg-black text-white">
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`${idBase}-add-best-stage`} className="font-arcade text-xs text-muted-foreground">BEST STAGE</label>
            <select
              id={`${idBase}-add-best-stage`}
              value={state.bestStage}
              onChange={(e) => updateState({ bestStage: e.target.value })}
              className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" className="bg-black text-white">Any</option>
              <option value="first_exposure" className="bg-black text-white">First Exposure</option>
              <option value="review" className="bg-black text-white">Review</option>
              <option value="exam_prep" className="bg-black text-white">Exam Prep</option>
              <option value="consolidation" className="bg-black text-white">Consolidation</option>
            </select>
          </div>
          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleSubmit}
            disabled={!state.name.trim()}
          >
            CREATE BLOCK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Chain Dialog
// ---------------------------------------------------------------------------
function AddChainDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MethodChain, "id" | "created_at" | "blocks">) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      block_ids: [],
      context_tags: {},
      is_template: 0,
    });
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
        <DialogTitle className="font-arcade text-sm text-primary">NEW CHAIN</DialogTitle>
        <DialogDescription className="sr-only">Create a new method chain</DialogDescription>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Chain name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-16 rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base resize-none"
          />
          <p className="font-terminal text-sm text-muted-foreground">
            Add blocks to the chain after creating it.
          </p>
          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            CREATE CHAIN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Block Dialog
// ---------------------------------------------------------------------------
function EditBlockDialog({
  open,
  block,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  block: MethodBlock | null;
  onClose: () => void;
  onSave: (id: number, data: Partial<MethodBlock>) => void;
  onDelete: (id: number) => void;
}) {
  const idBase = useId();
  const [state, updateState] = useReducer(
    editBlockDialogReducer,
    undefined,
    createEditBlockDialogState,
  );

  const categoryOptions: MethodCategory[] = [
    "PRIME",
    "TEACH",
    "CALIBRATE",
    "ENCODE",
    "REFERENCE",
    "RETRIEVE",
    "OVERLEARN",
  ];
  const categoryLabel: Record<string, string> = {
    PRIME: "PRIMING",
    TEACH: "TEACH",
    CALIBRATE: "CALIBRATE",
    ENCODE: "ENCODING",
    REFERENCE: "REFERENCE",
    RETRIEVE: "RETRIEVAL",
    OVERLEARN: "OVERLEARNING",
  };

  useEffect(() => {
    if (!block) return;
    updateState(hydrateEditBlockDialogState(block));
  }, [block]);

  const handleSave = () => {
    if (!block || !state.name.trim()) return;
    let parsedKnobs: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(state.knobsJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        updateState({ knobError: "Knobs must be a JSON object." });
        return;
      }
      parsedKnobs = parsed as Record<string, unknown>;
      updateState({ knobError: null });
    } catch {
      updateState({ knobError: "Invalid knobs JSON. Fix syntax before saving." });
      return;
    }
    onSave(block.id, {
      name: state.name.trim(),
      category: state.category,
      description: state.description.trim() || null,
      default_duration_min: state.duration,
      energy_cost: state.energyCost,
      best_stage: state.bestStage || null,
      facilitation_prompt: state.facilitationPrompt.trim() || null,
      knobs: parsedKnobs,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`bg-black border-[3px] border-double border-primary rounded-none ${state.fullScreenText ? "max-w-[96vw] w-[96vw] h-[92vh]" : "max-w-lg"}`}>
        <div className="flex items-center justify-between">
          <DialogTitle className="font-arcade text-sm text-primary">EDIT METHOD BLOCK</DialogTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 rounded-none border-[3px] border-double font-arcade text-ui-2xs"
            onClick={() => updateState({ fullScreenText: !state.fullScreenText })}
          >
            {state.fullScreenText ? "EXIT FULL" : "FULL TEXT"}
          </Button>
        </div>
        <DialogDescription className="sr-only">Edit method block settings</DialogDescription>
        <div className={`space-y-3 mt-2 ${state.fullScreenText ? "h-[calc(92vh-7rem)] overflow-y-auto pr-1" : ""}`}>
          <Input
            placeholder="Method name"
            value={state.name}
            onChange={(e) => updateState({ name: e.target.value })}
            className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
          />
          <select
            value={state.category}
            onChange={(e) => updateState({ category: e.target.value as MethodCategory })}
            className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c} className="bg-black text-white">
                {categoryLabel[c]}
              </option>
            ))}
          </select>
          <Textarea
            placeholder="Description"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            className={`${state.fullScreenText ? "h-32" : "h-16"} rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base resize-y`}
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={`${idBase}-edit-tutor-prompt`} className="font-arcade text-xs text-muted-foreground">TUTOR PROMPT</label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                className="h-6 px-2 rounded-none border-[3px] border-double font-arcade text-ui-2xs"
                onClick={() => updateState({ facilitationPrompt: block?.facilitation_prompt ?? "" })}
              >
                UNDO EDITS
              </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 rounded-none border-[3px] border-double border-warning/50 text-warning font-arcade text-ui-2xs"
                  disabled={state.templateLoading || !block}
                  onClick={async () => {
                    if (!block) return;
                    updateState({ templateLoading: true });
                    try {
                      const res = await api.methods.getTemplatePrompt(block.id);
                      updateState({ facilitationPrompt: res.facilitation_prompt });
                    } catch {
                      // Silently fall back to current DB value if API unavailable
                      updateState({ facilitationPrompt: block.facilitation_prompt ?? "" });
                    } finally {
                      updateState({ templateLoading: false });
                    }
                  }}
                >
                  {state.templateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-0.5" />}
                  RESET TO TEMPLATE
                </Button>
              </div>
            </div>
            <Textarea
              id={`${idBase}-edit-tutor-prompt`}
              placeholder="Facilitation prompt used by the tutor for this method..."
              value={state.facilitationPrompt}
              onChange={(e) => updateState({ facilitationPrompt: e.target.value })}
              className={`${state.fullScreenText ? "h-[42vh]" : "h-32"} rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-sm resize-y`}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={`${idBase}-edit-knobs`} className="font-arcade text-xs text-muted-foreground">KNOBS JSON</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 rounded-none border-[3px] border-double font-arcade text-ui-2xs"
                onClick={() => {
                  updateState({
                    knobsJson: JSON.stringify(block?.knobs ?? {}, null, 2),
                    knobError: null,
                  });
                }}
              >
                RESET KNOBS
              </Button>
            </div>
            <Textarea
              id={`${idBase}-edit-knobs`}
              placeholder="Per-method knobs JSON (validated on save)"
              value={state.knobsJson}
              onChange={(e) => {
                updateState({
                  knobsJson: e.target.value,
                  knobError: null,
                });
              }}
              className={`${state.fullScreenText ? "h-40" : "h-28"} rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-xs resize-y`}
            />
            {state.knobError && (
              <p className="mt-1 font-terminal text-xs text-destructive">{state.knobError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${idBase}-edit-duration`} className="font-arcade text-xs text-muted-foreground">DURATION</label>
              <Input
                id={`${idBase}-edit-duration`}
                type="number"
                value={state.duration}
                onChange={(e) => updateState({ duration: Number(e.target.value) })}
                className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
              />
            </div>
            <div>
              <label htmlFor={`${idBase}-edit-energy`} className="font-arcade text-xs text-muted-foreground">ENERGY</label>
              <select
                id={`${idBase}-edit-energy`}
                value={state.energyCost}
                onChange={(e) => updateState({ energyCost: e.target.value })}
                className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {["low", "medium", "high"].map((e) => (
                  <option key={e} value={e} className="bg-black text-white">
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`${idBase}-edit-best-stage`} className="font-arcade text-xs text-muted-foreground">BEST STAGE</label>
            <select
              id={`${idBase}-edit-best-stage`}
              value={state.bestStage}
              onChange={(e) => updateState({ bestStage: e.target.value })}
              className="h-9 w-full rounded-none border-2 border-primary/40 bg-black/60 px-3 py-2 font-terminal text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" className="bg-black text-white">Any</option>
              <option value="first_exposure" className="bg-black text-white">First Exposure</option>
              <option value="review" className="bg-black text-white">Review</option>
              <option value="exam_prep" className="bg-black text-white">Exam Prep</option>
              <option value="consolidation" className="bg-black text-white">Consolidation</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full font-arcade rounded-none text-xs border-[3px] border-double border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => block && onDelete(block.id)}
            >
              DELETE
            </Button>
            <Button
              className="w-full font-arcade rounded-none text-xs"
              onClick={handleSave}
              disabled={!state.name.trim()}
            >
              SAVE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Chain Run Dialog
// ---------------------------------------------------------------------------
interface CourseItem {
  id: number;
  name: string;
}

function ChainRunDialog({
  open,
  chainId,
  chainName,
  courses,
  onClose,
  onComplete,
}: {
  open: boolean;
  chainId: number;
  chainName: string;
  courses: CourseItem[];
  onClose: () => void;
  onComplete: (result: ChainRunResult) => void;
}) {
  const idBase = useId();
  const [state, updateState] = useReducer(
    chainRunDialogReducer,
    undefined,
    createChainRunDialogState,
  );

  const handleStart = async () => {
    if (!state.topic.trim()) return;
    updateState({ running: true, error: null });
    try {
      const result = await api.chainRun.start({
        chain_id: chainId,
        topic: state.topic.trim(),
        course_id: state.courseId && state.courseId !== "__none__" ? Number(state.courseId) : undefined,
        options: { write_obsidian: state.writeObsidian, draft_cards: state.draftCards },
      });
      onComplete(result);
    } catch (e) {
      updateState({
        error: e instanceof Error ? e.message : "Chain run failed",
        running: false,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !state.running && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
        <DialogTitle className="font-arcade text-sm text-primary">
          RUN: {chainName}
        </DialogTitle>
        <DialogDescription className="sr-only">Configure and run a method chain</DialogDescription>
        <div className="space-y-3 mt-2">
          <div>
            <label htmlFor={`${idBase}-run-topic`} className="font-arcade text-xs text-muted-foreground">TOPIC</label>
            <Input
              id={`${idBase}-run-topic`}
              placeholder="e.g., Glenohumeral Joint Ligaments"
              value={state.topic}
              onChange={(e) => updateState({ topic: e.target.value })}
              disabled={state.running}
              className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
            />
          </div>
          <div>
            <label htmlFor={`${idBase}-run-course`} className="font-arcade text-xs text-muted-foreground">COURSE (OPTIONAL)</label>
            <Select value={state.courseId} onValueChange={(courseId) => updateState({ courseId })} disabled={state.running}>
              <SelectTrigger id={`${idBase}-run-course`} className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="bg-black border-2 border-primary rounded-none">
                <SelectItem value="__none__" className="font-terminal text-sm text-muted-foreground">
                  None
                </SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-terminal text-sm">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 font-terminal text-base cursor-pointer">
              <input
                type="checkbox"
                checked={state.writeObsidian}
                onChange={(e) => updateState({ writeObsidian: e.target.checked })}
                disabled={state.running}
                className="accent-primary"
              />
              Write to Obsidian
            </label>
            <label className="flex items-center gap-2 font-terminal text-base cursor-pointer">
              <input
                type="checkbox"
                checked={state.draftCards}
                onChange={(e) => updateState({ draftCards: e.target.checked })}
                disabled={state.running}
                className="accent-primary"
              />
              Draft Anki cards
            </label>
          </div>
          {state.error && (
            <p className="font-terminal text-base text-destructive">{state.error}</p>
          )}
          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleStart}
            disabled={!state.topic.trim() || state.running}
          >
            {state.running ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                RUNNING...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" /> START
              </>
            )}
          </Button>
          {state.running && (
            <p className="font-terminal text-sm text-muted-foreground text-center">
              This may take 15-45 seconds depending on chain length.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Chain Run Result Dialog
// ---------------------------------------------------------------------------
function ChainRunResultDialog({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: ChainRunResult;
  onClose: () => void;
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const metrics = result.artifacts?.metrics;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="font-arcade text-sm text-primary flex items-center gap-2">
          {result.chain_name} RESULTS
          <span className={`text-xs px-1.5 py-0.5 ${
            result.status === "completed" ? "bg-success/20 text-success" :
            "bg-destructive/20 text-destructive"
          }`}>
            {result.status.toUpperCase()}
          </span>
        </DialogTitle>
        <DialogDescription className="sr-only">Chain run results</DialogDescription>

        {/* Metrics Summary */}
        {metrics && (
          <div className="flex gap-4 mt-2">
            <div className="border border-primary/30 px-3 py-1.5 bg-black/60">
              <span className="font-arcade text-xs text-muted-foreground block">DURATION</span>
              <span className="font-terminal text-sm">{(metrics.total_duration_ms / 1000).toFixed(1)}s</span>
            </div>
            <div className="border border-primary/30 px-3 py-1.5 bg-black/60">
              <span className="font-arcade text-xs text-muted-foreground block">STEPS</span>
              <span className="font-terminal text-sm">{metrics.steps_completed}</span>
            </div>
            <div className="border border-primary/30 px-3 py-1.5 bg-black/60">
              <span className="font-arcade text-xs text-muted-foreground block">CARDS</span>
              <span className="font-terminal text-sm">{metrics.cards_drafted}</span>
            </div>
            {result.artifacts?.obsidian_path && (
              <div className="border border-primary/30 px-3 py-1.5 bg-black/60">
                <span className="font-arcade text-xs text-muted-foreground block">OBSIDIAN</span>
                <span className="font-terminal text-sm text-success">saved</span>
              </div>
            )}
          </div>
        )}

        {/* Step Outputs */}
        <div className="space-y-2 mt-3">
          {result.steps.map((step) => (
            <div key={step.step} className="border border-primary/30 rounded-none">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary/5 text-left"
                onClick={() => toggleStep(step.step)}
              >
                {expandedSteps.has(step.step) ? (
                  <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className="font-arcade text-xs text-primary">{step.step}.</span>
                <span className="font-terminal text-base">{step.method_name}</span>
                <span className="ml-auto font-terminal text-sm text-muted-foreground">
                  {step.category} | {(step.duration_ms / 1000).toFixed(1)}s
                </span>
              </button>
              {expandedSteps.has(step.step) && (
                <div className="px-3 pb-3 border-t border-primary/20">
                  <pre className="font-terminal text-base text-muted-foreground whitespace-pre-wrap mt-2 leading-relaxed">
                    {step.output}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {result.error && (
          <div className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2">
            <span className="font-arcade text-xs text-destructive">ERROR: </span>
            <span className="font-terminal text-base text-destructive/80">{result.error}</span>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full mt-3 font-arcade rounded-none text-xs"
          onClick={onClose}
        >
          CLOSE
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function MethodsPage() {
  return useMethodsPageController();
}
