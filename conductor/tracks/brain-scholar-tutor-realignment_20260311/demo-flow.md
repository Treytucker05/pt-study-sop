# Demo Flow: Brain / Scholar / Tutor Premium Loop

**Track:** `brain-scholar-tutor-realignment_20260311`  
**Date:** 2026-03-11  
**Status:** Current sellable demo path

## Demo Goal

Show, in one end-to-end flow, that Trey’s Study System is not just an AI tutor. It is a 3-part learning system:

- **Brain** diagnoses the learner
- **Scholar** researches what should change
- **Tutor** teaches with a bounded, explainable strategy

## Recommended Demo Script

### 1. Open the dashboard and complete onboarding

- start with a fresh learner state or a low-history state
- enter a goal, current friction, and workflow context
- show that onboarding immediately seeds the product loop instead of dumping the learner into a generic dashboard

What to point out:

- the shell centers Brain / Scholar / Tutor
- onboarding logs a real event and kicks off a first Scholar investigation

### 2. Show Brain’s learner profile

- open the Brain profile surface
- walk through the learner archetype summary
- open at least one claim card and its evidence drawer
- show confidence, freshness, and contradiction-aware reasoning
- submit one learner challenge/calibration answer

What to point out:

- Brain does not just “score” the learner
- Brain explains what it thinks and lets the learner push back

### 3. Show Scholar running as a research partner

- open Scholar
- show the active investigation seeded from onboarding or Brain uncertainty
- answer one learner-facing Scholar question
- show cited findings, source metadata, and visible uncertainty

What to point out:

- Scholar is asking and researching, not pretending to already know
- Scholar stays non-teaching for course content

### 4. Start a Tutor session with bounded adaptation

- open Tutor and start or resume a session
- show that the session carries a Scholar strategy snapshot and Brain evidence snapshot
- call out the learner-facing rationale for why the session is paced or scaffolded this way

What to point out:

- Tutor is the only teaching engine
- Tutor is adapting, but only inside a bounded envelope with provenance

### 5. Close with trust + value proof

- open the dashboard value-proof section
- show product analytics metrics
- open the data-rights/privacy controls
- export Brain and Scholar data
- open the outcome report

What to point out:

- the learner can inspect and control personalization
- value proof is instrumented, not hand-waved

## Demo Proof Points

The demo should leave the viewer with these conclusions:

1. This product understands the learner, not just the content.
2. It can research how to improve the learning process, not only answer questions.
3. It teaches with visible strategy and bounded adaptation.
4. It is trustworthy because personalization is explainable, challengeable, exportable, and resettable.

## Live Validation Backing This Demo

- backend regression suite green
- frontend API + Scholar tests green
- frontend production build green
- live dashboard readiness green through `Start_Dashboard.bat`
- live smokes passing for Brain profile and product APIs
