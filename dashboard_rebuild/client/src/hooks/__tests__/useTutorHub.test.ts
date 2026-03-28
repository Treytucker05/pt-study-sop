import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTutorHub } from "@/hooks/useTutorHub";
import type { TutorHubResponse } from "@/lib/api";

const fetchCourseMapMock = vi.fn();
const getMaterialsMock = vi.fn();
const getLearningObjectivesMock = vi.fn();
const getContentSourcesMock = vi.fn();
const getHubMock = vi.fn();
const listSessionsMock = vi.fn();

vi.mock("@/api", () => ({
  fetchCourseMap: (...args: unknown[]) => fetchCourseMapMock(...args),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: (...args: unknown[]) => getMaterialsMock(...args),
      getContentSources: (...args: unknown[]) => getContentSourcesMock(...args),
      getHub: (...args: unknown[]) => getHubMock(...args),
      listSessions: (...args: unknown[]) => listSessionsMock(...args),
    },
    learningObjectives: {
      getByCourse: (...args: unknown[]) => getLearningObjectivesMock(...args),
    },
  },
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children);
  };
}

function makeTutorHubResponse(
  overrides?: Partial<TutorHubResponse>,
): TutorHubResponse {
  return {
    recommended_action: null,
    resume_candidate: {
      can_resume: false,
      course_id: null,
      course_name: null,
      course_code: null,
      session_id: null,
      last_mode: null,
      board_scope: null,
      board_id: null,
      topic: null,
      updated_at: null,
      action_label: "Resume",
    },
    upcoming_assignments: [],
    upcoming_tests: [],
    class_projects: [],
    study_wheel: {
      current_course_id: null,
      current_course_name: null,
      current_course_code: null,
      current_position: null,
      total_sessions: 0,
      total_minutes: 0,
      total_active_courses: 0,
      next_course_id: null,
      next_course_name: null,
      next_course_code: null,
    },
    ...overrides,
  };
}

describe("useTutorHub", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetchCourseMapMock.mockResolvedValue({
      vault_root: "Treys School",
      courses: [],
    });
    getMaterialsMock.mockResolvedValue([]);
    getLearningObjectivesMock.mockResolvedValue([]);
    listSessionsMock.mockResolvedValue([]);
    getHubMock.mockResolvedValue(makeTutorHubResponse());
  });

  it("derives the vault folder from course metadata returned by tutor content sources", async () => {
    getContentSourcesMock.mockResolvedValue({
      courses: [
        {
          id: 1,
          name: "Exercise Physiology",
          code: "EXPH",
          doc_count: 4,
          vault_folder: "Courses/Exercise Physiology",
        },
      ],
      total_materials: 4,
      total_instructions: 0,
      total_docs: 4,
      openrouter_enabled: false,
    });

    const { result } = renderHook(
      () =>
        useTutorHub({
          initialRouteQuery: { courseId: 1 },
          hasRestored: true,
          activeSessionId: null,
          persistClientState: false,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.courseLabel).toBe("Exercise Physiology");
    });

    act(() => {
      result.current.setSelectedObjectiveGroup("Week 7");
    });

    await waitFor(() => {
      expect(result.current.derivedVaultFolder).toBe(
        "Exercise Physiology/Week 7",
      );
    });
  });

  it("falls back to tutor hub course context when tutor content sources have not populated yet", async () => {
    getContentSourcesMock.mockResolvedValue({
      courses: [],
      total_materials: 0,
      total_instructions: 0,
      total_docs: 0,
      openrouter_enabled: false,
    });
    getHubMock.mockResolvedValue(
      makeTutorHubResponse({
        resume_candidate: {
          can_resume: true,
          course_id: 1,
          course_name: "Exercise Physiology",
          course_code: "EXPH",
          session_id: "sess-1",
          last_mode: "studio",
          board_scope: "project",
          board_id: null,
          topic: "Cardiac output",
          updated_at: "2026-03-28T04:00:00Z",
          action_label: "Resume",
        },
      }),
    );

    const { result } = renderHook(
      () =>
        useTutorHub({
          initialRouteQuery: { courseId: 1 },
          hasRestored: true,
          activeSessionId: null,
          persistClientState: false,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.courseLabel).toBe("Exercise Physiology");
    });

    act(() => {
      result.current.setSelectedObjectiveGroup("Week 7");
    });

    await waitFor(() => {
      expect(result.current.derivedVaultFolder).toBe(
        "Exercise Physiology/Week 7",
      );
    });
  });
});
