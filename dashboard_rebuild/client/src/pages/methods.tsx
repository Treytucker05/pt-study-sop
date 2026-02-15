import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Blocks, Link2, BarChart3, Plus, Star, Play, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout";
import MethodBlockCard from "@/components/MethodBlockCard";
import ChainBuilder from "@/components/ChainBuilder";
import MethodAnalytics from "@/components/MethodAnalytics";
import RatingDialog from "@/components/RatingDialog";
import { api } from "@/lib/api";
import { DISPLAY_STAGE_LABELS, getDisplayStage, type DisplayStage } from "@/lib/displayStage";
import type { MethodBlock, MethodChain, MethodChainExpanded, ChainRunResult, ChainRunSummary } from "@/api";

const DISPLAY_STAGES: Array<DisplayStage | "all"> = [
  "all",
  "priming",
  "encoding",
  "reference",
  "retrieval",
  "overlearning",
];

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  prepare: "Prepare",
  encode: "Encode",
  interrogate: "Interrogate",
  retrieve: "Retrieve",
  refine: "Refine",
  overlearn: "Overlearn",
};

const TAB_ITEMS = [
  { id: "library", label: "LIBRARY", icon: Blocks },
  { id: "chains", label: "CHAINS", icon: Link2 },
  { id: "analytics", label: "ANALYTICS", icon: BarChart3 },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

export default function MethodsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("library");
  const [stageFilter, setStageFilter] = useState<DisplayStage | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAddChain, setShowAddChain] = useState(false);
  const [selectedChain, setSelectedChain] = useState<MethodChainExpanded | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ id: number; name: string; type: "method" | "chain" } | null>(null);
  const [runTarget, setRunTarget] = useState<{ id: number; name: string } | null>(null);
  const [runResult, setRunResult] = useState<ChainRunResult | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["methods"],
    queryFn: () => api.methods.getAll(),
  });

  const { data: chains = [], isLoading: chainsLoading } = useQuery({
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
  });

  const deleteBlockMutation = useMutation({
    mutationFn: api.methods.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods"] });
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Method block deleted" });
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
  });

  const updateChainMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MethodChain> }) =>
      api.chains.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chains"] });
      toast({ title: "Chain updated" });
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
  });

  const rateMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { effectiveness: number; engagement: number; notes: string } }) =>
      api.methods.rate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Rating submitted" });
    },
  });

  const rateChainMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { effectiveness: number; engagement: number; notes: string } }) =>
      api.chains.rate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["methods-analytics"] });
      toast({ title: "Rating submitted" });
    },
  });

  // Filter blocks
  const filteredBlocks = blocks.filter((b) => {
    const displayStage = getDisplayStage(b);
    if (stageFilter !== "all" && displayStage !== stageFilter) return false;
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSelectChain = async (chain: MethodChain) => {
    const expanded = await api.chains.getOne(chain.id);
    setSelectedChain(expanded);
  };

  const handleRateSubmit = (rating: { effectiveness: number; engagement: number; notes: string }) => {
    if (!ratingTarget) return;
    if (ratingTarget.type === "method") {
      rateMethodMutation.mutate({ id: ratingTarget.id, data: rating });
    } else {
      rateChainMutation.mutate({ id: ratingTarget.id, data: rating });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-arcade text-xl text-primary">METHOD_LIBRARY</h1>
            <p className="font-terminal text-base text-muted-foreground">
              Composable study methods — build, chain, rate, optimize
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b-2 border-primary/30 pb-0">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 font-arcade text-sm border-b-2 -mb-[2px] transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Library Tab */}
        {activeTab === "library" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search methods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-black/40"
              />
              <div className="flex gap-1">
                {DISPLAY_STAGES.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setStageFilter(stage)}
                      className={`px-3 py-1.5 font-arcade text-xs border-[3px] border-double rounded-none transition-colors ${
                        stageFilter === stage
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 hover:bg-black/30"
                      }`}
                    >
                    {stage === "all" ? "ALL" : DISPLAY_STAGE_LABELS[stage]}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto rounded-none border-[3px] border-double font-arcade text-sm h-10"
                onClick={() => setShowAddBlock(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> ADD BLOCK
              </Button>
            </div>

            {blocksLoading ? (
              <p className="font-terminal text-base text-muted-foreground">Loading methods...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 card-stagger">
                {filteredBlocks.map((block) => (
                  <div key={block.id} className="relative group">
                    <MethodBlockCard block={block} showLegacyCategory />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        className="p-1 bg-black/80 border border-primary/40 hover:border-primary"
                        onClick={() => setRatingTarget({ id: block.id, name: block.name, type: "method" })}
                        title="Rate"
                      >
                        <Star className="w-3 h-3 text-primary" />
                      </button>
                      <button
                        className="p-1 bg-black/80 border border-destructive/40 hover:border-destructive text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${block.name}"?`)) deleteBlockMutation.mutate(block.id);
                        }}
                        title="Delete"
                      >
                        <span className="text-xs">x</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!blocksLoading && filteredBlocks.length === 0 && (
              <p className="font-terminal text-base text-muted-foreground text-center py-8">
                No methods found. {stageFilter !== "all" ? "Try a different category." : "Add your first method block."}
              </p>
            )}
          </div>
        )}

        {/* Chains Tab */}
        {activeTab === "chains" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-arcade text-sm text-muted-foreground">
                {chains.length} CHAINS ({chains.filter((c) => c.is_template).length} templates)
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none border-[3px] border-double font-arcade text-sm h-10"
                onClick={() => setShowAddChain(true)}
              >
                <Plus className="w-3 h-3 mr-1" /> NEW CHAIN
              </Button>
            </div>

            {chainsLoading ? (
              <p className="font-terminal text-base text-muted-foreground">Loading chains...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chain List */}
                <div className="space-y-2">
                  {chains.map((chain) => (
                    <div
                      key={chain.id}
                      onClick={() => handleSelectChain(chain)}
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
                            const full = await api.chainRun.getOne(run.id);
                            setRunResult(full);
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

        {/* Add Block Dialog */}
        <AddBlockDialog
          open={showAddBlock}
          onClose={() => setShowAddBlock(false)}
          onSubmit={(data) => createBlockMutation.mutate(data)}
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
      </div>
    </Layout>
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
  const [name, setName] = useState("");
  const [category, setCategory] = useState("prepare");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(5);
  const [energyCost, setEnergyCost] = useState("medium");
  const [bestStage, setBestStage] = useState("");
  const categoryOptions = [
    "prepare",
    "encode",
    "interrogate",
    "retrieve",
    "refine",
    "overlearn",
  ];

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      description: description.trim() || null,
      default_duration_min: duration,
      energy_cost: energyCost,
      best_stage: bestStage || null,
      tags: [],
    });
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
        <DialogTitle className="font-arcade text-sm text-primary">NEW METHOD BLOCK</DialogTitle>
        <DialogDescription className="sr-only">Create a new method block</DialogDescription>
        <div className="space-y-3 mt-2">
          <Input
            placeholder="Method name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-2 border-primary rounded-none">
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c} className="font-terminal text-sm">
                  {LEGACY_CATEGORY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-16 rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base resize-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-arcade text-xs text-muted-foreground">DURATION</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
              />
            </div>
            <div>
              <label className="font-arcade text-xs text-muted-foreground">ENERGY</label>
              <Select value={energyCost} onValueChange={setEnergyCost}>
                <SelectTrigger className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-2 border-primary rounded-none">
                  {["low", "medium", "high"].map((e) => (
                    <SelectItem key={e} value={e} className="font-terminal text-sm">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-arcade text-xs text-muted-foreground">BEST STAGE</label>
              <Select value={bestStage} onValueChange={setBestStage}>
                <SelectTrigger className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent className="bg-black border-2 border-primary rounded-none">
                  <SelectItem value="first_exposure" className="font-terminal text-sm">First Exposure</SelectItem>
                  <SelectItem value="review" className="font-terminal text-sm">Review</SelectItem>
                  <SelectItem value="exam_prep" className="font-terminal text-sm">Exam Prep</SelectItem>
                  <SelectItem value="consolidation" className="font-terminal text-sm">Consolidation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleSubmit}
            disabled={!name.trim()}
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
  const [topic, setTopic] = useState("");
  const [courseId, setCourseId] = useState<string>("");
  const [writeObsidian, setWriteObsidian] = useState(true);
  const [draftCards, setDraftCards] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!topic.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const result = await api.chainRun.start({
        chain_id: chainId,
        topic: topic.trim(),
        course_id: courseId ? Number(courseId) : undefined,
        options: { write_obsidian: writeObsidian, draft_cards: draftCards },
      });
      onComplete(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chain run failed");
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !running && onClose()}>
      <DialogContent className="bg-black border-[3px] border-double border-primary rounded-none max-w-md">
        <DialogTitle className="font-arcade text-sm text-primary">
          RUN: {chainName}
        </DialogTitle>
        <DialogDescription className="sr-only">Configure and run a method chain</DialogDescription>
        <div className="space-y-3 mt-2">
          <div>
            <label className="font-arcade text-xs text-muted-foreground">TOPIC</label>
            <Input
              placeholder="e.g., Glenohumeral Joint Ligaments"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={running}
              className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base"
            />
          </div>
          <div>
            <label className="font-arcade text-xs text-muted-foreground">COURSE (OPTIONAL)</label>
            <Select value={courseId} onValueChange={setCourseId} disabled={running}>
              <SelectTrigger className="rounded-none border-2 border-primary/40 bg-black/60 font-terminal text-base">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="bg-black border-2 border-primary rounded-none">
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
                checked={writeObsidian}
                onChange={(e) => setWriteObsidian(e.target.checked)}
                disabled={running}
                className="accent-primary"
              />
              Write to Obsidian
            </label>
            <label className="flex items-center gap-2 font-terminal text-base cursor-pointer">
              <input
                type="checkbox"
                checked={draftCards}
                onChange={(e) => setDraftCards(e.target.checked)}
                disabled={running}
                className="accent-primary"
              />
              Draft Anki cards
            </label>
          </div>
          {error && (
            <p className="font-terminal text-base text-destructive">{error}</p>
          )}
          <Button
            className="w-full font-arcade rounded-none text-xs"
            onClick={handleStart}
            disabled={!topic.trim() || running}
          >
            {running ? (
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
          {running && (
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
