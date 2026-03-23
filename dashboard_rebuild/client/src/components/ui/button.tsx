import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border font-arcade text-sm transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 shadow-[0_10px_20px_rgba(0,0,0,0.24)]",
  {
    variants: {
      variant: {
        default:
          "relative isolate overflow-hidden border-[rgba(255,84,116,0.34)] bg-[radial-gradient(circle,rgba(255,84,116,0.18)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.08)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.08)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat text-[#ffe2ea] shadow-[0_0_0_1px_rgba(255,84,116,0.22),0_12px_26px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.46)] hover:bg-[size:cover,10px_10px,10px_10px] hover:shadow-[0_0_0_1px_rgba(255,84,116,0.28),0_14px_30px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-y-[1px] active:brightness-110",
        outline:
          "relative isolate overflow-hidden border-[rgba(255,84,116,0.24)] bg-[radial-gradient(circle,rgba(255,84,116,0.12)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.06)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.06)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat text-[#ffd8e2] shadow-[0_0_0_1px_rgba(255,84,116,0.12),0_10px_22px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.38)] hover:bg-[size:cover,10px_10px,10px_10px] hover:shadow-[0_0_0_1px_rgba(255,84,116,0.18),0_12px_26px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.07)] hover:text-[#ffe3ea] active:translate-y-[1px] active:brightness-110",
        ghost:
          "border-transparent bg-transparent text-muted-foreground shadow-none hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-primary",
        destructive:
          "border-[rgba(255,84,116,0.42)] bg-[radial-gradient(circle,rgba(255,84,116,0.2)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.1)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.1)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat text-[#fff1f4] shadow-[0_0_0_1px_rgba(255,84,116,0.2),0_0_18px_rgba(255,86,120,0.16),0_12px_26px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.54)] hover:bg-[size:cover,10px_10px,10px_10px] active:translate-y-[1px] active:brightness-110",
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
