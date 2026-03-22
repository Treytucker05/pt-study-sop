import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CONTROL_KICKER } from "@/components/shell/controlStyles";

interface StatCardProps {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  className?: string;
  testId?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  className,
  testId,
}: StatCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-[1rem] border border-[rgba(255,120,148,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_18%,rgba(0,0,0,0.28)_100%),linear-gradient(135deg,rgba(255,54,96,0.08),rgba(0,0,0,0.06)_48%,rgba(0,0,0,0.24)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div className={CONTROL_KICKER}>{label}</div>
      <div className="mt-2 font-mono text-base leading-7 text-foreground">
        {value}
      </div>
      {subtext && (
        <div className="mt-1 font-mono text-sm leading-6 text-foreground/68">
          {subtext}
        </div>
      )}
    </div>
  );
}
