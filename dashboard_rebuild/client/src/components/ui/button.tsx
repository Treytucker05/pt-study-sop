import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border font-arcade text-sm transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 shadow-[0_10px_20px_rgba(0,0,0,0.24)]",
  {
    variants: {
      variant: {
        default:
          "border-primary/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,86,120,0.2)_44%,rgba(26,4,10,0.92)_100%)] text-white hover:-translate-y-0.5 hover:border-primary/80 hover:shadow-[0_12px_26px_rgba(0,0,0,0.28),0_0_18px_rgba(255,86,120,0.2)] active:translate-y-[1px]",
        outline:
          "border-primary/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.22)_100%)] text-primary hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/12 hover:text-white",
        ghost:
          "border-transparent bg-transparent text-muted-foreground shadow-none hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
        destructive:
          "border-destructive/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(248,113,113,0.16)_44%,rgba(32,6,6,0.9)_100%)] text-destructive-foreground hover:-translate-y-0.5 hover:bg-destructive/80",
        shell:
          "rounded-[1.4rem] border border-[rgba(255,120,140,0.7)] bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.26),transparent_42%),radial-gradient(circle_at_82%_118%,rgba(40,6,14,0.98),rgba(2,0,4,1)_82%)] text-[#ff8a9a] shadow-[0_16px_32px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,120,140,0.4)] hover:-translate-y-0.5 hover:text-[#ffeef2] hover:shadow-[0_20px_40px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,150,170,0.7)] [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_8px_rgba(255,90,120,0.65)] active:translate-y-[1px]",
      },
      size: {
        default: "h-11 min-h-[44px] px-4 py-2",
        sm: "h-10 min-h-[44px] px-3 text-xs",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
