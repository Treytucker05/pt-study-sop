import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageScaffoldTone = "default" | "info" | "warn" | "success" | "danger";

interface PageScaffoldStat {
  label: string;
  value: ReactNode;
  tone?: PageScaffoldTone;
}

interface PageScaffoldProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  stats?: PageScaffoldStat[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const EMPTY_PAGE_STATS: PageScaffoldStat[] = [];

function statToneClass(tone: PageScaffoldTone | undefined) {
  switch (tone) {
    case "info":
      return "page-shell__stat--info";
    case "warn":
      return "page-shell__stat--warn";
    case "success":
      return "page-shell__stat--success";
    case "danger":
      return "page-shell__stat--danger";
    default:
      return null;
  }
}

export function PageScaffold({
  title,
  subtitle,
  eyebrow,
  stats = EMPTY_PAGE_STATS,
  actions,
  children,
  className,
  contentClassName,
}: PageScaffoldProps) {
  return (
    <div className={cn("page-shell", className)}>
      <section className="page-shell__hero">
        <div className="page-shell__grid" aria-hidden="true" />
        <div className="page-shell__horizon" aria-hidden="true" />
        <div className="page-shell__header">
          <div className="min-w-0">
            {eyebrow ? <div className="page-shell__eyebrow">{eyebrow}</div> : null}
            <h1 className="page-shell__title">{title}</h1>
            <p className="page-shell__subtitle">{subtitle}</p>
          </div>
          {(stats.length > 0 || actions) ? (
            <div className="page-shell__meta">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn("page-shell__stat", statToneClass(stat.tone))}
                >
                  <span className="page-shell__stat-label">{stat.label}</span>
                  <span className="page-shell__stat-value">{stat.value}</span>
                </div>
              ))}
              {actions ? <div className="page-shell__actions">{actions}</div> : null}
            </div>
          ) : null}
        </div>
      </section>
      <div className={cn("page-shell__content", contentClassName)}>{children}</div>
    </div>
  );
}
