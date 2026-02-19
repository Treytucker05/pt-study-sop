#!/usr/bin/env python3
"""
Tutor retrieval evaluation harness.

Runs a fixed question set against Tutor RAG retrieval and writes a structured
report for profile tuning.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
BRAIN_DIR = REPO_ROOT / "brain"
if str(BRAIN_DIR) not in sys.path:
    sys.path.insert(0, str(BRAIN_DIR))

from tutor_accuracy_profiles import (  # noqa: E402
    DEFAULT_ACCURACY_PROFILE,
    accuracy_profile_config,
    normalize_accuracy_profile,
    resolve_instruction_retrieval_k,
    resolve_material_retrieval_k,
)
from tutor_rag import get_dual_context, keyword_search_dual  # noqa: E402

DEFAULT_DATASET = REPO_ROOT / "brain" / "evals" / "tutor_eval_questions_50.json"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "logs" / "tutor_eval"


def _parse_material_ids(raw: str | None) -> list[int] | None:
    if not raw:
        return None
    parsed: list[int] = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        try:
            value = int(token)
        except ValueError:
            continue
        if value > 0:
            parsed.append(value)
    return parsed or None


def _load_dataset(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    questions = payload.get("questions")
    if not isinstance(questions, list):
        raise ValueError(f"Dataset {path} missing 'questions' list")
    return payload, questions


def _sources_from_docs(docs: list[Any]) -> list[str]:
    sources: list[str] = []
    for doc in docs:
        source = str((getattr(doc, "metadata", None) or {}).get("source") or "").strip()
        if source:
            sources.append(source)
    return sources


def _top_source_share(sources: Iterable[str]) -> float:
    source_list = list(sources)
    if not source_list:
        return 0.0
    counts: dict[str, int] = {}
    for source in source_list:
        counts[source] = counts.get(source, 0) + 1
    top = max(counts.values())
    return round(float(top / len(source_list)), 4)


def _match_expected_sources(
    retrieved_sources: list[str],
    expected_hints: list[str],
) -> tuple[int, bool]:
    if not expected_hints:
        return 0, False
    normalized_sources = [src.lower() for src in retrieved_sources]
    matched = 0
    for hint in expected_hints:
        needle = str(hint).strip().lower()
        if needle and any(needle in src for src in normalized_sources):
            matched += 1
    return matched, matched > 0


def _score_confidence(
    *,
    selected_material_count: int,
    material_k: int,
    retrieved_unique_sources: int,
    top_source_share: float,
    dropped_by_cap: int,
    merged_candidates: int,
) -> float:
    target_scope = selected_material_count if selected_material_count > 0 else material_k
    scope_denom = max(1, min(material_k, target_scope))
    coverage = min(1.0, retrieved_unique_sources / scope_denom)
    diversity = max(0.0, 1.0 - max(0.0, min(1.0, top_source_share)))
    cap_penalty = min(1.0, dropped_by_cap / max(1, merged_candidates))
    score = (0.65 * coverage) + (0.35 * diversity) - (0.10 * cap_penalty)
    return round(max(0.0, min(1.0, score)), 4)


def _confidence_tier(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def _evaluate_question(
    item: dict[str, Any],
    *,
    course_id: int | None,
    material_ids: list[int] | None,
    material_k: int,
    instruction_k: int,
    keyword_only: bool,
) -> dict[str, Any]:
    question = str(item.get("question") or "").strip()
    if not question:
        raise ValueError("Question item missing 'question'")

    rag_debug: dict[str, Any] = {}
    if keyword_only:
        dual = keyword_search_dual(
            question,
            course_id=course_id,
            material_ids=material_ids,
            k_materials=material_k,
            k_instructions=instruction_k,
            debug=rag_debug,
        )
    else:
        dual = get_dual_context(
            question,
            course_id=course_id,
            material_ids=material_ids,
            k_materials=material_k,
            k_instructions=instruction_k,
            debug=rag_debug,
        )

    material_docs = dual.get("materials") or []
    sources = _sources_from_docs(material_docs)
    unique_sources = len(set(sources))
    top_share = _top_source_share(sources)
    expected_hints = item.get("expected_source_hints") or []
    if not isinstance(expected_hints, list):
        expected_hints = []
    matched_count, hit = _match_expected_sources(sources, expected_hints)

    material_debug = rag_debug.get("materials") if isinstance(rag_debug, dict) else {}
    if not isinstance(material_debug, dict):
        material_debug = {}
    dropped_by_cap = int(material_debug.get("candidate_pool_dropped_by_cap") or 0)
    merged_candidates = int(material_debug.get("candidate_pool_merged") or 0)
    confidence = _score_confidence(
        selected_material_count=len(material_ids or []),
        material_k=material_k,
        retrieved_unique_sources=unique_sources,
        top_source_share=top_share,
        dropped_by_cap=dropped_by_cap,
        merged_candidates=merged_candidates,
    )

    return {
        "id": item.get("id"),
        "intent": item.get("intent"),
        "question": question,
        "expected_source_hints": expected_hints,
        "retrieved_chunks": len(material_docs),
        "retrieved_unique_sources": unique_sources,
        "retrieved_sources": sorted(set(sources))[:20],
        "top_source_share": top_share,
        "dropped_by_cap": dropped_by_cap,
        "expected_hint_matches": matched_count,
        "hit": hit,
        "confidence": confidence,
        "confidence_tier": _confidence_tier(confidence),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Tutor retrieval evaluation harness")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--course-id", type=int, default=None)
    parser.add_argument("--material-ids", type=str, default=None, help="Comma-separated IDs")
    parser.add_argument(
        "--profile",
        type=str,
        default=DEFAULT_ACCURACY_PROFILE,
        choices=["balanced", "strict", "coverage"],
    )
    parser.add_argument("--keyword-only", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Optional question limit for quick checks")
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()

    dataset_payload, questions = _load_dataset(args.dataset)
    if args.limit and args.limit > 0:
        questions = questions[: args.limit]

    profile = normalize_accuracy_profile(args.profile)
    profile_cfg = accuracy_profile_config(profile)
    material_ids = _parse_material_ids(args.material_ids)
    material_k = resolve_material_retrieval_k(material_ids, profile)
    instruction_k = resolve_instruction_retrieval_k(profile)

    started_at = datetime.now().isoformat(timespec="seconds")
    results: list[dict[str, Any]] = []
    for item in questions:
        results.append(
            _evaluate_question(
                item,
                course_id=args.course_id,
                material_ids=material_ids,
                material_k=material_k,
                instruction_k=instruction_k,
                keyword_only=args.keyword_only,
            )
        )

    total = len(results)
    hits = sum(1 for r in results if r["hit"])
    avg_unique_sources = statistics.mean(r["retrieved_unique_sources"] for r in results) if results else 0.0
    avg_top_share = statistics.mean(r["top_source_share"] for r in results) if results else 0.0
    avg_dropped_by_cap = statistics.mean(r["dropped_by_cap"] for r in results) if results else 0.0
    avg_confidence = statistics.mean(r["confidence"] for r in results) if results else 0.0

    summary = {
        "started_at": started_at,
        "dataset": str(args.dataset),
        "dataset_name": dataset_payload.get("name"),
        "dataset_version": dataset_payload.get("version"),
        "questions_total": total,
        "profile": profile,
        "profile_label": profile_cfg.get("label"),
        "profile_description": profile_cfg.get("description"),
        "course_id": args.course_id,
        "material_ids_count": len(material_ids or []),
        "material_k": material_k,
        "instruction_k": instruction_k,
        "keyword_only": bool(args.keyword_only),
        "hit_rate": round((hits / total), 4) if total else 0.0,
        "avg_unique_sources": round(float(avg_unique_sources), 4),
        "avg_top_source_share": round(float(avg_top_share), 4),
        "avg_dropped_by_cap": round(float(avg_dropped_by_cap), 4),
        "avg_confidence": round(float(avg_confidence), 4),
        "low_confidence_questions": [r["id"] for r in results if r["confidence_tier"] == "low"][:20],
    }

    report = {
        "summary": summary,
        "results": results,
    }

    if args.out:
        out_path = args.out
    else:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        out_path = DEFAULT_OUTPUT_DIR / f"tutor_retrieval_eval_{timestamp}_{profile}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Dataset: {args.dataset}")
    print(f"Profile: {profile} (material_k={material_k}, instruction_k={instruction_k})")
    print(f"Questions: {total}")
    print(f"Hit rate: {summary['hit_rate']:.2%}")
    print(f"Avg confidence: {summary['avg_confidence']:.3f}")
    print(f"Avg unique sources: {summary['avg_unique_sources']:.3f}")
    print(f"Avg top-source share: {summary['avg_top_source_share']:.3f}")
    print(f"Avg dropped-by-cap: {summary['avg_dropped_by_cap']:.3f}")
    print(f"Report: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
