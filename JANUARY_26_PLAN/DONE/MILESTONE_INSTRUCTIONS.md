# MILESTONE INSTRUCTIONS - COMPLETE STEP-BY-STEP GUIDE

**Created:** January 23, 2026  
**Working Directory:** `C:\pt-study-sop\dashboard_rebuild`

**Note (2026-01-23):** `dashboard_rebuild` is frontend-only. The API lives in `brain/dashboard/api_adapter.py` and the live DB is `brain/data/pt_study.db`. The `dashboard_rebuild/server` folder and `data.db` are no longer used.

---

## FILE PATHS REFERENCE

```
C:\pt-study-sop\
|-- dashboard_rebuild\
|   |-- schema.ts                      <- Client types schema
|   |-- shared\schema.ts               <- Re-export from ../schema.ts
|   |-- client\src\api.ts              <- API client (add calls here)
|   |-- client\src\pages\brain.tsx     <- Brain page (add tabs here)
|   |-- client\src\pages\dashboard.tsx <- Dashboard (add widgets here)
|   |-- client\src\pages\tutor.tsx     <- Tutor page
|-- brain\
|   |-- db_setup.py                     <- Legacy DB schema/migrations
|   |-- dashboard\api_adapter.py        <- API endpoints
|   |-- data\pt_study.db                <- Live SQLite database
|   |-- static\dist\                    <- React build served by Flask
```

---

## PRE-FLIGHT CHECKS

Before starting, run these commands from `C:\pt-study-sop\dashboard_rebuild`:

```powershell
cd C:\pt-study-sop\dashboard_rebuild

# 1. Verify node_modules exist
dir node_modules

# 2. Verify database exists
dir ..\brain\data\pt_study.db

# 3. Backup database
copy ..\brain\data\pt_study.db ..\brain\data\pt_study.db.bak

# 4. Ensure DB schema is initialized
python ..\brain\db_setup.py

# 5. Test current build works
npm run check
```

**If any fail, stop and fix before proceeding.**

---

# IMPORTANT UPDATE (Single Dashboard)
The Node `dashboard_rebuild/server` is removed. Any steps below that mention `server/storage.ts` or `server/routes.ts` should be implemented in `brain/dashboard/api_adapter.py`, and any real DB changes should be made in `brain/db_setup.py`. `dashboard_rebuild/schema.ts` remains for client types only.

---

# MILESTONE 1: DATABASE SCHEMA

**Goal:** Add new tables to SQLite database

## Step 1.1: Create shared/schema.ts Directory and File

**Why:** Client imports from `@shared/schema` but directory doesn't exist.

**File to create:** `C:\pt-study-sop\dashboard_rebuild\shared\schema.ts`

**Content:**
```typescript
// Re-export everything from the root schema
export * from "../schema";
```

**Commands:**
```powershell
cd C:\pt-study-sop\dashboard_rebuild
mkdir shared
```
Then create the file with the content above.

---

## Step 1.2: Add scheduleEvents Table to schema.ts

**File:** `C:\pt-study-sop\dashboard_rebuild\schema.ts`

**Location:** Add after the `courses` table definition (around line 40)

**Code to add:**
```typescript
// Schedule events from syllabus (exams, quizzes, assignments)
export const scheduleEvents = sqliteTable("schedule_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  type: text("type").notNull(), // 'chapter' | 'quiz' | 'assignment' | 'exam'
  title: text("title").notNull(),
  dueDate: text("due_date"), // ISO date string YYYY-MM-DD
  linkedModuleId: integer("linked_module_id"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertScheduleEventSchema = createInsertSchema(scheduleEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduleEvent = z.infer<typeof insertScheduleEventSchema>;
export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
```

---

## Step 1.3: Add modules Table to schema.ts

**File:** `C:\pt-study-sop\dashboard_rebuild\schema.ts`

**Location:** Add after scheduleEvents

**Code to add:**
```typescript
// Modules (unit of material gathering)
export const modules = sqliteTable("modules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  filesDownloaded: integer("files_downloaded", { mode: "boolean" }).notNull().default(false),
  notebooklmLoaded: integer("notebooklm_loaded", { mode: "boolean" }).notNull().default(false),
  sources: text("sources"), // JSON array of file names
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;
```

---

## Step 1.4: Add learningObjectives Table to schema.ts

**File:** `C:\pt-study-sop\dashboard_rebuild\schema.ts`

**Location:** Add after modules

**Code to add:**
```typescript
// Learning objectives (unit of learning progress)
export const learningObjectives = sqliteTable("learning_objectives", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  moduleId: integer("module_id"),
  loCode: text("lo_code"), // e.g., "LO-4.1" or "1a"
  title: text("title").notNull(),
  status: text("status").notNull().default("not_started"), // not_started | in_progress | need_review | solid
  lastSessionId: integer("last_session_id"),
  lastSessionDate: text("last_session_date"), // ISO date string
  nextAction: text("next_action"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertLearningObjectiveSchema = createInsertSchema(learningObjectives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLearningObjective = z.infer<typeof insertLearningObjectiveSchema>;
export type LearningObjective = typeof learningObjectives.$inferSelect;
```

---

## Step 1.5: Add loSessions Table to schema.ts

**File:** `C:\pt-study-sop\dashboard_rebuild\schema.ts`

**Location:** Add after learningObjectives

**Code to add:**
```typescript
// LO-Session join table (tracks which LOs were covered in each session)
export const loSessions = sqliteTable("lo_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loId: integer("lo_id").notNull(),
  sessionId: integer("session_id").notNull(),
  statusBefore: text("status_before"),
  statusAfter: text("status_after"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertLoSessionSchema = createInsertSchema(loSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertLoSession = z.infer<typeof insertLoSessionSchema>;
export type LoSession = typeof loSessions.$inferSelect;
```

---

## Step 1.6: Add sourceLock Column to sessions Table

**File:** `C:\pt-study-sop\dashboard_rebuild\schema.ts`

**Location:** Find the `sessions` table (around line 45), add after `issues` field

**Code to add (inside the sessions table definition):**
```typescript
  sourceLock: text("source_lock"), // JSON array of source labels e.g., '["Slides 12-25", "Ch 4 pp.80-95"]'
```

**Full sessions table should look like (showing only the fields around the change):**
```typescript
  issues: text("issues"), // WRAP: interruptions, source-lock failures, workflow problems (JSON array)
  sourceLock: text("source_lock"), // JSON array of source labels
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
```

---

## Step 1.7: Push Schema to Database

**Commands:**
```powershell
cd C:\pt-study-sop
python brain\db_setup.py
```

**Expected output:** Success message, tables created in `brain/data/pt_study.db`

**Validation:**
```powershell
# Open SQLite and check tables exist (DB Browser for SQLite)
```

---

## Step 1.8: Verify TypeScript Compiles

**Commands:**
```powershell
npm run check
```

**Expected output:** No errors

**If errors:** Fix any type issues in schema.ts before proceeding.

---

# MILESTONE 1 COMPLETE CHECKLIST

- [ ] `shared/schema.ts` created with re-export
- [ ] `scheduleEvents` table added to schema.ts
- [ ] `modules` table added to schema.ts
- [ ] `learningObjectives` table added to schema.ts
- [ ] `loSessions` table added to schema.ts
- [ ] `sourceLock` column added to sessions table
- [ ] `python brain\db_setup.py` successful
- [ ] `npm run check` passes

---
# MILESTONE 2: STORAGE LAYER

**Goal:** Add CRUD functions for new tables

**Note:** `dashboard_rebuild/server` is removed. Implement this logic in `C:\pt-study-sop\brain\dashboard\api_adapter.py`. The TypeScript snippets below are legacy references.

**File:** `C:\pt-study-sop\brain\dashboard\api_adapter.py`

---

## Step 2.1: Update Imports in api_adapter.py

**Location:** Top of file (line 1-15)

**Replace the import block with:**
```typescript
import {
  users, sessions, calendarEvents, tasks, proposals, chatMessages, notes,
  courses, studyWheelState, studyStreak, weaknessQueue,
  scheduleEvents, modules, learningObjectives, loSessions,
  type User, type InsertUser,
  type Session, type InsertSession,
  type CalendarEvent, type InsertCalendarEvent,
  type Task, type InsertTask,
  type Proposal, type InsertProposal,
  type ChatMessage, type InsertChatMessage,
  type Note, type InsertNote,
  type Course, type InsertCourse,
  type ScheduleEvent, type InsertScheduleEvent,
  type Module, type InsertModule,
  type LearningObjective, type InsertLearningObjective,
  type LoSession, type InsertLoSession
} from "../schema";
```

---

## Step 2.2: Add Interface Methods to IStorage

**Location:** Inside the `IStorage` interface (around line 20-80)

**Add these method signatures at the end of the interface:**
```typescript
  // Schedule Events
  getScheduleEventsByCourse(courseId: number): Promise<ScheduleEvent[]>;
  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  createScheduleEventsBulk(events: InsertScheduleEvent[]): Promise<ScheduleEvent[]>;
  updateScheduleEvent(id: number, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: number): Promise<boolean>;

  // Modules
  getModulesByCourse(courseId: number): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  createModulesBulk(modules: InsertModule[]): Promise<Module[]>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;

  // Learning Objectives
  getLearningObjectivesByCourse(courseId: number): Promise<LearningObjective[]>;
  getLearningObjectivesByModule(moduleId: number): Promise<LearningObjective[]>;
  getLearningObjective(id: number): Promise<LearningObjective | undefined>;
  createLearningObjective(lo: InsertLearningObjective): Promise<LearningObjective>;
  createLearningObjectivesBulk(los: InsertLearningObjective[]): Promise<LearningObjective[]>;
  updateLearningObjective(id: number, lo: Partial<InsertLearningObjective>): Promise<LearningObjective | undefined>;
  deleteLearningObjective(id: number): Promise<boolean>;

  // LO Sessions
  createLoSession(loSession: InsertLoSession): Promise<LoSession>;
  getLoSessionsByLo(loId: number): Promise<LoSession[]>;
  getLoSessionsBySession(sessionId: number): Promise<LoSession[]>;

  // Session Context
  getLastSessionContext(courseId?: number): Promise<{
    lastSession: Session | null;
    course: Course | null;
    recentLos: LearningObjective[];
  }>;
```

---

## Step 2.3: Add Schedule Events Implementation

**Location:** Inside `DatabaseStorage` class, after the `getBrainMetrics` method (end of class)

**Add:**
```typescript
  // ===== SCHEDULE EVENTS =====
  async getScheduleEventsByCourse(courseId: number): Promise<ScheduleEvent[]> {
    return await db.select().from(scheduleEvents)
      .where(eq(scheduleEvents.courseId, courseId))
      .orderBy(asc(scheduleEvents.dueDate));
  }

  async createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent> {
    const [newEvent] = await db.insert(scheduleEvents).values(event).returning();
    return newEvent;
  }

  async createScheduleEventsBulk(events: InsertScheduleEvent[]): Promise<ScheduleEvent[]> {
    if (events.length === 0) return [];
    const newEvents = await db.insert(scheduleEvents).values(events).returning();
    return newEvents;
  }

  async updateScheduleEvent(id: number, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const [updated] = await db.update(scheduleEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(scheduleEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduleEvent(id: number): Promise<boolean> {
    const result = await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
```

---

## Step 2.4: Add Modules Implementation

**Location:** After schedule events methods

**Add:**
```typescript
  // ===== MODULES =====
  async getModulesByCourse(courseId: number): Promise<Module[]> {
    return await db.select().from(modules)
      .where(eq(modules.courseId, courseId))
      .orderBy(asc(modules.orderIndex));
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const existingModules = await this.getModulesByCourse(module.courseId);
    const maxOrder = existingModules.length > 0 
      ? Math.max(...existingModules.map(m => m.orderIndex)) 
      : -1;
    const [newModule] = await db.insert(modules)
      .values({ ...module, orderIndex: maxOrder + 1 })
      .returning();
    return newModule;
  }

  async createModulesBulk(modulesData: InsertModule[]): Promise<Module[]> {
    if (modulesData.length === 0) return [];
    // Assign order indices
    const withOrder = modulesData.map((m, i) => ({ ...m, orderIndex: i }));
    const newModules = await db.insert(modules).values(withOrder).returning();
    return newModules;
  }

  async updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined> {
    const [updated] = await db.update(modules)
      .set({ ...module, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteModule(id: number): Promise<boolean> {
    const result = await db.delete(modules).where(eq(modules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
```

---

## Step 2.5: Add Learning Objectives Implementation

**Location:** After modules methods

**Add:**
```typescript
  // ===== LEARNING OBJECTIVES =====
  async getLearningObjectivesByCourse(courseId: number): Promise<LearningObjective[]> {
    return await db.select().from(learningObjectives)
      .where(eq(learningObjectives.courseId, courseId))
      .orderBy(asc(learningObjectives.loCode));
  }

  async getLearningObjectivesByModule(moduleId: number): Promise<LearningObjective[]> {
    return await db.select().from(learningObjectives)
      .where(eq(learningObjectives.moduleId, moduleId))
      .orderBy(asc(learningObjectives.loCode));
  }

  async getLearningObjective(id: number): Promise<LearningObjective | undefined> {
    const [lo] = await db.select().from(learningObjectives).where(eq(learningObjectives.id, id));
    return lo || undefined;
  }

  async createLearningObjective(lo: InsertLearningObjective): Promise<LearningObjective> {
    const [newLo] = await db.insert(learningObjectives).values(lo).returning();
    return newLo;
  }

  async createLearningObjectivesBulk(los: InsertLearningObjective[]): Promise<LearningObjective[]> {
    if (los.length === 0) return [];
    const newLos = await db.insert(learningObjectives).values(los).returning();
    return newLos;
  }

  async updateLearningObjective(id: number, lo: Partial<InsertLearningObjective>): Promise<LearningObjective | undefined> {
    const [updated] = await db.update(learningObjectives)
      .set({ ...lo, updatedAt: new Date() })
      .where(eq(learningObjectives.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteLearningObjective(id: number): Promise<boolean> {
    const result = await db.delete(learningObjectives).where(eq(learningObjectives.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
```

---

## Step 2.6: Add LO Sessions Implementation

**Location:** After learning objectives methods

**Add:**
```typescript
  // ===== LO SESSIONS =====
  async createLoSession(loSession: InsertLoSession): Promise<LoSession> {
    const [newLoSession] = await db.insert(loSessions).values(loSession).returning();
    return newLoSession;
  }

  async getLoSessionsByLo(loId: number): Promise<LoSession[]> {
    return await db.select().from(loSessions)
      .where(eq(loSessions.loId, loId))
      .orderBy(desc(loSessions.createdAt));
  }

  async getLoSessionsBySession(sessionId: number): Promise<LoSession[]> {
    return await db.select().from(loSessions)
      .where(eq(loSessions.sessionId, sessionId));
  }
```

---

## Step 2.7: Add Last Session Context Implementation

**Location:** After LO sessions methods

**Add:**
```typescript
  // ===== SESSION CONTEXT =====
  async getLastSessionContext(courseId?: number): Promise<{
    lastSession: Session | null;
    course: Course | null;
    recentLos: LearningObjective[];
  }> {
    let lastSession: Session | null = null;
    let course: Course | null = null;
    let recentLos: LearningObjective[] = [];

    if (courseId) {
      // Get last session for specific course
      const [session] = await db.select().from(sessions)
        .where(eq(sessions.courseId, courseId))
        .orderBy(desc(sessions.date))
        .limit(1);
      lastSession = session || null;

      const courseData = await this.getCourse(courseId);
      course = courseData || null;

      // Get LOs for this course that are in_progress or need_review
      recentLos = await db.select().from(learningObjectives)
        .where(and(
          eq(learningObjectives.courseId, courseId),
          sql`${learningObjectives.status} IN ('in_progress', 'need_review')`
        ))
        .orderBy(desc(learningObjectives.lastSessionDate))
        .limit(5);
    } else {
      // Get most recent session overall
      const [session] = await db.select().from(sessions)
        .orderBy(desc(sessions.date))
        .limit(1);
      lastSession = session || null;

      if (lastSession?.courseId) {
        const courseData = await this.getCourse(lastSession.courseId);
        course = courseData || null;

        recentLos = await db.select().from(learningObjectives)
          .where(and(
            eq(learningObjectives.courseId, lastSession.courseId),
            sql`${learningObjectives.status} IN ('in_progress', 'need_review')`
          ))
          .orderBy(desc(learningObjectives.lastSessionDate))
          .limit(5);
      }
    }

    return { lastSession, course, recentLos };
  }
```

---

## Step 2.8: Verify TypeScript Compiles

**Commands:**
```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm run check
```

**Expected output:** No errors

---

# MILESTONE 2 COMPLETE CHECKLIST

- [ ] Imports updated with new tables and types
- [ ] IStorage interface updated with new method signatures
- [ ] Schedule events CRUD implemented
- [ ] Modules CRUD implemented
- [ ] Learning objectives CRUD implemented
- [ ] LO sessions methods implemented
- [ ] Last session context method implemented
- [ ] `npm run check` passes

---
# MILESTONE 3: API ENDPOINTS

**Goal:** Create REST endpoints for new tables

**Note:** `dashboard_rebuild/server` is removed. Implement these endpoints in `C:\pt-study-sop\brain\dashboard\api_adapter.py`. The TypeScript snippets below are legacy references.

**File:** `C:\pt-study-sop\brain\dashboard\api_adapter.py`

---

## Step 3.1: Update Imports in api_adapter.py

**Location:** Top of file, in the import from "../schema"

**Update the import to include:**
```typescript
import {
  insertSessionSchema,
  insertCalendarEventSchema,
  insertTaskSchema,
  insertProposalSchema,
  insertChatMessageSchema,
  insertNoteSchema,
  insertCourseSchema,
  insertScheduleEventSchema,
  insertModuleSchema,
  insertLearningObjectiveSchema,
  insertLoSessionSchema
} from "../schema";
```

---

## Step 3.2: Add Schedule Events Routes

**Location:** Add after the ACADEMIC DEADLINES section (or at end before final return)

**Add:**
```typescript
  // ===== SCHEDULE EVENTS =====
  app.get("/api/schedule-events", async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      if (!courseId) {
        return res.status(400).json({ error: "courseId query parameter required" });
      }
      const events = await storage.getScheduleEventsByCourse(courseId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedule events" });
    }
  });

  app.post("/api/schedule-events", async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validated);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid schedule event data" });
    }
  });

  app.post("/api/schedule-events/bulk", async (req, res) => {
    try {
      const { events, courseId } = req.body;
      if (!Array.isArray(events) || !courseId) {
        return res.status(400).json({ error: "events array and courseId required" });
      }
      const validated = events.map(e => insertScheduleEventSchema.parse({ ...e, courseId }));
      const created = await storage.createScheduleEventsBulk(validated);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid schedule events data" });
    }
  });

  app.patch("/api/schedule-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(id, validated);
      if (!event) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid schedule event data" });
    }
  });

  app.delete("/api/schedule-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteScheduleEvent(id);
      if (!deleted) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });
```

---

## Step 3.3: Add Modules Routes

**Location:** After schedule events routes

**Add:**
```typescript
  // ===== MODULES =====
  app.get("/api/modules", async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      if (!courseId) {
        return res.status(400).json({ error: "courseId query parameter required" });
      }
      const modulesList = await storage.getModulesByCourse(courseId);
      res.json(modulesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  app.get("/api/modules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const module = await storage.getModule(id);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch module" });
    }
  });

  app.post("/api/modules", async (req, res) => {
    try {
      const validated = insertModuleSchema.parse(req.body);
      const module = await storage.createModule(validated);
      res.status(201).json(module);
    } catch (error) {
      res.status(400).json({ error: "Invalid module data" });
    }
  });

  app.post("/api/modules/bulk", async (req, res) => {
    try {
      const { modules: modulesData, courseId } = req.body;
      if (!Array.isArray(modulesData) || !courseId) {
        return res.status(400).json({ error: "modules array and courseId required" });
      }
      const validated = modulesData.map(m => insertModuleSchema.parse({ ...m, courseId }));
      const created = await storage.createModulesBulk(validated);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid modules data" });
    }
  });

  app.patch("/api/modules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertModuleSchema.partial().parse(req.body);
      const module = await storage.updateModule(id, validated);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(400).json({ error: "Invalid module data" });
    }
  });

  app.delete("/api/modules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteModule(id);
      if (!deleted) {
        return res.status(404).json({ error: "Module not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete module" });
    }
  });
```

---

## Step 3.4: Add Learning Objectives Routes

**Location:** After modules routes

**Add:**
```typescript
  // ===== LEARNING OBJECTIVES =====
  app.get("/api/learning-objectives", async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;
      
      if (moduleId) {
        const los = await storage.getLearningObjectivesByModule(moduleId);
        return res.json(los);
      }
      if (courseId) {
        const los = await storage.getLearningObjectivesByCourse(courseId);
        return res.json(los);
      }
      return res.status(400).json({ error: "courseId or moduleId query parameter required" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch learning objectives" });
    }
  });

  app.get("/api/learning-objectives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lo = await storage.getLearningObjective(id);
      if (!lo) {
        return res.status(404).json({ error: "Learning objective not found" });
      }
      res.json(lo);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch learning objective" });
    }
  });

  app.post("/api/learning-objectives", async (req, res) => {
    try {
      const validated = insertLearningObjectiveSchema.parse(req.body);
      const lo = await storage.createLearningObjective(validated);
      res.status(201).json(lo);
    } catch (error) {
      res.status(400).json({ error: "Invalid learning objective data" });
    }
  });

  app.post("/api/learning-objectives/bulk", async (req, res) => {
    try {
      const { learningObjectives: losData, courseId, moduleId } = req.body;
      if (!Array.isArray(losData) || !courseId) {
        return res.status(400).json({ error: "learningObjectives array and courseId required" });
      }
      const validated = losData.map(lo => insertLearningObjectiveSchema.parse({ 
        ...lo, 
        courseId,
        moduleId: moduleId || null
      }));
      const created = await storage.createLearningObjectivesBulk(validated);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid learning objectives data" });
    }
  });

  app.patch("/api/learning-objectives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertLearningObjectiveSchema.partial().parse(req.body);
      const lo = await storage.updateLearningObjective(id, validated);
      if (!lo) {
        return res.status(404).json({ error: "Learning objective not found" });
      }
      res.json(lo);
    } catch (error) {
      res.status(400).json({ error: "Invalid learning objective data" });
    }
  });

  app.delete("/api/learning-objectives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteLearningObjective(id);
      if (!deleted) {
        return res.status(404).json({ error: "Learning objective not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete learning objective" });
    }
  });
```

---

## Step 3.5: Add LO Sessions and Context Routes

**Location:** After learning objectives routes

**Add:**
```typescript
  // ===== LO SESSIONS =====
  app.post("/api/lo-sessions", async (req, res) => {
    try {
      const validated = insertLoSessionSchema.parse(req.body);
      const loSession = await storage.createLoSession(validated);
      res.status(201).json(loSession);
    } catch (error) {
      res.status(400).json({ error: "Invalid LO session data" });
    }
  });

  // ===== SESSION CONTEXT =====
  app.get("/api/sessions/last-context", async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      const context = await storage.getLastSessionContext(courseId);
      res.json(context);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session context" });
    }
  });
```

---

## Step 3.6: Verify Server Starts

**Commands:**
```powershell
cd C:\pt-study-sop
Start_Dashboard.bat
```

**Note:** `npm run dev` now starts the UI-only Vite server on port 3000. Use `Start_Dashboard.bat` for the full system on port 5000.

**Test endpoints (in new terminal):**
```powershell
# Test schedule events (should return empty array or 400 without courseId)
curl http://localhost:5000/api/schedule-events?courseId=1

# Test modules
curl http://localhost:5000/api/modules?courseId=1

# Test learning objectives
curl http://localhost:5000/api/learning-objectives?courseId=1

# Test session context
curl http://localhost:5000/api/sessions/last-context
```

---

# MILESTONE 3 COMPLETE CHECKLIST

- [ ] Schema imports updated in api_adapter.py
- [ ] Schedule events routes added (GET, POST, POST /bulk, PATCH, DELETE)
- [ ] Modules routes added
- [ ] Learning objectives routes added
- [ ] LO sessions POST route added
- [ ] Session context GET route added
- [ ] Flask server starts without errors
- [ ] Endpoints return valid JSON

---
# MILESTONE 4: API CLIENT

**Goal:** Add typed API calls to client

**File:** `C:\pt-study-sop\dashboard_rebuild\client\src\api.ts`

---

## Step 4.1: Update Type Imports

**Location:** Top of file, update the import from "@shared/schema"

**Update to:**
```typescript
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
```

---

## Step 4.2: Add Schedule Events API

**Location:** Inside the `api` object, after the existing sections

**Add:**
```typescript
  scheduleEvents: {
    getByCourse: (courseId: number) => 
      request<ScheduleEvent[]>(`/schedule-events?courseId=${courseId}`),
    create: (data: InsertScheduleEvent) => 
      request<ScheduleEvent>("/schedule-events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createBulk: (courseId: number, events: Omit<InsertScheduleEvent, 'courseId'>[]) =>
      request<ScheduleEvent[]>("/schedule-events/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, events }),
      }),
    update: (id: number, data: Partial<InsertScheduleEvent>) => 
      request<ScheduleEvent>(`/schedule-events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => 
      request<void>(`/schedule-events/${id}`, {
        method: "DELETE",
      }),
  },
```

---

## Step 4.3: Add Modules API

**Location:** After scheduleEvents

**Add:**
```typescript
  modules: {
    getByCourse: (courseId: number) => 
      request<Module[]>(`/modules?courseId=${courseId}`),
    getOne: (id: number) => 
      request<Module>(`/modules/${id}`),
    create: (data: InsertModule) => 
      request<Module>("/modules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createBulk: (courseId: number, modules: Omit<InsertModule, 'courseId'>[]) =>
      request<Module[]>("/modules/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, modules }),
      }),
    update: (id: number, data: Partial<InsertModule>) => 
      request<Module>(`/modules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => 
      request<void>(`/modules/${id}`, {
        method: "DELETE",
      }),
  },
```

---

## Step 4.4: Add Learning Objectives API

**Location:** After modules

**Add:**
```typescript
  learningObjectives: {
    getByCourse: (courseId: number) => 
      request<LearningObjective[]>(`/learning-objectives?courseId=${courseId}`),
    getByModule: (moduleId: number) => 
      request<LearningObjective[]>(`/learning-objectives?moduleId=${moduleId}`),
    getOne: (id: number) => 
      request<LearningObjective>(`/learning-objectives/${id}`),
    create: (data: InsertLearningObjective) => 
      request<LearningObjective>("/learning-objectives", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    createBulk: (courseId: number, moduleId: number | null, learningObjectives: Omit<InsertLearningObjective, 'courseId' | 'moduleId'>[]) =>
      request<LearningObjective[]>("/learning-objectives/bulk", {
        method: "POST",
        body: JSON.stringify({ courseId, moduleId, learningObjectives }),
      }),
    update: (id: number, data: Partial<InsertLearningObjective>) => 
      request<LearningObjective>(`/learning-objectives/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: number) => 
      request<void>(`/learning-objectives/${id}`, {
        method: "DELETE",
      }),
  },
```

---

## Step 4.5: Add LO Sessions and Context API

**Location:** After learningObjectives

**Add:**
```typescript
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
```

---

## Step 4.6: Verify TypeScript Compiles

**Commands:**
```powershell
cd C:\pt-study-sop\dashboard_rebuild
npm run check
```

**Expected output:** No errors

---

# MILESTONE 4 COMPLETE CHECKLIST

- [ ] Type imports updated
- [ ] Schedule events API methods added
- [ ] Modules API methods added
- [ ] Learning objectives API methods added
- [ ] LO sessions API method added
- [ ] Session context API method added
- [ ] `npm run check` passes

---
# MILESTONE 5: CHATGPT PROMPTS

**Goal:** Create prompts for bulk importing data via ChatGPT

**These can be stored in the UI or as reference docs**

---

## Step 5.1: Schedule Import Prompt

**Save as:** `C:\pt-study-sop\JANUARY_26_PLAN\PROMPTS\schedule_import_prompt.md`

**Content:**
```markdown
# Schedule Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your syllabus.

---

I need you to extract schedule events from my course syllabus.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "type": "chapter" | "quiz" | "assignment" | "exam",
  "title": "string",
  "dueDate": "YYYY-MM-DD",
  "notes": "optional string or null"
}

Rules:
1. type must be EXACTLY one of: "chapter", "quiz", "assignment", "exam"
2. dueDate must be ISO format (YYYY-MM-DD) - if no date given, use null
3. title should be descriptive but concise
4. For chapters/topics, use the class date they're covered
5. Include ALL deadlines, exams, quizzes, and major topic dates
6. Return ONLY the JSON array, nothing else

Example output:
[
  {"type": "chapter", "title": "Module 1: Introduction", "dueDate": "2026-01-15", "notes": null},
  {"type": "quiz", "title": "Quiz 1 - Chapters 1-2", "dueDate": "2026-01-22", "notes": "Covers intro material"},
  {"type": "assignment", "title": "Case Study 1", "dueDate": "2026-01-29", "notes": null},
  {"type": "exam", "title": "Midterm Exam", "dueDate": "2026-02-15", "notes": "Chapters 1-5"}
]

Here's my syllabus:

[PASTE YOUR SYLLABUS BELOW THIS LINE]
```

---

## Step 5.2: Learning Objectives Import Prompt

**Save as:** `C:\pt-study-sop\JANUARY_26_PLAN\PROMPTS\lo_import_prompt.md`

**Content:**
```markdown
# Learning Objectives Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your LO document.

---

I need you to extract learning objectives from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "loCode": "string",
  "title": "string"
}

Rules:
1. loCode: Preserve original numbering if present (e.g., "LO-1.1", "4.2a", "3")
   - If no numbering exists, create sequential codes: "1", "2", "3"...
2. title: Keep the objective text exactly as written
3. One object per learning objective
4. Return ONLY the JSON array, nothing else

Example output:
[
  {"loCode": "1.1", "title": "Define the components of the musculoskeletal system"},
  {"loCode": "1.2", "title": "Explain the function of skeletal muscle"},
  {"loCode": "2.1", "title": "Identify the bones of the upper extremity"},
  {"loCode": "2.2", "title": "Describe the structure of synovial joints"}
]

Here are my learning objectives:

[PASTE YOUR LEARNING OBJECTIVES BELOW THIS LINE]
```

---

## Step 5.3: Module Import Prompt (Optional)

**Save as:** `C:\pt-study-sop\JANUARY_26_PLAN\PROMPTS\module_import_prompt.md`

**Content:**
```markdown
# Module Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your course outline.

---

I need you to extract course modules/units from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "name": "string"
}

Rules:
1. name: The module/unit/week title
2. Preserve the order from the source
3. Include all modules, units, or weeks
4. Return ONLY the JSON array, nothing else

Example output:
[
  {"name": "Module 1: Introduction to Exercise Physiology"},
  {"name": "Module 2: Energy Systems"},
  {"name": "Module 3: Cardiovascular Responses to Exercise"},
  {"name": "Module 4: Respiratory Responses to Exercise"}
]

Here's my course outline:

[PASTE YOUR COURSE OUTLINE BELOW THIS LINE]
```

---

## Step 5.4: Create Prompts Directory

**Commands:**
```powershell
mkdir C:\pt-study-sop\JANUARY_26_PLAN\PROMPTS
```

Then create the three files above with the content provided.

---

# MILESTONE 5 COMPLETE CHECKLIST

- [ ] PROMPTS directory created
- [ ] schedule_import_prompt.md created
- [ ] lo_import_prompt.md created
- [ ] module_import_prompt.md created (optional)
- [ ] Tested schedule prompt with real syllabus
- [ ] Tested LO prompt with real LO document

---

# MILESTONE 6: INGESTION TAB UI

**Goal:** Build the Brain page Ingestion tab

**Files to create/modify:**
- `C:\pt-study-sop\dashboard_rebuild\client\src\components\IngestionTab.tsx` (NEW)
- `C:\pt-study-sop\dashboard_rebuild\client\src\pages\brain.tsx` (MODIFY)

---

## Step 6.1: Create IngestionTab Component

**File:** `C:\pt-study-sop\dashboard_rebuild\client\src\components\IngestionTab.tsx`

**Content:** (This is a simplified version - can be enhanced later)

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { Course, Module, LearningObjective, ScheduleEvent } from "@shared/schema";

const SCHEDULE_PROMPT = `I need you to extract schedule events from my course syllabus.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "type": "chapter" | "quiz" | "assignment" | "exam",
  "title": "string",
  "dueDate": "YYYY-MM-DD",
  "notes": "optional string or null"
}

Rules:
1. type must be EXACTLY one of: "chapter", "quiz", "assignment", "exam"
2. dueDate must be ISO format (YYYY-MM-DD) - if no date given, use null
3. Return ONLY the JSON array, nothing else

Here's my syllabus:

[PASTE YOUR SYLLABUS BELOW]`;

const LO_PROMPT = `I need you to extract learning objectives from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "loCode": "string",
  "title": "string"
}

Rules:
1. loCode: Preserve original numbering if present, or create sequential "1", "2", "3"...
2. title: Keep the objective text exactly as written
3. Return ONLY the JSON array, nothing else

Here are my learning objectives:

[PASTE YOUR LOs BELOW]`;

export function IngestionTab() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [scheduleJson, setScheduleJson] = useState("");
  const [loJson, setLoJson] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.courses.getActive(),
  });

  // Fetch modules for selected course
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", selectedCourseId],
    queryFn: () => selectedCourseId ? api.modules.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  // Fetch LOs for selected course
  const { data: learningObjectives = [] } = useQuery({
    queryKey: ["learningObjectives", selectedCourseId],
    queryFn: () => selectedCourseId ? api.learningObjectives.getByCourse(selectedCourseId) : Promise.resolve([]),
    enabled: !!selectedCourseId,
  });

  // Import schedule mutation
  const importScheduleMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const events = JSON.parse(jsonStr);
      return api.scheduleEvents.createBulk(selectedCourseId, events);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleEvents"] });
      setScheduleJson("");
      setImportError(null);
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to import schedule");
    },
  });

  // Import LOs mutation
  const importLosMutation = useMutation({
    mutationFn: async (jsonStr: string) => {
      if (!selectedCourseId) throw new Error("Select a course first");
      const los = JSON.parse(jsonStr);
      return api.learningObjectives.createBulk(selectedCourseId, selectedModuleId, los);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learningObjectives"] });
      setLoJson("");
      setImportError(null);
    },
    onError: (err: any) => {
      setImportError(err.message || "Failed to import LOs");
    },
  });

  // Update module checklist
  const updateModuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Module> }) =>
      api.modules.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-bold text-green-400">Material Ingestion</h2>

      {/* Course Selector */}
      <div>
        <label className="block text-sm mb-1">Select Course</label>
        <select
          className="w-full bg-gray-800 border border-green-500 rounded p-2"
          value={selectedCourseId || ""}
          onChange={(e) => {
            setSelectedCourseId(e.target.value ? parseInt(e.target.value) : null);
            setSelectedModuleId(null);
          }}
        >
          <option value="">-- Select Course --</option>
          {courses.map((c: Course) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {importError && (
        <div className="bg-red-900/50 border border-red-500 rounded p-3 text-red-300">
          {importError}
        </div>
      )}

      {selectedCourseId && (
        <>
          {/* Schedule Import Section */}
          <div className="border border-green-500/30 rounded p-4">
            <h3 className="text-lg font-semibold mb-2">ðŸ“… Schedule Import</h3>
            <button
              onClick={() => copyToClipboard(SCHEDULE_PROMPT)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm mb-2"
            >
              Copy Prompt for ChatGPT
            </button>
            <p className="text-sm text-gray-400 mb-2">
              Paste the ChatGPT response (JSON array) below:
            </p>
            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 h-32 font-mono text-sm"
              placeholder='[{"type": "exam", "title": "...", "dueDate": "2026-01-20", "notes": null}]'
              value={scheduleJson}
              onChange={(e) => setScheduleJson(e.target.value)}
            />
            <button
              onClick={() => importScheduleMutation.mutate(scheduleJson)}
              disabled={!scheduleJson || importScheduleMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded mt-2"
            >
              {importScheduleMutation.isPending ? "Importing..." : "Import Schedule"}
            </button>
          </div>

          {/* Modules Section */}
          <div className="border border-green-500/30 rounded p-4">
            <h3 className="text-lg font-semibold mb-2">ðŸ“¦ Modules</h3>
            {modules.length === 0 ? (
              <p className="text-gray-400">No modules yet. Add modules manually or import.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Module</th>
                    <th className="text-center p-2">Files</th>
                    <th className="text-center p-2">NotebookLM</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m: Module) => (
                    <tr key={m.id} className="border-b border-gray-700">
                      <td className="p-2">{m.name}</td>
                      <td className="text-center p-2">
                        <input
                          type="checkbox"
                          checked={m.filesDownloaded}
                          onChange={(e) => updateModuleMutation.mutate({
                            id: m.id,
                            data: { filesDownloaded: e.target.checked }
                          })}
                        />
                      </td>
                      <td className="text-center p-2">
                        <input
                          type="checkbox"
                          checked={m.notebooklmLoaded}
                          onChange={(e) => updateModuleMutation.mutate({
                            id: m.id,
                            data: { notebooklmLoaded: e.target.checked }
                          })}
                        />
                      </td>
                      <td className="text-center p-2">
                        {m.filesDownloaded && m.notebooklmLoaded ? (
                          <span className="text-green-400">âœ… Ready</span>
                        ) : (
                          <span className="text-yellow-400">â³ Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* LO Import Section */}
          <div className="border border-green-500/30 rounded p-4">
            <h3 className="text-lg font-semibold mb-2">ðŸŽ¯ Learning Objectives Import</h3>
            
            <div className="mb-2">
              <label className="block text-sm mb-1">Target Module (optional)</label>
              <select
                className="w-full bg-gray-800 border border-gray-600 rounded p-2"
                value={selectedModuleId || ""}
                onChange={(e) => setSelectedModuleId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">-- No Module (Course-level) --</option>
                {modules.map((m: Module) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => copyToClipboard(LO_PROMPT)}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm mb-2"
            >
              Copy Prompt for ChatGPT
            </button>
            <p className="text-sm text-gray-400 mb-2">
              Paste the ChatGPT response (JSON array) below:
            </p>
            <textarea
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 h-32 font-mono text-sm"
              placeholder='[{"loCode": "1.1", "title": "Define..."}]'
              value={loJson}
              onChange={(e) => setLoJson(e.target.value)}
            />
            <button
              onClick={() => importLosMutation.mutate(loJson)}
              disabled={!loJson || importLosMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded mt-2"
            >
              {importLosMutation.isPending ? "Importing..." : "Import LOs"}
            </button>

            {/* Current LOs */}
            {learningObjectives.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Current LOs ({learningObjectives.length})</h4>
                <div className="max-h-48 overflow-y-auto">
                  {learningObjectives.map((lo: LearningObjective) => (
                    <div key={lo.id} className="text-sm py-1 border-b border-gray-700">
                      <span className="text-green-400">{lo.loCode}</span>: {lo.title}
                      <span className={`ml-2 text-xs px-1 rounded ${
                        lo.status === 'solid' ? 'bg-green-600' :
                        lo.status === 'in_progress' ? 'bg-yellow-600' :
                        lo.status === 'need_review' ? 'bg-orange-600' :
                        'bg-gray-600'
                      }`}>
                        {lo.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Step 6.2: Add Ingestion Tab to Brain Page

**File:** `C:\pt-study-sop\dashboard_rebuild\client\src\pages\brain.tsx`

**Step 6.2a:** Add import at top of file:
```typescript
import { IngestionTab } from "../components/IngestionTab";
```

**Step 6.2b:** Find the tabs array/state and add "INGESTION" tab

Look for where tabs are defined (likely a state or array like `["SESSION EVIDENCE", "DERIVED METRICS", "ISSUES LOG"]`)

Add `"INGESTION"` to the tabs.

**Step 6.2c:** Add the tab content rendering

Find where tab content is conditionally rendered and add:
```tsx
{activeTab === "INGESTION" && <IngestionTab />}
```

---

## Step 6.3: Verify Tab Works

**Commands:**
```powershell
cd C:\pt-study-sop
Start_Dashboard.bat
```

**Test:**
1. Open http://localhost:5000/brain
2. Click on "INGESTION" tab
3. Select a course
4. Verify prompts can be copied
5. Test importing sample JSON

---

# MILESTONE 6 COMPLETE CHECKLIST

- [ ] IngestionTab.tsx created
- [ ] Component imported in brain.tsx
- [ ] Tab added to Brain page tabs
- [ ] Tab content renders when selected
- [ ] Course selector works
- [ ] Copy prompt buttons work
- [ ] JSON import works (test with sample data)
- [ ] Module checklist updates work

---

# TONIGHT'S MINIMUM VIABLE PATH

If you want to start studying TONIGHT, complete these milestones in order:

1. âœ… **Milestone 1** - Schema (30 min)
2. âœ… **Milestone 2** - Storage (45 min)
3. âœ… **Milestone 3** - Routes (30 min)
4. âœ… **Milestone 4** - API Client (15 min)
5. â¸ï¸ **Milestone 5** - Prompts (10 min) - Can use prompts manually
6. â¸ï¸ **Milestone 6** - UI (Optional tonight)

**After Milestones 1-4:**
- You can use ChatGPT with the prompts to generate JSON
- You can import via curl or API directly
- You can study while the UI is being built

---

*Document created: January 23, 2026*
*Total estimated time: 2-3 hours for all milestones*

