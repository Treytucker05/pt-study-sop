/**
 * Shared theme constants for the retro arcade UI.
 *
 * All pages MUST use these instead of ad-hoc Tailwind classes.
 * This keeps font sizes, spacing, and borders consistent
 * across Dashboard, Brain, Calendar, Methods, Scholar, and Tutor.
 *
 * Font families:
 *   font-arcade  — Press Start 2P (headers, labels, buttons)
 *   font-terminal — VT323 (body, inputs, content)
 */

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/** Page-level header: "DASHBOARD", "TUTOR", etc. */
export const TEXT_PAGE_TITLE = "font-arcade text-xl text-primary tracking-widest";

/** Panel/card header: "CONTENT FILTER", "ARTIFACTS" */
export const TEXT_PANEL_TITLE = "font-arcade text-base text-primary tracking-widest";

/** Section label: "MODE", "TOPIC", "COURSE" */
export const TEXT_SECTION_LABEL =
  "font-arcade text-sm text-primary/70 uppercase tracking-widest";

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
  "w-full rounded-none border-2 border-primary font-arcade text-sm h-10 bg-primary/10 hover:bg-primary/20";

/** Secondary/outline button */
export const BTN_OUTLINE =
  "rounded-none border border-muted-foreground/30 font-arcade text-sm h-9 hover:border-muted-foreground/50";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Standard panel padding */
export const PANEL_PADDING = "p-3";

/** Standard gap between sections */
export const SECTION_GAP = "space-y-3";

/** Card border style */
export const CARD_BORDER = "border-2 border-primary rounded-none";

/** Card border (secondary) */
export const CARD_BORDER_SECONDARY = "border-2 border-primary/40 rounded-none";

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
