import { describe, expect, it } from "vitest";
import {
  clearTutorWizardProgress,
  parseTutorCourseIdFromSearch,
  readTutorSelectedMaterialIds,
  readTutorStartState,
  TUTOR_SELECTED_MATERIAL_IDS_KEY,
  TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
  TUTOR_START_STATE_KEY,
  TUTOR_WIZARD_PROGRESS_KEY,
  TUTOR_WIZARD_STATE_KEY,
  writeTutorSelectedMaterialIds,
  writeTutorStartState,
} from "@/lib/tutorClientState";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.has(key) ? this.values.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("tutorClientState", () => {
  it("migrates legacy selected material ids into the new key", () => {
    const storage = new MemoryStorage();
    storage.setItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY, JSON.stringify([4, 4, 8, -1]));

    expect(readTutorSelectedMaterialIds(storage)).toEqual([4, 8]);
    expect(storage.getItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY)).toBeNull();
    expect(storage.getItem(TUTOR_SELECTED_MATERIAL_IDS_KEY)).toBe(JSON.stringify([4, 8]));
  });

  it("migrates legacy wizard state into course-scoped tutor start state", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      TUTOR_WIZARD_STATE_KEY,
      JSON.stringify({
        courseId: 22,
        topic: "Motor control",
        selectedMaterials: [11, 12, 12],
        chainId: 5,
        customBlockIds: [7, 8],
        accuracyProfile: "coverage",
        objectiveScope: "single_focus",
        selectedPaths: ["Courses/Neuro/Week 8"],
      }),
    );
    storage.setItem(TUTOR_WIZARD_PROGRESS_KEY, "2");

    expect(readTutorStartState(22, storage)).toEqual({
      topic: "Motor control",
      selectedMaterialIds: [11, 12],
      chainId: 5,
      customBlockIds: [7, 8],
      accuracyProfile: "coverage",
      objectiveScope: "single_focus",
      selectedPaths: ["Courses/Neuro/Week 8"],
    });
    expect(storage.getItem(TUTOR_WIZARD_STATE_KEY)).toBeNull();
    expect(storage.getItem(TUTOR_WIZARD_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(TUTOR_START_STATE_KEY)).toContain("\"22\"");
  });

  it("writes normalized course-scoped tutor start state", () => {
    const storage = new MemoryStorage();

    expect(
      writeTutorStartState(
        9,
        {
          topic: "Brain stem",
          selectedMaterialIds: [5, 5, 3],
          customBlockIds: [4, 4, 6],
          accuracyProfile: "balanced",
          objectiveScope: "module_all",
          selectedPaths: ["A", "A", "B"],
        },
        storage,
      ),
    ).toEqual({
      topic: "Brain stem",
      selectedMaterialIds: [5, 3],
      chainId: undefined,
      customBlockIds: [4, 6],
      accuracyProfile: "balanced",
      objectiveScope: "module_all",
      selectedPaths: ["A", "B"],
    });
  });

  it("parses course_id from tutor query strings safely", () => {
    expect(parseTutorCourseIdFromSearch("?course_id=17")).toBe(17);
    expect(parseTutorCourseIdFromSearch("?mode=tutor&course_id=4")).toBe(4);
    expect(parseTutorCourseIdFromSearch("?course_id=abc")).toBeUndefined();
    expect(parseTutorCourseIdFromSearch("?course_id=0")).toBeUndefined();
  });

  it("clears legacy wizard progress without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(TUTOR_WIZARD_PROGRESS_KEY, "1");

    clearTutorWizardProgress(storage);

    expect(storage.getItem(TUTOR_WIZARD_PROGRESS_KEY)).toBeNull();
  });

  it("writes normalized selected material ids", () => {
    const storage = new MemoryStorage();

    expect(writeTutorSelectedMaterialIds([9, 2, 9, -4], storage)).toEqual([9, 2]);
    expect(storage.getItem(TUTOR_SELECTED_MATERIAL_IDS_KEY)).toBe(JSON.stringify([9, 2]));
  });
});
