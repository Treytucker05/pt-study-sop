# System 4: Intro to Agents (SOP)

## Purpose
Explain how to build reliable agents that act on goals, handle exceptions,
and integrate safely with the Universal System.

## Definition
An agent is a system that takes actions based on goals, not step-by-step
instructions. It observes, decides, acts, observes results, and loops
until the goal is met or a stop condition is reached.

## The Agent Loop
1. Observe current state (APIs, DBs, documents).
2. Decide next action based on the goal.
3. Act via a tool or workflow.
4. Observe the result.
5. Repeat until done or stop condition.

## The Three Components
1. Perception: inputs from APIs, databases, and documents.
2. Decision logic: decision trees for routine cases; model for ambiguity.
3. Action interface: tools with permissions, logging, and reversibility.

## Tools (How Actions Happen)
- Tools are functions the agent requests; orchestration validates and runs them.
- Each tool should do one thing, return structured output, and expose failures.
- Silent failures prevent learning and must be avoided.

## Memory and Context
- Context window is limited; external memory is required for history.
- Pattern: context window for current task, external memory for completed work.
- Memory is also an audit trail for debugging failures and reasoning.

## Planning Gate (Non-Negotiable)
- For any non-trivial task, planning happens first.
- The plan includes dependencies, edge cases, timing, verification, rollback.
- A human approves before execution.

## Failure Handling
- Retry with backoff for transient failures.
- Human-in-the-loop for low-confidence decisions.
- Safe failure: never delete old data.
- Log failures with enough context to diagnose.

## Guardrails and Permissions
- Guardrails are hard limits (prohibited actions, rate limits).
- Permissions are enforced by orchestration, not the model.

## Build Your First Agent (Checklist)
1. Define a narrow goal with clear success criteria.
2. List all required information.
3. Build tools and test them independently.
4. Write decision logic.
5. Wrap in an orchestration layer.
6. Test with real data.
7. Add guardrails and rate limits.
8. Validate and iterate before expanding scope.

## When to Use Agents
- Use for repetitive tasks that require judgment and patterns.
- Route complex or ambiguous cases to humans.

## System Integration
- System 1 provides the planning gate and command discipline.
- System 2 enforces evals and regression safety.
- System 4 provides the agent design doctrine used across projects.
