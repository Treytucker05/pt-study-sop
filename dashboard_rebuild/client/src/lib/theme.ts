/**
 * Shared theme constants for the retro arcade UI.
 *
 * All pages MUST use these instead of ad-hoc Tailwind classes.
 * This keeps font sizes, spacing, and borders consistent
 * across Brain home, Calendar, Methods, Scholar, and Tutor.
 *
 * Font families:
 *   font-arcade  — Press Start 2P (headers, labels, buttons)
 *   font-terminal — VT323 (body, inputs, content)
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/** Page-level header: "DASHBOARD", "TUTOR", etc. */
export const TEXT_PAGE_TITLE = "font-arcade text-xl text-primary tracking-[0.22em] uppercase";

/** Panel/card header: "CONTENT FILTER", "ARTIFACTS" */
export const TEXT_PANEL_TITLE = "font-arcade text-base text-primary tracking-[0.18em] uppercase";

/** Section label: "MODE", "TOPIC", "COURSE" */
export const TEXT_SECTION_LABEL =
  "font-arcade text-sm text-primary/70 uppercase tracking-[0.18em]";

/** Primary body text (lists, names, content) */
export const TEXT_BODY = "font-terminal text-lg text-foreground";

/** Body text for inputs (slightly larger for usability) */
export const TEXT_INPUT = "font-terminal text-lg text-foreground";

/** Secondary/muted text (timestamps, counts, descriptions) */
export const TEXT_MUTED = "font-terminal text-base text-muted-foreground";

/** Badge/tag text */
export const TEXT_BADGE = "text-sm rounded-none";

/** Button text (arcade font) */
export const TEXT_BUTTON = "font-arcade text-sm";

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
  "w-full min-h-[44px] rounded-[1rem] border border-primary/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,86,120,0.16)_44%,rgba(26,4,10,0.92)_100%)] font-arcade text-sm text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:border-primary/80";

/** Secondary/outline button */
export const BTN_OUTLINE =
  "min-h-[44px] rounded-[1rem] border border-muted-foreground/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_38%,rgba(0,0,0,0.2)_100%)] font-arcade text-sm hover:-translate-y-0.5 hover:border-primary/50";

/** Toolbar toggle button (inactive) */
export const BTN_TOOLBAR =
  "min-h-[44px] rounded-[0.95rem] font-arcade text-xs px-3 text-muted-foreground hover:text-primary border border-transparent";

/** Toolbar toggle button (active) */
export const BTN_TOOLBAR_ACTIVE =
  "min-h-[44px] rounded-[0.95rem] font-arcade text-xs px-3 text-primary bg-primary/15 border border-primary/40 shadow-[0_0_18px_rgba(255,86,120,0.16)]";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Standard panel padding */
export const PANEL_PADDING = "p-3";

/** Standard gap between sections */
export const SECTION_GAP = "space-y-3";

/** Card border style */
export const CARD_BORDER = "app-panel border border-primary/30 rounded-[1.35rem]";

/** Card border (secondary) */
export const CARD_BORDER_SECONDARY = "app-panel border border-primary/20 rounded-[1.35rem]";

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
