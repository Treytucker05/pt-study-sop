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
    throw new Error(`API Error: ${response.statusText}`);
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
    getQueue: () => request<unknown[]>("/planner/queue"),
    getSettings: () => request<Record<string, unknown>>("/planner/settings"),
    updateSettings: (data: Record<string, unknown>) =>
      request<{ ok: boolean }>("/planner/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    generate: () =>
      request<{ ok: boolean; tasks_created: number }>("/planner/generate", {
        method: "POST",
      }),
    updateTask: (taskId: number, data: Record<string, unknown>) =>
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
  },

  anki: {
    getStatus: () => request<AnkiStatus>("/anki/status"),
    getDecks: () => request<AnkiDeck[]>("/anki/decks"),
    getDue: () => request<AnkiDueInfo>("/anki/due"),
    getDrafts: () => request<CardDraft[]>("/anki/drafts"),
    sync: () => request<AnkiSyncResult>("/anki/sync", { method: "POST" }),
    approveDraft: (id: number) => request<{ success: boolean }>(`/anki/drafts/${id}/approve`, {
      method: "POST",
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
