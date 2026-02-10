import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, MessageSquare, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CARD_BORDER_SECONDARY,
  ICON_SM,
} from "@/lib/theme";

interface Question {
  id: number;
  question_text: string;
  status: string;
  created_at: string;
  answered_at?: string;
  answer_text?: string;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  approved_at?: string;
  implemented_at?: string;
  rejection_reason?: string;
}

export function ScholarLifecyclePanel() {
  const queryClient = useQueryClient();
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [expandedProposal, setExpandedProposal] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["scholarQuestions"],
    queryFn: async () => {
      const response = await fetch("/api/scholar/questions");
      if (!response.ok) throw new Error("Failed to fetch questions");
      return response.json();
    },
  });

  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ["scholarProposals"],
    queryFn: async () => {
      const response = await fetch("/api/scholar/proposals");
      if (!response.ok) throw new Error("Failed to fetch proposals");
      return response.json();
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) => {
      const response = await fetch(`/api/scholar/questions/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!response.ok) throw new Error("Failed to answer question");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarQuestions"] });
      setAnswerText("");
      setExpandedQuestion(null);
    },
  });

  const approveProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/scholar/proposals/${id}/approve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to approve proposal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarProposals"] });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/scholar/proposals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject proposal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarProposals"] });
      setRejectionReason("");
      setExpandedProposal(null);
    },
  });

  const pendingQuestions = questions.filter(q => q.status === "pending");
  const answeredQuestions = questions.filter(q => q.status === "answered");
  const pendingProposals = proposals.filter(p => p.status === "pending");
  const approvedProposals = proposals.filter(p => p.status === "approved");
  const implementedProposals = proposals.filter(p => p.status === "implemented");
  const rejectedProposals = proposals.filter(p => p.status === "rejected");

  const renderQuestion = (question: Question, isPending: boolean) => {
    const isExpanded = expandedQuestion === question.id;

    return (
      <div key={question.id} className="border border-primary/20 rounded-none">
        <button
          onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
          className="w-full p-3 text-left hover:bg-primary/5 transition-colors flex items-start gap-2"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 space-y-1">
            <div className="font-terminal text-xs text-primary">
              {question.question_text}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-terminal">
                #{question.id}
              </Badge>
              <span className="font-terminal text-xs text-muted-foreground">
                {new Date(question.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        {isExpanded && (
          <div className="p-3 border-t border-primary/20 space-y-2 bg-black/20">
            {question.answer_text && (
              <div className="space-y-1">
                <div className="font-terminal text-xs text-muted-foreground">Answer:</div>
                <div className="font-terminal text-xs text-secondary p-2 bg-black/40 border border-primary/20 rounded-none">
                  {question.answer_text}
                </div>
                {question.answered_at && (
                  <div className="font-terminal text-xs text-muted-foreground">
                    Answered: {new Date(question.answered_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {isPending && (
              <div className="space-y-2">
                <Textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer..."
                  className="rounded-none border-primary font-terminal text-xs bg-black h-24"
                />
                <Button
                  onClick={() => answerQuestionMutation.mutate({ id: question.id, answer: answerText })}
                  disabled={!answerText.trim() || answerQuestionMutation.isPending}
                  className="bg-primary hover:bg-primary/80 rounded-none font-terminal text-xs w-full"
                >
                  <CheckCircle className={`${ICON_SM} mr-1`} />
                  {answerQuestionMutation.isPending ? "Submitting..." : "Submit Answer"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderProposal = (proposal: Proposal, showActions: boolean) => {
    const isExpanded = expandedProposal === proposal.id;

    return (
      <div key={proposal.id} className="border border-primary/20 rounded-none">
        <button
          onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
          className="w-full p-3 text-left hover:bg-primary/5 transition-colors flex items-start gap-2"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 space-y-1">
            <div className="font-terminal text-xs text-primary font-bold">
              {proposal.title}
            </div>
            <div className="font-terminal text-xs text-secondary line-clamp-2">
              {proposal.description}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-terminal">
                #{proposal.id}
              </Badge>
              <span className="font-terminal text-xs text-muted-foreground">
                {new Date(proposal.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>

        {isExpanded && (
          <div className="p-3 border-t border-primary/20 space-y-2 bg-black/20">
            <div className="space-y-1">
              <div className="font-terminal text-xs text-muted-foreground">Description:</div>
              <div className="font-terminal text-xs text-secondary p-2 bg-black/40 border border-primary/20 rounded-none whitespace-pre-wrap">
                {proposal.description}
              </div>
            </div>

            {proposal.rejection_reason && (
              <div className="space-y-1">
                <div className="font-terminal text-xs text-destructive">Rejection Reason:</div>
                <div className="font-terminal text-xs text-destructive p-2 bg-destructive/10 border border-destructive/50 rounded-none">
                  {proposal.rejection_reason}
                </div>
              </div>
            )}

            {showActions && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => approveProposalMutation.mutate(proposal.id)}
                    disabled={approveProposalMutation.isPending}
                    className="flex-1 bg-success hover:bg-success/80 rounded-none font-terminal text-xs"
                  >
                    <CheckCircle className={`${ICON_SM} mr-1`} />
                    {approveProposalMutation.isPending ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (rejectionReason.trim()) {
                        rejectProposalMutation.mutate({ id: proposal.id, reason: rejectionReason });
                      }
                    }}
                    disabled={!rejectionReason.trim() || rejectProposalMutation.isPending}
                    className="flex-1 bg-destructive hover:bg-destructive/80 rounded-none font-terminal text-xs"
                  >
                    <XCircle className={`${ICON_SM} mr-1`} />
                    {rejectProposalMutation.isPending ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Rejection reason (required for reject)"
                  className="rounded-none border-primary font-terminal text-xs bg-black h-16"
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className={`bg-black/40 ${CARD_BORDER_SECONDARY}`}>
        <CardHeader className="border-b border-primary/30">
          <CardTitle className="font-arcade text-sm text-primary">
            SCHOLAR QUESTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none bg-black border border-primary/30">
              <TabsTrigger value="pending" className="font-arcade text-xs rounded-none">
                PENDING ({pendingQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="answered" className="font-arcade text-xs rounded-none">
                ANSWERED ({answeredQuestions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {pendingQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No pending questions
                    </div>
                  ) : (
                    pendingQuestions.map(q => renderQuestion(q, true))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="answered" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {answeredQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No answered questions
                    </div>
                  ) : (
                    answeredQuestions.map(q => renderQuestion(q, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className={`bg-black/40 ${CARD_BORDER_SECONDARY}`}>
        <CardHeader className="border-b border-primary/30">
          <CardTitle className="font-arcade text-sm text-primary">
            SCHOLAR PROPOSALS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none bg-black border border-primary/30">
              <TabsTrigger value="pending" className="font-arcade text-xs rounded-none">
                PENDING ({pendingProposals.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="font-arcade text-xs rounded-none">
                APPROVED ({approvedProposals.length})
              </TabsTrigger>
              <TabsTrigger value="implemented" className="font-arcade text-xs rounded-none">
                DONE ({implementedProposals.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="font-arcade text-xs rounded-none">
                REJECTED ({rejectedProposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {pendingProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No pending proposals
                    </div>
                  ) : (
                    pendingProposals.map(p => renderProposal(p, true))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approved" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {approvedProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No approved proposals
                    </div>
                  ) : (
                    approvedProposals.map(p => renderProposal(p, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="implemented" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {implementedProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No implemented proposals
                    </div>
                  ) : (
                    implementedProposals.map(p => renderProposal(p, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rejected" className="border border-t-0 border-primary/30 rounded-none p-2">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {rejectedProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground font-terminal text-xs">
                      No rejected proposals
                    </div>
                  ) : (
                    rejectedProposals.map(p => renderProposal(p, false))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
