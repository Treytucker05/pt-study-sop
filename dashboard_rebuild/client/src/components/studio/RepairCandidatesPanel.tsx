import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudioRepairCandidate } from "@/lib/studioRepairCandidates";

export interface RepairCandidatesPanelProps {
  candidates: StudioRepairCandidate[];
  sentCandidateIds?: string[];
  onSendToWorkspace?: (candidate: StudioRepairCandidate) => void;
}

export function RepairCandidatesPanel({
  candidates,
  sentCandidateIds = [],
  onSendToWorkspace,
}: RepairCandidatesPanelProps) {
  if (candidates.length === 0) {
    return (
      <div className="font-mono text-sm text-foreground/72">
        Detected misconceptions and missing-context cues will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono text-sm text-foreground/78">
      {candidates.map((candidate) => {
        const alreadyInWorkspace = sentCandidateIds.includes(candidate.id);

        return (
          <div
            key={candidate.id}
            className="rounded-[0.85rem] border border-primary/12 bg-black/15 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-foreground">{candidate.title}</div>
                <div className="mt-1 text-xs leading-5 text-foreground/62">
                  {candidate.detail}
                </div>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
              >
                {candidate.badge}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                {candidate.sourceLabel}
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={alreadyInWorkspace}
                onClick={() => onSendToWorkspace?.(candidate)}
                aria-label={
                  alreadyInWorkspace
                    ? `Repair candidate: ${candidate.title} already in Workspace`
                    : `Send repair candidate: ${candidate.title} to Workspace`
                }
                className="h-8 rounded-full border-primary/20 bg-black/20 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/84 hover:bg-black/30 disabled:cursor-default disabled:opacity-100 disabled:text-foreground/60"
              >
                {alreadyInWorkspace ? "In Workspace" : "Send to Workspace"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
