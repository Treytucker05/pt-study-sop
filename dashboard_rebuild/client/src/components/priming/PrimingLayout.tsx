import type { ReactElement, ReactNode } from "react";

interface PrimingLayoutProps {
  leftRail: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  bottomBar?: ReactNode;
}

export function PrimingLayout({
  leftRail,
  centerPanel,
  rightPanel,
  bottomBar,
}: PrimingLayoutProps): ReactElement {
  return (
    <div className="space-y-4">
      <section className="border-2 border-primary/20 bg-black/40">{leftRail}</section>
      <section className="border-2 border-primary/20 bg-black/40">{centerPanel}</section>
      <section className="border-2 border-primary/20 bg-black/40">{rightPanel}</section>
      {bottomBar && (
        <div className="sticky bottom-0 z-10 h-14 border-t-2 border-primary/20 bg-black/70 backdrop-blur">
          {bottomBar}
        </div>
      )}
    </div>
  );
}
