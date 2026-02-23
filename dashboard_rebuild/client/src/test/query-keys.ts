/**
 * Centralized query key constants for tests.
 *
 * Keep these in sync with the production queryKey arrays used in components.
 * If a test breaks because a query key changed in production code,
 * update the constant here — one place to fix instead of many.
 */
export const QUERY_KEYS = {
  TUTOR_CONTENT_SOURCES: "tutor-content-sources",
  TUTOR_CHAINS_TEMPLATES: "tutor-chains-templates",
} as const;
