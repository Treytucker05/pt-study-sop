import type { 
  Session, InsertSession, 
  CalendarEvent, InsertCalendarEvent, 
  Task, InsertTask, 
  Proposal, InsertProposal,
  ChatMessage, InsertChatMessage,
  Note, InsertNote,
  Course, InsertCourse
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
    reorder: (noteIds: number[]) => request<{ success: boolean }>("/notes/reorder", {
      method: "POST",
      body: JSON.stringify({ noteIds }),
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
    }>("/brain/metrics"),
    chat: (message: string, syncToObsidian: boolean = false) => request<{ 
      response: string; 
      isStub: boolean; 
      parsed?: boolean;
      cardsCreated?: number;
      obsidianSynced?: boolean;
      obsidianError?: string;
    }>("/brain/chat", {
      method: "POST",
      body: JSON.stringify({ message, syncToObsidian }),
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
}

export interface TutorAuditItem {
  id: number;
  sessionId: string;
  date: string;
  userMessages: number;
  assistantMessages: number;
  status: string;
}

export interface InsertAcademicDeadline {
  title: string;
  course: string;
  type: 'assignment' | 'quiz' | 'exam' | 'project';
  dueDate: string;
  notes?: string;
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
