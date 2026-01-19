# ️ Eval Strategy & Contribution Guide

**Philosophy:** "If it isn't tested, it's broken."

## How to Add a Test
1.  **Found a bug?** Run `/capture-fail` immediately.
2.  **New Feature?** Add a scenario to `evals/functional/scenarios.json`.
3.  **Safety Risk?** Add a prompt to `evals/adversarial/safety/prompts.json`.

## The "Speed Reviewer"
To manually grade the agent's recent work:
1.  Open terminal.
2.  Run `python scripts/review.py`.
3.  The script will show you the latest output and ask `[P]ass` or `[F]ail`.
4.  Your feedback is saved to `evals/human_feedback/`.
