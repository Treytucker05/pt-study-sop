import { describe, expect, it } from "vitest";

import {
  STUDIO_ENTRY_UPLOAD_ACCEPT,
  getEntryChapterSortKey,
  groupEntryCourseMaterials,
  isEntryTextbookMaterial,
  isStudioEntryUploadFile,
  partitionStudioEntryUploadFiles,
} from "@/lib/studioEntryMaterials";
import type { Material } from "@/lib/api";

function material(
  overrides: Partial<Material> & Pick<Material, "id" | "title">,
): Material {
  return {
    course_id: 1,
    source_path: null,
    file_type: "pdf",
    checksum: null,
    ...overrides,
  } as Material;
}

function formatChapterLabel(mat: Material): string {
  const sourcePath = mat.source_path || "";
  const chapterAt = sourcePath.search(/#ch\d+$/i);
  if (chapterAt > 0) {
    const num = sourcePath
      .slice(chapterAt)
      .replace(/#ch/i, "")
      .replace(/^0+(?=\d)/, "");
    const stem = sourcePath
      .slice(0, chapterAt)
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.[A-Za-z0-9]{1,6}$/, "")
      .trim();
    return `${stem || "Textbook"} — Ch ${num}`;
  }
  return mat.title;
}

describe("studioEntryMaterials", () => {
  it("accepts txt and md uploads in the entry card", () => {
    expect(STUDIO_ENTRY_UPLOAD_ACCEPT).toContain(".txt");
    expect(isStudioEntryUploadFile(new File(["a"], "notes.txt"))).toBe(true);
    expect(isStudioEntryUploadFile(new File(["a"], "readme.md"))).toBe(true);
  });

  it("rejects unsupported upload extensions", () => {
    const { accepted, rejected } = partitionStudioEntryUploadFiles([
      new File(["a"], "slides.pptx"),
      new File(["a"], "archive.zip"),
    ]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.name).toBe("archive.zip");
  });

  it("groups chapter-split textbook materials separately from section folders", () => {
    const groups = groupEntryCourseMaterials(
      [
        material({
          id: 1,
          title: "Physical Therapy for Children.pdf",
          source_path:
            "/vault/Neuro/Textbook/Physical Therapy for Children.pdf#ch02",
        }),
        material({
          id: 2,
          title: "Physical Therapy for Children.pdf",
          source_path:
            "/vault/Neuro/Textbook/Physical Therapy for Children.pdf#ch01",
        }),
        material({
          id: 3,
          title: "Week 9 Lecture.pdf",
          folder_path: "Neuro/Week 9",
          source_path: "/vault/Neuro/Week 9/Week 9 Lecture.pdf",
        }),
        material({
          id: 4,
          title: "Lab Handout.docx",
          folder_path: "Neuro/Week 9",
          source_path: "/vault/Neuro/Week 9/Lab Handout.docx",
        }),
      ],
      formatChapterLabel,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.kind).toBe("textbook");
    expect(groups[0]?.label).toContain("Physical Therapy for Children");
    expect(groups[0]?.materials.map((row) => row.id)).toEqual([2, 1]);
    expect(groups[1]?.kind).toBe("section");
    expect(groups[1]?.label).toBe("Neuro/Week 9");
    expect(groups[1]?.materials.map((row) => row.id)).toEqual([3, 4]);
  });

  it("detects textbook chapter splits from source_path", () => {
    const row = material({
      id: 9,
      title: "Big Book.pdf",
      source_path: "/data/Big Book.pdf#ch12",
      doc_type: null,
    });
    expect(isEntryTextbookMaterial(row, formatChapterLabel)).toBe(true);
    expect(getEntryChapterSortKey(row, formatChapterLabel)).toBe(12);
  });

  it("groups uploaded session files under Uploaded Files", () => {
    const groups = groupEntryCourseMaterials(
      [
        material({
          id: 1,
          title: "Week 9 Lecture.pdf",
          source_path: "uploads/week-9-lecture.pdf",
        }),
        material({
          id: 2,
          title: "Notes.txt",
          source_path: "uploads/notes.txt",
          file_type: "txt",
        }),
      ],
      (row) => row.title,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.kind).toBe("upload");
    expect(groups[0]?.label).toBe("Uploaded Files");
    expect(groups[0]?.materials).toHaveLength(2);
  });
});
