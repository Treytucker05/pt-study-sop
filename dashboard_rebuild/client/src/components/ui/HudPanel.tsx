import type { HTMLAttributes, ReactNode } from "react";

import { CARD_BORDER, CARD_BORDER_SECONDARY } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface HudPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "a" | "b";
  children: ReactNode;
}

export function HudPanel({
  variant = "a",
  children,
  className,
  ...props
}: HudPanelProps) {
  const borderClass = variant === "a" ? CARD_BORDER : CARD_BORDER_SECONDARY;

  return (
    <div
      data-ui="hud-panel"
      data-hud-variant={variant}
      className={cn(borderClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}
