---
name: evaluation
description: Evaluate agent and LLM outputs. Use when asked to evaluate agent performance, build evaluation frameworks, implement LLM-as-judge, compare model outputs, create rubrics, mitigate evaluation bias, or design evaluation pipelines and quality gates.
---

# Evaluation (Foundational + Advanced)

Evaluation for agents and LLM outputs requires outcome-focused methods that handle non-determinism, multiple valid paths, and subjective criteria. This skill combines agent-system evaluation with production-grade LLM-as-judge techniques.

## When to activate
- Evaluate agent performance or quality over time
- Build automated evaluation pipelines or quality gates
- Create or improve evaluation rubrics
- Compare model outputs or prompts
- Debug inconsistent evaluation results
- Validate context engineering choices

## Core concepts
- Outcome focus: judge results and process reasonableness, not exact steps.
- Multi-dimensional rubrics: accuracy, completeness, citations, source quality, tool efficiency, etc.
- LLM-as-judge is a family of methods (direct scoring vs pairwise comparison).
- Non-determinism requires repeated runs and aggregated metrics.

## Direct scoring vs pairwise comparison
Use this decision rule:
- Objective criteria with ground truth -> direct scoring.
- Preferences or subjective quality -> pairwise comparison with position swaps.

### Direct scoring pattern
- Define clear criteria and a calibrated scale.
- Require evidence-based justification for each score.
- Output structured JSON for scoring and analysis.

### Pairwise comparison pattern
- Compare Response A vs B on defined criteria.
- Mitigate position bias by swapping positions and checking consistency.
- Allow ties when responses are equivalent.

## Biases and mitigations
- Position bias -> swap order, require agreement.
- Length/verbosity bias -> explicitly ignore length, penalize irrelevant detail.
- Self-enhancement bias -> use a different model for judging.
- Authority bias -> require evidence or citations.

## Rubric design
- One criterion per dimension, with clear level descriptions.
- Include edge case guidance.
- Assign weights and compute overall scores.

## Metrics selection (examples)
- Binary: precision, recall, F1, Cohen kappa.
- Ordinal: Spearman rho, Kendall tau, weighted kappa.
- Pairwise: agreement rate, position consistency, confidence calibration.
- Multi-label: macro/micro F1.

## Test set design
- Use real usage patterns plus known edge cases.
- Stratify by complexity (simple, medium, complex, very complex).
- Include long-context and multi-tool scenarios.

## Evaluation pipeline
1) Define dimensions and rubrics.
2) Build test sets and baselines.
3) Implement automated scoring (LLM-as-judge).
4) Add human review for low-confidence or high-risk cases.
5) Monitor results over time and alert on regressions.

### Performance drivers note
Research on browsing agents suggests token budget and tool calls explain most variance. Treat this as a reminder to evaluate with realistic budgets and to track tool usage.

## Examples

Direct scoring prompt (outline):
```
You are an expert evaluator.
Task: {prompt}
Response: {response}
Criteria: {name, description, weight}
For each criterion:
- cite evidence
- score 1-5
- suggest one improvement
Return JSON.
```

Pairwise comparison prompt (outline):
```
Compare Response A vs B.
Ignore length and position.
Rate by criteria.
Return JSON with winner, confidence, and rationale.
```

## References
- `references/metrics.md`
- `references/implementation-patterns.md`
- `references/bias-mitigation.md`
- `references/metrics-guide.md`
