import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Shield, Bot, FileText, Check, X, Terminal, Plus, Trash2, Loader2, MessageSquare, ChevronDown, ChevronRight, RefreshCw, Clock, AlertTriangle, BookOpen, Zap, History } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiRequest } from "@/lib/api";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { InsertProposal } from "@shared/schema";

// Types for Scholar API responses
interface ScholarQuestion {
  question: string;
  context?: string;
  source_file?: string;
}

interface AnsweredQuestion {
  question: string;
  answer: string;
}

interface ScholarProposal {
  id: string;
  title: string;
  type?: string;
  status: string;
  source_file?: string;
}

interface CoverageItem {
  name: string;
  status: string;
  last_updated?: string;
}

interface NextStep {
  text: string;
  action?: string;
  action_label?: string;
}

interface ScholarStats {
  status: string;
  last_updated?: string;
  safe_mode: boolean;
  multi_agent_enabled: boolean;
  multi_agent_max_concurrency: number;
  questions: ScholarQuestion[];
  answered_questions: AnsweredQuestion[];
  proposals: ScholarProposal[];
  proposal_counts: { pending: number; approved: number; rejected: number };
  coverage: { complete: number; in_progress: number; not_started: number; stale: number; items: CoverageItem[] };
  research_topics: string[];
  gaps: string[];
  improvements: string[];
  next_steps: NextStep[];
  latest_run?: string;
}

interface RalphSummary {
  ok: boolean;
  prd?: {
    branch?: string;
    project?: string;
    total?: number;
    passed?: number;
    failing?: number;
    next_failing?: string;
  };
  progress?: {
    started?: string;
    entries?: number;
    latest_story?: string;
  };
  latest_summary?: {
    file?: string;
    content?: string;
  };
  error?: string;
}

interface SavedDigest {
  id: number;
  digest_type: string;
  created_at: string;
  summary?: string;
}

// Scholar-specific API calls
const scholarApi = {
  getStats: () => apiRequest<ScholarStats>("/scholar"),
  runScholar: () => apiRequest<{ success: boolean; message: string }>("/scholar/run", { method: "POST" }),
  generateDigest: () => apiRequest<{ ok: boolean; digest?: string; error?: string }>("/scholar/digest"),
  getStatus: () => apiRequest<{ running: boolean; status: string }>("/scholar/status"),
  getLogs: () => apiRequest<{ logs: string[] }>("/scholar/logs"),
  getRalph: () => apiRequest<RalphSummary>("/scholar/ralph"),
  getDigests: () => apiRequest<SavedDigest[]>("/scholar/digests"),
  getDigest: (id: number) => apiRequest<{ id: number; content: string; created_at: string }>(`/scholar/digests/${id}`),
  deleteDigest: (id: number) => apiRequest<void>(`/scholar/digests/${id}`, { method: "DELETE" }),
  getProposalSheet: () => apiRequest<{ ok: boolean; counts?: { total?: number; drift?: number; missing?: number }; generated?: string; content?: string; path?: string }>("/scholar/proposal-sheet"),
  rebuildProposalSheet: () => apiRequest<{ ok: boolean; message?: string }>("/scholar/proposal-sheet/rebuild", { method: "POST" }),
};

export default function Scholar() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDigest, setSelectedDigest] = useState<number | null>(null);
  const [digestContent, setDigestContent] = useState<string>("");
  const [showAnswered, setShowAnswered] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [formData, setFormData] = useState<InsertProposal>({
    proposalId: "",
    summary: "",
    status: "DRAFT",
    priority: "MED",
    targetSystem: "",
    evidence: null,
  });

  // Fetch Scholar stats (main data)
  const { data: scholarStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["scholarStats"],
    queryFn: scholarApi.getStats,
    refetchInterval: 30000,
  });

  // Fetch Scholar status (running/idle)
  const { data: scholarStatus } = useQuery({
    queryKey: ["scholarStatus"],
    queryFn: scholarApi.getStatus,
    refetchInterval: 5000,
  });

  // Fetch Ralph summary
  const { data: ralphData, isLoading: ralphLoading, refetch: refetchRalph } = useQuery({
    queryKey: ["ralphSummary"],
    queryFn: scholarApi.getRalph,
  });

  // Fetch saved digests
  const { data: savedDigests = [], refetch: refetchDigests } = useQuery({
    queryKey: ["savedDigests"],
    queryFn: scholarApi.getDigests,
  });

  // Fetch proposal sheet
  const { data: proposalSheet, refetch: refetchProposalSheet } = useQuery({
    queryKey: ["proposalSheet"],
    queryFn: scholarApi.getProposalSheet,
  });

  // Fetch proposals (from adapter)
  const { data: proposals = [], isLoading: proposalsLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.proposals.getAll,
  });

  // Mutations
  const runScholarMutation = useMutation({
    mutationFn: scholarApi.runScholar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarStatus"] });
      queryClient.invalidateQueries({ queryKey: ["scholarStats"] });
    },
  });

  const generateDigestMutation = useMutation({
    mutationFn: scholarApi.generateDigest,
    onSuccess: (data) => {
      if (data.ok && data.digest) {
        setDigestContent(data.digest);
      }
      queryClient.invalidateQueries({ queryKey: ["savedDigests"] });
    },
  });

  const rebuildProposalSheetMutation = useMutation({
    mutationFn: scholarApi.rebuildProposalSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalSheet"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: api.proposals.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setIsDialogOpen(false);
      setFormData({
        proposalId: "",
        summary: "",
        status: "DRAFT",
        priority: "MED",
        targetSystem: "",
        evidence: null,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProposal> }) => 
      api.proposals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.proposals.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const deleteDigestMutation = useMutation({
    mutationFn: scholarApi.deleteDigest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedDigests"] });
      setSelectedDigest(null);
    },
  });

  const handleSubmit = () => {
    if (formData.proposalId && formData.summary) {
      createMutation.mutate(formData);
    }
  };

  const generateProposalId = () => {
    const num = proposals.length + 101;
    return `P-${num}`;
  };

  const viewDigest = async (id: number) => {
    setSelectedDigest(id);
    try {
      const data = await scholarApi.getDigest(id);
      setDigestContent(data.content);
    } catch {
      setDigestContent("Failed to load digest");
    }
  };

  const questions = scholarStats?.questions || [];
  const answeredQuestions = scholarStats?.answered_questions || [];
  const coverage = scholarStats?.coverage || { complete: 0, in_progress: 0, not_started: 0, stale: 0, items: [] };
  const nextSteps = scholarStats?.next_steps || [];
  const gaps = scholarStats?.gaps || [];
  const improvements = scholarStats?.improvements || [];

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Status Bar */}
        <Card className="bg-black/40 border-2 border-secondary rounded-none">
          <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-arcade">STATUS:</span>
                <Badge variant="outline" className={`rounded-none ${scholarStatus?.running ? 'border-primary text-primary' : 'border-secondary'}`}>
                  {scholarStatus?.running ? "RUNNING" : scholarStats?.status?.toUpperCase() || "IDLE"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">SAFE_MODE:</span>
                <Switch checked={scholarStats?.safe_mode} disabled className="scale-75" />
              </div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">MULTI_AGENT:</span>
                <Switch checked={scholarStats?.multi_agent_enabled} disabled className="scale-75" />
                {scholarStats?.multi_agent_enabled && (
                  <span className="text-xs text-muted-foreground">(max {scholarStats?.multi_agent_max_concurrency})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">UPDATED:</span>
                <span className="text-xs">{scholarStats?.last_updated || "Never"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-none font-arcade text-xs" onClick={() => refetchStats()}>
                <RefreshCw className="w-3 h-3 mr-1" /> REFRESH
              </Button>
              <Button 
                size="sm" 
                className="rounded-none font-arcade text-xs bg-primary text-black"
                onClick={() => runScholarMutation.mutate()}
                disabled={runScholarMutation.isPending || scholarStatus?.running}
              >
                {runScholarMutation.isPending || scholarStatus?.running ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                {scholarStatus?.running ? "RUNNING..." : "RUN_SCHOLAR"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            
            {/* Next Steps */}
            <Card className="bg-primary/5 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/30 p-4">
                <CardTitle className="font-arcade text-sm text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4" /> NEXT_STEPS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {nextSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending actions.</p>
                ) : (
                  nextSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold">{i + 1})</span>
                      <span className="flex-1">{step.text}</span>
                      {step.action_label && (
                        <Button size="sm" variant="outline" className="rounded-none text-xs h-6 px-2">
                          {step.action_label}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Questions Section */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> QUESTIONS
                  <Badge variant="outline" className="rounded-none ml-auto">{questions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending questions.</p>
                ) : (
                  questions.map((q, i) => (
                    <div key={i} className="p-3 bg-black/40 border border-secondary rounded">
                      <p className="text-sm font-medium mb-2">{q.question}</p>
                      {q.context && <p className="text-xs text-muted-foreground mb-2">{q.context}</p>}
                      <Textarea 
                        placeholder="Type your answer..."
                        className="rounded-none bg-black/40 border-secondary text-sm min-h-[60px] mb-2"
                        value={questionAnswers[i] || ""}
                        onChange={(e) => setQuestionAnswers({...questionAnswers, [i]: e.target.value})}
                      />
                      <Button size="sm" className="rounded-none font-arcade text-xs bg-primary text-black">
                        SUBMIT_ANSWER
                      </Button>
                    </div>
                  ))
                )}
                
                {/* Answered Questions (Collapsible) */}
                {answeredQuestions.length > 0 && (
                  <Collapsible open={showAnswered} onOpenChange={setShowAnswered}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white w-full">
                      {showAnswered ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Check className="w-4 h-4 text-green-500" />
                      Answered ({answeredQuestions.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {answeredQuestions.map((aq, i) => (
                        <div key={i} className="p-2 bg-green-500/10 border border-green-500/30 rounded text-sm">
                          <p className="font-medium">{aq.question}</p>
                          <p className="text-muted-foreground mt-1">{aq.answer}</p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> SYSTEM_HEALTH
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Progress Bar */}
                <div className="h-4 bg-secondary/30 rounded overflow-hidden flex">
                  <div className="bg-green-500 transition-all" style={{ width: `${(coverage.complete / Math.max(coverage.complete + coverage.in_progress + coverage.not_started, 1)) * 100}%` }} />
                  <div className="bg-yellow-500 transition-all" style={{ width: `${(coverage.in_progress / Math.max(coverage.complete + coverage.in_progress + coverage.not_started, 1)) * 100}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-500">{coverage.complete}</div>
                    <div className="text-xs text-muted-foreground">DONE</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-500">{coverage.in_progress}</div>
                    <div className="text-xs text-muted-foreground">WIP</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-muted-foreground">{coverage.not_started}</div>
                    <div className="text-xs text-muted-foreground">TODO</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-500">{coverage.stale}</div>
                    <div className="text-xs text-muted-foreground">STALE</div>
                  </div>
                </div>

                {/* Gaps */}
                {gaps.length > 0 && (
                  <div className="pt-2 border-t border-secondary">
                    <p className="text-xs font-arcade text-muted-foreground mb-2">GAPS</p>
                    {gaps.slice(0, 3).map((gap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-yellow-500">
                        <AlertTriangle className="w-3 h-3" /> {gap}
                      </div>
                    ))}
                  </div>
                )}

                {/* Improvements */}
                {improvements.length > 0 && (
                  <div className="pt-2 border-t border-secondary">
                    <p className="text-xs font-arcade text-muted-foreground mb-2">IMPROVEMENTS</p>
                    {improvements.slice(0, 3).map((imp, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-green-500">
                        <Check className="w-3 h-3" /> {imp}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            
            {/* Ralph Research Panel */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> RALPH_RESEARCH
                </CardTitle>
                <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => refetchRalph()}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {ralphLoading ? (
                  <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : ralphData?.error ? (
                  <p className="text-sm text-red-500">{ralphData.error}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-black/40 border border-secondary rounded text-center">
                        <div className="text-xs text-muted-foreground">PRD</div>
                        <div className="text-sm font-bold">{ralphData?.prd?.passed || 0}/{ralphData?.prd?.total || 0}</div>
                        <div className="text-xs text-muted-foreground truncate">{ralphData?.prd?.branch || "-"}</div>
                      </div>
                      <div className="p-2 bg-black/40 border border-secondary rounded text-center">
                        <div className="text-xs text-muted-foreground">FAILING</div>
                        <div className="text-sm font-bold text-yellow-500">{ralphData?.prd?.failing || 0}</div>
                      </div>
                      <div className="p-2 bg-black/40 border border-secondary rounded text-center">
                        <div className="text-xs text-muted-foreground">STARTED</div>
                        <div className="text-sm font-bold">{ralphData?.progress?.started || "-"}</div>
                      </div>
                    </div>
                    {ralphData?.prd?.next_failing && (
                      <p className="text-xs text-yellow-500 mt-2">Next: {ralphData.prd.next_failing}</p>
                    )}
                    {ralphData?.progress?.latest_story && (
                      <p className="text-xs text-muted-foreground">Latest: {ralphData.progress.latest_story}</p>
                    )}
                    {ralphData?.latest_summary?.content && (
                      <ScrollArea className="h-[150px] p-2 bg-black/60 border border-secondary rounded font-mono text-xs mt-2">
                        <pre className="whitespace-pre-wrap">{ralphData.latest_summary.content}</pre>
                      </ScrollArea>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Proposals Table */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm">PROPOSALS</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="font-arcade text-xs rounded-none bg-secondary hover:bg-white hover:text-black">
                      <Plus className="w-3 h-3 mr-1" /> NEW
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-2 border-primary rounded-none max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-arcade text-primary">NEW_PROPOSAL</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-arcade text-muted-foreground">PROPOSAL_ID</label>
                          <Input 
                            className="rounded-none bg-secondary/20 border-secondary" 
                            value={formData.proposalId}
                            onChange={(e) => setFormData({ ...formData, proposalId: e.target.value })}
                            placeholder={generateProposalId()}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-arcade text-muted-foreground">PRIORITY</label>
                          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                            <SelectTrigger className="rounded-none bg-secondary/20 border-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-none bg-black border-primary">
                              <SelectItem value="HIGH">HIGH</SelectItem>
                              <SelectItem value="MED">MED</SelectItem>
                              <SelectItem value="LOW">LOW</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-arcade text-muted-foreground">SUMMARY</label>
                        <Textarea 
                          className="rounded-none bg-secondary/20 border-secondary min-h-[100px]"
                          value={formData.summary}
                          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                          placeholder="Describe the improvement proposal..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-arcade text-muted-foreground">TARGET_SYSTEM</label>
                        <Input 
                          className="rounded-none bg-secondary/20 border-secondary" 
                          value={formData.targetSystem || ""}
                          onChange={(e) => setFormData({ ...formData, targetSystem: e.target.value })}
                          placeholder="e.g., Brain, Scholar, Tutor, RAG"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="rounded-none font-arcade" onClick={() => setIsDialogOpen(false)}>CANCEL</Button>
                      <Button className="rounded-none font-arcade bg-primary text-black" onClick={handleSubmit}>SUBMIT</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {proposalsLoading ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                  ) : proposals.length === 0 ? (
                    <div className="p-8 text-center font-terminal text-muted-foreground">NO PROPOSALS YET</div>
                  ) : (
                    <div>
                      {proposals.map((prop) => (
                        <div key={prop.id} className="flex items-center p-3 border-b border-secondary last:border-0 hover:bg-white/5 group text-sm">
                          <div className="w-16 font-mono text-muted-foreground text-xs">{prop.proposalId}</div>
                          <div className="flex-1 truncate">{prop.summary}</div>
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline" className={`rounded-none text-xs ${
                              prop.priority === 'HIGH' ? 'border-primary text-primary' : 
                              prop.priority === 'MED' ? 'border-white text-white' : 
                              'border-secondary text-secondary-foreground'
                            }`}>{prop.priority}</Badge>
                            <Select 
                              value={prop.status} 
                              onValueChange={(value) => updateMutation.mutate({ id: prop.id, data: { status: value } })}
                            >
                              <SelectTrigger className={`rounded-none w-20 h-7 text-xs ${
                                prop.status === 'APPROVED' ? 'bg-green-500/20 text-green-500' : 
                                prop.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                'bg-primary/20 text-primary'
                              }`}><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-none bg-black border-primary">
                                <SelectItem value="DRAFT">DRAFT</SelectItem>
                                <SelectItem value="APPROVED">APPROVED</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive"
                              onClick={() => deleteMutation.mutate(prop.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Proposal Sheet */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm">PROPOSAL_SHEET</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => refetchProposalSheet()}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    className="rounded-none text-xs bg-primary text-black"
                    onClick={() => rebuildProposalSheetMutation.mutate()}
                    disabled={rebuildProposalSheetMutation.isPending}
                  >
                    {rebuildProposalSheetMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "FINAL_CHECK"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-black/40 border border-secondary rounded">
                    <div className="text-lg font-bold">{proposalSheet?.counts?.total || 0}</div>
                    <div className="text-xs text-muted-foreground">TOTAL</div>
                  </div>
                  <div className="p-2 bg-black/40 border border-yellow-500/30 rounded">
                    <div className="text-lg font-bold text-yellow-500">{proposalSheet?.counts?.drift || 0}</div>
                    <div className="text-xs text-muted-foreground">DRIFT</div>
                  </div>
                  <div className="p-2 bg-black/40 border border-red-500/30 rounded">
                    <div className="text-lg font-bold text-red-500">{proposalSheet?.counts?.missing || 0}</div>
                    <div className="text-xs text-muted-foreground">MISSING</div>
                  </div>
                  <div className="p-2 bg-black/40 border border-secondary rounded">
                    <div className="text-xs font-bold truncate">{proposalSheet?.generated || "-"}</div>
                    <div className="text-xs text-muted-foreground">GENERATED</div>
                  </div>
                </div>
                {proposalSheet?.content && (
                  <ScrollArea className="h-[100px] p-2 bg-black/60 border border-secondary rounded font-mono text-xs">
                    <pre className="whitespace-pre-wrap">{proposalSheet.content.slice(0, 1000)}{proposalSheet.content.length > 1000 ? '...' : ''}</pre>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* AI Digest */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" /> AI_DIGEST
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <Button 
                  className="w-full rounded-none font-arcade bg-primary text-black"
                  onClick={() => generateDigestMutation.mutate()}
                  disabled={generateDigestMutation.isPending}
                >
                  {generateDigestMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> GENERATING...</>
                  ) : (
                    "GENERATE_DIGEST"
                  )}
                </Button>
                {digestContent && (
                  <ScrollArea className="h-[200px] p-3 bg-black/60 border border-secondary rounded">
                    <pre className="whitespace-pre-wrap text-sm">{digestContent}</pre>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Saved Digests */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <History className="w-4 h-4" /> SAVED_DIGESTS
                  <Badge variant="outline" className="rounded-none ml-auto">{savedDigests.length}</Badge>
                </CardTitle>
                <Button size="sm" variant="outline" className="rounded-none text-xs" onClick={() => refetchDigests()}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  {savedDigests.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No saved digests</div>
                  ) : (
                    <div>
                      {savedDigests.map((d) => (
                        <div 
                          key={d.id} 
                          className={`flex items-center justify-between p-3 border-b border-secondary last:border-0 hover:bg-white/5 cursor-pointer ${selectedDigest === d.id ? 'bg-primary/10' : ''}`}
                          onClick={() => viewDigest(d.id)}
                        >
                          <div>
                            <div className="text-sm font-medium">{d.digest_type}</div>
                            <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteDigestMutation.mutate(d.id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Research Gaps */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4">
                <CardTitle className="font-arcade text-sm">RESEARCH_GAPS</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {gaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No gaps identified.</p>
                ) : (
                  gaps.map((gap, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <X className="w-4 h-4 text-primary" />
                      <span>{gap}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </Layout>
  );
}
