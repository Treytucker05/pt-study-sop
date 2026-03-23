import { describe, expect, it } from "vitest";
import {
  serializePacketForTutor,
  serializePacketForStorage,
  deserializePacket,
} from "@/lib/packetSerializer";
import type { PacketItem } from "@/components/workspace/PacketPanel";

function makeItem(overrides: Partial<PacketItem> & Pick<PacketItem, "type" | "title" | "content">): PacketItem {
  return {
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("serializePacketForTutor", () => {
  it("produces ## Source Materials section for material items", () => {
    const items: PacketItem[] = [
      makeItem({ type: "material", title: "Chapter 10: Cardiovascular System", content: "PDF content" }),
      makeItem({ type: "material", title: "Chapter 11: Heart Anatomy", content: "PDF content" }),
    ];
    const result = serializePacketForTutor(items);
    expect(result).toContain("## Source Materials");
    expect(result).toContain("- Chapter 10: Cardiovascular System");
    expect(result).toContain("- Chapter 11: Heart Anatomy");
  });

  it("produces ## Method Outputs section for method_output items", () => {
    const items: PacketItem[] = [
      makeItem({ type: "method_output", title: "Self-Explanation Output", content: "My explanation of the concept" }),
      makeItem({ type: "method_output", title: "Concept Mapping Output", content: "Map of relationships" }),
    ];
    const result = serializePacketForTutor(items);
    expect(result).toContain("## Method Outputs");
    expect(result).toContain("### Self-Explanation Output");
    expect(result).toContain("My explanation of the concept");
    expect(result).toContain("### Concept Mapping Output");
    expect(result).toContain("Map of relationships");
  });

  it("produces all sections in correct order for mixed types", () => {
    const items: PacketItem[] = [
      makeItem({ type: "material", title: "Ch10", content: "pdf" }),
      makeItem({ type: "objectives", title: "Describe the cardiac cycle", content: "Describe the cardiac cycle" }),
      makeItem({ type: "method_output", title: "Self-Explanation Output", content: "output text" }),
      makeItem({ type: "note", title: "My observations", content: "note content here" }),
      makeItem({ type: "custom", title: "Extra thing", content: "extra content" }),
    ];
    const result = serializePacketForTutor(items);

    const materialIdx = result.indexOf("## Source Materials");
    const objectivesIdx = result.indexOf("## Learning Objectives");
    const methodIdx = result.indexOf("## Method Outputs");
    const noteIdx = result.indexOf("## Study Notes");
    const customIdx = result.indexOf("## Additional Items");

    expect(materialIdx).toBeGreaterThanOrEqual(0);
    expect(objectivesIdx).toBeGreaterThan(materialIdx);
    expect(methodIdx).toBeGreaterThan(objectivesIdx);
    expect(noteIdx).toBeGreaterThan(methodIdx);
    expect(customIdx).toBeGreaterThan(noteIdx);
  });

  it("returns empty string for empty array", () => {
    expect(serializePacketForTutor([])).toBe("");
  });

  it("skips sections with no items of that type", () => {
    const items: PacketItem[] = [
      makeItem({ type: "note", title: "A note", content: "note body" }),
    ];
    const result = serializePacketForTutor(items);
    expect(result).toContain("## Study Notes");
    expect(result).not.toContain("## Source Materials");
    expect(result).not.toContain("## Method Outputs");
    expect(result).not.toContain("## Learning Objectives");
    expect(result).not.toContain("## Additional Items");
  });

  it("renders objectives as checklist items", () => {
    const items: PacketItem[] = [
      makeItem({ type: "objectives", title: "Describe the cardiac cycle", content: "Describe the cardiac cycle" }),
    ];
    const result = serializePacketForTutor(items);
    expect(result).toContain("## Learning Objectives");
    expect(result).toContain("- [ ] Describe the cardiac cycle");
  });

  it("renders drawing items under Additional Items", () => {
    const items: PacketItem[] = [
      makeItem({ type: "drawing", title: "Heart diagram", content: "svg data" }),
    ];
    const result = serializePacketForTutor(items);
    expect(result).toContain("## Additional Items");
    expect(result).toContain("Heart diagram");
  });
});

describe("serializePacketForStorage / deserializePacket round-trip", () => {
  it("round-trips items through serialize and deserialize", () => {
    const items: PacketItem[] = [
      makeItem({ type: "material", title: "Ch10", content: "pdf" }),
      makeItem({ type: "note", title: "A note", content: "some text" }),
    ];
    const json = serializePacketForStorage(items);
    const restored = deserializePacket(json);
    expect(restored).toEqual(items);
  });

  it("serializePacketForStorage produces valid JSON", () => {
    const items: PacketItem[] = [
      makeItem({ type: "material", title: "Ch10", content: "pdf" }),
    ];
    const json = serializePacketForStorage(items);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("deserializePacket", () => {
  it("returns empty array on invalid JSON", () => {
    expect(deserializePacket("not valid json{{{")).toEqual([]);
  });

  it("returns empty array on non-array JSON", () => {
    expect(deserializePacket('{"not": "an array"}')).toEqual([]);
  });

  it("returns empty array on empty string", () => {
    expect(deserializePacket("")).toEqual([]);
  });
});
