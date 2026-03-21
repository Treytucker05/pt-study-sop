import type { ReactElement, ReactNode } from "react";

interface PrimingLayoutProps {
  sections: ReactNode[];
}

export function PrimingLayout({ sections }: PrimingLayoutProps): ReactElement {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <section
          key={`priming-section-${index}`}
          className="border-2 border-primary/20 bg-black/40"
        >
          {section}
        </section>
      ))}
    </div>
  );
}
