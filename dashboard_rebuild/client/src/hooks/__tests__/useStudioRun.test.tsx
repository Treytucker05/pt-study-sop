import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useStudioRun } from "@/hooks/useStudioRun";
import {
  TUTOR_ACCURACY_PROFILE_KEY,
  TUTOR_OBJECTIVE_SCOPE_KEY,
  TUTOR_SELECTED_MATERIAL_IDS_KEY,
  TUTOR_START_STATE_KEY,
  TUTOR_VAULT_FOLDER_KEY,
} from "@/lib/tutorClientState";

const baseParams = {
  initialRouteQuery: {},
  storedActiveSessionId: null,
  pendingLaunchHandoff: {
    fromLibraryHandoff: false,
    brainLaunchContext: null,
  },
  courseId: 77,
  topic: "Cardiovascular regulation",
  selectedMaterialIds: [101, 102],
  chainId: 5,
  customBlockIds: [9],
  accuracyProfile: "balanced" as const,
  objectiveScope: "single_focus" as const,
  selectedObjectiveId: "OBJ-7",
  selectedObjectiveGroup: "Week 7",
  selectedPaths: ["Courses/Cardio/Week 7"],
  vaultFolder: "Courses/Cardio/Week 7",
};

describe("useStudioRun", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/tutor");
  });

  it("starts in Workspace Home when no active session is available", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    expect(result.current.entryKind).toBe("workspace_home");
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.shellMode).toBe("studio");
    expect(result.current.showSetup).toBe(true);
  });

  it("starts in Exact Resume when a stored active session is available", () => {
    const { result } = renderHook(() =>
      useStudioRun({
        ...baseParams,
        storedActiveSessionId: "sess-restore",
      }),
    );

    expect(result.current.entryKind).toBe("exact_resume");
    expect(result.current.activeSessionId).toBe("sess-restore");
    expect(result.current.shellMode).toBe("tutor");
    expect(result.current.showSetup).toBe(false);
  });

  it("suppresses stale local resume when launched from the library handoff", () => {
    const { result } = renderHook(() =>
      useStudioRun({
        ...baseParams,
        storedActiveSessionId: "sess-restore",
        pendingLaunchHandoff: {
          fromLibraryHandoff: true,
          brainLaunchContext: null,
        },
      }),
    );

    expect(result.current.shouldSuppressStoredSessionResume).toBe(true);
    expect(result.current.entryKind).toBe("workspace_home");
    expect(result.current.activeSessionId).toBeNull();
    expect(result.current.shellMode).toBe("studio");
  });

  it("persists canonical Tutor startup state and shell query through StudioRun", async () => {
    const { result, rerender } = renderHook(
      (params: typeof baseParams) => useStudioRun(params),
      { initialProps: baseParams },
    );

    await waitFor(() => {
      expect(localStorage.getItem(TUTOR_SELECTED_MATERIAL_IDS_KEY)).toBe(
        JSON.stringify([101, 102]),
      );
    });

    expect(localStorage.getItem(TUTOR_ACCURACY_PROFILE_KEY)).toBe("balanced");
    expect(localStorage.getItem(TUTOR_OBJECTIVE_SCOPE_KEY)).toBe(
      "single_focus",
    );
    expect(localStorage.getItem(TUTOR_VAULT_FOLDER_KEY)).toBe(
      "Courses/Cardio/Week 7",
    );
    expect(JSON.parse(localStorage.getItem(TUTOR_START_STATE_KEY) || "{}"))
      .toMatchObject({
        courseId: 77,
        topic: "Cardiovascular regulation",
        selectedMaterials: [101, 102],
        chainId: 5,
        customBlockIds: [9],
        accuracyProfile: "balanced",
        objectiveScope: "single_focus",
        selectedObjectiveId: "OBJ-7",
        selectedObjectiveGroup: "Week 7",
        selectedPaths: ["Courses/Cardio/Week 7"],
      });

    act(() => {
      result.current.setShellMode("studio");
      result.current.setActiveBoardScope("session");
      result.current.setActiveBoardId(88);
    });

    rerender({
      ...baseParams,
      topic: "Renal clearance",
      selectedMaterialIds: [404],
      selectedObjectiveId: "OBJ-9",
      selectedObjectiveGroup: "Week 8",
      selectedPaths: ["Courses/Cardio/Week 8"],
      vaultFolder: "Courses/Cardio/Week 8",
    });

    await waitFor(() => {
      expect(window.location.search).toContain("course_id=77");
      expect(window.location.search).toContain("mode=studio");
      expect(window.location.search).toContain("board_scope=session");
      expect(window.location.search).toContain("board_id=88");
    });

    expect(JSON.parse(localStorage.getItem(TUTOR_START_STATE_KEY) || "{}"))
      .toMatchObject({
        courseId: 77,
        topic: "Renal clearance",
        selectedMaterials: [404],
        selectedObjectiveId: "OBJ-9",
        selectedObjectiveGroup: "Week 8",
        selectedPaths: ["Courses/Cardio/Week 8"],
      });
  });

  it("stores promoted Prime Packet objects inside StudioRun authority", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    expect(result.current.promotedPrimePacketObjects).toEqual([]);

    act(() => {
      result.current.setPromotedPrimePacketObjects([
        {
          id: "excerpt:101:abc123",
          kind: "excerpt",
          title: "Excerpt: Cardiac Output Lecture",
          detail:
            "Cardiac output is determined by stroke volume multiplied by heart rate.",
          badge: "EXCERPT",
          provenance: {
            materialId: 101,
            sourcePath: "uploads/cardio-output.pdf",
            fileType: "pdf",
            sourceTitle: "Cardiac Output Lecture",
            selectionLabel: "Paragraph 1",
          },
        },
      ]);
    });

    expect(result.current.promotedPrimePacketObjects).toHaveLength(1);
    expect(result.current.promotedPrimePacketObjects[0]).toMatchObject({
      kind: "excerpt",
      badge: "EXCERPT",
    });
  });

  it("stores repair-note Prime Packet objects inside StudioRun authority", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    act(() => {
      result.current.setPromotedPrimePacketObjects([
        {
          id: "repair-note:repair:verdict:abc123",
          kind: "text_note",
          title: "Misconception to repair",
          detail: "The reply mixed preload effects with heart-rate regulation.",
          badge: "MISCONCEPTION",
          provenance: {
            sourceType: "repair_candidate",
            candidateId: "repair:verdict:abc123",
            sourceLabel: "Latest verdict",
          },
        },
      ]);
    });

    expect(result.current.promotedPrimePacketObjects).toHaveLength(1);
    expect(result.current.promotedPrimePacketObjects[0]).toMatchObject({
      kind: "text_note",
      badge: "MISCONCEPTION",
    });
  });

  it("stores expanded promoted workspace object kinds inside StudioRun authority", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    act(() => {
      result.current.setPromotedPrimePacketObjects([
        {
          id: "image:source-1",
          kind: "image",
          title: "Screenshot: Frank-Starling graph",
          detail: "Pressure-volume loop screenshot for the current study unit.",
          badge: "SCREENSHOT",
          asset: {
            url: "https://example.com/pv-loop.png",
            mimeType: "image/png",
          },
        },
        {
          id: "diagram:source-1",
          kind: "diagram_sketch",
          title: "PV loop sketch",
          detail: "Manual sketch of ventricular phases.",
          badge: "SKETCH",
          content: {
            format: "text/markdown",
            data: "A -> B -> C -> D",
          },
        },
        {
          id: "link:source-1",
          kind: "link_reference",
          title: "Frank-Starling review",
          detail: "External review article for follow-up reading.",
          badge: "REFERENCE",
          href: "https://example.com/frank-starling",
        },
      ]);
    });

    expect(result.current.promotedPrimePacketObjects).toEqual([
      expect.objectContaining({ kind: "image", badge: "SCREENSHOT" }),
      expect.objectContaining({ kind: "diagram_sketch", badge: "SKETCH" }),
      expect.objectContaining({ kind: "link_reference", badge: "REFERENCE" }),
    ]);
  });

  it("stores floating panel layout and document tabs inside StudioRun authority", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    expect(result.current.panelLayout).toEqual([]);
    expect(result.current.documentTabs).toEqual([]);
    expect(result.current.activeDocumentTabId).toBeNull();

    act(() => {
      result.current.setPanelLayout([
        {
          id: "panel-source-shelf",
          panel: "source_shelf",
          position: { x: 16, y: 24 },
          size: { width: 320, height: 680 },
          zIndex: 3,
          collapsed: false,
        },
      ]);
      result.current.setDocumentTabs([
        {
          id: "doc-material-101",
          kind: "material",
          title: "Cardiac Output Lecture",
          sourceId: 101,
        },
      ]);
      result.current.setActiveDocumentTabId("doc-material-101");
    });

    expect(result.current.panelLayout).toEqual([
      {
        id: "panel-source-shelf",
        panel: "source_shelf",
        position: { x: 16, y: 24 },
        size: { width: 320, height: 680 },
        zIndex: 3,
        collapsed: false,
      },
    ]);
    expect(result.current.documentTabs).toEqual([
      {
        id: "doc-material-101",
        kind: "material",
        title: "Cardiac Output Lecture",
        sourceId: 101,
      },
    ]);
    expect(result.current.activeDocumentTabId).toBe("doc-material-101");
  });

  it("stores tutor-owned selector state without mutating the priming start-state", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    const persistedStartStateBefore = JSON.parse(
      localStorage.getItem(TUTOR_START_STATE_KEY) || "{}",
    );

    act(() => {
      result.current.setTutorChainId(77);
      result.current.setTutorCustomBlockIds([91, 92]);
    });

    const persistedStartStateAfter = JSON.parse(
      localStorage.getItem(TUTOR_START_STATE_KEY) || "{}",
    );

    expect(result.current.tutorChainId).toBe(77);
    expect(result.current.tutorCustomBlockIds).toEqual([91, 92]);
    expect(persistedStartStateBefore).toMatchObject({
      chainId: 5,
      customBlockIds: [9],
    });
    expect(persistedStartStateAfter).toMatchObject({
      chainId: 5,
      customBlockIds: [9],
    });
  });

  it("stores runtime capsule, compaction telemetry, and direct note-save status inside StudioRun authority", () => {
    const { result } = renderHook(() => useStudioRun(baseParams));

    expect(result.current.runtimeState).toEqual({
      activeMemoryCapsuleId: null,
      compactionTelemetry: null,
      directNoteSaveStatus: null,
    });

    act(() => {
      result.current.setActiveMemoryCapsuleId(12);
      result.current.setCompactionTelemetry({
        tokenCount: 18750,
        contextWindow: 24000,
        pressureLevel: "high",
      });
      result.current.setDirectNoteSaveStatus({
        state: "saved",
        path: "Tutor Workspace/Cardio Note.md",
      });
    });

    expect(result.current.runtimeState).toEqual({
      activeMemoryCapsuleId: 12,
      compactionTelemetry: {
        tokenCount: 18750,
        contextWindow: 24000,
        pressureLevel: "high",
      },
      directNoteSaveStatus: {
        state: "saved",
        path: "Tutor Workspace/Cardio Note.md",
      },
    });
  });
});
