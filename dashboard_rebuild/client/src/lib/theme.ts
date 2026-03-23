/**
 * Shared theme constants for the Neural Command Deck UI.
 *
 * All pages MUST use these instead of ad-hoc Tailwind classes.
 * This keeps font sizes, spacing, borders, and shell hierarchy consistent
 * across Brain home, Calendar, Methods, Scholar, Tutor, and support routes.
 *
 * Font families:
 *   font-arcade  — Press Start 2P (headers, labels, buttons)
 *   font-terminal — VT323 (body, inputs, content)
 */

// ---------------------------------------------------------------------------
// Aesthetic Tokens (Neural/Arcade)
// ---------------------------------------------------------------------------

/** Main header shell shadow and border */
export const SHADOW_HEADER =
  "border-b-4 border-red-700 shadow-[0_10px_30px_rgba(220,38,38,0.4)]";

/** Massive radial glow for title backdrop */
export const GLOW_TITLE_BACKDROP =
  "bg-[radial-gradient(circle,rgba(255,84,84,0.46),transparent_72%)] blur-3xl";

/** Signature arcade text shadow: three-layer red glow */
export const TEXT_SHADOW_ARCADE =
  "[text-shadow:0_0_18px_rgba(255,108,108,0.7),0_0_34px_rgba(255,92,92,0.28),0_5px_0_rgba(36,10,10,0.98)]";

/** Dark banner background gradient */
export const GRADIENT_BANNER =
  "bg-gradient-to-b from-black/40 via-transparent to-black/60";

/** Retro grid pattern (20px) overlay */
export const PATTERN_GRID =
  "bg-[linear-gradient(rgba(220,38,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.05)_1px,transparent_1px)] bg-[size:20px_20px]";

/** Active glow for primary nav buttons */
export const GLOW_ACTIVE_PRIMARY = "drop-shadow-[0_0_24px_rgba(255,74,74,0.42)]";

/** Active glow for support nav buttons */
export const GLOW_ACTIVE_SUPPORT = "drop-shadow-[0_0_22px_rgba(255,74,74,0.42)]";

/** Floating dock shadow for sidebar/notes trigger */
export const SHADOW_DOCK =
  "shadow-[0_14px_28px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,108,138,0.2)]";

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/** Page-level header: "DASHBOARD", "TUTOR", etc. */
export const TEXT_PAGE_TITLE =
  "font-arcade text-xl text-primary tracking-[0.22em] uppercase";

/** Panel/card header: "CONTENT FILTER", "ARTIFACTS" */
export const TEXT_PANEL_TITLE =
  "font-arcade text-ui-sm text-primary tracking-[0.18em] uppercase";

/** Section label: "MODE", "TOPIC", "COURSE" */
export const TEXT_SECTION_LABEL =
  "font-arcade text-ui-xs text-primary/70 uppercase tracking-[0.18em]";

/** Primary body text (lists, names, content) */
export const TEXT_BODY = "font-terminal text-lg text-foreground";

/** Body text for inputs (slightly larger for usability) */
export const TEXT_INPUT = "font-terminal text-lg text-foreground";

/** Secondary/muted text (timestamps, counts, descriptions) */
export const TEXT_MUTED = "font-terminal text-base text-muted-foreground";

/** Badge/tag text */
export const TEXT_BADGE = "rounded-full font-mono text-ui-xs tracking-[0.12em]";

/** Button text (arcade font) */
export const TEXT_BUTTON = "font-arcade text-ui-xs";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** Standard text input */
export const INPUT_BASE =
  "w-full bg-black/60 border-2 border-primary/40 px-3 py-2 font-terminal text-lg text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none";

/** Select/dropdown input */
export const SELECT_BASE =
  "w-full bg-black/60 border-2 border-primary/40 px-3 py-2 font-terminal text-lg text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer";

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/** Primary action button */
export const BTN_PRIMARY =
  "relative isolate overflow-hidden w-full min-h-[44px] rounded-[1rem] border border-[rgba(255,84,116,0.34)] bg-[radial-gradient(circle,rgba(255,84,116,0.18)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.08)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.08)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat px-4 font-arcade text-sm uppercase tracking-[0.22em] text-[#ffe2ea] shadow-[0_0_0_1px_rgba(255,84,116,0.22),0_12px_26px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.46)] hover:bg-[size:cover,10px_10px,10px_10px] active:scale-[0.99] active:brightness-110";

/** Secondary/outline button */
export const BTN_OUTLINE =
  "relative isolate overflow-hidden min-h-[44px] rounded-[1rem] border border-[rgba(255,84,116,0.24)] bg-[radial-gradient(circle,rgba(255,84,116,0.12)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.06)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.06)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat px-4 font-arcade text-sm uppercase tracking-[0.18em] text-[#ffd8e2] shadow-[0_0_0_1px_rgba(255,84,116,0.12),0_10px_22px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.38)] hover:bg-[size:cover,10px_10px,10px_10px] active:scale-[0.99] active:brightness-110";

/** Toolbar toggle button (inactive) */
export const BTN_TOOLBAR =
  "relative isolate overflow-hidden min-h-[44px] rounded-[0.95rem] border border-[rgba(255,84,116,0.18)] bg-[radial-gradient(circle,rgba(255,84,116,0.1)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.05)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat px-3 font-arcade text-ui-xs uppercase tracking-[0.16em] text-[#ffccd7]/78 shadow-[0_0_0_1px_rgba(255,84,116,0.08),0_8px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.32)] hover:bg-[size:cover,10px_10px,10px_10px] hover:text-[#ffe3ea] active:scale-[0.99] active:brightness-110";

/** Toolbar toggle button (active) */
export const BTN_TOOLBAR_ACTIVE =
  "relative isolate overflow-hidden min-h-[44px] rounded-[0.95rem] border border-[rgba(255,84,116,0.32)] bg-[radial-gradient(circle,rgba(255,84,116,0.16)_0%,rgba(0,0,0,0)_95%),linear-gradient(rgba(255,84,116,0.07)_1px,transparent_1px),linear-gradient(to_right,rgba(255,84,116,0.07)_1px,transparent_1px)] bg-[size:cover,15px_15px,15px_15px] bg-center bg-no-repeat px-3 font-arcade text-ui-xs uppercase tracking-[0.16em] text-[#ffe3ea] shadow-[0_0_0_1px_rgba(255,84,116,0.18),0_0_18px_rgba(255,86,120,0.16),0_8px_18px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,160,176,0.42)] hover:bg-[size:cover,10px_10px,10px_10px] active:scale-[0.99] active:brightness-110";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Standard panel padding */
export const PANEL_PADDING = "p-3";

/** Standard gap between sections */
export const SECTION_GAP = "space-y-3";

/** Card border style */
export const CARD_BORDER =
  "app-panel border border-primary/30 rounded-[1.35rem]";

/** Card border (secondary) */
export const CARD_BORDER_SECONDARY =
  "app-panel border border-primary/20 rounded-[1.35rem]";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** Small inline icon */
export const ICON_SM = "w-3 h-3";

/** Medium icon (buttons, labels) */
export const ICON_MD = "w-3.5 h-3.5";

/** Large icon (empty states) */
export const ICON_LG = "w-6 h-6";

// ---------------------------------------------------------------------------
// Status colors (semantic — use these instead of hardcoded green/red/yellow)
// ---------------------------------------------------------------------------

export const STATUS_SUCCESS = "text-success border-success";
export const STATUS_WARNING = "text-warning border-warning";
export const STATUS_INFO = "text-info border-info";
export const STATUS_URGENT = "text-urgent border-urgent";
export const STATUS_ERROR = "text-destructive border-destructive";
