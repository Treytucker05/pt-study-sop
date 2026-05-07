/**
 * Brain dashboard pending-proposals badge (SCHOLAR-005).
 *
 * Reads ['scholar-proposals', 'pending'] via react-query — the SAME key
 * used by the Scholar Proposals tab — so polling deduplicates and the
 * count stays consistent across surfaces (Challenge audit Q2).
 *
 * Hides when N=0. Click navigates to /scholar?tab=proposals which the
 * Scholar page reads on mount to pre-select the Proposals tab.
 */

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const PROPOSALS_QUERY_KEY = ["scholar-proposals", "pending"] as const;

export function PendingProposalsBadge() {
  const [, setLocation] = useLocation();
  const { data: proposals = [] } = useQuery({
    queryKey: PROPOSALS_QUERY_KEY,
    queryFn: () => api.scholar.getProposals("pending"),
    refetchInterval: 30000,
  });

  const count = proposals.length;
  if (count === 0) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="brain-pending-proposals-badge"
      onClick={() => setLocation("/scholar?tab=proposals")}
      className="group flex w-full items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/15"
    >
      <span className="font-mono text-sm uppercase tracking-[0.18em] text-primary">
        Proposals: {count} pending
      </span>
      <span className="flex items-center gap-1 font-mono text-xs text-primary/70 group-hover:text-primary">
        Review
        <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  );
}
