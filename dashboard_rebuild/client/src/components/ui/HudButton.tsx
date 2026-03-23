import type { ButtonHTMLAttributes, ReactNode } from "react";

import { BTN_OUTLINE, BTN_PRIMARY } from "@/lib/theme";
import { cn } from "@/lib/utils";

export interface HudButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  children: ReactNode;
}

export function HudButton({
  variant = "primary",
  children,
  className,
  type,
  ...props
}: HudButtonProps) {
  const baseClass = variant === "primary" ? BTN_PRIMARY : BTN_OUTLINE;

  return (
    <button
      type={type ?? "button"}
      data-ui="hud-button"
      data-hud-variant={variant}
      className={cn(
        baseClass,
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "active:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
