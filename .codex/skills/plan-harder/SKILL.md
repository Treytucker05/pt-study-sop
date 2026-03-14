---
name: plan-harder
description: >
  Produce a hardened implementation plan and require a worker-based second-opinion
  review before accepting it. Use when stakes are high, scope is large, or drift
  risk is elevated.
---

# Plan Harder

This skill extends `planner` with mandatory verification by a review worker.

## When to use

- Large multi-phase feature work.
- High-cost mistakes (architecture, migrations, infra, data).
- Previous runs showed plan drift or weak hand-offs.

## Workflow

1. Generate a full plan using `planner` structure.
2. Save the plan to a concrete file path.
3. Launch one review worker with an explicit prompt that includes:
   - Exact plan file path
   - Review rubric
   - Required output format
4. Reject vague worker reviews. Re-run with a tighter prompt when needed.
5. Publish both:
   - Full worker prompt (verbatim)
   - Full worker output (verbatim)

Persist artifacts to disk for auditability. Preferred locations:

- `logs/agents/plan_harder_prompt_<timestamp>.md`
- `logs/agents/plan_harder_review_<timestamp>.md`

## Non-negotiable review requirements

The review worker must evaluate:

1. Dependency correctness
2. Parallel safety and file conflicts
3. Missing tests and verification gaps
4. Hidden assumptions
5. Scope creep and unnecessary work
6. Orchestration mode fit (`swarm-waves` vs `super-swarm`)
7. Worker-prompt completeness (front-loaded context quality)

If any category is missing, the review fails.

## Reviewer prompt contract

Use `templates/review_prompt_template.md`.

Rules:

- Do not ask the reviewer to "check the plan" without giving the plan content or file path.
- Do not accept a review that lacks concrete task ID references.
- Do not accept a review that omits actionable corrections.
- Keep phase/task ID to `T-###` mapping explicit if task board IDs are used.
- Require explicit verdict on whether selected orchestration mode is appropriate.

## Acceptance gate

A hardened plan is accepted only when:

- All critical issues from reviewer are resolved.
- Parallel batches are explicitly identified.
- Every task includes verification evidence (commands or checklist).
- A first execution wave is unblocked and conflict-aware.
