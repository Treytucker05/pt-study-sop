# System 4 Source Notes (Intro to Agents)

Source: "Intro to Agents" (provided by user)

## Core Definition
- An agent takes actions based on goals, not step-by-step instructions.
- It observes, decides, acts, observes results, and loops until goal or stop condition.
- Agents handle exceptions and escalate to humans when needed.

## The Agent Loop
1. Observe current state (APIs, DBs, docs).
2. Decide action based on goal.
3. Act (execute tool or workflow).
4. Observe result.
5. Repeat until done or stop condition.

## Three Required Components
- Perception: how the agent sees the world (APIs, DBs, docs).
- Decision logic: structured decision trees for routine cases; model for ambiguity.
- Action interface: tools + permissions + logging; reversible where possible.

## Tools
- Tools are functions the agent requests; orchestration validates and executes.
- One tool = one responsibility with clear success/failure outputs.
- Silent failures break learning; tools must return structured data.

## Memory and Context
- Context window is limited; use external memory (files/DB).
- Pattern: context window for current work; external memory for history.
- Memory is also an audit trail for failures and reasoning.

## Planning vs Execution
- Planning is mandatory for non-trivial tasks.
- Plan includes dependencies, edge cases, timing, verification, and rollback.
- Human approval gate before execution prevents failures.

## Failure Handling
- Retry with backoff for transient failures.
- Human-in-the-loop for low-confidence decisions.
- Safe failure: never delete old data.
- Make failures observable (logs + context).

## Guardrails and Permissions
- Guardrails are hard limits (never delete, rate limits).
- Permissions are enforced by orchestration; agent only requests actions.

## Build Your First Agent (Steps)
1. Define goal with clear success criteria.
2. List needed information.
3. Build tools (functions) and test independently.
4. Write decision logic.
5. Wrap in orchestration.
6. Test on real data.
7. Add guardrails and rate limits.
8. Validate and iterate.

## When to Use Agents
- Best for repetitive tasks with judgment and patterns.
- Handle the 80% routine; route 20% complex to humans.

## Actionable Requirements for System 4
- Define agent basics (goal-driven loop).
- Document the three components and tool boundaries.
- Include memory + audit trail guidance.
- Enforce planning gate and failure modes.
- Provide a starter build checklist.
