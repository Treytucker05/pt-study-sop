import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CourseListItemProps {
  name: string;
  sessions: number;
  minutes: number;
  actionLabel?: string;
  buttonLabel?: string;
  onAction: () => void;
  className?: string;
  testId?: string;
}

export function CourseListItem({
  name,
  sessions,
  minutes,
  actionLabel = "Add another Tutor pass",
  buttonLabel = "OPEN TUTOR",
  onAction,
  className,
  testId,
}: CourseListItemProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 border border-primary/15 bg-black/30 px-3 py-3 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div>
        <div className="font-terminal text-sm text-white">{name}</div>
        <div className="mt-1 font-terminal text-[11px] text-muted-foreground">
          {sessions} sessions / {minutes} min
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="font-terminal text-[11px] text-muted-foreground">{actionLabel}</div>
        <Button
          type="button"
          variant="outline"
          className="rounded-none border-primary/40 font-arcade text-[10px] shrink-0"
          onClick={onAction}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
