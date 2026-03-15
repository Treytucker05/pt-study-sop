import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { TutorContentSources } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo } from "react";

type StudioClassPickerProps = {
  onSelectCourse: (courseId: number) => void;
  activeSessionId: string | null;
};

export function StudioClassPicker({
  onSelectCourse,
  activeSessionId,
}: StudioClassPickerProps) {
  const { data: contentSources } = useQuery<TutorContentSources>({
    queryKey: ["tutor-content-sources"],
    queryFn: () => api.tutor.getContentSources(),
    staleTime: 60 * 1000,
  });

  const courses = useMemo(
    () => contentSources?.courses?.filter((c) => c.id !== null) ?? [],
    [contentSources],
  );

  // Auto-navigate to last-used course on mount
  useEffect(() => {
    if (courses.length === 0) return;

    const lastId = localStorage.getItem("studio.lastCourseId");
    if (!lastId) return;

    const parsed = Number(lastId);
    const match = courses.find((c) => c.id === parsed);
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
          <button
            key={course.id}
            onClick={() => handleSelect(course.id!)}
            className="border border-primary/20 bg-black/40 px-5 py-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="space-y-2">
              {course.code && (
                <Badge
                  variant="outline"
                  className="rounded-none text-[10px] border-primary/30"
                >
                  {course.code}
                </Badge>
              )}

              <div className="font-arcade text-sm text-primary">
                {course.name}
              </div>

              <div className="flex items-center justify-between">
                <div className="font-terminal text-[10px] text-muted-foreground">
                  {course.doc_count} MATERIALS
                </div>

                {course.doc_count > 0 ? (
                  <Badge
                    variant="outline"
                    className="rounded-none text-[9px] border-green-500/40 text-green-400"
                  >
                    ACTIVE
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="rounded-none text-[9px] border-zinc-500/40 text-zinc-400"
                  >
                    EMPTY
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
