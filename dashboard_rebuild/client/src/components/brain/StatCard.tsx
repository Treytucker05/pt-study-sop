import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  className?: string;
  testId?: string;
}

export function StatCard({ label, value, subtext, className, testId }: StatCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn("border border-primary/15 bg-black/30 p-3", className)}
    >
      <div className="font-arcade text-[11px] text-primary uppercase">{label}</div>
      <div className="mt-2 font-terminal text-sm text-white">{value}</div>
      {subtext && (
        <div className="mt-1 font-terminal text-[11px] text-muted-foreground">{subtext}</div>
      )}
    </div>
  );
}
