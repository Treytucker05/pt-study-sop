import { cn } from "@/lib/utils";

export const CONTROL_DECK =
  "relative overflow-hidden rounded-[1.35rem] border border-[rgba(255,122,146,0.24)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01)_16%,rgba(0,0,0,0.24)_100%),linear-gradient(135deg,rgba(124,14,38,0.36),rgba(18,5,10,0.94)_56%,rgba(0,0,0,0.98)_100%)] shadow-[0_18px_36px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,86,118,0.14)] backdrop-blur-xl";

export const CONTROL_DECK_INSET =
  "pointer-events-none absolute inset-[1px] rounded-[1.28rem] border border-[rgba(255,186,202,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_16%,rgba(0,0,0,0.36)_100%)]";

export const CONTROL_DECK_TOPLINE =
  "pointer-events-none absolute inset-x-4 top-2.5 h-px bg-gradient-to-r from-transparent via-[rgba(255,202,214,0.34)] to-transparent";

export const CONTROL_DECK_BOTTOMLINE =
  "pointer-events-none absolute inset-x-5 bottom-2.5 h-px bg-gradient-to-r from-transparent via-[rgba(255,92,120,0.42)] to-transparent";

export const CONTROL_DECK_BODY = "relative z-10 flex min-w-0 flex-col gap-2";

export const CONTROL_DECK_SECTION =
  "rounded-[1.05rem] border border-[rgba(255,120,148,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_18%,rgba(0,0,0,0.28)_100%),linear-gradient(135deg,rgba(255,54,96,0.08),rgba(0,0,0,0.06)_48%,rgba(0,0,0,0.24)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(0,0,0,0.18)]";

export const CONTROL_KICKER =
  "font-arcade text-[10px] uppercase tracking-[0.26em] text-primary/82";

export const CONTROL_COPY = "font-terminal text-xs text-muted-foreground";

export const CONTROL_CHIP =
  "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[rgba(255,122,146,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.18)_100%)] px-3 py-2 font-terminal text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(0,0,0,0.16)]";

export const controlToggleButton = (
  active: boolean,
  emphasis: "primary" | "secondary" = "secondary",
  compact = false,
) =>
  cn(
    "relative isolate inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden rounded-[1rem] border px-3 py-2 font-arcade text-xs uppercase tracking-[0.18em] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
    compact ? "min-h-[40px] px-2.5 text-[10px]" : null,
    emphasis === "primary"
      ? "border-[rgba(255,134,160,0.22)]"
      : "border-[rgba(255,122,146,0.16)]",
    active
      ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,112,146,0.16)_42%,rgba(22,4,10,0.94)_100%)] text-[#fff6f8] shadow-[0_14px_28px_rgba(0,0,0,0.28),0_0_14px_rgba(255,104,136,0.16)] [text-shadow:0_0_8px_rgba(255,106,136,0.36)]"
      : "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01)_20%,rgba(0,0,0,0.28)_100%),linear-gradient(135deg,rgba(110,14,34,0.22),rgba(10,4,7,0.9)_58%,rgba(0,0,0,0.96)_100%)] text-[#ffbfca] shadow-[0_10px_22px_rgba(0,0,0,0.2)] hover:-translate-y-[1px] hover:border-[rgba(255,164,184,0.3)] hover:text-white hover:shadow-[0_14px_26px_rgba(0,0,0,0.28),0_0_12px_rgba(255,100,136,0.1)]",
  );
