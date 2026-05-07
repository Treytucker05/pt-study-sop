/**
 * Scholar Proposals tab (SCHOLAR-004).
 *
 * Lists pending proposals submitted by Scholar's anomaly scanner with
 * Approve / Reject actions. Each proposal renders individually —
 * cluster_id is metadata only in v1, not a UI grouping mechanism (per
 * Challenge audit Q5).
 *
 * Polls every 30 seconds. Shares the react-query cache key
 * ["scholar-proposals", "pending"] with the Brain dashboard badge so
 * proposal counts stay consistent across surfaces without duplicate
 * polling.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  api,
  type ScholarProposal,
  type ScholarProposalStructuredChanges,
} from "@/lib/api";

interface ProposalsTabProps {
  /** Optional toast helper from the parent so success/error feedback
   *  matches the rest of the page. */
  onToast?: (message: string, kind: "success" | "error") => void;
}

const PROPOSALS_QUERY_KEY = ["scholar-proposals", "pending"] as const;

function parseStructuredChanges(
  raw: ScholarProposal["structured_changes"],
): ScholarProposalStructuredChanges | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ScholarProposalStructuredChanges;
    } catch {
      return null;
    }
  }
  return raw;
}

export function ProposalsTab({ onToast }: ProposalsTabProps) {
  const queryClient = useQueryClient();

  const { data: proposals = [], isLoading, isError } = useQuery({
    queryKey: PROPOSALS_QUERY_KEY,
    queryFn: () => api.scholar.getProposals("pending"),
    refetchInterval: 30000,
  });

  const decideMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      decision: "approve" | "reject";
    }) => api.scholar.decideProposal(vars.id, vars.decision),
    onSuccess: (_data, variables) => {
      onToast?.(
        variables.decision === "approve"
          ? "Proposal approved"
          : "Proposal rejected",
        "success",
      );
      queryClient.invalidateQueries({ queryKey: PROPOSALS_QUERY_KEY });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to decide proposal";
      onToast?.(message, "error");
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="proposals-tab-loading"
        className="flex items-center gap-2 p-6 font-mono text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading proposals...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="proposals-tab-error"
        className="rounded-md border border-destructive/40 bg-destructive/10 p-4 font-mono text-sm text-destructive"
      >
        Could not load proposals.
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div
        data-testid="proposals-tab-empty"
        className="rounded-md border border-primary/20 bg-black/20 p-6 font-mono text-sm text-muted-foreground"
      >
        No pending proposals. Scholar will queue new ones as it
        detects weak methods after future sessions.
      </div>
    );
  }

  return (
    <div data-testid="proposals-tab" className="space-y-3">
      {proposals.map((p) => {
        const structured = parseStructuredChanges(p.structured_changes);
        const fieldChanges = structured?.field_changes ?? {};
        return (
          <div
            key={p.id}
            data-testid={`proposal-row-${p.id}`}
            className="rounded-md border border-primary/20 bg-black/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs uppercase tracking-[0.18em]"
                  >
                    {p.proposal_type ?? "proposal"}
                  </Badge>
                  {structured ? (
                    <Badge
                      variant="outline"
                      className="font-mono text-xs uppercase tracking-[0.18em]"
                    >
                      {structured.target_table}#{String(structured.target_id)}
                    </Badge>
                  ) : null}
                </div>
                <div className="font-mono text-sm font-medium text-foreground">
                  {p.title ?? `Proposal #${p.id}`}
                </div>
                {p.content || p.rationale ? (
                  <div className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                    {p.content || p.rationale}
                  </div>
                ) : null}
                {Object.keys(fieldChanges).length > 0 ? (
                  <div className="mt-2 rounded border border-primary/15 bg-black/30 p-2 font-mono text-xs">
                    <div className="mb-1 text-muted-foreground uppercase tracking-[0.18em]">
                      Field changes
                    </div>
                    <table className="w-full">
                      <tbody>
                        {Object.entries(fieldChanges).map(([key, value]) => (
                          <tr key={key}>
                            <td className="pr-3 text-muted-foreground align-top">
                              {key}
                            </td>
                            <td className="text-foreground break-words">
                              {typeof value === "string"
                                ? value
                                : JSON.stringify(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`proposal-approve-${p.id}`}
                  disabled={decideMutation.isPending}
                  onClick={() =>
                    decideMutation.mutate({ id: p.id, decision: "approve" })
                  }
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`proposal-reject-${p.id}`}
                  disabled={decideMutation.isPending}
                  onClick={() =>
                    decideMutation.mutate({ id: p.id, decision: "reject" })
                  }
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
