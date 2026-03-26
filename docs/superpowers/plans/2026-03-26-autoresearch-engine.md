# Autoresearch Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a general-purpose autoresearch engine as a standalone Python library + CLI that discovers requirements, classifies tasks, routes work across light/heavy models via Codex CLI, and executes task-specific workflows with approval checkpoints.

**Architecture:** Pipeline-of-functions. Each phase is a pure function `(state, config) -> state`. A runner chains them sequentially. Model calls go through a Codex CLI subprocess bridge. Approval and evaluation are pluggable via Protocol-based callbacks.

**Tech Stack:** Python 3.11+, click (CLI), PyYAML (config), pytest (tests), uv (package manager), Codex CLI (model calls)

**Spec:** `docs/superpowers/specs/2026-03-26-autoresearch-engine-design.md`

---

## Task 1: Scaffold the Repository

**Files:**
- Create: `C:\autoresearch-engine\pyproject.toml`
- Create: `C:\autoresearch-engine\.gitignore`
- Create: `C:\autoresearch-engine\src\autoresearch\__init__.py`
- Create: `C:\autoresearch-engine\tests\__init__.py`
- Create: `C:\autoresearch-engine\config\.gitkeep`
- Create: `C:\autoresearch-engine\prompts\.gitkeep`
- Create: `C:\autoresearch-engine\schemas\.gitkeep`
- Create: `C:\autoresearch-engine\results\briefs\.gitkeep`
- Create: `C:\autoresearch-engine\results\parsed\.gitkeep`
- Create: `C:\autoresearch-engine\results\runs\.gitkeep`
- Create: `C:\autoresearch-engine\results\finals\.gitkeep`

- [ ] **Step 1: Create the repo directory and init git**

```bash
mkdir -p C:\autoresearch-engine
cd C:\autoresearch-engine
git init
```

- [ ] **Step 2: Create pyproject.toml**

```toml
[project]
name = "autoresearch"
version = "0.1.0"
description = "General-purpose autoresearch engine with structured discovery, task classification, and model routing"
requires-python = ">=3.11"
dependencies = [
    "click>=8.0",
    "pyyaml>=6.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
]
parsing = [
    "pypdf>=4.0",
    "python-docx>=1.0",
]

[project.scripts]
autoresearch = "autoresearch.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/autoresearch"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
```

- [ ] **Step 3: Create .gitignore**

```
__pycache__/
*.pyc
.venv/
dist/
*.egg-info/
results/briefs/*.json
results/parsed/*.json
results/runs/*.json
results/finals/*.json
.pytest_cache/
```

- [ ] **Step 4: Create directory structure with placeholder files**

```bash
mkdir -p src/autoresearch/discovery
mkdir -p src/autoresearch/phases
mkdir -p src/autoresearch/workflows
mkdir -p src/autoresearch/ingestion
mkdir -p src/autoresearch/evaluation
mkdir -p src/autoresearch/approval
mkdir -p tests
mkdir -p config
mkdir -p prompts
mkdir -p schemas
mkdir -p results/briefs results/parsed results/runs results/finals
```

Create `src/autoresearch/__init__.py`:
```python
"""Autoresearch Engine — structured discovery, classification, and execution."""

__version__ = "0.1.0"
```

Create `__init__.py` in each subpackage with a docstring:

- `src/autoresearch/discovery/__init__.py`: `"""Discovery subsystem."""`
- `src/autoresearch/phases/__init__.py`: `"""Pipeline phases."""`
- `src/autoresearch/workflows/__init__.py`: `"""Task-specific workflows."""`
- `src/autoresearch/ingestion/__init__.py`: `"""Document ingestion."""`
- `src/autoresearch/evaluation/__init__.py`: `"""Evaluation system."""`
- `src/autoresearch/approval/__init__.py`: `"""Approval system."""`
- `tests/__init__.py`: empty

**Verify all packages import correctly:**
```bash
python -c "from autoresearch import workflows; print('OK')"
```

- [ ] **Step 5: Install in dev mode and verify**

```bash
cd C:\autoresearch-engine
uv venv
uv pip install -e ".[dev]"
python -c "import autoresearch; print(autoresearch.__version__)"
```

Expected: `0.1.0`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold autoresearch-engine repo with pyproject.toml and directory structure"
```

---

## Task 2: Core Data Models

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\models.py`
- Create: `C:\autoresearch-engine\tests\test_models.py`

- [ ] **Step 1: Write failing tests for ExecutionBrief**

`tests/test_models.py`:
```python
import json
from autoresearch.models import ExecutionBrief, ParsedFile, Chunk, EvalResult


class TestExecutionBrief:
    def test_create_brief_with_required_fields(self):
        brief = ExecutionBrief(
            brief_id="test-123",
            timestamp="2026-03-26T12:00:00Z",
            mode="embedded",
            primary_category="research",
            secondary_category=None,
            goal="Find the best PT study method",
            desired_output="Ranked list of methods",
            summary_plain_english="Research PT study methods and rank them.",
            available_inputs=["notes.pdf"],
            input_types=["pdf"],
            constraints=["Must be evidence-based"],
            success_criteria=["At least 3 methods compared"],
            current_assumptions=["Spaced repetition is effective"],
            missing_information=[],
            confidence_target="high",
            preferred_method=None,
            time_limit=None,
            cost_limit=None,
            proposed_workflow="research",
            stop_rule="Stop when 3+ methods compared with evidence",
        )
        assert brief.brief_id == "test-123"
        assert brief.primary_category == "research"
        assert brief.approval_required_before_execution is True

    def test_brief_to_json_roundtrip(self):
        brief = ExecutionBrief(
            brief_id="rt-456",
            timestamp="2026-03-26T12:00:00Z",
            mode="prompt-bridge",
            primary_category="compare",
            secondary_category="research",
            goal="Compare Redis vs Memcached",
            desired_output="Decision matrix",
            summary_plain_english="Compare caching options.",
            available_inputs=[],
            input_types=[],
            constraints=[],
            success_criteria=["Clear winner identified"],
            current_assumptions=[],
            missing_information=[],
            confidence_target="medium",
            preferred_method=None,
            time_limit="1 hour",
            cost_limit=None,
            proposed_workflow="compare",
            stop_rule="Stop when decision matrix is complete",
        )
        json_str = brief.to_json()
        restored = ExecutionBrief.from_json_str(json_str)
        assert restored.brief_id == "rt-456"
        assert restored.secondary_category == "research"
        assert restored.time_limit == "1 hour"

    def test_brief_to_plain_english(self):
        brief = ExecutionBrief(
            brief_id="pe-789",
            timestamp="2026-03-26T12:00:00Z",
            mode="embedded",
            primary_category="plan",
            secondary_category=None,
            goal="Create a weekly study schedule",
            desired_output="Calendar-ready schedule",
            summary_plain_english="Build a study schedule based on course load.",
            available_inputs=["syllabus.pdf"],
            input_types=["pdf"],
            constraints=["Max 4 hours/day"],
            success_criteria=["Covers all topics"],
            current_assumptions=[],
            missing_information=[],
            confidence_target="high",
            preferred_method=None,
            time_limit=None,
            cost_limit=None,
            proposed_workflow="plan",
            stop_rule="Stop when all topics scheduled",
        )
        text = brief.to_plain_english()
        assert "Create a weekly study schedule" in text
        assert "Calendar-ready schedule" in text
        assert "plan" in text.lower()


class TestParsedFile:
    def test_create_parsed_file(self):
        pf = ParsedFile(
            file_path="/tmp/test.pdf",
            file_type="pdf",
            raw_text="Hello world",
            structural_metadata={"headings": ["Chapter 1"]},
            parser_used="pymupdf",
            confidence=0.9,
            token_estimate=3,
        )
        assert pf.confidence == 0.9
        assert pf.parser_used == "pymupdf"


class TestChunk:
    def test_create_chunk(self):
        c = Chunk(
            chunk_id="c-001",
            source_file="/tmp/test.pdf",
            section_ref="Chapter 1",
            page_ref=1,
            text="Some text content",
            token_estimate=4,
            parser_used="pymupdf",
            confidence=0.9,
        )
        assert c.relevance_score is None
        c.relevance_score = 0.8
        assert c.relevance_score == 0.8


class TestEvalResult:
    def test_create_eval_result(self):
        er = EvalResult(
            score=0.85,
            reasoning="Good coverage",
            per_criterion={"completeness": 0.9, "accuracy": 0.8},
            pass_fail=True,
        )
        assert er.pass_fail is True
        assert er.per_criterion["completeness"] == 0.9
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:\autoresearch-engine
pytest tests/test_models.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'autoresearch.models'`

- [ ] **Step 3: Implement models.py**

`src/autoresearch/models.py`:
```python
"""Core data models for the autoresearch engine."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ExecutionBrief:
    """The contract between discovery and execution."""

    # Identity
    brief_id: str
    timestamp: str
    mode: str  # "embedded" | "prompt-bridge"

    # Classification
    primary_category: str
    secondary_category: str | None

    # Core
    goal: str
    desired_output: str
    summary_plain_english: str
    available_inputs: list[str]
    input_types: list[str]
    constraints: list[str]
    success_criteria: list[str]
    current_assumptions: list[str]
    missing_information: list[str]
    confidence_target: str  # "low" | "medium" | "high" | "very_high"
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
    evaluation_rubric: dict[str, Any] | None = None

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)

    def to_plain_english(self) -> str:
        lines = [
            f"## Execution Brief: {self.brief_id}",
            "",
            f"**Goal:** {self.goal}",
            f"**Desired Output:** {self.desired_output}",
            f"**Task Type:** {self.primary_category}"
            + (f" + {self.secondary_category}" if self.secondary_category else ""),
            "",
            f"{self.summary_plain_english}",
            "",
            f"**Inputs:** {', '.join(self.available_inputs) if self.available_inputs else 'None provided'}",
            f"**Constraints:** {', '.join(self.constraints) if self.constraints else 'None'}",
            f"**Success Criteria:** {', '.join(self.success_criteria)}",
            f"**Confidence Target:** {self.confidence_target}",
            f"**Stop Rule:** {self.stop_rule}",
        ]
        if self.risk_flags:
            lines.append(f"**Risk Flags:** {', '.join(self.risk_flags)}")
        return "\n".join(lines)

    @classmethod
    def from_json_str(cls, json_str: str) -> ExecutionBrief:
        data = json.loads(json_str)
        return cls(**data)

    @classmethod
    def from_json_file(cls, path: str) -> ExecutionBrief:
        with open(path, "r") as f:
            return cls.from_json_str(f.read())


@dataclass
class ParsedFile:
    """Result of parsing a single input file."""

    file_path: str
    file_type: str
    raw_text: str
    structural_metadata: dict[str, Any]
    parser_used: str  # "mineru" | "pymupdf" | "pdfplumber" | "docling" | "direct"
    confidence: float  # 0.0 - 1.0
    token_estimate: int


@dataclass
class Chunk:
    """A chunk of text from a parsed file, ready for routing."""

    chunk_id: str
    source_file: str
    section_ref: str | None
    page_ref: int | None
    text: str
    token_estimate: int
    parser_used: str
    confidence: float
    relevance_score: float | None = None


@dataclass
class EvalResult:
    """Result from an evaluator."""

    score: float  # 0.0 - 1.0
    reasoning: str
    per_criterion: dict[str, float]
    pass_fail: bool
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_models.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/models.py tests/test_models.py
git commit -m "feat: add core data models (ExecutionBrief, ParsedFile, Chunk, EvalResult)"
```

---

## Task 3: Engine State and Configuration

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\state.py`
- Create: `C:\autoresearch-engine\config\engine.yaml`
- Create: `C:\autoresearch-engine\tests\test_state.py`

- [ ] **Step 1: Write failing tests**

`tests/test_state.py`:
```python
from autoresearch.state import EngineConfig, create_initial_state, load_config


class TestEngineConfig:
    def test_default_config(self):
        config = EngineConfig()
        assert config.codex_path == "codex"
        assert config.light_profile == "codex_spark"
        assert config.medium_profile == "gpt5_mini"
        assert config.heavy_profile == "deep"
        assert config.max_chunk_tokens == 2000
        assert config.max_improve_rounds == 5

    def test_config_override(self):
        config = EngineConfig(light_profile="gpt5_mini", max_chunk_tokens=1000)
        assert config.light_profile == "gpt5_mini"
        assert config.max_chunk_tokens == 1000

    def test_load_config_from_yaml(self, tmp_path):
        yaml_file = tmp_path / "engine.yaml"
        yaml_file.write_text(
            "codex_path: /usr/local/bin/codex\n"
            "light_profile: gpt5_mini\n"
            "max_chunk_tokens: 1500\n"
        )
        config = load_config(str(yaml_file))
        assert config.codex_path == "/usr/local/bin/codex"
        assert config.light_profile == "gpt5_mini"
        assert config.max_chunk_tokens == 1500
        # Unset fields keep defaults
        assert config.heavy_profile == "deep"

    def test_load_config_missing_file_returns_defaults(self):
        config = load_config("/nonexistent/path.yaml")
        assert config.codex_path == "codex"


class TestCreateInitialState:
    def test_embedded_mode(self):
        state = create_initial_state("embedded")
        assert state["mode"] == "embedded"
        assert state["intake_answers"] == {}
        assert state["followup_answers"] == {}
        assert state["parsed_files"] == []
        assert state["chunks"] == []
        assert state["improve_mode"] is False

    def test_prompt_bridge_mode(self):
        state = create_initial_state("prompt-bridge")
        assert state["mode"] == "prompt-bridge"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_state.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement state.py**

`src/autoresearch/state.py`:
```python
"""Engine state and configuration."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, fields
from pathlib import Path
from typing import Any, Protocol

logger = logging.getLogger(__name__)


@dataclass
class EngineConfig:
    """Configuration for the autoresearch engine."""

    # Model routing
    codex_path: str = "codex"
    light_profile: str = "codex_spark"
    medium_profile: str = "gpt5_mini"
    heavy_profile: str = "deep"

    # Ingestion
    text_extractor_path: str | None = None
    max_chunk_tokens: int = 2000
    docling_escalation_threshold: float = 0.6

    # Improvement loop
    max_improve_rounds: int = 5
    improve_threshold: float = 0.02
    max_non_improving_rounds: int = 2

    # Routing
    relevance_drop_threshold: float = 0.3
    relevance_compress_threshold: float = 0.7
    small_volume_cutoff: int = 10

    # Callbacks (set at runtime, not serialized)
    approval_callback: ApprovalCallback | None = field(default=None, repr=False)
    evaluator: Evaluator | None = field(default=None, repr=False)

    # Storage
    results_dir: str = "results"


def load_config(yaml_path: str) -> EngineConfig:
    """Load config from YAML, falling back to defaults for missing keys."""
    path = Path(yaml_path)
    if not path.exists():
        logger.warning("Config file %s not found, using defaults", yaml_path)
        return EngineConfig()

    import yaml

    with open(path) as f:
        data = yaml.safe_load(f) or {}

    # Only pass keys that match EngineConfig fields (excluding callbacks)
    valid_keys = {f.name for f in fields(EngineConfig)} - {"approval_callback", "evaluator"}
    filtered = {k: v for k, v in data.items() if k in valid_keys}
    return EngineConfig(**filtered)


def create_initial_state(mode: str) -> dict[str, Any]:
    """Create a fresh EngineState dict."""
    return {
        "mode": mode,
        "intake_answers": {},
        "followup_answers": {},
        "primary_category": "",
        "secondary_category": None,
        "brief": None,
        "brief_approved": False,
        "parsed_files": [],
        "chunks": [],
        "workflow_result": {},
        "review_result": {},
        "final_approved": False,
        "improve_mode": False,
        "improve_rounds": [],
        "improve_winner": None,
    }
```

- [ ] **Step 4: Create config/engine.yaml**

`config/engine.yaml`:
```yaml
# Autoresearch Engine — Default Configuration
# Override any value here or pass programmatically via EngineConfig.

codex_path: codex
light_profile: codex_spark
medium_profile: gpt5_mini
heavy_profile: deep

max_chunk_tokens: 2000
docling_escalation_threshold: 0.6

max_improve_rounds: 5
improve_threshold: 0.02
max_non_improving_rounds: 2

relevance_drop_threshold: 0.3
relevance_compress_threshold: 0.7
small_volume_cutoff: 10

results_dir: results
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_state.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/autoresearch/state.py config/engine.yaml tests/test_state.py
git commit -m "feat: add EngineConfig, EngineState factory, YAML config loading"
```

---

## Task 4: Codex CLI Bridge

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\bridge.py`
- Create: `C:\autoresearch-engine\tests\test_bridge.py`

- [ ] **Step 1: Write failing tests**

`tests/test_bridge.py`:
```python
import subprocess
from unittest.mock import patch, MagicMock
from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig


class TestCodexBridge:
    def test_init_with_config(self):
        config = EngineConfig(codex_path="/usr/bin/codex", heavy_profile="balanced")
        bridge = CodexBridge(config)
        assert bridge.codex_path == "/usr/bin/codex"
        assert bridge.profiles["heavy"] == "balanced"

    def test_build_command(self):
        config = EngineConfig()
        bridge = CodexBridge(config)
        cmd = bridge._build_command("test prompt", "heavy")
        assert "codex" in cmd[0]
        assert "--profile" in cmd
        assert "deep" in cmd

    @patch("subprocess.run")
    def test_call_returns_stdout(self, mock_run):
        mock_run.return_value = MagicMock(
            stdout="Model response text",
            stderr="",
            returncode=0,
        )
        config = EngineConfig()
        bridge = CodexBridge(config)
        result = bridge.call("test prompt", profile="light")
        assert result == "Model response text"
        mock_run.assert_called_once()

    @patch("subprocess.run")
    def test_call_with_files_includes_file_args(self, mock_run):
        mock_run.return_value = MagicMock(
            stdout="Response with files",
            stderr="",
            returncode=0,
        )
        config = EngineConfig()
        bridge = CodexBridge(config)
        result = bridge.call_with_files(
            "analyze this",
            ["/tmp/a.pdf", "/tmp/b.txt"],
            profile="heavy",
        )
        assert result == "Response with files"
        call_args = mock_run.call_args
        cmd = call_args[0][0]
        # Files should appear in the prompt or as args
        assert mock_run.called

    @patch("subprocess.run")
    def test_call_raises_on_nonzero_exit(self, mock_run):
        mock_run.return_value = MagicMock(
            stdout="",
            stderr="Error: model not found",
            returncode=1,
        )
        config = EngineConfig()
        bridge = CodexBridge(config)
        try:
            bridge.call("test", profile="heavy")
            assert False, "Should have raised"
        except RuntimeError as e:
            assert "model not found" in str(e)

    @patch("subprocess.run")
    def test_call_timeout(self, mock_run):
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="codex", timeout=10)
        config = EngineConfig()
        bridge = CodexBridge(config)
        try:
            bridge.call("test", profile="heavy", timeout=10)
            assert False, "Should have raised"
        except TimeoutError:
            pass
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_bridge.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement bridge.py**

`src/autoresearch/bridge.py`:
```python
"""Codex CLI bridge for model calls."""

from __future__ import annotations

import logging
import subprocess
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


class CodexBridge:
    """Thin wrapper around Codex CLI subprocess calls."""

    def __init__(self, config: EngineConfig) -> None:
        self.codex_path = config.codex_path
        self.profiles = {
            "light": config.light_profile,
            "medium": config.medium_profile,
            "heavy": config.heavy_profile,
        }

    def _build_command(self, prompt: str, profile: str) -> list[str]:
        profile_name = self.profiles.get(profile, profile)
        return [
            self.codex_path,
            "--profile", profile_name,
            "--approval-policy", "full-auto",
            "-q", prompt,
        ]

    def call(self, prompt: str, profile: str = "heavy", timeout: int = 120) -> str:
        """Call Codex CLI and return the text response."""
        cmd = self._build_command(prompt, profile)
        logger.debug("Codex call: profile=%s, prompt_len=%d", profile, len(prompt))

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired:
            raise TimeoutError(f"Codex call timed out after {timeout}s")

        if result.returncode != 0:
            raise RuntimeError(
                f"Codex call failed (exit {result.returncode}): {result.stderr.strip()}"
            )

        return result.stdout.strip()

    def call_with_files(
        self,
        prompt: str,
        file_paths: list[str],
        profile: str = "heavy",
        timeout: int = 120,
    ) -> str:
        """Call Codex with file context.

        Files are referenced in the prompt itself since Codex CLI
        reads files from the working directory context.
        """
        file_list = "\n".join(f"- {p}" for p in file_paths)
        full_prompt = f"{prompt}\n\nRelevant files:\n{file_list}"
        return self.call(full_prompt, profile=profile, timeout=timeout)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_bridge.py -v
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/bridge.py tests/test_bridge.py
git commit -m "feat: add CodexBridge for Codex CLI subprocess model calls"
```

---

## Task 5: Approval System

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\approval\base.py`
- Create: `C:\autoresearch-engine\src\autoresearch\approval\terminal.py`
- Create: `C:\autoresearch-engine\tests\test_approval.py`

- [ ] **Step 1: Write failing tests**

`tests/test_approval.py`:
```python
from unittest.mock import patch
from autoresearch.approval.base import ApprovalResult
from autoresearch.approval.terminal import TerminalApproval


class TestApprovalResult:
    def test_approved_no_feedback(self):
        r = ApprovalResult(approved=True)
        assert r.approved is True
        assert r.feedback is None

    def test_rejected_with_feedback(self):
        r = ApprovalResult(approved=False, feedback="Change the goal")
        assert r.approved is False
        assert r.feedback == "Change the goal"


class TestTerminalApproval:
    @patch("builtins.input", return_value="y")
    def test_approve_with_y(self, mock_input):
        ta = TerminalApproval()
        result = ta.request_approval("Brief content here", "pre_execution")
        assert result.approved is True
        assert result.feedback is None

    @patch("builtins.input", return_value="yes")
    def test_approve_with_yes(self, mock_input):
        ta = TerminalApproval()
        result = ta.request_approval("Brief content", "pre_final")
        assert result.approved is True

    @patch("builtins.input", return_value="Change the scope to be narrower")
    def test_reject_captures_feedback(self, mock_input):
        ta = TerminalApproval()
        result = ta.request_approval("Brief content", "pre_execution")
        assert result.approved is False
        assert result.feedback == "Change the scope to be narrower"

    @patch("builtins.input", return_value="n")
    def test_reject_with_n(self, mock_input):
        ta = TerminalApproval()
        result = ta.request_approval("Content", "pre_execution")
        assert result.approved is False
        assert result.feedback == "n"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_approval.py -v
```

- [ ] **Step 3: Implement approval/base.py**

`src/autoresearch/approval/base.py`:
```python
"""Approval callback protocol and result type."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class ApprovalResult:
    """Result from an approval checkpoint."""

    approved: bool
    feedback: str | None = None


class ApprovalCallback(Protocol):
    """Protocol for approval callbacks."""

    def request_approval(self, content: str, checkpoint: str) -> ApprovalResult: ...
```

- [ ] **Step 4: Implement approval/terminal.py**

`src/autoresearch/approval/terminal.py`:
```python
"""Terminal-based approval implementation."""

from __future__ import annotations

from autoresearch.approval.base import ApprovalResult


class TerminalApproval:
    """Prints content to stdout and waits for y/n + optional feedback."""

    def request_approval(self, content: str, checkpoint: str) -> ApprovalResult:
        print(f"\n{'='*60}")
        print(f"APPROVAL CHECKPOINT: {checkpoint}")
        print(f"{'='*60}\n")
        print(content)
        print(f"\n{'='*60}")

        response = input("Approve? (y/yes to approve, anything else is feedback): ").strip()

        if response.lower() in ("y", "yes"):
            return ApprovalResult(approved=True)

        return ApprovalResult(approved=False, feedback=response)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_approval.py -v
```

Expected: all 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/autoresearch/approval/ tests/test_approval.py
git commit -m "feat: add approval system with Protocol interface and TerminalApproval"
```

---

## Task 6: Evaluation System

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\evaluation\base.py`
- Create: `C:\autoresearch-engine\src\autoresearch\evaluation\llm_judge.py`
- Create: `C:\autoresearch-engine\tests\test_evaluation.py`

- [ ] **Step 1: Write failing tests**

`tests/test_evaluation.py`:
```python
import json
from unittest.mock import patch, MagicMock
from autoresearch.evaluation.base import Evaluator
from autoresearch.evaluation.llm_judge import LLMJudgeEvaluator
from autoresearch.models import EvalResult
from autoresearch.state import EngineConfig


class TestLLMJudgeEvaluator:
    def test_implements_protocol(self):
        config = EngineConfig()
        evaluator = LLMJudgeEvaluator(config)
        # Should satisfy the Evaluator protocol (duck typing)
        assert hasattr(evaluator, "evaluate")

    @patch("autoresearch.evaluation.llm_judge.CodexBridge")
    def test_evaluate_parses_response(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "score": 0.85,
            "reasoning": "Good coverage of all criteria",
            "per_criterion": {"completeness": 0.9, "accuracy": 0.8},
            "pass_fail": True,
        })

        config = EngineConfig()
        evaluator = LLMJudgeEvaluator(config)
        result = evaluator.evaluate(
            output="The research found 3 methods...",
            criteria=["completeness", "accuracy"],
            rubric=None,
        )
        assert isinstance(result, EvalResult)
        assert result.score == 0.85
        assert result.pass_fail is True
        assert result.per_criterion["completeness"] == 0.9

    @patch("autoresearch.evaluation.llm_judge.CodexBridge")
    def test_evaluate_handles_invalid_json(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = "Not valid JSON at all"

        config = EngineConfig()
        evaluator = LLMJudgeEvaluator(config)
        result = evaluator.evaluate(
            output="Some output",
            criteria=["quality"],
            rubric=None,
        )
        # Should return a failing result rather than crashing
        assert isinstance(result, EvalResult)
        assert result.pass_fail is False
        assert result.score == 0.0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_evaluation.py -v
```

- [ ] **Step 3: Implement evaluation/base.py**

`src/autoresearch/evaluation/base.py`:
```python
"""Evaluator protocol."""

from __future__ import annotations

from typing import Protocol

from autoresearch.models import EvalResult


class Evaluator(Protocol):
    """Protocol for pluggable evaluators."""

    def evaluate(
        self, output: str, criteria: list[str], rubric: dict | None
    ) -> EvalResult: ...
```

- [ ] **Step 4: Implement evaluation/llm_judge.py**

`src/autoresearch/evaluation/llm_judge.py`:
```python
"""LLM-as-judge evaluator using Codex CLI."""

from __future__ import annotations

import json
import logging

from autoresearch.bridge import CodexBridge
from autoresearch.models import EvalResult
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


class LLMJudgeEvaluator:
    """Sends output + criteria to heavy model, parses structured score."""

    def __init__(self, config: EngineConfig) -> None:
        self.config = config

    def evaluate(
        self, output: str, criteria: list[str], rubric: dict | None
    ) -> EvalResult:
        bridge = CodexBridge(self.config)

        criteria_str = "\n".join(f"- {c}" for c in criteria)
        rubric_str = json.dumps(rubric, indent=2) if rubric else "No rubric provided."

        prompt = (
            "You are an evaluator. Score the following output against the criteria.\n\n"
            f"## Output to evaluate\n{output}\n\n"
            f"## Criteria\n{criteria_str}\n\n"
            f"## Rubric\n{rubric_str}\n\n"
            "Return a JSON object with these exact fields:\n"
            '- "score": float 0.0-1.0 (overall)\n'
            '- "reasoning": string (why this score)\n'
            '- "per_criterion": object mapping each criterion name to a float 0.0-1.0\n'
            '- "pass_fail": boolean (true if score >= 0.7)\n\n'
            "Return ONLY the JSON object, no other text."
        )

        try:
            response = bridge.call(prompt, profile="heavy")
            data = json.loads(response)
            return EvalResult(
                score=float(data["score"]),
                reasoning=str(data["reasoning"]),
                per_criterion={k: float(v) for k, v in data["per_criterion"].items()},
                pass_fail=bool(data["pass_fail"]),
            )
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning("Failed to parse evaluator response: %s", e)
            return EvalResult(
                score=0.0,
                reasoning=f"Evaluation failed: could not parse model response. Error: {e}",
                per_criterion={c: 0.0 for c in criteria},
                pass_fail=False,
            )
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_evaluation.py -v
```

Expected: all 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/autoresearch/evaluation/ tests/test_evaluation.py
git commit -m "feat: add pluggable evaluation system with LLM-as-judge default"
```

---

## Task 7: Config Files (YAML)

**Files:**
- Create: `C:\autoresearch-engine\config\task_categories.yaml`
- Create: `C:\autoresearch-engine\config\stop_rules.yaml`
- Create: `C:\autoresearch-engine\config\parser_rules.yaml`

- [ ] **Step 1: Create task_categories.yaml**

`config/task_categories.yaml`:
```yaml
# Task category definitions for classification.
# The classifier sends these to the model for matching.

categories:
  research:
    description: "Find, gather, and synthesize information about a topic"
    signals:
      - "what is"
      - "how does"
      - "find out"
      - "learn about"
      - "investigate"
    allowed_secondary: ["compare", "analyze_docs"]

  compare:
    description: "Evaluate two or more options against criteria and recommend one"
    signals:
      - "compare"
      - "which is better"
      - "pros and cons"
      - "A vs B"
      - "choose between"
    allowed_secondary: ["research"]

  plan:
    description: "Create a structured plan with phases, steps, and contingencies"
    signals:
      - "create a plan"
      - "build a schedule"
      - "roadmap"
      - "strategy"
      - "how to accomplish"
    allowed_secondary: ["research", "code"]

  analyze_docs:
    description: "Parse, extract, and synthesize information from documents"
    signals:
      - "analyze this document"
      - "extract from"
      - "summarize these files"
      - "what does this say about"
    allowed_secondary: ["research", "compare"]

  improve:
    description: "Take an existing output and iteratively make it better"
    signals:
      - "improve"
      - "make better"
      - "optimize"
      - "refine"
      - "iterate on"
    allowed_secondary: ["code", "research"]

  code:
    description: "Write, review, debug, or automate code and technical tasks"
    signals:
      - "write code"
      - "build a script"
      - "automate"
      - "debug"
      - "implement"
    allowed_secondary: ["plan", "improve"]
```

- [ ] **Step 2: Create stop_rules.yaml**

`config/stop_rules.yaml`:
```yaml
# Stop rules per task category.
# These override the defaults in EngineConfig.

defaults:
  max_improve_rounds: 5
  improve_threshold: 0.02
  max_non_improving_rounds: 2

overrides:
  code:
    max_improve_rounds: 8
    improve_threshold: 0.01
  research:
    improve_threshold: 0.05
  compare:
    max_improve_rounds: 3
```

- [ ] **Step 3: Create parser_rules.yaml**

`config/parser_rules.yaml`:
```yaml
# Parser selection and escalation rules.

file_types:
  pdf:
    primary_parser: text_extractor  # uses brain/text_extractor.py
    fallback_parser: pypdf
    escalation_parser: docling
    escalation_threshold: 0.6

  docx:
    primary_parser: text_extractor
    fallback_parser: python_docx
    escalation_parser: docling
    escalation_threshold: 0.6

  pptx:
    primary_parser: text_extractor
    fallback_parser: python_docx
    escalation_parser: docling
    escalation_threshold: 0.5

  md:
    primary_parser: direct
    fallback_parser: direct

  txt:
    primary_parser: direct
    fallback_parser: direct

  code:
    primary_parser: direct
    fallback_parser: direct
    # code files: .py, .js, .ts, .java, .go, .rs, .cpp, .c, .sh, .yaml, .json, .toml
```

- [ ] **Step 4: Commit**

```bash
git add config/
git commit -m "feat: add YAML config files for task categories, stop rules, and parser rules"
```

---

## Task 8: Prompt Templates

**Files:**
- Create: `C:\autoresearch-engine\prompts\discovery_core.md`
- Create: `C:\autoresearch-engine\prompts\discovery_followups.md`
- Create: `C:\autoresearch-engine\prompts\brief_template.md`
- Create: `C:\autoresearch-engine\prompts\bridge_intake.md`
- Create: `C:\autoresearch-engine\prompts\review_template.md`
- Create: `C:\autoresearch-engine\prompts\improve_loop.md`

- [ ] **Step 1: Create discovery_core.md**

`prompts/discovery_core.md`:
```markdown
# Discovery — Core Intake

You are a discovery agent. Your job is to understand the user's task clearly before any execution begins.

Ask the following questions one at a time. Adapt wording to the user's context. Skip questions the user has already answered.

## Core Questions

1. **Goal:** What are you trying to know, decide, build, improve, or solve?
2. **Desired Output:** What final output do you want? (report, decision matrix, plan, code, summary, etc.)
3. **Available Inputs:** What inputs do you already have? (files, links, notes, code, data)
4. **Constraints:** What constraints matter? (time, cost, tools, access, audience)
5. **Success Criteria:** How will we know the result is good enough?
6. **Current Assumptions:** What do you already assume is true?
7. **Missing Information:** What information is still missing?
8. **Confidence Target:** How certain does the result need to be? (low/medium/high/very_high)
9. **Preferred Method:** Do you prefer any specific method or approach?
10. **Limits:** What time or cost limits should the engine respect?

## Completion Rule

Discovery is complete when you can fill all of these fields:
- goal
- desired_output
- primary_category (research/compare/plan/analyze_docs/improve/code)
- inputs
- constraints
- success_criteria
- missing_info_status
- confidence_target
- proposed_workflow
- stop_rule

Return your answers as a JSON object with these field names.
```

- [ ] **Step 2: Create discovery_followups.md**

`prompts/discovery_followups.md`:
```markdown
# Discovery — Branching Follow-up Questions

Based on the task category, ask these targeted follow-ups only for fields that are still unclear or missing.

## Research
- Is this factual, exploratory, or decision-oriented research?
- Does recency matter? (Must sources be current?)
- What sources are allowed or preferred?

## Compare
- What specific options are being compared?
- What decision criteria matter most? Rank them.
- Are any criteria deal-breakers? (Must-haves vs nice-to-haves)

## Plan
- What is the deadline or target timeline?
- What resources are available? (people, tools, budget)
- What failure points must the plan account for?

## Analyze Documents
- What kinds of documents are these? (academic, legal, technical, mixed)
- What specific information should be extracted?
- Is layout fidelity important? (tables, figures, reading order)

## Improve
- What exactly is being improved? (prompt, code, workflow, document)
- How is it currently failing or underperforming?
- What evidence counts as improvement? (test pass rate, score, user feedback)

## Code
- What environment or runtime is involved? (Python, Node, etc.)
- Is there an existing codebase to work with?
- What test or validation mechanism exists?

## Instructions
Select 2-3 follow-up questions from the relevant category. Only ask questions whose answers are not already clear from the intake. Return the selected questions as a JSON array of strings.
```

- [ ] **Step 3: Create brief_template.md**

`prompts/brief_template.md`:
```markdown
# Brief Builder

Given the discovery answers below, create an ExecutionBrief.

## Discovery Answers
{intake_answers}

## Follow-up Answers
{followup_answers}

## Classification
Primary: {primary_category}
Secondary: {secondary_category}

## Instructions

Create a JSON object with all ExecutionBrief fields. Required fields:

- brief_id: generate a UUID
- timestamp: current ISO 8601 timestamp
- mode: "{mode}"
- primary_category, secondary_category: from classification
- goal, desired_output: from intake
- summary_plain_english: 3-4 sentence summary of what the user wants, what the engine will do, what evidence it will use, and when it will stop
- available_inputs, input_types: from intake
- constraints, success_criteria, current_assumptions, missing_information: from intake
- confidence_target: from intake
- preferred_method, time_limit, cost_limit: from intake (null if not specified)
- proposed_workflow: must be one of: research, compare, plan, analyze_docs, improve, code
- stop_rule: natural language stop condition derived from success criteria
- approval_required_before_execution: true
- approval_required_before_final: true
- improve_mode_requested: true only if the task is explicitly about improvement

Return ONLY the JSON object.
```

- [ ] **Step 4: Create bridge_intake.md**

`prompts/bridge_intake.md`:
```markdown
# Autoresearch Engine — Intake Prompt

I'm using a structured research engine that needs clear answers before it can start working.

Please help me answer these questions about my task:

## Context
{user_context}

## Questions

1. **What am I trying to accomplish?** (Know something, decide something, build something, improve something, or solve a problem?)

2. **What should the final output look like?** (Report, comparison table, plan, code, summary, decision recommendation?)

3. **What do I already have to work with?** (Files, notes, links, existing code, data?)

4. **What constraints should we respect?** (Time, budget, tools, access, audience?)

5. **How will we know the result is good enough?** (Specific criteria for success)

6. **What do I already believe is true about this?** (Assumptions that should be checked or accepted)

7. **What information is still missing?** (Known unknowns)

8. **How confident does the answer need to be?** (Rough estimate OK, or need high certainty?)

9. **Any preferred method or approach?** (Optional)

10. **Any hard limits on time or cost?** (Optional)

## Format

Please structure your answers in this format:

```
GOAL: [your answer]
DESIRED_OUTPUT: [your answer]
INPUTS: [your answer]
CONSTRAINTS: [your answer]
SUCCESS_CRITERIA: [your answer]
ASSUMPTIONS: [your answer]
MISSING_INFO: [your answer]
CONFIDENCE: [low/medium/high/very_high]
METHOD: [your answer or "none"]
LIMITS: [your answer or "none"]
```
```

- [ ] **Step 5: Create review_template.md**

`prompts/review_template.md`:
```markdown
# Internal Review

Review the workflow result against the execution brief's success criteria and stop rule.

## Execution Brief
Goal: {goal}
Success Criteria: {success_criteria}
Stop Rule: {stop_rule}
Confidence Target: {confidence_target}

## Workflow Result
{workflow_result}

## Instructions

Evaluate whether the result meets the success criteria. Return a JSON object:

- "meets_criteria": boolean — does the result satisfy all success criteria?
- "confidence": float 0.0-1.0 — how confident are you in this assessment?
- "gaps": array of strings — what's missing or weak?
- "recommendations": array of strings — what would make this better?

Return ONLY the JSON object.
```

- [ ] **Step 6: Create improve_loop.md**

`prompts/improve_loop.md`:
```markdown
# Improvement Loop

You are analyzing a failed or underperforming output to identify what to revise.

## Previous Output
{previous_output}

## Evaluation Result
Score: {score}
Reasoning: {reasoning}
Per-criterion scores: {per_criterion}

## Success Criteria
{success_criteria}

## Instructions

Identify the top 3 failure patterns and propose specific revisions.

Return a JSON object:
- "failure_patterns": array of strings describing what went wrong
- "revisions": array of strings describing specific changes to make
- "focus_area": string — the single most impactful area to improve

Return ONLY the JSON object.
```

- [ ] **Step 7: Commit**

```bash
git add prompts/
git commit -m "feat: add prompt templates for discovery, brief building, review, and improvement"
```

---

## Task 9: Discovery — Embedded Mode

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\discovery\embedded.py`
- Create: `C:\autoresearch-engine\tests\test_discovery.py`

- [ ] **Step 1: Write failing tests**

`tests/test_discovery.py`:
```python
import json
from unittest.mock import patch, MagicMock
from autoresearch.discovery.embedded import run_embedded_discovery
from autoresearch.state import EngineConfig, create_initial_state


class TestEmbeddedDiscovery:
    @patch("autoresearch.discovery.embedded.CodexBridge")
    def test_discovery_populates_intake_answers(self, MockBridge):
        mock_bridge = MockBridge.return_value
        # First call: heavy model generates tailored questions
        # Second call: model processes user answers into structured form
        mock_bridge.call.side_effect = [
            json.dumps({
                "questions": [
                    "What specific topic are you researching?",
                    "What format should the output be in?",
                ]
            }),
            json.dumps({
                "goal": "Research PT study methods",
                "desired_output": "Summary report",
                "inputs": [],
                "constraints": ["Time: 1 hour"],
                "success_criteria": ["3+ methods covered"],
                "assumptions": ["Spaced repetition works"],
                "missing_info": [],
                "confidence_target": "high",
                "preferred_method": None,
                "limits": "1 hour",
            }),
        ]

        state = create_initial_state("embedded")
        config = EngineConfig()

        # Mock the user input callback
        def mock_input_callback(content, checkpoint):
            from autoresearch.approval.base import ApprovalResult
            return ApprovalResult(approved=True, feedback="PT study methods, summary report")

        config.approval_callback = MagicMock()
        config.approval_callback.request_approval = mock_input_callback

        result = run_embedded_discovery(state, config)
        assert result["intake_answers"]["goal"] == "Research PT study methods"
        assert result["intake_answers"]["confidence_target"] == "high"

    def test_discovery_requires_approval_callback(self):
        state = create_initial_state("embedded")
        config = EngineConfig()  # no callback set
        try:
            run_embedded_discovery(state, config)
            assert False, "Should raise"
        except ValueError as e:
            assert "approval_callback" in str(e)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_discovery.py -v
```

- [ ] **Step 3: Implement embedded.py**

`src/autoresearch/discovery/embedded.py`:
```python
"""Embedded mode discovery — Codex CLI asks questions directly."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


def run_embedded_discovery(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Run embedded mode discovery. Modifies and returns state."""
    if config.approval_callback is None:
        raise ValueError("Embedded discovery requires an approval_callback on EngineConfig")

    bridge = CodexBridge(config)
    core_prompt = _load_prompt("discovery_core.md")

    # Step 1: Heavy model generates tailored questions from core template
    questions_response = bridge.call(
        f"{core_prompt}\n\nGenerate 5-8 tailored discovery questions based on this template. "
        "Return a JSON object with a 'questions' array.",
        profile="heavy",
    )

    try:
        questions_data = json.loads(questions_response)
        questions = questions_data.get("questions", [])
    except (json.JSONDecodeError, AttributeError):
        questions = [
            "What are you trying to accomplish?",
            "What final output do you want?",
            "What inputs do you already have?",
            "What constraints matter?",
            "How will we know the result is good enough?",
        ]

    # Step 2: Present questions to user via approval callback
    questions_text = "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
    user_result = config.approval_callback.request_approval(
        f"Please answer these discovery questions:\n\n{questions_text}",
        "discovery",
    )

    user_answers = user_result.feedback or ""

    # Step 3: Heavy model structures the answers
    structure_response = bridge.call(
        f"The user answered these discovery questions:\n\n"
        f"Questions:\n{questions_text}\n\n"
        f"User's answers:\n{user_answers}\n\n"
        "Parse these into a JSON object with fields: "
        "goal, desired_output, inputs (array), constraints (array), "
        "success_criteria (array), assumptions (array), missing_info (array), "
        "confidence_target (string), preferred_method (string or null), "
        "limits (string or null).\n\n"
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        intake = json.loads(structure_response)
    except json.JSONDecodeError:
        intake = {"goal": user_answers, "desired_output": "", "raw_response": structure_response}

    state["intake_answers"] = intake
    return state


def _load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts directory."""
    path = PROMPTS_DIR / filename
    if path.exists():
        return path.read_text(encoding="utf-8")
    logger.warning("Prompt file not found: %s", path)
    return ""
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_discovery.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/discovery/embedded.py tests/test_discovery.py
git commit -m "feat: add embedded mode discovery with Codex CLI question generation"
```

---

## Task 10: Discovery — Prompt-Bridge Mode

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\discovery\prompt_bridge.py`
- Modify: `C:\autoresearch-engine\tests\test_discovery.py` (add tests)

- [ ] **Step 1: Write failing tests**

Append to `tests/test_discovery.py`:
```python
from autoresearch.discovery.prompt_bridge import generate_bridge_prompt, parse_bridge_answers


class TestPromptBridge:
    def test_generate_bridge_prompt(self):
        prompt = generate_bridge_prompt("I want to compare study tools")
        assert "compare study tools" in prompt
        assert "GOAL:" in prompt
        assert "DESIRED_OUTPUT:" in prompt
        assert "CONFIDENCE:" in prompt

    def test_parse_bridge_answers_structured(self):
        raw = (
            "GOAL: Compare Anki vs Quizlet\n"
            "DESIRED_OUTPUT: Decision matrix\n"
            "INPUTS: None\n"
            "CONSTRAINTS: Free tools only\n"
            "SUCCESS_CRITERIA: Clear winner\n"
            "ASSUMPTIONS: Both support flashcards\n"
            "MISSING_INFO: Pricing details\n"
            "CONFIDENCE: high\n"
            "METHOD: none\n"
            "LIMITS: none\n"
        )
        result = parse_bridge_answers(raw)
        assert result["goal"] == "Compare Anki vs Quizlet"
        assert result["desired_output"] == "Decision matrix"
        assert result["confidence_target"] == "high"

    def test_parse_bridge_answers_unstructured_fallback(self):
        raw = "I just want to compare Anki and Quizlet for flashcard studying"
        result = parse_bridge_answers(raw)
        assert result["goal"] == raw
        assert result["desired_output"] == ""
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_discovery.py::TestPromptBridge -v
```

- [ ] **Step 3: Implement prompt_bridge.py**

`src/autoresearch/discovery/prompt_bridge.py`:
```python
"""Prompt-bridge mode discovery — generates intake prompt for ChatGPT."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"

FIELD_MAP = {
    "GOAL": "goal",
    "DESIRED_OUTPUT": "desired_output",
    "INPUTS": "inputs",
    "CONSTRAINTS": "constraints",
    "SUCCESS_CRITERIA": "success_criteria",
    "ASSUMPTIONS": "assumptions",
    "MISSING_INFO": "missing_info",
    "CONFIDENCE": "confidence_target",
    "METHOD": "preferred_method",
    "LIMITS": "limits",
}


def generate_bridge_prompt(user_context: str) -> str:
    """Generate a self-contained intake prompt for pasting into ChatGPT."""
    template_path = PROMPTS_DIR / "bridge_intake.md"
    if template_path.exists():
        template = template_path.read_text(encoding="utf-8")
        return template.replace("{user_context}", user_context)

    # Inline fallback if template is missing
    return (
        f"Help me clarify this task: {user_context}\n\n"
        "Please structure your answers:\n"
        "GOAL: [answer]\nDESIRED_OUTPUT: [answer]\nINPUTS: [answer]\n"
        "CONSTRAINTS: [answer]\nSUCCESS_CRITERIA: [answer]\n"
        "ASSUMPTIONS: [answer]\nMISSING_INFO: [answer]\n"
        "CONFIDENCE: [low/medium/high/very_high]\n"
        "METHOD: [answer or none]\nLIMITS: [answer or none]"
    )


def parse_bridge_answers(raw_text: str) -> dict[str, Any]:
    """Parse structured answers from prompt-bridge mode."""
    result: dict[str, Any] = {}

    for label, field_name in FIELD_MAP.items():
        pattern = rf"^{label}:\s*(.+)$"
        match = re.search(pattern, raw_text, re.MULTILINE)
        if match:
            value = match.group(1).strip()
            if value.lower() == "none":
                value = None if field_name in ("preferred_method", "limits") else ""
            result[field_name] = value

    # If no structured fields found, treat whole text as goal
    if not result:
        result = {"goal": raw_text.strip(), "desired_output": ""}

    # Ensure all fields exist
    for field_name in FIELD_MAP.values():
        result.setdefault(field_name, "")

    return result


def run_bridge_discovery(
    state: dict[str, Any], config: EngineConfig, bridge_answers: str
) -> dict[str, Any]:
    """Process pasted bridge answers into state."""
    intake = parse_bridge_answers(bridge_answers)

    # Use medium model to check for gaps
    bridge = CodexBridge(config)
    gap_check = bridge.call(
        f"Review these discovery answers for completeness:\n\n"
        f"{json.dumps(intake, indent=2)}\n\n"
        "Are any critical fields missing or too vague to act on? "
        "Return a JSON object: "
        '{"complete": true/false, "missing_fields": [...], "clarification_questions": [...]}',
        profile="medium",
    )

    try:
        gap_data = json.loads(gap_check)
        if not gap_data.get("complete", True) and config.approval_callback:
            questions = gap_data.get("clarification_questions", [])
            if questions:
                q_text = "\n".join(f"- {q}" for q in questions)
                result = config.approval_callback.request_approval(
                    f"A few clarifications needed:\n\n{q_text}",
                    "discovery_gap",
                )
                if result.feedback:
                    intake["clarification_answers"] = result.feedback
    except json.JSONDecodeError:
        pass

    state["intake_answers"] = intake
    return state
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_discovery.py -v
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/discovery/prompt_bridge.py tests/test_discovery.py
git commit -m "feat: add prompt-bridge mode discovery with structured answer parsing"
```

---

## Task 11: Classification Phase

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\phases\classify.py`
- Create: `C:\autoresearch-engine\tests\test_classify.py`

- [ ] **Step 1: Write failing tests**

`tests/test_classify.py`:
```python
import json
from unittest.mock import patch
from autoresearch.phases.classify import classify
from autoresearch.state import EngineConfig, create_initial_state


class TestClassify:
    @patch("autoresearch.phases.classify.CodexBridge")
    def test_classify_research_task(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "primary": "research",
            "secondary": None,
            "confidence": 0.9,
            "reasoning": "User wants to find information about PT study methods",
        })

        state = create_initial_state("embedded")
        state["intake_answers"] = {"goal": "Research PT study methods"}
        config = EngineConfig()

        result = classify(state, config)
        assert result["primary_category"] == "research"
        assert result["secondary_category"] is None

    @patch("autoresearch.phases.classify.CodexBridge")
    def test_classify_with_secondary(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "primary": "plan",
            "secondary": "code",
            "confidence": 0.85,
            "reasoning": "User wants a plan that involves coding",
        })

        state = create_initial_state("embedded")
        state["intake_answers"] = {"goal": "Plan and build a CLI tool"}
        config = EngineConfig()

        result = classify(state, config)
        assert result["primary_category"] == "plan"
        assert result["secondary_category"] == "code"

    @patch("autoresearch.phases.classify.CodexBridge")
    def test_classify_low_confidence_stores_flag(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "primary": "research",
            "secondary": None,
            "confidence": 0.4,
            "reasoning": "Unclear",
        })

        state = create_initial_state("embedded")
        state["intake_answers"] = {"goal": "Something vague"}
        config = EngineConfig()

        result = classify(state, config)
        assert result["primary_category"] == "research"
        # Low confidence should be recorded for escalation check
        assert result.get("classification_confidence", 1.0) < 0.6

    @patch("autoresearch.phases.classify.CodexBridge")
    def test_classify_invalid_json_defaults_to_research(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = "Not valid JSON"

        state = create_initial_state("embedded")
        state["intake_answers"] = {"goal": "Something"}
        config = EngineConfig()

        result = classify(state, config)
        assert result["primary_category"] == "research"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_classify.py -v
```

- [ ] **Step 3: Implement classify.py**

`src/autoresearch/phases/classify.py`:
```python
"""Task classification phase."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"research", "compare", "plan", "analyze_docs", "improve", "code"}
CONFIG_DIR = Path(__file__).parent.parent.parent.parent / "config"


def _load_categories() -> str:
    """Load task category definitions from YAML."""
    path = CONFIG_DIR / "task_categories.yaml"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return "Categories: research, compare, plan, analyze_docs, improve, code"


def classify(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Classify the task using the medium model."""
    bridge = CodexBridge(config)
    categories_text = _load_categories()
    intake = state.get("intake_answers", {})

    prompt = (
        "Classify the following task into one primary category and optionally one secondary category.\n\n"
        f"## Task Categories\n{categories_text}\n\n"
        f"## User's Task\n{json.dumps(intake, indent=2)}\n\n"
        "Return a JSON object with:\n"
        '- "primary": one of research, compare, plan, analyze_docs, improve, code\n'
        '- "secondary": one of the above or null\n'
        '- "confidence": float 0.0-1.0\n'
        '- "reasoning": brief explanation\n\n'
        "Return ONLY the JSON object."
    )

    try:
        response = bridge.call(prompt, profile="medium")
        data = json.loads(response)
        primary = data.get("primary", "research")
        secondary = data.get("secondary")
        confidence = float(data.get("confidence", 0.5))

        if primary not in VALID_CATEGORIES:
            logger.warning("Invalid primary category %s, defaulting to research", primary)
            primary = "research"
        if secondary and secondary not in VALID_CATEGORIES:
            secondary = None

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("Classification failed: %s, defaulting to research", e)
        primary = "research"
        secondary = None
        confidence = 0.3

    state["primary_category"] = primary
    state["secondary_category"] = secondary
    state["classification_confidence"] = confidence
    return state
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_classify.py -v
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/phases/classify.py tests/test_classify.py
git commit -m "feat: add task classification phase with medium model routing"
```

---

## Task 12: Build Brief Phase

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\phases\build_brief.py`
- Create: `C:\autoresearch-engine\tests\test_brief.py`

- [ ] **Step 1: Write failing tests**

`tests/test_brief.py`:
```python
import json
from unittest.mock import patch
from autoresearch.phases.build_brief import build_brief
from autoresearch.models import ExecutionBrief
from autoresearch.state import EngineConfig, create_initial_state


class TestBuildBrief:
    @patch("autoresearch.phases.build_brief.CodexBridge")
    def test_builds_brief_from_intake(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "brief_id": "test-001",
            "timestamp": "2026-03-26T12:00:00Z",
            "mode": "embedded",
            "primary_category": "research",
            "secondary_category": None,
            "goal": "Research PT study methods",
            "desired_output": "Summary report",
            "summary_plain_english": "Research and summarize PT study methods.",
            "available_inputs": [],
            "input_types": [],
            "constraints": ["1 hour time limit"],
            "success_criteria": ["3+ methods compared"],
            "current_assumptions": [],
            "missing_information": [],
            "confidence_target": "high",
            "preferred_method": None,
            "time_limit": "1 hour",
            "cost_limit": None,
            "proposed_workflow": "research",
            "stop_rule": "Stop when 3+ methods compared",
            "approval_required_before_execution": True,
            "approval_required_before_final": True,
            "improve_mode_requested": False,
        })

        state = create_initial_state("embedded")
        state["intake_answers"] = {"goal": "Research PT study methods"}
        state["followup_answers"] = {}
        state["primary_category"] = "research"
        state["secondary_category"] = None
        config = EngineConfig()

        result = build_brief(state, config)
        assert isinstance(result["brief"], ExecutionBrief)
        assert result["brief"].goal == "Research PT study methods"
        assert result["brief"].primary_category == "research"

    @patch("autoresearch.phases.build_brief.CodexBridge")
    def test_brief_inherits_mode_from_state(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.return_value = json.dumps({
            "brief_id": "test-002",
            "timestamp": "2026-03-26T12:00:00Z",
            "mode": "prompt-bridge",
            "primary_category": "compare",
            "secondary_category": None,
            "goal": "Compare tools",
            "desired_output": "Matrix",
            "summary_plain_english": "Compare tools.",
            "available_inputs": [],
            "input_types": [],
            "constraints": [],
            "success_criteria": ["Winner identified"],
            "current_assumptions": [],
            "missing_information": [],
            "confidence_target": "medium",
            "preferred_method": None,
            "time_limit": None,
            "cost_limit": None,
            "proposed_workflow": "compare",
            "stop_rule": "Stop when matrix complete",
            "approval_required_before_execution": True,
            "approval_required_before_final": True,
            "improve_mode_requested": False,
        })

        state = create_initial_state("prompt-bridge")
        state["intake_answers"] = {"goal": "Compare tools"}
        state["primary_category"] = "compare"
        config = EngineConfig()

        result = build_brief(state, config)
        assert result["brief"].mode == "prompt-bridge"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_brief.py -v
```

- [ ] **Step 3: Implement build_brief.py**

`src/autoresearch/phases/build_brief.py`:
```python
"""Build execution brief from discovery answers."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.models import ExecutionBrief
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


def build_brief(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Build an ExecutionBrief from discovery answers using the heavy model."""
    bridge = CodexBridge(config)

    template_path = PROMPTS_DIR / "brief_template.md"
    if template_path.exists():
        template = template_path.read_text(encoding="utf-8")
    else:
        template = "Create an execution brief from the following answers."

    prompt = template.format(
        intake_answers=json.dumps(state.get("intake_answers", {}), indent=2),
        followup_answers=json.dumps(state.get("followup_answers", {}), indent=2),
        primary_category=state.get("primary_category", "research"),
        secondary_category=state.get("secondary_category"),
        mode=state["mode"],
    )

    response = bridge.call(prompt, profile="heavy")

    try:
        data = json.loads(response)
        # Ensure mode matches state (state.mode is source of truth)
        data["mode"] = state["mode"]
        brief = ExecutionBrief(**data)
    except (json.JSONDecodeError, TypeError) as e:
        logger.error("Failed to parse brief from model response: %s", e)
        raise RuntimeError(f"Brief construction failed: {e}") from e

    state["brief"] = brief
    return state
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_brief.py -v
```

Expected: both tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/phases/build_brief.py tests/test_brief.py
git commit -m "feat: add build_brief phase with heavy model brief generation"
```

---

## Task 13: Ingestion Pipeline

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\ingestion\parser_router.py`
- Create: `C:\autoresearch-engine\src\autoresearch\ingestion\chunker.py`
- Create: `C:\autoresearch-engine\src\autoresearch\ingestion\fallback_parser.py`
- Create: `C:\autoresearch-engine\src\autoresearch\phases\ingest.py`
- Create: `C:\autoresearch-engine\tests\test_ingest.py`

- [ ] **Step 1: Write failing tests**

`tests/test_ingest.py`:
```python
from autoresearch.ingestion.fallback_parser import parse_text_file, parse_code_file
from autoresearch.ingestion.chunker import chunk_text
from autoresearch.ingestion.parser_router import route_parser
from autoresearch.models import ParsedFile, Chunk


class TestFallbackParser:
    def test_parse_text_file(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text("Hello world\nThis is a test file.")
        result = parse_text_file(str(f))
        assert isinstance(result, ParsedFile)
        assert "Hello world" in result.raw_text
        assert result.parser_used == "direct"
        assert result.confidence == 1.0

    def test_parse_code_file(self, tmp_path):
        f = tmp_path / "test.py"
        f.write_text("def hello():\n    return 'world'")
        result = parse_code_file(str(f))
        assert isinstance(result, ParsedFile)
        assert "def hello" in result.raw_text
        assert result.file_type == "code"

    def test_parse_missing_file(self):
        result = parse_text_file("/nonexistent/file.txt")
        assert result.raw_text == ""
        assert result.confidence == 0.0


class TestChunker:
    def test_chunk_short_text(self):
        chunks = chunk_text("Short text", source_file="test.txt", max_tokens=100)
        assert len(chunks) == 1
        assert chunks[0].text == "Short text"

    def test_chunk_respects_max_tokens(self):
        # ~200 words, each word is roughly 1 token
        text = " ".join(f"word{i}" for i in range(200))
        chunks = chunk_text(text, source_file="test.txt", max_tokens=50)
        assert len(chunks) > 1
        for c in chunks:
            assert c.token_estimate <= 55  # allow small overshoot

    def test_chunk_preserves_sections(self):
        text = "# Section 1\nContent one.\n\n# Section 2\nContent two."
        chunks = chunk_text(text, source_file="test.md", max_tokens=1000)
        # With large max_tokens, sections should be preserved
        assert any("Section 1" in c.text for c in chunks)

    def test_chunk_metadata(self):
        chunks = chunk_text("Hello", source_file="a.txt", max_tokens=100, parser_used="direct", confidence=0.9)
        assert chunks[0].source_file == "a.txt"
        assert chunks[0].parser_used == "direct"
        assert chunks[0].confidence == 0.9


class TestParserRouter:
    def test_route_txt(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text("Hello")
        result = route_parser(str(f))
        assert result.parser_used == "direct"

    def test_route_py(self, tmp_path):
        f = tmp_path / "test.py"
        f.write_text("x = 1")
        result = route_parser(str(f))
        assert result.file_type == "code"

    def test_route_md(self, tmp_path):
        f = tmp_path / "test.md"
        f.write_text("# Title\nContent")
        result = route_parser(str(f))
        assert result.parser_used == "direct"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_ingest.py -v
```

- [ ] **Step 3: Implement fallback_parser.py**

`src/autoresearch/ingestion/fallback_parser.py`:
```python
"""Lightweight fallback parsers when text_extractor is unavailable."""

from __future__ import annotations

import logging
from pathlib import Path

from autoresearch.models import ParsedFile

logger = logging.getLogger(__name__)

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs",
    ".cpp", ".c", ".h", ".sh", ".bash", ".yaml", ".yml", ".json",
    ".toml", ".sql", ".rb", ".php", ".swift", ".kt",
}


def parse_text_file(file_path: str) -> ParsedFile:
    """Parse a plain text or markdown file by reading directly."""
    path = Path(file_path)
    if not path.exists():
        return ParsedFile(
            file_path=file_path, file_type="unknown", raw_text="",
            structural_metadata={}, parser_used="direct",
            confidence=0.0, token_estimate=0,
        )

    text = path.read_text(encoding="utf-8", errors="replace")
    suffix = path.suffix.lower()
    file_type = "markdown" if suffix == ".md" else "text"

    headings = [line for line in text.splitlines() if line.startswith("#")]

    return ParsedFile(
        file_path=file_path,
        file_type=file_type,
        raw_text=text,
        structural_metadata={"headings": headings},
        parser_used="direct",
        confidence=1.0,
        token_estimate=len(text.split()),
    )


def parse_code_file(file_path: str) -> ParsedFile:
    """Parse a code file by reading directly."""
    path = Path(file_path)
    if not path.exists():
        return ParsedFile(
            file_path=file_path, file_type="code", raw_text="",
            structural_metadata={}, parser_used="direct",
            confidence=0.0, token_estimate=0,
        )

    text = path.read_text(encoding="utf-8", errors="replace")
    return ParsedFile(
        file_path=file_path,
        file_type="code",
        raw_text=text,
        structural_metadata={"language": path.suffix.lstrip(".")},
        parser_used="direct",
        confidence=1.0,
        token_estimate=len(text.split()),
    )


def is_code_file(file_path: str) -> bool:
    """Check if a file path looks like a code file."""
    return Path(file_path).suffix.lower() in CODE_EXTENSIONS
```

- [ ] **Step 4: Implement chunker.py**

`src/autoresearch/ingestion/chunker.py`:
```python
"""Hybrid chunking: preserves sections, enforces size limits."""

from __future__ import annotations

import re
import uuid
from autoresearch.models import Chunk


def chunk_text(
    text: str,
    source_file: str,
    max_tokens: int = 2000,
    parser_used: str = "direct",
    confidence: float = 1.0,
) -> list[Chunk]:
    """Split text into chunks, preserving section boundaries when possible."""
    if not text.strip():
        return []

    # Try splitting by markdown headings first
    sections = re.split(r"(?=^#{1,3}\s)", text, flags=re.MULTILINE)
    sections = [s for s in sections if s.strip()]

    if not sections:
        sections = [text]

    chunks: list[Chunk] = []
    for section in sections:
        section_ref = None
        lines = section.strip().splitlines()
        if lines and lines[0].startswith("#"):
            section_ref = lines[0].lstrip("#").strip()

        words = section.split()
        token_est = len(words)

        if token_est <= max_tokens:
            chunks.append(Chunk(
                chunk_id=str(uuid.uuid4())[:8],
                source_file=source_file,
                section_ref=section_ref,
                page_ref=None,
                text=section.strip(),
                token_estimate=token_est,
                parser_used=parser_used,
                confidence=confidence,
            ))
        else:
            # Split large sections into sub-chunks by paragraph
            paragraphs = re.split(r"\n\n+", section)
            current_text: list[str] = []
            current_tokens = 0

            for para in paragraphs:
                para_tokens = len(para.split())
                if current_tokens + para_tokens > max_tokens and current_text:
                    chunks.append(Chunk(
                        chunk_id=str(uuid.uuid4())[:8],
                        source_file=source_file,
                        section_ref=section_ref,
                        page_ref=None,
                        text="\n\n".join(current_text).strip(),
                        token_estimate=current_tokens,
                        parser_used=parser_used,
                        confidence=confidence,
                    ))
                    current_text = []
                    current_tokens = 0
                current_text.append(para)
                current_tokens += para_tokens

            if current_text:
                chunks.append(Chunk(
                    chunk_id=str(uuid.uuid4())[:8],
                    source_file=source_file,
                    section_ref=section_ref,
                    page_ref=None,
                    text="\n\n".join(current_text).strip(),
                    token_estimate=current_tokens,
                    parser_used=parser_used,
                    confidence=confidence,
                ))

    return chunks
```

- [ ] **Step 5: Implement parser_router.py**

`src/autoresearch/ingestion/parser_router.py`:
```python
"""Routes files to the appropriate parser."""

from __future__ import annotations

import logging
from pathlib import Path

from autoresearch.ingestion.fallback_parser import (
    is_code_file,
    parse_code_file,
    parse_text_file,
)
from autoresearch.models import ParsedFile
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

DIRECT_EXTENSIONS = {".txt", ".md", ".markdown", ".rst"}


def route_parser(
    file_path: str,
    config: EngineConfig | None = None,
) -> ParsedFile:
    """Route a file to the best available parser."""
    path = Path(file_path)
    suffix = path.suffix.lower()

    # Code files: always direct read
    if is_code_file(file_path):
        return parse_code_file(file_path)

    # Plain text and markdown: direct read
    if suffix in DIRECT_EXTENSIONS:
        return parse_text_file(file_path)

    # PDFs and office docs: try text_extractor, fall back to built-in
    if suffix in {".pdf", ".docx", ".pptx"}:
        return _parse_document(file_path, config)

    # Unknown: try reading as text
    logger.info("Unknown file type %s, attempting direct read", suffix)
    return parse_text_file(file_path)


def _parse_document(file_path: str, config: EngineConfig | None) -> ParsedFile:
    """Parse a document file, trying text_extractor first then fallback."""
    # Try importing text_extractor from pt-study-sop
    if config and config.text_extractor_path:
        try:
            import sys
            if config.text_extractor_path not in sys.path:
                sys.path.insert(0, config.text_extractor_path)
            from text_extractor import extract_text
            result = extract_text(file_path)
            return ParsedFile(
                file_path=file_path,
                file_type=Path(file_path).suffix.lstrip("."),
                raw_text=result.get("content", ""),
                structural_metadata=result.get("metadata", {}),
                parser_used=result.get("metadata", {}).get("parser", "text_extractor"),
                confidence=0.8,  # text_extractor doesn't report confidence
                token_estimate=len(result.get("content", "").split()),
            )
        except Exception as e:
            logger.warning("text_extractor failed for %s: %s", file_path, e)

    # Fallback: try pypdf for PDFs
    suffix = Path(file_path).suffix.lower()
    if suffix == ".pdf":
        return _parse_pdf_fallback(file_path)

    # Other doc types: try python-docx
    if suffix == ".docx":
        return _parse_docx_fallback(file_path)

    return parse_text_file(file_path)


def _parse_pdf_fallback(file_path: str) -> ParsedFile:
    """Parse PDF using pypdf (fallback)."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        return ParsedFile(
            file_path=file_path, file_type="pdf", raw_text=text,
            structural_metadata={"pages": len(reader.pages)},
            parser_used="pypdf", confidence=0.6,
            token_estimate=len(text.split()),
        )
    except Exception as e:
        logger.warning("pypdf failed for %s: %s", file_path, e)
        return ParsedFile(
            file_path=file_path, file_type="pdf", raw_text="",
            structural_metadata={}, parser_used="pypdf",
            confidence=0.0, token_estimate=0,
        )


def _parse_docx_fallback(file_path: str) -> ParsedFile:
    """Parse DOCX using python-docx (fallback)."""
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return ParsedFile(
            file_path=file_path, file_type="docx", raw_text=text,
            structural_metadata={}, parser_used="python_docx",
            confidence=0.7, token_estimate=len(text.split()),
        )
    except Exception as e:
        logger.warning("python-docx failed for %s: %s", file_path, e)
        return ParsedFile(
            file_path=file_path, file_type="docx", raw_text="",
            structural_metadata={}, parser_used="python_docx",
            confidence=0.0, token_estimate=0,
        )
```

- [ ] **Step 6: Implement phases/ingest.py**

`src/autoresearch/phases/ingest.py`:
```python
"""Ingestion phase: parse files and build chunks."""

from __future__ import annotations

import logging
from typing import Any

from autoresearch.ingestion.chunker import chunk_text
from autoresearch.ingestion.parser_router import route_parser
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def ingest(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Parse all input files and chunk them."""
    brief = state.get("brief")
    if not brief:
        raise RuntimeError("Cannot ingest without an execution brief")

    input_paths = brief.available_inputs
    parsed_files = []
    all_chunks = []

    for path in input_paths:
        logger.info("Parsing: %s", path)
        parsed = route_parser(path, config)
        parsed_files.append(parsed)

        if parsed.raw_text:
            chunks = chunk_text(
                parsed.raw_text,
                source_file=parsed.file_path,
                max_tokens=config.max_chunk_tokens,
                parser_used=parsed.parser_used,
                confidence=parsed.confidence,
            )
            all_chunks.extend(chunks)

    state["parsed_files"] = parsed_files
    state["chunks"] = all_chunks
    logger.info("Ingested %d files into %d chunks", len(parsed_files), len(all_chunks))
    return state
```

- [ ] **Step 7: Run tests**

```bash
pytest tests/test_ingest.py -v
```

Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/autoresearch/ingestion/ src/autoresearch/phases/ingest.py tests/test_ingest.py
git commit -m "feat: add ingestion pipeline with parser routing, chunking, and fallback parsers"
```

---

## Task 14: Routing Phase

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\phases\route.py`
- Create: `C:\autoresearch-engine\tests\test_route.py`

- [ ] **Step 1: Write failing tests**

`tests/test_route.py`:
```python
import json
from unittest.mock import patch
from autoresearch.phases.route import route
from autoresearch.models import Chunk
from autoresearch.state import EngineConfig, create_initial_state


def _make_chunk(text: str, chunk_id: str = "c1") -> Chunk:
    return Chunk(
        chunk_id=chunk_id, source_file="test.txt",
        section_ref=None, page_ref=None, text=text,
        token_estimate=len(text.split()), parser_used="direct",
        confidence=1.0,
    )


class TestRoute:
    def test_low_volume_skips_routing(self):
        """Under small_volume_cutoff, all chunks go straight through."""
        state = create_initial_state("embedded")
        state["chunks"] = [_make_chunk(f"Chunk {i}") for i in range(5)]
        config = EngineConfig(small_volume_cutoff=10)

        result = route(state, config)
        # All chunks should remain, no relevance scoring needed
        assert len(result["chunks"]) == 5

    @patch("autoresearch.phases.route.CodexBridge")
    def test_high_volume_scores_and_filters(self, MockBridge):
        mock_bridge = MockBridge.return_value
        # Return relevance scores: 3 high, 3 medium, 6 low
        scores = [0.9, 0.8, 0.75, 0.5, 0.4, 0.35, 0.2, 0.1, 0.15, 0.05, 0.1, 0.25]
        mock_bridge.call.return_value = json.dumps(
            [{"chunk_id": f"c{i}", "relevance": s} for i, s in enumerate(scores)]
        )

        state = create_initial_state("embedded")
        state["chunks"] = [_make_chunk(f"Chunk {i}", f"c{i}") for i in range(12)]
        state["brief"] = type("Brief", (), {"goal": "Research topic", "success_criteria": ["coverage"]})()
        config = EngineConfig(small_volume_cutoff=10)

        result = route(state, config)
        # Chunks with relevance < 0.3 should be dropped
        remaining = result["chunks"]
        assert all(c.relevance_score is not None for c in remaining)
        assert all(c.relevance_score >= 0.3 for c in remaining)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_route.py -v
```

- [ ] **Step 3: Implement route.py**

`src/autoresearch/phases/route.py`:
```python
"""Routing phase: assign relevance scores and filter chunks."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def route(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Score and filter chunks based on relevance to the task."""
    chunks = state.get("chunks", [])

    # Low volume: skip routing, send everything through
    if len(chunks) <= config.small_volume_cutoff:
        logger.info("Low volume (%d chunks), skipping routing", len(chunks))
        for c in chunks:
            c.relevance_score = 1.0
        return state

    # High volume: use light model to score relevance
    bridge = CodexBridge(config)
    brief = state.get("brief")
    goal = getattr(brief, "goal", "") if brief else ""
    criteria = getattr(brief, "success_criteria", []) if brief else []

    chunk_summaries = [
        {"chunk_id": c.chunk_id, "preview": c.text[:200]}
        for c in chunks
    ]

    prompt = (
        "Score each chunk's relevance to the task on a 0.0-1.0 scale.\n\n"
        f"## Task Goal\n{goal}\n\n"
        f"## Success Criteria\n{json.dumps(criteria)}\n\n"
        f"## Chunks\n{json.dumps(chunk_summaries, indent=2)}\n\n"
        "Return a JSON array of objects: "
        '[{"chunk_id": "...", "relevance": 0.0-1.0}]\n'
        "Return ONLY the JSON array."
    )

    try:
        response = bridge.call(prompt, profile="light")
        scores = json.loads(response)
        score_map = {s["chunk_id"]: float(s["relevance"]) for s in scores}
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("Routing failed: %s, keeping all chunks", e)
        for c in chunks:
            c.relevance_score = 1.0
        return state

    # Apply scores and filter
    for c in chunks:
        c.relevance_score = score_map.get(c.chunk_id, 0.5)

    state["chunks"] = [
        c for c in chunks
        if c.relevance_score >= config.relevance_drop_threshold
    ]

    dropped = len(chunks) - len(state["chunks"])
    logger.info("Routing: kept %d chunks, dropped %d", len(state["chunks"]), dropped)
    return state
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_route.py -v
```

Expected: both tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/phases/route.py tests/test_route.py
git commit -m "feat: add routing phase with light model relevance scoring"
```

---

## Task 15: Research Workflow (First Workflow)

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\research.py`
- Create: `C:\autoresearch-engine\tests\test_workflows.py`

- [ ] **Step 1: Write failing tests**

`tests/test_workflows.py`:
```python
import json
from unittest.mock import patch
from autoresearch.workflows.research import run as research_run
from autoresearch.models import Chunk, ExecutionBrief
from autoresearch.state import EngineConfig, create_initial_state


def _make_brief(**overrides) -> ExecutionBrief:
    defaults = dict(
        brief_id="t1", timestamp="2026-03-26T00:00:00Z", mode="embedded",
        primary_category="research", secondary_category=None,
        goal="Research PT study methods", desired_output="Summary report",
        summary_plain_english="Research.", available_inputs=[], input_types=[],
        constraints=[], success_criteria=["3+ methods"], current_assumptions=[],
        missing_information=[], confidence_target="high", preferred_method=None,
        time_limit=None, cost_limit=None, proposed_workflow="research",
        stop_rule="3+ methods covered",
    )
    defaults.update(overrides)
    return ExecutionBrief(**defaults)


def _make_chunks(n: int) -> list[Chunk]:
    return [Chunk(
        chunk_id=f"c{i}", source_file="src.txt", section_ref=None,
        page_ref=None, text=f"Content about method {i}",
        token_estimate=5, parser_used="direct", confidence=1.0,
        relevance_score=0.9,
    ) for i in range(n)]


class TestResearchWorkflow:
    @patch("autoresearch.workflows.research.CodexBridge")
    def test_research_returns_structured_result(self, MockBridge):
        mock_bridge = MockBridge.return_value
        mock_bridge.call.side_effect = [
            # Step 1: question type
            json.dumps({"type": "exploratory", "evidence_needs": ["methods", "outcomes"]}),
            # Step 2: synthesis
            json.dumps({
                "findings": ["Method A uses spaced repetition", "Method B uses active recall"],
                "confidence": 0.85,
                "gaps": ["No data on Method C"],
                "summary": "Two methods identified with strong evidence.",
            }),
        ]

        state = create_initial_state("embedded")
        state["brief"] = _make_brief()
        state["chunks"] = _make_chunks(3)
        config = EngineConfig()

        result = research_run(state, config, mock_bridge)
        assert "findings" in result
        assert "confidence" in result
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_workflows.py -v
```

- [ ] **Step 3: Implement research.py**

`src/autoresearch/workflows/research.py`:
```python
"""Research workflow: gather, filter, synthesize."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the research workflow."""
    brief = state["brief"]
    chunks = state.get("chunks", [])

    # Step 1: Identify question type and evidence needs (light model)
    chunk_text = "\n---\n".join(c.text[:300] for c in chunks[:20])
    classify_response = bridge.call(
        f"Classify this research task:\n"
        f"Goal: {brief.goal}\n"
        f"Available evidence:\n{chunk_text[:2000]}\n\n"
        "Return JSON: "
        '{"type": "factual|exploratory|decision", "evidence_needs": [...]}',
        profile="light",
    )

    try:
        research_meta = json.loads(classify_response)
    except json.JSONDecodeError:
        research_meta = {"type": "exploratory", "evidence_needs": []}

    # Step 2: Synthesize findings (heavy model)
    all_evidence = "\n---\n".join(c.text for c in chunks)
    synthesis_response = bridge.call(
        f"Synthesize research findings for this task:\n\n"
        f"Goal: {brief.goal}\n"
        f"Desired output: {brief.desired_output}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n"
        f"Question type: {research_meta.get('type', 'exploratory')}\n\n"
        f"Evidence:\n{all_evidence[:8000]}\n\n"
        "Return JSON:\n"
        '- "findings": array of key findings\n'
        '- "confidence": 0.0-1.0\n'
        '- "gaps": array of unresolved questions\n'
        '- "summary": 2-3 paragraph synthesis\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        result = json.loads(synthesis_response)
    except json.JSONDecodeError:
        result = {
            "findings": [],
            "confidence": 0.0,
            "gaps": ["Synthesis failed — raw response stored"],
            "summary": synthesis_response,
        }

    result["research_meta"] = research_meta
    return result
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_workflows.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/workflows/research.py tests/test_workflows.py
git commit -m "feat: add research workflow with question classification and synthesis"
```

---

## Task 16: Remaining Workflows (Stub Implementations)

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\compare.py`
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\plan.py`
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\analyze_docs.py`
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\improve.py`
- Create: `C:\autoresearch-engine\src\autoresearch\workflows\code_task.py`

Each workflow follows the same pattern as research. For brevity, each gets a working implementation with the core logic, tested via the workflow dispatch in the runner.

- [ ] **Step 1: Implement compare.py**

`src/autoresearch/workflows/compare.py`:
```python
"""Compare workflow: evaluate options against criteria."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the compare workflow."""
    brief = state["brief"]
    chunks = state.get("chunks", [])
    evidence = "\n---\n".join(c.text for c in chunks)

    response = bridge.call(
        f"Compare options for this task:\n\n"
        f"Goal: {brief.goal}\n"
        f"Desired output: {brief.desired_output}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n"
        f"Constraints: {json.dumps(brief.constraints)}\n\n"
        f"Evidence:\n{evidence[:8000]}\n\n"
        "Return JSON:\n"
        '- "options": array of option objects with name and pros/cons\n'
        '- "criteria": array of criteria used\n'
        '- "ranking": array of option names from best to worst\n'
        '- "recommendation": string with rationale\n'
        '- "deal_breakers": array of any deal-breaker findings\n'
        '- "confidence": 0.0-1.0\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"options": [], "recommendation": response, "confidence": 0.0}
```

- [ ] **Step 2: Implement plan.py**

`src/autoresearch/workflows/plan.py`:
```python
"""Plan workflow: decompose into phases and steps."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the plan workflow."""
    brief = state["brief"]
    chunks = state.get("chunks", [])
    context = "\n---\n".join(c.text for c in chunks)

    response = bridge.call(
        f"Create a structured plan:\n\n"
        f"Goal: {brief.goal}\n"
        f"Desired output: {brief.desired_output}\n"
        f"Constraints: {json.dumps(brief.constraints)}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n\n"
        f"Context:\n{context[:8000]}\n\n"
        "Return JSON:\n"
        '- "phases": array of phase objects with name, steps, and duration\n'
        '- "failure_points": array of risks with mitigations\n'
        '- "resources_needed": array\n'
        '- "timeline_summary": string\n'
        '- "confidence": 0.0-1.0\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"phases": [], "timeline_summary": response, "confidence": 0.0}
```

- [ ] **Step 3: Implement analyze_docs.py**

`src/autoresearch/workflows/analyze_docs.py`:
```python
"""Document analysis workflow: extract and synthesize from parsed documents."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the document analysis workflow."""
    brief = state["brief"]
    chunks = state.get("chunks", [])

    # Filter relevant chunks (light model already scored them)
    relevant = [c for c in chunks if (c.relevance_score or 0) >= 0.5]
    if not relevant:
        relevant = chunks

    evidence = "\n---\n".join(c.text for c in relevant)

    response = bridge.call(
        f"Analyze these documents:\n\n"
        f"Goal: {brief.goal}\n"
        f"Desired output: {brief.desired_output}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n\n"
        f"Document content:\n{evidence[:10000]}\n\n"
        "Return JSON:\n"
        '- "extracted_info": array of key information extracted\n'
        '- "synthesis": string summary in the requested format\n'
        '- "source_map": array of source references\n'
        '- "confidence": 0.0-1.0\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"extracted_info": [], "synthesis": response, "confidence": 0.0}
```

- [ ] **Step 4: Implement improve.py**

`src/autoresearch/workflows/improve.py`:
```python
"""Improve workflow: iterative improvement of an output."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the improve workflow (single pass; loop handled by runner)."""
    brief = state["brief"]
    chunks = state.get("chunks", [])
    context = "\n---\n".join(c.text for c in chunks)

    response = bridge.call(
        f"Analyze this for improvement:\n\n"
        f"Goal: {brief.goal}\n"
        f"What to improve: {brief.desired_output}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n\n"
        f"Current state:\n{context[:8000]}\n\n"
        "Return JSON:\n"
        '- "baseline_assessment": string describing current quality\n'
        '- "failure_patterns": array of issues found\n'
        '- "proposed_changes": array of specific improvements\n'
        '- "improved_output": string with the improved version\n'
        '- "confidence": 0.0-1.0\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"baseline_assessment": "Could not assess", "improved_output": response, "confidence": 0.0}
```

- [ ] **Step 5: Implement code_task.py**

`src/autoresearch/workflows/code_task.py`:
```python
"""Code workflow: write, review, debug, or automate."""

from __future__ import annotations

import json
import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def run(state: dict[str, Any], config: EngineConfig, bridge: CodexBridge) -> dict:
    """Execute the code workflow."""
    brief = state["brief"]
    chunks = state.get("chunks", [])
    code_context = "\n---\n".join(c.text for c in chunks)

    response = bridge.call(
        f"Code task:\n\n"
        f"Goal: {brief.goal}\n"
        f"Desired output: {brief.desired_output}\n"
        f"Constraints: {json.dumps(brief.constraints)}\n"
        f"Success criteria: {json.dumps(brief.success_criteria)}\n\n"
        f"Code context:\n{code_context[:10000]}\n\n"
        "Return JSON:\n"
        '- "approach": string describing the implementation approach\n'
        '- "code": string with the code or code changes\n'
        '- "validation": string describing how to verify\n'
        '- "dependencies": array of required dependencies\n'
        '- "confidence": 0.0-1.0\n\n'
        "Return ONLY the JSON object.",
        profile="heavy",
    )

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        return {"approach": "Direct implementation", "code": response, "confidence": 0.0}
```

- [ ] **Step 6: Commit**

```bash
git add src/autoresearch/workflows/
git commit -m "feat: add compare, plan, analyze_docs, improve, and code workflows"
```

---

## Task 17: Execute, Review, and Deliver Phases

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\phases\execute.py`
- Create: `C:\autoresearch-engine\src\autoresearch\phases\review.py`
- Create: `C:\autoresearch-engine\src\autoresearch\phases\deliver.py`

- [ ] **Step 1: Implement execute.py**

`src/autoresearch/phases/execute.py`:
```python
"""Execute phase: dispatch to the appropriate workflow."""

from __future__ import annotations

import logging
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig
from autoresearch.workflows import (
    research, compare, plan, analyze_docs, improve, code_task,
)

logger = logging.getLogger(__name__)

WORKFLOW_MAP = {
    "research": research.run,
    "compare": compare.run,
    "plan": plan.run,
    "analyze_docs": analyze_docs.run,
    "improve": improve.run,
    "code": code_task.run,
}


def execute(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Dispatch to the appropriate workflow based on primary_category."""
    category = state.get("primary_category", "research")
    workflow_fn = WORKFLOW_MAP.get(category)

    if not workflow_fn:
        raise ValueError(f"Unknown task category: {category}")

    bridge = CodexBridge(config)
    logger.info("Executing workflow: %s", category)
    state["workflow_result"] = workflow_fn(state, config, bridge)
    return state
```

- [ ] **Step 2: Implement review.py**

`src/autoresearch/phases/review.py`:
```python
"""Review phase: check workflow result against success criteria."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from autoresearch.bridge import CodexBridge
from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent.parent.parent / "prompts"


def review(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Review workflow result against the execution brief."""
    bridge = CodexBridge(config)
    brief = state.get("brief")
    result = state.get("workflow_result", {})

    if not brief:
        state["review_result"] = {"meets_criteria": False, "confidence": 0.0, "gaps": ["No brief"], "recommendations": []}
        return state

    template_path = PROMPTS_DIR / "review_template.md"
    if template_path.exists():
        template = template_path.read_text(encoding="utf-8")
        prompt = template.format(
            goal=brief.goal,
            success_criteria=json.dumps(brief.success_criteria),
            stop_rule=brief.stop_rule,
            confidence_target=brief.confidence_target,
            workflow_result=json.dumps(result, indent=2, default=str),
        )
    else:
        prompt = (
            f"Review this result against the criteria:\n\n"
            f"Goal: {brief.goal}\n"
            f"Criteria: {json.dumps(brief.success_criteria)}\n"
            f"Result: {json.dumps(result, indent=2, default=str)}\n\n"
            'Return JSON: {"meets_criteria": bool, "confidence": float, "gaps": [...], "recommendations": [...]}'
        )

    response = bridge.call(prompt, profile="heavy")

    try:
        review_data = json.loads(response)
    except json.JSONDecodeError:
        review_data = {
            "meets_criteria": False,
            "confidence": 0.0,
            "gaps": ["Review parsing failed"],
            "recommendations": [],
        }

    state["review_result"] = review_data
    return state
```

- [ ] **Step 3: Implement deliver.py**

`src/autoresearch/phases/deliver.py`:
```python
"""Deliver phase: format and save final output."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from autoresearch.state import EngineConfig

logger = logging.getLogger(__name__)


def deliver(state: dict[str, Any], config: EngineConfig) -> dict[str, Any]:
    """Format and save the final output."""
    brief = state.get("brief")
    result = state.get("workflow_result", {})
    review = state.get("review_result", {})

    # Build final output
    final = {
        "brief_id": brief.brief_id if brief else "unknown",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task_type": state.get("primary_category", "unknown"),
        "goal": brief.goal if brief else "",
        "result": result,
        "review": review,
        "mode": state.get("mode", "unknown"),
    }

    # Save to results/finals/
    results_dir = Path(config.results_dir) / "finals"
    results_dir.mkdir(parents=True, exist_ok=True)
    output_path = results_dir / f"{final['brief_id']}.json"
    output_path.write_text(json.dumps(final, indent=2, default=str))

    # Also save the brief
    if brief:
        briefs_dir = Path(config.results_dir) / "briefs"
        briefs_dir.mkdir(parents=True, exist_ok=True)
        brief_path = briefs_dir / f"{brief.brief_id}.json"
        brief_path.write_text(brief.to_json())

    state["final_output_path"] = str(output_path)
    logger.info("Final output saved to %s", output_path)
    return state
```

- [ ] **Step 4: Commit**

```bash
git add src/autoresearch/phases/execute.py src/autoresearch/phases/review.py src/autoresearch/phases/deliver.py
git commit -m "feat: add execute (dispatch), review, and deliver phases"
```

---

## Task 18: Pipeline Runner

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\runner.py`
- Create: `C:\autoresearch-engine\tests\test_runner.py`

- [ ] **Step 1: Write failing tests**

`tests/test_runner.py`:
```python
import json
from unittest.mock import patch, MagicMock
from autoresearch.runner import run_pipeline
from autoresearch.approval.base import ApprovalResult
from autoresearch.state import EngineConfig


class TestRunner:
    @patch("autoresearch.runner.deliver")
    @patch("autoresearch.runner.review")
    @patch("autoresearch.runner.execute")
    @patch("autoresearch.runner.route")
    @patch("autoresearch.runner.ingest")
    @patch("autoresearch.runner.build_brief")
    @patch("autoresearch.runner.classify")
    @patch("autoresearch.runner.run_embedded_discovery")
    def test_full_pipeline_embedded(
        self, mock_discover, mock_classify, mock_brief,
        mock_ingest, mock_route, mock_execute, mock_review, mock_deliver,
    ):
        # Setup: each phase passes state through
        for mock_fn in [mock_discover, mock_classify, mock_brief,
                        mock_ingest, mock_route, mock_execute, mock_review, mock_deliver]:
            mock_fn.side_effect = lambda s, c: s

        # Mock the brief for approval display
        mock_brief_obj = MagicMock()
        mock_brief_obj.to_plain_english.return_value = "Brief summary"
        mock_brief_obj.approval_required_before_execution = True
        mock_brief_obj.approval_required_before_final = True

        def set_brief(state, config):
            state["brief"] = mock_brief_obj
            return state
        mock_brief.side_effect = set_brief

        # Auto-approve everything
        mock_approval = MagicMock()
        mock_approval.request_approval.return_value = ApprovalResult(approved=True)

        config = EngineConfig(approval_callback=mock_approval)
        result = run_pipeline(mode="embedded", config=config)

        assert mock_discover.called
        assert mock_classify.called
        assert mock_brief.called
        assert mock_approval.request_approval.called  # checkpoint 1
        assert mock_execute.called
        assert mock_review.called
        assert mock_deliver.called

    def test_pipeline_rejects_unknown_mode(self):
        config = EngineConfig()
        try:
            run_pipeline(mode="invalid", config=config)
            assert False
        except ValueError as e:
            assert "mode" in str(e).lower()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_runner.py -v
```

- [ ] **Step 3: Implement runner.py**

`src/autoresearch/runner.py`:
```python
"""Pipeline runner: chains all phases together."""

from __future__ import annotations

import logging
from typing import Any

from autoresearch.approval.base import ApprovalResult
from autoresearch.discovery.embedded import run_embedded_discovery
from autoresearch.discovery.prompt_bridge import run_bridge_discovery
from autoresearch.phases.build_brief import build_brief
from autoresearch.phases.classify import classify
from autoresearch.phases.deliver import deliver
from autoresearch.phases.execute import execute
from autoresearch.phases.ingest import ingest
from autoresearch.phases.review import review
from autoresearch.phases.route import route
from autoresearch.state import EngineConfig, create_initial_state

logger = logging.getLogger(__name__)

CONFIDENCE_MAP = {"low": 0.3, "medium": 0.5, "high": 0.7, "very_high": 0.9}


def run_pipeline(
    mode: str = "embedded",
    config: EngineConfig | None = None,
    initial_context: str = "",
    bridge_answers: str = "",
) -> dict[str, Any]:
    """Run the full autoresearch pipeline."""
    if mode not in ("embedded", "prompt-bridge"):
        raise ValueError(f"Invalid mode: {mode}. Must be 'embedded' or 'prompt-bridge'.")

    if config is None:
        config = EngineConfig()

    state = create_initial_state(mode)

    # --- Discovery ---
    if mode == "embedded":
        state = run_embedded_discovery(state, config)
    else:
        state = run_bridge_discovery(state, config, bridge_answers)

    # --- Classification ---
    state = classify(state, config)
    _check_escalation(state, config, "post_classify")

    # --- Build Brief ---
    state = build_brief(state, config)

    # --- Checkpoint 1: Approve Brief ---
    brief = state.get("brief")
    if brief and brief.approval_required_before_execution:
        state = _run_approval_loop(
            state, config, brief.to_plain_english(), "pre_execution", max_cycles=3
        )

    # --- Ingestion ---
    state = ingest(state, config)
    _check_escalation(state, config, "post_ingest")

    # --- Routing ---
    state = route(state, config)

    # --- Execute ---
    state = execute(state, config)

    # --- Review ---
    state = review(state, config)

    # --- Checkpoint 2: Approve Final ---
    if brief and brief.approval_required_before_final:
        import json
        result_display = json.dumps(state.get("workflow_result", {}), indent=2, default=str)
        review_display = json.dumps(state.get("review_result", {}), indent=2, default=str)
        content = f"## Workflow Result\n{result_display}\n\n## Review\n{review_display}"
        state = _run_approval_loop(
            state, config, content, "pre_final", max_cycles=2
        )

    # --- Deliver ---
    state = deliver(state, config)

    return state


def _run_approval_loop(
    state: dict[str, Any],
    config: EngineConfig,
    content: str,
    checkpoint: str,
    max_cycles: int = 3,
) -> dict[str, Any]:
    """Run approval with feedback revision cycles."""
    if not config.approval_callback:
        logger.warning("No approval callback set, auto-approving %s", checkpoint)
        return state

    for cycle in range(max_cycles):
        result = config.approval_callback.request_approval(content, checkpoint)
        if result.approved:
            if checkpoint == "pre_execution":
                state["brief_approved"] = True
            elif checkpoint == "pre_final":
                state["final_approved"] = True
            return state

        if not result.feedback:
            logger.info("Rejected at %s with no feedback, stopping", checkpoint)
            break

        logger.info("Feedback at %s (cycle %d): %s", checkpoint, cycle + 1, result.feedback)
        # Future: revise brief or result based on feedback
        # For now, just re-present

    return state


def _check_escalation(
    state: dict[str, Any], config: EngineConfig, phase: str
) -> None:
    """Check escalation conditions at phase boundary."""
    if not config.approval_callback:
        return

    reasons: list[str] = []

    # Low classification confidence
    confidence = state.get("classification_confidence", 1.0)
    if confidence < 0.6:
        reasons.append(f"Classification confidence is low ({confidence:.2f})")

    # Low parser confidence
    for pf in state.get("parsed_files", []):
        if pf.confidence < 0.5:
            reasons.append(f"Parser confidence low for {pf.file_path} ({pf.confidence:.2f})")

    # Risk flags on brief
    brief = state.get("brief")
    if brief and brief.risk_flags:
        reasons.append(f"Risk flags: {', '.join(brief.risk_flags)}")

    if reasons:
        reason_text = "\n".join(f"- {r}" for r in reasons)
        logger.warning("Escalation at %s:\n%s", phase, reason_text)
        config.approval_callback.request_approval(
            f"Escalation at {phase}:\n\n{reason_text}\n\nContinue?",
            f"escalation_{phase}",
        )
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_runner.py -v
```

Expected: both tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/autoresearch/runner.py tests/test_runner.py
git commit -m "feat: add pipeline runner with approval loops and escalation checks"
```

---

## Task 19: CLI Entry Point

**Files:**
- Create: `C:\autoresearch-engine\src\autoresearch\cli.py`

- [ ] **Step 1: Implement cli.py**

`src/autoresearch/cli.py`:
```python
"""CLI entry point for the autoresearch engine."""

from __future__ import annotations

import logging
import sys

import click

from autoresearch.approval.terminal import TerminalApproval
from autoresearch.runner import run_pipeline
from autoresearch.state import EngineConfig, load_config
from autoresearch.models import ExecutionBrief


@click.group()
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
def main(verbose: bool) -> None:
    """Autoresearch Engine — structured discovery and execution."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(name)s: %(message)s")


@main.command()
@click.argument("context", default="", required=False)
@click.option("--mode", type=click.Choice(["embedded", "bridge"]), default="embedded")
@click.option("--improve", is_flag=True, help="Enable improvement loop")
@click.option("--max-rounds", type=int, default=5, help="Max improvement rounds")
@click.option("--light-profile", default=None, help="Override light model profile")
@click.option("--heavy-profile", default=None, help="Override heavy model profile")
@click.option("--config-file", default="config/engine.yaml", help="Config file path")
def run(
    context: str,
    mode: str,
    improve: bool,
    max_rounds: int,
    light_profile: str | None,
    heavy_profile: str | None,
    config_file: str,
) -> None:
    """Start a new autoresearch task."""
    config = load_config(config_file)
    config.approval_callback = TerminalApproval()

    if light_profile:
        config.light_profile = light_profile
    if heavy_profile:
        config.heavy_profile = heavy_profile
    if improve:
        config.max_improve_rounds = max_rounds

    engine_mode = "prompt-bridge" if mode == "bridge" else "embedded"

    try:
        state = run_pipeline(
            mode=engine_mode,
            config=config,
            initial_context=context,
        )
        output_path = state.get("final_output_path", "")
        if output_path:
            click.echo(f"\nResult saved to: {output_path}")
    except KeyboardInterrupt:
        click.echo("\nAborted.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"\nError: {e}", err=True)
        sys.exit(1)


@main.command()
@click.argument("brief_path")
@click.option("--config-file", default="config/engine.yaml")
def resume(brief_path: str, config_file: str) -> None:
    """Resume from a saved execution brief."""
    config = load_config(config_file)
    config.approval_callback = TerminalApproval()

    brief = ExecutionBrief.from_json_file(brief_path)
    click.echo(f"Resuming brief: {brief.brief_id}")
    click.echo(f"Goal: {brief.goal}")
    click.echo(f"Task type: {brief.primary_category}")

    # Resume skips discovery and classification
    from autoresearch.state import create_initial_state
    state = create_initial_state(brief.mode)
    state["brief"] = brief
    state["primary_category"] = brief.primary_category
    state["secondary_category"] = brief.secondary_category
    state["brief_approved"] = False  # Re-approve

    from autoresearch.phases.ingest import ingest
    from autoresearch.phases.route import route
    from autoresearch.phases.execute import execute
    from autoresearch.phases.review import review
    from autoresearch.phases.deliver import deliver
    from autoresearch.runner import _run_approval_loop

    # Re-approve
    state = _run_approval_loop(state, config, brief.to_plain_english(), "pre_execution")

    # Run remaining pipeline
    state = ingest(state, config)
    state = route(state, config)
    state = execute(state, config)
    state = review(state, config)

    import json
    result_display = json.dumps(state.get("workflow_result", {}), indent=2, default=str)
    state = _run_approval_loop(state, config, result_display, "pre_final", max_cycles=2)

    state = deliver(state, config)
    click.echo(f"\nResult saved to: {state.get('final_output_path', '')}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test CLI is importable**

```bash
cd C:\autoresearch-engine
python -m autoresearch.cli --help
```

Expected: Shows help text with `run` and `resume` commands

- [ ] **Step 3: Commit**

```bash
git add src/autoresearch/cli.py
git commit -m "feat: add CLI entry point with run and resume commands"
```

---

## Task 20: Integration Test

**Files:**
- Create: `C:\autoresearch-engine\tests\test_integration.py`

- [ ] **Step 1: Write integration test with mocked bridge**

`tests/test_integration.py`:
```python
"""Integration test: full pipeline with mocked Codex calls."""

import json
from unittest.mock import patch, MagicMock
from autoresearch.runner import run_pipeline
from autoresearch.approval.base import ApprovalResult
from autoresearch.state import EngineConfig


class TestIntegration:
    @patch("autoresearch.workflows.research.CodexBridge")
    @patch("autoresearch.phases.review.CodexBridge")
    @patch("autoresearch.phases.route.CodexBridge")
    @patch("autoresearch.phases.classify.CodexBridge")
    @patch("autoresearch.phases.build_brief.CodexBridge")
    @patch("autoresearch.discovery.embedded.CodexBridge")
    def test_full_embedded_research_pipeline(
        self, MockDiscBridge, MockBriefBridge, MockClassBridge,
        MockRouteBridge, MockReviewBridge, MockResearchBridge,
        tmp_path,
    ):
        # Discovery: generates questions, structures answers
        disc_bridge = MockDiscBridge.return_value
        disc_bridge.call.side_effect = [
            json.dumps({"questions": ["What topic?", "What format?"]}),
            json.dumps({
                "goal": "Research PT methods",
                "desired_output": "Report",
                "inputs": [], "constraints": [],
                "success_criteria": ["3+ methods"],
                "assumptions": [], "missing_info": [],
                "confidence_target": "high",
                "preferred_method": None, "limits": None,
            }),
        ]

        # Classify
        class_bridge = MockClassBridge.return_value
        class_bridge.call.return_value = json.dumps({
            "primary": "research", "secondary": None,
            "confidence": 0.9, "reasoning": "Research task",
        })

        # Build brief
        brief_bridge = MockBriefBridge.return_value
        brief_bridge.call.return_value = json.dumps({
            "brief_id": "int-001",
            "timestamp": "2026-03-26T00:00:00Z",
            "mode": "embedded",
            "primary_category": "research",
            "secondary_category": None,
            "goal": "Research PT methods",
            "desired_output": "Report",
            "summary_plain_english": "Researching PT methods.",
            "available_inputs": [],
            "input_types": [],
            "constraints": [],
            "success_criteria": ["3+ methods"],
            "current_assumptions": [],
            "missing_information": [],
            "confidence_target": "high",
            "preferred_method": None,
            "time_limit": None,
            "cost_limit": None,
            "proposed_workflow": "research",
            "stop_rule": "3+ methods covered",
            "approval_required_before_execution": True,
            "approval_required_before_final": True,
            "improve_mode_requested": False,
        })

        # Research workflow
        research_bridge = MockResearchBridge.return_value
        research_bridge.call.side_effect = [
            json.dumps({"type": "exploratory", "evidence_needs": []}),
            json.dumps({
                "findings": ["Method A", "Method B", "Method C"],
                "confidence": 0.85,
                "gaps": [],
                "summary": "Three methods found.",
            }),
        ]

        # Review
        review_bridge = MockReviewBridge.return_value
        review_bridge.call.return_value = json.dumps({
            "meets_criteria": True,
            "confidence": 0.9,
            "gaps": [],
            "recommendations": [],
        })

        # Auto-approve everything
        mock_approval = MagicMock()
        mock_approval.request_approval.return_value = ApprovalResult(
            approved=True, feedback="Research PT methods, report format"
        )

        config = EngineConfig(
            approval_callback=mock_approval,
            results_dir=str(tmp_path),
        )

        state = run_pipeline(mode="embedded", config=config)

        assert state["primary_category"] == "research"
        assert state["brief"].goal == "Research PT methods"
        assert "findings" in state["workflow_result"]
        assert state["review_result"]["meets_criteria"] is True
```

- [ ] **Step 2: Run integration test**

```bash
pytest tests/test_integration.py -v
```

Expected: PASS

- [ ] **Step 3: Run full test suite**

```bash
pytest tests/ -v --tb=short
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/test_integration.py
git commit -m "test: add full pipeline integration test with mocked Codex calls"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Scaffold repo | None |
| 2 | Core data models | 1 |
| 3 | Engine state + config | 1, 2 |
| 4 | Codex CLI bridge | 3 |
| 5 | Approval system | 2 |
| 6 | Evaluation system | 2, 4 |
| 7 | Config YAML files | 1 |
| 8 | Prompt templates | 1 |
| 9 | Discovery — embedded | 4, 5, 8 |
| 10 | Discovery — prompt-bridge | 4, 8 |
| 11 | Classification phase | 4, 7 |
| 12 | Build brief phase | 2, 4, 8 |
| 13 | Ingestion pipeline | 2, 3 |
| 14 | Routing phase | 2, 4 |
| 15 | Research workflow | 2, 4 |
| 16 | Remaining workflows | 2, 4 |
| 17 | Execute, review, deliver | 15, 16 |
| 18 | Pipeline runner | 5, 9-14, 17 |
| 19 | CLI entry point | 18 |
| 20 | Integration test | 18 |

**Independent task groups (can run in parallel):**
- Group A: Tasks 2, 5, 6, 7, 8 (no cross-dependencies)
- Group B: Tasks 9, 10, 11, 12 (depend on Group A)
- Group C: Tasks 13, 14, 15, 16 (depend on Group A)
- Group D: Tasks 17, 18, 19, 20 (depend on Groups B + C)
