import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest, api } from "@/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200, statusText = "OK") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("request / apiRequest", () => {
  it("sends GET with Content-Type header and parses JSON", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([{ id: 1 }]));
    const result = await apiRequest("/sessions");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null, 404, "Not Found"));
    await expect(apiRequest("/nope")).rejects.toThrow("API Error: Not Found");
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: () => Promise.reject(new Error("no body")),
    });
    const result = await apiRequest("/sessions/1");
    expect(result).toBeUndefined();
  });

  it("merges custom headers with Content-Type", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await apiRequest("/test", {
      headers: { Authorization: "Bearer tok" },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tok",
        },
      })
    );
  });
});

describe("api.sessions", () => {
  it("getAll fetches /sessions", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.sessions.getAll();
    expect(mockFetch).toHaveBeenCalledWith("/api/sessions", expect.anything());
  });

  it("create sends POST with body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.sessions.create({ topic: "ATP" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ topic: "ATP" }),
      })
    );
  });

  it("update sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.sessions.update(1, { topic: "Updated" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions/1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("delete sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.sessions.delete(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("deleteMany sends POST to bulk-delete", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: 2 }));
    await api.sessions.deleteMany([1, 2]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/sessions/bulk-delete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: [1, 2] }),
      })
    );
  });

  it("getStats fetches /sessions/stats", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ total: 5, avgErrors: 1, totalCards: 20 }));
    const stats = await api.sessions.getStats();
    expect(stats).toEqual({ total: 5, avgErrors: 1, totalCards: 20 });
  });
});

describe("api.events", () => {
  it("getAll fetches /events", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.events.getAll();
    expect(mockFetch).toHaveBeenCalledWith("/api/events", expect.anything());
  });

  it("create sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.events.create({ title: "Lecture" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.tasks", () => {
  it("getAll fetches /tasks", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tasks.getAll();
    expect(mockFetch).toHaveBeenCalledWith("/api/tasks", expect.anything());
  });

  it("delete sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.tasks.delete(5);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/5",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("api.modules", () => {
  it("getByCourse fetches with courseId query", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.modules.getByCourse(3);
    expect(mockFetch).toHaveBeenCalledWith("/api/modules?courseId=3", expect.anything());
  });

  it("createBulk sends POST with courseId and modules", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.modules.createBulk(1, [{ name: "Week 1" } as any]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/modules/bulk",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ courseId: 1, modules: [{ name: "Week 1" }] }),
      })
    );
  });
});

describe("api.chat", () => {
  it("getMessages fetches chat by sessionId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.chat.getMessages("sess-123");
    expect(mockFetch).toHaveBeenCalledWith("/api/chat/sess-123", expect.anything());
  });

  it("sendMessage sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.chat.sendMessage("sess-123", { role: "user", content: "hi" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat/sess-123",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.google", () => {
  it("getStatus fetches google status", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ configured: true, connected: false, hasClientId: true, hasClientSecret: true }));
    const status = await api.google.getStatus();
    expect(status.configured).toBe(true);
  });

  it("disconnect sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.google.disconnect();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/google/disconnect",
      expect.objectContaining({ method: "POST" })
    );
  });
});

// Helper for batch-testing CRUD-like namespaces
function testCrud(ns: string, getter: () => Record<string, Function>, basePath: string) {
  describe(`api.${ns}`, () => {
    const methods = getter();
    if (methods.getAll) {
      it(`getAll fetches ${basePath}`, async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse([]));
        await methods.getAll();
        expect(mockFetch).toHaveBeenCalledWith(`/api${basePath}`, expect.anything());
      });
    }
    if (methods.create) {
      it(`create sends POST to ${basePath}`, async () => {
        mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
        await methods.create({ name: "test" } as any);
        expect(mockFetch).toHaveBeenCalledWith(
          `/api${basePath}`,
          expect.objectContaining({ method: "POST" })
        );
      });
    }
    if (methods.delete) {
      it(`delete sends DELETE to ${basePath}/id`, async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
        await methods.delete(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api${basePath}`),
          expect.objectContaining({ method: "DELETE" })
        );
      });
    }
  });
}

testCrud("notes", () => api.notes, "/notes");
testCrud("courses", () => api.courses as any, "/courses");
testCrud("proposals", () => api.proposals, "/proposals");
testCrud("academicDeadlines", () => api.academicDeadlines as any, "/academic-deadlines");

describe("api.scheduleEvents", () => {
  it("getByCourse fetches with courseId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scheduleEvents.getByCourse(5);
    expect(mockFetch).toHaveBeenCalledWith("/api/schedule-events?courseId=5", expect.anything());
  });

  it("createBulk sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scheduleEvents.createBulk(1, []);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/schedule-events/bulk",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deleteMany sends POST to bulk-delete", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: 3 }));
    await api.scheduleEvents.deleteMany([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/schedule-events/bulk-delete",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.learningObjectives", () => {
  it("getByCourse fetches with courseId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.learningObjectives.getByCourse(2);
    expect(mockFetch).toHaveBeenCalledWith("/api/learning-objectives?courseId=2", expect.anything());
  });

  it("getByModule fetches with moduleId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.learningObjectives.getByModule(7);
    expect(mockFetch).toHaveBeenCalledWith("/api/learning-objectives?moduleId=7", expect.anything());
  });

  it("createBulk sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.learningObjectives.createBulk(1, null, []);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/learning-objectives/bulk",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.googleTasks", () => {
  it("getLists fetches /google-tasks/lists", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.googleTasks.getLists();
    expect(mockFetch).toHaveBeenCalledWith("/api/google-tasks/lists", expect.anything());
  });

  it("create sends POST with encoded listId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "t1" }));
    await api.googleTasks.create("list-1", { title: "Study" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/google-tasks/list-1",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("move sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "t1" }));
    await api.googleTasks.move("t1", "list-1", "list-2");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/move"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.planner", () => {
  it("getQueue fetches /planner/queue", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.planner.getQueue();
    expect(mockFetch).toHaveBeenCalledWith("/api/planner/queue", expect.anything());
  });

  it("generate sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, tasks_created: 5 }));
    const res = await api.planner.generate();
    expect(res.tasks_created).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/planner/generate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("updateTask sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await api.planner.updateTask(1, { status: "completed" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/planner/tasks/1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("updateSettings sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await api.planner.updateSettings({ calendar_source: "google" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/planner/settings",
      expect.objectContaining({ method: "PUT" })
    );
  });
});

describe("api.brain", () => {
  it("getMetrics fetches /brain/metrics", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ totalMinutes: 100 }));
    const res = await api.brain.getMetrics();
    expect(res.totalMinutes).toBe(100);
  });

  it("chat sends POST with string message", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ response: "ok", isStub: false }));
    await api.brain.chat("Hello");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/brain/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"message":"Hello"'),
      })
    );
  });

  it("chat sends POST with payload object", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ response: "ok", isStub: false }));
    await api.brain.chat({ message: "Test", syncToObsidian: true, mode: "cards" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/brain/chat",
      expect.objectContaining({
        body: expect.stringContaining('"syncToObsidian":true'),
      })
    );
  });

  it("ingest sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: "ok", parsed: true, isStub: false }));
    await api.brain.ingest("notes content", "notes.md");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/brain/ingest",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.scholar", () => {
  it("getQuestions fetches /scholar/questions", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scholar.getQuestions();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/questions", expect.anything());
  });

  it("chat sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ response: "hi", sessionCount: 1, isStub: false }));
    await api.scholar.chat("test");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/scholar/chat",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("run sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.scholar.run();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/scholar/run",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("runHistory fetches with limit", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scholar.runHistory(5);
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/run/history?limit=5", expect.anything());
  });
});

describe("api.methods", () => {
  it("getAll fetches /methods", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.methods.getAll();
    expect(mockFetch).toHaveBeenCalledWith("/api/methods", expect.anything());
  });

  it("getAll with category filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.methods.getAll("retrieve");
    expect(mockFetch).toHaveBeenCalledWith("/api/methods?category=retrieve", expect.anything());
  });

  it("rate sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, rated: true }));
    await api.methods.rate(1, { effectiveness: 5, engagement: 4 });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/methods/1/rate",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("analytics fetches /methods/analytics", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ block_stats: [], chain_stats: [], recent_ratings: [] }));
    await api.methods.analytics();
    expect(mockFetch).toHaveBeenCalledWith("/api/methods/analytics", expect.anything());
  });
});

describe("api.chains", () => {
  it("getAll fetches /chains", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.chains.getAll();
    expect(mockFetch).toHaveBeenCalledWith("/api/chains", expect.anything());
  });

  it("getAll with template filter", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.chains.getAll(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains?template=1", expect.anything());
  });

  it("rate sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, rated: true }));
    await api.chains.rate(1, { effectiveness: 3, engagement: 4 });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chains/1/rate",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.anki", () => {
  it("getStatus fetches /anki/status", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ connected: true }));
    await api.anki.getStatus();
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/status", expect.anything());
  });

  it("sync sends POST and returns result", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, synced: 5 }));
    const res = await api.anki.sync();
    expect(res.success).toBe(true);
  });

  it("sync throws on failure", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: false, error: "No connection" }));
    await expect(api.anki.sync()).rejects.toThrow("No connection");
  });

  it("approveDraft sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.anki.approveDraft(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/anki/drafts/1/approve",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.obsidian", () => {
  it("getStatus fetches /obsidian/status", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ connected: true }));
    await api.obsidian.getStatus();
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/status", expect.anything());
  });

  it("getVaultIndex with refresh", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ files: [] }));
    await api.obsidian.getVaultIndex(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/vault-index?refresh=true", expect.anything());
  });

  it("append sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.obsidian.append("notes/test.md", "content");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/obsidian/append",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("saveFile sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.obsidian.saveFile("test.md", "content");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/obsidian/file",
      expect.objectContaining({ method: "PUT" })
    );
  });
});

describe("api.tutor", () => {
  it("createSession sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ session_id: "tutor-123" }));
    await api.tutor.createSession({ mode: "first_pass", topic: "ATP" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/session",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("endSession sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ended: true }));
    await api.tutor.endSession("tutor-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/session/tutor-123/end",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("listSessions builds query string", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.listSessions({ course_id: 1, status: "active", limit: 5 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("course_id=1");
    expect(url).toContain("status=active");
    expect(url).toContain("limit=5");
  });

  it("listSessions without params", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.listSessions();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/sessions", expect.anything());
  });

  it("getContentSources fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.getContentSources();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/content-sources", expect.anything());
  });

  it("triggerEmbed sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.triggerEmbed({ course_id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/embed",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("getMaterials builds query string", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.getMaterials({ course_id: 2, enabled: true });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("course_id=2");
    expect(url).toContain("enabled=1");
  });

  it("uploadMaterial sends FormData via fetch", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) });
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    await api.tutor.uploadMaterial(file, { course_id: 3 });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/materials/upload",
      expect.objectContaining({ method: "POST" })
    );
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.get("file")).toBeTruthy();
    expect(formData.get("course_id")).toBe("3");
  });

  it("uploadMaterial throws on failure", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, statusText: "Bad Request" });
    const file = new File([""], "bad.pdf");
    await expect(api.tutor.uploadMaterial(file)).rejects.toThrow("Upload failed");
  });
});

describe("api.data", () => {
  it("getTables fetches /data/tables", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(["sessions", "cards"]));
    const res = await api.data.getTables();
    expect(res).toEqual(["sessions", "cards"]);
  });

  it("getRows fetches with limit and offset", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ rows: [], total: 0 }));
    await api.data.getRows("sessions", 50, 10);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/data/tables/${encodeURIComponent("sessions")}/rows?limit=50&offset=10`,
      expect.anything()
    );
  });

  it("updateRow sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ updated: true, rowid: 1 }));
    await api.data.updateRow("sessions", 1, { topic: "ATP" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/rows/1"),
      expect.objectContaining({ method: "PATCH" })
    );
  });
});

describe("api.chainRun", () => {
  it("start sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ run_id: 1, status: "running" }));
    await api.chainRun.start({ chain_id: 1, topic: "ATP" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chain-run",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("getHistory fetches /chain-run/history", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.chainRun.getHistory();
    expect(mockFetch).toHaveBeenCalledWith("/api/chain-run/history", expect.anything());
  });
});

describe("api.studyWheel", () => {
  it("getCurrentCourse fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ currentCourse: null }));
    await api.studyWheel.getCurrentCourse();
    expect(mockFetch).toHaveBeenCalledWith("/api/study-wheel/current", expect.anything());
  });

  it("completeSession sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ session: {}, nextCourse: null }));
    await api.studyWheel.completeSession(1, 30, "brain");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/study-wheel/complete-session",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.streak", () => {
  it("get fetches /streak", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ currentStreak: 5, longestStreak: 10, lastStudyDate: "2026-02-17" }));
    const res = await api.streak.get();
    expect(res.currentStreak).toBe(5);
  });
});

describe("api.syllabus", () => {
  it("importBulk sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ modulesCreated: 2, eventsCreated: 3, classMeetingsExpanded: 1 }));
    await api.syllabus.importBulk(1, { weeks: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/syllabus/import-bulk",
      expect.objectContaining({ method: "POST" })
    );
  });
});

// Batch-cover remaining simple getters
describe("api remaining getters", () => {
  it("loSessions.create sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.loSessions.create({ loId: 1, sessionId: 1 } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/lo-sessions", expect.objectContaining({ method: "POST" }));
  });

  it("sessionContext.getLast fetches without course", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ lastSession: null, course: null, recentLos: [] }));
    await api.sessionContext.getLast();
    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/last-context", expect.anything());
  });

  it("sessionContext.getLast fetches with courseId", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ lastSession: null, course: null, recentLos: [] }));
    await api.sessionContext.getLast(5);
    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/last-context?courseId=5", expect.anything());
  });

  it("calendar.assistant sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ response: "ok", success: true }));
    await api.calendar.assistant("schedule study");
    expect(mockFetch).toHaveBeenCalledWith("/api/calendar/assistant", expect.objectContaining({ method: "POST" }));
  });

  it("weaknessQueue.get fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.weaknessQueue.get();
    expect(mockFetch).toHaveBeenCalledWith("/api/weakness-queue", expect.anything());
  });

  it("todaySessions.get fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.todaySessions.get();
    expect(mockFetch).toHaveBeenCalledWith("/api/sessions/today", expect.anything());
  });

  it("events.update sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.events.update(1, { title: "Updated" } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/events/1", expect.objectContaining({ method: "PATCH" }));
  });

  it("events.delete sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.events.delete(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/events/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("notes.reorder sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.notes.reorder([{ id: 1, position: 0 }]);
    expect(mockFetch).toHaveBeenCalledWith("/api/notes/reorder", expect.objectContaining({ method: "POST" }));
  });

  it("courses.getActive fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.courses.getActive();
    expect(mockFetch).toHaveBeenCalledWith("/api/courses/active", expect.anything());
  });

  it("google.getAuthUrl fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ authUrl: "https://example.com" }));
    const res = await api.google.getAuthUrl();
    expect(res.authUrl).toBe("https://example.com");
  });
});

describe("api.scholar extended", () => {
  it("getFindings fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scholar.getFindings();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/findings", expect.anything());
  });

  it("getTutorAudit fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.scholar.getTutorAudit();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/tutor-audit", expect.anything());
  });

  it("getClusters fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.scholar.getClusters();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/clusters", expect.anything());
  });

  it("runClustering sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.scholar.runClustering();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/clusters", expect.objectContaining({ method: "POST" }));
  });

  it("runStatus fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.scholar.runStatus();
    expect(mockFetch).toHaveBeenCalledWith("/api/scholar/run/status", expect.anything());
  });
});

describe("api.anki extended", () => {
  it("getDecks fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.anki.getDecks();
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/decks", expect.anything());
  });

  it("getDue fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.anki.getDue();
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/due", expect.anything());
  });

  it("getDrafts fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.anki.getDrafts();
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/drafts", expect.anything());
  });

  it("deleteDraft sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.anki.deleteDraft(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/drafts/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("updateDraft sends PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));
    await api.anki.updateDraft(1, { front: "Q?" });
    expect(mockFetch).toHaveBeenCalledWith("/api/anki/drafts/1", expect.objectContaining({ method: "PATCH" }));
  });
});

describe("api.obsidian extended", () => {
  it("getConfig fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.obsidian.getConfig();
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/config", expect.anything());
  });

  it("getGraph fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.obsidian.getGraph();
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/graph", expect.anything());
  });

  it("getGraph with refresh", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.obsidian.getGraph(true);
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/graph?refresh=true", expect.anything());
  });

  it("getFiles without folder", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.obsidian.getFiles();
    expect(mockFetch).toHaveBeenCalledWith("/api/obsidian/files", expect.anything());
  });

  it("getFiles with folder", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.obsidian.getFiles("School");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("folder=School"), expect.anything());
  });

  it("getFile fetches by path", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ content: "# Test" }));
    await api.obsidian.getFile("notes/test.md");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("path=notes"),
      expect.anything()
    );
  });
});

describe("api.methods extended", () => {
  it("getOne fetches by id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.methods.getOne(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/methods/1", expect.anything());
  });

  it("create sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: "test" }));
    await api.methods.create({ name: "test", category: "retrieve" } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/methods", expect.objectContaining({ method: "POST" }));
  });

  it("update sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, updated: true }));
    await api.methods.update(1, { name: "updated" } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/methods/1", expect.objectContaining({ method: "PUT" }));
  });

  it("delete sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.methods.delete(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/methods/1", expect.objectContaining({ method: "DELETE" }));
  });
});

describe("api.chains extended", () => {
  it("getOne fetches by id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, blocks: [] }));
    await api.chains.getOne(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains/1", expect.anything());
  });

  it("create sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: "chain" }));
    await api.chains.create({ name: "chain", block_ids: [1, 2] } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains", expect.objectContaining({ method: "POST" }));
  });

  it("update sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, updated: true }));
    await api.chains.update(1, { name: "updated" } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains/1", expect.objectContaining({ method: "PUT" }));
  });

  it("delete sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", json: () => Promise.reject() });
    await api.chains.delete(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains/1", expect.objectContaining({ method: "DELETE" }));
  });
});

describe("api.tutor extended", () => {
  it("getSession fetches by id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.getSession("tutor-123");
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/session/tutor-123", expect.anything());
  });

  it("deleteSession sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }));
    await api.tutor.deleteSession("tutor-123");
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/session/tutor-123", expect.objectContaining({ method: "DELETE" }));
  });

  it("createArtifact sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.createArtifact("tutor-123", { type: "card" } as any);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/session/tutor-123/artifact",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deleteArtifacts sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: 1 }));
    await api.tutor.deleteArtifacts("tutor-123", [0, 1]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/session/tutor-123/artifacts",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("createChain sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await api.tutor.createChain({ session_ids: ["a"] } as any);
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/chain", expect.objectContaining({ method: "POST" }));
  });

  it("getChain fetches by id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.getChain(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/chain/1", expect.anything());
  });

  it("syncMaterialsFolder sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.syncMaterialsFolder({ folder_path: "/School" });
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials/sync", expect.objectContaining({ method: "POST" }));
  });

  it("getSyncMaterialsStatus fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.getSyncMaterialsStatus("job-1");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/sync/status/job-1"), expect.anything());
  });

  it("updateMaterial sends PUT", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.updateMaterial(1, { title: "Updated" });
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials/1", expect.objectContaining({ method: "PUT" }));
  });

  it("deleteMaterial sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }));
    await api.tutor.deleteMaterial(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("autoLinkMaterials sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.autoLinkMaterials();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials/auto-link", expect.objectContaining({ method: "POST" }));
  });

  it("getTemplateChains fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.getTemplateChains();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/chains/templates", expect.anything());
  });

  it("advanceBlock sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.advanceBlock("tutor-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tutor/session/tutor-123/advance-block",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("configCheck fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.configCheck();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/config/check", expect.anything());
  });

  it("embedStatus fetches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.embedStatus();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/embed/status", expect.anything());
  });

  it("createCustomChain sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: "Custom Chain" }));
    await api.tutor.createCustomChain([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledWith("/api/chains", expect.objectContaining({ method: "POST" }));
  });

  it("getMethodBlocks fetches /methods", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.getMethodBlocks();
    expect(mockFetch).toHaveBeenCalledWith("/api/methods", expect.anything());
  });

  it("startSyncMaterialsFolder sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.tutor.startSyncMaterialsFolder({ folder_path: "/School" });
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials/sync/start", expect.objectContaining({ method: "POST" }));
  });

  it("getMaterials without params", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.tutor.getMaterials();
    expect(mockFetch).toHaveBeenCalledWith("/api/tutor/materials", expect.anything());
  });
});

describe("api.data extended", () => {
  it("getSchema fetches by table name", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await api.data.getSchema("sessions");
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/data/tables/sessions"), expect.anything());
  });

  it("deleteRow sends DELETE", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true, rowid: 1 }));
    await api.data.deleteRow("sessions", 1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/rows/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("deleteRows sends POST to bulk-delete", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: 2 }));
    await api.data.deleteRows("sessions", [1, 2]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/rows/bulk-delete"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.brain extended", () => {
  it("organizePreview sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ clusters: [] }));
    await api.brain.organizePreview("raw notes", "Anatomy");
    expect(mockFetch).toHaveBeenCalledWith("/api/brain/organize-preview", expect.objectContaining({ method: "POST" }));
  });

  it("ingestSessionJson sends POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ session_id: 1, fields_updated: 3 }));
    await api.brain.ingestSessionJson(1, { tracker: "data" });
    expect(mockFetch).toHaveBeenCalledWith("/api/brain/session-json", expect.objectContaining({ method: "POST" }));
  });
});
