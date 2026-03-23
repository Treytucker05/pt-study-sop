import type { PacketItem } from "@/components/workspace/PacketPanel";

type SectionType = PacketItem["type"];

const SECTION_ORDER: SectionType[] = [
  "material",
  "objectives",
  "method_output",
  "note",
];

const SECTION_HEADINGS: Record<SectionType, string> = {
  material: "Source Materials",
  objectives: "Learning Objectives",
  method_output: "Method Outputs",
  note: "Study Notes",
  drawing: "Additional Items",
  custom: "Additional Items",
};

function groupByType(items: PacketItem[]): Map<SectionType, PacketItem[]> {
  const groups = new Map<SectionType, PacketItem[]>();
  for (const item of items) {
    const key = item.type;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

function renderSection(heading: string, type: SectionType, items: PacketItem[]): string {
  const lines: string[] = [`## ${heading}`];

  switch (type) {
    case "material":
      for (const item of items) {
        lines.push(`- ${item.title}`);
      }
      break;

    case "objectives":
      for (const item of items) {
        lines.push(`- [ ] ${item.title}`);
      }
      break;

    case "method_output":
      for (const item of items) {
        lines.push(`### ${item.title}`);
        lines.push(item.content);
      }
      break;

    case "note":
      for (const item of items) {
        lines.push(`### ${item.title}`);
        lines.push(item.content);
      }
      break;

    case "drawing":
    case "custom":
      for (const item of items) {
        lines.push(`### ${item.title}`);
        lines.push(item.content);
      }
      break;
  }

  return lines.join("\n");
}

/**
 * Serialize packet items into structured markdown for LLM context.
 * Groups items by type and produces headings per the tutor priming format.
 */
export function serializePacketForTutor(items: PacketItem[]): string {
  if (items.length === 0) return "";

  const groups = groupByType(items);
  const sections: string[] = [];

  // Render ordered sections first
  for (const type of SECTION_ORDER) {
    const group = groups.get(type);
    if (!group || group.length === 0) continue;
    const heading = SECTION_HEADINGS[type];
    sections.push(renderSection(heading, type, group));
    groups.delete(type);
  }

  // Render remaining types (drawing, custom) under "Additional Items"
  const remaining: PacketItem[] = [];
  for (const [, group] of groups) {
    remaining.push(...group);
  }
  if (remaining.length > 0) {
    sections.push(renderSection("Additional Items", remaining[0].type, remaining));
  }

  return sections.join("\n\n");
}

/**
 * Serialize packet items into a JSON blob for API storage.
 */
export function serializePacketForStorage(items: PacketItem[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * Deserialize stored packet back to items.
 * Returns empty array on invalid JSON or non-array data.
 */
export function deserializePacket(json: string): PacketItem[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as PacketItem[];
  } catch {
    return [];
  }
}
