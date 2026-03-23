import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";

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
  heroFooter?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const EMPTY_PAGE_STATS: PageScaffoldStat[] = [];

function isHiddenByDisplayNone(node: HTMLElement) {
  let current: HTMLElement | null = node;
  while (current) {
    if (window.getComputedStyle(current).display === "none") {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

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

/** The portal target ID in layout.tsx */
const HERO_PORTAL_ID = "page-hero-portal";

export function PageScaffold({
  title,
  subtitle,
  eyebrow,
  stats = EMPTY_PAGE_STATS,
  actions,
  heroFooter,
  children,
  className,
  contentClassName,
}: PageScaffoldProps) {
  const [location] = useLocation();
  const dipLayerId = useId().replace(/:/g, "");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const portal = document.getElementById(HERO_PORTAL_ID);
    const shell = shellRef.current;
    if (!portal || !shell) return;

    if (isHiddenByDisplayNone(shell)) {
      return;
    }

    const wrapper = wrapperRef.current ?? document.createElement("div");
    wrapperRef.current = wrapper;
    portal.replaceChildren(wrapper);
    setPortalTarget(wrapper);

    return () => {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    };
  }, [location]);

  const glowId = `page-dipline-glow-${dipLayerId}`;
  const blurId = `page-dipline-blur-${dipLayerId}`;

  const heroContent = (
    <section className="page-shell__hero page-shell__hero--glass">
      <div className="page-shell__grid" aria-hidden="true" />
      <div className="page-shell__header">
        <div className="page-shell__title-block min-w-0">
          <div className="page-shell__title-heading">
            {eyebrow ? <div className="page-shell__eyebrow">{eyebrow}</div> : null}
            <h1 className="page-shell__title">{title}</h1>
            {/*
              Dipline spans eyebrow→title: long low run under the wordmark, then a tall diagonal
              to the top band (y≈0 in viewBox) before the upper rail continues across.
            */}
            <svg
              className="page-shell__dipline"
              aria-hidden="true"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={glowId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,40,65,0.3)" />
                  <stop offset="12%" stopColor="rgba(255,50,75,1)" />
                  <stop offset="50%" stopColor="rgba(255,60,85,1)" />
                  <stop offset="88%" stopColor="rgba(255,50,75,1)" />
                  <stop offset="100%" stopColor="rgba(255,40,65,0.3)" />
                </linearGradient>
                <filter id={blurId}>
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>
              <polyline
                points="0,86 360,86 395,4 1000,4"
                fill="none"
                stroke={`url(#${glowId})`}
                strokeWidth="5"
                strokeLinejoin="round"
                filter={`url(#${blurId})`}
                opacity="0.55"
              />
              <polyline
                points="0,86 360,86 395,4 1000,4"
                fill="none"
                stroke={`url(#${glowId})`}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="page-shell__subtitle">{subtitle}</p>
        </div>
        {(stats.length > 0 || actions) ? (
          <div className="page-shell__meta">
            {stats.length > 0 ? (
              <div className="page-shell__stat-grid">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={cn("page-shell__stat", statToneClass(stat.tone))}
                  >
                    <span className="page-shell__stat-label">{stat.label}</span>
                    <span className="page-shell__stat-value">{stat.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {actions ? <div className="page-shell__actions">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      {heroFooter ? (
        <div className="page-shell__hero-footer relative z-[3] mt-2 w-full">
          {heroFooter}
        </div>
      ) : null}
    </section>
  );

  return (
    <div ref={shellRef} className={cn("page-shell", className)}>
      {portalTarget ? createPortal(heroContent, portalTarget) : null}
      <div className={cn("page-shell__content", contentClassName)}>{children}</div>
    </div>
  );
}
