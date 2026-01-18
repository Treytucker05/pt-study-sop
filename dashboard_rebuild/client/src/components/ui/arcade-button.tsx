import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Arcade Button - Neo-Retro 3D Push Button
 * Ported from legacy dashboard.css arcade styling
 */

export interface ArcadeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
  size?: "sm" | "default" | "lg";
}

const ArcadeButton = React.forwardRef<HTMLButtonElement, ArcadeButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "arcade-btn",
          variant === "primary" && "arcade-btn-primary",
          size === "sm" && "text-[0.55rem] py-1 px-3",
          size === "lg" && "text-[0.75rem] py-3 px-6",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
ArcadeButton.displayName = "ArcadeButton";

export { ArcadeButton };
