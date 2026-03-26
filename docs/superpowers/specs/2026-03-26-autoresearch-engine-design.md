# Autoresearch Engine — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Repo:** Standalone — `C:\autoresearch-engine` (separate from pt-study-sop)
**Runtime:** Python library + CLI wrapper

---

## 1. Summary

A general-purpose autoresearch engine that takes vague tasks, forces clear problem definition through structured discovery, creates an approved execution brief, routes work across light and heavy models via Codex CLI, executes task-specific workflows, and returns structured, inspectable results.

Supports two operating modes: embedded (Codex CLI does the reasoning) and prompt-bridge (generates an intake prompt for ChatGPT, then continues from pasted answers).

---

## 2. Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LiteParse | Wrap `pt-study-sop/brain/text_extractor.py` | Already built with MinerU → PyMuPDF → pdfplumber tiering |
| Location | Separate repo `C:\autoresearch-engine` | General-purpose tool, not PT-study specific |
| Runtime model | Python library + thin CLI wrapper | Importable from any context |
| Model calls | Codex CLI subprocess | Leverages existing OAuth, no API keys needed |
| Light model | `codex_spark` / `gpt5_mini` profiles | Fast scanning, filtering, compression |
| Heavy model | `deep` / `balanced` profiles | Reasoning, synthesis, planning |
| Prompt-bridge | v1 must-have | Both operating modes ship in v1 |
| Approvals | Callback-based, terminal prompt default | Flexible — callers swap in any approval UI |
| Evaluator | Pluggable, LLM-as-judge default | Code tasks can wire in test runners |
| Architecture | Pipeline-of-functions | Linear flow, no framework lock-in |

---

## 3. Architecture

### 3.1 Pipeline-of-Functions

Each phase is a plain Python function: `def phase(state: EngineState, config: EngineConfig) -> EngineState`

The runner chains them sequentially. State is a typed dict that accumulates results as it flows through.

```
discover → followup → classify → build_brief → approve
    → ingest → route → execute → review → approve → deliver
    → [optional] improve_loop
```

### 3.2 State Model

```python
class EngineState(TypedDict):
    # Discovery
    mode: str                        # "embedded" | "prompt-bridge"
    intake_answers: dict             # raw answers from discovery
    followup_answers: dict           # answers to branching questions

    # Classification
    primary_category: str            # research | compare | plan | analyze_docs | improve | code
    secondary_category: str | None

    # Brief
    brief: ExecutionBrief            # full brief dataclass
    brief_approved: bool

    # Ingestion
    parsed_files: list[ParsedFile]
    chunks: list[Chunk]

    # Execution
    workflow_result: dict            # output from task-specific workflow
    review_result: dict              # internal review against criteria
    final_approved: bool

    # Improvement loop (optional)
    improve_mode: bool
    improve_rounds: list[dict]
    improve_winner: dict | None
```

### 3.3 Codex CLI Bridge

```python
class CodexBridge:
    PROFILES = {
        "light": "codex_spark",
        "medium": "gpt5_mini",
        "heavy": "deep",
    }

    def call(self, prompt: str, profile: str = "heavy", timeout: int = 120) -> str:
        """Call Codex CLI with the given profile. Returns text response."""

    def call_with_files(self, prompt: str, file_paths: list[str], profile: str = "heavy") -> str:
        """Call Codex with file context attached."""
```

**Profile usage by phase:**

| Profile | Used In |
|---------|---------|
| Light (`codex_spark`) | Chunk relevance scoring, compression, formatting checks, branching followup selection |
| Medium (`gpt5_mini`) | Task classification, gap checking in prompt-bridge mode, branching question generation |
| Heavy (`deep`) | Discovery intake, reasoning, synthesis, planning, decision-making, evaluations, review |

---

## 4. Discovery System

**Note on `state.mode` vs `brief.mode`:** `state.mode` is set at the start of discovery and is the source of truth. `brief.mode` is copied from `state.mode` during `build_brief` for serialization purposes. They must not diverge.

### 4.1 Embedded Mode

1. Engine sends core intake questions to heavy model with user's initial context.
2. Heavy model generates tailored questions.
3. User answers interactively via approval callback (default: terminal prompt).
4. Medium model generates branching followups based on task category.
5. User answers followups.
6. Discovery complete when all required brief fields are fillable.

### 4.2 Prompt-Bridge Mode

1. User provides basic context.
2. Engine generates a self-contained markdown intake prompt.
3. User pastes it into ChatGPT, completes conversation.
4. User pastes structured answers back.
5. Engine parses answers into state.
6. Medium model checks for gaps, asks minimal followups if needed.

### 4.3 Core Intake Questions

1. What are you trying to know, decide, build, improve, or solve?
2. What final output do you want?
3. What inputs do you already have?
4. What constraints matter?
5. How will we know the result is good enough?
6. What do you already assume is true?
7. What information is still missing?
8. How certain does the result need to be?
9. Do you prefer any specific method or approach?
10. What time or cost limits should the engine respect?

### 4.4 Branching Followups

Stored in `prompts/discovery_followups.md`, organized by task category. Each category has 3-5 targeted questions. The light model selects which to ask based on gaps in the intake answers.

### 4.5 Discovery Completion Rule

Discovery is complete when these brief fields are fillable: goal, desired_output, primary_category, inputs, constraints, success_criteria, missing_info_status, confidence_target, proposed_workflow, stop_rule.

---

## 5. Execution Brief

### 5.1 Structure

```python
@dataclass
class ExecutionBrief:
    # Identity
    brief_id: str                    # uuid4
    timestamp: str                   # ISO 8601
    mode: str                        # "embedded" | "prompt-bridge"

    # Classification
    primary_category: str
    secondary_category: str | None

    # Core
    goal: str
    desired_output: str
    summary_plain_english: str       # 3-4 sentence human-readable summary
    available_inputs: list[str]
    input_types: list[str]           # "pdf", "code", "text", "url"
    constraints: list[str]
    success_criteria: list[str]
    current_assumptions: list[str]
    missing_information: list[str]
    confidence_target: str           # "low" | "medium" | "high" | "very_high"
    preferred_method: str | None
    time_limit: str | None
    cost_limit: str | None

    # Execution
    proposed_workflow: str
    stop_rule: str

    # Flags
    approval_required_before_execution: bool = True
    approval_required_before_final: bool = True
    improve_mode_requested: bool = False

    # Optional
    source_preferences: list[str] | None = None
    risk_flags: list[str] | None = None
    domain_tags: list[str] | None = None
    evaluation_rubric: dict | None = None
```

### 5.2 Serialization

- `.to_json()` — machine-readable, stored in `results/briefs/`
- `.to_plain_english()` — renders summary block for approval checkpoints
- `.from_json(path)` — reconstruct from saved brief

---

## 6. Task Workflows

Each workflow is a function: `def workflow_name(state: EngineState, config: EngineConfig, bridge: CodexBridge) -> dict`

### 6.0 Execute Phase (Dispatch)

The `execute` phase lives in `phases/execute.py`. It reads `state.brief.proposed_workflow` and dispatches to the corresponding workflow function:

```python
WORKFLOW_MAP = {
    "research": research.run,
    "compare": compare.run,
    "plan": plan.run,
    "analyze_docs": analyze_docs.run,
    "improve": improve.run,
    "code": code_task.run,
}

def execute(state: EngineState, config: EngineConfig) -> EngineState:
    # Dispatch on primary_category, not proposed_workflow (which is free text).
    # build_brief sets proposed_workflow to the normalized category key.
    workflow_fn = WORKFLOW_MAP[state["brief"].primary_category]
    bridge = CodexBridge(config)
    state["workflow_result"] = workflow_fn(state, config, bridge)
    return state
```

### 6.1 Research

1. Identify question type (factual, exploratory, decision-oriented) — light model
2. Identify evidence needs — light model
3. Gather sources from inputs and chunks — light model filters, heavy model evaluates
4. Compress into research notes — light model
5. Synthesize findings — heavy model
6. State confidence level and unresolved gaps — heavy model

### 6.2 Compare

1. Define options and criteria from brief — light model
2. Gather evidence for each option from chunks — light model filters
3. Score or rank each option against criteria — heavy model
4. Identify deal-breakers — heavy model
5. Recommend with rationale — heavy model

### 6.3 Plan

1. Define target outcome and constraints from brief — light model
2. Decompose into phases and steps — heavy model
3. Identify failure points and contingencies — heavy model
4. Assign resources/timeline if available — heavy model
5. Produce execution plan — heavy model

### 6.4 Analyze Documents

1. Parse files through ingestion pipeline — already done in ingest phase
2. Filter relevant chunks by brief criteria — light model
3. Extract requested information — heavy model on filtered chunks
4. Synthesize into requested output format — heavy model

### 6.5 Improve

1. Define baseline from brief — light model
2. Define evaluation criteria from brief — light model
3. Run current version — bridge call
4. Evaluate outputs against criteria — evaluator (pluggable, LLM-as-judge default)
5. Identify failure patterns — heavy model
6. If improve_mode: enter improve_loop (see Section 8)

### 6.6 Code

1. Ingest code or task request from brief — already in state
2. Identify environment and requirements — light model
3. Propose or inspect implementation — heavy model
4. Validate through tests or logical checks — bridge call with test commands
5. Return code or build plan — heavy model

---

### 6.7 Classification Logic

The `classify` phase (`phases/classify.py`) uses the **medium model** to assign primary and secondary categories. It works as follows:

1. Build a classification prompt containing the intake answers and the category definitions from `config/task_categories.yaml`.
2. The prompt asks the model to return a JSON object: `{"primary": "...", "secondary": "...|null", "confidence": 0.0-1.0, "reasoning": "..."}`.
3. Parse the JSON response. If `confidence < 0.6`, trigger an escalation (pause for user confirmation of the classification).
4. Store `primary_category`, `secondary_category` on state.

`task_categories.yaml` contains the 6 primary categories with short definitions and example signals, plus the allowed secondary pairings.

### 6.8 Review Phase

The `review` phase (`phases/review.py`) runs after `execute` and before the final approval checkpoint. It performs an internal quality check:

1. Load `prompts/review_template.md` which contains the review prompt structure.
2. Send the `workflow_result`, the `brief.success_criteria`, and the `brief.stop_rule` to the **heavy model**.
3. The model returns a structured review: `{"meets_criteria": bool, "confidence": 0.0-1.0, "gaps": [...], "recommendations": [...]}`.
4. Store the result in `state["review_result"]`.
5. If `meets_criteria` is false or `confidence` is below `brief.confidence_target`, add a warning to the final approval display.

The review result is shown to the user at the final approval checkpoint alongside the workflow result.

---

## 7. Ingestion Pipeline

### 7.1 Parser Strategy

1. Check file type (PDF, DOCX, PPTX, MD, TXT, code files).
2. For documents: call existing `text_extractor.py` (MinerU → PyMuPDF → pdfplumber).
3. Check parse confidence. If structure is lost, tables are broken, or reading order is wrong → escalate to Docling.
4. For code files: read directly, no parsing needed.
5. For URLs: fetch content, extract text.

### 7.2 ParsedFile Object

```python
@dataclass
class ParsedFile:
    file_path: str
    file_type: str
    raw_text: str
    structural_metadata: dict      # headings, sections, tables detected
    parser_used: str               # "mineru" | "pymupdf" | "pdfplumber" | "docling" | "direct"
    confidence: float              # 0.0 - 1.0
    token_estimate: int
```

### 7.3 Chunking

Hybrid chunking strategy:
- Preserve section/heading boundaries when available.
- Preserve page references when useful.
- Enforce max chunk size (configurable, default 2000 tokens).
- Each chunk carries metadata for traceability.

```python
@dataclass
class Chunk:
    chunk_id: str
    source_file: str
    section_ref: str | None
    page_ref: int | None
    text: str
    token_estimate: int
    parser_used: str
    confidence: float
    relevance_score: float | None = None   # assigned during routing
```

### 7.4 Importing text_extractor

Since this is a separate repo, the engine imports `text_extractor` by adding `pt-study-sop/brain` to `sys.path` at runtime, configured via `EngineConfig.text_extractor_path`. If the path doesn't exist, the engine falls back to a built-in lightweight parser (pypdf + python-docx).

---

## 8. Improvement Loop

Off by default. Activated when `brief.improve_mode_requested = True`.

### 8.1 Loop Steps

1. Run baseline version.
2. Evaluate with pluggable evaluator (default: LLM-as-judge via heavy model).
3. Identify failure patterns — heavy model.
4. Revise prompt, workflow, or code.
5. Rerun.
6. Compare new score to previous best.
7. Keep winner only if improvement is real (score delta > threshold).
8. Repeat until stop condition.

### 8.2 Stop Rules (evaluated in priority order)

1. **User override** via approval callback — highest priority, always honored.
2. **Score regression** — if any round scores lower than the previous best, stop immediately. This takes precedence over the consecutive-rounds rule.
3. **Max rounds reached** (configurable, default 5).
4. **Two consecutive non-improving rounds** — rounds where gain is below threshold count as non-improving.
5. **Gains below threshold** (configurable, default 2%) — a single sub-threshold round is non-improving but does not stop alone; two consecutive ones do (rule 4).

`config/stop_rules.yaml` contains per-category overrides for these defaults (e.g., code tasks may allow more rounds, research tasks may use a higher threshold).

### 8.3 Evaluator Interface

```python
class Evaluator(Protocol):
    def evaluate(self, output: str, criteria: list[str], rubric: dict | None) -> EvalResult: ...

@dataclass
class EvalResult:
    score: float              # 0.0 - 1.0
    reasoning: str
    per_criterion: dict[str, float]
    pass_fail: bool
```

Default implementation: `LLMJudgeEvaluator` — sends output + criteria to heavy model, parses structured score.

---

## 9. Model Routing

### 9.1 Routing Logic

The `route()` phase assigns each chunk a routing decision:

- **Light model** sees all chunks first when volume > 10 chunks.
- Light model assigns `relevance_score` (0.0 - 1.0) to each chunk.
- Chunks with relevance < 0.3 are dropped.
- Chunks with relevance 0.3 - 0.7 are compressed by light model.
- Chunks with relevance > 0.7 go to heavy model as-is.
- Heavy model may request original source chunks when confidence is low.

### 9.2 When Volume is Low

If total chunks <= 10, skip light model routing. Send everything directly to heavy model.

---

## 10. Approval System

### 10.1 How Approval Works in the Pipeline

Approval is **not a standalone phase module**. It is a helper function called from `runner.py` at two points:

1. **Checkpoint 1 (after `build_brief`):** Runner calls `approval_callback.request_approval(brief.to_plain_english(), "pre_execution")`. If `brief.approval_required_before_execution` is False, this is skipped.
2. **Checkpoint 2 (after `review`):** Runner calls `approval_callback.request_approval(formatted_result, "pre_final")`. If `brief.approval_required_before_final` is False, this is skipped.

### 10.2 Callback Interface

```python
class ApprovalCallback(Protocol):
    def request_approval(self, content: str, checkpoint: str) -> ApprovalResult: ...

@dataclass
class ApprovalResult:
    approved: bool
    feedback: str | None = None
```

### 10.3 Feedback Handling

When `ApprovalResult.feedback` is not None:

- **At Checkpoint 1 (pre_execution):** The runner passes the feedback back to `build_brief`, which revises the brief using the medium model and re-presents for approval. Max 3 revision cycles before escalating to user with "please edit the brief directly."
- **At Checkpoint 2 (pre_final):** The runner passes feedback to the `execute` phase for a targeted revision of the workflow result. The revised result goes through `review` again before re-presenting for approval. Max 2 revision cycles.

### 10.4 Default Implementation

`TerminalApproval` — prints content to stdout, waits for y/n. If the user types anything other than "y"/"yes", it is captured as feedback.

### 10.5 Escalation Conditions

The runner checks escalation conditions at **every phase boundary** via a `check_escalation(state, config) -> str | None` guard function in `runner.py`. If triggered, it calls the approval callback with the escalation reason. Conditions:

- Task classification confidence < 0.6
- Success criteria are empty or vague
- Risk flags are present
- Parser confidence < 0.5 on any critical file
- Evidence conflicts materially
- Final answer confidence below target

---

## 11. Configuration

```python
@dataclass
class EngineConfig:
    # Model routing
    codex_path: str = "codex"                    # path to codex CLI
    light_profile: str = "codex_spark"
    medium_profile: str = "gpt5_mini"
    heavy_profile: str = "deep"

    # Ingestion
    text_extractor_path: str | None = None       # path to pt-study-sop/brain/
    max_chunk_tokens: int = 2000
    docling_escalation_threshold: float = 0.6    # confidence below this triggers Docling

    # Improvement loop
    max_improve_rounds: int = 5
    improve_threshold: float = 0.02              # minimum score delta to count as improvement
    max_non_improving_rounds: int = 2

    # Routing
    relevance_drop_threshold: float = 0.3
    relevance_compress_threshold: float = 0.7
    small_volume_cutoff: int = 10                # skip routing below this

    # Callbacks (set at runtime)
    approval_callback: ApprovalCallback | None = None
    evaluator: Evaluator | None = None

    # Storage
    results_dir: str = "results"
```

Loaded from `config/engine.yaml` with programmatic overrides.

---

## 12. File Layout

```
autoresearch-engine/
├── pyproject.toml
├── README.md
├── config/
│   ├── engine.yaml              # default configuration
│   ├── task_categories.yaml     # category definitions + routing rules
│   ├── stop_rules.yaml          # stop conditions per category
│   └── parser_rules.yaml        # parser selection + escalation rules
├── prompts/
│   ├── discovery_core.md        # 10 core intake questions
│   ├── discovery_followups.md   # branching questions by category
│   ├── brief_template.md        # brief formatting for approval display
│   ├── bridge_intake.md         # prompt-bridge mode intake prompt
│   ├── review_template.md       # review phase prompt
│   └── improve_loop.md          # improvement loop prompts
├── schemas/
│   ├── execution_brief.json     # JSON schema for brief validation
│   ├── chunk.json               # JSON schema for chunks
│   └── result.json              # JSON schema for final results
├── src/
│   └── autoresearch/
│       ├── __init__.py
│       ├── cli.py               # CLI entry point
│       ├── runner.py            # pipeline orchestrator
│       ├── state.py             # EngineState, EngineConfig
│       ├── bridge.py            # CodexBridge
│       ├── models.py            # ExecutionBrief, ParsedFile, Chunk, EvalResult
│       ├── discovery/
│       │   ├── __init__.py
│       │   ├── embedded.py      # embedded mode discovery
│       │   └── prompt_bridge.py # prompt-bridge mode discovery
│       ├── phases/
│       │   ├── __init__.py
│       │   ├── classify.py
│       │   ├── build_brief.py
│       │   ├── ingest.py
│       │   ├── route.py
│       │   ├── execute.py          # dispatches to workflows/
│       │   ├── review.py
│       │   └── deliver.py
│       ├── workflows/
│       │   ├── __init__.py
│       │   ├── research.py
│       │   ├── compare.py
│       │   ├── plan.py
│       │   ├── analyze_docs.py
│       │   ├── improve.py
│       │   └── code_task.py
│       ├── ingestion/
│       │   ├── __init__.py
│       │   ├── parser_router.py
│       │   ├── chunker.py
│       │   └── fallback_parser.py   # lightweight pypdf+docx when text_extractor unavailable
│       ├── evaluation/
│       │   ├── __init__.py
│       │   ├── base.py          # Evaluator protocol
│       │   └── llm_judge.py     # LLM-as-judge default
│       └── approval/
│           ├── __init__.py
│           ├── base.py          # ApprovalCallback protocol
│           └── terminal.py      # terminal prompt default
├── results/
│   ├── briefs/              # serialized ExecutionBrief JSON files
│   ├── parsed/              # ParsedFile outputs from ingestion phase
│   ├── runs/                # per-run state snapshots (full EngineState at each phase)
│   └── finals/              # final delivered outputs (the end product)
└── tests/
    ├── test_bridge.py
    ├── test_discovery.py
    ├── test_classify.py
    ├── test_brief.py
    ├── test_ingest.py
    ├── test_route.py
    ├── test_workflows.py
    └── test_improve.py
```

---

## 13. CLI Interface

```bash
# Start a new task (embedded mode, interactive)
autoresearch run

# Start with initial context
autoresearch run "Compare Redis vs Memcached for session caching"

# Prompt-bridge mode
autoresearch run --mode bridge

# Resume from a saved brief
autoresearch resume results/briefs/abc123.json

# Run with improvement loop
autoresearch run --improve --max-rounds 5

# Use specific profiles
autoresearch run --light-profile gpt5_mini --heavy-profile deep
```

### 13.1 Resume Command

`autoresearch resume <brief_path>` reconstructs state from a saved brief and re-enters the pipeline:

1. Load `ExecutionBrief.from_json(brief_path)`.
2. Check `results/runs/` for a matching state snapshot (by `brief_id`). If found, resume from the last completed phase.
3. If no state snapshot exists, reconstruct minimal state from the brief (discovery is skipped, classification is taken from brief fields).
4. Re-run the approval checkpoint for the brief (user may have edited it).
5. Continue pipeline from the `ingest` phase onward.

This means resume always re-approves and re-executes. It does not skip execution phases.

---

## 14. Remaining Design Decisions (Author's Judgment)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package manager | `uv` with `pyproject.toml` | Fast, modern, no setup.py needed |
| CLI framework | `click` | Simple, well-known, no magic |
| Config format | YAML with dataclass overlay | Human-readable, programmatically overridable |
| Prompt-bridge output | Markdown with structured sections | Easy to paste into ChatGPT |
| Results storage | JSON files in `results/` | Simple, inspectable, no database needed |
| Logging | Python `logging` module | Standard, no dependency |
| Error handling | Custom exceptions per phase | Clear error attribution |
| Testing | pytest with fixtures for state objects | Matches existing pt-study-sop patterns |
| text_extractor import | Optional sys.path injection | Graceful fallback when not available |
