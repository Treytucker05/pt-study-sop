import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface TutorTeachLegListProps {
  workflowId: string | null;
  activeSessionId: string | null;
  onSelectLeg?: (sessionId: string) => void;
}

export function TutorTeachLegList({
  workflowId,
  activeSessionId,
  onSelectLeg,
}: TutorTeachLegListProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tutor-teach-legs", workflowId],
    enabled: Boolean(workflowId),
    queryFn: () => api.tutor.listTeachLegs(workflowId!),
  });

  const legs = data?.teach_legs ?? [];
  if (!workflowId) return null;

  return (
    <section
      className="rounded-[var(--ds-r-085)] border border-primary/12 bg-black/10 px-3 py-2"
      data-testid="tutor-teach-leg-list"
      aria-label="Teach legs on this study run"
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
        Teach legs
      </div>
      {isLoading ? (
        <div className="mt-2 text-sm text-foreground/60">Loading legs…</div>
      ) : legs.length === 0 ? (
        <div className="mt-2 text-sm text-foreground/60">
          No teach legs yet. Start Tutor to open the first leg.
        </div>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {legs.map((leg) => {
            const isActive =
              leg.is_active || leg.session_id === activeSessionId;
            return (
              <li key={leg.session_id}>
                <button
                  type="button"
                  data-testid={`tutor-teach-leg-${leg.session_id}`}
                  className={cn(
                    "rounded-full border px-3 py-1 text-left text-xs transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-primary/15 bg-black/20 text-foreground/78 hover:border-primary/30",
                  )}
                  onClick={() => onSelectLeg?.(leg.session_id)}
                >
                  <span className="font-medium">{leg.teach_leg_label}</span>
                  <span className="ml-2 text-foreground/55">
                    {leg.status}
                    {typeof leg.turn_count === "number" ? ` · ${leg.turn_count} turns` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
