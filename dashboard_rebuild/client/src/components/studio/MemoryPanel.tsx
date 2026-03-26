import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudioMemoryStatusModel } from "@/lib/studioMemoryStatus";

export interface MemoryPanelProps {
  status: StudioMemoryStatusModel;
}

const COMPACTION_BADGE_CLASS: Record<
  StudioMemoryStatusModel["compactionState"]["level"],
  string
> = {
  healthy: "border-emerald-400/25 text-emerald-200",
  warning: "border-amber-300/25 text-amber-100",
  critical: "border-rose-300/30 text-rose-100",
};

export function MemoryPanel({ status }: MemoryPanelProps) {
  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Latest capsule
            </div>
            {status.latestCapsule ? (
              <>
                <div className="mt-1 text-sm text-foreground">
                  {status.latestCapsule.versionLabel}
                </div>
                <div className="mt-1 text-sm text-foreground/72">
                  {status.latestCapsule.summary}
                </div>
                <div className="mt-2 text-xs text-foreground/58">
                  {status.latestCapsule.createdAtLabel}
                  {status.latestCapsule.objective
                    ? ` · ${status.latestCapsule.objective}`
                    : ""}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-foreground/72">
                No memory capsules saved yet.
              </div>
            )}
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {status.capsuleCountLabel}
          </Badge>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Compaction state
            </div>
            <div className="mt-1 text-sm text-foreground">
              {status.compactionState.label}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              {status.compactionState.detail}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
              COMPACTION_BADGE_CLASS[status.compactionState.level],
            )}
          >
            {status.compactionState.label}
          </Badge>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/10 bg-black/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          History
        </div>
        {status.history.length > 0 ? (
          <div className="mt-3 space-y-2">
            {status.history.slice(0, 4).map((entry) => (
              <div
                key={entry.id}
                className="rounded-[0.85rem] border border-primary/12 bg-black/15 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-foreground">{entry.versionLabel}</div>
                    <div className="mt-1 text-sm text-foreground/72">
                      {entry.summary}
                    </div>
                  </div>
                  <div className="text-xs text-foreground/58">{entry.createdAtLabel}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-foreground/60">
            Capsule history will appear here after the first compaction save.
          </div>
        )}
      </div>
    </div>
  );
}
