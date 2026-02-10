import { PanelRightOpen, Search, FileText } from "lucide-react";
import { COURSE_FOLDERS } from "@/config/courses";
import type { BrainWorkspace } from "./useBrainWorkspace";

interface SidebarRailProps {
  onExpand: () => void;
  workspace: BrainWorkspace;
}

export function SidebarRail({ onExpand, workspace }: SidebarRailProps) {
  return (
    <div className="brain-sidebar-rail" aria-label="Sidebar rail">
      {/* Expand toggle */}
      <button
        type="button"
        onClick={onExpand}
        className="brain-sidebar-rail__btn"
        title="Expand sidebar"
        aria-label="Expand sidebar"
      >
        <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Search — expands sidebar + focuses search */}
      <button
        type="button"
        onClick={onExpand}
        className="brain-sidebar-rail__btn"
        title="Search files"
        aria-label="Search files"
      >
        <Search className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* New note */}
      <button
        type="button"
        onClick={() => {
          const today = new Date().toISOString().split("T")[0];
          workspace.setCurrentFile(`School/Session-${today}.md`);
          workspace.setFileContent(`# Study Session - ${today}\n\n## Summary\n\n\n## Concepts Covered\n- \n\n## Notes\n\n`);
          workspace.setHasChanges(true);
        }}
        className="brain-sidebar-rail__btn"
        title="New note"
        aria-label="New note"
      >
        <FileText className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Divider */}
      <div className="w-6 h-px bg-primary/30 my-1" />

      {/* Course initials */}
      {COURSE_FOLDERS.map((course) => (
        <button
          key={course.id}
          type="button"
          onClick={onExpand}
          className="brain-sidebar-rail__course"
          title={course.name}
          aria-label={course.name}
        >
          {course.name.charAt(0)}
        </button>
      ))}
    </div>
  );
}
