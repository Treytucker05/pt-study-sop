import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorHubClassProject, TutorHubResponse } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo } from "react";

type StudioClassPickerProps = {
  onSelectCourse: (courseId: number) => void;
  activeSessionId: string | null;
};

function formatLastStudied(value: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return parsed.toLocaleDateString();
}

function getStatusBadge(course: TutorHubClassProject): {
  label: "ACTIVE" | "REVIEW" | "READY" | "EMPTY";
  className: string;
} {
  if (course.active_session) {
    return { label: "ACTIVE", className: "border-green-500/40 text-green-400" };
  }
  if (course.pending_event_count > 0 || course.captured_item_count > 0) {
    return { label: "REVIEW", className: "border-yellow-500/40 text-yellow-300" };
  }
  if (course.material_count > 0) {
    return { label: "READY", className: "border-cyan-500/40 text-cyan-300" };
  }
  return { label: "EMPTY", className: "border-zinc-500/40 text-zinc-400" };
}

export function StudioClassPicker({
  onSelectCourse,
  activeSessionId,
}: StudioClassPickerProps) {
  const { data: hub } = useQuery<TutorHubResponse>({
    queryKey: ["tutor-hub"],
    queryFn: () => api.tutor.getHub(),
    staleTime: 60 * 1000,
  });

  const courses = useMemo(
    () => hub?.class_projects ?? [],
    [hub],
  );

  // Auto-navigate to last-used course on mount
  useEffect(() => {
    if (courses.length === 0) return;

    const lastId = localStorage.getItem("studio.lastCourseId");
    if (!lastId) return;

    const parsed = Number(lastId);
    const match = courses.find((course) => course.course_id === parsed);
    if (match) {
      onSelectCourse(parsed);
    }
  }, [courses, onSelectCourse]);

  const handleSelect = (courseId: number) => {
    localStorage.setItem("studio.lastCourseId", String(courseId));
    onSelectCourse(courseId);
  };

  if (courses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="font-arcade text-sm text-primary">NO COURSES YET</div>
          <div className="font-terminal text-sm text-muted-foreground max-w-sm">
            Import course materials via the Sync tab on the Brain page, then come
            back here to start studying.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-arcade text-2xl text-primary tracking-wider">STUDIO</h1>
        <p className="mt-2 font-terminal text-sm text-muted-foreground">
          Select a class to begin your study session.
        </p>
      </div>

      {activeSessionId && (
        <div className="border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <div>
              <div className="font-arcade text-[10px] text-yellow-400">
                SESSION IN PROGRESS
              </div>
              <div className="font-terminal text-xs text-muted-foreground">
                You have an active study session. Switch to TUTOR mode to
                continue.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course) => (
          (() => {
            const status = getStatusBadge(course);
            return (
              <button
                key={course.course_id}
                onClick={() => handleSelect(course.course_id)}
                className="border border-primary/20 bg-black/40 px-5 py-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      {course.course_code && (
                        <Badge
                          variant="outline"
                          className="rounded-none text-[10px] border-primary/30"
                        >
                          {course.course_code}
                        </Badge>
                      )}

                      <div className="font-arcade text-sm text-primary">
                        {course.course_name}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`rounded-none text-[9px] shrink-0 ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-primary/10 bg-black/30 px-2 py-2">
                      <div className="font-terminal text-[9px] text-muted-foreground">MATERIALS</div>
                      <div className="mt-1 font-arcade text-[11px] text-primary">
                        {course.material_count}
                      </div>
                    </div>
                    <div className="border border-primary/10 bg-black/30 px-2 py-2">
                      <div className="font-terminal text-[9px] text-muted-foreground">SESSIONS</div>
                      <div className="mt-1 font-arcade text-[11px] text-primary">
                        {course.recent_session_count}
                      </div>
                    </div>
                    <div className="border border-primary/10 bg-black/30 px-2 py-2">
                      <div className="font-terminal text-[9px] text-muted-foreground">LAST STUDIED</div>
                      <div className="mt-1 font-terminal text-[11px] text-white">
                        {formatLastStudied(course.last_studied_at)}
                      </div>
                    </div>
                    <div className="border border-primary/10 bg-black/30 px-2 py-2">
                      <div className="font-terminal text-[9px] text-muted-foreground">PROMOTED</div>
                      <div className="mt-1 font-arcade text-[11px] text-primary">
                        {course.promoted_item_count}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 font-terminal text-[10px] text-muted-foreground">
                    <span>{course.pending_event_count} PENDING EVENTS</span>
                    <span>{course.captured_item_count} CAPTURED</span>
                  </div>
                </div>
              </button>
            );
          })()
        ))}
      </div>
    </div>
  );
}
