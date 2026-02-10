# PPFW Research Log

A living document for tracking ongoing research into learning science. The **Scholar** uses this to propose evidence-based improvements to the PT Study OS.

> **Related Docs:**
> - Genesis document: `docs/root/VISION_PPFW.md`
> - Evidence base: `sop/library/12-evidence.md`
> - Method library: `sop/library/15-method-library.md`

---

## How to Use This Log

1. **Add Entry:** When researching a topic, add a dated entry below
2. **Cite Sources:** Always include author, year, DOI/URL
3. **Tag Tier:** Label which PPFW tier (Paradigm, Principle, Framework, Workflow)
4. **Action:** Note whether this requires SOP changes

---

## Research Entry Template

```markdown
### [YYYY-MM-DD] Topic Name

**Tier:** Paradigm | Principle | Framework | Workflow
**Status:** Researching | Reviewed | Integrated | Rejected

**Question:** What are we trying to learn?

**Sources Reviewed:**
- Author (Year). Title. Journal. DOI/URL
- ...

**Key Findings:**
1. Finding 1 with effect size if available
2. Finding 2
3. ...

**System Implications:**
- [ ] Add new method block?
- [ ] Modify existing method?
- [ ] Update evidence citation?
- [ ] No change needed (explain)

**Next Steps:**
- ...
```

---

## Active Research Threads

### [2026-02-09] Cognitive Load Theory — Individual Differences

**Tier:** Paradigm
**Status:** Reviewed

**Question:** Does CLT apply differently based on learner expertise?

**Sources Reviewed:**
- Sweller (2024). "Cognitive load theory and individual differences." *Learning and Individual Differences*. DOI: 10.1016/j.lindif.2024.102423
- Evans et al. (2024). "Cognitive Load Theory and Its Relationships with Motivation." *Educational Psychology Review*.

**Key Findings:**
1. Expertise reversal effect: What helps novices (worked examples) can hurt experts
2. Self-determination and intrinsic motivation modulate germane load processing
3. Individual differences in working memory capacity affect optimal instructional design

**System Implications:**
- [ ] Consider adding expertise assessment to M0 Planning
- [ ] Track student progress to shift from guided → independent
- [x] Current M4 Build ladder already addresses this (Guided → Faded → Independent)

**Next Steps:**
- Monitor for updated meta-analyses on expertise reversal

---

### [2026-02-09] Spaced Retrieval Practice Meta-Analysis

**Tier:** Principle
**Status:** Reviewed

**Question:** What is the optimal combination of spacing + retrieval?

**Sources Reviewed:**
- Latimier, Peyre, & Ramus (2021). "A Meta-Analytic Review of Spaced Retrieval Practice." *Educational Psychology Review*. DOI: 10.1007/s10648-020-09572-8
- Carpenter, Pan, & Butler (2022). "The science of effective learning with spacing and retrieval practice." *Nature Reviews Psychology*.

**Key Findings:**
1. Spaced retrieval practice (d = 0.63) outperforms massed retrieval practice
2. No significant difference between expanding (1-3-7-21) vs. uniform spacing
3. Effect robust across age groups and content domains
4. Combination of spacing + retrieval is more powerful than either alone

**System Implications:**
- [x] Current 1-3-7-21 schedule is evidence-supported
- [x] Mastery Loop (M-REF-002) implements successive relearning correctly
- [ ] Could add uniform spacing option as alternative (no priority)

**Next Steps:**
- None — current implementation is optimal

---

### [2026-02-09] Interleaving Boundary Conditions

**Tier:** Principle
**Status:** Researching

**Question:** When does interleaving NOT work?

**Sources Reviewed:**
- Mielicki & Wiley (2022). "Exploring necessary conditions for interleaved practice benefits." *Learning and Instruction*.
- Ostrow et al. (2015). "Blocking vs. Interleaving: Examining Single-Session Effects." *AIED 2015*.
- Van der Haar et al. (2023). "Long-term distributional impacts of interleaving in Nigeria." *EdWorkingPapers*.

**Key Findings:**
1. Interleaving benefits depend on learner competence after practice
2. Benefits strongest when categories are superficially similar (confusable)
3. In Nigeria study: short-term benefits (+0.29 SD) but mixed long-term results
4. Some interleaving > no interleaving, but optimal ratio unclear

**System Implications:**
- [x] Mixed Practice (M-RET-004) correctly focuses on confusable topics
- [ ] Consider adding prerequisite: "use for topics already encoded, not first exposure"
- [ ] Track interleaving ratio in session logging for future analysis

**Next Steps:**
- Add boundary condition note to M-RET-004.yaml
- Research optimal interleaving ratio

---

## Completed Research

### [2026-02-09] PPFW Stack Comprehensive Review

**Tier:** All
**Status:** Integrated

**Question:** Full research synthesis for PPFW abstraction ladder

**Outcome:** Updated `docs/root/VISION_PPFW.md` to version 2.0 with:
- 5 Paradigm concepts with citations
- 6 Principles with effect sizes
- 6 Frameworks with PEIRRO mappings
- 5 Workflows with system implementations
- Complete method block reference table
- Research gap analysis

---

### [2026-02-10] Dr. Justin Sung & PERRIO System

**Tier:** Framework
**Status:** Integrated

**Question:** What is Dr. Justin Sung's PERRIO learning system and how does it compare to PEIRRO?

**Sources Reviewed:**
- Sung, J. (2024). "7 Years of Building a Learning System in 12 minutes." YouTube.
- iCanStudy. (2024). "How our programs work." [icanstudy.com](https://www.icanstudy.com/)
- Korai, S. (2025). "How I'm Using the PERRIO System." Medium.

**Key Findings:**
1. **PERRIO** = Priming, Encoding, Reference, Retrieval, Interleaving, Overlearning
2. Dr. Sung is a former MD turned learning coach; 10,000+ students across 120+ countries
3. System developed over 312 weeks with 60%+ efficiency gains
4. Strong emphasis on priming and reference systems (notes/revision structure)
5. HUDLE™ framework: Helping, Understanding, Developing, Learning, Extending

**System Implications:**
- [x] PEIRRO already maps 1:1 to PERRIO (just different naming)
- [x] Current implementation includes all PERRIO phases
- [x] Reference systems exist (Session Ledger, Anki cards)
- [ ] Could strengthen "Reference" as explicit phase (currently implicit)

**Next Steps:**
- Added "Practitioner Spotlight" section to VISION_PPFW.md
- Documented PERRIO → PEIRRO mapping for cross-reference

---

### [2026-02-10] Jim Kwik & Kwik Learning Framework

**Tier:** Framework + Workflow
**Status:** Integrated

**Question:** What are Jim Kwik's core learning methods and how do they integrate?

**Sources Reviewed:**
- Kwik, J. (2020). *Limitless: Upgrade Your Brain, Learn Anything Faster*. Hay House.
- Kwik, J. (2017-2025). "Kwik Brain" podcast (400+ episodes).
- Kwik Brain. (2024). "The FASTER method for learning." [jimkwik.com](https://www.jimkwik.com/)

**Key Findings:**
1. **FAST Method:** Forget, Active, State, Teach
2. **3 M's Model:** Mindset, Motivation, Methods
3. **Memory Techniques:** Memory Palace, PIE, SEE, Chain Linking
4. **Speed Reading:** Visual pacing, reduce subvocalization, 300%+ speed increase
5. Jim Kwik was "the boy with the broken brain" — childhood injury led to learning obsession

**System Implications:**
- [x] FAST maps well to PEIRRO (F=Prime, A=Encode, S=Prepare, T=Interrogate)
- [x] Teaching emphasis aligns with Feynman Technique in system
- [x] Memory palace concept similar to Concept Map method
- [ ] Could add explicit "State Check" to M1 Entry
- [ ] Consider adding visual pacing technique for reading

**Next Steps:**
- Added "Practitioner Spotlight" section to VISION_PPFW.md
- Created comparison table: PEIRRO vs. PERRIO vs. FAST
- Documented Kwik memory techniques as optional enhancements

---

## Research Backlog (Prioritized)

### High Priority
| Topic | Tier | Question | Target File |
|-------|------|----------|-------------|
| Procedure Engine | Framework | How to teach physical skills (goniometry)? | New engine spec |
| Case-Based Reasoning | Framework | Optimize clinical case learning? | M-INT-005.yaml |
| Generation Effect | Principle | Optimal generation prompts? | M-ENC-002.yaml |

### Medium Priority
| Topic | Tier | Question | Target File |
|-------|------|----------|-------------|
| Debate Engine | Framework | Dialectical learning for clinical defense? | New engine spec |
| Transfer & Generalization | Principle | How to maximize far transfer? | M-INT-001.yaml |
| Math/Physics Engine | Framework | Problem-solving for Biomechanics? | New engine spec |

### Low Priority
| Topic | Tier | Question | Target File |
|-------|------|----------|-------------|
| Rhizomatic Learning | Paradigm | Non-hierarchical topic navigation? | 03-frameworks.md |
| Expertise Reversal | Paradigm | Automatic mode switching? | 06-modes.md |

---

## Citation Quick Reference

### Paradigms
- Sweller, J. (2011). *Cognitive Load Theory*. Springer.
- Vygotsky, L. (1978). *Mind in Society*. Harvard University Press.
- Flavell, J. (1979). "Metacognition and cognitive monitoring." *American Psychologist*.
- Bjork, R. A., & Bjork, E. L. (2020). "Desirable difficulties in theory and practice." *JARMAC*.

### Principles
- Roediger, H. L., & Karpicke, J. D. (2006). "Test-enhanced learning." *Psychological Science*.
- Cepeda, N. J., et al. (2006). "Distributed practice in verbal recall tasks." *Psychological Bulletin*.
- Dunlosky, J., et al. (2013). "Improving students' learning with effective learning techniques." *Psychological Science in the Public Interest*.
- Chi, M. T. H., et al. (1994). "Eliciting self-explanations improves understanding." *Cognitive Science*.
- Mayer, R. E. (2001). *Multimedia Learning*. Cambridge University Press.

### Frameworks
- Anderson, L. W., & Krathwohl, D. R. (2001). *A Taxonomy for Learning, Teaching, and Assessing*. Longman.
- Collins, A., Brown, J. S., & Newman, S. E. (1989). "Cognitive apprenticeship." In *Knowing, Learning, and Instruction*.
- Adler, M. J., & Van Doren, C. (1972). *How to Read a Book*. Simon & Schuster.

### Workflows
- Feynman, R. P. (technique attributed, no formal publication)
- Paul, R., & Elder, L. (2006). *Critical Thinking*. Foundation for Critical Thinking.
- Pauk, W. (1962). *How to Study in College*. Houghton Mifflin.

---

*Last updated: 2026-02-09*
