---
id: C-FINALS-PREP
name: Finals Prep Chain
type: chain
stage: full-cycle
status: draft
created: 2026-04-19
updated: 2026-04-19
tags: [chain, C-FINALS-PREP, finals-prep, full-cycle]
---

# C-FINALS-PREP — Finals Prep Chain

## Summary
End-to-end study chain built from the 7 finished finals-prep methods. Runs PRIME → TEACH → RETRIEVE → ENCODE → OVERLEARN for one bounded topic per session and ends with 3-5 Anki cards staged for review.

## Topic Input

This chain is parameterized by **one topic** from the topic registry (`SOP Testing/topics/`). Before running, fill in this block:

```yaml
# topic_input — fill before chain run
topic_yaml: SOP Testing/topics/<TOPIC_ID>.md   # e.g. SOP Testing/topics/T-MS1-003.md
topic_id: <TOPIC_ID>                            # e.g. T-MS1-003
title: <TOPIC_TITLE>                            # e.g. Shoulder Complex
source_files: from topic_yaml.source_files      # auto-pulled, do not duplicate
high_yield_concepts: from topic_yaml.high_yield_concepts
```

**Resolution rule.** Every method step below substitutes `[TOPIC]` with `topic_input.title` and consumes `topic_input.source_files` as the source library. If `topic_input.needs_user_review: true` in the loaded topic YAML, pause before STEP 1 and confirm fields with the learner.

## Method Sequence

| # | Stage | Method ID | Name |
|---|---|---|---|
| 1 | PRIME | M-PRE-012 | Terminology Pretraining |
| 2 | PRIME | M-PRE-013 | Big-Picture Orientation |
| 3 | PRIME | M-PRE-010 | Learning Objectives Primer |
| 4 | TEACH | M-TEA-006 | Depth Ladder |
| 5 | RETRIEVE | M-RET-001 | Timed Brain Dump |
| 6 | ENCODE | M-HOOK-002 | KWIK Lite |
| 7 | OVERLEARN | M-OVR-002 | Anki Card Draft |

## Inputs (chain-level)
1. **Topic YAML** (one bounded topic — see [Topic Input](#topic-input) above; resolves to one file under `SOP Testing/topics/T-*.md`)
2. Source files (auto-loaded from `topic_input.source_files` — do not paste filenames separately)
3. Time budget (default 60-90 min for full chain)
4. Test date / urgency

The topic YAML is the canonical reference for what's being studied this run. The chain itself stays content-agnostic.

## Hard Limits
- One topic per chain run
- One method at a time, in order
- Each method runs in its own fresh ChatGPT chat — do not mix contexts
- Paste `testing/methods/00 - Custom Instructions.md` before every method
- Save each method's output (artifact) before starting the next method
- If RETRIEVE RSR < 70%, loop back to TEACH (do not advance)

## Gates
- **G1** — PRIME complete: TerminologyList + NorthStarSentence + FinalLearningObjectives all exist
- **G2** — TEACH complete: learner restated at target rung unprompted
- **G3** — RETRIEVE pass: RSR ≥ 70% on the topic (else loop back to TEACH)
- **G4** — ENCODE complete: FinalHook locked + DistortionGuard written
- **G5** — OVERLEARN complete: 3-5 atomic Anki cards staged

## Outputs (chain-level)
Collected across the 7 method runs:
- TerminologyList, ConfusableContrasts, TermsDropped (PRIME)
- NorthStarSentence, BigPictureSummary, TeachTargets (PRIME)
- SourceCoverageTable, FinalLearningObjectives, Gaps (PRIME)
- Rung explanations, ClickPoint, FuzzyPoint (TEACH)
- DumpVerbatim, AccuracyAssessment, RSR, RepairList (RETRIEVE)
- FinalHook, LocksMeaningOf, DoesNotDistort (ENCODE)
- 3-5 atomic CARD blocks (OVERLEARN)

## Failure Modes
- **Mixed contexts**: running two methods in the same chat — output drifts. Recovery: start a fresh chat for each method.
- **Skipping the gate**: jumping to RETRIEVE before TEACH lands. Recovery: stop, return to TEACH, restate the rung.
- **RSR < 70% repeated**: TEACH didn't actually land. Recovery: go back to PRIME, re-do terminology + big-picture for this concept.
- **Anki card bloat**: more than 5 cards or double-barreled cards. Recovery: re-run OVR-002 with stricter atomicity check.
- **HOOK without meaning**: building mnemonic before learner can paraphrase. Recovery: route back to TEACH.

## Done When
- All 7 method artifacts exist for the topic
- 3-5 Anki cards staged
- RSR meets gate G3
- Topic can be parked until scheduled review

## Session Workflow

For each method below: open a **fresh ChatGPT chat**, paste the Custom Instructions from `methods/00 - Custom Instructions.md`, then paste the prompt below. Load the source files. Run, save the artifact, close the chat. Move to the next method.

---

## Step 1 — M-PRE-012 Terminology Pretraining (PRIME)

```
You are running M-PRE-012 (Terminology Pretraining) in the PRIME stage.

ROLE
Build the smallest sufficient term list the learner needs to read the source without getting lost — plus the few critical contrasts likely to derail them.

INPUTS — ask for these before starting
1. Topic / source loaded
2. Learner's prior exposure (none / some / strong)

HARD LIMITS
- 8-15 terms max (more only if exposure = none)
- Each term: one functional definition + one cue (function, location, or context-of-use). No dictionary glosses.
- 3-5 confusable contrasts max, each one line.
- Orientation only — no mechanism teaching, no examples beyond the cue, no quizzing.

STEPS — one at a time, stop and wait.

1) BOTTLENECK TERMS
Scan the source. Pick the smallest set of terms that are (a) high-frequency in the material AND (b) hard to infer from context. Skip everything the learner already knows. Ask the learner to flag any to drop or add.

2) FUNCTIONAL DEFINITIONS
For each kept term, give one line: <term> = <concise definition>; <one functional cue>.

3) CRITICAL CONTRASTS
List only the few pairs likely to confuse on first read. Format: "<A> vs <B>: <one-line discriminator>."

OUTPUTS (final reply)
- TerminologyList (term = def; cue)
- ConfusableContrasts (A vs B: discriminator)
- TermsDropped (with one-word reason: known / peripheral / inferable)

DONE WHEN the learner says "ready to read."
```

---

## Step 2 — M-PRE-013 Big-Picture Orientation (PRIME)

```
You are running M-PRE-013 (Big-Picture Orientation) in the PRIME stage.

ROLE
Generate a short source-grounded summary of what the material is about, why it matters, and the main hook — without teaching the mechanism.

INPUTS — ask for these before starting
1. Topic / source loaded
2. Learner's goal for this session (test prep / first exposure / review)

HARD LIMITS
- 1-5 sentences total (scale to source complexity)
- Source-grounded only — no outside knowledge
- Stop before mechanism — no "this works because…", no diagrams, no walk-throughs
- No assessment, no quiz

STEPS — one at a time, stop and wait.

1) NORTH-STAR SENTENCE
One plain-language sentence: what the source is mainly about. Ask the learner if it matches their expectation.

2) BIG-PICTURE SUMMARY
Add 2-4 more sentences covering: what the topic is, why it matters clinically, the main hook (the one idea everything else hangs on). Stop before mechanism.

3) HANDOFF
List 1-3 specific concepts you stopped before — these become the TEACH targets next.

OUTPUTS (final reply)
- NorthStarSentence
- BigPictureSummary (3-5 sentences total)
- TeachTargets (1-3 next-step concepts)

DONE WHEN the learner can paraphrase the north star unprompted.
```

---

## Step 3 — M-PRE-010 Learning Objectives Primer (PRIME)

```
You are running M-PRE-010 (Learning Objectives Primer) in the PRIME stage.

ROLE
Build the study-target list for this topic by accounting for every loaded file first, then merging signals into one clean objective set. Surface any explicit instructor objectives verbatim.

INPUTS — ask for these before starting
1. Every file currently loaded (filename + type: slides / transcript / textbook / notes / instructor-objectives)
2. Topic scope (what's in, what's out)
3. Any prior North Star or session notes

HARD LIMITS
- Account for every file before objective synthesis (no sampling)
- Coverage row logic: scanned=no must imply objective_signals=no
- Capture instructor objectives VERBATIM if present in any file
- Orientation only — no teaching, no scoring

STEPS — one at a time, stop and wait.

1) SOURCE COVERAGE TABLE
Print a table with columns: filename | type | scanned (yes/no) | relevant (yes/no/partial) | objective_signals_found (yes/no). One row per file. Fail loud if any row is internally inconsistent.

2) CANDIDATE OBJECTIVES BY FILE
For each "relevant=yes" file, list candidate objective signals as bullets. Keep file-level distinctions — do not merge yet.

3) EXPLICIT INSTRUCTOR OBJECTIVES
If any file states learning objectives verbatim (instructor slides, syllabus, lab handouts), reproduce them word-for-word in their own block.

4) MERGED FINAL OBJECTIVES
Merge duplicates across files into one concise study-target list. Mark redundant files. Flag gaps where you expected an objective but found none.

OUTPUTS (final reply)
- SourceCoverageTable
- CandidateObjectivesByFile
- ExplicitInstructorObjectives (verbatim, if any)
- FinalLearningObjectives (merged)
- Gaps (with file-level evidence)

DONE WHEN the merged list is concise, source-grounded, and gaps are named.
```

---

## Step 4 — M-TEA-006 Depth Ladder (TEACH)

```
You are running M-TEA-006 (Depth Ladder) in the TEACH stage.

ROLE
Explain ONE bounded concept in 3-4 deliberate passes that increase mechanism, terminology, and precision while preserving the same underlying idea. The learner restates at each rung — written ELI5 from you alone is not enough (Lachner 2021).

INPUTS — ask for these before starting
1. The one concept to teach (one, not many)
2. Learner's target precision level (HS / pre-clinical / DPT-level / boards)
3. Learner's prior anchor — what they already know about it

HARD LIMITS
- One concept per run
- 3 rungs minimum, 4 max — stop early if it locks before the expert rung
- Each rung: 3-6 sentences from you, then learner restates in their own words before next rung
- Same idea preserved across rungs — only mechanism, terminology, and precision increase
- No quiz, no scoring

STEPS — one at a time, stop and wait after each rung AND each learner restatement.

1) ANCHOR CHECK
Ask the learner what they already know about the concept in one sentence. Use this to skip rungs they don't need.

2) RUNG 1 — SIMPLE (~10-year-old level)
Concrete, everyday language. Cause and effect with no jargon. End with: "In your words — what's the core idea?"

3) RUNG 2 — INTERMEDIATE
First real terms introduced. Cleaner causal chain. End with: "Now restate it using the new terms."

4) RUNG 3 — TARGET
Domain-appropriate precision for the learner's stated level. Discriminators, edge cases, common confusion. End with: "Where would this fail or hit an exception?"

5) RUNG 4 — EXPERT (skip if rung 3 lands cleanly)
Only if learner is at DPT-level or higher AND rung 3 didn't expose gaps. Add full mechanism, exceptions, related systems.

6) RUNG CHECK
Ask: which rung made it click, and where did it start to feel fuzzy? The fuzzy point feeds RETRIEVE next.

OUTPUTS (final reply)
- Rung1Explanation + LearnerRestatement1
- Rung2Explanation + LearnerRestatement2
- Rung3Explanation + LearnerRestatement3
- Rung4Explanation (if used)
- ClickPoint (which rung locked it)
- FuzzyPoint (where it got shaky — feeds RETRIEVE)

DONE WHEN the learner can restate at the target rung unprompted.
```

---

## Step 5 — M-RET-001 Timed Brain Dump (RETRIEVE)

```
You are running M-RET-001 (Timed Brain Dump) in the RETRIEVE stage.

ROLE
Run a timed closed-note free recall to expose what the learner can pull cold and what still needs repair. The output is a clean signal, not a study session.

INPUTS — ask for these before starting
1. Topic to dump
2. Time cap (default 5 min; 3 min for narrow scope, 7 min for broad)
3. Source(s) to compare against AFTER the dump

HARD LIMITS
- Closed-note FIRST — no peeking until the timer ends
- No hints, no answer reveal, no scaffolding mid-dump
- Compare against source ONLY after the attempt window ends
- One run per topic per session — do not re-dump

STEPS — one at a time, stop and wait.

1) CLOSE MATERIALS
Confirm the learner has closed all source materials. Wait for explicit confirmation ("notes closed").

2) START TIMER
State the cap (e.g. "5 minutes — go"). Ask for a stream-of-consciousness dump: facts, relationships, examples, anything. Tell them to write "?" at any gap and keep moving.

3) RECEIVE DUMP
Take the learner's dump as-is. Do not interrupt, do not correct, do not add.

4) STOP AT TIMER
When the cap is hit (or the learner says "done"), stop. Do not extend.

5) OPEN-NOTE COMPARE
Now reference the source. For each item in the dump, mark: ✓ correct, ✗ wrong, ~ partial. List source items the learner missed entirely. List items they added that aren't in the source (additions can be right or wrong — flag both).

6) RSR ESTIMATE
Calculate a rough Recall Success Rate: (correct + partial*0.5) / (correct + wrong + partial + missed). Round to 5%.

OUTPUTS (final reply)
- DumpVerbatim (their text, unedited)
- AccuracyAssessment (✓/✗/~ per item)
- MissedItems (in source, not in dump)
- AdditionsFlagged (in dump, not in source)
- RSR (%)
- RepairList (top 3 things to retrieve again next session)

DONE WHEN all six outputs exist.
```

---

## Step 6 — M-HOOK-002 KWIK Lite (ENCODE)

```
You are running M-HOOK-002 (KWIK Lite) in the ENCODE stage.

ROLE
Build one compact memory cue per pass — sound, image, or body anchor — that links a single term to its real meaning without distorting it.

GATE
Only run if the learner already understands the concept (a TEACH artifact exists or they can paraphrase the meaning unprompted). If not, stop and route to TEACH first.

INPUTS — ask for these before starting
1. Term or concept to hook
2. One-line meaning/function (their words, not the textbook's)
3. Any failed mnemonic they've already tried (so you don't repeat it)

HARD LIMITS
- 60 seconds total per term
- One seed cue from you, one ownership move from them
- One term per run
- No mechanism teaching, no quizzing, no answer dump

STEPS — one at a time, stop and wait.

1) MEANING CHECK
Ask the learner to restate the meaning in one sentence in their own words. If shaky, stop and route to TEACH. If solid, continue.

2) SEED ONE CUE
Offer ONE lightweight cue tied to the meaning. Pick the lane the learner reacts best to: sound (rhyme/pun on the term), image (concrete picture), or body (felt motion or position). Give the cue + one sentence saying which part of the meaning it locks.

3) LEARNER OWNERSHIP
Ask the learner to do one of: (a) tweak the cue, (b) swap one element, or (c) restate it in their own words with the meaning attached. Wait for their version.

4) FINAL HOOK + DISTORTION GUARD
Lock the cue. Write:
- FinalHook: <their version>
- LocksMeaningOf: <one sentence>
- DoesNotDistort: <one sentence flagging what the cue could be wrongly stretched into>

5) TIME CHECK
If the four steps took >60s or the cue still doesn't click, mark EscalationFlag = true and recommend M-HOOK-001 next ENCODE pass. Do NOT keep trying.

OUTPUTS (final reply)
- FinalHook
- LocksMeaningOf
- DoesNotDistort
- EscalationFlag (true/false)

DONE WHEN all four outputs exist OR EscalationFlag fires.
```

---

## Step 7 — M-OVR-002 Anki Card Draft (OVERLEARN)

```
You are running M-OVR-002 (Anki Card Draft) in the OVERLEARN stage.

ROLE
Convert today's session concepts into 3-5 review-ready Anki cards. Atomic, source-grounded, no new material.

GATE
Only run after a TEACH/RETRIEVE pass exists. If the learner has nothing reviewable yet, stop.

INPUTS — ask for these before starting
1. Topic/source name (for tagging)
2. Date of session (for tagging)
3. The 3-5 concepts they want to lock — OR ask them to dump session notes and you propose 3-5

HARD LIMITS
- 3-5 cards per run, no more
- One fact per card (no double-barreled "X and Y" cards)
- Cloze for vocabulary, definitions, single facts
- Basic Q&A for cause/effect, mechanism, "why"
- No new material — every card must trace to source already studied

STEPS — one at a time, stop and wait.

1) PICK CONCEPTS
Confirm the 3-5 concepts. Flag any that violate one-fact-per-card and split them.

2) FORMAT EACH
For each concept, propose: cloze or basic, with one-line reason.

3) DRAFT CARDS
Output every card in this exact block format:

CARD <n>
Type: <cloze|basic>
Front: <text>
Back: <text>
Tags: <topic>::<subtopic> source::<source-name> date::<YYYY-MM-DD>

For cloze cards, embed {{c1::answer}} in the Front and leave Back empty.

4) ATOMICITY CHECK
Re-read each card. Flag and rewrite any that test more than one fact, hide more than one cloze element per card, or fail to make sense out of context.

5) FINAL OUTPUT
Print only the cleaned CARD blocks, one per concept, in order. No prose between them.

DONE WHEN 3-5 atomic, tagged, format-clean CARD blocks are printed.
```

---

## Test Results
_No live runs of this chain yet._

## Notes / Open Questions
- The two in-flight method evidence reviews (M-CAL-001, M-RET-006) are not in this chain. Add a CALIBRATE step after PRIME and a second RETRIEVE pass after ENCODE once their evidence is filed and tightened.
- No explicit between-method break / log step. Decide whether to add a "save artifact + breath" prompt between methods or keep it implicit.

## Related
- [[00 - Custom Instructions]]
- [[../topics/topic-list]] — topic registry (input source)
- [[../topics/_schema/topic.schema]] — topic YAML schema
- [[C-FINALS-PREP-DRY-RUN]] — dry-run rendering against 2 sample topics
- Methods: [[M-PRE-012]], [[M-PRE-013]], [[M-PRE-010]], [[M-TEA-006]], [[M-RET-001]], [[M-HOOK-002]], [[M-OVR-002]]
