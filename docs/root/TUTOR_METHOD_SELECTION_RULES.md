# Tutor Method Selection Rules (v1)

Date: 2026-02-22  
Scope: method selection policy and stage boundaries

## Purpose
This file defines how methods are selected per stage so PRIME and CALIBRATE never blur.

## Hard Stage Boundary
- PRIME is non-assessment.
- CALIBRATE is assessment.

## PRIME Method Admission Rule
A method is allowed in PRIME only if it:
- structures new material,
- teaches baseline concepts,
- or asks orientation prompts that are non-scored.

A method is blocked from PRIME if it:
- checks correctness,
- logs confidence as a score signal,
- or produces an accuracy value.

## CALIBRATE Method Admission Rule
A method is allowed in CALIBRATE only if it:
- probes learner understanding,
- captures confidence/latency/error type,
- and outputs a prioritized gap map.

## Question Type Contract
- `prime_question`:
  - purpose: orient/structure
  - scored: no
  - accuracy logged: no
  - confidence required: no
- `calibrate_question`:
  - purpose: assess and calibrate
  - scored: yes
  - accuracy logged: yes
  - confidence required: yes

## First-Exposure Default
- Default session assumption: unseen material.
- Session opens with PRIME teaching/structure before any calibrate probes.
- If user has prior mastery evidence, CALIBRATE can be shortened but not removed.

## Chain-Level Rule
- Any chain for first exposure must begin with PRIME.
- CALIBRATE must occur before heavy ENCODE/RETRIEVE adaptation decisions.

## Validation Rules (Deterministic)
- Reject method placement if method metadata marks `assessment=true` in PRIME.
- Reject prime prompts containing scoring instructions or confidence scoring directives.
- Reject calibrate prompts that omit confidence capture.

## Given/When/Then Checks
1. Given stage is PRIME, when selected method has `assessment=true`, then block selection.
2. Given stage is PRIME, when prompt asks for confidence score or graded answer, then fail validation.
3. Given stage is CALIBRATE, when probe is generated, then require correctness + confidence fields.
4. Given first-exposure chain, when stage order is evaluated, then PRIME must precede CALIBRATE.
5. Given first-exposure chain, when CALIBRATE is missing, then mark chain invalid.
