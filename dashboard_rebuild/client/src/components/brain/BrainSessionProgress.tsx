import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function BrainSessionProgress() {
  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.sessions.getAll,
  });

  const { data: plannerQueue = [] } = useQuery({
    queryKey: ["planner-queue"],
    queryFn: api.planner.getQueue,
  });

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const isToday = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === todayStr;
  };

  const hasTodaySession = sessions.some((s: { date: Date }) => isToday(s.date));
  const hasCards = sessions.some((s: { date: Date; cards: number }) => isToday(s.date) && s.cards > 0);
  const hasTasks = plannerQueue.length > 0;

  return (
    <div className="brain-progress" role="status" aria-label="Session progress">
      <div
        className={cn("brain-progress__segment", hasTodaySession && "brain-progress__segment--done")}
        title={`Study session: ${hasTodaySession ? "done" : "pending"}`}
      />
      <div
        className={cn("brain-progress__segment", hasCards && "brain-progress__segment--done")}
        title={`Cards: ${hasCards ? "generated" : "pending"}`}
      />
      <div
        className={cn("brain-progress__segment", hasTasks && "brain-progress__segment--done")}
        title={`Planner: ${hasTasks ? "has tasks" : "empty"}`}
      />
    </div>
  );
}
