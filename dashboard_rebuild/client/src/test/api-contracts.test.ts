/**
 * API Contract Tests — verify that the frontend api client sends
 * the correct URL, method, headers, and body shape for each endpoint.
 *
 * These tests complement the backend contract tests in brain/tests/test_api_contracts.py.
 * Together they verify both sides of the API contract agree.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, apiRequest } from "@/api";

// ── Mock fetch ──────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockJsonResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

function mock204() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 204,
    statusText: "No Content",
    json: () => Promise.reject(new Error("No content")),
  });
}

function mockError(status: number, text: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: text,
    json: () => Promise.resolve({ error: text }),
  });
}

function lastFetchCall() {
  const [url, options] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  return { url: url as string, options: options as RequestInit | undefined };
}

function lastFetchBody() {
  const { options } = lastFetchCall();
  return options?.body ? JSON.parse(options.body as string) : undefined;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════
// request() / apiRequest() — core contract
// ═══════════════════════════════════════════════════════════════════════

describe("request() core contract", () => {
  it("prepends /api to all URLs", async () => {
    mockJsonResponse([]);
    await api.sessions.getAll();
    expect(lastFetchCall().url).toBe("/api/sessions");
  });

  it("sets Content-Type: application/json by default", async () => {
    mockJsonResponse([]);
    await api.sessions.getAll();
    const headers = lastFetchCall().options?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204 responses", async () => {
    mock204();
    const result = await api.sessions.delete(1);
    expect(result).toBeUndefined();
  });

  it("throws on non-ok responses", async () => {
    mockError(404, "Not Found");
    await expect(api.sessions.getOne(999)).rejects.toThrow("API Error: Not Found");
  });

  it("apiRequest delegates to request", async () => {
    mockJsonResponse({ test: true });
    const result = await apiRequest<{ test: boolean }>("/test");
    expect(result).toEqual({ test: true });
    expect(lastFetchCall().url).toBe("/api/test");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Sessions — contract with backend /api/sessions
// ═══════════════════════════════════════════════════════════════════════

describe("api.sessions contract", () => {
  it("getAll → GET /api/sessions", async () => {
    mockJsonResponse([]);
    await api.sessions.getAll();
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/sessions");
    expect(options?.method).toBeUndefined(); // GET is default
  });

  it("getStats → GET /api/sessions/stats", async () => {
    mockJsonResponse({ total: 5, avgErrors: 0, totalCards: 10 });
    const data = await api.sessions.getStats();
    expect(lastFetchCall().url).toBe("/api/sessions/stats");
    expect(data).toHaveProperty("total");
  });

  it("getOne → GET /api/sessions/:id", async () => {
    mockJsonResponse({ id: 42 });
    await api.sessions.getOne(42);
    expect(lastFetchCall().url).toBe("/api/sessions/42");
  });

  it("create → POST /api/sessions with body", async () => {
    mockJsonResponse({ id: 1 });
    await api.sessions.create({ mode: "brain" } as any);
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/sessions");
    expect(options?.method).toBe("POST");
    expect(lastFetchBody()).toEqual({ mode: "brain" });
  });

  it("update → PATCH /api/sessions/:id with body", async () => {
    mockJsonResponse({ id: 1 });
    await api.sessions.update(1, { notes: "test" } as any);
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/sessions/1");
    expect(options?.method).toBe("PATCH");
    expect(lastFetchBody()).toEqual({ notes: "test" });
  });

  it("delete → DELETE /api/sessions/:id", async () => {
    mock204();
    await api.sessions.delete(5);
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/sessions/5");
    expect(options?.method).toBe("DELETE");
  });

  it("deleteMany → POST /api/sessions/bulk-delete with ids array", async () => {
    mockJsonResponse({ deleted: 2 });
    await api.sessions.deleteMany([1, 2]);
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/sessions/bulk-delete");
    expect(options?.method).toBe("POST");
    expect(lastFetchBody()).toEqual({ ids: [1, 2] });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Courses — contract with backend /api/courses
// ═══════════════════════════════════════════════════════════════════════

describe("api.courses contract", () => {
  it("getAll → GET /api/courses", async () => {
    mockJsonResponse([]);
    await api.courses.getAll();
    expect(lastFetchCall().url).toBe("/api/courses");
  });

  it("getActive → GET /api/courses/active", async () => {
    mockJsonResponse([]);
    await api.courses.getActive();
    expect(lastFetchCall().url).toBe("/api/courses/active");
  });

  it("create → POST /api/courses", async () => {
    mockJsonResponse({ id: 1 });
    await api.courses.create({ name: "Test" } as any);
    expect(lastFetchCall().url).toBe("/api/courses");
    expect(lastFetchCall().options?.method).toBe("POST");
  });

  it("update → PATCH /api/courses/:id", async () => {
    mockJsonResponse({ id: 1 });
    await api.courses.update(1, { name: "Updated" } as any);
    expect(lastFetchCall().url).toBe("/api/courses/1");
    expect(lastFetchCall().options?.method).toBe("PATCH");
  });

  it("delete → DELETE /api/courses/:id", async () => {
    mock204();
    await api.courses.delete(1);
    expect(lastFetchCall().url).toBe("/api/courses/1");
    expect(lastFetchCall().options?.method).toBe("DELETE");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Methods — contract with backend /api/methods
// ═══════════════════════════════════════════════════════════════════════

describe("api.methods contract", () => {
  it("getAll → GET /api/methods", async () => {
    mockJsonResponse([]);
    await api.methods.getAll();
    expect(lastFetchCall().url).toBe("/api/methods");
  });

  it("getAll with category filter → GET /api/methods?category=retrieve", async () => {
    mockJsonResponse([]);
    await api.methods.getAll("retrieve");
    expect(lastFetchCall().url).toBe("/api/methods?category=retrieve");
  });

  it("getOne → GET /api/methods/:id", async () => {
    mockJsonResponse({ id: 1 });
    await api.methods.getOne(1);
    expect(lastFetchCall().url).toBe("/api/methods/1");
  });

  it("create → POST /api/methods with full block shape", async () => {
    mockJsonResponse({ id: 1, name: "Test" });
    await api.methods.create({
      name: "Test",
      category: "retrieve",
      default_duration_min: 10,
      energy_cost: "medium",
      tags: ["tag1"],
    } as any);
    const body = lastFetchBody();
    expect(body.name).toBe("Test");
    expect(body.category).toBe("retrieve");
    expect(body.tags).toEqual(["tag1"]);
  });

  it("update → PUT /api/methods/:id", async () => {
    mockJsonResponse({ id: 1, updated: true });
    await api.methods.update(1, { name: "Updated" } as any);
    expect(lastFetchCall().url).toBe("/api/methods/1");
    expect(lastFetchCall().options?.method).toBe("PUT");
  });

  it("delete → DELETE /api/methods/:id", async () => {
    mock204();
    await api.methods.delete(1);
    expect(lastFetchCall().url).toBe("/api/methods/1");
    expect(lastFetchCall().options?.method).toBe("DELETE");
  });

  it("rate → POST /api/methods/:id/rate with ratings", async () => {
    mockJsonResponse({ id: 1, rated: true });
    await api.methods.rate(5, { effectiveness: 4, engagement: 3 } as any);
    expect(lastFetchCall().url).toBe("/api/methods/5/rate");
    expect(lastFetchCall().options?.method).toBe("POST");
    const body = lastFetchBody();
    expect(body.effectiveness).toBe(4);
    expect(body.engagement).toBe(3);
  });

  it("analytics → GET /api/methods/analytics", async () => {
    mockJsonResponse({ block_stats: [], chain_stats: [], recent_ratings: [] });
    const data = await api.methods.analytics();
    expect(lastFetchCall().url).toBe("/api/methods/analytics");
    expect(data).toHaveProperty("block_stats");
    expect(data).toHaveProperty("chain_stats");
    expect(data).toHaveProperty("recent_ratings");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Chains — contract with backend /api/chains
// ═══════════════════════════════════════════════════════════════════════

describe("api.chains contract", () => {
  it("getAll → GET /api/chains", async () => {
    mockJsonResponse([]);
    await api.chains.getAll();
    expect(lastFetchCall().url).toBe("/api/chains");
  });

  it("getOne → GET /api/chains/:id", async () => {
    mockJsonResponse({ id: 1, blocks: [] });
    await api.chains.getOne(1);
    expect(lastFetchCall().url).toBe("/api/chains/1");
  });

  it("create → POST /api/chains with chain shape", async () => {
    mockJsonResponse({ id: 1, name: "Test" });
    await api.chains.create({
      name: "Test Chain",
      block_ids: [1, 2],
      is_template: 0,
      context_tags: {},
    } as any);
    const body = lastFetchBody();
    expect(body.name).toBe("Test Chain");
    expect(body.block_ids).toEqual([1, 2]);
  });

  it("delete → DELETE /api/chains/:id", async () => {
    mock204();
    await api.chains.delete(1);
    expect(lastFetchCall().url).toBe("/api/chains/1");
    expect(lastFetchCall().options?.method).toBe("DELETE");
  });

  it("rate → POST /api/chains/:id/rate", async () => {
    mockJsonResponse({ id: 1, rated: true });
    await api.chains.rate(3, { effectiveness: 5, engagement: 4 } as any);
    expect(lastFetchCall().url).toBe("/api/chains/3/rate");
    expect(lastFetchCall().options?.method).toBe("POST");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Planner — contract with backend /api/planner
// ═══════════════════════════════════════════════════════════════════════

describe("api.planner contract", () => {
  it("getQueue → GET /api/planner/queue", async () => {
    mockJsonResponse([]);
    await api.planner.getQueue();
    expect(lastFetchCall().url).toBe("/api/planner/queue");
  });

  it("getSettings → GET /api/planner/settings", async () => {
    mockJsonResponse({});
    await api.planner.getSettings();
    expect(lastFetchCall().url).toBe("/api/planner/settings");
  });

  it("updateSettings → PUT /api/planner/settings", async () => {
    mockJsonResponse({ ok: true });
    await api.planner.updateSettings({ calendar_source: "google" });
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/planner/settings");
    expect(options?.method).toBe("PUT");
  });

  it("generate → POST /api/planner/generate", async () => {
    mockJsonResponse({ ok: true, tasks_created: 5 });
    const data = await api.planner.generate();
    expect(lastFetchCall().url).toBe("/api/planner/generate");
    expect(lastFetchCall().options?.method).toBe("POST");
    expect(data).toHaveProperty("tasks_created");
  });

  it("updateTask → PATCH /api/planner/tasks/:id with status", async () => {
    mockJsonResponse({ ok: true });
    await api.planner.updateTask(7, { status: "completed" });
    const { url, options } = lastFetchCall();
    expect(url).toBe("/api/planner/tasks/7");
    expect(options?.method).toBe("PATCH");
    expect(lastFetchBody()).toEqual({ status: "completed" });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Brain — contract with backend /api/brain
// ═══════════════════════════════════════════════════════════════════════

describe("api.brain contract", () => {
  it("getMetrics → GET /api/brain/metrics", async () => {
    mockJsonResponse({});
    await api.brain.getMetrics();
    expect(lastFetchCall().url).toBe("/api/brain/metrics");
  });

  it("organizePreview → POST /api/brain/organize-preview", async () => {
    mockJsonResponse({ preview: [] });
    await api.brain.organizePreview({ rawNotes: "test" } as any);
    expect(lastFetchCall().url).toBe("/api/brain/organize-preview");
    expect(lastFetchCall().options?.method).toBe("POST");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Academic Deadlines — contract with backend /api/academic-deadlines
// ═══════════════════════════════════════════════════════════════════════

describe("api.academicDeadlines contract", () => {
  it("getAll → GET /api/academic-deadlines", async () => {
    mockJsonResponse([]);
    await api.academicDeadlines.getAll();
    expect(lastFetchCall().url).toBe("/api/academic-deadlines");
  });

  it("create → POST /api/academic-deadlines", async () => {
    mockJsonResponse({ id: 1 });
    await api.academicDeadlines.create({
      title: "Exam",
      course: "Anatomy",
      dueDate: "2026-05-15",
      type: "exam",
    } as any);
    const body = lastFetchBody();
    expect(body.title).toBe("Exam");
    expect(body.dueDate).toBe("2026-05-15");
  });

  it("toggleComplete → POST /api/academic-deadlines/:id/toggle", async () => {
    mockJsonResponse({ id: 1, completed: true });
    await api.academicDeadlines.toggleComplete(1);
    expect(lastFetchCall().url).toBe("/api/academic-deadlines/1/toggle");
    expect(lastFetchCall().options?.method).toBe("POST");
  });

  it("delete → DELETE /api/academic-deadlines/:id", async () => {
    mock204();
    await api.academicDeadlines.delete(1);
    expect(lastFetchCall().url).toBe("/api/academic-deadlines/1");
    expect(lastFetchCall().options?.method).toBe("DELETE");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Data Explorer — contract with backend /api/data
// ═══════════════════════════════════════════════════════════════════════

describe("api.data contract", () => {
  it("getTables → GET /api/data/tables", async () => {
    mockJsonResponse(["sessions", "courses"]);
    await api.data.getTables();
    expect(lastFetchCall().url).toBe("/api/data/tables");
  });

  it("getSchema → GET /api/data/tables/:name", async () => {
    mockJsonResponse({ table: "sessions", columns: [], row_count: 0 });
    await api.data.getSchema("sessions");
    expect(lastFetchCall().url).toBe("/api/data/tables/sessions");
  });

  it("getRows → GET /api/data/tables/:name/rows with pagination", async () => {
    mockJsonResponse({ rows: [], total: 0, limit: 50, offset: 0 });
    await api.data.getRows("sessions", 50, 0);
    expect(lastFetchCall().url).toBe("/api/data/tables/sessions/rows?limit=50&offset=0");
  });

  it("updateRow → PATCH /api/data/tables/:name/rows/:id", async () => {
    mockJsonResponse({ updated: true, rowid: 1 });
    await api.data.updateRow("sessions", 1, { notes: "updated" });
    expect(lastFetchCall().url).toBe("/api/data/tables/sessions/rows/1");
    expect(lastFetchCall().options?.method).toBe("PATCH");
  });

  it("deleteRow → DELETE /api/data/tables/:name/rows/:id", async () => {
    mockJsonResponse({ deleted: true, rowid: 1 });
    await api.data.deleteRow("sessions", 1);
    expect(lastFetchCall().url).toBe("/api/data/tables/sessions/rows/1");
    expect(lastFetchCall().options?.method).toBe("DELETE");
  });

  it("deleteRows → POST bulk-delete with ids", async () => {
    mockJsonResponse({ deleted: 2 });
    await api.data.deleteRows("sessions", [1, 2]);
    expect(lastFetchCall().url).toBe("/api/data/tables/sessions/rows/bulk-delete");
    expect(lastFetchCall().options?.method).toBe("POST");
    expect(lastFetchBody()).toEqual({ ids: [1, 2] });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Notes — contract with backend /api/notes
// ═══════════════════════════════════════════════════════════════════════

describe("api.notes contract", () => {
  it("getAll → GET /api/notes", async () => {
    mockJsonResponse([]);
    await api.notes.getAll();
    expect(lastFetchCall().url).toBe("/api/notes");
  });

  it("create → POST /api/notes", async () => {
    mockJsonResponse({ id: 1 });
    await api.notes.create({ title: "Note", content: "text" } as any);
    expect(lastFetchCall().options?.method).toBe("POST");
  });

  it("reorder → POST /api/notes/reorder", async () => {
    mockJsonResponse({ success: true });
    await api.notes.reorder([{ id: 1, position: 0 }, { id: 2, position: 1 }]);
    expect(lastFetchCall().url).toBe("/api/notes/reorder");
    expect(lastFetchCall().options?.method).toBe("POST");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Streak & Study Wheel — contract with backend
// ═══════════════════════════════════════════════════════════════════════

describe("api.streak contract", () => {
  it("get → GET /api/streak", async () => {
    mockJsonResponse({ currentStreak: 0, longestStreak: 0, lastStudyDate: null });
    await api.streak.get();
    expect(lastFetchCall().url).toBe("/api/streak");
  });
});

describe("api.studyWheel contract", () => {
  it("getCurrentCourse → GET /api/study-wheel/current", async () => {
    mockJsonResponse({ currentCourse: null });
    await api.studyWheel.getCurrentCourse();
    expect(lastFetchCall().url).toBe("/api/study-wheel/current");
  });

  it("completeSession → POST /api/study-wheel/complete-session", async () => {
    mockJsonResponse({ session: {}, nextCourse: null });
    await api.studyWheel.completeSession({ courseId: 1, minutes: 45 } as any);
    expect(lastFetchCall().url).toBe("/api/study-wheel/complete-session");
    expect(lastFetchCall().options?.method).toBe("POST");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Error handling — frontend behavior on non-ok responses
// ═══════════════════════════════════════════════════════════════════════

describe("error handling contract", () => {
  it("throws with status text for 404", async () => {
    mockError(404, "Not Found");
    await expect(api.methods.getOne(999)).rejects.toThrow("API Error: Not Found");
  });

  it("throws with status text for 500", async () => {
    mockError(500, "Internal Server Error");
    await expect(api.courses.getAll()).rejects.toThrow("API Error: Internal Server Error");
  });

  it("throws with status text for 400", async () => {
    mockError(400, "Bad Request");
    await expect(api.methods.create({} as any)).rejects.toThrow("API Error: Bad Request");
  });
});
