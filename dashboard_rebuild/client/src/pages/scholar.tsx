import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  Search,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Lightbulb,
  History,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  FileText,
  Send,
  RefreshCw,
  Layers,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type ScholarQuestion, type ScholarFinding, type TutorAuditItem } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Proposal } from "@shared/schema";

/**
 * SCHOLAR PAGE - Advisory & Analytical Layer
 * 
 * DATA FLOW:
 * Brain (sessions, metrics) → Scholar (read-only analysis)
 * Tutor (transcripts, WRAP) → Scholar (post-session audit only)
 * 
 * BOUNDARIES:
 * - Read-only access to Brain data
 * - Post-session Tutor audit only (no live access)
 * - No direct database writes (proposals managed via API)
 * - No auto-implementation of proposals
 */

interface ScholarMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Scholar() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState<ScholarMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Brain data for analysis (read-only)
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: api.courses.getAll,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals"],
    queryFn: api.proposals.getAll,
  });

  // Fetch Scholar-specific data
  const { data: scholarQuestions = [] } = useQuery({
    queryKey: ["scholar-questions"],
    queryFn: api.scholar.getQuestions,
  });

  const { data: scholarFindings = [] } = useQuery({
    queryKey: ["scholar-findings"],
    queryFn: api.scholar.getFindings,
  });

  const { data: tutorAuditData = [] } = useQuery({
    queryKey: ["scholar-tutor-audit"],
    queryFn: api.scholar.getTutorAudit,
  });

  // Scholar clusters
  const { data: clustersData } = useQuery({
    queryKey: ["scholar-clusters"],
    queryFn: api.scholar.getClusters,
  });

  const clusterMutation = useMutation({
    mutationFn: api.scholar.runClustering,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholar-clusters"] });
    },
  });

  // Proposal status updates (the only write operation - managed via API)
  const updateProposalMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Proposal> }) =>
      api.proposals.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Derived metrics from Brain data (read-only calculations)
  const recentSessions = sessions.slice(0, 20);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const avgMinutesPerSession = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;
  const sessionsThisWeek = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo;
  }).length;

  // Identify potential issues from Brain data
  const coursesWithLowActivity = courses.filter(c => (c.totalSessions || 0) < 3);
  const confusionTopics = sessions
    .filter(s => s.confusions && s.confusions.length > 0)
    .flatMap(s => s.confusions || []);
  const unresolvedIssues = sessions
    .filter(s => s.issues && s.issues.length > 0)
    .flatMap(s => s.issues || []);

  // Handle chat submission - uses real Scholar API
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput("");
    setIsAnalyzing(true);

    try {
      const response = await api.scholar.chat(userMessage);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error processing your question. Please try again.`
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Use real data from Scholar API (openQuestions, tutorAuditItems, researchFindings)
  const openQuestions: ScholarQuestion[] = scholarQuestions;
  const tutorAuditItems: TutorAuditItem[] = tutorAuditData;
  const researchFindings: ScholarFinding[] = scholarFindings;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-primary/20 text-primary border-primary';
      case 'REJECTED': return 'bg-secondary/40 text-muted-foreground border-secondary';
      case 'IMPLEMENTED': return 'bg-white/20 text-white border-white';
      default: return 'bg-secondary/20 text-secondary-foreground border-secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-primary border-primary';
      case 'MED': return 'text-white border-white';
      default: return 'text-muted-foreground border-muted-foreground';
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="font-arcade text-lg text-primary">SCHOLAR</h1>
            <Badge variant="outline" className="rounded-none text-[10px] font-terminal border-primary/50">
              READ ONLY ADVISORY
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-none font-arcade text-xs border-secondary"
            onClick={() => queryClient.invalidateQueries()}
            data-testid="button-refresh-data"
          >
            <RefreshCw className="w-3 h-3 mr-2" /> REFRESH DATA
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="bg-black/60 border border-secondary rounded-none p-1 shrink-0 w-full justify-start overflow-x-auto">
              {[
                { id: 'summary', label: 'SUMMARY', icon: TrendingUp },
                { id: 'audit', label: 'TUTOR AUDIT', icon: Search },
                { id: 'pipeline', label: 'QUESTIONS', icon: HelpCircle },
                { id: 'evidence', label: 'EVIDENCE', icon: BookOpen },
                { id: 'proposals', label: 'PROPOSALS', icon: Lightbulb },
                { id: 'clusters', label: 'CLUSTERS', icon: Layers },
                { id: 'history', label: 'HISTORY', icon: History },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-none font-arcade text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black px-3"
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-3 h-3 mr-1" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* SCHOLAR SUMMARY TAB */}
            <TabsContent value="summary" className="flex-1 overflow-hidden mt-6">
              <div className="grid lg:grid-cols-3 gap-6 h-full">
                {/* Left: Summary Cards */}
                <div className="lg:col-span-2 space-y-4 overflow-auto pr-2">
                  {/* Study Health Overview */}
                  <Card className="bg-black/40 border-2 border-primary/50 rounded-none">
                    <CardHeader className="p-4 border-b border-primary/30">
                      <CardTitle className="font-arcade text-sm text-primary flex items-center gap-3">
                        <TrendingUp className="w-4 h-4" /> STUDY HEALTH OVERVIEW
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <div className="font-arcade text-2xl text-primary">{sessions.length}</div>
                          <div className="font-terminal text-xs text-muted-foreground">TOTAL SESSIONS</div>
                        </div>
                        <div>
                          <div className="font-arcade text-2xl text-white">{sessionsThisWeek}</div>
                          <div className="font-terminal text-xs text-muted-foreground">THIS WEEK</div>
                        </div>
                        <div>
                          <div className="font-arcade text-2xl text-secondary">{avgMinutesPerSession}m</div>
                          <div className="font-terminal text-xs text-muted-foreground">AVG/SESSION</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* What's Working */}
                  <Card className="bg-black/40 border-2 border-white/30 rounded-none">
                    <CardHeader className="p-3 border-b border-white/20">
                      <CardTitle className="font-arcade text-xs text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> WHAT APPEARS TO BE WORKING
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ul className="space-y-3 font-terminal text-sm">
                        {courses.filter(c => (c.totalSessions || 0) >= 3).length > 0 ? (
                          <>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{courses.filter(c => (c.totalSessions || 0) >= 3).length} courses have consistent study activity</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>Round-robin rotation ensuring balanced coverage</span>
                            </li>
                          </>
                        ) : (
                          <li className="text-muted-foreground">Insufficient data - need more sessions to identify patterns</li>
                        )}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-secondary/30">
                        <Badge variant="outline" className="rounded-none text-[9px] border-secondary">
                          CONFIDENCE: {sessions.length > 10 ? 'MEDIUM' : 'LOW'} (based on {sessions.length} sessions)
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* What's Failing */}
                  <Card className="bg-black/40 border-2 border-destructive/50 rounded-none">
                    <CardHeader className="p-3 border-b border-destructive/30">
                      <CardTitle className="font-arcade text-xs text-destructive flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> POTENTIAL CONCERNS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ul className="space-y-3 font-terminal text-sm">
                        {coursesWithLowActivity.length > 0 && (
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <span>{coursesWithLowActivity.length} courses with low activity: {coursesWithLowActivity.map(c => c.name).join(', ')}</span>
                          </li>
                        )}
                        {confusionTopics.length > 0 && (
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <span>{confusionTopics.length} unresolved confusions logged</span>
                          </li>
                        )}
                        {unresolvedIssues.length > 0 && (
                          <li className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <span>{unresolvedIssues.length} session issues flagged</span>
                          </li>
                        )}
                        {coursesWithLowActivity.length === 0 && confusionTopics.length === 0 && unresolvedIssues.length === 0 && (
                          <li className="text-muted-foreground">No significant concerns identified</li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Chat Interface */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none flex flex-col h-full">
                  <CardHeader className="p-3 border-b border-secondary shrink-0">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> ASK SCHOLAR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-3">
                      <div className="space-y-3">
                        {chatMessages.length === 0 && (
                          <div className="text-center py-8">
                            <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="font-terminal text-xs text-muted-foreground">
                              Ask questions about your study data, patterns, or get recommendations.
                            </p>
                          </div>
                        )}
                        {chatMessages.map((msg, i) => (
                          <div
                            key={i}
                            className={cn(
                              "p-2 rounded-sm font-terminal text-xs",
                              msg.role === 'user'
                                ? "bg-primary/20 text-primary ml-8"
                                : "bg-secondary/20 text-white mr-8"
                            )}
                          >
                            {msg.content}
                          </div>
                        ))}
                        {isAnalyzing && (
                          <div className="flex items-center gap-2 text-muted-foreground font-terminal text-xs">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Analyzing Brain data...
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>
                    <div className="p-2 border-t border-secondary shrink-0">
                      <div className="flex gap-2">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSubmit();
                            }
                          }}
                          placeholder="Ask about your study patterns..."
                          className="rounded-none bg-black border-secondary text-xs min-h-[60px] resize-none"
                          data-testid="input-scholar-chat"
                        />
                        <Button
                          size="icon"
                          className="rounded-none bg-primary text-black h-[60px] w-10"
                          onClick={handleChatSubmit}
                          disabled={isAnalyzing}
                          data-testid="button-send-chat"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TUTOR AUDIT TAB */}
            <TabsContent value="audit" className="flex-1 overflow-auto mt-4">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Audit Questions */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="p-3 border-b border-secondary">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <Search className="w-4 h-4" /> TUTOR BEHAVIOR AUDIT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <p className="font-terminal text-xs text-muted-foreground mb-4">
                      Post-session analysis of Tutor interactions. No live Tutor access.
                    </p>
                    {[
                      { q: "Was the Tutor source-aligned?", status: "pending" },
                      { q: "Was cognitive load appropriate?", status: "concern" },
                      { q: "Were confusions resolved or deferred?", status: "ok" },
                      { q: "Did explanations correlate with outcomes?", status: "pending" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-black/40 border border-secondary/50">
                        <span className="font-terminal text-xs">{item.q}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-none text-[9px]",
                            item.status === 'ok' ? 'border-primary text-primary' :
                              item.status === 'concern' ? 'border-destructive text-destructive' :
                                'border-secondary text-secondary-foreground'
                          )}
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recurrent Issues */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="p-3 border-b border-secondary">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> RECURRENT ISSUES
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {tutorAuditItems.map((item, i) => (
                        <div key={i} className="p-3 bg-black/40 border border-secondary/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-terminal text-sm">{item.issue ?? "Unknown issue"}</span>
                            <Badge variant="outline" className="rounded-none text-[9px] border-primary text-primary">
                              x{item.frequency ?? 0}
                            </Badge>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            {(item.courses || []).map((course: string, j: number) => (
                              <Badge key={j} variant="secondary" className="rounded-none text-[8px]">
                                {course}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* QUESTION PIPELINE TAB */}
            <TabsContent value="pipeline" className="flex-1 overflow-auto mt-4">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Question Pipeline */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="p-3 border-b border-secondary">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" /> QUESTION RESOLUTION PIPELINE
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2 font-terminal text-xs text-muted-foreground mb-4">
                      <p>1. Generate question from identified issue</p>
                      <p>2. Attempt answer using Brain data</p>
                      <p>3. If insufficient, research learning science</p>
                      <p>4. If still unresolved, escalate to user</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { stage: "Identified", count: 5 },
                        { stage: "Brain Analysis", count: 3 },
                        { stage: "Research", count: 1 },
                        { stage: "User Escalation", count: 2 },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-primary/60" />
                          <span className="font-terminal text-sm flex-1">{item.stage}</span>
                          <Badge variant="outline" className="rounded-none">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Open Questions (User Input Required) */}
                <Card className="bg-black/40 border-2 border-primary/50 rounded-none">
                  <CardHeader className="p-3 border-b border-primary/30">
                    <CardTitle className="font-arcade text-xs text-primary flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> OPEN QUESTIONS (YOUR INPUT NEEDED)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {openQuestions.map((q) => (
                          <div key={q.id} className="p-3 bg-primary/5 border border-primary/30">
                            <p className="font-terminal text-sm mb-3">{q.question}</p>
                            <div className="space-y-2 text-xs">
                              <div className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">Context:</span>
                                <span>{q.context}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">Data Gap:</span>
                                <span>{q.dataInsufficient}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">Research:</span>
                                <span>{q.researchAttempted}</span>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-primary/20">
                              <Textarea
                                placeholder="Your response..."
                                className="rounded-none bg-black border-secondary text-xs min-h-[60px]"
                                data-testid={`input-question-response-${q.id}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* EVIDENCE TAB */}
            <TabsContent value="evidence" className="flex-1 overflow-auto mt-4">
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Observed Data */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="p-3 border-b border-secondary">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <FileText className="w-4 h-4" /> OBSERVED DATA (from Brain)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        <div className="p-3 bg-black/40 border border-secondary/50">
                          <div className="font-arcade text-xs text-primary mb-2">SESSION DISTRIBUTION</div>
                          <div className="grid grid-cols-2 gap-2 font-terminal text-xs">
                            {courses.map(c => (
                              <div key={c.id} className="flex justify-between">
                                <span>{c.name}</span>
                                <span className="text-muted-foreground">{c.totalSessions || 0} sessions</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-black/40 border border-secondary/50">
                          <div className="font-arcade text-xs text-primary mb-2">CONFUSION LOG</div>
                          <div className="space-y-1 font-terminal text-xs">
                            {confusionTopics.length > 0 ? confusionTopics.slice(0, 5).map((c, i) => (
                              <div key={i} className="text-muted-foreground">• {c}</div>
                            )) : (
                              <div className="text-muted-foreground">No confusions logged</div>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-black/40 border border-secondary/50">
                          <div className="font-arcade text-xs text-primary mb-2">RECENT SESSIONS</div>
                          <div className="space-y-1 font-terminal text-xs">
                            {recentSessions.slice(0, 5).map((s, i) => (
                              <div key={i} className="flex justify-between text-muted-foreground">
                                <span>{s.topic || 'Untitled'}</span>
                                <span>{s.minutes || 0}m</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Research Interpretation */}
                <Card className="bg-black/40 border-2 border-secondary rounded-none">
                  <CardHeader className="p-3 border-b border-secondary">
                    <CardTitle className="font-arcade text-xs flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> RESEARCH INTERPRETATION
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="font-terminal text-xs text-muted-foreground mb-4">
                      Learning science findings relevant to your study patterns.
                    </p>
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-4">
                        {researchFindings.map((finding, i) => (
                          <div key={i} className="p-3 bg-black/40 border border-secondary/50">
                            <div className="font-arcade text-xs text-primary mb-2">{finding.topic ?? finding.title}</div>
                            <p className="font-terminal text-xs mb-2">{finding.summary ?? finding.content}</p>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Source: {finding.source}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-secondary/30">
                              <span className="text-[10px] text-primary">Relevance: {finding.relevance ?? "n/a"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* PROPOSALS TAB */}
            <TabsContent value="proposals" className="flex-1 overflow-auto mt-4">
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="p-3 border-b border-secondary">
                  <CardTitle className="font-arcade text-xs flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> IMPROVEMENT PROPOSALS
                  </CardTitle>
                  <p className="font-terminal text-[10px] text-muted-foreground mt-1">
                    No auto-implementation. All changes require user approval.
                  </p>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {proposals.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="font-arcade text-xs text-primary mb-2">NO PROPOSALS YET</p>
                          <p className="font-terminal text-xs text-muted-foreground">
                            Proposals are generated by the Scholar workflow after analyzing Brain session data.
                            Run a Scholar analysis from the dashboard or via the Scholar CLI to create proposals.
                          </p>
                        </div>
                      ) : (
                        proposals.filter(p => p.status !== 'REJECTED').map((proposal) => (
                          <div key={proposal.id} className="p-4 bg-black/40 border border-secondary/50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="font-mono text-xs text-muted-foreground">{proposal.proposalId}</span>
                                <h4 className="font-terminal text-sm mt-1">{proposal.summary}</h4>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline" className={cn("rounded-none text-[9px]", getPriorityColor(proposal.priority || 'MED'))}>
                                  {proposal.priority || 'MED'}
                                </Badge>
                              </div>
                            </div>

                            {proposal.targetSystem && (
                              <div className="mb-3">
                                <span className="text-[10px] text-muted-foreground">Target: </span>
                                <Badge variant="secondary" className="rounded-none text-[9px]">{proposal.targetSystem}</Badge>
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-secondary/30">
                              <div className="flex gap-2">
                                <Badge variant="outline" className="rounded-none text-[9px] border-secondary">
                                  Confidence: MED
                                </Badge>
                                <Badge variant="outline" className="rounded-none text-[9px] border-secondary">
                                  Risk: LOW
                                </Badge>
                              </div>
                              <Select
                                value={proposal.status || 'DRAFT'}
                                onValueChange={(value) => updateProposalMutation.mutate({ id: proposal.id, data: { status: value } })}
                              >
                                <SelectTrigger className={cn("rounded-none w-28 h-7 text-[10px]", getStatusColor(proposal.status || 'DRAFT'))} data-testid={`select-proposal-status-${proposal.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-none bg-black border-primary">
                                  <SelectItem value="DRAFT">PROPOSED</SelectItem>
                                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                                  <SelectItem value="IMPLEMENTED">IMPLEMENTED</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CLUSTERS TAB */}
            <TabsContent value="clusters" className="flex-1 overflow-auto mt-4">
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="p-3 border-b border-secondary flex flex-row items-center justify-between">
                  <CardTitle className="font-arcade text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4" /> TOPIC CLUSTERS
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none font-arcade text-[10px] border-primary text-primary"
                    onClick={() => clusterMutation.mutate()}
                    disabled={clusterMutation.isPending}
                    data-testid="button-run-clustering"
                  >
                    {clusterMutation.isPending ? (
                      <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> CLUSTERING...</>
                    ) : (
                      <><Layers className="w-3 h-3 mr-1" /> RUN CLUSTERING</>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {!clustersData?.clusters || clustersData.clusters.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground font-terminal text-sm">
                          No clusters yet. Click RUN CLUSTERING to group digests and proposals by topic.
                        </div>
                      ) : (
                        clustersData.clusters.map((cluster) => (
                          <div key={cluster.cluster_id} className="p-4 bg-black/40 border border-secondary/50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-arcade text-xs text-primary uppercase">{cluster.cluster_id}</h4>
                              <Badge variant="outline" className="rounded-none text-[9px] border-secondary">
                                {cluster.count} items
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {cluster.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 font-terminal text-xs">
                                  <Badge variant="secondary" className="rounded-none text-[8px] shrink-0">
                                    {item.source === "digest" ? "DIG" : "PROP"}
                                  </Badge>
                                  <span className="truncate">{item.title || "Untitled"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* HISTORY TAB */}
            <TabsContent value="history" className="flex-1 overflow-auto mt-4">
              <Card className="bg-black/40 border-2 border-secondary rounded-none">
                <CardHeader className="p-3 border-b border-secondary">
                  <CardTitle className="font-arcade text-xs flex items-center gap-2">
                    <History className="w-4 h-4" /> PROPOSAL HISTORY (READ ONLY)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {proposals.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="font-arcade text-xs text-primary mb-2">NO HISTORY YET</p>
                          <p className="font-terminal text-xs text-muted-foreground">
                            Proposal history will appear here once Scholar generates its first analysis.
                          </p>
                        </div>
                      ) : (
                        proposals.map((proposal) => (
                          <div
                            key={proposal.id}
                            className="flex items-center p-3 bg-black/40 border border-secondary/50 font-terminal text-sm"
                            data-testid={`history-proposal-${proposal.id}`}
                          >
                            <div className="w-20 font-mono text-xs text-muted-foreground">{proposal.proposalId}</div>
                            <div className="flex-1 truncate">{proposal.summary}</div>
                            <div className="flex gap-2 items-center shrink-0">
                              <Badge variant="outline" className={cn("rounded-none text-[9px]", getStatusColor(proposal.status || 'DRAFT'))}>
                                {proposal.status || 'DRAFT'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
