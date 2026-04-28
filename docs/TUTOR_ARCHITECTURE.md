# Tutor System Architecture

> Generated 2026-03-03. Comprehensive visual map of the PT Study Tutor system.
> Historical note: this document describes the pre-shell, wizard-led Tutor surface and is preserved as historical evidence only. Current product authority lives in `README.md`, runtime wiring lives in `docs/root/PROJECT_ARCHITECTURE.md`, and launch/start-panel cleanup evidence lives in `conductor/tracks/tutor-launch-shell-realignment_20260313/`.

---

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (React SPA)"]
        Wizard["Wizard (3 Steps)<br/>Course + Materials + Chain"]
        Chat["TutorChat<br/>SSE Streaming + Citations"]
        Artifacts["TutorArtifacts<br/>Notes / Cards / Maps"]
        BlockUI["Block Timer<br/>Progress Bar + Vault Toast"]
    end

    subgraph Backend["Backend (Flask / api_tutor.py)"]
        SessionAPI["Session API<br/>POST /session<br/>GET /session/:id<br/>POST /end"]
        TurnAPI["Turn API<br/>POST /turn (SSE)<br/>Stream tokens + citations"]
        BlockAPI["Block API<br/>POST /advance-block<br/>GET /chain-status"]
        MaterialAPI["Materials API<br/>POST /upload<br/>POST /embed<br/>GET /materials"]
        ArtifactAPI["Artifact API<br/>POST /artifact<br/>POST /finalize"]
    end

    subgraph Orchestration["Orchestration Layer"]
        PromptBuilder["tutor_prompt_builder.py<br/>15-section system prompt"]
        ContextBuilder["tutor_context.py<br/>Unified retrieval"]
        Streaming["tutor_streaming.py<br/>SSE formatting"]
        Verdict["tutor_verdict.py<br/>PASS / FAIL / PARTIAL"]
        TeachBack["tutor_teach_back.py<br/>Rubric scoring"]
    end

    subgraph ControlPlane["Control Plane (CP-MSS v2.0)"]
        Selector["selector.py<br/>7-Knob Router"]
        Chains["method_chains<br/>C-FE-STD / MIN / PRO"]
        Blocks["method_blocks<br/>54 blocks x 7 stages"]
        ErrorTelemetry["error_logs<br/>HCWR + dominant_error"]
    end

    subgraph RAG["RAG Pipeline"]
        Chroma["ChromaDB<br/>tutor_materials collection"]
        Embeddings["text-embedding-3-small<br/>OpenAI"]
        MMR["MMR + Similarity<br/>Candidate fetch + rerank"]
        KeywordFB["Keyword Fallback<br/>SQL search on rag_docs"]
    end

    subgraph Vault["Obsidian Vault Integration"]
        CLI["obsidian_vault.py<br/>CLI wrapper (retry + cache)"]
        Router["vault_artifact_router.py<br/>Operation dispatcher"]
        Templates["tutor_templates.py<br/>5 block templates + MOC"]
    end

    subgraph External["External Services"]
        OpenAI["OpenAI API<br/>gpt-5.3-codex"]
        Obsidian["Obsidian Desktop<br/>Local REST Plugin"]
        Anki["AnkiConnect<br/>Card sync"]
        SQLite["SQLite<br/>pt_study.db (16 tables)"]
        ChromaDB["ChromaDB<br/>Persisted vectors"]
    end

    %% Frontend → Backend
    Wizard -->|POST /session| SessionAPI
    Chat -->|POST /turn SSE| TurnAPI
    BlockUI -->|POST /advance-block| BlockAPI
    Artifacts -->|POST /artifact| ArtifactAPI

    %% Backend → Orchestration
    TurnAPI --> ContextBuilder
    TurnAPI --> PromptBuilder
    TurnAPI --> Streaming
    TurnAPI --> Verdict
    TurnAPI --> TeachBack

    %% Orchestration → RAG
    ContextBuilder --> MMR
    MMR --> Chroma
    Chroma --> Embeddings
    ContextBuilder --> KeywordFB

    %% Backend → Control Plane
    SessionAPI --> Selector
    Selector --> Chains
    Chains --> Blocks
    BlockAPI --> Blocks
    TurnAPI --> ErrorTelemetry
    ErrorTelemetry -->|dominant_error| Selector

    %% Backend → Vault
    BlockAPI --> Router
    ArtifactAPI --> Router
    Router --> Templates
    Templates --> CLI
    CLI --> Obsidian

    %% Backend → External
    TurnAPI --> OpenAI
    MaterialAPI --> ChromaDB
    ArtifactAPI --> Anki
    SessionAPI --> SQLite
    TurnAPI --> SQLite
```

---

## 2. User Session Lifecycle

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant W as TutorWizard
    participant API as api_tutor.py
    participant S as Selector
    participant DB as SQLite
    participant RAG as tutor_rag.py
    participant LLM as OpenAI API
    participant V as Obsidian Vault

    Note over U,V: === PHASE 1: SESSION SETUP ===

    U->>W: Step 0: Select course + topic + materials
    U->>W: Step 1: Choose chain mode (auto/template/custom)
    U->>W: Step 2: Confirm + START SESSION

    W->>API: POST /api/tutor/session
    API->>S: select_chain(assessment_mode, time, energy, dominant_error)
    S-->>API: (chain_id, knob_overrides)
    API->>DB: INSERT tutor_sessions
    API->>DB: INSERT tutor_block_transitions (block 0)
    API->>V: _ensure_moc_context() → Map of Contents
    API-->>W: {session_id, chain_blocks, greeting}

    Note over U,V: === PHASE 2: CHAT LOOP ===

    loop Each Turn
        U->>API: POST /api/tutor/session/:id/turn {question, content_filter}
        API->>RAG: build_context(query, material_ids, k)
        RAG->>RAG: search_with_embeddings() → ChromaDB
        RAG-->>API: {material_text, notes_text, debug}
        API->>API: build_prompt_with_contexts() (15 sections)
        API->>LLM: call_codex_json(system_prompt, user_msg)

        loop SSE Stream
            LLM-->>API: token chunk
            API-->>U: data: {"type":"content","content":"..."}
        end

        API->>API: extract_citations()
        API->>DB: INSERT tutor_turns (question, answer, citations)
        opt Error Detected
            API->>DB: INSERT error_logs (error_type, stage, confidence)
        end
        API-->>U: data: {"type":"done", citations, retrieval_debug}
    end

    Note over U,V: === PHASE 3: BLOCK ADVANCEMENT ===

    U->>API: POST /api/tutor/session/:id/advance-block
    API->>DB: UPDATE tutor_sessions (current_block_index++)
    API->>DB: UPDATE tutor_block_transitions (ended_at)
    API->>DB: INSERT tutor_block_transitions (new block)

    opt vault_folder configured
        API->>API: render_block_artifact(block, stage, artifact_type)
        API->>V: execute_vault_artifact("write-block-note", ...)
        V-->>API: vault_write_status: "success"|"failed"|"skipped"
    end

    API-->>U: {block_name, block_description, timer, vault_write_status}

    Note over U,V: === PHASE 4: SESSION END ===

    U->>API: POST /api/tutor/session/:id/end
    API->>DB: UPDATE tutor_sessions (status=completed, ended_at)
    API->>DB: INSERT lo_sessions (link LOs to session)
    API->>DB: UPDATE chain_runs (completed)
    API-->>U: {summary, artifacts_count}
```

---

## 3. Control Plane Pipeline

```mermaid
graph LR
    subgraph Selector["7-Knob Selector"]
        K1["assessment_mode"]
        K2["time_available_min"]
        K3["energy"]
        K4["dominant_error"]
        K5["phase"]
        K6["course_type"]
        K7["prior_mastery"]
    end

    subgraph Routing["Chain Selection Rules"]
        R1["energy=low OR time<25<br/>→ C-FE-MIN"]
        R2["mode=procedure<br/>→ C-FE-PRO"]
        R3["mode=definition/recognition<br/>→ C-FE-MIN"]
        R4["default<br/>→ C-FE-STD"]
    end

    subgraph Pipeline["6-Stage Pipeline"]
        PRIME["PRIME<br/>Structure Extraction<br/>LO Primer + Schema"]
        CAL["CALIBRATE<br/>Baseline Measurement<br/>Micro Precheck"]
        ENC["ENCODE<br/>Deep Internalization<br/>Comparison Table"]
        REF["REFERENCE<br/>External Offloading<br/>One-Page Anchor + Q-Bank"]
        RET["RETRIEVE<br/>Reconstructive Recall<br/>Timed Sprint Sets"]
        OVR["OVERLEARN<br/>Fluency / Automaticity<br/>Exit Ticket"]
    end

    subgraph Feedback["Error-Driven Feedback"]
        EL["error_logs table"]
        DE["get_dominant_error()"]
        OV["Knob Overrides"]
    end

    Selector --> Routing
    Routing --> Pipeline
    PRIME --> CAL --> ENC --> REF --> RET --> OVR

    RET -.->|errors detected| EL
    EL --> DE
    DE -->|next session| OV
    OV -->|override knobs| Selector

    style PRIME fill:#4a9eff,color:#fff
    style CAL fill:#f5a623,color:#fff
    style ENC fill:#7ed321,color:#fff
    style REF fill:#bd10e0,color:#fff
    style RET fill:#d0021b,color:#fff
    style OVR fill:#9013fe,color:#fff
```

### Chain Compositions

```
C-FE-STD (Standard First Exposure) — 35 min, medium energy
┌──────────┬───────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│  PRIME   │  PRIME    │ CALIBRATE │  ENCODE   │ REFERENCE │ REFERENCE │ RETRIEVE  │
│ M-PRE-010│ M-PRE-008 │ M-CAL-001 │ M-ENC-010 │ M-REF-003 │ M-REF-004 │ M-RET-007 │
│ LO Primer│ Struct Ext│ Precheck  │ Compare   │ Anchor    │ Q-Bank    │ Sprints   │
└──────────┴───────────┴───────────┴───────────┴───────────┴───────────┴───────────┘

C-FE-MIN (Minimal / Low Energy) — 20 min, low energy
┌──────────┬───────────┬───────────┬───────────┬───────────┐
│  PRIME   │  PRIME    │ REFERENCE │ RETRIEVE  │ OVERLEARN │
│ M-PRE-010│ M-PRE-008 │ M-REF-003 │ M-RET-001 │ M-OVR-001 │
│ LO Primer│ Struct Ext│ Anchor    │ Free Recall│ Exit Tick │
└──────────┴───────────┴───────────┴───────────┴───────────┘

C-FE-PRO (Procedure / Lab) — 45 min, high energy
┌──────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
│  PRIME   │  PRIME    │  ENCODE   │ REFERENCE │INTERLEAVE │ RETRIEVE  │
│ M-PRE-010│ M-PRE-008 │ M-ENC-011 │ M-REF-003 │ M-ELB-003 │ M-RET-007 │
│ LO Primer│ Struct Ext│ Flowchart │ Anchor    │ Case Walk │ Sprints   │
└──────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
```

### Error → Override Routing

```
Confusion  → near_miss_intensity: "high" (force Contrast Matrix)
Speed      → timed: "hard" (strict timing enforcement)
Rule       → near_miss_intensity: "high" (adversarial lures)
Procedure  → override chain to C-FE-PRO
Computation→ force M-ENC-015 (Faded Scaffolding)
```

---

## 4. RAG Retrieval Pipeline

```mermaid
graph TB
    subgraph Ingestion["Material Ingestion"]
        Upload["POST /materials/upload<br/>PDF, MD, TXT, MP4"]
        Extract["Text Extraction<br/>Docling / Whisper"]
        Chunk["chunk_document()<br/>Headers → Chars split<br/>Max 8K per chunk"]
        Embed["OpenAI text-embedding-3-small<br/>→ ChromaDB tutor_materials"]
    end

    subgraph Storage["Storage Layer"]
        RagDocs["rag_docs (SQLite)<br/>source_path, content, course_id"]
        RagEmbed["rag_embeddings (SQLite)<br/>rag_doc_id, chunk_text, chroma_id"]
        ChromaStore["ChromaDB (Disk)<br/>brain/data/chroma_tutor/materials/"]
    end

    subgraph Retrieval["Turn-Time Retrieval"]
        Context["build_context()<br/>tutor_context.py"]
        FullContent["Full Content Path<br/>(if material_ids <= 10)"]
        VectorSearch["Vector Search Path<br/>search_with_embeddings()"]
    end

    subgraph VectorPipeline["Vector Search Details"]
        CandidateCalc["Candidate Pool Sizing<br/>scoped: k*12, cap 800<br/>unscoped: k*2, cap 12"]
        SimSearch["Similarity Search<br/>vs.similarity_search()"]
        MMRSearch["MMR Search<br/>lambda=0.2, fetch_k=min(k*3, 1600)"]
        Merge["Merge & Dedup<br/>Similarity priority + MMR diversity"]
        PerDocCap["Per-Doc Cap<br/>Max 6 chunks per source"]
        TopK["Return Top-K<br/>Final chunks → material_text"]
    end

    subgraph Fallback["Fallback"]
        Keyword["_keyword_fallback()<br/>SQL LIKE on rag_docs.content"]
    end

    Upload --> Extract --> Chunk --> Embed
    Embed --> ChromaStore
    Embed --> RagEmbed
    Upload --> RagDocs

    Context -->|material_ids <= 10| FullContent
    Context -->|material_ids > 10 or none| VectorSearch

    FullContent --> RagDocs
    VectorSearch --> CandidateCalc --> SimSearch
    CandidateCalc --> MMRSearch
    SimSearch --> Merge
    MMRSearch --> Merge
    Merge --> PerDocCap --> TopK

    VectorSearch -.->|ChromaDB empty| Keyword
    Keyword --> RagDocs

    SimSearch --> ChromaStore
    MMRSearch --> ChromaStore
```

### Accuracy Profile → Retrieval Depth

```
strict    → material_k = max(6, len(material_ids))    → high precision, fewer chunks
balanced  → material_k = max(8, len(material_ids)*2)  → moderate breadth
coverage  → material_k = max(12, len(material_ids)*3) → maximum breadth
```

---

## 5. Vault Write Pipeline

```mermaid
graph LR
    subgraph Trigger["Write Triggers"]
        BlockAdv["Block Advancement<br/>(auto, fire-and-forget)"]
        UserCmd["User Commands<br/>/note /card /map"]
        Finalize["Session Finalize<br/>POST /finalize"]
        LOSave["LO Extraction<br/>(PRIME block tool)"]
    end

    subgraph Render["Template Rendering"]
        BlockTmpl["render_block_artifact()<br/>5 types: notes, diagram,<br/>comparison, recall, cards"]
        SessionTmpl["render_session_note_markdown()<br/>Frontmatter + stage flow"]
        MOCTmpl["_render_moc_markdown()<br/>Objectives + mastery counts"]
    end

    subgraph Route["Vault Router"]
        Router2["vault_artifact_router.py<br/>Operation dispatcher"]
        Create["create_note()"]
        Append["append_note()"]
        Replace["replace_section()"]
        WriteBlock["write-block-note<br/>→ Blocks/{name}.md"]
    end

    subgraph CLI2["Obsidian CLI"]
        Wrapper["obsidian_vault.py<br/>retry: 3 attempts<br/>backoff: 1s, 2s<br/>timeout: 10-15s<br/>cache: 30s availability"]
    end

    subgraph Vault2["Obsidian Desktop"]
        VaultFiles["Study Notes/{Course}/{Unit}/{Topic}/<br/>├── _Map of Contents.md<br/>├── Blocks/{block}.md<br/>├── Session Notes/{session}.md<br/>└── Concepts/{concept}.md"]
    end

    BlockAdv --> BlockTmpl
    UserCmd --> SessionTmpl
    Finalize --> SessionTmpl
    LOSave --> MOCTmpl

    BlockTmpl --> Router2
    SessionTmpl --> Router2
    MOCTmpl --> Router2

    Router2 --> Create
    Router2 --> Append
    Router2 --> Replace
    Router2 --> WriteBlock

    Create --> Wrapper
    Append --> Wrapper
    Replace --> Wrapper
    WriteBlock --> Wrapper

    Wrapper --> VaultFiles
```

---

## 6. Database Entity Relationships

```mermaid
erDiagram
    tutor_sessions ||--o{ tutor_turns : "has many"
    tutor_sessions ||--o{ tutor_block_transitions : "tracks"
    tutor_sessions ||--o{ error_logs : "generates"
    tutor_sessions ||--o{ card_drafts : "produces"
    tutor_sessions }o--|| method_chains : "runs"
    tutor_sessions }o--|| courses : "studies"

    method_chains ||--o{ method_blocks : "sequences (block_ids)"
    method_chains }o--o| rulesets : "constrained by"

    tutor_block_transitions }o--|| method_blocks : "executes"

    rag_docs }o--|| courses : "belongs to"
    rag_docs ||--o{ rag_embeddings : "chunked into"

    learning_objectives }o--|| courses : "belongs to"
    learning_objectives ||--o{ lo_sessions : "tracked in"

    chain_runs }o--|| method_chains : "executes"
    method_ratings }o--o| method_blocks : "rates"

    tutor_sessions {
        text session_id PK
        int course_id FK
        text topic
        text content_filter_json
        int method_chain_id FK
        int current_block_index
        text status
        int turn_count
        text started_at
        text ended_at
    }

    tutor_turns {
        int id PK
        text session_id FK
        int turn_number
        text question
        text answer
        text citations_json
        text phase
        text model_id
    }

    method_blocks {
        int id PK
        text method_id
        text name
        text control_stage
        text artifact_type
        text facilitation_prompt
        int default_duration_min
    }

    method_chains {
        int id PK
        text name
        text block_ids
        int is_template
    }

    error_logs {
        int id PK
        text session_id FK
        text error_type
        text stage_detected
        text confidence
        text fix_applied
    }

    rag_docs {
        int id PK
        text source_path
        int course_id FK
        text content
        text file_type
        int enabled
    }

    rag_embeddings {
        int id PK
        int rag_doc_id FK
        text chunk_text
        text chroma_id
        int token_count
    }

    learning_objectives {
        int id PK
        int course_id FK
        text lo_code
        text title
        text status
    }
```

---

## 7. Turn Processing Detail (The Core Loop)

```
POST /api/tutor/session/:id/turn  {question, content_filter}
│
├─ 1. LOAD SESSION
│     └─ Fetch tutor_sessions row + last 20 turns
│
├─ 2. RESOLVE CHAIN CONTEXT
│     ├─ _build_chain_info() → current block + stage
│     ├─ Validate method contract (stage drift check)
│     └─ Load facilitation_prompt + artifact_type
│
├─ 3. PARSE CONTENT FILTER
│     ├─ material_ids (which files to search)
│     ├─ accuracy_profile (strict / balanced / coverage)
│     ├─ reference_targets (bounds enforcement)
│     └─ objective_scope (module_all / single_focus)
│
├─ 4. RESOLVE RETRIEVAL DEPTH
│     ├─ _resolve_material_retrieval_k(material_ids, profile) → material_k
│     └─ _resolve_instruction_retrieval_k(profile) → instruction_k
│
├─ 5. BUILD UNIFIED CONTEXT  (tutor_context.py)
│     ├─ _fetch_materials() → ChromaDB or full content
│     ├─ _fetch_notes() → Obsidian vault search
│     └─ _fetch_vault_state() → MOC + session context
│
├─ 6. BUILD SYSTEM PROMPT  (tutor_prompt_builder.py)
│     ├─ [1] Block/chain context
│     ├─ [2] Instruction context (SOP rules)
│     ├─ [3] Material context (retrieved excerpts)
│     ├─ [4] Graph context (optional)
│     ├─ [5] Course map
│     ├─ [6] Vault state (MOC, objectives)
│     ├─ [7] Accuracy profile guidance
│     ├─ [8] Reference bounds
│     ├─ [9] PRIME guardrails (if PRIME stage)
│     ├─ [10] LO extraction prompt (if PRIME first turn)
│     ├─ [11] Material scope labels
│     ├─ [12] Tooling instructions
│     ├─ [13] Behavior override suffix
│     ├─ [14] Adaptive scaffolding (BKT mastery)
│     └─ [15] Scholar method recommendations
│
├─ 7. CALL LLM  (OpenAI gpt-5.3-codex)
│     ├─ Stream tokens via SSE
│     ├─ data: {"type":"content","content":"..."}
│     └─ (repeat until generation complete)
│
├─ 8. POST-GENERATION
│     ├─ extract_citations() → [Source: filename] parsing
│     ├─ Parse verdict (if evaluate mode)
│     ├─ Parse teach-back rubric (if teach_back mode)
│     └─ _build_retrieval_debug_payload() → confidence score
│
├─ 9. SEND DONE EVENT
│     └─ data: {"type":"done", citations, retrieval_debug, verdict}
│
└─ 10. PERSIST
      ├─ INSERT tutor_turns (question, answer, citations_json)
      ├─ UPDATE tutor_sessions (turn_count++)
      └─ INSERT error_logs (if errors detected)
```

---

## 8. Frontend Component Tree

```
TutorPage (tutor.tsx)
├── TutorWizard (when no active session)
│   ├── Step 0: StepCourseAndMaterials
│   │   ├── Course Dropdown (from /api/tutor/course-map)
│   │   ├── Topic Input
│   │   ├── PRIME Scope Selector (module_all / single_focus)
│   │   └── MaterialSelector (multi-select with counts)
│   ├── Step 1: StepChain
│   │   ├── Mode Selector (PRE-BUILT / CUSTOM / AUTO)
│   │   ├── Template Chain Dropdown (if PRE-BUILT)
│   │   └── TutorChainBuilder (if CUSTOM)
│   └── Step 2: StepConfirm
│       ├── Summary Display
│       └── START SESSION Button
│
├── TutorChat (when active session)
│   ├── Sources Drawer (left sidebar)
│   │   ├── Materials Tab (checkboxes for file selection)
│   │   ├── Vault Tab (recursive folder tree)
│   │   └── North Star Tab (MOC context)
│   ├── Chat Messages
│   │   ├── User Message (right-aligned)
│   │   └── Assistant Message (left-aligned)
│   │       ├── Markdown Renderer
│   │       ├── Citation Footnotes [1] [2]
│   │       ├── VerdictBadge (PASS/FAIL/PARTIAL)
│   │       └── TeachBackBadge (accuracy/breadth/synthesis)
│   ├── Input Bar
│   │   ├── Text Input
│   │   ├── Behavior Override (evaluate / teach_back / concept_map)
│   │   └── Send Button
│   └── Block Progress Bar
│       ├── Current Block Name + Stage
│       ├── Timer (MM:SS countdown)
│       ├── ADVANCE BLOCK Button
│       └── Progress: N / Total
│
└── TutorArtifacts (right sidebar)
    ├── Artifact List (notes, cards, maps, tables)
    ├── Artifact Preview (first 200 chars)
    ├── Bulk Delete Controls
    └── Recent Sessions List
```

---

## 9. Key File Reference

| Layer | File | Lines | Purpose |
|-------|------|-------|---------|
| **Frontend** | `dashboard_rebuild/client/src/pages/tutor.tsx` | ~1200 | Main tutor page, wizard, state |
| **Frontend** | `dashboard_rebuild/client/src/components/TutorChat.tsx` | ~1900 | Chat loop, SSE, sources drawer |
| **Frontend** | `dashboard_rebuild/client/src/components/TutorWizard.tsx` | ~740 | 3-step setup wizard |
| **Frontend** | `dashboard_rebuild/client/src/components/TutorArtifacts.tsx` | ~300 | Artifact display panel |
| **Frontend** | `dashboard_rebuild/client/src/api.ts` | ~700 | API client functions + types |
| **Backend** | `brain/dashboard/api_tutor.py` | ~7200 | 40+ endpoints, session/turn/block |
| **Orchestration** | `brain/tutor_context.py` | ~200 | Unified context builder |
| **Orchestration** | `brain/tutor_prompt_builder.py` | ~400 | 15-section system prompt |
| **Orchestration** | `brain/tutor_streaming.py` | ~150 | SSE formatting + citations |
| **Orchestration** | `brain/tutor_verdict.py` | ~100 | Verdict parsing |
| **Orchestration** | `brain/tutor_teach_back.py` | ~100 | Teach-back rubric |
| **RAG** | `brain/tutor_rag.py` | ~700 | ChromaDB + MMR retrieval |
| **Control Plane** | `brain/selector.py` | ~70 | 7-knob chain selector |
| **Control Plane** | `brain/selector_bridge.py` | ~175 | Selector API bridge |
| **Control Plane** | `brain/data/seed_methods.py` | ~1770 | 46 method block definitions |
| **Vault** | `brain/obsidian_vault.py` | ~400 | CLI wrapper (retry/cache) |
| **Vault** | `brain/vault_artifact_router.py` | ~100 | Operation dispatcher |
| **Vault** | `brain/tutor_templates.py` | ~745 | Template renderers |
| **Database** | `brain/db_setup.py` | ~2500 | Schema + migrations |
| **SOP** | `sop/library/17-control-plane.md` | ~40 | CP-MSS v2.0 spec |
| **Chains** | `sop/library/chains/C-FE-STD.yaml` | ~37 | Standard chain |
| **Chains** | `sop/library/chains/C-FE-MIN.yaml` | ~31 | Minimal chain |
| **Chains** | `sop/library/chains/C-FE-PRO.yaml` | ~30 | Procedure chain |

---

## 10. Numbers At a Glance

| Metric | Count |
|--------|-------|
| API Endpoints | 40+ |
| Database Tables (tutor) | 16 |
| Method Blocks | 46 |
| Control Plane Stages | 6 |
| Template Chains | 3 (FE-STD, FE-MIN, FE-PRO) |
| Selector Knobs | 7 |
| System Prompt Sections | 15 |
| Block Artifact Templates | 5 |
| Frontend Components | 5 main (Page, Wizard, Chat, Artifacts, API) |
| Test Files | 5 (141 targeted tests) |
| Full Test Suite | 916 passing |
