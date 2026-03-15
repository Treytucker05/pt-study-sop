/**
 * Course configuration for the PT Study SOP application.
 * Centralized to avoid duplication across components.
 */

interface Course {
  id: string;
  name: string;
  path: string;
}

export const COURSE_FOLDERS: Course[] = [
  { id: "ebp", name: "EBP", path: "Evidence Based Practice" },
  { id: "exphys", name: "ExPhys", path: "Exercise Physiology" },
  { id: "ms1", name: "MS1", path: "Movement Science 1" },
  { id: "neuro", name: "Neuro", path: "Neuroscience" },
  { id: "ti", name: "TI", path: "Therapeutic Intervention" },
];

/**
 * Get all course paths as array of strings
 * Useful for wikilink resolution fallback
 */
export function getCoursePaths(): string[] {
  return COURSE_FOLDERS.map((c) => c.path);
}
