import { useEffect, useRef } from "react";
import { renderSOPRefLinks, setupSOPRefNavigation, navigateToSOPFile } from "@/utils/sopref";

interface SOPRefRendererProps {
  content: string;
  className?: string;
}

export function SOPRefRenderer({ content, className = "" }: SOPRefRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderedContent = renderSOPRefLinks(content, navigateToSOPFile);
    containerRef.current.innerHTML = renderedContent;

    setupSOPRefNavigation(containerRef.current, navigateToSOPFile);
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`sopref-container ${className}`}
      style={{
        whiteSpace: "pre-wrap",
      }}
    />
  );
}

export function InlineSOPRefRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderedContent = renderSOPRefLinks(content, navigateToSOPFile);
    containerRef.current.innerHTML = renderedContent;

    setupSOPRefNavigation(containerRef.current, navigateToSOPFile);
  }, [content]);

  return <span ref={containerRef} className="inline-sopref" />;
}
