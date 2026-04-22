import { describe, expect, it } from "vitest";

import {
  buildSessionMaterialBundle,
  emptySessionMaterialBundle,
  type SessionMaterialBundleInput,
} from "@/lib/sessionMaterialBundle";
import type {
  TutorCapturedNote,
  TutorPrimingMethodRun,
  TutorPrimingSourceInventoryItem,
} from "@/api.types";

function baseInput(overrides: Partial<SessionMaterialBundleInput> = {}): SessionMaterialBundleInput {
  return {
    workflowId: null,
    tutorSessionId: null,
    topic: null,
    studyUnit: null,
    courseId: null,
    courseName: null,
    sourceInventory: [],
    primingMethodRuns: [],
    artifacts: [],
    turnCount: 0,
    capturedNotes: [],
    primePacket: [],
    polishPacket: [],
    hasWorkflowDetail: false,
    ...overrides,
  };
}

describe("buildSessionMaterialBundle", () => {
  it("returns an empty, not-ready bundle when no material and no workflow detail", () => {
    const result = buildSessionMaterialBundle(baseInput());

    expect(result.isReady).toBe(false);
    expect(result.sessionKey).toBe("project");
    expect(result.learningObjectives).toEqual([]);
    expect(result.concepts).toEqual([]);
    expect(result.terms).toEqual([]);
  });

  it("uses workflow id as session key and becomes ready once workflow detail is loaded", () => {
    const result = buildSessionMaterialBundle(
      baseInput({
        workflowId: "wf-123",
        hasWorkflowDetail: true,
        topic: "Cardiovascular",
      }),
    );

    expect(result.sessionKey).toBe("workflow:wf-123");
    expect(result.isReady).toBe(true);
    expect(result.topic).toBe("Cardiovascular");
  });

  it("falls back to tutor session id when no workflow id present", () => {
    const result = buildSessionMaterialBundle(
      baseInput({
        tutorSessionId: "tutor-abc",
        hasWorkflowDetail: true,
      }),
    );

    expect(result.sessionKey).toBe("tutor-session:tutor-abc");
    expect(result.isReady).toBe(true);
  });

  it("normalizes priming source inventory into LOs, concepts, terms, summaries", () => {
    const inventory: TutorPrimingSourceInventoryItem[] = [
      {
        id: 42,
        title: "PNF Basics",
        priming_output: {
          material_id: 42,
          title: "PNF Basics",
          concepts: ["Contract-relax", "Hold-relax", "  "],
          terminology: ["CR :: contract-relax", "HR: hold-relax", "just a term"],
          gaps: ["Missing detail on AC"],
          learning_objectives: [
            { lo_code: "LO-1", title: "Define PNF" },
            { lo_code: null, title: "Explain reciprocal inhibition" },
            { title: "" },
          ],
          summary: "PNF stretching combines passive stretch + isometric contractions.",
          root_explanation: "outline\n- PNF\n  - CR\n  - HR",
          extraction_lossy: false,
        },
      },
    ];

    const result = buildSessionMaterialBundle(
      baseInput({
        workflowId: "wf-1",
        hasWorkflowDetail: true,
        sourceInventory: inventory,
      }),
    );

    expect(result.learningObjectives).toEqual([
      {
        loCode: "LO-1",
        title: "Define PNF",
        materialId: 42,
        sourceTitle: "PNF Basics",
      },
      {
        loCode: null,
        title: "Explain reciprocal inhibition",
        materialId: 42,
        sourceTitle: "PNF Basics",
      },
    ]);
    expect(result.concepts.map((c) => c.concept)).toEqual([
      "Contract-relax",
      "Hold-relax",
    ]);
    expect(result.terms).toEqual([
      { term: "CR", definition: "contract-relax", materialId: 42, sourceTitle: "PNF Basics" },
      { term: "HR", definition: "hold-relax", materialId: 42, sourceTitle: "PNF Basics" },
      { term: "just a term", definition: null, materialId: 42, sourceTitle: "PNF Basics" },
    ]);
    expect(result.summaries[0].text).toContain("PNF stretching");
    expect(result.rootExplanations[0].text).toContain("outline");
    expect(result.gaps[0].text).toBe("Missing detail on AC");
  });

  it("deduplicates LOs, concepts, and terms across sources (case-insensitive)", () => {
    const inventory: TutorPrimingSourceInventoryItem[] = [
      {
        id: 1,
        title: "Source A",
        priming_output: {
          material_id: 1,
          title: "Source A",
          concepts: ["Reciprocal inhibition", "Autogenic inhibition"],
          terminology: ["CR :: A"],
          gaps: [],
          learning_objectives: [{ lo_code: "LO-1", title: "Define PNF" }],
        },
      },
      {
        id: 2,
        title: "Source B",
        priming_output: {
          material_id: 2,
          title: "Source B",
          concepts: ["reciprocal inhibition"],
          terminology: ["cr :: B"],
          gaps: [],
          learning_objectives: [{ lo_code: "LO-1", title: "Define PNF" }],
        },
      },
    ];

    const result = buildSessionMaterialBundle(
      baseInput({ workflowId: "w", hasWorkflowDetail: true, sourceInventory: inventory }),
    );

    expect(result.concepts).toHaveLength(2);
    expect(result.terms).toHaveLength(1);
    expect(result.learningObjectives).toHaveLength(1);
  });

  it("pulls LO entries from priming method runs when not present in priming_output", () => {
    const methodRuns: TutorPrimingMethodRun[] = [
      {
        method_id: "M-PRE-010",
        method_name: "Learning Objectives Primer",
        output_family: "objectives",
        outputs: {
          entries: [
            {
              material_id: 7,
              title: "Run Material",
              learning_objectives: [
                { lo_code: "R-1", title: "Identify key structures" },
              ],
            },
          ],
        },
        status: "complete",
      },
    ];

    const result = buildSessionMaterialBundle(
      baseInput({
        workflowId: "wf",
        hasWorkflowDetail: true,
        primingMethodRuns: methodRuns,
      }),
    );

    expect(result.learningObjectives).toEqual([
      {
        loCode: "R-1",
        title: "Identify key structures",
        materialId: 7,
        sourceTitle: "Run Material",
      },
    ]);
  });

  it("captures artifacts and notes verbatim", () => {
    const notes: TutorCapturedNote[] = [
      {
        id: 1,
        workflow_id: "wf",
        tutor_session_id: null,
        stage: "tutor",
        note_mode: "exact",
        title: "Quote",
        content: "  A studious note.  ",
        source_turn_id: null,
        status: "captured",
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
      },
      {
        id: 2,
        workflow_id: "wf",
        tutor_session_id: null,
        stage: "tutor",
        note_mode: "editable",
        title: null,
        content: "",
        source_turn_id: null,
        status: "captured",
        created_at: "2026-04-17T00:00:00Z",
        updated_at: "2026-04-17T00:00:00Z",
      },
    ];

    const result = buildSessionMaterialBundle(
      baseInput({
        workflowId: "wf",
        hasWorkflowDetail: true,
        capturedNotes: notes,
        artifacts: [
          { type: "note", title: "N1", content: "hello", createdAt: "now" },
        ],
        turnCount: 3,
      }),
    );

    expect(result.notes).toEqual([
      { id: 1, mode: "exact", title: "Quote", content: "A studious note." },
    ]);
    expect(result.artifacts).toEqual([
      { type: "note", title: "N1", content: "hello" },
    ]);
    expect(result.turnCount).toBe(3);
  });

  it("emptySessionMaterialBundle returns a not-ready shell", () => {
    const empty = emptySessionMaterialBundle();
    expect(empty.isReady).toBe(false);
    expect(empty.learningObjectives).toEqual([]);
  });

  /**
   * Regression: the "stale Tutor session id" TutorShell test (plus a real
   * runtime path when `workflow.activeWorkflowDetail` is partial) produces
   * an input where typed-as-required collections arrive as `undefined`
   * through `useTutorSessionMaterialBundle`. Pre-fix this crashed at
   * `input.artifacts.map(...)` with `Cannot read properties of undefined
   * (reading 'map')`. The builder must normalize every iterable field so
   * a partial caller degrades into an empty, not-ready bundle instead of
   * tearing down the Tutor subtree.
   */
  it("does not crash when optional iterable fields arrive as undefined", () => {
    const partial = {
      workflowId: null,
      tutorSessionId: null,
      topic: null,
      studyUnit: null,
      courseId: null,
      courseName: null,
      turnCount: 0,
      hasWorkflowDetail: false,
    } as unknown as SessionMaterialBundleInput;

    expect(() => buildSessionMaterialBundle(partial)).not.toThrow();

    const result = buildSessionMaterialBundle(partial);
    expect(result.isReady).toBe(false);
    expect(result.artifacts).toEqual([]);
    expect(result.notes).toEqual([]);
    expect(result.learningObjectives).toEqual([]);
    expect(result.concepts).toEqual([]);
    expect(result.terms).toEqual([]);
  });
});
