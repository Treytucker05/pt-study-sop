import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type {
  TutorHubClassProject,
  TutorHubStudyWheelSnapshot,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/* ── types ────────────────────────────────────────────────── */

interface StudyWheelProps {
  courses: TutorHubClassProject[];
  wheelSnapshot: TutorHubStudyWheelSnapshot;
  loading?: boolean;
}

/* ── constants ────────────────────────────────────────────── */

const ROW_HEIGHT = 56;
const SELECTED_HEIGHT = 72;

/* ── single row subcomponent ─────────────────────────────── */

function WheelRow({
  course,
  index,
  scrollOffset,
  totalCount,
  isCurrent,
  isNext,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: {
  course: TutorHubClassProject;
  index: number;
  scrollOffset: ReturnType<typeof useSpring>;
  totalCount: number;
  isCurrent: boolean;
  isNext: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  // Distance from the "center" position (0 = selected)
  const distFromCenter = useTransform(scrollOffset, (offset: number) => {
    return index - offset;
  });

  // Y position: selected at top (dist=0), rest stack below
  const y = useTransform(distFromCenter, (dist: number) => {
    // Items below selected stack downward, items "above" wrap below all others
    if (dist >= 0) {
      return dist * ROW_HEIGHT;
    }
    // Negative dist = items that already cycled past; place them below the rest
    return (totalCount + dist) * ROW_HEIGHT;
  });

  // Scale: first item is 1.0, diminishes downward
  const scale = useTransform(distFromCenter, (dist: number) => {
    const effective = dist >= 0 ? dist : totalCount + dist;
    return Math.max(0.65, 1 - effective * 0.06);
  });

  // Opacity: first item is 1.0, fades downward
  const opacity = useTransform(distFromCenter, (dist: number) => {
    const effective = dist >= 0 ? dist : totalCount + dist;
    return Math.max(0.3, 1 - effective * 0.12);
  });

  // Is this the center-selected item?
  const isSelected = useTransform(distFromCenter, (dist: number) => {
    return Math.abs(dist) < 0.5;
  });

  return (
    <motion.div
      className={cn(
        "study-wheel__face absolute left-0 right-0 flex items-center px-4 border-y transition-colors",
        isCurrent && "study-wheel__face--current",
        isNext && "study-wheel__face--next",
        isHovered && !isCurrent && !isNext && "bg-primary/5",
      )}
      style={{
        height: ROW_HEIGHT,
        y,
        scale,
        opacity,
        zIndex: useTransform(distFromCenter, (d: number) =>
          totalCount - Math.round(Math.abs(d)),
        ),
        top: ROW_HEIGHT * 0.25,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Position number */}
      <div className="flex-none w-7 text-center">
        <span className="font-arcade text-ui-2xs text-primary/40">
          {(course.wheel_position ?? index) + 1}
        </span>
      </div>

      {/* Course info */}
      <div className="flex-1 min-w-0 px-3">
        <div className={cn(
          "font-arcade text-ui-2xs truncate",
          isCurrent ? "text-primary" : isNext ? "text-amber-300" : "text-foreground/75",
        )}>
          {course.course_code
            ? `${course.course_code} • ${course.course_name}`
            : course.course_name}
        </div>
        <div className="mt-0.5 font-mono text-xs text-foreground/40 truncate">
          {course.recent_session_count} sessions
          {course.last_studied_at
            ? ` • ${new Date(course.last_studied_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
            : ""}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex-none flex items-center gap-1.5">
        {isCurrent && (
          <span className="font-arcade text-ui-2xs text-primary border border-primary/40 bg-primary/10 px-1.5 py-0.5">
            NOW
          </span>
        )}
        {isNext && !isCurrent && (
          <span className="font-arcade text-ui-2xs text-amber-300 border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5">
            NEXT
          </span>
        )}
        {course.pending_event_count > 0 && (
          <span className="font-mono text-xs text-foreground/40">
            {course.pending_event_count} due
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── main component ───────────────────────────────────────── */

export function StudyWheel({
  courses,
  wheelSnapshot,
  loading = false,
}: StudyWheelProps) {
  const n = courses.length;

  const prevNextRef = useRef<number | null>(null);
  const cumulativeRef = useRef(0);
  const scrollValue = useMotionValue(0);
  const scrollSpring = useSpring(scrollValue, {
    stiffness: 50,
    damping: 18,
    mass: 1.2,
  });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const initializedRef = useRef(false);

  // Find the index of the "next" course (the one that should be centered)
  const nextIdx = useMemo(() => {
    if (n === 0) return 0;
    const idx = courses.findIndex(
      (c) => c.course_id === wheelSnapshot.next_course_id,
    );
    return idx >= 0 ? idx : 0;
  }, [courses, wheelSnapshot.next_course_id, n]);

  // Initialize + animate on next_course_id change
  useEffect(() => {
    if (n === 0) return;

    if (!initializedRef.current) {
      scrollValue.set(nextIdx);
      prevNextRef.current = wheelSnapshot.next_course_id;
      initializedRef.current = true;
      return;
    }

    const nextId = wheelSnapshot.next_course_id;
    if (nextId === prevNextRef.current) return;

    const newI = nextId !== null
      ? courses.findIndex((c) => c.course_id === nextId)
      : -1;

    if (newI >= 0) {
      scrollValue.set(newI);
    }

    prevNextRef.current = nextId;
  }, [wheelSnapshot.next_course_id, courses, n, nextIdx, scrollValue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-[240px] w-full max-w-[440px] border-2 border-primary/20 animate-pulse rounded" />
      </div>
    );
  }

  if (n === 0) return null;

  // Height: enough to show all items with spacing, minimum 5 rows visible
  const visibleSlots = Math.max(n, 5);
  const containerHeight = Math.min(visibleSlots * ROW_HEIGHT, ROW_HEIGHT * 9);

  return (
    <div className="space-y-4">
      {/* Drum wheel */}
      <div
        className="study-wheel__drum relative mx-auto overflow-hidden"
        style={{ height: containerHeight, maxWidth: 500 }}
      >
        {/* Bottom fade only — no dead space at top */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Top selection brackets — first item pops out */}
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: ROW_HEIGHT * 0.25 - 2 }}
        >
          <div className="study-wheel__bracket mx-2" />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ top: ROW_HEIGHT * 0.25 + ROW_HEIGHT + 1 }}
        >
          <div className="study-wheel__bracket mx-2" />
        </div>

        {/* Side rails */}
        <div className="pointer-events-none absolute left-0 inset-y-0 z-20 w-0.5 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
        <div className="pointer-events-none absolute right-0 inset-y-0 z-20 w-0.5 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />

        {/* Rows */}
        <div className="absolute inset-0">
          {courses.map((course, i) => (
            <WheelRow
              key={course.course_id}
              course={course}
              index={i}
              scrollOffset={scrollSpring}
              totalCount={n}
              isCurrent={
                course.wheel_active ||
                course.course_id === wheelSnapshot.current_course_id
              }
              isNext={course.course_id === wheelSnapshot.next_course_id}
              isHovered={hoveredIdx === i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="border border-primary/20 bg-black/40 py-2 px-1">
          <div className="font-arcade text-ui-2xs text-primary/60">COURSES</div>
          <div className="mt-1 font-terminal text-lg text-foreground/90">
            {wheelSnapshot.total_active_courses}
          </div>
        </div>
        <div className="border border-primary/20 bg-black/40 py-2 px-1">
          <div className="font-arcade text-ui-2xs text-primary/60">SESSIONS</div>
          <div className="mt-1 font-terminal text-lg text-foreground/90">
            {wheelSnapshot.total_sessions}
          </div>
        </div>
        <div className="border border-primary/20 bg-black/40 py-2 px-1">
          <div className="font-arcade text-ui-2xs text-primary/60">MINUTES</div>
          <div className="mt-1 font-terminal text-lg text-foreground/90">
            {wheelSnapshot.total_minutes}
          </div>
        </div>
      </div>
    </div>
  );
}
