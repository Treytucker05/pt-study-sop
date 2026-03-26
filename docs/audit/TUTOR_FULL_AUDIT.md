# PT Study Tutor — Complete System Audit

> **Date**: 2026-03-09
> **Scope**: Every moving part of the Adaptive Tutor feature, explained in plain English.
> **Audience**: Anyone — no coding knowledge required.
>
> **Historical note**: this audit describes the pre-shell, wizard-led Tutor surface. It is preserved as historical evidence only. Current product authority lives in `README.md`, runtime wiring lives in `docs/root/PROJECT_ARCHITECTURE.md`, and Tutor launch cleanup evidence lives in `conductor/tracks/tutor-launch-shell-realignment_20260313/`.

---

## Table of Contents

1. [Overall Architecture](#1-overall-architecture)
2. [Data Model & Persistence](#2-data-model--persistence)
3. [Launch & Wizard Flow](#3-launch--wizard-flow)
4. [System Prompt Building](#4-system-prompt-building)
5. [Chat & Streaming Engine](#5-chat--streaming-engine)
6. [Retrieval & Grounding](#6-retrieval--grounding)
7. [Timer, Artifacts, Buttons & Modes](#7-timer-artifacts-buttons--modes)
8. [End Session & Ship to Brain](#8-end-session--ship-to-brain)
9. [All Known Gaps & Why They Exist](#9-all-known-gaps--why-they-exist)
10. [One-Page Summary Diagram](#10-one-page-summary-diagram)

---

## 1. Overall Architecture

### What the Tutor Actually Is

The PT Study Tutor is a web-based AI study partner designed specifically for physical therapy education. It is not a generic chatbot — it is an opinionated teaching system that knows about your course materials, your Obsidian vault notes, your learning objectives, and your study method chain. It sits inside the PT Study dashboard at the `/tutor` route and is the most complex feature in the entire system.

### The Three Layers

Think of the Tutor as a three-layer sandwich:

**Layer 1 — The Browser (Frontend)**
This is what you see and interact with. It runs in your web browser as a React application. The main page (`tutor.tsx`) divides the screen into three panels:

- **Left panel**: The Content Filter / Wizard — where you pick your course, week, materials, and study method before starting.
- **Center panel**: The Chat (`TutorChat.tsx`) — where you type questions and the tutor responds.
- **Right panel**: Artifacts (`TutorArtifacts.tsx`) — where concept maps, notes, tables, and other study outputs appear.

When you type a message and hit Send, the browser sends an HTTP request to the backend and starts listening for a stream of response chunks.

**Layer 2 — The Server (Backend)**
This is a Python Flask application that runs on your local machine. The main file is `brain/dashboard/api_tutor.py` — a single file of roughly 9,100 lines that contains 27+ API endpoints under the `/api/tutor/*` URL prefix. This is where all the intelligence lives:

- It decides what study materials to inject into the AI's context.
- It builds the system prompt that tells the AI how to behave.
- It calls the LLM (Large Language Model) and streams the response back.
- It tracks your session state, saves artifacts to your Obsidian vault, and logs every turn.

**Layer 3 — The AI Model (LLM)**
The actual language model that generates responses. Currently this is `gpt-5.3-codex` (for "Deep Think" mode or legacy requests) or `gpt-5.3-codex-spark` (a faster, lighter model used when all speed-tier toggles are off). The backend talks to these models through the OpenRouter API.

### How a Single Chat Turn Flows

Here is exactly what happens when you type "What is the basal ganglia?" and press Enter:

1. **Browser** captures your text, disables the input box, adds your message to the chat, and creates a placeholder for the AI's response.

2. **Browser** sends an HTTP POST to `/api/tutor/session/{session-id}/turn` with your message, plus metadata: which materials are selected, which speed-tier toggles are on (Materials, Obsidian, Web Search, Deep Think, Gemini Vision), your accuracy profile (Balanced/Strict/Coverage), and any behavior override (Socratic, Evaluate, Concept Map, Teach-Back).

3. **Server** receives the request and enters the `send_turn()` function. It parses all the metadata, then calls an inner function called `generate()`.

4. **`generate()` retrieves context**: It calls `build_context()` which looks up your selected study materials (either loading them in full or doing a vector similarity search), searches your Obsidian vault notes, and reads the vault state (existing notes list). It also optionally queries a knowledge graph for concept relationships.

5. **`generate()` builds the system prompt**: It assembles a multi-section instruction document that tells the AI who it is, what rules to follow, what study method block is active, what chain position the student is at, what materials were found, and dozens of conditional sections (see Section 4 below for the full breakdown).

6. **Server** sends the system prompt + your question + conversation history to the LLM via the OpenRouter API, requesting a streaming response.

7. **Server** receives tokens one at a time from the LLM and forwards each one to the browser as an SSE (Server-Sent Events) chunk. Each chunk is a tiny JSON object like `{"type": "token", "content": "The "}`.

8. **Browser** receives each chunk and appends it to the assistant's message bubble in real time, creating the "typing" effect you see.

9. When the LLM finishes, the **server** sends a final `{"type": "done"}` chunk that includes citations, the model name, retrieval debug info, any verdict data (for Evaluate mode), mastery updates, and detected artifacts.

10. **Browser** finalizes the message, checks for auto-detected tables or Mermaid diagrams, and pushes any artifacts to the right panel.

11. **Server** saves the turn to the `tutor_turns` database table and optionally updates mastery tracking.

### File Map

| File | Lines | Role |
|------|-------|------|
| `brain/dashboard/api_tutor.py` | ~9,100 | The backend brain — all 27+ endpoints, session management, turn processing, preflight, vault sync |
| `brain/tutor_prompt_builder.py` | 283 | Builds the base system prompt with rules, chain/block sections, guardrails |
| `brain/tutor_context.py` | 452 | Unified retrieval — fetches materials, notes, vault state, course map |
| `brain/tutor_rag.py` | ~500 | RAG (Retrieval-Augmented Generation) — ChromaDB vector search + reranker |
| `brain/tutor_streaming.py` | 104 | SSE formatting — turns LLM output into streamable chunks |
| `brain/tutor_chains.py` | ~300 | LangChain integration for chain-based generation |
| `dashboard_rebuild/client/src/pages/tutor.tsx` | ~1,300 | Main tutor page — 3-panel layout, session lifecycle |
| `dashboard_rebuild/client/src/components/TutorChat.tsx` | 409 | Chat UI — input box, speed tiers, behavior overrides, sources button |
| `dashboard_rebuild/client/src/components/useSSEStream.ts` | 434 | SSE streaming hook — sends messages, parses stream chunks |
| `dashboard_rebuild/client/src/components/TutorWizard.tsx` | 1,017 | Session setup wizard — course/week/material/chain selection |
| `dashboard_rebuild/client/src/components/TutorChainBuilder.tsx` | 309 | Method chain selection UI |
| `dashboard_rebuild/client/src/components/MaterialSelector.tsx` | 628 | Material picker with search, type filters, selection |
| `dashboard_rebuild/client/src/components/MessageList.tsx` | 408 | Renders chat message bubbles with markdown, citations, verdicts |
| `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` | ~900 | Right panel — displays notes, maps, tables, code artifacts |
| `dashboard_rebuild/client/src/components/SourcesPanel.tsx` | ~400 | Slide-out panel for material/vault selection during chat |

### Key Design Decisions

**Why one giant `api_tutor.py` file?**
This file grew organically as features were added. It contains private helper functions (prefixed with `_`) that are only used internally, plus public endpoint functions. While it would benefit from splitting into modules, everything being in one file means every function can call every other function without import gymnastics. The tradeoff is readability vs. convenience.

**Why SSE instead of WebSockets?**
Server-Sent Events are simpler than WebSockets for one-way streaming (server → browser). Since the student sends a message and then just listens for the response, SSE is a perfect fit. It works over regular HTTP, doesn't need special server configuration, and the browser handles reconnection automatically.

**Why two model tiers?**
`gpt-5.3-codex` is more capable but slower and more expensive. `gpt-5.3-codex-spark` is faster and cheaper. When you turn off all the speed-tier toggles (no materials, no Obsidian, no web search, no deep think, no Gemini vision), the system uses the Spark model because you're just having a quick chat — no need for the heavy model. The moment you turn on Deep Think or use the legacy mode (no explicit mode flags), it upgrades to the full Codex model.

---

## 2. Data Model & Persistence

### Where Data Lives

The Tutor stores data in three places:

1. **SQLite Database** (`brain/data/pt_study.db`) — The main database for everything: sessions, turns, materials, objectives, method chains, mastery tracking.
2. **ChromaDB** (`brain/data/chroma_tutor/`) — A vector database used for similarity search over study materials. When you ask "What is proprioception?", ChromaDB finds the most relevant chunks of your uploaded PDFs.
3. **Obsidian Vault** (your configured vault path) — Markdown files containing your notes, concept maps, learning objectives, and the Map of Contents pages that the Tutor reads and writes.

### Database Tables (Complete List)

Here is every table the Tutor uses, what each column means, and why it exists:

#### `tutor_sessions` — One row per study session

| Column | Type | Purpose |
|--------|------|---------|
| `session_id` | TEXT | Unique ID like `tutor-20260309-143022-a7b3c1`. Format: `tutor-YYYYMMDD-HHMMSS-<6 random hex chars>` |
| `brain_session_id` | INTEGER | Links to the main `sessions` table after the session ends. NULL while active. |
| `codex_thread_id` | TEXT | Legacy field for Codex API thread tracking. Rarely used now. |
| `last_response_id` | TEXT | ID of the most recent LLM response (for conversation continuity). |
| `course_id` | INTEGER | Which course this session belongs to (foreign key to `courses`). |
| `phase` | TEXT | Current study phase (e.g., "Core", "Review"). |
| `topic` | TEXT | Human-readable topic name like "Week 9 - Basal Ganglia". |
| `content_filter_json` | TEXT | JSON blob storing the full content filter: selected materials, vault folders, accuracy profile, north star/map of contents data, reference targets, default mode flags. |
| `status` | TEXT | One of: `active`, `completed`, `abandoned`. |
| `turn_count` | INTEGER | How many back-and-forth exchanges have happened. |
| `artifacts_json` | TEXT | JSON array of artifacts created during the session (notes, maps, tables). |
| `lo_ids_json` | TEXT | JSON array of learning objective IDs active in this session. |
| `summary_text` | TEXT | Auto-generated session summary (populated at end). |
| `started_at` | TIMESTAMP | When the session was created. |
| `ended_at` | TIMESTAMP | When the session was ended (NULL while active). |
| `method_chain_id` | INTEGER | Which study method chain is being used (foreign key to `method_chains`). |

#### `tutor_turns` — One row per question-answer exchange

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Auto-incrementing primary key. |
| `session_id` | TEXT | Legacy session ID field. |
| `user_id` | INTEGER | Who asked the question. |
| `course_id` | INTEGER | Which course context. |
| `topic_id` | INTEGER | Topic reference. |
| `mode` | TEXT | Which study mode was active (e.g., "Core", "Socratic"). |
| `turn_number` | INTEGER | Sequential turn count within the session. |
| `question` | TEXT | The student's message. |
| `answer` | TEXT | The tutor's complete response. |
| `citations_json` | TEXT | JSON array of citations extracted from the response. |
| `response_id` | TEXT | The LLM's response ID for tracking. |
| `model_id` | TEXT | Which model generated this response (e.g., `gpt-5.3-codex-spark`). |
| `unverified` | BOOLEAN | Whether the response contains unverified claims. |
| `source_lock_active` | BOOLEAN | Whether source-lock mode was active (restricting to materials only). |
| `tutor_session_id` | TEXT | Links to `tutor_sessions.session_id`. |
| `phase` | TEXT | Study phase at the time of this turn. |
| `artifacts_json` | TEXT | JSON of any artifacts detected or created in this turn. |

#### `learning_objectives` — Study goals per course/module

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Primary key. |
| `course_id` | INTEGER | Which course owns this objective. |
| `module_id` | INTEGER | Which module/week (nullable). |
| `lo_code` | TEXT | Short code like `OBJ-1`, `OBJ-2`. Unique per course. |
| `title` | TEXT | Full description: "Identify the major components of the basal ganglia." |
| `status` | TEXT | `active`, `completed`, `deferred`, etc. |
| `last_session_id` | TEXT | Last session that worked on this objective. |
| `group_name` | TEXT | Module name like "Week 9 - Basal Ganglia" for grouping. |
| `managed_by_tutor` | BOOLEAN | Whether the Tutor created/manages this objective (vs. manually added). |

#### `tutor_session_learning_objectives` — Junction table

Links sessions to objectives. Has a UNIQUE constraint on `(tutor_session_id, lo_id)` to prevent duplicates. This lets the system know which objectives were being studied in each session.

#### `rag_docs` — Uploaded study materials

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Primary key. |
| `source_path` | TEXT | Original file path or URL. |
| `course_id` | INTEGER | Which course this material belongs to. |
| `content` | TEXT | Full extracted text content of the document. |
| `checksum` | TEXT | Hash for deduplication — prevents uploading the same file twice. |
| `metadata_json` | TEXT | Extra metadata (e.g., `video_material_id` for docs linked to MP4s). |
| `corpus` | TEXT | Usually `materials` — distinguishes from other document types. |
| `file_type` | TEXT | `pdf`, `mp4`, `docx`, `txt`, etc. |
| `file_size` | INTEGER | File size in bytes. |
| `enabled` | BOOLEAN | Whether this material is active/visible. |

#### `rag_embeddings` — Vector search index

| Column | Type | Purpose |
|--------|------|---------|
| `rag_doc_id` | INTEGER | Which document this chunk came from. |
| `chunk_index` | INTEGER | Position of this chunk within the document. |
| `chunk_text` | TEXT | The actual text of this chunk (typically ~1000 characters). |
| `embedding_model` | TEXT | Always `text-embedding-3-small` (OpenAI's embedding model). |
| `chroma_id` | TEXT | The ID in ChromaDB's vector store. |
| `token_count` | INTEGER | How many tokens this chunk uses. |

#### `tutor_block_transitions` — Method chain progress tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Primary key. |
| `tutor_session_id` | TEXT | Which session. |
| `block_id` | INTEGER | Which method block (foreign key to `method_blocks`). |
| `block_index` | INTEGER | Position in the chain (0, 1, 2, ...). |
| `started_at` | TIMESTAMP | When this block became active. |
| `ended_at` | TIMESTAMP | When the student moved to the next block (NULL if current). |
| `turn_count` | INTEGER | How many turns were spent on this block. |
| `outcome` | TEXT | How the block ended (completed, skipped, etc.). |
| `notes` | TEXT | Any notes about this block's execution. |
| `block_slug` | TEXT | Machine-readable block name for lookups. |

#### `error_logs` — Learning error tracking

Tracks types of errors the student makes during study sessions. Error types include: Recall, Confusion, Rule, Representation, Procedure, Computation, Speed, None. Each error has a confidence rating (High/Medium/Low) and optionally the time it took to answer.

#### `tutor_issues` — Quality tracking

Tracks issues with tutor responses: hallucination, formatting errors, incorrect facts, unprompted artifacts. Each has a severity and whether it was resolved. This is for system quality monitoring.

#### `session_chains` — Multi-session chain tracking

Groups multiple sessions under a single study chain. Stores the chain name, course, topic, and a JSON array of session IDs. Status tracks whether the chain is still active or completed.

#### `tutor_delete_telemetry` — Deletion audit log

Records every delete request: what was requested, how many items were actually deleted, how many were skipped or failed. Exists for safety — ensures nothing gets silently lost.

### How Data Flows

```
Student uploads PDF → text_extractor.py extracts text → saved to rag_docs table
                    → tutor_rag.py chunks the text → saved to rag_embeddings + ChromaDB

Student starts session → tutor_sessions row created
                       → learning_objectives linked via junction table
                       → method chain linked via method_chain_id

Student sends message → tutor_turns row created with question
                      → LLM responds → answer saved to same row
                      → artifacts detected → artifacts_json updated

Student ends session → brain session record created in sessions table
                     → vault graph synced
                     → Map of Contents refreshed
                     → method ratings auto-captured
```

---

## 3. Launch & Wizard Flow

### What Happens Before You Can Chat

You cannot just open the Tutor and start typing. The system needs to know:
- What course are you studying?
- What week/module are you on?
- Which materials should the AI reference?
- What study method chain do you want to follow?
- What learning objectives are you targeting?

The **Tutor Wizard** (`TutorWizard.tsx`) collects all this information in a guided step-by-step flow.

### Wizard Steps

**Step 1: Course Selection**
You pick your course from a dropdown. This filters everything else — materials, modules, objectives — to that course only.

**Step 2: Study Unit Selection**
You pick the week or module (e.g., "Week 9 - Basal Ganglia"). This becomes the `topic` for the session and determines which vault folder to look in for existing notes.

**Step 3: Material Selection**
The `MaterialSelector.tsx` component shows all materials uploaded for this course. You can search, filter by type (PDF, MP4, DOCX), and check/uncheck individual files. Selected materials will be injected into the AI's context.

**Step 4: Chain Selection**
The `TutorChainBuilder.tsx` component shows available study method chains. Each chain is a sequence of method blocks (like "Map of Contents → Story Confidence → Layered Narrative → Anchor Page → Gentle Recall → Teach-Back"). You pick one, and it determines the structure of your study session.

**Step 5: Preflight Check**
Before the session can start, the system runs a "preflight" validation. This is a backend call to `/api/tutor/session/preflight` that checks:

- **Course ID exists?** If not → blocker.
- **Study unit selected?** If not → blocker.
- **Materials selected?** If zero materials → blocker.
- **Learning objectives exist?** If the database has zero objectives for this module → the system tries to auto-import them from the Obsidian vault file (`Learning Objectives & To Do.md`). If auto-import succeeds, it continues. If it fails → blocker telling you to save objectives first.
- **Focus objective selected?** (Only if using "single_focus" scope) If not → blocker.

Each blocker has a code (like `APPROVED_OBJECTIVES_REQUIRED`) and a human-readable message. The wizard shows these as red warning boxes and prevents you from starting until they're resolved.

### The Auto-Import Safety Net

This deserves special attention because it was added recently to fix a real problem.

**The problem**: Objectives only flowed one direction — from the Tutor LLM into the database, then synced to the Obsidian vault. If the database lost its objectives (corruption, accidental deletion, fresh install), the vault's copy was stranded. The preflight blocker would fire even though perfectly good objectives existed in your Obsidian vault.

**The fix**: `_try_import_objectives_from_vault()` — a function that runs during preflight when the database has zero objectives but a vault file exists. It:

1. Reads the vault file at `{vault_folder}/Learning Objectives & To Do.md`
2. Parses bullet-point lines matching the pattern `- **OBJ-1 -- Description here.**`
3. Also parses legacy managed comment blocks from the old sync system
4. Upserts each objective into the `learning_objectives` table
5. Returns the imported objectives so the session can proceed

This is completely transparent to the user — the blocker simply doesn't fire because the objectives were auto-recovered.

### Session Creation

Once preflight passes, the wizard calls `/api/tutor/session/create` with all the collected configuration. The backend:

1. Validates the preflight result (no blockers).
2. Generates a session ID: `tutor-YYYYMMDD-HHMMSS-<6 random hex chars>`.
3. Parses the content filter — materials, accuracy profile, vault folders, force-full-docs flag, default mode flags.
4. Extracts learning objectives and their scope.
5. Optionally runs the **Selector Bridge** — an algorithm that picks the best study method chain based on your assessment mode, PERO stage, energy level, available time, class type, and prior exposure. It returns a `chain_id`, a score tuple, and a policy version.
6. Builds the **Map of Contents** context by calling `_ensure_moc_context()` — this syncs vault pages for the week, reads reference targets, and ensures the learning objectives page is up to date.
7. Creates the `tutor_sessions` database row.
8. Links learning objectives via the junction table.
9. Returns the session ID to the frontend.

The frontend then switches from the Wizard view to the Chat view, and you can start asking questions.

---

## 4. System Prompt Building

### What Is a System Prompt?

Every time the AI generates a response, it receives two things: the **system prompt** (invisible instructions that tell it how to behave) and the **conversation** (your messages + its previous responses). The system prompt is like giving an actor their character description, motivation, and stage directions before the play begins.

The Tutor's system prompt is not a single static block of text. It is **assembled dynamically** for every single turn based on the current state of your session. It can be thousands of words long.

### The Assembly Pipeline

The system prompt is built in two stages:

**Stage 1: Base Prompt** (in `tutor_prompt_builder.py`)

The function `build_prompt_with_contexts()` assembles these sections:

1. **Identity & Session Context**
   ```
   You are the PT Study Tutor, a study partner for physical therapy education.
   Current session context:
   - Course: {course_id}
   - Topic: {topic}
   ```

2. **Core Rules** (always present, every session):
   - **Rule 1 — Hybrid Teaching Mode**: Prefer selected materials and mapped notes for factual claims. Use broader model knowledge for analogies and simplifications when it helps.
   - **Rule 2 — Truthful Provenance**: Never imply general knowledge came from course material. Label ungrounded claims as `[From training knowledge — verify with your textbooks]`.
   - **Rule 3 — Chunked Interaction**: Keep replies short (≤2 paragraphs or ≤6 bullets), teach one step at a time, end with a check-in.
   - **Rule 4 — Objective Lock**: Stay inside the active objective. Follow the current block as chain guidance.
   - **Rule 5 — Terminology Clarity**: Define abbreviations on first use (e.g., ACL = Anterior Cruciate Ligament).

3. **Custom Instructions** (optional): Loaded from `api_config.json` or `tutor_instructions.md`. These are additional rules you've configured.

4. **Current Activity Block** (if a method chain is active):
   The facilitation prompt from the current method block. For example, if you're on the "Layered Narrative" block, this might say:
   ```
   Build understanding in 3 layers:
   Layer 1 (ELI4): Explain the concept as if to a 4-year-old...
   Layer 2 (Mechanism): Add the biological mechanism...
   Layer 3 (Clinical): Connect to clinical relevance...
   ```
   This also includes chain overrides — allowed moves, forbidden moves, and required outputs specific to this block.

5. **Study Chain Position**:
   Shows where the student is in the chain:
   ```
   ## Study Chain: Top-Down Narrative Mastery v3
   ~~Map of Contents~~ -> **[CURRENT] Layered Narrative** -> Anchor Page -> Gentle Recall
   (Step 3 of 6)
   ```

6. **Chain Runtime Profile** (if configured):
   Metadata about how this chain should behave: teaching style, analogy policy, retrieval timing, provenance policy, confidence policy, output policy.

7. **Chain Guardrails** (if configured):
   Hard constraints: allowed modes, required reference targets, active gates (conditions that must be met before advancing), failure actions (what to do if a gate fails), tier exits (when to leave the current tier).

8. **Retrieved Study Materials**: The actual text content of your study materials, injected directly. This can be tens of thousands of words.

9. **Graph Context**: Concept relationships from the knowledge graph (if available).

10. **Course Structure**: The `vault_courses.yaml` file showing the full course tree, so the tutor can orient the student within their program.

11. **Vault State**: A list of existing notes in the current study folder plus the contents of `_Index.md`. This prevents the tutor from recreating notes that already exist.

**Stage 2: Conditional Sections** (in `api_tutor.py` `generate()`)

After the base prompt is built, the `generate()` function appends 15+ additional sections based on the current state. Each one is only added if its conditions are met:

1. **Session Rules**: Any custom rules configured for this specific session.

2. **Retrieval Tuning**: Based on the accuracy profile (Balanced/Strict/Coverage), adds guidance like "When citing evidence, require exact source match" (Strict) or "Prioritize breadth of coverage over precision" (Coverage).

3. **Map of Contents Context**: If learning objectives exist, adds the module name, objective IDs, path to the MoC page, and status. This grounds the tutor in what the student is supposed to be learning.

4. **Learning Objectives Page Link**: A direct link to the vault's Learning Objectives page so the tutor can reference or update it.

5. **Missing Learning Objectives Prompt**: During the first 5 turns, if no objectives exist, the tutor is told to extract them from the materials or ask the student what they're trying to learn. This is a self-healing mechanism.

6. **Map of Contents File Missing**: If the MoC page was deleted from the vault, tells the tutor to re-save it.

7. **Active Reference Bounds**: If the session has reference targets (specific sections of material to focus on), these are listed as boundaries the tutor should respect.

8. **PRIME Stage Guardrails**: If the current method stage is PRIME (the first cognitive stage), special rules apply: no scored checks, no retrieval grading. PRIME is about building initial familiarity, not testing.

9. **M-PRE-008 Contract**: If the active method block is "Structural Extraction" (M-PRE-008), injects specific instructions for that method's output format.

10. **PRIME Learning Objective Extraction**: If this is the first turn of a PRIME block, tells the tutor to extract learning objectives from the materials.

11. **Objective Scope**: Whether to cover all module objectives (`module_all`) or focus on a single one (`single_focus`), with specific instructions for each mode.

12. **Selected Material Scope**: Tells the tutor exactly how many materials are selected, their filenames, and the retrieval depth (full content vs. vector search). Example: "3 materials selected: Chapter-10.pdf, Lecture-9.mp4 transcript, Week-9-Notes.docx. Full content injected."

13. **Retrieval Escalation**: If the accuracy profile was automatically escalated (because retrieval quality was low), notes this for the tutor.

14. **Tooling**: Lists available tools the tutor can use: `save_to_obsidian` (write a note to the vault), `create_note` (create a new note), `create_anki_card` (generate a flashcard), `create_figma_diagram` (generate a visual diagram).

15. **Identity**: Tells the tutor what model it is, so it can disclose this if asked. Example: "You are running on gpt-5.3-codex-spark."

16. **Behavior Override Suffixes**: If a behavior mode is active, appends its structured output contract:
    - **Evaluate**: Adds `VERDICT_PROMPT_SUFFIX` — tells the tutor to assess the student's answer against specific criteria and emit a structured verdict JSON.
    - **Concept Map**: Adds `CONCEPT_MAP_PROMPT_SUFFIX` — tells the tutor to generate a Mermaid diagram.
    - **Teach-Back**: Adds `TEACH_BACK_PROMPT_SUFFIX` — tells the tutor to evaluate the student's explanation and emit a structured rubric JSON.
    - **Socratic**: Changes the tutor's behavior to respond only with questions, never direct answers.

17. **Adaptive Scaffolding Directive**: Based on the student's BKT (Bayesian Knowledge Tracing) mastery level, injects a scaffolding level. If mastery is low, it says "Provide more support, break concepts into smaller steps." If mastery is high, it says "Challenge the student, reduce scaffolding."

18. **Scholar-Recommended Methods**: If past session ratings suggest certain methods work well for this student, mentions them.

### Why So Many Sections?

Each section exists because the tutor's behavior needs to change based on context. A tutor studying neuroscience with Deep Think enabled and a Strict accuracy profile on the Teach-Back block of a Top-Down Narrative chain needs fundamentally different instructions than a tutor doing a quick chat about anatomy with no materials selected.

Rather than having one massive prompt that covers every case, the system composes the prompt from modular sections, only including what's relevant. This keeps the prompt focused and reduces token waste.

---

## 5. Chat & Streaming Engine

### The Frontend Side

**`TutorChat.tsx`** is the main chat component. Here is what it manages:

**State Variables**:
- `input` — what the student is currently typing
- `messages` — the full conversation history (array of user and assistant messages)
- `isStreaming` — whether a response is currently being generated
- `materialsOn`, `obsidianOn`, `webSearchOn`, `deepThinkOn`, `geminiVisionOn` — the five speed-tier toggles
- `behaviorOverride` — which behavior mode is active (socratic/evaluate/concept_map/teach_back/null)
- `isSourcesOpen` — whether the Sources panel is visible
- `selectedVaultPaths` — which Obsidian vault folders are selected
- `northStarSummary` — the Map of Contents data for the current session
- `materialsOverrideActive` — whether the user has manually toggled the Materials pill (overriding the session default)

**The Send Flow**:
When you press Enter or click the Send button:
1. The component calls `sendMessage()` from the `useSSEStream` hook.
2. The input is cleared immediately.
3. Your message is added to the `messages` array.
4. A placeholder assistant message is added with `isStreaming: true`.
5. The hook starts an HTTP fetch to the backend.

**`useSSEStream.ts`** is a React hook that handles the entire streaming lifecycle:

**Sending the Request**:
It POSTs to `/api/tutor/session/{sessionId}/turn` with this payload:
```json
{
  "message": "What is the basal ganglia?",
  "content_filter": {
    "material_ids": [42, 43, 57],
    "accuracy_profile": "balanced",
    "folders": ["Study Notes/Neuroscience/Week 9"]
  },
  "behavior_override": null,
  "mode": {
    "materials": true,
    "obsidian": false,
    "web_search": false,
    "deep_think": false,
    "gemini_vision": false
  }
}
```

**Parsing the Stream**:
The hook reads the response as a stream using `response.body.getReader()`. The backend sends lines like:
```
data: {"type": "token", "content": "The "}
data: {"type": "token", "content": "basal "}
data: {"type": "token", "content": "ganglia "}
...
data: {"type": "done", "citations": [...], "model": "gpt-5.3-codex-spark", ...}
data: [DONE]
```

Each line starting with `data: ` is parsed. The hook handles these chunk types:

| Type | What Happens |
|------|-------------|
| `token` | Text is appended to the assistant's message in real time |
| `done` | Final metadata extracted: citations, model, retrieval debug, verdict, teach-back rubric, mastery update, detected artifacts |
| `error` | Error message displayed in the chat and streaming stops |
| `tool_call` | Shows "Using {tool name}..." in the chat (e.g., "Using Obsidian Search...") |
| `tool_result` | Tracks whether the tool succeeded or failed |
| `web_search_searching` | Shows "Searching the web..." placeholder |
| `web_search_completed` | Clears the placeholder and resets for the actual response |

**Error Handling**:
- If any SSE chunks fail to parse as JSON, a warning is appended: "Some stream chunks were malformed. Retry if the answer is incomplete."
- If the stream ends without a `[DONE]` signal, a warning is appended: "The response stream ended before completion. Retry this request."
- If the HTTP request itself fails, the error message is shown in the chat: "Connection error: {message}"
- The stream can be aborted via an `AbortController` if the user navigates away.

**Auto-Detection**:
After the response is complete, the hook scans the full text for:
- **Markdown tables**: If found, automatically creates a "note" artifact in the right panel.
- **Mermaid code blocks**: If found (` ```mermaid ... ``` `), automatically creates a "map" artifact.

### The Backend Side

**`tutor_streaming.py`** is a small module (104 lines) that formats SSE chunks:

- `format_sse_chunk(type, content)` → `data: {"type": "token", "content": "..."}\n\n`
- `format_sse_done(citations, model, retrieval_debug, ...)` → `data: {"type": "done", ...}\n\n`
- `format_sse_error(message)` → `data: {"type": "error", "content": "..."}\n\n`

It also has `_map_error_to_actionable()` which translates cryptic API errors into human-readable messages:
- "Authentication expired" → "Your API key has expired. Re-authenticate."
- "Codex CLI not found" → "Install Codex CLI to use this feature."
- "Context length exceeded" → "The conversation is too long. Start a new session."
- "Rate limited" → "Too many requests. Wait a moment and try again."

**The `send_turn()` endpoint** in `api_tutor.py` is where the magic happens. Here is the detailed flow:

1. **Parse Content Filter** (lines 5214-5274):
   - Extract `reference_targets`, `follow_up_targets`, `enforce_reference_bounds`
   - Extract `objective_scope` and `focus_objective_id`
   - Extract `accuracy_profile` (default: "balanced")
   - Extract `material_ids` with optional expansion for linked materials
   - Determine `material_k` (how many vector search results to retrieve) via `_resolve_material_retrieval_k()`
   - Build `selected_material_labels` (human-readable filenames of selected materials)

2. **Parse Mode Flags** (lines 5296-5311):
   ```python
   _materials_on = bool(mode.get("materials", not mode_provided))
   _obsidian_on = bool(mode.get("obsidian", not mode_provided))
   _web_search_on = bool(mode.get("web_search", not mode_provided))
   _deep_think_on = bool(mode.get("deep_think", False))
   _gemini_vision_on = bool(mode.get("gemini_vision", False))
   ```
   The important nuance: if no `mode` object was sent (legacy clients), all sources default to ON. If a `mode` object was sent, each toggle defaults to OFF unless explicitly set. Deep Think and Gemini Vision always default to OFF.

3. **Select Model**:
   ```python
   _model = "gpt-5.3-codex" if (_deep_think_on or not mode_provided) else "gpt-5.3-codex-spark"
   _reasoning_effort = "high" if (_deep_think_on or not mode_provided) else None
   ```
   Deep Think = full model with high reasoning. All toggles off = Spark model with no explicit reasoning effort.

4. **Call `generate()`**: The inner function that actually retrieves context, builds the prompt, and streams the response (see Sections 4 and 6 for details on prompt building and retrieval).

5. **Stream the Response**: The `generate()` function yields SSE-formatted strings. Flask wraps these in a `Response` object with `mimetype="text/event-stream"` and streams them to the browser.

6. **Save the Turn**: After streaming completes, the turn is saved to `tutor_turns` with the question, answer, citations, model ID, and any artifacts.

---

## 6. Retrieval & Grounding

### Why Retrieval Matters

Without retrieval, the AI would answer every question from its general training data — which might be wrong, outdated, or irrelevant to your specific course materials. Retrieval means: "Before the AI answers, find the relevant chunks of YOUR study materials and give them to the AI as reference."

This is called RAG (Retrieval-Augmented Generation): retrieve first, then generate.

### The Unified Context System

`tutor_context.py` provides a single entry point: `build_context()`. It takes a query (your question) and returns a dictionary with four pieces of context:

| Key | What It Contains | Where It Comes From |
|-----|-----------------|-------------------|
| `materials` | Text from your uploaded study materials | ChromaDB vector search OR direct full-content load |
| `notes` | Relevant Obsidian vault notes | Obsidian vault CLI search |
| `vault_state` | List of existing notes + _Index.md content | Obsidian vault file listing |
| `course_map` | Full course structure from YAML | `brain/data/vault_courses.yaml` |

### Depth Levels

The `depth` parameter controls which sources are queried:

| Depth | Materials | Notes | Vault State | When Used |
|-------|-----------|-------|-------------|-----------|
| `auto` | ✅ | ✅ | ✅ | Default — full retrieval |
| `materials` | ✅ | ❌ | ❌ | When only Materials toggle is on |
| `notes` | ❌ | ✅ | ✅ | When only Obsidian toggle is on |
| `none` | ❌ | ❌ | ❌ | Simple follow-ups, no retrieval needed |

The backend determines depth based on the mode flags you toggled in the UI:
- Materials ON + Obsidian ON → `auto`
- Materials ON + Obsidian OFF → `materials`
- Materials OFF + Obsidian ON → `notes`
- Both OFF → `none` (but the tutor can still use its training knowledge)

### Material Retrieval: Two Strategies

**Strategy 1 — Full Content Injection** (≤10 selected files)

When you select a small number of files (10 or fewer), the system skips vector search entirely and loads the **complete text** of every selected file. This is the best approach because the AI sees everything — no important detail is missed by the search.

The budget is 200,000 characters (~50,000 tokens). If the total content of all files exceeds this, each file is proportionally truncated so every file gets fair representation. For example, if you have 3 files totaling 300,000 characters, each file gets roughly 66,666 characters (with a minimum of 500 characters per file).

**Strategy 2 — Vector Search** (>10 files or when full load fails)

For large selections, the system uses ChromaDB vector search:

1. Your question is converted to a numerical vector (embedding) using OpenAI's `text-embedding-3-small` model.
2. ChromaDB finds the chunks of your materials whose embeddings are most similar to your question's embedding.
3. A reranker (`cross-encoder/ms-marco-TinyBERT-L-2-v2`) re-scores the results for higher precision.
4. The top-k results (default: 6, adjustable by accuracy profile) are returned.

The accuracy profile affects retrieval:
- **Balanced**: k=6, standard retrieval
- **Strict**: k=4, fewer but more precise results, requires exact source matching
- **Coverage**: k=10, more results for broader coverage

### Linked Material Expansion

When you select an MP4 video file, the system automatically expands the selection to include any documents derived from that video (e.g., transcripts, extracted slides). This happens in `_expand_linked_material_ids()`:

1. Query all `rag_docs` in the materials corpus.
2. For each doc, check its `metadata_json` for a `video_material_id` field.
3. If that field matches one of your selected MP4s, include the derived doc in the selection.

This means selecting "Lecture 9.mp4" automatically includes "Lecture 9 Transcript.pdf" and "Lecture 9 Slides.pdf" without you having to find and select them manually.

### Obsidian Vault Notes

When the Obsidian toggle is on, the system searches your vault for notes related to your question:

1. Calls `ObsidianVault.search(query, limit=5)` — a CLI-based search that finds notes matching your question.
2. If a `module_prefix` is set (e.g., "Study Notes/Neuroscience/Week 9"), results from that folder are sorted to the top.
3. Each note is truncated to 2,000 characters to prevent context overflow.
4. The vault state is also fetched: a listing of all notes in the current folder (capped at 20) plus the content of `_Index.md` if it exists.

### Gemini Vision

When the Gemini Vision toggle is on AND you have MP4 materials selected, the system calls `_build_gemini_vision_context(material_ids)`. This uses Google's Gemini model (which can process video) to extract visual context from lecture recordings — diagrams, slides, whiteboard content — that text extraction would miss.

### GraphRAG-lite

The system also queries a knowledge graph via `hybrid_retrieve(question, adaptive_conn)`. This returns concept relationships — "basal ganglia connects to striatum, GPi, GPe, STN, substantia nigra" — that help the AI make accurate connections between concepts. This is especially useful for concept map generation.

### Web Search

When the Web Search toggle is on, the backend enables web search capabilities in the LLM call. The AI can search the internet for current information. During this phase:
1. The frontend receives a `web_search_searching` chunk and shows "Searching the web..."
2. When search results are incorporated, a `web_search_completed` chunk clears the placeholder.
3. The actual response then streams normally, grounded in both materials AND web results.

### Graceful Degradation

If material retrieval fails entirely (network error, database error, empty results), the system doesn't crash. Instead, it:
1. Injects a fallback instruction: "No study materials were retrieved. Teach from your training knowledge, but clearly mark all claims as `[From training knowledge — verify with your textbooks]`."
2. Logs the error in the debug output.
3. Continues with the response.

This means the tutor always works, even if retrieval has issues — it just becomes less grounded.

---

## 7. Timer, Artifacts, Buttons & Modes

### Speed Tier Toggles

The five pill-shaped buttons below the chat input control which retrieval and processing pipelines are active:

| Toggle | Emoji | What It Enables | Default |
|--------|-------|----------------|---------|
| Materials | 📚 | Search/inject your uploaded study materials | ON (if materials selected in wizard) |
| Obsidian | 🗂️ | Search your Obsidian vault notes | OFF |
| Gemini Vision | 🎬 | Send MP4 videos to Gemini for visual analysis | OFF |
| Web Search | 🔍 | Let the AI search the internet | OFF |
| Deep Think | 🧠 | Use the more powerful model with high reasoning effort | OFF |

**All off = chat-only mode**: Uses the faster `gpt-5.3-codex-spark` model with no retrieval. Good for quick follow-up questions where the AI already has enough context from the conversation.

**Materials toggle special behavior**: The Materials toggle has a "default" state set by the wizard. If the wizard determined materials should be on (because you selected files), it starts ON. If you manually toggle it off and back on, it enters "override" mode — your manual choice takes precedence over the wizard default, even if the session configuration changes.

**Gemini Vision label**: The button label changes based on state:
- No MP4s selected: "🎬 Gemini Vision (no MP4)" — visual indicator that there's nothing to process
- MP4s selected: "🎬 Gemini Vision (3)" — shows how many videos are available
- Toggle off: "🎬 Gemini Vision" — neutral label

### Behavior Override Modes

The four mode buttons above the speed tiers change HOW the tutor responds:

**ASK / SOCRATIC**: The tutor responds only with questions. It never gives direct answers — it guides you to discover the answer through a series of probing questions. Useful for testing understanding without being told the answer.

**EVALUATE**: The tutor evaluates your answer against the study materials. It emits a structured verdict with:
- Whether your answer is correct, partially correct, or incorrect
- What you got right
- What you missed
- Evidence from the materials supporting the correct answer
- A confidence rating

The verdict appears as a special formatted block in the chat, parsed from a JSON structure embedded in the response.

**CONCEPT MAP**: The tutor generates a Mermaid diagram showing relationships between concepts. The diagram is auto-detected and pushed to the Artifacts panel as an interactive, renderable visualization.

**TEACH-BACK**: You explain a concept as if teaching it to someone else, and the tutor evaluates your explanation. It generates a rubric scoring:
- Accuracy (did you get the facts right?)
- Completeness (did you cover all important aspects?)
- Clarity (was your explanation understandable?)
- Connections (did you link to related concepts?)

Each mode is mutually exclusive — clicking one turns off the others. Clicking the active mode deactivates it (returns to normal chat). Modes are **one-shot**: once you send a message with a mode active, the mode resets to null for the next turn (implemented in `useSSEStream.ts` via `onBehaviorOverrideReset`).

### Accuracy Profile

The dropdown labeled "Profile" with three options:

**Balanced** (default): Standard retrieval with moderate k-value. The tutor uses materials when available and fills gaps with training knowledge, clearly labeling the source.

**Strict**: Lower k-value (fewer but more precise results). The tutor is told to require exact source matches and avoid ungrounded claims. Best for exam prep where accuracy matters more than breadth.

**Coverage**: Higher k-value (more results, broader search). The tutor prioritizes covering all relevant material rather than precision. Best for initial study passes where you want exposure to everything.

### The Sources Panel

The button labeled "SOURCES" opens a slide-out panel on the right side of the chat. This panel lets you modify your material and vault selections mid-session without going back to the wizard:

- **Material list**: Check/uncheck individual study materials to add or remove them from the AI's context.
- **Upload**: Drag-and-drop or browse to upload new materials directly from the chat.
- **Vault folders**: Select which Obsidian vault folders to search.
- **North Star summary**: Shows the current Map of Contents data — module name, active objectives, reference targets.

Changes take effect on the next message you send.

### Artifacts

Artifacts are study outputs that appear in the right panel (`TutorArtifacts.tsx`). They are created in three ways:

1. **Slash commands**: Type `/note Title here` or `/map Concept Map Title` before your message. The tutor's response is automatically saved as that artifact type.

2. **Auto-detection**: After the response completes, the system scans for markdown tables and Mermaid code blocks. Found tables become "note" artifacts; found Mermaid blocks become "map" artifacts.

3. **Backend detection**: The backend can detect natural language artifact commands (e.g., "create a concept map of...") and flag them in the `done` SSE chunk. The frontend picks these up and creates artifacts.

4. **Tool use**: When the tutor uses tools like `save_to_obsidian` or `create_note`, these create artifacts that are tracked in the session's `artifacts_json`.

### Method Chain Progress

If a method chain is active, the chat includes awareness of chain position:
- The system prompt tells the tutor which block is current, which are completed, and which are upcoming.
- Block transitions are tracked in `tutor_block_transitions` — when the student advances to the next block, the current one is marked with an end time and the next one starts.
- The tutor receives the facilitation prompt for the current block only, keeping it focused on the right teaching activity.

---

## 8. End Session & Ship to Brain

### What "Ending a Session" Actually Does

When you click "End Session," it triggers a POST to `/api/tutor/session/{id}/end`. This is not just setting a status flag — it's an 8-phase cleanup and integration pipeline that takes everything generated during the session and weaves it into the broader PT Study system.

### Phase 1: Close Open Block Transitions

If a method chain was active, any currently-open block transition (one where `ended_at` is NULL) gets its timestamp set to now. This ensures every block has a clean start and end time for analytics.

```sql
UPDATE tutor_block_transitions
SET ended_at = {now}
WHERE tutor_session_id = {id} AND ended_at IS NULL
```

### Phase 2: Create Brain Session Record

The Tutor runs inside its own session system (`tutor_sessions`), but the broader PT Study system has a main `sessions` table that tracks all study activity. This phase creates a corresponding record in the main table:

- **Duration estimate**: `turn_count × 2 minutes` (rough heuristic — each Q&A exchange takes about 2 minutes on average).
- **Session type**: "tutor"
- **Course and topic**: Carried from the tutor session.
- **Status**: "completed"

The returned `brain_session_id` links the two records together.

### Phase 3: Update Tutor Session Status

The `tutor_sessions` row is updated:
- `status` → "completed"
- `ended_at` → current timestamp
- `brain_session_id` → the ID from Phase 2
- Any `card_drafts` created during the session get linked via `brain_session_id`

### Phase 4: Compute Summary

The system builds a summary object:
- `turn_count`: Total Q&A exchanges
- `duration_minutes`: Estimated from turn count
- `artifact_summary`: Breakdown by type (how many notes, maps, tables, cards were created)
- `objective_ids`: Which learning objectives were active
- `chain_name`: Which method chain was used (if any)

### Phase 5: Auto-Sync Vault Graph

This is where the Tutor's outputs become part of the knowledge graph. The system:

1. Reads all artifact paths from the session (vault note paths, diagram paths).
2. Calls `_sync_graph_for_paths()` for each path.
3. This creates edges in the knowledge graph: "Session X → produced → Note Y," "Note Y → covers → Concept Z."

This means the next time you (or the system) queries the knowledge graph, your tutor-generated notes are part of the connected web of knowledge.

### Phase 6: Refresh Map of Contents

If learning objectives were active, the system calls `_ensure_moc_context(force_refresh=True)`. This:

1. Re-reads the vault's Map of Contents page
2. Updates it with any new artifacts or status changes
3. Syncs the Learning Objectives page
4. Ensures reference targets are current

This keeps the vault's "navigation pages" in sync with what actually happened during the session.

### Phase 7: Auto-Capture Method Ratings

If a method chain was used and blocks were completed, the system automatically creates `method_ratings` records with default scores (effectiveness=3, engagement=3). This provides baseline data for the method analytics system, which tracks which study methods work best for you over time.

The ratings are conservative defaults — you can later update them with your actual experience. But having automatic baseline data means the analytics never have zero data points.

### Phase 8: Vault Janitor Pass

As a final cleanup, the system runs a vault "janitor" scan:
```python
scan_vault(folder=vault_folder, checks=["missing_frontmatter"])
```

This looks for notes in the current vault folder that are missing required YAML frontmatter (metadata at the top of the file). If found, it flags them for repair. This prevents vault rot — notes that gradually lose their metadata and become harder for the system to find and categorize.

### What Gets Returned

The endpoint returns a comprehensive response:

```json
{
  "session_id": "tutor-20260309-143022-a7b3c1",
  "status": "completed",
  "brain_session_id": 142,
  "ended_at": "2026-03-09T16:45:00Z",
  "summary": {
    "turn_count": 12,
    "duration_minutes": 24,
    "artifact_summary": {"note": 3, "map": 1, "table": 2},
    "objective_ids": ["OBJ-1", "OBJ-2", "OBJ-3"],
    "chain_name": "Top-Down Narrative Mastery v3"
  },
  "graph_sync": {"edges_created": 7},
  "map_of_contents_refresh": {"status": "ok"},
  "janitor": {"issues_found": 0}
}
```

---

## 9. All Known Gaps & Why They Exist

### Gap 1: Monolithic Backend File

**What**: `api_tutor.py` is ~9,100 lines — one of the largest single files in the project.

**Why it exists**: The file grew organically as features were added. Breaking it into modules would require careful planning because many internal helper functions call each other. The refactoring was deferred in favor of shipping features.

**Impact**: Makes the file hard to navigate. Finding a specific function requires searching through 9,000+ lines. New developers need significant ramp-up time.

**Fix effort**: Medium. The file has natural split points: session management, turn processing, preflight, vault sync, utility functions. Could be split into 5-6 modules with a shared utilities file.

### Gap 2: No Streaming Cancellation UI

**What**: There is no "Stop Generating" button in the chat. Once you send a message, you have to wait for the full response.

**Why it exists**: The `AbortController` is wired up in the code (`streamAbortRef`), but no UI button exposes it. The Loader2 spinner shows during streaming but clicking it doesn't stop anything.

**Impact**: Long Deep Think responses can take 30+ seconds. If you realize you asked the wrong question, you're stuck waiting.

**Fix effort**: Low. Add an onClick handler to the Loader2 icon that calls `streamAbortRef.current?.abort()`. The backend already handles aborted requests gracefully.

### Gap 3: No Conversation Export

**What**: There is no way to export a chat session as a document (PDF, Markdown, etc.).

**Why it exists**: Not yet prioritized. The data exists in `tutor_turns` and could be assembled, but no export endpoint or UI exists.

**Impact**: Students who want to review past sessions must scroll through the chat history in the app.

**Fix effort**: Low-Medium. Build a `/api/tutor/session/{id}/export` endpoint that queries `tutor_turns` and formats the Q&A pairs as Markdown.

### Gap 4: Session Restore Only Shows Text

**What**: When resuming a session (via `initialTurns`), only the text of questions and answers is restored. Citations, verdicts, tool actions, retrieval debug info, and streaming state are lost.

**Why it exists**: The session restore was implemented as a minimal feature — it reads `tutor_turns` and creates simple `{question, answer}` pairs. The rich metadata would require storing and restoring more fields.

**Impact**: Resumed sessions feel "flat" compared to the original — no citation highlights, no verdict blocks, no retrieval indicators.

**Fix effort**: Medium. Would need to serialize the full `ChatMessage` type (including citations, verdict, toolActions) into `tutor_turns.artifacts_json` and deserialize on restore.

### Gap 5: Estimated Session Duration

**What**: Session duration is estimated as `turn_count × 2 minutes`, not measured from actual clock time.

**Why it exists**: The system records `started_at` and `ended_at` timestamps, but the Brain session record uses the estimated formula instead of the actual elapsed time. This is because sessions can be left open for hours without activity, making wall-clock time inaccurate in the opposite direction.

**Impact**: Duration estimates are rough. A session with 5 quick questions shows as 10 minutes even if it took 3 minutes. A session left open over lunch shows as 10 minutes even if 90 minutes elapsed.

**Fix effort**: Low. Use the actual `ended_at - started_at` delta but cap it at some reasonable maximum (e.g., `min(elapsed, turn_count * 5)`).

### Gap 6: No Multi-User Support

**What**: The system assumes a single user. There are no user authentication, authorization, or user-scoping mechanisms on tutor sessions.

**Why it exists**: The PT Study system is designed as a personal study tool running on the student's local machine. Multi-user was never a requirement.

**Impact**: Cannot be used in a classroom or shared environment without modifications.

**Fix effort**: High. Would require authentication, user-scoped database queries, session isolation, and vault access controls.

### Gap 7: ChromaDB Single-Instance Limitations

**What**: ChromaDB runs as an embedded database in the same process as Flask. There is no separate vector database server.

**Why it exists**: Embedded ChromaDB is simple to set up and works well for single-user, local deployments. Running a separate Chroma server adds operational complexity.

**Impact**: If two requests try to write to ChromaDB simultaneously (e.g., uploading materials while chatting), there can be locking issues. Also, the vector index is loaded into memory, which can be slow for large document collections.

**Fix effort**: Medium. Could switch to ChromaDB's client-server mode or migrate to a lighter vector store.

### Gap 8: No Automated Test Coverage for Tutor

**What**: The tutor has minimal automated test coverage. The main test infrastructure uses `PYTEST_CURRENT_TEST` to disable Obsidian I/O, but there are few unit tests for the complex prompt assembly, retrieval logic, or streaming pipeline.

**Why it exists**: The tutor was built rapidly, prioritizing functionality over test coverage. Many functions depend on external services (LLM API, Obsidian vault, ChromaDB) that are hard to mock.

**Impact**: Regressions are caught by manual testing rather than CI. Prompt changes can subtly break behavior without anyone noticing.

**Fix effort**: High. Would need mock infrastructure for the LLM, vault, and ChromaDB, plus test fixtures for various session configurations.

### Gap 9: Accuracy Profile Has No Feedback Loop

**What**: The accuracy profile (Balanced/Strict/Coverage) affects retrieval parameters but the system never learns which profile works best for a given student or topic.

**Why it exists**: The profiles were designed as user-controlled settings, not adaptive parameters. Adding a feedback loop would require tracking retrieval quality per profile per topic.

**Impact**: Students must manually choose the right profile. A student studying anatomy might benefit from Coverage mode while one studying pharmacology might need Strict mode, but the system doesn't suggest this.

**Fix effort**: Medium. Track retrieval quality metrics (did the student find the answer? did they ask follow-ups?) per profile and surface recommendations.

### Gap 10: Vault Janitor Is Minimal

**What**: The end-session vault janitor only checks for `missing_frontmatter`. It doesn't check for broken links, orphaned files, duplicate notes, or stale content.

**Why it exists**: The janitor was added as a minimal safety net. More comprehensive checks were planned but not implemented.

**Impact**: Vault quality can degrade over time as notes accumulate. Broken internal links, orphaned artifacts, and stale objective references aren't caught automatically.

**Fix effort**: Medium. The janitor infrastructure exists — just add more check types.

### Gap 11: Method Block Contracts Are Not Exhaustive

**What**: Not every method block has a fully specified contract (allowed moves, forbidden moves, required outputs). Some blocks rely on generic fallback behavior.

**Why it exists**: The 49 seed blocks were created with varying levels of specification. Full contracts require deep thought about what each method should and shouldn't do.

**Impact**: Some blocks behave generically when they should have specialized behavior. For example, a "Brain Dump" block might not enforce the "no peeking at materials" constraint that makes brain dumps effective.

**Fix effort**: Medium. Each block contract needs to be authored by someone who understands the pedagogical intent of the method.

### Gap 12: Gemini Vision Integration Is Coarse

**What**: The Gemini Vision integration sends entire MP4 files for processing. There is no way to target specific timestamps, skip irrelevant sections, or combine visual context with text transcript.

**Why it exists**: The integration was built as a first pass — "send the video, get context back." Fine-grained video analysis is a harder problem.

**Impact**: Processing is slow and expensive for long lecture recordings. The AI might focus on irrelevant visual content (title slides, blank screens) instead of the diagrams the student cares about.

**Fix effort**: High. Would need video segmentation, timestamp targeting, and a smarter context extraction pipeline.

---

## 10. One-Page Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PT STUDY TUTOR — SYSTEM MAP                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── BROWSER (React) ──────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌──────────┐  ┌──────────────────┐  ┌────────────────────────┐  │  │
│  │  │  WIZARD   │  │    CHAT PANEL     │  │   ARTIFACTS PANEL     │  │  │
│  │  │           │  │                    │  │                       │  │  │
│  │  │ • Course  │  │ • Message bubbles  │  │ • Notes / Maps       │  │  │
│  │  │ • Week    │→ │ • Speed tier pills │  │ • Tables / Cards     │  │  │
│  │  │ • Mats    │  │ • Behavior modes   │  │ • Mermaid renders    │  │  │
│  │  │ • Chain   │  │ • Sources panel    │  │ • Auto-detected      │  │  │
│  │  │ • Preflt  │  │ • Accuracy profile │  │                       │  │  │
│  │  └──────────┘  └────────┬───────────┘  └───────────▲───────────┘  │  │
│  │                          │ POST /turn               │ artifacts    │  │
│  │                          │ + SSE stream             │              │  │
│  └──────────────────────────┼──────────────────────────┼──────────────┘  │
│                              │                          │                │
│  ════════════════════════════╪══════════════════════════╪════════════════ │
│                              ▼                          │                │
│  ┌─── SERVER (Flask / Python) ──────────────────────────┼──────────────┐ │
│  │                                                      │              │ │
│  │  ┌─────────────────────────────────────────────────┐ │              │ │
│  │  │              send_turn() pipeline                │ │              │ │
│  │  │                                                  │ │              │ │
│  │  │  1. Parse content_filter + mode flags            │ │              │ │
│  │  │  2. Select model (codex vs spark)                │ │              │ │
│  │  │  3. generate():                                  │ │              │ │
│  │  │     ├─ build_context() ─────────────┐            │ │              │ │
│  │  │     │   ├─ Materials (full/vector)   │            │ │              │ │
│  │  │     │   ├─ Obsidian notes            │            │ │              │ │
│  │  │     │   ├─ Vault state               │            │ │              │ │
│  │  │     │   └─ Course map                │            │ │              │ │
│  │  │     ├─ build_prompt_with_contexts()  │            │ │              │ │
│  │  │     │   ├─ Base prompt (5 rules)     │            │ │              │ │
│  │  │     │   ├─ Block facilitation        │            │ │              │ │
│  │  │     │   ├─ Chain position            │            │ │              │ │
│  │  │     │   ├─ Runtime profile           │            │ │              │ │
│  │  │     │   └─ Guardrails                │            │ │              │ │
│  │  │     ├─ +15 conditional sections      │            │ │              │ │
│  │  │     │   (MoC, objectives, scope,     │            │ │              │ │
│  │  │     │    tools, identity, behavior   │            │ │              │ │
│  │  │     │    overrides, scaffolding...)   │            │ │              │ │
│  │  │     ├─ GraphRAG-lite context         │            │ │              │ │
│  │  │     ├─ Gemini Vision context         │            │ │              │ │
│  │  │     └─ Stream to browser via SSE ────┼────────────┘ │              │ │
│  │  │  4. Save turn to DB                  │              │              │ │
│  │  │  5. Update mastery tracking          │              │              │ │
│  │  └─────────────────────────────────────────────────────┘              │ │
│  │                                                                       │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐   │ │
│  │  │  Preflight   │  │ end_session() │  │     Vault Sync            │   │ │
│  │  │              │  │              │  │                             │   │ │
│  │  │ • Validate   │  │ P1: Close    │  │ • Read/write vault notes   │   │ │
│  │  │ • Auto-imp.  │  │     blocks   │  │ • Sync MoC pages           │   │ │
│  │  │   objectives │  │ P2: Brain    │  │ • Update learning obj.     │   │ │
│  │  │ • MoC build  │  │     session  │  │ • Graph edge creation      │   │ │
│  │  │              │  │ P3: Status   │  │ • Janitor pass             │   │ │
│  │  │              │  │ P4: Summary  │  │                             │   │ │
│  │  │              │  │ P5: Graph    │  │                             │   │ │
│  │  │              │  │ P6: MoC      │  │                             │   │ │
│  │  │              │  │ P7: Ratings  │  │                             │   │ │
│  │  │              │  │ P8: Janitor  │  │                             │   │ │
│  │  └─────────────┘  └──────────────┘  └───────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                           │
│  ┌─── STORAGE ──────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │ │
│  │  │   SQLite DB    │  │   ChromaDB    │  │     Obsidian Vault        │ │ │
│  │  │                │  │              │  │                            │ │ │
│  │  │ tutor_sessions │  │ Embeddings   │  │ Map of Contents pages     │ │ │
│  │  │ tutor_turns    │  │ for vector   │  │ Learning Objectives pages │ │ │
│  │  │ learn_obj.     │  │ similarity   │  │ Study notes & artifacts   │ │ │
│  │  │ rag_docs       │  │ search       │  │ _Index.md files           │ │ │
│  │  │ block_trans.   │  │              │  │ Knowledge graph edges     │ │ │
│  │  │ error_logs     │  │              │  │                            │ │ │
│  │  │ method_ratings │  │              │  │                            │ │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                           │
│  ┌─── EXTERNAL SERVICES ────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │ │
│  │  │  OpenRouter    │  │   Gemini      │  │     OpenAI Embeddings     │ │ │
│  │  │  (LLM API)    │  │  (Vision)     │  │  (text-embedding-3-small) │ │ │
│  │  │               │  │              │  │                            │ │ │
│  │  │ gpt-5.3-codex │  │ Video/image  │  │ Converts text chunks      │ │ │
│  │  │ gpt-5.3-spark │  │ analysis for │  │ into numerical vectors    │ │ │
│  │  │               │  │ MP4 lectures │  │ for similarity search     │ │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  LEGEND:                                                                  │
│  → = data flow    ▼ = HTTP request    ▲ = response/event                 │
│  P1-P8 = end-session phases                                              │
│  MoC = Map of Contents                                                    │
│  BKT = Bayesian Knowledge Tracing                                        │
│  PERO = Prime, Encode, Retrieve, Overlearn (cognitive stages)            │
│  SSE = Server-Sent Events (streaming protocol)                           │
│  RAG = Retrieval-Augmented Generation                                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*End of audit. Every moving part of the PT Study Tutor has been documented above — from the React components in the browser, through the Flask backend that builds prompts and streams responses, down to the SQLite database and Obsidian vault where everything is persisted. No section has been summarized or truncated.*
