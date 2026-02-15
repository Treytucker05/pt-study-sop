/**
 * Centralized color palettes for domain-specific UI elements.
 *
 * Canvas-rendered features keep hex values (can't use CSS vars in canvas).
 * Tailwind-rendered features use class strings.
 */

// ---------------------------------------------------------------------------
// PEIRRO method categories
// ---------------------------------------------------------------------------

export const PEIRRO_COLORS: Record<
  string,
  { border: string; bg: string; badge: string; bar: string }
> = {
  prepare: {
    border: "border-yellow-500 bg-yellow-500/10",
    bg: "bg-yellow-500/10",
    badge: "bg-yellow-500/20 text-yellow-400",
    bar: "bg-yellow-500",
  },
  encode: {
    border: "border-purple-500 bg-purple-500/10",
    bg: "bg-purple-500/10",
    badge: "bg-purple-500/20 text-purple-400",
    bar: "bg-purple-500",
  },
  interrogate: {
    border: "border-green-500 bg-green-500/10",
    bg: "bg-green-500/10",
    badge: "bg-green-500/20 text-green-400",
    bar: "bg-green-500",
  },
  retrieve: {
    border: "border-red-500 bg-red-500/10",
    bg: "bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
    bar: "bg-red-500",
  },
  refine: {
    border: "border-blue-500 bg-blue-500/10",
    bg: "bg-blue-500/10",
    badge: "bg-blue-500/20 text-blue-400",
    bar: "bg-blue-500",
  },
  overlearn: {
    border: "border-gray-500 bg-gray-500/10",
    bg: "bg-gray-500/10",
    badge: "bg-gray-500/20 text-gray-400",
    bar: "bg-gray-500",
  },
};

/** Fallback for unknown categories */
export const PEIRRO_DEFAULT = {
  border: "border-secondary bg-secondary/10",
  bg: "bg-secondary/10",
  badge: "bg-secondary/20 text-muted-foreground",
  bar: "bg-primary",
};

export const PERO_COLORS: Record<
  string,
  { border: string; bg: string; badge: string; bar: string }
> = {
  priming: {
    border: "border-yellow-500 bg-yellow-500/10",
    bg: "bg-yellow-500/10",
    badge: "bg-yellow-500/20 text-yellow-400",
    bar: "bg-yellow-500",
  },
  calibrate: {
    border: "border-amber-500 bg-amber-500/10",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-300",
    bar: "bg-amber-500",
  },
  encoding: {
    border: "border-purple-500 bg-purple-500/10",
    bg: "bg-purple-500/10",
    badge: "bg-purple-500/20 text-purple-400",
    bar: "bg-purple-500",
  },
  reference: {
    border: "border-cyan-500 bg-cyan-500/10",
    bg: "bg-cyan-500/10",
    badge: "bg-cyan-500/20 text-cyan-400",
    bar: "bg-cyan-500",
  },
  retrieval: {
    border: "border-red-500 bg-red-500/10",
    bg: "bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
    bar: "bg-red-500",
  },
  overlearning: {
    border: "border-gray-500 bg-gray-500/10",
    bg: "bg-gray-500/10",
    badge: "bg-gray-500/20 text-gray-400",
    bar: "bg-gray-500",
  },
};

export const PERO_DEFAULT = {
  border: "border-secondary bg-secondary/10",
  bg: "bg-secondary/10",
  badge: "bg-secondary/20 text-muted-foreground",
  bar: "bg-primary",
};

// ---------------------------------------------------------------------------
// Energy cost indicator colors
// ---------------------------------------------------------------------------

export const ENERGY_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

export const ENERGY_DEFAULT = "text-muted-foreground";

// ---------------------------------------------------------------------------
// Concept map node colors (canvas + Tailwind hybrid)
// ---------------------------------------------------------------------------

export const CONCEPT_NODE_COLORS = [
  { name: "Default", border: "border-secondary", bg: "bg-black/80", text: "text-secondary-foreground", hex: "" },
  { name: "Red", border: "border-red-500", bg: "bg-red-500/10", text: "text-red-400", hex: "#ef4444" },
  { name: "Blue", border: "border-blue-500", bg: "bg-blue-500/10", text: "text-blue-400", hex: "#3b82f6" },
  { name: "Green", border: "border-green-500", bg: "bg-green-500/10", text: "text-green-400", hex: "#22c55e" },
  { name: "Yellow", border: "border-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-400", hex: "#eab308" },
  { name: "Purple", border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", hex: "#a855f7" },
  { name: "Cyan", border: "border-cyan-400", bg: "bg-cyan-400/10", text: "text-cyan-400", hex: "#22d3ee" },
  { name: "Orange", border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-400", hex: "#f97316" },
  { name: "Pink", border: "border-pink-500", bg: "bg-pink-500/10", text: "text-pink-400", hex: "#ec4899" },
] as const;

// ---------------------------------------------------------------------------
// Concept map edge colors (canvas hex only)
// ---------------------------------------------------------------------------

export const CONCEPT_EDGE_COLORS = [
  { name: "Primary", stroke: "hsl(var(--primary))" },
  { name: "Red", stroke: "#ef4444" },
  { name: "Blue", stroke: "#3b82f6" },
  { name: "Green", stroke: "#22c55e" },
  { name: "Yellow", stroke: "#eab308" },
  { name: "Purple", stroke: "#a855f7" },
  { name: "Cyan", stroke: "#22d3ee" },
  { name: "Orange", stroke: "#f97316" },
  { name: "Pink", stroke: "#ec4899" },
] as const;

// ---------------------------------------------------------------------------
// Calendar event color picker (hex — stored in DB)
// ---------------------------------------------------------------------------

export const EVENT_COLOR_PALETTE = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
] as const;

// ---------------------------------------------------------------------------
// Obsidian callout styles (Tailwind classes)
// ---------------------------------------------------------------------------

export const CALLOUT_STYLES: Record<string, string> = {
  note: "border-blue-500/50 bg-blue-500/10",
  tip: "border-green-500/50 bg-green-500/10",
  important: "border-purple-500/50 bg-purple-500/10",
  warning: "border-yellow-500/50 bg-yellow-500/10",
  caution: "border-red-500/50 bg-red-500/10",
  info: "border-blue-400/50 bg-blue-400/10",
  abstract: "border-cyan-500/50 bg-cyan-500/10",
  summary: "border-cyan-500/50 bg-cyan-500/10",
  todo: "border-blue-500/50 bg-blue-500/10",
  success: "border-green-500/50 bg-green-500/10",
  question: "border-yellow-400/50 bg-yellow-400/10",
  example: "border-purple-400/50 bg-purple-400/10",
  quote: "border-gray-400/50 bg-gray-400/10",
  bug: "border-red-400/50 bg-red-400/10",
  danger: "border-red-500/50 bg-red-500/10",
  fail: "border-red-500/50 bg-red-500/10",
  failure: "border-red-500/50 bg-red-500/10",
};

// ---------------------------------------------------------------------------
// Vault graph folder colors (canvas hex only)
// ---------------------------------------------------------------------------

export const VAULT_FOLDER_COLORS: Record<string, string> = {
  "": "#6366f1",
  School: "#22d3ee",
  Clinical: "#f472b6",
  Research: "#a78bfa",
  Personal: "#34d399",
};
