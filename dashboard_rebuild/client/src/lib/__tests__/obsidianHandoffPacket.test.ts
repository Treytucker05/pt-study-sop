import { describe, expect, it } from "vitest";

import { buildObsidianHandoffMarkdown } from "@/lib/obsidianHandoffPacket";
import type { StudioWorkspaceObject } from "@/lib/studioWorkspaceObjects";

describe("buildObsidianHandoffMarkdown", () => {
  it("serializes selected Workspace cards into a structured Obsidian handoff packet", () => {
    const workspaceObjects: StudioWorkspaceObject[] = [
      {
        id: "objective-1",
        kind: "text_note",
        title: "Learning Objectives · Cardiac Output",
        detail: "- Explain preload\n- Contrast afterload and stroke volume",
        badge: "OBJECTIVES",
        workspace: {
          obsidianHandoff: true,
          tutorContext: true,
        },
        provenance: {
          sourceType: "priming_result",
          resultKey: "learning-objectives",
          sourceLabel: "Learning Objectives Primer",
        },
      },
      {
        id: "hidden-from-obsidian",
        kind: "text_note",
        title: "Draft scratch",
        detail: "Do not export this.",
        badge: "NOTE",
        workspace: {
          obsidianHandoff: false,
        },
        provenance: {
          sourceType: "priming_result",
          resultKey: "scratch",
          sourceLabel: "Scratch",
        },
      },
    ];

    const markdown = buildObsidianHandoffMarkdown({
      courseName: "Cardiovascular Pulmonary",
      sessionGoal: "Module 1 safe patient care",
      materialTitles: ["Cardiac Output Lecture"],
      workspaceObjects,
    });

    expect(markdown).toContain("# Obsidian Handoff - Cardiovascular Pulmonary");
    expect(markdown).toContain("Session goal: Module 1 safe patient care");
    expect(markdown).toContain("Materials: Cardiac Output Lecture");
    expect(markdown).toContain("## Learning Objectives");
    expect(markdown).toContain("Learning Objectives · Cardiac Output");
    expect(markdown).toContain("Source: Learning Objectives Primer");
    expect(markdown).toContain("Contrast afterload and stroke volume");
    expect(markdown).not.toContain("Draft scratch");
  });
});
