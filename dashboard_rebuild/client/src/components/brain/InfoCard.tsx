import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InfoCardProps {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  className?: string;
}

export function InfoCard({ label, value, subtext, className }: InfoCardProps) {
  return (
    <div className={cn("border border-primary/20 bg-black/35 p-3", className)}>
      <div className="font-arcade text-[11px] text-primary uppercase">{label}</div>
      <div className="mt-2 font-terminal text-sm text-white">{value}</div>
      {subtext && (
        <div className="mt-1 font-terminal text-[11px] text-muted-foreground line-clamp-2">
          {subtext}
        </div>
      )}
    </div>
  );
}

interface InfoCardGridProps {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
}

export function InfoCardGrid({ children, columns = 3, className }: InfoCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}
