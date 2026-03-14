# ENCODE Category Reference

Stage: 3 of 6 | Control Stage: `ENCODE`
Purpose: Build understanding deeply enough to be remembered and explained.

## Entry / Exit

- **Entry**: CALIBRATE identified what needs to be fixed/learned.
- **Exit**: Learner can explain the concept in their own words with correct structure.

## Hard Rules

- Use active processing: explain, compare, map, trace.
- Convert weak/confused areas into coherent mental models.
- Not for: passive rereading as the primary activity.

## Method Inventory

### Core Encode (category: `encode`)

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-ENC-001 | KWIK Hook | low | 3 min | mnemonic_encoding |
| M-ENC-002 | Seed-Lock Generation | medium | 8 min | generation_effect |
| M-ENC-003 | Draw-Label | medium | 8 min | dual_coding |
| M-ENC-004 | Teach-Back | medium | 8 min | generation, self_explanation |
| M-ENC-005 | Why-Chain | medium | 5 min | elaborative_interrogation |
| M-ENC-007 | Self-Explanation Protocol | medium | 8 min | self_explanation |
| M-ENC-008 | Mechanism Trace | medium | 10 min | causal_reasoning |
| M-ENC-009 | Concept Map | medium | 10 min | spatial_organization |
| M-ENC-010 | Comparison Table | medium | 8 min | discrimination |
| M-ENC-011 | Process Flowchart | medium | 10 min | procedural_encoding |
| M-ENC-012 | Clinical Decision Tree | medium | 10 min | conditional_reasoning |
| M-ENC-013 | Memory Palace | medium | 10 min | method_of_loci |
| M-ENC-014 | Chain Linking | low | 5 min | serial_encoding |

### Interrogate (category: `interrogate`, maps to ENCODE stage)

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-INT-001 | Analogy Bridge | medium | 5 min | analogical_transfer |
| M-INT-002 | Clinical Application | medium | 8 min | application_transfer |
| M-INT-003 | Cross-Topic Link | medium | 5 min | interleaving |
| M-INT-004 | Side-by-Side Comparison | medium | 8 min | discrimination |
| M-INT-005 | Case Walkthrough | medium | 10 min | case_based_reasoning |
| M-INT-006 | Illness Script Builder | medium | 10 min | schema_construction |

## Contract Summary

- **Allowed**: Active processing (explain, compare, map, trace, generate), build mental models, use analogies and multiple representations.
- **Forbidden**: Passive rereading, skipping active production, accepting surface-level answers without elaboration.
- **Required outputs**: Vary per method — typically artifacts (maps, tables, explanations, flowcharts).

## Sample Tutor Prompt

```
You are running an ENCODE block. Use active processing to build deep
understanding. The learner must explain, compare, map, or trace — not
passively reread. End each teaching chunk with a check-in. Exit when
the learner can explain the concept in their own words correctly.
```

## Evidence Anchors

- Roelle et al. (2022): generation effect (d=0.40) for encoding
- Chi (2009): self-explanation improves understanding
- Novak & Canas (2006): concept mapping (d=0.82) for knowledge organization
- Dresler et al. (2017): method of loci for structured memorization
