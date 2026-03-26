import { Badge } from "@/components/ui/badge";

export interface RunConfigPanelProps {
  primingMethodIds: string[];
  chainId?: number;
  customBlockIds: number[];
  hasActiveSession: boolean;
}

function getTutorStartSummary(
  chainId: number | undefined,
  customBlockIds: number[],
): { label: string; detail: string; mode: string } {
  if (typeof chainId === "number") {
    return {
      label: "Template chain selected",
      detail: `Chain #${chainId}`,
      mode: "Template",
    };
  }

  if (customBlockIds.length === 1) {
    return {
      label: "Solo method selected",
      detail: `Method block #${customBlockIds[0]}`,
      mode: "Solo",
    };
  }

  if (customBlockIds.length > 1) {
    return {
      label: "Custom method stack selected",
      detail: `${customBlockIds.length} method blocks staged`,
      mode: "Custom",
    };
  }

  return {
    label: "No tutor structure selected",
    detail: "Choose a template chain or a solo method before Tutor starts.",
    mode: "Not set",
  };
}

export function RunConfigPanel({
  primingMethodIds,
  chainId,
  customBlockIds,
  hasActiveSession,
}: RunConfigPanelProps) {
  const tutorStart = getTutorStartSummary(chainId, customBlockIds);

  return (
    <div className="space-y-4 font-mono text-sm text-foreground/78">
      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Priming
        </div>
        <div className="mt-1 text-sm text-foreground">
          {primingMethodIds.length > 0
            ? `${primingMethodIds.length} priming methods selected`
            : "No priming methods selected yet"}
        </div>
      </div>

      <div className="rounded-[0.85rem] border border-primary/15 bg-black/15 p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
          Tutor start mode
        </div>
        <div className="mt-1 text-sm text-foreground">{tutorStart.label}</div>
        <div className="mt-1 text-sm text-foreground/72">{tutorStart.detail}</div>
        <Badge
          variant="outline"
          className="mt-3 rounded-full border-primary/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
        >
          {tutorStart.mode}
        </Badge>
      </div>

      <div className="rounded-[0.85rem] border border-primary/10 bg-black/10 p-3 text-foreground/72">
        {hasActiveSession
          ? "Tutor session is already live."
          : "Tutor session not started yet."}
      </div>
    </div>
  );
}
