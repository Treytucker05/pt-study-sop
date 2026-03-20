import { describe, expect, it } from "vitest";
import {
  extractMermaidBlock,
  formatPrimeArtifactMarkdown,
  formatPrimeArtifactPreviewText,
  formatSourceBlockText,
  parseLinesToRecords,
} from "@/lib/tutorUtils";

describe("tutorUtils PRIME formatting", () => {
  it("strips markdown list prefixes when converting lines to records", () => {
    expect(parseLinesToRecords("## Study Spine\n1. Fertilization\n- Cleavage", "concept")).toEqual([
      { concept: "Fertilization" },
      { concept: "Cleavage" },
    ]);
  });

  it("formats terms as a headed markdown list", () => {
    expect(
      formatPrimeArtifactMarkdown("terms", "Zygote :: fertilized egg\nMorula :: solid ball of cells"),
    ).toBe(
      "## Key Terms\n\n- Zygote :: fertilized egg\n- Morula :: solid ball of cells",
    );
  });

  it("preserves mermaid map blocks for hierarchical maps", () => {
    const mermaid = "graph TD\n  A[Fertilization] --> B[Cleavage]";
    const formatted = formatPrimeArtifactMarkdown("map", `\`\`\`mermaid\n${mermaid}\n\`\`\``);
    expect(extractMermaidBlock(formatted)).toBe(mermaid);
    expect(formatPrimeArtifactPreviewText("map", formatted)).toContain("MERMAID MAP");
  });

  it("formats multi-source blocks with markdown subheadings", () => {
    expect(
      formatSourceBlockText(
        [
          { title: "Week 7 PDF", summary: "Intro paragraph." },
          { title: "Lecture notes", summary: "Follow-up paragraph." },
        ],
        "summary",
      ),
    ).toBe("### Week 7 PDF\n\nIntro paragraph.\n\n### Lecture notes\n\nFollow-up paragraph.");
  });
});
