import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionItemRowProps {
  title: string;
  reason: string;
  buttonLabel: string;
  onAction: () => void;
  className?: string;
  testId?: string;
}

export function ActionItemRow({
  title,
  reason,
  buttonLabel,
  onAction,
  className,
  testId,
}: ActionItemRowProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 border border-primary/15 bg-black/30 p-4 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <div className="font-terminal text-sm text-white">{title}</div>
        <div className="font-terminal text-xs text-muted-foreground">{reason}</div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-none border-primary/40 font-arcade text-xs shrink-0"
        data-testid={testId ? `${testId}-action` : undefined}
        onClick={onAction}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
