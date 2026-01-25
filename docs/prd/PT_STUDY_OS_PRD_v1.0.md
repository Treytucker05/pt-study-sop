# PT Study OS — Product Requirements Document (PRD) v1.0

**Repo:** `pt-study-sop`  
**Status:** Draft (ready to implement)  
**Last updated:** 2026-01-25 (America/Chicago)  

## 0. Executive summary

PT Study OS is a local-first study system that turns each study session into structured evidence, learning artifacts, and a continuous improvement loop:

**Tutor (Custom GPT)** → generates **WRAP** (truth-based session record) →  
**Brain** ingests and stores it, computes metrics, generates flashcards, proposes safe Obsidian updates →  
**Scholar** (manual button) audits how you learn, questions the SOP/dashboard, asks you clarifying questions when blocked, and produces proposals →  
You accept/edit/deny proposals → loop returns to Tutor.

**Calendar** is downstream: Brain ingests schedules/objectives first, then projects them into Google Calendar/Tasks with a preview-first workflow.

---

## 1. Core principles

1. **Truth over completeness (no fabricated fill)**
   - WRAP only includes what actually happened.
   - If not touched or irrelevant: leave blank or `N/A`.
   - No guessing to “complete the form.”

2. **Flexibility inside structure**
   - Tutor follows SOP structure and rules, but adapts to time limits and session flow.

3. **Brain is the system of record**
   - All session data, syllabi, modules, learning objectives, tasks are ingested into Brain first.
   - Calendar is a projection of Brain state, not the source-of-truth.

4. **Human-in-the-loop for external writes**
   - Calendar edits are preview-first with accept/edit/decline.
   - Obsidian updates are patch-based (diff) and require approval before applying.

5. **Scholar does not implement changes automatically**
   - Scholar creates questions and proposals; you approve/edit/deny.
   - Accepted proposals move into “Planned Implementations” (implementation is manual for now).

---

## 2. Users

- **Primary user:** Trey (single-user system, local-first)
- **Secondary user:** Scholar agent (consumer of SOP + Brain telemetry; creates questions/proposals)

---

## 3. System components and responsibilities

### 3.1 Tutor (Custom GPT)
**Role:** run tutoring guided by SOP; output WRAP at session end.

Tutor must output:
- Notes covered (what was actually studied)
- Flashcards (at minimum: drafts)
- Issues with the system (friction points, failures, confusion)
- Tutor reflection: what went well / needs improvement
- Session grade signals (for learning style analysis)
- Research hooks for Scholar (what to investigate)
- User-injected questions section (you can add items for the loop)
- Optional “Deep Research hooks” (things you’ll run via external deep research and feed back)

Tutor should **ask follow-up questions** when required data is missing and it is still feasible during the session.

---

### 3.2 Brain (dashboard + DB + ingestion + artifact generation)
**Role:** canonical ingestion + storage + metrics + artifact generation + projections.

Brain must:
- Ingest session WRAP (CLI initially; dashboard ingestion later)
- Store raw WRAP and parsed data
- Compute metrics snapshots usable by Scholar
- Generate flashcards with confidence gating (auto-publish high confidence; otherwise drafts)
- Create Obsidian patches/diffs for approval (no auto-merge/apply without approval)
- Ingest syllabus/modules/objectives via Brain page ingestion and store them
- Project schedule data into Calendar (local calendar) + Tasks + dashboard assignment views

**Minimum ingest requirement:** `course/class` and `minutes_studied`

---

### 3.3 Scholar (manual button)
**Role:** improvement engine.

Scholar must:
- Read Brain telemetry (metrics + session artifacts)
- Question the SOP/dashboard/system to find gaps and weaknesses
- Research and plan improvements (pedagogy, meta-learning, code, metrics, etc.)
- If blocked by missing info: create “Questions for Trey” on the dashboard

**Important behavior constraint:**  
If Scholar is blocked, it **asks questions only**; it does **not** generate proposals until the required inputs are answered.

Scholar outputs:
- “What’s working / what’s not”
- Proposed study plan improvements
- Proposed system improvements
- Proposals (once not blocked)

---

### 3.4 Dashboard
**Role:** operational command center.

Key pages/tabs:
- **Brain page:** ingestion (sessions + syllabus/modules/objectives) and evidence table, metrics, outputs.
- **Scholar page:** run button, questions for Trey, proposals, planned implementations.
- **Tutor page (NEW): SOP Explorer**
  - Replaces “dashboard tutor UI” with a structured breakdown of SOP content (read-only).
  - Purpose: make SOP easily viewable for you and Scholar and enable deep linking from Scholar proposals/questions.

---

### 3.5 Calendar (Google Calendar + Google Tasks)
**Role:** projection and control surface for schedule and study tasks.

Calendar must:
- Read/write calendar events and tasks
- Support plain-language interaction via LLM planner **with preview-first**
- Allow accept/edit/decline of a change plan
- Project syllabus items to:
  - **Local Calendar** events (class times, labs, etc.)
  - **School tasks** (quizzes, assignments, exams)
  - **Assignments window** in dashboard

---

## 4. Canonical workflows

### 4.1 Daily session loop (v1)
1. Open **Tutor (Custom GPT)**
2. Run session guided by SOP
3. Produce WRAP (truth-based)
4. Ingest WRAP into Brain (CLI for now)
5. Brain updates:
   - evidence table (session record)
   - metrics snapshot
   - flashcards drafts/published
   - Obsidian patch (pending approval)
   - Scholar packet
6. Press **Run Scholar**
7. Scholar:
   - asks questions if blocked (dashboard list)
   - otherwise produces proposals
8. You accept/edit/deny proposals
9. Return to Tutor for next session

### 4.2 Syllabus/modules/objectives ingestion loop (Brain page)
1. Brain page provides a prompt generator for converting a source file to JSON
2. You feed the prompt + syllabus to ChatGPT to produce JSON
3. Paste JSON into Brain ingestion window
4. Brain validates and stores it (deterministic; no LLM required)
5. Brain projects it to calendar/tasks + dashboard views

---

## 5. Data contracts

### 5.1 WRAP JSON (Session) — v1 (minimum viable)
**Required fields**
- `course` (string)
- `minutes_studied` (number)

**Recommended fields**
- `session_date` (YYYY-MM-DD)
- `notes_covered[]` (strings or objects)
- `flashcards[]` (draft cards; structure defined by Brain)
- `system_issues[]` (strings/objects)
- `tutor_reflection` (object: what_went_well, needs_improvement)
- `session_grade` (object: scale + dimensions)
- `scholar_research_hooks[]`
- `user_injected_questions[]`
- `deep_research_hooks[]`

**Policy**
- If not touched/relevant → blank or `N/A`
- If required but unknown during session → Tutor asks follow-up; otherwise leave blank

### 5.2 Scholar Question
- `id`
- `question_text`
- `context` (what triggered it)
- `answer_type`: `text` (default) | `multiple_choice` (only when needed)
- `choices[]` (optional)
- `status`: `open | answered | archived`
- `answer_text` (optional)

### 5.3 Proposal
Minimum fields:
- `title`
- `problem`
- `evidence`
- `proposed_change`
- `expected_benefit`
- `acceptance_test`
- `status`

Lifecycle states:
`Draft → Needs Your Input → Ready for Review → Accepted → Implemented → Rejected`

On **Accepted** (v1):
- move to “Planned Implementations” only (no auto issue creation yet)

### 5.4 Syllabus / Modules / Objectives JSON (v1)
Minimum week payload:
- `week_number`
- `topics[]`
- `objectives[]`
- `class_meetings[]` (date/time optional)
- `assessments[]` (quizzes/exams with date/time)
- `assignments[]` (title + due date)
- `required_resources[]`

---

## 6. Functional requirements

### 6.1 Tutor requirements
- F-T1: SOP-guided tutoring with flexibility
- F-T2: WRAP includes only what was done; no invented sections
- F-T3: Always includes (even if short session):
  - notes covered
  - flashcards draft
  - system issues encountered
  - tutor reflection
  - session grade signals
  - scholar hooks
  - user-injected questions section

### 6.2 Brain requirements
- F-B1: ingest minimum viable session (`course`, `minutes_studied`)
- F-B2: multiple ingestion paths:
  - CLI ingestion (now)
  - Brain page JSON paste ingestion (deterministic)
  - optional LLM assist: plain language → JSON (preview)
  - edit path: plain language edits → JSON patch (preview)
- F-B3: duplicates warn; user chooses outcome
- F-B4: flashcards confidence gating:
  - auto-publish if high confidence
  - otherwise draft
- F-B5: Obsidian updates are patch-based and require approval
- F-B6: syllabus/modules/objectives ingestion happens on Brain page; projections go to calendar/tasks

### 6.3 Scholar requirements
- F-S1: manual run button
- F-S2: if blocked, ask questions only (no proposals)
- F-S3: proposals are reviewable and editable by you
- F-S4: accepted proposals go to planned implementations only

### 6.4 Calendar requirements
- F-C1: preview-first change plans (accept/edit/decline)
- F-C2: syllabus projection mapping:
  - events → Local calendar
  - quizzes/assignments/exams → School tasks + dashboard assignments window
- F-C3: natural-language interface exists as the long-term goal (full CRUD)

### 6.5 Dashboard requirements
- F-D1: Tutor page becomes SOP Explorer (read-only SOP breakdown + deep links)
- F-D2: Scholar page can link to SOP sections (SOPRef deep links)
- F-D3: Brain page houses ingestion for sessions and syllabus/objectives

---

## 7. MVP definition (next thing to ship)

**MVP:** Tutor → WRAP → CLI ingest → Brain stores session evidence and updates dashboard evidence table.

This is the minimum needed to start collecting data and studying with system feedback.

---

## 8. Milestones (implementation roadmap)

### Milestone 1 — Session ingestion MVP (data collection)
- M1.1 WRAP v1 contract + examples
- M1.2 Ingestion accepts minimum fields; stores raw WRAP
- M1.3 Duplicate detection + warning
- M1.4 Evidence table filters (date + semester)

### Milestone 2 — Tutor page SOP Explorer (view + Scholar linking)
- M2.1 SOP index manifest + validator
- M2.2 Flask SOP API (`/api/sop/index`, `/api/sop/file`) allowlist-based
- M2.3 Tutor page UI replaced with SOP Explorer
- M2.4 Deep link anchors + “Copy SOPRef”
- M2.5 Scholar page renders SOPRef links

### Milestone 3 — Syllabus/modules/objectives ingestion (Brain page)
- M3.1 JSON schema + validator
- M3.2 Brain ingestion UI (prompt generator + paste JSON + preview + commit)
- M3.3 Dashboard syllabus view (by week/module)

### Milestone 4 — Calendar projection + NL interface (preview-first)
- M4.1 Projection rules: syllabus → local calendar + tasks + dashboard assignments window
- M4.2 Calendar change plan preview UI
- M4.3 NL → plan → accept/edit/decline → apply

---

## 9. Open items (to be decided during implementation)
- Semester 1/2 date ranges
- Course list for Semester 2
- “High confidence” criteria for auto-publishing flashcards
- Where proposals/questions are stored (DB vs markdown vs both)

---
