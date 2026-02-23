import type {
  Session, InsertSession,
  CalendarEvent, InsertCalendarEvent,
  Task, InsertTask,
  Proposal, InsertProposal,
  ChatMessage, InsertChatMessage,
  Note, InsertNote,
  Course, InsertCourse,
  ScheduleEvent, InsertScheduleEvent,
  Module, InsertModule,
  LearningObjective, InsertLearningObjective,
  LoSession, InsertLoSession
} from "@shared/schema";

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  position?: string;
  listId: string;
  listTitle?: string;
}

export interface PlannerTask {
  id: number;
  course_id?: number | null;
  topic_id?: number | null;
  course_event_id?: number | null;
  scheduled_date?: string | null;
  planned_minutes?: number | null;
  status: "pending" | "in_progress" | "completed" | "deferred" | string;
  actual_session_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  source?: string | null;
  priority?: number | null;
  review_number?: number | null;
  anchor_text?: string | null;
  course_name?: string | null;
}

export interface PlannerTaskCreate {
  course_id?: number | null;
  topic_id?: number | null;
  course_event_id?: number | null;
  scheduled_date?: string | null;
  planned_minutes?: number | null;
  status?: "pending" | "in_progress" | "completed" | "deferred";
  actual_session_id?: number | null;
  notes?: string | null;
  source?: string | null;
  priority?: number | null;
  review_number?: number | null;
  anchor_text?: string | null;
}

export type PlannerTaskUpdate = Partial<
  Pick<PlannerTask, "status" | "scheduled_date" | "planned_minutes" | "notes" | "actual_session_id">
>;

export interface SyllabusImportResult {
  modulesCreated: number;
  eventsCreated: number;
  classMeetingsExpanded: number;
  errors?: string[];
}

const API_BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await response.json() as { error?: string; message?: string; detail?: string };
        detail = String(body.error || body.message || body.detail || "").trim();
      } else {
        const text = (await response.text()).trim();
        if (text) detail = text.slice(0, 500);
      }
    } catch {
      // Fall back to status text when body parsing fails.
    }
    const suffix = detail || response.statusText || "Request failed";
    throw new Error(`API ${response.status}: ${suffix}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Legacy helper for components that use apiRequest
export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return request<T>(url, options);
}

export const api = {
  sessions: {
    getAll: () => request<Session[]>("/sessions"),
    getStats: () => request<{ total: number; avgErrors: number; totalCards: number }>("/sessions/stats"),
    getOne: (id: number) => request<Session>(`/sessions/${id}`),
    create: (data: InsertSession) => request<Session>("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertSession>) => request<Session>(`/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/sessions/${id}`, {
      method: "DELETE",
    }),
    deleteMany: (ids: number[]) => request<{ deleted: number }>("/sessions/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  },

  events: {
    getAll: () => request<CalendarEvent[]>("/events"),
    getOne: (id: number) => request<CalendarEvent>(`/events/${id}`),
    create: (data: InsertCalendarEvent) => request<CalendarEvent>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertCalendarEvent>) => request<CalendarEvent>(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/events/${id}`, {
      method: "DELETE",
    }),
  },

  scheduleEvents: {
    getByCourse: (courseId: number) =>
      request<ScheduleEvent[]>(`/schedule-events?courseId=${courseId}`),
    create: (data: InsertScheduleEvent) => request<ScheduleEvent>("/schedule-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    createBulk: (courseId: number, events: Omit<InsertScheduleEvent, "courseId">[]) =>
      request<ScheduleEvent[]>("/schedule-events/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, events }),
      }),
    update: (id: number, data: Partial<InsertScheduleEvent>) => request<ScheduleEvent>(`/schedule-events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/schedule-events/${id}`, {
      method: "DELETE",
    }),
    deleteMany: (ids: number[]) => request<{ deleted: number }>("/schedule-events/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  },

  syllabus: {
    importBulk: (courseId: number, payload: Record<string, unknown>) =>
      request<SyllabusImportResult>("/syllabus/import-bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, ...payload }),
      }),
  },

  modules: {
    getByCourse: (courseId: number) =>
      request<Module[]>(`/modules?courseId=${courseId}`),
    getOne: (id: number) => request<Module>(`/modules/${id}`),
    create: (data: InsertModule) => request<Module>("/modules", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    createBulk: (courseId: number, modules: Omit<InsertModule, "courseId">[]) =>
      request<Module[]>("/modules/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, modules }),
      }),
    update: (id: number, data: Partial<InsertModule>) => request<Module>(`/modules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/modules/${id}`, {
      method: "DELETE",
    }),
    deleteMany: (ids: number[]) => request<{ deleted: number }>("/modules/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  },

  learningObjectives: {
    getByCourse: (courseId: number) =>
      request<LearningObjective[]>(`/learning-objectives?courseId=${courseId}`),
    getByModule: (moduleId: number) =>
      request<LearningObjective[]>(`/learning-objectives?moduleId=${moduleId}`),
    getOne: (id: number) => request<LearningObjective>(`/learning-objectives/${id}`),
    create: (data: InsertLearningObjective) => request<LearningObjective>("/learning-objectives", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    createBulk: (courseId: number, moduleId: number | null, los: Omit<InsertLearningObjective, "courseId" | "moduleId">[]) =>
      request<LearningObjective[]>("/learning-objectives/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, moduleId, los }),
      }),
    update: (id: number, data: Partial<InsertLearningObjective>) => request<LearningObjective>(`/learning-objectives/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/learning-objectives/${id}`, {
      method: "DELETE",
    }),
  },

  loSessions: {
    create: (data: InsertLoSession) =>
      request<LoSession>("/lo-sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  sessionContext: {
    getLast: (courseId?: number) =>
      request<{
        lastSession: Session | null;
        course: Course | null;
        recentLos: LearningObjective[];
      }>(courseId ? `/sessions/last-context?courseId=${courseId}` : "/sessions/last-context"),
  },

  tasks: {
    getAll: () => request<Task[]>("/tasks"),
    getOne: (id: number) => request<Task>(`/tasks/${id}`),
    create: (data: InsertTask) => request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertTask>) => request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/tasks/${id}`, {
      method: "DELETE",
    }),
  },

  proposals: {
    getAll: () => request<Proposal[]>("/proposals"),
    getOne: (id: number) => request<Proposal>(`/proposals/${id}`),
    create: (data: InsertProposal) => request<Proposal>("/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertProposal>) => request<Proposal>(`/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/proposals/${id}`, {
      method: "DELETE",
    }),
  },

  chat: {
    getMessages: (sessionId: string) => request<ChatMessage[]>(`/chat/${sessionId}`),
    sendMessage: (sessionId: string, data: Omit<InsertChatMessage, "sessionId">) =>
      request<ChatMessage>(`/chat/${sessionId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  google: {
    getStatus: () => request<{ configured: boolean; connected: boolean; hasClientId: boolean; hasClientSecret: boolean }>("/google/status"),
    getAuthUrl: () => request<{ authUrl: string }>("/google/auth"),
    disconnect: () => request<{ success: boolean }>("/google/disconnect", { method: "POST" }),
  },

  calendar: {
    assistant: (message: string) => request<{
      response: string;
      success: boolean;
      error?: string;
    }>("/calendar/assistant", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  },

  googleTasks: {
    getLists: () => request<{ id: string; title: string }[]>("/google-tasks/lists"),
    getAll: () => request<GoogleTask[]>("/google-tasks"),
    create: (listId: string, data: { title: string; status?: string; notes?: string; due?: string }) =>
      request<GoogleTask>(`/google-tasks/${encodeURIComponent(listId)}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (taskId: string, listId: string, data: Partial<{ title: string; status: string; notes: string; due: string }>) =>
      request<GoogleTask>(`/google-tasks/${encodeURIComponent(listId)}/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (taskId: string, listId: string) =>
      request<void>(`/google-tasks/${encodeURIComponent(listId)}/${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      }),
    move: (taskId: string, listId: string, destListId: string, previous?: string, parent?: string) =>
      request<GoogleTask>(`/google-tasks/${encodeURIComponent(listId)}/${encodeURIComponent(taskId)}/move`, {
        method: "POST",
        body: JSON.stringify({ destListId, previous, parent }),
      }),
  },

  notes: {
    getAll: () => request<Note[]>("/notes"),
    create: (data: InsertNote) => request<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertNote>) => request<Note>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/notes/${id}`, {
      method: "DELETE",
    }),
    reorder: (updates: { id: number; position: number }[]) => request<{ success: boolean }>("/notes/reorder", {
      method: "POST",
      body: JSON.stringify({ notes: updates }),
    }),
  },

  courses: {
    getAll: () => request<Course[]>("/courses"),
    getActive: () => request<Course[]>("/courses/active"),
    getOne: (id: number) => request<Course>(`/courses/${id}`),
    create: (data: InsertCourse) => request<Course>("/courses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertCourse>) => request<Course>(`/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/courses/${id}`, {
      method: "DELETE",
    }),
  },

  studyWheel: {
    getCurrentCourse: () => request<{ currentCourse: Course | null }>("/study-wheel/current"),
    completeSession: (courseId: number, minutes: number, mode?: string) =>
      request<{ session: Session; nextCourse: Course | null }>("/study-wheel/complete-session", {
        method: "POST",
        body: JSON.stringify({ courseId, minutes, mode }),
      }),
  },

  streak: {
    get: () => request<{ currentStreak: number; longestStreak: number; lastStudyDate: string | null }>("/streak"),
  },

  weaknessQueue: {
    get: () => request<{ id: number; topic: string; reason: string | null }[]>("/weakness-queue"),
  },

  todaySessions: {
    get: () => request<Session[]>("/sessions/today"),
  },

  planner: {
    getQueue: () => request<PlannerTask[]>("/planner/queue"),
    getSettings: () => request<Record<string, unknown>>("/planner/settings"),
    updateSettings: (data: Record<string, unknown>) =>
      request<{ ok: boolean }>("/planner/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    createTask: (data: PlannerTaskCreate) =>
      request<PlannerTask>("/planner/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generate: () =>
      request<{ ok: boolean; tasks_created: number }>("/planner/generate", {
        method: "POST",
      }),
    updateTask: (taskId: number, data: PlannerTaskUpdate) =>
      request<{ ok: boolean }>(`/planner/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  brain: {
    getMetrics: () => request<{
      sessionsPerCourse: { course: string; count: number; minutes: number }[];
      modeDistribution: { mode: string; count: number; minutes: number }[];
      recentConfusions: { text: string; count: number; course: string }[];
      recentWeakAnchors: { text: string; count: number; course: string }[];
      conceptFrequency: { concept: string; count: number }[];
      issuesLog: { issue: string; count: number; course: string }[];
      totalMinutes: number;
      totalSessions: number;
      totalCards: number;
      averages?: { understanding: number; retention: number };
      staleTopics?: { topic: string; count: number; lastStudied: string; daysSince: number }[];
    }>("/brain/metrics"),
    chat: (
      messageOrPayload: string | BrainChatPayload,
      syncToObsidian: boolean = false,
      mode: string = "all"
    ) => {
      const payload =
        typeof messageOrPayload === "string"
          ? { message: messageOrPayload, syncToObsidian, mode }
          : messageOrPayload;
      return request<{
        response: string;
        isStub: boolean;
        parsed?: boolean;
        wrapProcessed?: boolean;
        cardsCreated?: number;
        obsidianSynced?: boolean;
        obsidianError?: string;
        obsidianPath?: string;
        issuesLogged?: number;
        sessionSaved?: boolean;
        sessionId?: number | null;
        wrapSessionId?: string | null;
        sessionError?: string | null;
      }>("/brain/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    organizePreview: (rawNotes: string, course?: string) =>
      request<BrainOrganizePreviewResponse>("/brain/organize-preview", {
        method: "POST",
        body: JSON.stringify({ rawNotes, ...(course ? { course } : {}) }),
      }),
    ingest: (content: string, filename?: string) => request<{ message: string; parsed: boolean; isStub: boolean }>("/brain/ingest", {
      method: "POST",
      body: JSON.stringify({ content, filename }),
    }),
    ingestSessionJson: (sessionId: number, trackerJson?: Record<string, unknown>, enhancedJson?: Record<string, unknown>) =>
      request<{ session_id: number; fields_updated: number }>("/brain/session-json", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, tracker_json: trackerJson, enhanced_json: enhancedJson }),
      }),
  },

  academicDeadlines: {
    getAll: () => request<AcademicDeadline[]>("/academic-deadlines"),
    create: (data: InsertAcademicDeadline) => request<AcademicDeadline>("/academic-deadlines", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<InsertAcademicDeadline>) => request<AcademicDeadline>(`/academic-deadlines/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/academic-deadlines/${id}`, {
      method: "DELETE",
    }),
    toggleComplete: (id: number) => request<AcademicDeadline>(`/academic-deadlines/${id}/toggle`, {
      method: "POST",
    }),
  },

  scholar: {
    getQuestions: () => request<ScholarQuestion[]>("/scholar/questions"),
    chat: (message: string) => request<ScholarChatResponse>("/scholar/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
    getFindings: () => request<ScholarFinding[]>("/scholar/findings"),
    getTutorAudit: () => request<TutorAuditItem[]>("/scholar/tutor-audit"),
    getClusters: () => request<ScholarClustersResponse>("/scholar/clusters"),
    runClustering: () => request<ScholarClustersResponse>("/scholar/clusters", { method: "POST" }),
    run: () => request<ScholarRunResult>("/scholar/run", { method: "POST" }),
    runStatus: () => request<ScholarRunStatus>("/scholar/run/status"),
    runHistory: (limit = 10) => request<ScholarRunHistoryItem[]>(`/scholar/run/history?limit=${limit}`),
  },

  anki: {
    getStatus: () => request<AnkiStatus>("/anki/status"),
    getDecks: () => request<AnkiDeck[]>("/anki/decks"),
    getDue: () => request<AnkiDueInfo>("/anki/due"),
    getDrafts: () => request<CardDraft[]>("/anki/drafts"),
    sync: async () => {
      const result = await request<AnkiSyncResult>("/anki/sync", { method: "POST" });
      if (!result.success) {
        throw new Error(result.error || "Anki sync failed");
      }
      return result;
    },
    approveDraft: (id: number) => request<{ success: boolean }>(`/anki/drafts/${id}/approve`, {
      method: "POST",
    }),
    deleteDraft: (id: number) => request<void>(`/anki/drafts/${id}`, {
      method: "DELETE",
    }),
    updateDraft: (id: number, data: { front?: string; back?: string; deckName?: string }) =>
      request<{ success: boolean }>(`/anki/drafts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  obsidian: {
    getStatus: () => request<ObsidianStatus>("/obsidian/status"),
    getConfig: () => request<ObsidianConfig>("/obsidian/config"),
    getVaultIndex: (refresh: boolean = false) =>
      request<ObsidianVaultIndexResult>(
        `/obsidian/vault-index${refresh ? "?refresh=true" : ""}`,
      ),
    getGraph: (refresh: boolean = false) =>
      request<ObsidianGraphResult>(`/obsidian/graph${refresh ? "?refresh=true" : ""}`),
    append: (path: string, content: string) => request<ObsidianAppendResult>("/obsidian/append", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),
    getFiles: (folder?: string) => request<ObsidianFilesResult>(`/obsidian/files${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`),
    getFile: (path: string) => request<ObsidianFileResult>(`/obsidian/file?path=${encodeURIComponent(path)}`),
    saveFile: (path: string, content: string) => request<{ success: boolean; path?: string; error?: string }>("/obsidian/file", {
      method: "PUT",
      body: JSON.stringify({ path, content }),
    }),
    deleteFile: (path: string) =>
      request<ObsidianCrudResult>(`/obsidian/file?path=${encodeURIComponent(path)}`, {
        method: "DELETE",
      }),
    createFolder: (path: string) =>
      request<ObsidianCrudResult>("/obsidian/folder", {
        method: "POST",
        body: JSON.stringify({ path }),
      }),
    deleteFolder: (path: string, recursive: boolean = false) =>
      request<ObsidianCrudResult>(
        `/obsidian/folder?path=${encodeURIComponent(path)}&recursive=${recursive ? "1" : "0"}`,
        { method: "DELETE" },
      ),
    movePath: (fromPath: string, toPath: string) =>
      request<ObsidianMoveResult>("/obsidian/move", {
        method: "POST",
        body: JSON.stringify({ from_path: fromPath, to_path: toPath }),
      }),
    renderTemplate: (templateId: string, payload: Record<string, unknown>) =>
      request<ObsidianTemplateRenderResult>("/obsidian/template/render", {
        method: "POST",
        body: JSON.stringify({ template_id: templateId, payload }),
      }),
  },

  methods: {
    getAll: (category?: string) =>
      request<MethodBlock[]>(category ? `/methods?category=${category}` : "/methods"),
    getOne: (id: number) => request<MethodBlock>(`/methods/${id}`),
    create: (data: Omit<MethodBlock, "id" | "created_at">) => request<{ id: number; name: string }>("/methods", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<MethodBlock>) => request<{ id: number; updated: boolean }>(`/methods/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/methods/${id}`, { method: "DELETE" }),
    rate: (id: number, data: { effectiveness: number; engagement: number; session_id?: number; notes?: string; context?: Record<string, unknown> }) =>
      request<{ id: number; rated: boolean }>(`/methods/${id}/rate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    analytics: () => request<MethodAnalyticsResponse>("/methods/analytics"),
  },

  chains: {
    getAll: (template?: boolean) =>
      request<MethodChain[]>(template !== undefined ? `/chains?template=${template ? 1 : 0}` : "/chains"),
    getOne: (id: number) => request<MethodChainExpanded>(`/chains/${id}`),
    create: (data: Omit<MethodChain, "id" | "created_at" | "blocks">) => request<{ id: number; name: string }>("/chains", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<MethodChain>) => request<{ id: number; updated: boolean }>(`/chains/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<void>(`/chains/${id}`, { method: "DELETE" }),
    rate: (id: number, data: { effectiveness: number; engagement: number; session_id?: number; notes?: string; context?: Record<string, unknown> }) =>
      request<{ id: number; rated: boolean }>(`/chains/${id}/rate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  chainRun: {
    start: (data: ChainRunRequest) =>
      request<ChainRunResult>("/chain-run", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getOne: (id: number) => request<ChainRunResult>(`/chain-run/${id}`),
    getHistory: () => request<ChainRunSummary[]>("/chain-run/history"),
  },

  tutor: {
    createSession: (data: TutorCreateSessionRequest) =>
      request<TutorSession>("/tutor/session", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getSession: (sessionId: string) =>
      request<TutorSessionWithTurns>(`/tutor/session/${sessionId}`),
    endSession: (sessionId: string) =>
      request<TutorSessionEndResult>(`/tutor/session/${sessionId}/end`, {
        method: "POST",
      }),
    deleteSession: (sessionId: string) =>
      request<{ deleted: boolean; session_id: string }>(`/tutor/session/${sessionId}`, {
        method: "DELETE",
      }),
    listSessions: (params?: { course_id?: number; status?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.course_id) qs.set("course_id", String(params.course_id));
      if (params?.status) qs.set("status", params.status);
      if (params?.limit) qs.set("limit", String(params.limit));
      const q = qs.toString();
      return request<TutorSessionSummary[]>(`/tutor/sessions${q ? `?${q}` : ""}`);
    },
    createArtifact: (sessionId: string, data: TutorArtifactRequest) =>
      request<TutorArtifactResult>(`/tutor/session/${sessionId}/artifact`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteArtifacts: (sessionId: string, indexes: number[]) =>
      request<{ deleted: number; session_id: string }>(`/tutor/session/${sessionId}/artifacts`, {
        method: "DELETE",
        body: JSON.stringify({ indexes }),
      }),
    getContentSources: () =>
      request<TutorContentSources>("/tutor/content-sources"),
    createChain: (data: TutorChainRequest) =>
      request<TutorChain>("/tutor/chain", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getChain: (chainId: number) =>
      request<TutorChainWithSessions>(`/tutor/chain/${chainId}`),
    triggerEmbed: (data?: { course_id?: number; folder_path?: string }) =>
      request<TutorEmbedResult>("/tutor/embed", {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    syncMaterialsFolder: (payload: { folder_path: string; allowed_exts?: string[] }) =>
      request<TutorSyncStartResult>("/tutor/materials/sync", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    startSyncMaterialsFolder: (payload: { folder_path: string; allowed_exts?: string[] }) =>
      request<TutorSyncStartResult>("/tutor/materials/sync/start", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getSyncMaterialsStatus: (jobId: string) =>
      request<TutorSyncJobStatus>(`/tutor/materials/sync/status/${encodeURIComponent(jobId)}`),
    processVideoMaterial: (
      materialId: number,
      opts?: { model_size?: string; language?: string; keyframe_interval_sec?: number },
    ) =>
      request<TutorVideoProcessStartResult>("/tutor/materials/video/process", {
        method: "POST",
        body: JSON.stringify({ material_id: materialId, ...(opts || {}) }),
      }),
    getVideoProcessStatus: (jobId: string) =>
      request<TutorVideoJobStatus>(`/tutor/materials/video/status/${encodeURIComponent(jobId)}`),
    enrichVideoMaterial: (materialId: number, opts?: { mode?: string }) =>
      request<TutorVideoEnrichResult>("/tutor/materials/video/enrich", {
        method: "POST",
        body: JSON.stringify({ material_id: materialId, ...(opts || {}) }),
      }),
    uploadMaterial: async (file: File, opts?: { course_id?: number; title?: string; tags?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (opts?.course_id) form.append("course_id", String(opts.course_id));
      if (opts?.title) form.append("title", opts.title);
      if (opts?.tags) form.append("tags", opts.tags);
      const res = await fetch(`${API_BASE}/tutor/materials/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      return res.json() as Promise<MaterialUploadResponse>;
    },
    getMaterials: (params?: { course_id?: number; file_type?: string; enabled?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.course_id) qs.set("course_id", String(params.course_id));
      if (params?.file_type) qs.set("file_type", params.file_type);
      if (params?.enabled !== undefined) qs.set("enabled", params.enabled ? "1" : "0");
      const q = qs.toString();
      return request<Material[]>(`/tutor/materials${q ? `?${q}` : ""}`);
    },
    updateMaterial: (id: number, data: Partial<{ title: string; course_id: number | null; tags: string; enabled: boolean }>) =>
      request<Material>(`/tutor/materials/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteMaterial: (id: number) =>
      request<{ deleted: boolean }>(`/tutor/materials/${id}`, { method: "DELETE" }),
    reextractMaterial: (id: number) =>
      request<{ ok: boolean; id: number; has_docling_assets: boolean; docling_asset_count: number }>(
        `/tutor/materials/${id}/reextract`,
        { method: "POST" },
      ),
    getMaterialContent: (id: number) =>
      request<MaterialContent>(`/tutor/materials/${id}/content`),
    autoLinkMaterials: () =>
      request<AutoLinkResult>("/tutor/materials/auto-link", { method: "POST" }),
    getTemplateChains: () =>
      request<TutorTemplateChain[]>("/tutor/chains/templates"),
    advanceBlock: (sessionId: string) =>
      request<TutorBlockProgress>(`/tutor/session/${sessionId}/advance-block`, {
        method: "POST",
      }),
    getMethodBlocks: () =>
      request<MethodBlock[]>("/methods"),
    configCheck: () =>
      request<TutorConfigCheck>("/tutor/config/check"),
    embedStatus: () =>
      request<TutorEmbedStatus>("/tutor/embed/status"),
    createCustomChain: (blockIds: number[], name?: string) =>
      request<{ id: number; name: string }>("/chains", {
        method: "POST",
        body: JSON.stringify({
          name: name || "Custom Chain",
          block_ids: blockIds,
          is_template: 0,
          context_tags: {},
        }),
      }),
    getSettings: () =>
      request<{ custom_instructions: string }>("/tutor/settings"),
    saveSettings: (data: { custom_instructions: string }) =>
      request<{ custom_instructions: string }>("/tutor/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  mastery: {
    getDashboard: () => request<MasteryDashboardResponse>("/mastery/dashboard"),
    getSkill: (id: string) => request<MasteryDetailResponse>(`/mastery/${encodeURIComponent(id)}`),
    getWhyLocked: (id: string) => request<WhyLockedResponse>(`/mastery/${encodeURIComponent(id)}/why-locked`),
    recordEvent: (data: { skill_id: string; correct: boolean; session_id?: string }) =>
      request<{ skill_id: string; correct: boolean; new_mastery: number; event_id: number }>(
        "/mastery/event", { method: "POST", body: JSON.stringify(data) }),
  },

  data: {
    getTables: () => request<string[]>("/data/tables"),
    getSchema: (table: string) => request<DataTableSchema>(`/data/tables/${encodeURIComponent(table)}`),
    getRows: (table: string, limit = 100, offset = 0) =>
      request<DataRowsResponse>(`/data/tables/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${offset}`),
    updateRow: (table: string, rowid: number, data: Record<string, unknown>) =>
      request<{ updated: boolean; rowid: number }>(`/data/tables/${encodeURIComponent(table)}/rows/${rowid}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    deleteRow: (table: string, rowid: number) =>
      request<{ deleted: boolean; rowid: number }>(`/data/tables/${encodeURIComponent(table)}/rows/${rowid}`, {
        method: "DELETE",
      }),
    deleteRows: (table: string, ids: number[]) =>
      request<{ deleted: number }>(`/data/tables/${encodeURIComponent(table)}/rows/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),
  },
};

// Scholar types
export interface ScholarQuestion {
  id: number;
  question: string;
  context: string;
  dataInsufficient: string;
  researchAttempted: string;
  source: string;
}

export interface ScholarChatResponse {
  response: string;
  sessionCount: number;
  isStub: boolean;
}

export interface ScholarFinding {
  id: number;
  title: string;
  source: string;
  content: string;
  topic?: string;
  summary?: string;
  relevance?: string;
}

export interface TutorAuditItem {
  id: number;
  sessionId: string;
  date: string;
  userMessages: number;
  assistantMessages: number;
  status: string;
  issue?: string;
  frequency?: number;
  courses?: string[];
}

export interface ScholarClusterItem {
  title: string;
  source: string;
}

export interface ScholarCluster {
  cluster_id: number;
  count: number;
  items: ScholarClusterItem[];
}

export interface ScholarClustersResponse {
  clusters: ScholarCluster[];
}

export interface ScholarRunResult {
  ok: boolean;
  run_id?: string;
  error?: string;
}

export interface ScholarRunStatus {
  running: boolean;
  run_id?: string;
  phase?: string;
  progress?: number;
  error?: string;
  started_at?: string;
  finished_at?: string;
}

export interface ScholarRunHistoryItem {
  id: number;
  run_id: string;
  status: string;
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  summary?: string;
}

export interface InsertAcademicDeadline {
  title: string;
  course: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  dueDate: string;
  notes?: string;
}

export interface AcademicDeadline extends InsertAcademicDeadline {
  id: number;
  completed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Anki types
export interface AnkiStatus {
  connected: boolean;
  version?: number;
  decks?: string[];
  reviewedToday?: number;
  error?: string;
}

export interface AnkiDeck {
  id: number;
  name: string;
  cardCount: number;
}

export interface AnkiDueInfo {
  dueCount: number;
  cardIds: number[];
}

export interface CardDraft {
  id: number;
  sessionId: string;
  deckName: string;
  cardType: string;
  front: string;
  back: string;
  tags: string;
  status: string;
  createdAt: string;
}

export interface AnkiSyncResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Obsidian types
export interface ObsidianStatus {
  connected: boolean;
  status: 'online' | 'offline' | 'error';
  error?: string;
}

export interface ObsidianConfig {
  vaultName: string;
  apiUrl: string;
}

export interface ObsidianAppendResult {
  success: boolean;
  path?: string;
  bytes?: number;
  error?: string;
}

export interface ObsidianFile {
  path: string;
  name: string;
  type: 'file' | 'folder';
}

export interface ObsidianFilesResult {
  success: boolean;
  files?: string[];
  error?: string;
}

export interface ObsidianFileResult {
  success: boolean;
  content?: string;
  path?: string;
  error?: string;
}

export interface ObsidianCrudResult {
  success: boolean;
  path?: string;
  created?: boolean;
  deleted?: boolean;
  error?: string;
}

export interface ObsidianMoveResult {
  success: boolean;
  from_path?: string;
  to_path?: string;
  moved?: boolean;
  error?: string;
}

export interface ObsidianTemplateRenderResult {
  success: boolean;
  template_id?: string;
  content?: string;
  error?: string;
}

export interface ObsidianVaultIndexResult {
  success: boolean;
  notes: string[];
  paths: Record<string, string>;
  count: number;
  cached?: boolean;
  timestamp?: string;
  error?: string;
}

export interface ObsidianGraphNode {
  id: string;
  name: string;
  folder: string;
}

export interface ObsidianGraphLink {
  source: string;
  target: string;
}

export interface ObsidianGraphResult {
  success: boolean;
  nodes: ObsidianGraphNode[];
  links: ObsidianGraphLink[];
  cached?: boolean;
  error?: string;
}

// Brain ingest types
export interface BrainChatPayload {
  message: string;
  syncToObsidian?: boolean;
  mode?: string;
  destinationPath?: string;
  organizedMarkdown?: string;
  organizedTitle?: string;
  confirmWrite?: boolean;
}

export interface BrainDestinationOption {
  id: string;
  label: string;
  path: string;
  kind: "recommended" | "session" | "new" | "existing" | "custom";
  exists: boolean;
}

export interface BrainOrganizePreviewResponse {
  success: boolean;
  error?: string;
  organized?: {
    title: string;
    markdown: string;
    checklist: string[];
    suggested_links: string[];
  };
  destination?: {
    recommended_path: string;
    recommended_label: string;
    session_path?: string;
    module_path?: string | null;
    options: BrainDestinationOption[];
  };
  course?: string;
  courseFolder?: string | null;
}

// Method Library types
// Control Plane (CP-MSS v1.0) categories + Legacy PEIRRO for backward compatibility
export type MethodCategory =
  // Control Plane Stages (New)
  | "PRIME" | "CALIBRATE" | "ENCODE" | "REFERENCE" | "RETRIEVE" | "OVERLEARN"
  // Legacy PEIRRO (Backward compatibility)
  | "prepare" | "encode" | "interrogate" | "retrieve" | "refine" | "overlearn";

export const CATEGORY_LABELS: Record<MethodCategory, string> = {
  // Control Plane
  PRIME: "PRIME",
  CALIBRATE: "CALIBRATE",
  ENCODE: "ENCODE",
  REFERENCE: "REFERENCE",
  RETRIEVE: "RETRIEVE",
  OVERLEARN: "OVERLEARN",
  // Legacy
  prepare: "Prepare",
  encode: "Encode",
  interrogate: "Interrogate",
  retrieve: "Retrieve",
  refine: "Refine",
  overlearn: "Overlearn",
};

export const CATEGORY_COLORS: Record<MethodCategory, string> = {
  // Control Plane Colors
  PRIME: "#3b82f6",        // Blue - Structure
  CALIBRATE: "#f59e0b",    // Yellow - Diagnostic
  ENCODE: "#10b981",       // Green - Growth
  REFERENCE: "#8b5cf6",    // Purple - Indexing
  RETRIEVE: "#ef4444",     // Red - Active
  OVERLEARN: "#ec4899",    // Pink - Mastery
  // Legacy Colors (mapped to similar CP colors)
  prepare: "#3b82f6",
  encode: "#10b981",
  interrogate: "#8b5cf6",
  retrieve: "#ef4444",
  refine: "#ec4899",
  overlearn: "#ec4899",
};

export interface MethodBlock {
  id: number;
  name: string;
  control_stage?: string | null;      // Control Plane stage (PRIME, CALIBRATE, etc.)
  category: MethodCategory | string;   // Legacy category (for backward compatibility)
  description: string | null;
  default_duration_min: number;
  energy_cost: string;
  best_stage: string | null;
  tags: string[];
  evidence: string | null;
  facilitation_prompt?: string | null;
  knobs?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  has_active_knobs?: boolean;
  created_at: string;
}

export interface MethodChain {
  id: number;
  name: string;
  description: string | null;
  block_ids: number[];
  context_tags: Record<string, unknown>;
  created_at: string;
  is_template: number;
}

export interface MethodChainExpanded extends MethodChain {
  blocks: MethodBlock[];
}

export interface MethodAnalyticsResponse {
  block_stats: {
    id: number;
    name: string;
    control_stage?: string | null;
    category: string;
    usage_count: number;
    avg_effectiveness: number | null;
    avg_engagement: number | null;
  }[];
  chain_stats: {
    id: number;
    name: string;
    is_template: number;
    usage_count: number;
    avg_effectiveness: number | null;
    avg_engagement: number | null;
  }[];
  recent_ratings: {
    id: number;
    method_block_id: number | null;
    chain_id: number | null;
    effectiveness: number;
    engagement: number;
    notes: string | null;
    context: Record<string, unknown>;
    rated_at: string;
    method_name: string | null;
    chain_name: string | null;
  }[];
}

// Chain Runner types
export interface ChainRunRequest {
  chain_id: number;
  topic: string;
  course_id?: number;
  source_doc_ids?: number[];
  options?: {
    write_obsidian?: boolean;
    draft_cards?: boolean;
  };
}

export interface ChainRunStep {
  step: number;
  method_name: string;
  category: string;
  output: string;
  duration_ms: number;
}

export interface ChainRunResult {
  run_id: number;
  chain_name: string;
  status: "completed" | "failed" | "running";
  steps: ChainRunStep[];
  artifacts: {
    session_id: number;
    obsidian_path?: string | null;
    card_draft_ids?: number[];
    metrics: {
      total_duration_ms: number;
      steps_completed: number;
      cards_drafted: number;
    };
  } | null;
  error?: string;
}

export interface ChainRunSummary {
  id: number;
  chain_id: number;
  chain_name: string;
  topic: string;
  status: string;
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at: string | null;
}

// Adaptive Tutor types
export type TutorPhase = "first_pass" | "understanding" | "testing";
export type TutorMode =
  | "Core"
  | "Sprint"
  | "Quick Sprint"
  | "Light"
  | "Drill"
  | "Diagnostic Sprint"
  | "Teaching Sprint";
export type TutorAccuracyProfile = "balanced" | "strict" | "coverage";
export type TutorObjectiveScope = "module_all" | "single_focus";
export type BehaviorOverride = "socratic" | "evaluate" | "concept_map" | "teach_back";
export type TutorSessionStatus = "active" | "completed" | "abandoned";

export interface TutorCreateSessionRequest {
  course_id?: number;
  phase?: TutorPhase;
  mode?: TutorMode;
  topic?: string;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string;
  north_star_refresh?: boolean;
  content_filter?: {
    material_ids?: number[];
    model?: string;
    folders?: string[];
    web_search?: boolean;
    accuracy_profile?: TutorAccuracyProfile;
    objective_scope?: TutorObjectiveScope;
    focus_objective_id?: string;
    north_star_refresh?: boolean;
  };
  method_chain_id?: number;
}

export interface TutorTemplateChain {
  id: number;
  name: string;
  description: string;
  blocks: { id: number; name: string; control_stage?: string; category: string; description?: string; duration: number; facilitation_prompt?: string }[];
  context_tags: string;
}

export interface TutorMethodBlock {
  id: number;
  name: string;
  category: string;
  description: string | null;
  default_duration_min: number;
  energy_cost: string;
  facilitation_prompt?: string | null;
}

export interface TutorBlockProgress {
  block_index: number;
  block_name: string;
  block_description: string;
  block_category?: string;
  block_duration?: number;
  facilitation_prompt?: string;
  is_last: boolean;
  complete?: boolean;
}

export interface TutorSession {
  session_id: string;
  phase: TutorPhase;
  mode?: TutorMode;
  topic: string;
  status: TutorSessionStatus;
  started_at: string;
  method_chain_id?: number | null;
  current_block_index?: number;
  current_block_name?: string | null;
  objective_scope?: TutorObjectiveScope;
  focus_objective_id?: string | null;
  north_star?: {
    path: string;
    status: string;
    module_name: string;
    course_name?: string;
    subtopic_name?: string;
    objective_ids: string[];
  };
  reference_targets_count?: number;
}

export interface TutorTurn {
  id: number;
  turn_number: number;
  question: string;
  answer: string | null;
  citations_json: TutorCitation[] | string | null;
  phase: string | null;
  artifacts_json: unknown;
  created_at: string;
}

export interface TutorCitation {
  source: string;
  url?: string;
  index: number;
}

export interface TutorSessionWithTurns extends TutorSession {
  id: number;
  brain_session_id: number | null;
  course_id: number | null;
  content_filter_json: string | null;
  content_filter: {
    material_ids?: number[];
    model?: string;
    web_search?: boolean;
    accuracy_profile?: TutorAccuracyProfile;
    objective_scope?: TutorObjectiveScope;
    focus_objective_id?: string;
    reference_targets?: string[];
    follow_up_targets?: string[];
    module_name?: string;
    module_prefix?: string;
    enforce_reference_bounds?: boolean;
    north_star?: {
      path: string;
      status: string;
      module_name: string;
      course_name?: string;
      subtopic_name?: string;
      objective_ids: string[];
    };
  } | null;
  turn_count: number;
  artifacts_json: string | null;
  lo_ids_json: string | null;
  summary_text: string | null;
  ended_at: string | null;
  turns: TutorTurn[];
  chain_blocks?: { id: number; name: string; category: string; description: string; default_duration_min: number; facilitation_prompt?: string; evidence?: string }[];
}

export interface TutorSessionSummary {
  id: number;
  session_id: string;
  course_id: number | null;
  phase: TutorPhase;
  mode?: TutorMode;
  topic: string;
  status: TutorSessionStatus;
  turn_count: number;
  started_at: string;
  ended_at: string | null;
}

export interface TutorSessionEndResult {
  session_id: string;
  status: "completed";
  brain_session_id: number | null;
  ended_at: string;
}

export interface TutorArtifactRequest {
  type: "note" | "card" | "map";
  content: string;
  title?: string;
  front?: string;
  back?: string;
  tags?: string;
}

export interface TutorArtifactResult {
  type: string;
  session_id: string;
  card_id?: number;
  content?: string;
  title?: string;
  mermaid?: string;
  status?: string;
}

export interface TutorContentSources {
  courses: {
    id: number | null;
    name: string;
    code: string | null;
    doc_count: number;
    wheel_linked?: boolean;
    wheel_active?: boolean;
    wheel_position?: number | null;
  }[];
  total_materials: number;
  total_instructions: number;
  total_docs: number;
  openrouter_enabled: boolean;
  buster_enabled?: boolean;
}

export interface TutorChainRequest {
  chain_name?: string;
  course_id?: number;
  topic: string;
  session_ids?: string[];
}

export interface TutorChain {
  id: number;
  chain_name: string | null;
  topic: string;
  session_ids: string[];
}

export interface TutorChainWithSessions extends TutorChain {
  course_id: number | null;
  session_ids_json: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  sessions: TutorSession[];
}

export interface TutorEmbedResult {
  embedded: number;
  skipped: number;
  total_chunks: number;
}

export interface TutorSyncStartResult {
  ok?: boolean;
  job_id: string;
  folder?: string;
}

export interface TutorSyncJobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  folder?: string;
  processed: number;
  total: number;
  index?: number;
  current_file: string | null;
  errors: number;
  last_error?: string | null;
  sync_result?: {
    ok?: boolean;
    total?: number;
    processed?: number;
    failed?: number;
    errors?: string[];
    doc_ids?: number[];
    [key: string]: unknown;
  } | null;
  embed_result?: TutorEmbedResult | { error: string } | null;
  started_at: string;
  finished_at?: string | null;
}

export interface TutorVideoProcessStartResult {
  ok: boolean;
  job_id: string;
  material_id: number;
  source_path: string;
}

export interface TutorVideoJobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  phase?: string;
  material_id: number;
  source_path?: string;
  title?: string;
  model_size?: string;
  language?: string | null;
  keyframe_interval_sec?: number;
  started_at?: string;
  finished_at?: string | null;
  last_error?: string | null;
  manifest?: Record<string, unknown> | null;
  ingest_result?: Record<string, unknown> | null;
}

export interface TutorVideoEnrichResult {
  ok: boolean;
  material_id: number;
  status?: string;
  results?: Record<string, unknown>[];
  enrichment_md_path?: string;
  error?: string;
}

export interface Material {
  id: number;
  title: string | null;
  source_path: string | null;
  folder_path: string | null;
  file_type: string | null;
  file_size: number | null;
  course_id: number | null;
  enabled: boolean;
  extraction_error: string | null;
  checksum: string | null;
  created_at: string;
  updated_at: string | null;
  has_docling_assets?: boolean;
  docling_asset_count?: number;
}

export interface MaterialContent {
  id: number;
  title: string;
  source_path: string | null;
  file_type: string | null;
  content: string;
  char_count: number;
  extraction_lossy: boolean;
  replacement_ratio: number;
}

export interface AutoLinkResult {
  linked: number;
  unlinked: number;
  mappings: Record<string, string>;
}

export interface MaterialUploadResponse {
  id: number;
  title: string;
  file_type: string;
  file_size: number;
  char_count: number;
  embedded: boolean;
  duplicate_of: { id: number; title: string } | null;
}

// Data Editor types
export interface DataTableSchema {
  table: string;
  columns: { cid: number; name: string; type: string; notnull: number; default: unknown; pk: number }[];
  row_count: number;
}

export interface DataRowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

export interface TutorVerdictErrorLocation {
  type: "concept" | "prerequisite" | "reasoning" | "recall";
  node: string | null;
  prereq_from: string | null;
  prereq_to: string | null;
}

export interface TutorVerdict {
  verdict: "pass" | "fail" | "partial";
  error_location?: TutorVerdictErrorLocation | null;
  error_type?: string | null;
  why_wrong?: string | null;
  next_hint?: string | null;
  next_question?: string | null;
  confidence?: number;
  citations?: string[];
  _validation_issues?: string[];
}

export interface TeachBackRubricGap {
  skill_id: string;
  edge_id?: string | null;
}

export interface TeachBackRubric {
  overall_rating: "pass" | "partial" | "fail";
  accuracy_score: number;
  breadth_score: number;
  synthesis_score: number;
  misconceptions?: string[];
  gaps?: TeachBackRubricGap[];
  strengths?: string[];
  next_focus?: string;
  confidence?: number;
  _validation_issues?: string[];
  _mastery_blocked?: boolean;
}

// SSE streaming helper for Tutor chat
export interface TutorSSEChunk {
  type: "token" | "done" | "error" | "web_search_searching" | "web_search_completed" | "tool_call" | "tool_result" | "tool_limit_reached";
  content?: string;
  citations?: TutorCitation[];
  artifacts?: unknown[];
  summary?: string;
  model?: string;
  retrieval_debug?: TutorRetrievalDebug;
  behavior_override?: BehaviorOverride;
  verdict?: TutorVerdict;
  concept_map?: unknown;
  teach_back_rubric?: TeachBackRubric;
  mastery_update?: { skill_id: string; new_mastery: number; correct: boolean };
}

export interface TutorRetrievalDebug {
  accuracy_profile?: TutorAccuracyProfile;
  accuracy_profile_label?: string;
  requested_accuracy_profile?: TutorAccuracyProfile;
  effective_accuracy_profile?: TutorAccuracyProfile;
  profile_escalated?: boolean;
  profile_escalation_reasons?: string[];
  insufficient_evidence_guard?: boolean;
  insufficient_evidence_reasons?: string[];
  material_ids_provided?: boolean;
  material_ids_count?: number;
  selected_material_count?: number;
  material_k?: number;
  retrieval_course_id?: number | null;
  retrieved_material_chunks?: number;
  retrieved_material_unique_sources?: number;
  retrieved_material_sources?: string[];
  material_top_source?: string | null;
  material_top_source_share?: number;
  retrieved_instruction_chunks?: number;
  retrieved_instruction_unique_sources?: number;
  retrieved_instruction_sources?: string[];
  citations_total?: number;
  citations_unique_sources?: number;
  citation_sources?: string[];
  material_candidates_similarity?: number;
  material_candidates_mmr?: number;
  material_candidates_merged?: number;
  material_candidates_after_cap?: number;
  material_dropped_by_cap?: number;
  retrieval_confidence?: number;
  retrieval_confidence_tier?: "low" | "medium" | "high";
}

export interface TutorConfigCheck {
  ok: boolean;
  codex_available: boolean;
  openrouter_configured: boolean;
  chatgpt_streaming: boolean;
  issues: string[];
}

export interface TutorEmbedStatus {
  materials: { id: number; title: string; source_path: string; chunk_count: number; embedded: number }[];
  total: number;
  embedded: number;
  pending: number;
}

// Mastery Dashboard types
export interface MasterySkill {
  skill_id: string;
  name: string;
  effective_mastery: number;
  status: "locked" | "available" | "mastered";
}

export interface MasteryDashboardResponse {
  skills: MasterySkill[];
  count: number;
}

export interface MasteryDetailResponse {
  skill_id: string;
  effective_mastery: number;
  status: string;
  p_mastery_latent: number;
  last_practiced_at: number | null;
}

export interface WhyLockedPrereq {
  skill_id: string;
  effective_mastery: number;
  status: string;
  needed: number;
}

export interface WhyLockedFlag {
  skill_id: string;
  flags: { error_type: string; severity: string; evidence_ref: string | null; created_at: string }[];
}

export interface WhyLockedResponse {
  skill_id: string;
  status: string;
  missing_prereqs: WhyLockedPrereq[];
  flagged_prereqs: WhyLockedFlag[];
  recent_error_flags: { error_type: string; severity: string; edge_id: string | null; evidence_ref: string | null; created_at: string }[];
  remediation_path: string[];
}
