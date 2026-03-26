import type { StudioPacketSection } from "@/lib/studioPacketSections";

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function serializeStudioPacketSectionsForTutor(
  sections: StudioPacketSection[],
): string {
  const renderedSections = sections
    .map((section) => {
      if (!Array.isArray(section.entries) || section.entries.length === 0) return "";

      const lines = section.entries.map((entry) => {
        const title = trimText(entry.title) || "Untitled item";
        const detail = trimText(entry.detail);
        const badge = trimText(entry.badge);
        const prefix = badge ? `- [${badge}] ${title}` : `- ${title}`;

        return detail ? `${prefix} :: ${detail}` : prefix;
      });

      return [`## ${section.title}`, ...lines].join("\n");
    })
    .filter(Boolean);

  return renderedSections.join("\n\n");
}
