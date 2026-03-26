import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StudioTutorStatusModel } from "@/lib/studioTutorStatus";

export interface TutorStatusPanelProps {
  status: StudioTutorStatusModel;
}

const CONTEXT_HEALTH_BADGE_CLASS: Record<
  StudioTutorStatusModel["contextHealth"]["level"],
  string
> = {
  healthy: "border-emerald-400/25 text-emerald-200",
  warning: "border-amber-300/25 text-amber-100",
  critical: "border-rose-300/30 text-rose-100",
};

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[0.85rem] border border-primary/12 bg-black/15 p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
      {detail ? (
        <div className="mt-1 text-xs leading-5 text-foreground/62">{detail}</div>
      ) : null}
    </div>
  );
}

export function TutorStatusPanel({ status }: TutorStatusPanelProps) {
  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Adaptive strategy
            </div>
            <div className="mt-1 text-sm text-foreground">
              {status.strategyLabel}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              {status.strategySummary}
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
          >
            {status.runtimeStateLabel}
          </Badge>
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
              Context health
            </div>
            <div className="mt-1 text-sm text-foreground">
              {status.contextHealth.label}
            </div>
            <div className="mt-1 text-sm text-foreground/72">
              {status.contextHealth.detail}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
              CONTEXT_HEALTH_BADGE_CLASS[status.contextHealth.level],
            )}
          >
            {status.contextHealth.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <MetricCard label="Turns" value={status.turnCountLabel} />
        <MetricCard label="Stage timer" value={status.stageTimerLabel} />
        <MetricCard label="Memory capsules" value={status.memoryCapsuleLabel} />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <MetricCard
          label="Rules-following"
          value={status.rulesFollowingLabel}
          detail={status.rulesFollowingDetail}
        />
        <MetricCard
          label="Provenance confidence"
          value={status.provenanceConfidenceLabel}
        />
        <MetricCard
          label="Repair signal"
          value={status.repairSignal.label}
          detail={status.repairSignal.detail}
        />
      </div>
    </div>
  );
}
