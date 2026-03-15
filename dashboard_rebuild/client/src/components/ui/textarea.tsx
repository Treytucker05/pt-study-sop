import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "min-h-[96px] w-full rounded-[1rem] border border-primary/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.24)_100%)] px-3 py-2 font-terminal text-lg text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_20px_rgba(0,0,0,0.18)] placeholder:text-muted-foreground/40 focus:border-primary/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
