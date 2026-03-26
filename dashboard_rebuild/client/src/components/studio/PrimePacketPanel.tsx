import type { StudioPacketSection } from "@/lib/studioPacketSections";

import { StudioPacketSections } from "@/components/studio/StudioPacketSections";

export interface PrimePacketPanelProps {
  sections: StudioPacketSection[];
}

export function PrimePacketPanel({ sections }: PrimePacketPanelProps) {
  return (
    <StudioPacketSections
      sections={sections}
      sectionTestIdPrefix="prime-packet-section"
    />
  );
}
