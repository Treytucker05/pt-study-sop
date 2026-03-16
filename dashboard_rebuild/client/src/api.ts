export type * from "./api.types";

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
  LoSession, InsertLoSession,
} from "@shared/schema";

import type {
  AppLearningObjective,
  GoogleTask,
  PlannerTask, PlannerTaskCreate, PlannerTaskUpdate,
  SyllabusImportResult,
  JanitorIssue, JanitorOptions, JanitorHealthResponse, JanitorScanResponse,
  AiResolveResponse, AiApplyResponse, BatchEnrichResponse,
  ScholarQuestion, ScholarChatResponse, ScholarFinding,
  ScholarInvestigation, ScholarInvestigationDetail, ScholarInvestigationCreatePayload,
  TutorAuditItem, ScholarClustersResponse, ScholarRunResult, ScholarRunStatus,
  ScholarRunHistoryItem,
  AcademicDeadline, InsertAcademicDeadline,
  AnkiStatus, AnkiDeck, AnkiDueInfo, CardDraft, AnkiSyncResult,
  ObsidianStatus, ObsidianConfig, ObsidianVaultIndexResult, ObsidianGraphResult,
  ObsidianAppendResult, ObsidianFilesResult, ObsidianFileResult,
  ObsidianCrudResult, ObsidianMoveResult, ObsidianTemplateRenderResult,
  MethodBlock, MethodChain, MethodChainExpanded, MethodAnalyticsResponse,
  ChainRunRequest, ChainRunResult, ChainRunSummary,
  TutorSessionPreflightRequest, TutorSessionPreflightResponse,
  TutorCreateSessionRequest,
  TutorSession, TutorSessionWithTurns, TutorSessionEndResult, TutorSessionSummary,
  TutorHubResponse,
  TutorStudioOverviewResponse,
  TutorProjectShellResponse, TutorProjectShellState, TutorProjectShellStateRequest,
  TutorStudioCaptureRequest, TutorStudioCaptureResponse, TutorStudioRestoreResponse,
  TutorStudioPromoteRequest, TutorStudioItemRevisionsResponse, TutorStudioUpdateRequest,
  TutorStudioUpdateResponse,
  TutorArtifactRequest, TutorArtifactResult,
  TutorContentSources,
  TutorChainRequest, TutorChain, TutorChainWithSessions,
  TutorEmbedResult,
  TutorSyncPreviewPayload, TutorSyncStartPayload,
  TutorSyncPreviewResult, TutorSyncStartResult, TutorSyncJobStatus,
  TutorVideoProcessStartResult, TutorVideoJobStatus,
  TutorVideoEnrichmentStatus, TutorVideoEnrichResult,
  Material, MaterialContent, AutoLinkResult, MaterialUploadResponse,
  TutorTemplateChain, TutorBlockProgress, TutorConfigCheck, TutorEmbedStatus,
  TutorSessionWrapSummary, TutorChainStatusResponse, TutorStrategyFeedback,
  MasteryDashboardResponse, MasteryDetailResponse, WhyLockedResponse,
  DataTableSchema, DataRowsResponse,
  BrainChatPayload, BrainOrganizePreviewResponse,
  BrainProfileOverview, BrainProfileClaimsResponse, BrainProfileQuestionsResponse,
  BrainProfileHistoryResponse, BrainProfileFeedbackPayload, BrainProfileFeedbackResponse,
  ProductAnalyticsResponse, ProductEventPayload, ProductFeatureFlag,
  ProductOutcomeReport, ProductPrivacySettings,
  CourseMapResponse,
} from "./api.types";

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
      request<AppLearningObjective[]>(`/learning-objectives?courseId=${courseId}`),
    getByModule: (moduleId: number) =>
      request<AppLearningObjective[]>(`/learning-objectives?moduleId=${moduleId}`),
    getOne: (id: number) => request<AppLearningObjective>(`/learning-objectives/${id}`),
    create: (data: InsertLearningObjective) => request<AppLearningObjective>("/learning-objectives", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    createBulk: (courseId: number, moduleId: number | null, los: Omit<InsertLearningObjective, "courseId" | "moduleId">[]) =>
      request<AppLearningObjective[]>("/learning-objectives/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, moduleId, los }),
      }),
    update: (id: number, data: Partial<InsertLearningObjective>) => request<AppLearningObjective>(`/learning-objectives/${id}`, {
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
    getProfileSummary: (forceRefresh = false) =>
      request<BrainProfileOverview>(`/brain/profile${forceRefresh ? "?force=1" : ""}`),
    getProfileClaims: (forceRefresh = false) =>
      request<BrainProfileClaimsResponse>(`/brain/profile/claims${forceRefresh ? "?force=1" : ""}`),
    getProfileQuestions: (forceRefresh = false) =>
      request<BrainProfileQuestionsResponse>(`/brain/profile/questions${forceRefresh ? "?force=1" : ""}`),
    getProfileHistory: (limit: number = 12) =>
      request<BrainProfileHistoryResponse>(`/brain/profile/history?limit=${encodeURIComponent(String(limit))}`),
    exportProfile: () =>
      request<Record<string, unknown>>("/brain/profile/export"),
    submitProfileFeedback: (payload: BrainProfileFeedbackPayload) =>
      request<BrainProfileFeedbackResponse>("/brain/profile/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  product: {
    logEvent: (payload: ProductEventPayload) =>
      request<Record<string, unknown>>("/product/events", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getAnalytics: () =>
      request<ProductAnalyticsResponse>("/product/analytics"),
    getPrivacySettings: () =>
      request<ProductPrivacySettings>("/product/privacy"),
    updatePrivacySettings: (payload: Partial<ProductPrivacySettings>) =>
      request<ProductPrivacySettings>("/product/privacy", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    resetPersonalization: () =>
      request<Record<string, unknown>>("/product/privacy/reset-personalization", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    getOutcomeReport: () =>
      request<ProductOutcomeReport>("/product/outcome-report"),
    getFeatureFlags: () =>
      request<{ userId: string; workspaceId: string; flags: ProductFeatureFlag[] }>("/product/feature-flags"),
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
    getInvestigations: (limit = 20) =>
      request<ScholarInvestigation[]>(`/scholar/investigations?limit=${encodeURIComponent(String(limit))}`),
    createInvestigation: (payload: ScholarInvestigationCreatePayload) =>
      request<ScholarInvestigation>("/scholar/investigations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getInvestigation: (investigationId: string) =>
      request<ScholarInvestigationDetail>(`/scholar/investigations/${encodeURIComponent(investigationId)}`),
    getQuestions: (status: string = "all", limit = 100) =>
      request<ScholarQuestion[]>(
        `/scholar/research/questions?status=${encodeURIComponent(status)}&limit=${encodeURIComponent(String(limit))}`,
      ),
    answerQuestion: (questionId: string, answer: string, source = "ui") =>
      request<ScholarQuestion>(`/scholar/research/questions/${encodeURIComponent(questionId)}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer, source }),
      }),
    chat: (message: string) => request<ScholarChatResponse>("/scholar/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
    getFindings: (investigationId?: string, limit = 50) =>
      request<ScholarFinding[]>(
        `/scholar/research/findings?limit=${encodeURIComponent(String(limit))}${investigationId ? `&investigation_id=${encodeURIComponent(investigationId)}` : ""}`,
      ),
    exportResearch: () =>
      request<Record<string, unknown>>("/scholar/export"),
    getTutorAudit: () => request<TutorAuditItem[]>("/scholar/tutor-audit"),
    getClusters: () => request<ScholarClustersResponse>("/scholar/clusters"),
    runClustering: () => request<ScholarClustersResponse>("/scholar/clusters", { method: "POST" }),
    run: (payload?: { triggered_by?: string; mode?: "brain" | "tutor" }) =>
      request<ScholarRunResult>("/scholar/run", {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }),
    runStatus: () => request<ScholarRunStatus>("/scholar/status"),
    runHistory: async (limit = 10) => {
      const payload = await request<{ ok?: boolean; runs?: ScholarRunHistoryItem[] } | ScholarRunHistoryItem[]>(
        `/scholar/run/history?limit=${limit}`
      );
      return Array.isArray(payload) ? payload : payload.runs || [];
    },
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
    getTemplatePrompt: (id: number) =>
      request<{ facilitation_prompt: string }>(`/methods/${id}/template-prompt`),
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
    preflightSession: (data: TutorSessionPreflightRequest) =>
      request<TutorSessionPreflightResponse>("/tutor/session/preflight", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createSession: (data: TutorCreateSessionRequest) =>
      request<TutorSession>("/tutor/session", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getProjectShell: (params: { course_id: number; session_id?: string }) => {
      const qs = new URLSearchParams({ course_id: String(params.course_id) });
      if (params.session_id) qs.set("session_id", params.session_id);
      return request<TutorProjectShellResponse>(`/tutor/project-shell?${qs.toString()}`);
    },
    getHub: () => request<TutorHubResponse>("/tutor/hub"),
    getStudioOverview: (courseId: number) =>
      request<TutorStudioOverviewResponse>(`/tutor/studio/overview?course_id=${courseId}`),
    saveProjectShellState: (data: TutorProjectShellStateRequest) =>
      request<{ course_id: number; workspace_state: TutorProjectShellState }>(
        "/tutor/project-shell/state",
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
    getSession: (sessionId: string) =>
      request<TutorSessionWithTurns>(`/tutor/session/${sessionId}`),
    saveStrategyFeedback: (
      sessionId: string,
      data: Omit<TutorStrategyFeedback, "updatedAt">,
    ) =>
      request<{ session_id: string; strategy_feedback: TutorStrategyFeedback }>(
        `/tutor/session/${sessionId}/strategy-feedback`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
    endSession: (sessionId: string) =>
      request<TutorSessionEndResult>(`/tutor/session/${sessionId}/end`, {
        method: "POST",
      }),
    deleteSession: (sessionId: string) =>
      request<{
        deleted: boolean;
        session_id: string;
        status?: string;
        request_id?: string;
        requested_count?: number;
        deleted_count?: number;
        skipped_count?: number;
        failed_count?: number;
        objectives_deleted?: number;
        obsidian_deleted?: string[];
        obsidian_cleanup?: {
          success: boolean;
          expected_count?: number;
          deleted_count?: number;
          missing_paths?: string[];
        };
      }>(`/tutor/session/${sessionId}`, {
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
      request<{
        deleted: number;
        session_id: string;
        request_id?: string;
        requested_count?: number;
        applied_count?: number;
        skipped_indexes?: number[];
        obsidian_deleted?: string[];
      }>(`/tutor/session/${sessionId}/artifacts`, {
        method: "DELETE",
        body: JSON.stringify({ indexes }),
      }),
    captureStudioItem: (data: TutorStudioCaptureRequest) =>
      request<TutorStudioCaptureResponse>("/tutor/studio/capture", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    restoreStudioItems: (params: {
      course_id: number;
      tutor_session_id?: string;
      scope?: "session" | "project";
      include_archived?: boolean;
    }) => {
      const qs = new URLSearchParams({ course_id: String(params.course_id) });
      if (params.tutor_session_id) qs.set("tutor_session_id", params.tutor_session_id);
      if (params.scope) qs.set("scope", params.scope);
      if (params.include_archived) qs.set("include_archived", "1");
      return request<TutorStudioRestoreResponse>(`/tutor/studio/restore?${qs.toString()}`);
    },
    promoteStudioItem: (data: TutorStudioPromoteRequest) =>
      request<TutorStudioCaptureResponse>("/tutor/studio/promote", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateStudioItem: (itemId: number, data: TutorStudioUpdateRequest) =>
      request<TutorStudioUpdateResponse>(`/tutor/studio/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    getStudioItemRevisions: (itemId: number) =>
      request<TutorStudioItemRevisionsResponse>(`/tutor/studio/items/${itemId}/revisions`),
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
    previewSyncMaterialsFolder: (payload: TutorSyncPreviewPayload) =>
      request<TutorSyncPreviewResult>("/tutor/materials/sync/preview", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    syncMaterialsFolder: (payload: TutorSyncStartPayload) =>
      request<TutorSyncStartResult>("/tutor/materials/sync", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    startSyncMaterialsFolder: (payload: TutorSyncStartPayload) =>
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
    getVideoEnrichmentStatus: (materialId?: number) => {
      const query =
        materialId !== undefined && materialId !== null
          ? `?material_id=${encodeURIComponent(String(materialId))}`
          : "";
      return request<TutorVideoEnrichmentStatus>(`/tutor/materials/video/enrich/status${query}`);
    },
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
    getMaterialFileUrl: (id: number) => `${API_BASE}/tutor/materials/${id}/file`,
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
    getSessionSummary: (sessionId: string, opts?: { save?: boolean }) =>
      request<TutorSessionWrapSummary>(
        `/tutor/session/${sessionId}/summary${opts?.save ? "?save=true" : ""}`,
      ),
    exportSession: async (sessionId: string) => {
      const res = await fetch(`${API_BASE}/tutor/session/${sessionId}/export`);
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] || `tutor-export-${sessionId}.md`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    getChainStatus: (sessionId: string) =>
      request<TutorChainStatusResponse>(`/tutor/session/${sessionId}/chain-status`),
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

  janitor: {
    getHealth: () => request<JanitorHealthResponse>("/janitor/health"),
    scan: (opts?: { folder?: string; checks?: string[] }) =>
      request<JanitorScanResponse>("/janitor/scan", {
        method: "POST",
        body: JSON.stringify(opts || {}),
      }),
    fix: (issues: JanitorIssue[]) =>
      request<{ results: { success: boolean; path: string; detail: string }[] }>(
        "/janitor/fix",
        { method: "POST", body: JSON.stringify({ issues }) },
      ),
    enrich: (path: string) =>
      request<{ success: boolean; links_added: number }>(
        "/janitor/enrich",
        { method: "POST", body: JSON.stringify({ path }) },
      ),
    getOptions: () => request<JanitorOptions>("/janitor/options"),
    aiResolve: (path: string, issueType: string, context?: Record<string, string>) =>
      request<AiResolveResponse>("/janitor/ai-resolve", {
        method: "POST",
        body: JSON.stringify({ path, issue_type: issueType, context }),
      }),
    aiApply: (path: string, applyAction: string, suggestion: Record<string, unknown>) =>
      request<AiApplyResponse>("/janitor/ai-apply", {
        method: "POST",
        body: JSON.stringify({ path, apply_action: applyAction, suggestion }),
      }),
    batchEnrich: (opts?: { paths?: string[]; folder?: string; max_batch?: number }) =>
      request<BatchEnrichResponse>("/janitor/batch-enrich", {
        method: "POST",
        body: JSON.stringify(opts || {}),
      }),
  },
};

export async function fetchCourseMap(): Promise<CourseMapResponse> {
  const res = await fetch("/api/tutor/course-map");
  if (!res.ok) throw new Error("course-map fetch failed");
  return res.json();
}
