import type { ReactElement, ReactNode } from "react";

interface PrimingLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  bottomBar?: ReactNode;
}

export function PrimingLayout({
  leftPanel,
  rightPanel,
  bottomBar,
}: PrimingLayoutProps): ReactElement {
  return (
    <div className="grid grid-rows-[1fr_auto]" style={{ height: "calc(100vh - 12rem)" }}>
      {/* Top row: material reader | workspace */}
      <div className="grid min-h-0 grid-cols-[1fr_1fr]">
        <div className="min-h-0 overflow-y-auto border-2 border-primary/20 bg-black/40">
          {leftPanel}
        </div>

        {/* Vertical divider */}
        <div className="flex min-h-0">
          <div className="w-1 shrink-0 bg-primary/20" />
          <div className="min-h-0 flex-1 overflow-y-auto border-2 border-l-0 border-primary/20 bg-black/40">
            {rightPanel}
          </div>
        </div>
      </div>

      {/* Bottom bar: method blocks */}
      {bottomBar && (
        <div className="h-14 border-t-2 border-primary/20 bg-black/60">
          {bottomBar}
        </div>
      )}
    </div>
  );
}
