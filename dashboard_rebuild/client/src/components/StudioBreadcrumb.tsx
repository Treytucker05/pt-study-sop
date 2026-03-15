import { ChevronRight } from "lucide-react";

export type StudioLevel = 1 | 2 | 3;

type StudioBreadcrumbProps = {
  level: StudioLevel;
  courseName?: string;
  onNavigate: (level: StudioLevel) => void;
};

export function StudioBreadcrumb({ level, courseName, onNavigate }: StudioBreadcrumbProps) {
  const clickable = "font-arcade text-[10px] text-primary/70 hover:text-primary cursor-pointer transition-colors";
  const active = "font-arcade text-[10px] text-primary";
  const separator = "h-3 w-3 text-primary/30";

  return (
    <nav className="flex items-center gap-1 px-4 py-2 border-b border-primary/20 bg-black/30">
      {level === 1 ? (
        <span className={active}>STUDIO</span>
      ) : (
        <>
          <span className={clickable} onClick={() => onNavigate(1)}>STUDIO</span>
          <ChevronRight className={separator} />
          {level === 2 ? (
            <span className={active}>{courseName ?? "COURSE"}</span>
          ) : (
            <>
              <span className={clickable} onClick={() => onNavigate(2)}>
                {courseName ?? "COURSE"}
              </span>
              <ChevronRight className={separator} />
              <span className={active}>WORKSPACE</span>
            </>
          )}
        </>
      )}
    </nav>
  );
}
