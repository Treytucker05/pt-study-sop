import type { StudioPacketSection } from "@/lib/studioPacketSections";

import { StudioPacketSections } from "@/components/studio/StudioPacketSections";

export interface PolishPacketPanelProps {
  sections: StudioPacketSection[];
}

export function PolishPacketPanel({ sections }: PolishPacketPanelProps) {
  return (
    <StudioPacketSections
      sections={sections}
      sectionTestIdPrefix="polish-packet-section"
    />
  );
}
