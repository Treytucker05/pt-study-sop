import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Shield, Bot, FileText, Check, X, Search, Terminal, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiRequest } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";
import type { InsertProposal } from "@shared/schema";

export default function Scholar() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertProposal>({
    proposalId: "",
    summary: "",
    status: "DRAFT",
    priority: "MED",
    targetSystem: "",
    evidence: null,
  });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.proposals.getAll,
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

  // Scholar Status & Logs
  const { data: status } = useQuery({
    queryKey: ["scholar-status"],
    queryFn: async () => apiRequest<{ running: boolean; status: string }>("/scholar/status"),
    refetchInterval: 5000
  });

  const logsQuery = useQuery({
    queryKey: ["scholar-logs"],
    queryFn: async () => apiRequest<{ logs: string[] }>("/scholar/logs"),
    refetchInterval: (status?.running ? 2000 : false)
  });

  const endOfLogsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (endOfLogsRef.current) {
      endOfLogsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logsQuery.data]);

  const runMutation = useMutation({
    mutationFn: async () => apiRequest("/scholar/run", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholar-status"] });
      logsQuery.refetch();
    }
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

  return (
    <Layout>
      <div className="space-y-8">

        {/* API Config Bar */}
        <Card className="bg-black/40 border-2 border-secondary rounded-none">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full grid md:grid-cols-3 gap-4">
              <Select defaultValue="openai">
                <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-provider"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-primary rounded-none"><SelectItem value="openai">OPENAI</SelectItem></SelectContent>
              </Select>
              <Input type="password" value="sk-................" className="rounded-none bg-black border-secondary font-mono" readOnly data-testid="input-api-key" />
              <Select defaultValue="gpt-4">
                <SelectTrigger className="rounded-none bg-black border-secondary" data-testid="select-model"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-primary rounded-none"><SelectItem value="gpt-4">GPT-4</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_#ffffff]"></div>
              <span className="font-arcade text-xs text-white">ONLINE</span>
            </div>
            <Button className="rounded-none font-arcade bg-secondary text-white hover:bg-white hover:text-black" data-testid="button-test-connection">TEST_CONN</Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Controls & Status */}
          <div className="space-y-8">
            <Card className="bg-primary/5 border-2 border-primary rounded-none">
              <CardHeader className="border-b border-primary/30 p-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="font-arcade text-sm text-primary">SCHOLAR_CONTROLS</CardTitle>
                  <Badge variant="outline" className={`${status?.running ? 'text-green-500 border-green-500 animate-pulse' : 'text-gray-500 border-gray-500'}`}>
                    {status?.running ? 'RUNNING' : 'IDLE'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-terminal">
                    <Shield className="w-4 h-4 text-primary" /> SAFE_MODE
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-primary" data-testid="switch-safe-mode" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-terminal">
                    <Bot className="w-4 h-4 text-primary" /> MULTI_AGENT
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-primary" data-testid="switch-multi-agent" />
                </div>
                <Button
                  className="w-full h-12 rounded-none font-arcade bg-primary text-black hover:bg-primary/90 hover:scale-[1.02] transition-transform text-lg border-b-4 border-primary-foreground/20 active:border-0 active:translate-y-1"
                  data-testid="button-run-scholar"
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || status?.running}
                >
                  <Play className="w-5 h-5 mr-2" /> {status?.running ? 'EXECUTING...' : 'RUN_SCHOLAR'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-2 border-secondary rounded-none flex-1 min-h-[300px]">
              <CardHeader className="border-b border-secondary p-4 flex justify-between items-center">
                <CardTitle className="font-arcade text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> SYSTEM_LOGS
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => logsQuery.refetch()} className="h-6 w-6 p-0 hover:bg-white/10">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] p-4 font-mono text-xs text-white space-y-1">
                  {logsQuery.isLoading ? (
                    <p className="text-gray-500">Loading logs...</p>
                  ) : logsQuery.data?.logs?.map((line: string, i: number) => (
                    <p key={i} className="whitespace-pre-wrap break-all border-b border-white/5 pb-0.5 mb-0.5">{line}</p>
                  ))}
                  <div ref={endOfLogsRef} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right: Proposals & Research */}
          <div className="lg:col-span-2 space-y-8">

            {/* Proposals Table */}
            <Card className="bg-black/40 border-2 border-secondary rounded-none">
              <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                <CardTitle className="font-arcade text-sm">PROPOSAL_RUNNING_SHEET</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="font-arcade text-xs rounded-none bg-secondary hover:bg-white hover:text-black" data-testid="button-new-proposal">
                      <Plus className="w-3 h-3 mr-2" /> NEW_PROPOSAL
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
                            data-testid="input-proposal-id"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-arcade text-muted-foreground">PRIORITY</label>
                          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                            <SelectTrigger className="rounded-none bg-secondary/20 border-secondary" data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
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
                          data-testid="textarea-summary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-arcade text-muted-foreground">TARGET_SYSTEM</label>
                        <Input
                          className="rounded-none bg-secondary/20 border-secondary"
                          value={formData.targetSystem || ""}
                          onChange={(e) => setFormData({ ...formData, targetSystem: e.target.value })}
                          placeholder="e.g., Brain, Scholar, Tutor, RAG"
                          data-testid="input-target-system"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="rounded-none font-arcade" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">CANCEL</Button>
                      <Button className="rounded-none font-arcade bg-primary text-black" onClick={handleSubmit} data-testid="button-submit-proposal">SUBMIT</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center font-terminal text-muted-foreground">LOADING...</div>
                ) : proposals.length === 0 ? (
                  <div className="p-8 text-center font-terminal text-muted-foreground">NO PROPOSALS YET. ADD ONE ABOVE.</div>
                ) : (
                  <div className="space-y-1">
                    {proposals.map((prop) => (
                      <div key={prop.id} className="flex items-center p-4 border-b border-secondary last:border-0 hover:bg-white/5 cursor-pointer font-terminal text-sm group" data-testid={`proposal-${prop.id}`}>
                        <div className="w-20 font-mono text-muted-foreground" data-testid={`text-proposal-id-${prop.id}`}>{prop.proposalId}</div>
                        <div className="flex-1 font-bold" data-testid={`text-proposal-summary-${prop.id}`}>{prop.summary}</div>
                        <div className="flex gap-2 items-center">
                          <Badge variant="outline" className={`rounded-none ${prop.priority === 'HIGH' ? 'border-primary text-primary' :
                            prop.priority === 'MED' ? 'border-white text-white' :
                              'border-secondary text-secondary-foreground'
                            }`} data-testid={`badge-priority-${prop.id}`}>{prop.priority}</Badge>
                          <Select
                            value={prop.status}
                            onValueChange={(value) => updateMutation.mutate({ id: prop.id, data: { status: value } })}
                          >
                            <SelectTrigger className={`rounded-none w-24 h-8 text-xs ${prop.status === 'APPROVED' ? 'bg-white text-black' :
                              prop.status === 'REJECTED' ? 'bg-secondary text-white' :
                                'bg-primary/20 border-primary text-primary'
                              }`} data-testid={`select-status-${prop.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none bg-black border-primary">
                              <SelectItem value="DRAFT">DRAFT</SelectItem>
                              <SelectItem value="APPROVED">APPROVED</SelectItem>
                              <SelectItem value="REJECTED">REJECTED</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-destructive"
                            onClick={() => deleteMutation.mutate(prop.id)}
                            data-testid={`button-delete-${prop.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              {/* AI Strategic Digest */}
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="border-b border-secondary p-4 flex flex-row items-center justify-between">
                  <CardTitle className="font-arcade text-sm">AI_DIGEST</CardTitle>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-6 text-center space-y-4">
                  <p className="font-terminal text-muted-foreground">Generate a strategic overview of your learning gaps and opportunities.</p>
                  <Button className="w-full rounded-none font-arcade bg-secondary hover:bg-white hover:text-black text-white border-2 border-secondary" data-testid="button-generate-digest">
                    GENERATE_DIGEST
                  </Button>
                </CardContent>
              </Card>

              {/* Research Gaps */}
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="border-b border-secondary p-4">
                  <CardTitle className="font-arcade text-sm">RESEARCH_GAPS</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 font-terminal text-sm">
                  <div className="flex items-center gap-2 text-primary">
                    <X className="w-4 h-4" /> Renal Physiology (Low Coverage)
                  </div>
                  <div className="flex items-center gap-2 text-primary">
                    <X className="w-4 h-4" /> Drug Interactions (Outdated)
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Check className="w-4 h-4" /> Neuroanatomy (Complete)
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
