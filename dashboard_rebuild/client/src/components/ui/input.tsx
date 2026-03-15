import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-[44px] w-full rounded-[1rem] border border-primary/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.22)_100%)] px-3 py-2 font-terminal text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_20px_rgba(0,0,0,0.18)] transition-[border-color,box-shadow,background-color] file:border-0 file:bg-transparent file:text-lg file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
