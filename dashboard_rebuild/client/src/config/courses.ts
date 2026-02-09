/**
 * Course configuration for the PT Study SOP application.
 * Centralized to avoid duplication across components.
 */

export interface Course {
  id: string;
  name: string;
  path: string;
}

export const COURSE_FOLDERS: Course[] = [
  { id: "ebp", name: "EBP", path: "School/Evidence Based Practice" },
  { id: "exphys", name: "ExPhys", path: "School/Exercise Physiology" },
  { id: "ms1", name: "MS1", path: "School/Movement Science 1" },
  { id: "neuro", name: "Neuro", path: "School/Neuroscience" },
  { id: "ti", name: "TI", path: "School/Therapeutic Intervention" },
];

/**
 * Get course by ID
 */
export function getCourseById(id: string): Course | undefined {
  return COURSE_FOLDERS.find((c) => c.id === id);
}

/**
 * Get course by path
 */
export function getCourseByPath(path: string): Course | undefined {
  return COURSE_FOLDERS.find((c) => c.path === path);
}

/**
 * Check if a path is within any course folder
 */
export function isInCourseFolder(path: string): boolean {
  return COURSE_FOLDERS.some((c) => path.startsWith(c.path));
}

/**
 * Get all course paths as array of strings
 * Useful for wikilink resolution fallback
 */
export function getCoursePaths(): string[] {
  return COURSE_FOLDERS.map((c) => c.path);
}
