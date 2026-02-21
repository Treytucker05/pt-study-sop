"""Session configuration toggles for n-of-1 optimization.

Stores per-session experiment configuration for controlled comparisons:
  - Mastery threshold (0.95 vs 0.98)
  - RAG mode (vector-only vs Graph RAG-lite)
  - Fading mode (fixed vs adaptive)
  - Pruning (on vs off)
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass


@dataclass
class SessionConfig:
    """Experiment toggles for a single tutor session."""

    mastery_threshold: float = 0.95
    rag_mode: str = "graph_rag"  # "vector_only" | "graph_rag"
    fading_mode: str = "adaptive"  # "fixed" | "adaptive"
    pruning_enabled: bool = True

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, data: dict) -> "SessionConfig":
        return cls(
            mastery_threshold=data.get("mastery_threshold", 0.95),
            rag_mode=data.get("rag_mode", "graph_rag"),
            fading_mode=data.get("fading_mode", "adaptive"),
            pruning_enabled=data.get("pruning_enabled", True),
        )

    @classmethod
    def from_json(cls, raw: str | None) -> "SessionConfig":
        if not raw:
            return cls()
        try:
            return cls.from_dict(json.loads(raw))
        except (json.JSONDecodeError, TypeError):
            return cls()


VALID_RAG_MODES = {"vector_only", "graph_rag"}
VALID_FADING_MODES = {"fixed", "adaptive"}
VALID_THRESHOLDS = {0.95, 0.98}


def validate_session_config(cfg: SessionConfig) -> tuple[bool, list[str]]:
    """Validate session config values. Returns (is_valid, issues)."""
    issues: list[str] = []

    if cfg.mastery_threshold not in VALID_THRESHOLDS:
        issues.append(
            f"mastery_threshold must be one of {VALID_THRESHOLDS}, got {cfg.mastery_threshold}"
        )
    if cfg.rag_mode not in VALID_RAG_MODES:
        issues.append(
            f"rag_mode must be one of {VALID_RAG_MODES}, got {cfg.rag_mode}"
        )
    if cfg.fading_mode not in VALID_FADING_MODES:
        issues.append(
            f"fading_mode must be one of {VALID_FADING_MODES}, got {cfg.fading_mode}"
        )
    if not isinstance(cfg.pruning_enabled, bool):
        issues.append(f"pruning_enabled must be bool, got {type(cfg.pruning_enabled)}")

    return (len(issues) == 0, issues)


def ensure_config_column(conn: sqlite3.Connection) -> None:
    """Add experiment_config_json column to tutor_sessions if missing."""
    cur = conn.execute("PRAGMA table_info(tutor_sessions)")
    columns = {row[1] for row in cur.fetchall()}
    if "experiment_config_json" not in columns:
        conn.execute(
            "ALTER TABLE tutor_sessions ADD COLUMN experiment_config_json TEXT"
        )
        conn.commit()


def save_session_config(
    conn: sqlite3.Connection, session_id: str, config: SessionConfig
) -> None:
    """Store experiment config for a tutor session."""
    ensure_config_column(conn)
    conn.execute(
        "UPDATE tutor_sessions SET experiment_config_json = ? WHERE session_id = ?",
        (config.to_json(), session_id),
    )
    conn.commit()


def load_session_config(
    conn: sqlite3.Connection, session_id: str
) -> SessionConfig:
    """Load experiment config for a tutor session. Returns defaults if none stored."""
    ensure_config_column(conn)
    cur = conn.execute(
        "SELECT experiment_config_json FROM tutor_sessions WHERE session_id = ?",
        (session_id,),
    )
    row = cur.fetchone()
    if row and row[0]:
        return SessionConfig.from_json(row[0])
    return SessionConfig()
