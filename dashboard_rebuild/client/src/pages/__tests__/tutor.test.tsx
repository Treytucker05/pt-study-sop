import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  getSessionMock,
  getMaterialsMock,
  listSessionsMock,
  configCheckMock,
  getContentSourcesMock,
  preflightSessionMock,
  getLearningObjectivesByCourseMock,
  getCurrentCourseMock,
  fetchCourseMapMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getMaterialsMock: vi.fn(),
  listSessionsMock: vi.fn(),
  configCheckMock: vi.fn(),
  getContentSourcesMock: vi.fn(),
  preflightSessionMock: vi.fn(),
  getLearningObjectivesByCourseMock: vi.fn(),
  getCurrentCourseMock: vi.fn(),
  fetchCourseMapMock: vi.fn(),
}));

vi.mock("@/components/layout", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ContentFilter", () => ({
  ContentFilter: () => <div data-testid="content-filter" />,
}));

vi.mock("@/components/TutorWizard", () => ({
  TutorWizard: ({
    selectedMaterials,
  }: {
    selectedMaterials: number[];
  }) => <div data-testid="tutor-wizard">selected:{selectedMaterials.length}</div>,
}));

vi.mock("@/components/TutorChat", () => ({
  TutorChat: () => <div data-testid="tutor-chat" />,
}));

vi.mock("@/components/TutorArtifacts", () => ({
  TutorArtifacts: ({ artifacts }: { artifacts: { type: string }[] }) => (
    <div data-testid="tutor-artifacts-types">
      {artifacts.map((artifact) => artifact.type).join(",")}
    </div>
  ),
}));

vi.mock("@/lib/api", () => ({
  api: {
    tutor: {
      getMaterials: getMaterialsMock,
      listSessions: listSessionsMock,
      configCheck: configCheckMock,
      getContentSources: getContentSourcesMock,
      preflightSession: preflightSessionMock,
      getSession: getSessionMock,
      getSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      saveSettings: vi.fn().mockResolvedValue({ custom_instructions: "" }),
      createArtifact: vi.fn(),
      deleteArtifacts: vi.fn(),
      createSession: vi.fn(),
      createCustomChain: vi.fn(),
      endSession: vi.fn(),
      advanceBlock: vi.fn(),
    },
    studyWheel: {
      getCurrentCourse: getCurrentCourseMock,
    },
    learningObjectives: {
      getByCourse: getLearningObjectivesByCourseMock,
    },
    obsidian: {
      append: vi.fn(),
    },
  },
  fetchCourseMap: fetchCourseMapMock,
}));

import Tutor from "@/pages/tutor";

function renderTutor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Tutor />
    </QueryClientProvider>,
  );
}

describe("Tutor page restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    getMaterialsMock.mockResolvedValue([]);
    listSessionsMock.mockResolvedValue([]);
    configCheckMock.mockResolvedValue({ ok: true });
    getContentSourcesMock.mockResolvedValue({ courses: [] });
    preflightSessionMock.mockResolvedValue({
      ok: true,
      preflight_id: "preflight-test",
      course_id: 1,
      material_ids: [],
      resolved_learning_objectives: [],
      map_of_contents: null,
      vault_ready: false,
      recommended_mode_flags: {
        materials: false,
        obsidian: true,
        gemini_vision: false,
        web_search: false,
        deep_think: false,
      },
      blockers: [],
    });
    getLearningObjectivesByCourseMock.mockResolvedValue([]);
    getCurrentCourseMock.mockResolvedValue({ currentCourse: null });
    fetchCourseMapMock.mockResolvedValue({ courses: [] });
  });

  it("preserves structured_notes artifacts when restoring an active session", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-restore");
    getSessionMock.mockResolvedValue({
      session_id: "sess-restore",
      status: "active",
      turn_count: 1,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Restore Topic",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: JSON.stringify([
        {
          type: "structured_notes",
          created_at: new Date("2026-03-05T12:05:00Z").toISOString(),
        },
      ]),
      turns: [],
    });

    renderTutor();

    const artifactsButton = await screen.findByRole("button", { name: /artifacts/i });
    fireEvent.click(artifactsButton);

    await waitFor(() => {
      expect(screen.getByTestId("tutor-artifacts-types")).toHaveTextContent(
        "structured_notes",
      );
    });
  });

  it("uses library handoff state instead of stale wizard restore", async () => {
    sessionStorage.setItem("tutor.open_from_library.v1", "1");
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([101, 102]),
    );
    localStorage.setItem(
      "tutor.wizard.state.v1",
      JSON.stringify({
        courseId: 55,
        selectedMaterials: [],
        accuracyProfile: "strict",
      }),
    );

    renderTutor();

    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toHaveTextContent("selected:2");
    });
    expect(getCurrentCourseMock).not.toHaveBeenCalled();
  });

  it("keeps canonical selected materials when bootstrapping the current course", async () => {
    localStorage.setItem(
      "tutor.selected_material_ids.v2",
      JSON.stringify([101]),
    );
    getCurrentCourseMock.mockResolvedValue({ currentCourse: { id: 77 } });

    renderTutor();

    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toHaveTextContent("selected:1");
    });
    expect(getCurrentCourseMock).toHaveBeenCalledTimes(1);
  });

  it("migrates legacy library-selected material ids when Tutor boots", async () => {
    localStorage.setItem(
      "tutor.selected_material_ids.v1",
      JSON.stringify([301, 302]),
    );

    renderTutor();

    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toHaveTextContent("selected:2");
    });
    expect(localStorage.getItem("tutor.selected_material_ids.v2")).toBe(
      JSON.stringify([301, 302]),
    );
    expect(localStorage.getItem("tutor.selected_material_ids.v1")).toBeNull();
  });

  it("clears a stale active-session key when restore fetch fails", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-stale");
    getSessionMock.mockRejectedValueOnce(new Error("missing"));

    renderTutor();

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-stale");
    });
    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toBeInTheDocument();
    });
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });

  it("falls back safely when wizard state is corrupted JSON", async () => {
    localStorage.setItem("tutor.wizard.state.v1", "{not-valid-json");
    localStorage.setItem("tutor.selected_material_ids.v2", JSON.stringify([909]));

    renderTutor();

    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toHaveTextContent("selected:1");
    });
  });

  it("clears inactive restored sessions from localStorage", async () => {
    localStorage.setItem("tutor.active_session.v1", "sess-complete");
    getSessionMock.mockResolvedValueOnce({
      session_id: "sess-complete",
      status: "completed",
      turn_count: 2,
      started_at: new Date("2026-03-05T12:00:00Z").toISOString(),
      topic: "Completed Session",
      course_id: 1,
      method_chain_id: null,
      current_block_index: 0,
      chain_blocks: [],
      content_filter: {
        material_ids: [],
        accuracy_profile: "strict",
        objective_scope: "module_all",
      },
      artifacts_json: "[]",
      turns: [],
    });

    renderTutor();

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledWith("sess-complete");
    });
    await waitFor(() => {
      expect(screen.getByTestId("tutor-wizard")).toBeInTheDocument();
    });
    expect(localStorage.getItem("tutor.active_session.v1")).toBeNull();
  });
});
