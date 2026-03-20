# Plan

## Overview
Identify and validate the best Windows-native, non-blocking “computer use” architecture for LLMs, emphasizing minimal disruption and OAuth session reuse. The approach combines a focused tool survey with hands-on feasibility tests on the user’s actual apps before final selection.

## Scope
- In:
  - Survey UI Automation and background-input approaches for Windows native apps
  - Validate non-blocking behavior and OAuth session reuse on real apps
  - Produce a ranked decision matrix and a recommended architecture
  - Define a minimal proof-of-concept path and success criteria
- Out:
  - Full production implementation
  - Cross-platform support

## Phases
### Phase 1: Requirements and Constraints
**Goal**: Define measurable success criteria tied to “minimal disruption.”

#### Task 1.1: Define disruption and success metrics
- Location: `llm-council/runs/20260317-windows-computer-use/requirements.md`
- Description: Specify acceptable cursor movement, focus changes, latency, and user interaction concurrency.
- Estimated Tokens: 800
- Dependencies: none
- Steps:
  - Define “no cursor hijack” threshold and acceptable fallback behavior
  - Define allowed focus changes and background-window interaction limits
- Acceptance Criteria:
  - A clear go/no-go checklist for disruption and usability

#### Task 1.2: Collect top 5 apps and workflow priorities
- Location: same file
- Description: List the user’s most-used native apps and critical workflows.
- Estimated Tokens: 500
- Dependencies: Task 1.1
- Steps:
  - Capture top 5 apps and 2–3 key actions per app
  - Rank which apps must be fully supported
- Acceptance Criteria:
  - A prioritized list of apps and actions to test

### Phase 2: Candidate Survey
**Goal**: Identify viable architectures that avoid cursor hijacking.

#### Task 2.1: Catalog candidates and mechanisms
- Location: `llm-council/runs/20260317-windows-computer-use/candidates.md`
- Description: Document tools/architectures using UIA, SendMessage, PrintWindow/Graphics Capture, or isolated sessions.
- Estimated Tokens: 2,500
- Dependencies: Phase 1
- Steps:
  - Evaluate UIA-first stacks such as pywinauto, FlaUI, and direct UIA COM
  - Evaluate background input approaches such as ControlClick/ControlSend
  - Evaluate window-capture approaches such as Graphics Capture API
- Acceptance Criteria:
  - At least 6 candidates with mechanism, cursor behavior, and maintenance status

#### Task 2.2: OAuth session reuse assessment
- Location: same file
- Description: Determine if each candidate can attach to existing app/browser sessions.
- Estimated Tokens: 1,200
- Dependencies: Task 2.1
- Steps:
  - Validate attachment to existing Chrome/Edge windows
  - Document session reuse viability per candidate
- Acceptance Criteria:
  - Clear yes/no per candidate for OAuth reuse with explanation

### Phase 3: Feasibility Tests on Real Apps
**Goal**: Validate minimal-disruption and coverage on the user’s daily apps.

#### Task 3.1: Non-blocking interaction tests
- Location: `llm-council/runs/20260317-windows-computer-use/feasibility.md`
- Description: Run small scripts to check UIA interaction and background input without cursor movement.
- Estimated Tokens: 2,000
- Dependencies: Phase 2
- Steps:
  - Test each top app for UIA element discovery and action execution
  - Measure cursor movement and focus changes during automation
- Acceptance Criteria:
  - Pass/fail per app tied to disruption metrics

### Phase 4: Decision Matrix and Recommendation
**Goal**: Select the best architecture with clear tradeoffs.

#### Task 4.1: Score and rank candidates
- Location: `llm-council/runs/20260317-windows-computer-use/decision-matrix.md`
- Description: Score on stealth, native app support, OAuth reuse, maturity, setup complexity, and feasibility results.
- Estimated Tokens: 1,500
- Dependencies: Phase 3
- Steps:
  - Apply weighted rubric and rank candidates
  - Select top recommendation and one fallback
- Acceptance Criteria:
  - Ranked matrix with scores and a primary recommendation

### Phase 5: Architecture Outline and PoC Path
**Goal**: Define the minimal architecture and proof-of-concept steps.

#### Task 5.1: Architecture outline
- Location: `llm-council/runs/20260317-windows-computer-use/architecture.md`
- Description: Capture flow for window capture, UIA tree parsing, LLM action mapping, and background execution.
- Estimated Tokens: 2,000
- Dependencies: Phase 4
- Steps:
  - Specify capture and UIA serialization approach
  - Specify action execution without cursor movement
- Acceptance Criteria:
  - A concise architecture diagram and a PoC checklist

## Testing Strategy
- Verify zero cursor movement using a cursor-position monitor.
- Verify background actions do not steal focus for each top app.
- Confirm OAuth reuse by interacting with already-authenticated browser sessions.

## Risks
- UIA coverage may be insufficient for one or more critical apps. Mitigation: add a fallback to image-based element detection with explicit opt-in for limited cursor movement.

## Rollback Plan
- All artifacts are new files in `llm-council/runs/20260317-windows-computer-use/`; delete the folder to rollback.

## Edge Cases
- Elevated apps require elevated automation process.
- GPU-accelerated windows may not capture with PrintWindow; use Graphics Capture API.
- Multi-monitor mixed-DPI may require coordinate normalization.

## Open Questions
- What are the user’s top 5 daily apps and must-have actions?
- Is any cursor movement ever acceptable as an opt-in fallback?