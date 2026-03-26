import { describe, expect, it } from "vitest";

import {
  createStudioExcerptWorkspaceObject,
  createStudioRepairWorkspaceObject,
} from "@/lib/studioWorkspaceObjects";
import {
  buildPolishPacketSections,
  buildPrimePacketSections,
} from "@/lib/studioPacketSections";
import { getStudioRepairCandidateId } from "@/lib/studioRepairCandidates";

describe("studio packet section builders", () => {
  it("builds Prime Packet sections from source context and priming artifacts", () => {
    const promotedExcerpt = createStudioExcerptWorkspaceObject({
      materialId: 101,
      sourcePath: "uploads/cardio-output.pdf",
      fileType: "pdf",
      sourceTitle: "Cardiac Output Lecture",
      excerptText: "Stroke volume and heart rate set cardiac output.",
      selectionLabel: "Paragraph 1",
    });
    const promotedRepairNote = createStudioRepairWorkspaceObject({
      id: getStudioRepairCandidateId({
        source: "verdict",
        title: "Misconception to repair",
        detail: "The reply mixed preload effects with heart-rate regulation.",
      }),
      title: "Misconception to repair",
      detail: "The reply mixed preload effects with heart-rate regulation.",
      badge: "MISCONCEPTION",
      source: "verdict",
      sourceLabel: "Latest verdict",
    });
    const promotedImage = {
      id: "image:source-1",
      kind: "image" as const,
      title: "Screenshot: Frank-Starling graph",
      detail: "Pressure-volume loop screenshot for the current study unit.",
      badge: "SCREENSHOT",
      asset: {
        url: "https://example.com/pv-loop.png",
        mimeType: "image/png",
      },
    };
    const promotedDiagram = {
      id: "diagram:source-1",
      kind: "diagram_sketch" as const,
      title: "PV loop sketch",
      detail: "Manual sketch of ventricular phases.",
      badge: "SKETCH",
      content: {
        format: "text/markdown",
        data: "A -> B -> C -> D",
      },
    };
    const promotedLink = {
      id: "link:source-1",
      kind: "link_reference" as const,
      title: "Frank-Starling review",
      detail: "External review article for follow-up reading.",
      badge: "REFERENCE",
      href: "https://example.com/frank-starling",
    };

    const sections = buildPrimePacketSections({
      materials: [
        {
          id: 101,
          title: "Cardiac Output Lecture",
          file_type: "pdf",
          source_path: "uploads/cardio-output.pdf",
        },
      ],
      selectedMaterialIds: [101],
      selectedPaths: ["Exercise Physiology/Week 7/Cardio.md"],
      primingSummaryText: "Cardiac output sets tissue perfusion.",
      primingConceptsText: "Afterload\nContractility",
      primingTerminologyText: "",
      primingRootExplanationText: "",
      primingGapsText: "",
      primingStrategyText: "Begin with retrieval prompts.",
      promotedExcerptObjects: [promotedExcerpt],
      promotedNoteObjects: [
        promotedRepairNote,
        promotedImage,
        promotedDiagram,
        promotedLink,
      ],
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Source Context",
      "Primed Artifacts",
    ]);
    expect(sections[0]?.entries.map((entry) => entry.title)).toEqual([
      "Cardiac Output Lecture",
      "Exercise Physiology/Week 7/Cardio.md",
    ]);
    expect(sections[1]?.entries.map((entry) => entry.title)).toEqual([
      "Summary",
      "Concepts",
      "Tutor Strategy",
      "Workspace Excerpt",
      "Misconception to repair",
      "Screenshot: Frank-Starling graph",
      "PV loop sketch",
      "Frank-Starling review",
    ]);
    expect(sections[1]?.entries[3]?.detail).toContain(
      "Stroke volume and heart rate set cardiac output.",
    );
    expect(sections[1]?.entries[4]?.detail).toContain(
      "The reply mixed preload effects with heart-rate regulation.",
    );
    expect(sections[1]?.entries[5]?.detail).toContain(
      "Pressure-volume loop screenshot for the current study unit.",
    );
    expect(sections[1]?.entries[6]?.detail).toContain(
      "Manual sketch of ventricular phases.",
    );
    expect(sections[1]?.entries[7]?.detail).toContain(
      "https://example.com/frank-starling",
    );
  });

  it("builds Polish Packet sections from notes, bundle outputs, and publish assets", () => {
    const sections = buildPolishPacketSections({
      promotedNotes: [
        {
          id: "assistant-1",
          title: "Tutor Reply 3",
          content:
            "Cardiac output is determined by stroke volume multiplied by heart rate.",
          badge: "TUTOR",
        },
      ],
      capturedNotes: [
        {
          id: 1,
          note_mode: "exact",
          title: "SV vs HR misconception",
          content: "Need to separate preload from heart-rate effects.",
        },
      ],
      polishBundle: {
        summaries: [{ title: "Hemodynamics summary" }],
        card_requests: [{ front: "What determines cardiac output?" }],
        status: "draft",
      },
      publishResults: [
        {
          id: 9,
          status: "draft",
          obsidian_results: [{ path: "Vault/Cardio.md" }],
          anki_results: [{ note_id: 44 }],
        },
      ],
    });

    expect(sections.map((section) => section.title)).toEqual([
      "Notes",
      "Summaries",
      "Cards",
      "Assets",
    ]);
    expect(sections[0]?.entries[0]?.title).toBe("Tutor Reply 3");
    expect(sections[0]?.entries[1]?.title).toBe("SV vs HR misconception");
    expect(sections[1]?.entries[0]?.title).toBe("Hemodynamics summary");
    expect(sections[2]?.entries[0]?.title).toBe("What determines cardiac output?");
    expect(sections[3]?.entries.map((entry) => entry.title)).toContain(
      "Vault/Cardio.md",
    );
  });
});
