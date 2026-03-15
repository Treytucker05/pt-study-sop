import {
  clearTutorActiveSessionId,
  consumeLibraryLaunchFromTutor,
  consumeTutorLaunchHandoff,
  LIBRARY_TUTOR_HANDOFF_KEY,
  normalizeTutorAccuracyProfile,
  readTutorActiveSessionId,
  readTutorObjectiveScope,
  readTutorSelectedMaterialIds,
  readTutorStoredStartState,
  TUTOR_BRAIN_HANDOFF_KEY,
  TUTOR_LIBRARY_HANDOFF_KEY,
  TUTOR_OBJECTIVE_SCOPE_KEY,
  TUTOR_SELECTED_MATERIAL_IDS_KEY,
  TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
  TUTOR_START_STATE_KEY,
  TUTOR_START_STATE_LEGACY_KEY,
  writeTutorActiveSessionId,
  writeLibraryLaunchFromTutor,
  writeTutorObjectiveScope,
  writeTutorSelectedMaterialIds,
} from "@/lib/tutorClientState";
import { describe, expect, it, beforeEach } from "vitest";

describe("tutorClientState", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("maps the legacy standard accuracy profile to strict", () => {
    expect(normalizeTutorAccuracyProfile("standard")).toBe("strict");
    expect(normalizeTutorAccuracyProfile("balanced")).toBe("balanced");
  });

  it("migrates legacy tutor material ids from v1 to v2", () => {
    localStorage.setItem(
      TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
      JSON.stringify([11, 12]),
    );

    expect(readTutorSelectedMaterialIds()).toEqual([11, 12]);
    expect(localStorage.getItem(TUTOR_SELECTED_MATERIAL_IDS_KEY)).toBe(
      JSON.stringify([11, 12]),
    );
    expect(
      localStorage.getItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY),
    ).toBeNull();
  });

  it("prefers the current tutor material id key when both keys exist", () => {
    localStorage.setItem(TUTOR_SELECTED_MATERIAL_IDS_KEY, JSON.stringify([21]));
    localStorage.setItem(
      TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
      JSON.stringify([99]),
    );

    expect(readTutorSelectedMaterialIds()).toEqual([21]);
  });

  it("writes normalized ids to v2 and clears v1", () => {
    localStorage.setItem(
      TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
      JSON.stringify([77]),
    );

    expect(writeTutorSelectedMaterialIds([31, 31, -1, 32])).toEqual([31, 32]);
    expect(localStorage.getItem(TUTOR_SELECTED_MATERIAL_IDS_KEY)).toBe(
      JSON.stringify([31, 32]),
    );
    expect(
      localStorage.getItem(TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY),
    ).toBeNull();
  });

  it("migrates legacy Tutor start state from the wizard key", () => {
    localStorage.setItem(
      TUTOR_START_STATE_LEGACY_KEY,
      JSON.stringify({
        courseId: 77,
        topic: "Week 8",
        selectedMaterials: [301, 302],
        chainId: 8,
        customBlockIds: [11, 12],
        accuracyProfile: "balanced",
        objectiveScope: "single_focus",
        selectedObjectiveId: "OBJ-8",
        selectedObjectiveGroup: "Week 8 - Vestibular",
        selectedPaths: ["Courses/Neuro/Week 8"],
      }),
    );

    expect(readTutorStoredStartState()).toEqual({
      courseId: 77,
      topic: "Week 8",
      selectedMaterials: [301, 302],
      chainId: 8,
      customBlockIds: [11, 12],
      accuracyProfile: "balanced",
      objectiveScope: "single_focus",
      selectedObjectiveId: "OBJ-8",
      selectedObjectiveGroup: "Week 8 - Vestibular",
      selectedPaths: ["Courses/Neuro/Week 8"],
    });
    expect(localStorage.getItem(TUTOR_START_STATE_KEY)).toBeTruthy();
    expect(localStorage.getItem(TUTOR_START_STATE_LEGACY_KEY)).toBeNull();
  });

  it("normalizes persisted objective scope and active session helpers", () => {
    expect(readTutorObjectiveScope()).toBe("module_all");
    expect(writeTutorObjectiveScope("single_focus")).toBe("single_focus");
    expect(localStorage.getItem(TUTOR_OBJECTIVE_SCOPE_KEY)).toBe("single_focus");

    expect(readTutorActiveSessionId()).toBeNull();
    writeTutorActiveSessionId("sess-123");
    expect(readTutorActiveSessionId()).toBe("sess-123");
    clearTutorActiveSessionId();
    expect(readTutorActiveSessionId()).toBeNull();
  });

  it("consumes launch handoff state and clears the transient keys", () => {
    sessionStorage.setItem(TUTOR_LIBRARY_HANDOFF_KEY, "1");
    sessionStorage.setItem(
      TUTOR_BRAIN_HANDOFF_KEY,
      JSON.stringify({
        source: "brain-home",
        title: "Review ankle mechanics",
        reason: "Due today",
      }),
    );

    expect(consumeTutorLaunchHandoff()).toEqual({
      fromLibraryHandoff: true,
      brainLaunchContext: {
        source: "brain-home",
        title: "Review ankle mechanics",
        reason: "Due today",
      },
    });
    expect(sessionStorage.getItem(TUTOR_LIBRARY_HANDOFF_KEY)).toBeNull();
    expect(sessionStorage.getItem(TUTOR_BRAIN_HANDOFF_KEY)).toBeNull();
  });

  it("writes and consumes Tutor-to-Library launch context", () => {
    writeLibraryLaunchFromTutor({
      source: "assignment",
      courseId: 42,
      courseName: "Neuro",
      courseEventId: 7,
      eventType: "exam",
      target: "load_materials",
    });

    expect(consumeLibraryLaunchFromTutor()).toEqual({
      source: "assignment",
      courseId: 42,
      courseName: "Neuro",
      courseEventId: 7,
      eventType: "exam",
      target: "load_materials",
    });
    expect(sessionStorage.getItem(LIBRARY_TUTOR_HANDOFF_KEY)).toBeNull();
  });
});
