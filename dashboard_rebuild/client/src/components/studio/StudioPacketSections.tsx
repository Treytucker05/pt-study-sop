import { Badge } from "@/components/ui/badge";
import type { StudioPacketSection } from "@/lib/studioPacketSections";

export interface StudioPacketSectionsProps {
  sections: StudioPacketSection[];
  sectionTestIdPrefix: string;
}

export function StudioPacketSections({
  sections,
  sectionTestIdPrefix,
}: StudioPacketSectionsProps) {
  return (
    <div className="space-y-3 font-mono text-sm text-foreground/78">
      {sections.map((section) => (
        <section
          key={section.id}
          data-testid={`${sectionTestIdPrefix}-${section.id}`}
          className="space-y-3 rounded-[0.85rem] border border-primary/12 bg-black/12 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary/72">
                {section.title}
              </div>
              <div className="mt-1 text-xs leading-5 text-foreground/62">
                {section.description}
              </div>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/84"
            >
              {section.entries.length}
            </Badge>
          </div>

          {section.entries.length > 0 ? (
            <div className="space-y-2">
              {section.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[0.75rem] border border-primary/10 bg-black/18 p-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm text-foreground">
                        {entry.title}
                      </div>
                      <div className="mt-1 break-words text-xs leading-5 text-foreground/62">
                        {entry.detail}
                      </div>
                    </div>
                    {entry.badge ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-primary/80"
                      >
                        {entry.badge}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[0.75rem] border border-dashed border-primary/12 bg-black/12 p-3 text-xs leading-5 text-foreground/58">
              {section.emptyMessage}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
