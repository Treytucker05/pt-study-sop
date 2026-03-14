import {
  normalizeTutorAccuracyProfile,
  readTutorSelectedMaterialIds,
  TUTOR_SELECTED_MATERIAL_IDS_KEY,
  TUTOR_SELECTED_MATERIAL_IDS_LEGACY_KEY,
  writeTutorSelectedMaterialIds,
} from "@/lib/tutorClientState";
import { describe, expect, it, beforeEach } from "vitest";

describe("tutorClientState", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
