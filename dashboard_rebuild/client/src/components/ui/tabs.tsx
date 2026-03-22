import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { CONTROL_DECK } from "@/components/shell/controlStyles";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;
const tabsListClass = cn(
  CONTROL_DECK,
  "inline-grid min-h-[56px] w-full auto-cols-fr grid-flow-col items-stretch gap-2 p-2",
);
const tabsTriggerClass =
  "relative isolate inline-flex min-h-[44px] items-center justify-start gap-2 overflow-hidden rounded-[1rem] border border-[rgba(255,122,146,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_20%,rgba(0,0,0,0.28)_100%),linear-gradient(135deg,rgba(110,14,34,0.22),rgba(10,4,7,0.9)_58%,rgba(0,0,0,0.96)_100%)] px-3 py-2 font-arcade text-ui-xs uppercase tracking-[0.18em] text-[#ffbfca] shadow-[0_10px_22px_rgba(0,0,0,0.2)] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:-translate-y-[1px] hover:border-[rgba(255,164,184,0.3)] hover:text-white hover:shadow-[0_14px_26px_rgba(0,0,0,0.28),0_0_12px_rgba(255,100,136,0.1)] data-[state=active]:border-[rgba(255,180,196,0.48)] data-[state=active]:bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,112,146,0.16)_42%,rgba(22,4,10,0.94)_100%)] data-[state=active]:text-[#fff6f8] data-[state=active]:shadow-[0_14px_28px_rgba(0,0,0,0.28),0_0_14px_rgba(255,104,136,0.16)] data-[state=active]:[text-shadow:0_0_8px_rgba(255,106,136,0.36)]";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListClass, className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      tabsTriggerClass,
      "whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
