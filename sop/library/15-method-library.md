# 15 — Composable Method Library

## §1 Purpose

The Composable Method Library provides reusable, evidence-backed method blocks and pre-built chains for study sessions. Method blocks are atomic study activities (e.g., brain dump, teach-back, retrieval drill). Chains are ordered sequences of blocks designed for specific contexts (e.g., first exposure, exam prep, low energy).

**Goals:**
- **Consistency** — Apply proven methods across sessions
- **Adaptability** — Select chains based on context (class type, stage, energy, time)
- **Evidence** — Every block cites research backing its effectiveness
- **Data** — Rate effectiveness to improve recommendations over time

---

## §2 Method Block Schema

Each method block represents a single study activity.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Block name (e.g., "Brain Dump", "Teach-Back") |
| `control_stage` | enum | One of 7 Control Plane stages (see below) |
| `description` | string | What the block does |
| `duration` | number | Typical minutes required |
| `energy_cost` | enum | `low` / `medium` / `high` |
| `best_stage` | enum | `first_exposure` / `review` / `exam_prep` / `consolidation` |
| `tags` | array | Descriptors (e.g., `["retrieval", "active"]`) |
| `evidence` | string | Research citation (Author, Year; brief finding) |

**Categories (Control Plane stages):**

1. **PRIME** — Prepare attention and build structure from the source before detail (e.g., brain dump, overarching pre-question set, prior knowledge scan, hierarchical advance organizer, skeleton concept hierarchy, structural skimming + pillar mapping, pre-test, structural extraction, syntopical big-picture synthesis, learning objectives primer, ambiguity and blind-spot scan)
2. **TEACH** — Deliver first-contact explanation in bounded chunks before diagnostic probing (e.g., mechanism trace, jingle / rhyme hook, kwik lite)
3. **CALIBRATE** — Diagnostic readiness checks after PRIME or TEACH to identify weaknesses before learner production (e.g., micro precheck, full calibrate probes, full calibrate priority set, story confidence tag)
4. **ENCODE** — Attach meaning to material through active processing (e.g., kwik hook, seed-lock generation, draw-label, teach-back, why-chain, self-explanation protocol, concept map, comparison table, process flowchart, clinical decision tree, memory palace, chain linking, hand-draw map, embodied walkthrough, seed-lock generation, teach-back, draw-label, hand-draw map, why-chain, self-explanation protocol, mechanism trace, embodied walkthrough, palpation anchor, kwik hook, kwik lite, jingle / rhyme hook, memory palace, chain linking, concept map, comparison table, process flowchart, clinical decision tree)
5. **REFERENCE** — Generate target cues and cheat sheets for retrieval (e.g., error autopsy, mastery loop)
6. **RETRIEVE** — Test recall with adversarial near-miss and timed sprints (e.g., timed brain dump, sprint quiz, fill-in-blank, mixed practice, variable retrieval, adversarial drill, timed sprint sets)
7. **OVERLEARN** — Close loop, capture artifacts, Anki, drill sheets (e.g., exit ticket, anki card draft, drill sheet builder, post-learn brain dump)

**Evidence citation format:** `Author (Year); brief finding`

---

## §2.1 Block Catalog (81 blocks)

### PRIME (11 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Brain Dump | 3 min | low | Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b); Brain Dump is best supported as a short prior-knowledge activation and organization move that prepares the learner for deeper instruction without turning the opening into a quiz. Reviews on prior knowledge and newer syntheses on activation show that what learners already know strongly shapes comprehension and later learning, and that activation works best when the relevant knowledge is surfaced and tied to the current goal rather than left dormant or allowed to stay diffuse. Experimental and educational studies on reactivation and preparatory designs reinforce the same practical point: even partial activation of relevant prior knowledge can prepare learners for subsequent instruction, but the activation has to be relevant enough to serve as an anchor and not so evaluative that it becomes a disguised test. The practical implication for this method is to keep the free write brief, extract only top-level anchor nodes, mark obvious missing nodes non-judgmentally, and route the next study move from the gap pattern rather than from correctness scoring. |
| Overarching Pre-Question Set | 3 min | low | Carpenter and Toftness (2017); Pressley, Wood, Woloshyn, Martin, King, and Menke (1990); Pan and Sana (2024); Chan, Lee, and Jia (2024); Hattan, Alexander, and Lupo (2024); Overarching Pre-Question Set is best supported as a broad prequestioning and prior-knowledge activation move that helps learners approach upcoming material with better-organized attention, especially when the questions stay conceptual rather than turning into miniature quizzes. The prequestion literature shows that asking questions before instruction can improve learning under some conditions by focusing attention and prompting explanatory search, but the same literature also shows clear limits: benefits depend on question type, lesson structure, and how well the prompt supports structure building rather than isolated answer hunting. Recent reviews and classroom studies reinforce that prequestions work better when they highlight important relationships, main ideas, or broad conceptual targets instead of narrow facts, and when unresolved questions are carried into later learning rather than scored immediately. The practical implication for this method is to keep the set small, broad, and whole-scope, rank the highest-leverage prompts, and treat unresolved questions as routing cues for the next study move rather than as test failures. |
| Prior Knowledge Scan | 3 min | low | Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b); Prior Knowledge Scan is best supported as a schema-activation and connection-mapping move that prepares learners to interpret new material by linking it to related concepts they already know. Reviews on prior knowledge and newer syntheses on activation show that learning improves when relevant existing knowledge is brought into play and organized around the current goal rather than left implicit. Reactivation and preparatory learning studies reinforce that even partial but relevant activation can prepare later learning, especially when the learner can identify which existing schema is strongest and where the prerequisite links are weak. The practical implication for this method is to keep the scan brief, map only a few high-value related concepts, label the type of relationship, choose one primary anchoring schema, and flag weak prerequisites for follow-up instead of correcting the map as if it were a graded concept test. |
| Hierarchical Advance Organizer | 5 min | low | Ausubel (1960); Luiten, Ames, and Ackerson (1980); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024); Hierarchical Advance Organizer is best supported as a structure-first orientation method that gives learners a small, high-level frame before detail work, not as a full explanation or quiz. Ausubel's original organizer study and the later meta-analysis by Luiten and colleagues support the basic value of advance organizers for learning and retention. Later text-structure meta-analytic work and classroom interventions extend that logic by showing that explicit attention to structure, main ideas, and organizing relations can improve comprehension, summarization, and writing when the structure is made visible and practiced. The practical implication for this method is to keep the organizer compact, coverage-first, and hierarchical: one parent concept, 3-5 umbrella pillars, one representative branch per pillar, and a short carry-forward gap list rather than a detail-heavy outline. |
| Skeleton Concept Hierarchy | 5 min | medium | Novak and Gowin (1984); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Izci and Acikgoz Akkoc (2024); Hsu and Lopez Ricoy (2025); Skeleton Concept Hierarchy is best supported as a minimal concept-mapping and structure-framing move that helps learners organize a dense topic into a few visible categories before explanation starts. Novak and Gowin's concept mapping work frames the value of explicit schematic structures for focusing attention on the small number of key ideas that matter. Text-structure meta-analytic work and later classroom studies reinforce that visible structure and stripped-down organizational cues can improve comprehension, summarization, and later integration when learners are not overloaded with full prose explanations. The practical implication for this method is to keep the hierarchy skeletal: one core topic node, 4-6 umbrella categories, 1-2 descriptor tokens under each category, and only short cross-links where the structure would otherwise become misleading. |
| Structural Skimming + Pillar Mapping | 5 min | medium | Ausubel (1960); Luiten, Ames, and Ackerson (1980); Voros, Rouet, and Pleh (2011); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024); Structural Skimming + Pillar Mapping is best supported as a quick orientation move that exposes the visible structure of a source before deep reading, not as a paragraph-summary method. Classic advance-organizer work supports the value of pre-exposure to high-level structure, while later studies on content organizers and text-structure instruction show that learners navigate and comprehend dense material more effectively when headings, structural cues, and overarching buckets are made explicit. The practical implication for this method is to skim only structural signals, inventory the whole slice, compress that inventory into 3-5 broad pillars, and render the result as a structural map rather than a prose recap. |
| Pre-Test | 4 min | low | Richland, Kornell, and Kao (2009); Glass, Brill, and Ingate (2008); Little and Bjork (2016); Pan and Carpenter (2024); Mera, Dianova, and Marin-Garcia (2025); Pre-Test is best supported as a low-stakes pretesting and prediction move that creates encoding hooks before study, not as an early grading event. Foundational pretesting studies showed that attempting answers before study can improve later learning even when many initial responses are wrong, and classroom work suggests the same pattern can transfer to educational settings when the pretest stays brief and is followed by later exposure to the correct information. More recent review and robustness work shows the effect depends on timing, question format, and what is later studied, which means the method should stay short, require real guesses, capture confidence, and delay answer checking rather than collapsing into immediate correction. |
| Structural Extraction | 5 min | medium | Ausubel (1968); van Kesteren, Krabbendam, and Meeter (2018); Hattan, Alexander, and Lupo (2024); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Mehring and Kraft (2024); Structural Extraction is best supported as a selective-attention and structure-framing move that identifies a small number of high-signal nodes before deeper study, not as a prose summary or quiz. Work on prior knowledge, advance organization, and preparatory instruction supports bringing a bounded structure into view before details accumulate, while later text-structure research reinforces the value of keeping the extracted scaffold brief and explicit. The practical implication for this method is to resolve the objective frame first, keep only nodes that matter for those objectives, remove unlinked trivia, and mark weak nodes as orientation cues for later study rather than as graded failures. |
| Syntopical Big-Picture Synthesis | 6 min | low | Alexander and List (2017); Yukhymenko-Lescroart, Goldman, Lawless, Pellegrino, and Shanahan (2022); Espinas and Wanzek (2024); Schallert, List, and Alexander (2025); Syntopical Big-Picture Synthesis is best supported as a multiple-text orientation move that helps learners build a top-level integrated structure across a small number of sources before they dive into details. Research on multiple-text comprehension emphasizes that integration across documents depends on identifying shared ideas, preserving source-specific differences, and making intertextual links explicit rather than simply summarizing each source in isolation. The practical implication for this method is to keep the synthesis bounded to 2-3 sources, extract pillars only, merge overlaps into one unified tree, and flag unresolved conflicts for later study instead of forcing premature resolution. |
| Learning Objectives Primer | 5 min | medium | Biggs (1996); Tong and Chin (2020); Jung, Kim, Yoon, Park, and Oakley (2018); Tobiason (2022); Mehring and Kraft (2024); Learning Objectives Primer is best supported as an alignment and attention- focusing move that gives the learner a clear study-target frame before detailed work begins, not as hidden teaching. Constructive-alignment research argues that clearly specified outcomes help coordinate materials, activities, and assessment, while later work on student learning objectives, course structure, and lesson-level alignment suggests that learners benefit when targets are explicit, coherent, and visibly tied to the actual course materials. The practical implication for this method is to account for every provided file first, preserve candidate objectives at file level, and merge only the signals that remain source-grounded after comparison. |
| Ambiguity and Blind-Spot Scan | 4 min | medium | Hattan, Alexander, and Lupo (2024); Qian and Lehman (2019); Pieschl, Budd, Thomm, and Archer (2021); Craig, Wilcox, Makarenko, and MacMaster (2021); Ambiguity and Blind-Spot Scan is best supported as an attention-guidance and misconception-sensitive planning move that surfaces where later teaching should slow down, not as a learner diagnosis. Work on preparatory instruction and misconception research suggests that later learning improves when likely trouble spots are identified early and when misconceptions are treated as specific targets for later repair rather than as vague learner deficits. The practical implication for this method is to stay source-grounded, select only 2-4 high-yield ambiguities or traps, and convert them into clean TEACH-facing handoff targets instead of resolving them inside PRIME. |

### TEACH (3 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Mechanism Trace | 10 min | high | Kulasegaram et al. (2013); Causal reasoning with biomedical mechanisms supports diagnostic transfer to novel cases |
| Jingle / Rhyme Hook | 3 min | low | Paivio (1991); Verbal plus image-linked hooks can improve retention when grounded in meaning |
| KWIK Lite | 2 min | low | Paivio (1991); Lightweight verbal-plus-image hooks can improve retention when they are grounded in already-understood meaning. |

### CALIBRATE (4 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Micro Precheck | 4 min | medium | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Soderstrom and Bjork (2023); Amos and Yao (2024); Pan, Wang, and Zhu (2024); Micro Precheck is best supported as a short formative diagnostic that gathers usable evidence before instruction, not as a disguised mini-lesson. Black and Wiliam's foundational review supports brief classroom assessments that surface current understanding so teaching can be adjusted in real time. Hattie and Timperley plus the later feedback meta-analysis show that the value of a check depends on whether it yields actionable information about the gap between current and desired performance, rather than vague praise or extra exposition. Recent classroom pretesting work shows that short low-stakes pretests at the start of lectures can improve later learning and help students notice what to study, while recent classroom and meta-analytic formative-assessment studies support concise questioning and other brief checks when they produce interpretable readiness signals that can guide the next instructional move. |
| Full Calibrate Probes | 6 min | medium | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Amos and Yao (2024); Pan, Wang, and Zhu (2024); Ebrahim, Antink, Andargie, and Barke (2024); Full Calibrate Probes is best supported as a fuller diagnostic block that produces interpretable routing evidence after an initial teaching pass, not as a second teaching block. Black and Wiliam's foundational review supports classroom assessment moves that surface current understanding so later instruction can be adjusted on the basis of evidence rather than impressions. Hattie and Timperley plus the later feedback meta-analysis support probe designs that yield actionable gap information, especially when the result is used to identify what is secure, what is risky, and what should happen next. More recent classroom and meta-analytic studies support brief but structured questioning, formative probe sets, and other classroom checks when they create usable readiness signals rather than generic participation data. The practical implication for this method is to keep the probes scoped, score confidence before feedback, and use the resulting miscalibration patterns to route the learner rather than reteach mid-block. |
| Full Calibrate Priority Set | 3 min | low | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Clark, Kobrin, Karvonen, and Hirt (2023); Pan, Wang, and Zhu (2024); Bez, Burkart, Tomasik, and Merk (2025); Full Calibrate Priority Set is best supported as a diagnostic-routing method that converts assessment evidence into a small actionable next-step set, not as a reteaching block. Black and Wiliam's foundational review supports using classroom assessment evidence to adjust subsequent instruction rather than relying on intuition. Hattie and Timperley, reinforced by the later feedback meta-analysis, support feedback and diagnostic summaries that reduce the gap between current and desired performance by making the next move explicit and actionable. More recent classroom studies show the same practical constraint from another angle: diagnostic score reports, strategic questioning, and formative-assessment dashboards are only useful when teachers can interpret the signal, identify the most important errors, and translate them into concrete instructional implications. The practical implication for this method is to rank only a few weaknesses, keep the scoring deterministic, and hand off concise ENCODE recommendations instead of an undifferentiated list of problems. |
| Story Confidence Tag | 2 min | low | Metcalfe (2017); Rhodes (2019); Confidence judgments in real classroom settings (2011); Cho (2024); Story Confidence Tag is best supported as a light-touch metacognitive monitoring move that collects a global confidence judgment and then asks where the learner's narrative thread breaks. Metacognition research shows that confidence judgments can guide study decisions, but classroom and concept-calibration work also shows that global confidence is often imperfect unless it is tied to a concrete task or breakdown point. The practical implication for this method is to keep the confidence tag simple, ask for the actual story-break location rather than a vague feeling, and use the fuzzy zones to route the learner toward encoding or fuller calibration rather than treating the rating itself as mastery evidence. |

### ENCODE (32 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| KWIK Hook | 3 min | medium | Paivio (1991); Dual-coding theory — combining verbal + visual improves retention by creating multiple retrieval paths |
| Seed-Lock Generation | 3 min | medium | Slamecka & Graf (1978); Generation effect — self-generated items are remembered significantly better than items simply read |
| Draw-Label | 10 min | high | Wammes et al. (2016); Drawing effect — drawing produces superior memory compared to writing, especially for visual-spatial content |
| Teach-Back | 5 min | high | Nestojko et al. (2014); Expecting to teach enhances encoding and organization of information |
| Why-Chain | 5 min | medium | Dunlosky et al. (2013); Elaborative interrogation rated moderate utility for learning; builds causal understanding |
| Self-Explanation Protocol | 7 min | medium | Chi et al. (1994); Self-explanation rated moderate-high utility across domains; works by generating inferences |
| Concept Map | 10 min | high | Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding |
| Comparison Table | 7 min | medium | Alfieri et al. (2013); Comparison improves discrimination and concept formation by highlighting distinctive features |
| Process Flowchart | 10 min | high | Winn (1991); Spatial-sequential diagrams improve procedural understanding and memory |
| Clinical Decision Tree | 10 min | high | Charlin et al. (2000); Decision trees scaffold clinical reasoning and support diagnostic accuracy |
| Memory Palace | 10 min | high | Dresler et al. (2017); fMRI study showed memory athletes using Method of Loci exhibit distinct patterns of functional brain connectivity; 40 days of loci training significantly improved recall in naive subjects |
| Chain Linking | 8 min | medium | Bower & Winzenz (1970); Narrative chaining improves serial recall by creating meaningful connections between unrelated items |
| Hand-Draw Map | 5 min | medium | Wammes et al. (2016); Drawing effect — drawing doubles free-recall rates (45% vs 20%) through multimodal encoding combining motor, visual, and semantic processing |
| Embodied Walkthrough | 6 min | medium | Kontra et al. (2015); Physical enactment and gesture-grounded learning improve later conceptual understanding compared with passive observation alone. |
| Seed-Lock Generation | 3 min | medium | Slamecka and Graf (1978); Bertsch, Pesta, Wiscott, and McDaniel (2007); McCurdy, Viechtbauer, Sklenar, Frankenstein, and Leshikar (2020); Tullis and Finley (2018); Tullis and Fraundorf (2022); Mocko, Wagler, and Lesser (2024); Seed-Lock Generation is best supported as a bounded self-generation method that uses the generation effect and the learner's own cue-selection advantage to make later recall more likely than simple reading or tutor-provided phrasing alone. Foundational and meta-analytic generation-effect work shows that producing information rather than reading it tends to improve memory, but later reviews also show that the benefit depends on task constraint and on whether the generation task fits the material. Research on self-generated memory cues suggests that learner-made cues often outperform other-provided cues because learners choose distinctive prompts that fit their own memory needs. Recent classroom work on mnemonic use also shows an important limit: remembering a mnemonic is not the same as understanding the concept, so the cue must stay tied to the source definition and not become a substitute for meaning. The practical implication for this method is to force a real learner-made seed first, keep the target bounded, require a short explanation of why the cue fits, and allow tutor assistance only after a genuine attempt has been captured. |
| Teach-Back | 5 min | high | Roscoe and Chi (2007); Roscoe and Chi (2008); Nestojko, Bui, Kornell, and Bjork (2014); Fiorella and Mayer (2014); Wang, Huang, Zhang, Zhu, and Leng (2024); Cheng (2025); Teach-Back is best supported as a learning-by-teaching and self-explanation method that improves learning when the learner has to organize, explain, and then interrogate their own explanation rather than merely restudy. Tutor-learning and learning-by-teaching research suggests that the benefit of teaching comes from reflective knowledge-building, elaboration, and self-monitoring, not from knowledge-telling alone. Preparing to teach can improve organization and immediate comprehension, while actually explaining to others can add delayed learning benefits. More recent prompt-based learning-by-teaching studies also suggest that keyword or learner-generated prompts can improve retention and transfer when they deepen the explanation instead of replacing it. The practical implication for this method is to force a plain-language explanation first, use why and how follow-ups to expose shallow understanding, record the exact breakdowns, and limit review to those failure points instead of defaulting to a full re-read. |
| Draw-Label | 10 min | high | Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wammes, Meade, and Fernandes (2018); Wang, Yang, and Kyle Jr. (2023); Xie and Deng (2023); Dechamps, Leopold, and Leutner (2025); Draw-Label is best supported as a learner-generated drawing method that improves learning when students must reconstruct and label a structure themselves, then inspect the drawing for missing or inaccurate elements. The classic learner-generated-drawing review and the drawing-effect experiments support drawing as more than decoration: it can strengthen memory by forcing selection, organization, elaboration, and multimodal encoding. Recent classroom studies show that drawing can improve delayed learning and motivation relative to simple rereading, but also show an important boundary condition: drawing does not help automatically unless it is tied to meaningful reconstruction or retrieval rather than shallow copying. The latest drawing-to-learn meta-analytic work sharpens the practical implication for this method: use memory-first sketching, make omissions visible, and support the learner in integrating the repaired labels back into a coherent structure instead of treating drawing as an art task. |
| Hand-Draw Map | 5 min | medium | Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wang, Yang, and Kyle Jr. (2023); Van der Weel and Van der Meer (2024); Anastasiou, Wirngo, and Bagos (2024); Hsu and López Ricoy (2025); Hand-Draw Map is best supported as a fast learner-generated visual-organization method that compresses a broad structure into spatially distinct, self-produced cues. The strongest evidence comes from adjacent literatures rather than from decorative "mind map" claims alone: learner-generated drawing and drawing-effect research show that drawing can improve memory when it forces the learner to select, organize, and elaborate content; concept-mapping reviews and recent meta-analytic work show that student-constructed visual organizers can improve understanding and retention when they preserve structural relationships instead of becoming copied notes; and recent classroom work suggests that the benefit depends on guidance, learner construction, and keeping the representation manageable. The practical implication for this method is to keep the map brief, use own-word umbrella branches plus simple icons, rely on spatial placement as an anchor, and finish with an explicit spatial recall check rather than treating the map as a pretty page of notes. |
| Why-Chain | 5 min | medium | Pressley, McDaniel, Turnure, Wood, and Ahmad (1987); Pressley, Symons, McDaniel, Snyder, and Turnure (1988); O'Reilly, Symons, and MacLatchy-Gaudet (1998); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Novak, Bailey, Blinsky, Soffe, Patterson, Ockey, and Jensen (2022); Jáñez, Parra-Domínguez, Gajate Bajo, and Guzmán-Ordaz (2025); Why-Chain is best supported as an elaborative-interrogation method that improves learning when learners must generate explanatory answers to why-prompts instead of rereading or paraphrasing facts. The classic elaborative-interrogation studies show that asking why can improve learning of confusing or factual material when each answer adds new information, and comparison work suggests that the benefit depends on explanation quality rather than on the prompt alone. Dunlosky's review supports elaborative interrogation as a moderate-utility strategy with clear boundary conditions, and recent classroom work sharpens those conditions further: active why-questioning can work in live or virtual settings, but recent implementation research shows that self-generated interrogation helps only when the prompts are used well and can even hurt when learners produce weak or inappropriate explanations. The practical implication for this method is to force each answer into a new statement, reject circular links, require at least 3 levels unless bedrock is explicit, and verify the finished chain against the source instead of trusting fluent-sounding explanations. |
| Self-Explanation Protocol | 7 min | medium | Chi, De Leeuw, Chiu, and LaVancher (1994); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Bisra, Liu, Nesbit, Salimi, and Winne (2018); Ryan and Koppenhofer (2024); Zhang and Fiorella (2024); Beege and Ploetzner (2025); Self-Explanation Protocol is best supported as a unit-by-unit inference-building method that works when learners must explain how new information connects to what came before rather than simply restating the text. The classic self-explanation work and later meta-analysis support prompting learners to generate inferences and explanatory links, but both the broader strategy review and newer studies show important boundary conditions: self-explanation is not automatically beneficial, its effects depend on prompt quality and learner engagement, and gains are strongest when learners actually generate explanatory inferences rather than shallow paraphrases. Recent studies on prompted self-explanations in statistics, error correction, and interactive video reinforce the same practical lesson from different angles: explanation quality and scaffolding matter, and prompts can fail or even add cost when learners only go through the motions. The practical implication for this method is to process one unit at a time, force local why-links and next-step predictions, log inference gaps explicitly, and treat verbalization mode as a way to expose reasoning quality rather than as an end in itself. |
| Mechanism Trace | 10 min | high | Kulasegaram, Martimianakis, Mylopoulos, Whitehead, and Woods (2013); Kulasegaram, Manzone, Ku, Skye, Wadey, and Woods (2015); Lisk, Agur, and Woods (2016); Woods, Neville, Levinson, Howey, Oczkowski, and Norman (2006); Woods, Brooks, and Norman (2007); Chamberland and Mamede (2015); Mechanism Trace is best supported as a novice-oriented causal self-explanation scaffold for mechanism-dense content, especially in biomedical contexts where explicit cause-and-effect links matter for transfer. The strongest support is not for a decorative flowchart but for making basic-science or mechanism links explicit: studies of cognitive integration and biomedical reasoning show that learners perform better on delayed or more difficult transfer tasks when they build explicit causal links instead of memorizing feature lists or relying on proximity alone. The review literature also adds a boundary condition: mechanism tracing is most useful when the learner still needs to build coherent causal structure, and it is less central once knowledge becomes more encapsulated. The practical implication for this method is to trace one bounded mechanism from trigger to outcome, require specific because-links, verify every arrow against the source, and mark real branch points instead of forcing a false linear story. |
| Embodied Walkthrough | 6 min | medium | Kontra, Lyons, Fischer, and Beilock (2015); Alibali and Nathan (2012); Schmidt, Benzing, Wallman-Jones, Mavilidi, Lubans, and Paas (2019); Novack and Goldin-Meadow (2024); Kwon, Brush, Kim, and Seo (2025); Gómez Franco, Badilla-Quintana, Walker, Restrepo, and Glenberg (2025); Embodied Walkthrough is best supported as a meaning-congruent gesture or movement method that helps learners encode sequences and spatial relations when the motion is explicitly tied to the concept and translated back into language or diagrams. The classic embodied-science and gesture literature supports the idea that physical experience and representational gesture can deepen understanding of abstract material, but both review work and newer classroom studies point to an important boundary condition: movement helps when it is task-relevant and concept-mapped, not when it is random activity or performance coaching. Recent classroom and mixed-reality studies reinforce the same practical lesson in different settings by showing benefits for comprehension, vocabulary, and transfer when students map concepts onto bodily movement and then reuse that mapping during later problem solving. The practical implication for this method is to keep the run small, make each gesture stand for one real landmark, freeze at transitions, and always finish with a verbal or sketched map-back so the body cue does not replace the concept. |
| Palpation Anchor | 3 min | medium | Lederman and Klatzky (1987); Alibali and Nathan (2012); Rabattu, Debarnot, and Hoyek (2023); Walrod, Boucher, Conroy, McCamey, Hartz, Way, Jonesco, Albrechta, Bockbrader, and Bahner (2019); Koch, Gassner, Gerlach, Festl-Wietek, Hirt, Joos, and Shiozawa (2025); Liu, Zuo, Zhao, and Lu (2025); Palpation Anchor is best supported as a constrained surface-landmark method that uses active touch to stabilize anatomical recall and orient the learner toward a clinically usable location cue. Foundational haptic-exploration and embodiment work supports the idea that hand movements and touch are not just outputs but structured ways of taking in information, and newer anatomy and medical-education studies show that movement-based anatomy learning, repeated palpation practice, and integrated landmark-focused examination teaching can improve later identification and performance. At the same time, the classroom and training evidence also points to clear limits: the benefit depends on a real, task-relevant landmark, enough practice to make the cue stable, and safe tactile interaction rather than vague body awareness or unsafe deep pressure. The practical implication for this method is to use it only when a reliable surface landmark exists, require actual light self-palpation, record what was felt, and tie the landmark to one concrete clinical use so the anchor stays anatomically honest. |
| KWIK Hook | 3 min | medium | Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024); KWIK Hook is best supported as a keyword-style mnemonic method that works when the learner builds an explicit sound cue, meaning image, and linking scene rather than memorizing a tutor-authored slogan. Mnemonic reviews and keyword-method research support interactive verbal-plus-image hooks for bounded recall targets, and newer classroom work shows that mnemonic gains are strongest when the learner actually generates or meaningfully personalizes the cue. The practical implication for this method is to force a learner attempt first, keep the target concept stable before hooking it, tie the sound cue back to the true meaning, and lock the final hook with a short distortion guard so the mnemonic does not replace the concept itself. |
| KWIK Lite | 1 min | low | Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024); KWIK Lite is best supported as a constrained mnemonic shortcut for already-stable meaning, not as a replacement for the full hook-building workflow. Keyword-method and mnemonic reviews support brief verbal-plus-image hooks for bounded recall targets, but the same literature also shows that weak or externally imposed cues can distort meaning or fail to stick. The practical implication for this lite method is to seed only one lightweight cue, require one learner ownership move, keep a visible distortion guard, and escalate quickly when the hook does not stabilize within the time cap. |
| Jingle / Rhyme Hook | 3 min | low | Wallace (1994); Rainey and Larsen (2002); Ludke, Ferreira, and Overy (2014); Jingle / Rhyme Hook is best supported as a melody-and-rhythm mnemonic for ordered verbal material when the pattern is short, repeated, and explicitly mapped back to the target sequence. Research on sung or melodic text recall shows that melody can improve verbatim or ordered recall when the tune is simple enough to be learned and reused, while later language-learning work shows that singing or rhythmic repetition can outperform plain speech on some recall tasks. The practical implication for this method is to keep the cadence compact, require a learner attempt first, map every phrase fragment back to a real item, and check for hook interference before locking the final jingle. |
| Memory Palace | 10 min | high | Bellezza (1981); Dresler et al. (2017); Gross, Rebok, Unverzagt, Willis, and Brandt (2014); Wagner et al. (2021); Memory Palace is best supported as a method-of-loci strategy for ordered recall when the learner uses a fixed familiar route and one vivid image per locus. Mnemonic reviews identify loci as especially well suited to serial-order learning, and modern training studies show that method-of-loci practice can produce large recall gains and more durable memory in ordinary learners, not just memory athletes. The practical implication for this method is to keep the route stable, limit the number of loci, place one strong image at each stop, and finish with an explicit walk-through that exposes weak links before the sequence is trusted. |
| Chain Linking | 8 min | medium | Bower and Clark (1969); Santa, Ruskin, and Yio (1973); Hill, Allen, and Gregory (1991); Chong, Proctor, Li, and Blocki (2019); Chain Linking is best supported as a narrative-chaining mnemonic for serial material when each item is explicitly bound to the next through a concrete interaction. Classic serial-learning studies show that story-based mediation improves recall over ordinary rehearsal, and later work suggests that story mnemonics continue to help when the links are vivid enough to sustain ordered retrieval. More recent applied work reinforces the same point: story mnemonics help because they create a connected retrieval path, but weak or generic links break the chain quickly. The practical implication for this method is to keep the sequence visible, force one strong interaction per pair, walk the whole story after construction, and log exactly where the chain fails instead of treating the narrative as self-validating. |
| Concept Map | 10 min | high | Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding |
| Comparison Table | 7 min | medium | Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Loibl, Tillema, Rummel, and van Gog (2020); Blair, Banes, and Martin (2024); Comparison Table is best supported as a guided comparison method that helps learners discriminate confusable alternatives by aligning the same dimensions across cases. Comparison research shows that side-by-side alignment helps learners notice deep features, form better categories, and transfer distinctions more reliably than studying examples in isolation. More recent instructional work adds the practical boundary condition: the table only helps when the dimensions are meaningful and the learner must actively fill them rather than passively read a completed chart. The practical implication for this method is to force a memory-first fill, highlight the real discriminators, and end with short if-then rules that can be reused during later retrieval. |
| Process Flowchart | 10 min | high | Winn (1991); How the design and complexity of concept maps influence cognitive learning processes (2022); How can procedural flowcharts support the development of mathematics problem-solving skills? (2024); Hsu and Lopez Ricoy (2025); Process Flowchart is best supported as a visual-organization method for procedural or mechanism-heavy material when sequence, decision points, and loops are made explicit. Visual-organization research shows that learners benefit when the structure of the representation makes relationships and paths salient rather than forcing them to infer order from dense prose. More recent work on concept-map design and learner-built procedural flowcharts shows that structure only helps when the diagram stays readable, preserves the true relations, and is actively constructed or repaired by the learner. The practical implication for this method is to keep the flow linear where possible, mark decisions and loops explicitly, and verify the diagram against the source before treating it as a stable study artifact. |
| Clinical Decision Tree | 10 min | high | How to improve the teaching of clinical reasoning: a narrative review and a proposal (2015); Teaching clinical reasoning by making thinking visible (2014); Empirical comparison of three assessment instruments of clinical reasoning capability (2020); Clinical reasoning process with decision justification study (2024); Clinical Decision Tree is best supported as an explicit reasoning-structure artifact for novice clinical thinking, not as a substitute for full expertise. Clinical-reasoning education reviews argue that novices benefit when diagnostic reasoning is taught and represented explicitly rather than left implicit. Studies on making thinking visible and on structured clinical-reasoning programs show that externalized branches, justification points, and confirmatory checks help learners discuss and monitor their reasoning more concretely. The practical implication for this method is to branch only on meaningful discriminators, keep likely diagnoses and confirmatory tests attached to each branch, and surface red flags that bypass the normal tree so the artifact stays usable and safe. |

### REFERENCE (2 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Error Autopsy | 5 min | medium | Metcalfe (2017); Metcalfe, Xu, Vuorre, Siegler, Wiliam, and Bjork (2024); Zhang and Fiorella (2024); Clark, Kaw, and Guldiken (2023); Error Autopsy is best supported as a learn-from-errors and corrective-feedback method, not as generic mistake review. Research on learning from errors shows that errors followed by corrective feedback can improve learning when learners actively process the mismatch between their response and the correct answer instead of merely seeing the answer. More recent classroom and problem-solving studies suggest that repeated reflection and scaffolded self-explaining feedback improve how students interpret mistakes, refine their metacognition, and transfer the correction to later performance. The practical implication for this method is to preserve the original wrong answer, record the correct answer with source support, force a real root-cause analysis, and end with a concrete prevention cue that can be reused in later retrieval. |
| Mastery Loop | 10 min | medium | Rawson and Dunlosky (2011); Rawson, Dunlosky, and Sciartelli (2013); Rawson and Dunlosky (2022); Higham, Zengel, Bartlett, and Hadwin (2022); Janes, Dunlosky, Rawson, and Jasnow (2020); Mastery Loop is best supported as a successive-relearning method, not as a vague restudy cycle. Successive relearning research shows that repeated retrieval with feedback across spaced sessions produces stronger and more durable retention than restudying alone. Classroom and course-based studies also suggest that this kind of loop can improve exam performance, retention, metacognitive calibration, and even reduce anxiety when learners repeatedly re-test after short corrective study rather than relying on one long review pass. The practical implication for this method is to keep restudy brief, re-test immediately, track how many loops each item needs, and use high loop counts to identify weak anchors that should return sooner in the spacing plan. |

### RETRIEVE (7 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Timed Brain Dump | 5 min | medium | Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Timed Brain Dump is best supported as a free-recall retrieval routine whose value comes from the retrieval attempt itself, the visibility of omissions, and the compare-after feedback pass. Classic testing-effect work shows that recall attempts can outperform rereading on delayed retention, recent meta-analytic work confirms broad benefits for retrieval practice across materials and settings, and classroom reviews support retrieval as a practical way to surface what students can and cannot yet pull from memory. The practical implication for this method is to keep the first pass closed-note and time-bounded, treat gaps as usable data, and use the comparison step for repair rather than for helping during the attempt. |
| Sprint Quiz | 5 min | medium | Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Little and McDaniel (2015); Walsh and Horgan (2024); Sprint Quiz is best supported as a short, high-frequency retrieval block that samples recall quickly enough to expose both clean misses and weak anchors. Meta-analytic retrieval-practice evidence supports brief quiz-like testing for retention gains, classroom reviews support frequent low-stakes quizzing when it yields actionable follow-up, and transfer-oriented quiz research shows that the format can reveal whether knowledge is stable or merely familiar. The practical implication for this method is to keep the block short, force direct answers before feedback, and log both outright misses and hesitant correct responses so the next routing move is based on evidence rather than impressions. |
| Fill-in-Blank | 5 min | low | Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021); Fill-in-Blank is best supported as a cued-recall retrieval routine that narrows the target enough to make misses visible and repeatable. Reviews of effective learning techniques support retrieval and practice testing over passive review, recent meta-analytic work confirms broad testing benefits, and classroom retrieval-practice evidence supports structured prompt formats that expose exactly where recall breaks down. The practical implication for this method is to keep blanks atomic, require an answer before checking, and use the second pass to measure whether the cue-plus-feedback cycle actually stabilizes the target. |
| Mixed Practice | 10 min | high | Kang and Pashler (2012); Rohrer, Dedrick, Hartwig, and Cheung (2020); Brunmair and Richter (2019); Carvalho and Goldstone (2023); Mixed Practice is best supported as an interleaved retrieval routine that improves later discrimination by forcing topic switching and comparison. Foundational interleaving work and later classroom studies show that mixed sets can outperform blocked formats on delayed performance when the learner must distinguish related categories or procedures, while broader interleaving reviews show that the benefit depends on the match between the mix and the discrimination demand. The practical implication for this method is to interleave genuinely confusable topics, score both answer accuracy and topic classification, and use the confusion pattern to decide what needs more focused repair. |
| Variable Retrieval | 10 min | medium | Bjork, Dunlosky, and Kornell (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021); Uesaka and Manalo (2025); Variable Retrieval is best supported as a varied-practice retrieval routine that checks whether a concept can survive changes in prompt format. Desirable-difficulty and retrieval-practice work supports the value of effortful recall, recent meta-analytic evidence confirms broad testing benefits, and classroom retrieval studies show that changing the question form can reveal brittle knowledge that one stable prompt would miss. The practical implication for this method is to hold the concept constant while varying the retrieval demand, then rank which formats fail so the learner can repair flexibility rather than just re-memorize one phrasing. |
| Adversarial Drill | 8 min | high | Ahn and Bjork (2018); Kang and Pashler (2012); Brunmair and Richter (2019); Rohrer, Dedrick, Hartwig, and Cheung (2020); Adversarial Drill is best supported as a discrimination-heavy retrieval routine that uses confusable alternatives to sharpen category boundaries. Research on inductive discrimination and interleaving shows that near-miss contrasts can improve later classification, while classroom mixed-practice work supports exposing confusion rather than hiding it inside blocked review. The practical implication for this method is to choose genuinely confusable pairs, require the learner to state the discriminator, and log misses in a way that supports later repair instead of reteaching mid-block. |
| Timed Sprint Sets | 8 min | high | Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Mielicki and Wiley (2019); Barenberg and Dutke (2021); Timed Sprint Sets is best supported as a retrieval-practice routine that adds pacing pressure to reveal whether recall is both correct and available fast enough to be usable. Meta-analytic retrieval evidence supports repeated testing, classroom reviews support frequent short retrieval rounds, and more specific timing and fluency work suggests that response speed can separate stable access from labored recall. The practical implication for this method is to use short rounds, capture latency per item, and treat both misses and slow answers as routing signals instead of focusing on correctness alone. |

### OVERLEARN (4 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Exit Ticket | 3 min | low | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Rodriguez, le Roux, and Melville (2024); MacDermott, Mornah, and MacDermott (2024); Pai (2024); Exit Ticket is best supported as a brief formative-closure method that captures evidence of learning, uncertainty, and next-step action before a session ends. Black and Wiliam's foundational review supports frequent classroom checks that generate usable evidence for instructional adjustment, while Hattie and Timperley, reinforced by Wisniewski and colleagues, support feedback that makes the gap and the next move actionable rather than generic. Recent classroom studies on iteratively designed exit tickets, marketing-course exit tickets, and end-of-lesson formative checks used to revise statistics instruction suggest that short aligned exit tickets can improve reflective performance, engagement, and instructional adjustment when prompts are specific and the teacher actually uses the responses. The practical implication for this method is to keep the ticket short, require concrete takeaways plus muddy points plus one near-term action, and turn the closure into a reusable handoff for the next session instead of a vague recap. |
| Anki Card Draft | 5 min | low | Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Schmidmaier, Ebersbach, Schiller, Hege, Holzer, and Fischer (2011); Lin, McDaniel, and Miyatsu (2018); Pan, Zung, Imundo, Zhang, and Qiu (2023); Wothe, Wanberg, Hohle, Sakher, Bosacker, Khan, Olson, and Satin (2023); Gilbert, Frommeyer, Brittain, Stewart, Turner, Stolfi, and Parmelee (2023); Anki Card Draft is best supported as a small retrieval-heavy, spaced-review artifact for already-understood material, not as a substitute for first-pass teaching. Foundational spacing work by Cepeda and colleagues and applied guidance from Rohrer and Pashler support distributing review over time rather than cramming. Electronic flashcard studies support retesting over restudying and suggest that flashcards work best when they demand actual retrieval. Card-design studies add two important refinements: learner-generated flashcards outperform premade ones on delayed tests, and conceptual or less detail-saturated flashcards can outperform overly specific cards for some learners and materials. Recent curriculum-based studies of Anki use in medical education show positive but not universal associations with performance, which supports Anki as a strong optional review tool rather than a guaranteed advantage. The practical implication for this method is to draft a small number of source-grounded cards, keep each card clean and atomic enough for stable recall, favor learner- generated prompts, and rely on later spaced review for the real retention payoff. |
| Drill Sheet Builder | 10 min | medium | Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Agarwal, Nunes, and Blunt (2021); Rohrer, Dedrick, Hartwig, and Cheung (2020); Lyle, Bego, Ralston, and Immekus (2022); Bego, Lyle, Ralston, Immekus, Chastain, Haynes, Hoyt, Pigg, Rabin, Scobee, and Starr (2024); Braithwaite and Hall (2024); Drill Sheet Builder is best supported as a scheduled mixed-practice artifact that combines interleaving, spaced retrieval, and simple cross-session validation rather than as a one-shot cram sheet. Foundational spacing work by Cepeda and colleagues and applied guidance from Rohrer and Pashler support distributing practice over time. Applied classroom evidence supports retrieval practice in school settings and suggests that interleaved mathematics practice can improve delayed test performance when problem types are mixed and feedback is available. Recent classroom studies in calculus and STEM courses suggest that spacing retrieval across quizzes or sessions often improves later retention even when it feels harder during practice, which fits the idea of a drill sheet that is built for later sessions rather than immediate ease. At the same time, recent work on fraction arithmetic suggests that interleaving is not automatically additive in every instructional context, so the drill sheet should be treated as a targeted mixed-practice tool, not a universal replacement for all blocked practice. The practical implication for this method is to build a sufficiently large interleaved sheet, weight it toward weak objectives and recent misses, attach objective IDs, and define pass criteria that require stable performance across sessions instead of a single good run. |
| Post-Learn Brain Dump | 7 min | medium | Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Carter and Agarwal (2025); Post-Learn Brain Dump is best supported as a retrieval-plus-feedback closure routine that uses session-level recall to consolidate the arc of a study block and expose what still falls out after learning. Foundational testing-effect work and newer meta-analytic retrieval evidence support recall attempts over passive review, classroom retrieval reviews support brief end-of-session testing for consolidation and diagnosis, and recent instructional work supports closing with a fast evidence-generating check rather than a vague recap. The practical implication for this method is to keep the first pass closed-note and comprehensive, compare against the session materials only after the dump ends, and use one-line gap fills to sharpen the next session’s targets instead of reopening a full teaching loop. |

---

## §3 Chain Schema

A chain is an ordered sequence of method blocks with context tags.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique identifier |
| `name` | string | Chain name (e.g., "First Exposure Core") |
| `blocks` | array | Ordered list of block names |
| `context_tags` | object | Recommended context (see §6) |
| `description` | string | When to use this chain |

---

## §3.1 How To Read IDs

Use the IDs as compact labels, not as something you are expected to memorize without a key.

**Chain pattern:** `C-<family>-<variant>`

- `C-FE-STD` = `Chain / First Exposure / Standard`
- `C-QD-001` = `Chain / Quick Drill` (`001` is the first numbered variant in that family)
- `C-TRY-002` = `Chain / Top-Down / Forward Progress`

**Method pattern:** `M-<family>-<sequence>`

- `M-PRE-010` = `Method / PRE family / item 010`
- `M-CAL-001` = `Method / CAL family / item 001`
- `M-ENC-010` = `Method / ENC family / item 010`

**Important runtime rule:** the live `control_stage` is the truth for execution when an older prefix and the current runtime stage differ.

- Example: `M-ENC-008` still carries an older `ENC` prefix in its ID, but it currently runs as a `TEACH` block in the live library.
- Example: methods occasionally declare a `control_stage` that diverges from their historical prefix family; use the live `control_stage`, not the raw prefix alone, to know where they run in a chain.

**Current chain family codes in this library:**

| Code | Meaning |
|------|---------|
| `AD` | Anatomy Deep Dive |
| `CI` | Clinical Reasoning Intake |
| `CR` | Clinical Reasoning |
| `DA` | Dense Anatomy Intake |
| `DP` | DEPTH |
| `EP` | Exam Prep |
| `FE` | First Exposure |
| `LE` | Low Energy |
| `MR` | Mastery Review |
| `PI` | Pathophysiology Intake |
| `QD` | Quick Drill |
| `QF` | Quick First Exposure |
| `RS` | Review Sprint |
| `SW` | SWEEP |
| `TRY` | Top-Down family |
| `VE` | Visual Encoding |

**Current method family codes in this library:**

| Code | Meaning |
|------|---------|
| `PRE` | PRIME-family method ID |
| `CAL` | CALIBRATE-family method ID |
| `TEA` | TEACH-family method ID |
| `ENC` | ENCODE-family method ID |
| `ELB` | ELABORATE-family method ID |
| `ILV` | INTERLEAVE-family method ID |
| `REF` | REFERENCE-family method ID |
| `RET` | RETRIEVE-family method ID |
| `OVR` | OVERLEARN-family method ID |

---

## §4 Template Chains (23 chains)

### Control Plane Chains (CP-MSS v2.0)

#### C-FE-STD. Trey's Favorite: Start Here
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Mechanism Trace → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Comparison Table → KWIK Hook → Question Bank Seed → Timed Sprint Sets
**Context:** medium energy, 35 min
**Use for:** Default start-here chain for Trey. Standard first-exposure flow for medium-energy sessions targeting classification and mechanism modes. Opening is explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then ENCODE, reference generation, and timed retrieval sprint.

#### C-FE-MIN. First Exposure: Minimal
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Modality Switch → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Timed Brain Dump → Exit Ticket
**Context:** low energy, 20 min
**Use for:** Minimal first-exposure chain for low-energy sessions targeting definition and recognition modes. Uses compact opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then light retrieval and wrap-up.

#### C-FE-PRO. First Exposure: Procedure
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Story Spine → Process Flowchart → Full Calibrate Probes → Full Calibrate Priority Set → One-Page Anchor → Case Walkthrough → Timed Sprint Sets
**Context:** high energy
**Use for:** Procedure-focused first-exposure chain for high-energy sessions. Uses explicit opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then process encoding, anchor generation, case walkthrough with fault injection, and timed sprint retrieval.

### Core Chains

#### C-FE-001. First Exposure (Core)
**Blocks:** Learning Objectives Primer → Structural Extraction → Syntopical Big-Picture Synthesis → Micro Precheck → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → KWIK Hook → Question Bank Seed → Timed Brain Dump → Adversarial Drill → Timed Sprint Sets → Anki Card Draft → Drill Sheet Builder
**Context:** first exposure, high energy, 55 min
**Use for:** Control-plane first exposure flow with explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE opening, followed by ENCODE, REFERENCE, RETRIEVE, and OVERLEARN.
**Note:** Retrieval (Free Recall) comes before generative encoding (KWIK Hook) per Roelle et al. (2022) — lower cognitive load, higher gains.

#### C-RS-001. Review Sprint
**Blocks:** Overarching Pre-Question Set → One-Page Anchor → Question Bank Seed → Sprint Quiz → Clinical Application → Exit Ticket
**Context:** review, medium energy, 25 min
**Use for:** Fast review loop. Prepare → Retrieve → Interrogate (application) → Overlearn. Skips encode for known material.

#### C-QD-001. Quick Drill
**Blocks:** Learning Objectives Primer → Brain Dump → One-Page Anchor → Question Bank Seed → Sprint Quiz → Exit Ticket
**Context:** review, medium energy, 15 min
**Use for:** Minimal time investment. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Good for spacing reviews.

#### C-AD-001. Anatomy Deep Dive
**Blocks:** Learning Objectives Primer → Prior Knowledge Scan → Structural Skimming + Pillar Mapping → Draw-Label → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** Anatomy-focused chain with a short PRIME orientation, a calibrate check, and drawing-led encoding before retrieval and overlearn.

#### C-LE-001. Low Energy
**Blocks:** Learning Objectives Primer → Brain Dump → Hierarchical Advance Organizer → One-Page Anchor → Question Bank Seed → Fill-in-Blank → Exit Ticket
**Context:** low energy, 15 min
**Use for:** Low-effort chain for tired days. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Maintain streak without burning out.

#### C-EP-001. Exam Prep
**Blocks:** Overarching Pre-Question Set → One-Page Anchor → Question Bank Seed → Mixed Practice → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** exam prep, high energy, 35 min
**Use for:** Exam-focused chain with interleaving and error analysis. Prepare → Retrieve → Interrogate → Refine → Overlearn.

#### C-CR-001. Clinical Reasoning
**Blocks:** Learning Objectives Primer → Prior Knowledge Scan → Structural Skimming + Pillar Mapping → Case Walkthrough → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** Clinical, exam prep, high energy, 45 min
**Use for:** Build clinical reasoning chains with a short PRIME orientation, a calibrate scan, and contrast-heavy encoding before wrap.

#### C-MR-001. Mastery Review
**Blocks:** One-Page Anchor → Question Bank Seed → Timed Brain Dump → Error Autopsy → Mastery Loop → Anki Card Draft
**Context:** consolidation, medium energy, 30 min
**Use for:** Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.

### Intake-Focused Chains

#### C-DA-001. Dense Anatomy Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Draw-Label → One-Page Anchor → Question Bank Seed → Timed Brain Dump → KWIK Hook → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** High-detail anatomy first exposure with a short PRIME orientation before pre-test, Draw-Label for spatial memory, retrieval, and later generative steps.

#### C-PI-001. Pathophysiology Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Self-Explanation Protocol → Skeleton Concept Hierarchy → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Error Autopsy
**Context:** Pathology, first exposure, high energy, 45 min
**Use for:** Pathology first exposure with a short PRIME orientation before pre-test, self-explanation, concept clustering, retrieval, and refinement.

#### C-CI-001. Clinical Reasoning Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Illness Script Builder → Side-by-Side Comparison → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Anki Card Draft
**Context:** Clinical, first exposure, high energy, 45 min
**Use for:** Clinical first exposure with a short PRIME orientation before pre-test, illness scripts, comparison, retrieval, and overlearn.

#### C-QF-001. Quick First Exposure
**Blocks:** Learning Objectives Primer → Pre-Test → Hierarchical Advance Organizer → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Exit Ticket
**Context:** first exposure, medium energy, 20 min
**Use for:** Minimal intake chain when time is limited. Short PRIME orientation before pre-test, hierarchy setup, retrieval, and overlearn.

### Visualization Chains

#### C-VE-001. Visual Encoding
**Blocks:** Learning Objectives Primer → Brain Dump → Concept Map → Comparison Table → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Exit Ticket
**Context:** first exposure, high energy, 40 min
**Use for:** Visualization-first encoding for topics with confusable concepts. Short PRIME orientation, quick calibrate pulse, then build visual representations before retrieval.

#### C-SW-001. SWEEP
**Blocks:** Skeleton Concept Hierarchy → Concept Map → Comparison Table → One-Page Anchor → Question Bank Seed → Sprint Quiz → Anki Card Draft
**Context:** first exposure, medium energy, 30 min
**Use for:** Pass 1: Fast structural understanding. Touch everything once. Produce visual maps, objectives, confusables, seed cards.

#### C-DP-001. DEPTH
**Blocks:** Learning Objectives Primer → Pre-Test → Why-Chain → Self-Explanation Protocol → Clinical Application → One-Page Anchor → Question Bank Seed → Variable Retrieval → Error Autopsy → Anki Card Draft
**Context:** first exposure, high energy, 45 min
**Use for:** Pass 2: Selective mastery on high-priority objectives with a quick PRIME orientation, pre-test calibration, then depth encode/application work. Retrieval-driven. Cards only from errors.

#### C-TRY-001. Top-Down Narrative Mastery
**Blocks:** Hierarchical Advance Organizer → Micro Precheck → Story Spine → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Hand-Draw Map → KWIK Hook → Concept Map → Timed Brain Dump → Post-Learn Brain Dump
**Context:** first exposure, medium energy, 45 min
**Use for:** Top-down first-exposure chain with explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH builds a story + analogy bridge, closes with a compact anchor artifact, then full calibrate determines ENCODE depth. Teach-back is not a default live gate.

#### C-TRY-002. Top-Down Forward Progress
**Blocks:** Hierarchical Advance Organizer → Micro Precheck → Mechanism Trace → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Hand-Draw Map → KWIK Hook → Concept Map → Timed Brain Dump → Post-Learn Brain Dump
**Context:** first exposure, medium energy, 50 min
**Use for:** Top-down first-exposure chain with tiered exits and explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH closes with a learner-usable anchor artifact before any mnemonic slot. Teach-back is removed from the default live path.

---

## §5 Rating Protocol

After each session using a method chain, rate its effectiveness.

**Post-Session Rating (captured during Wrap):**

| Field | Scale | Description |
|-------|-------|-------------|
| `effectiveness` | 1-5 | How well did the chain work for this material? |
| `engagement` | 1-5 | How engaged/focused were you? |
| `context_tags` | object | Actual context (class_type, stage, energy, time_available) |
| `notes` | string | Optional free text (e.g., "KWIK worked well; Teach-Back felt rushed") |

**Rating Scale:**

- **1** — Ineffective / disengaged
- **2** — Somewhat ineffective / low engagement
- **3** — Neutral / moderate engagement
- **4** — Effective / high engagement
- **5** — Highly effective / fully engaged

**Capture in Session Ledger:**

Add to `artifacts_created` if a method chain was used:
```
method_chain: [chain_id]; effectiveness: [1-5]; engagement: [1-5]
```

---

## §6 Context Dimensions

Context tags describe when a chain is appropriate.

| Dimension | Values | Description |
|-----------|--------|-------------|
| `class_type` | `anatomy` / `physiology` / `pathology` / `pharmacology` / `clinical` / `general` | Subject type |
| `stage` | `first_exposure` / `review` / `exam_prep` | Learning stage |
| `energy` | `low` / `medium` / `high` | Focus/motivation level (1-10 scale mapped to low=1-4, medium=5-7, high=8-10) |
| `time_available` | number | Minutes available for session |

**Matching Logic:**

Brain recommends chains where context tags align with current session context. Exact matches preferred; partial matches allowed.

---

## §7 Brain Integration

Brain stores and analyzes method chain data.

**Tables:**

1. **method_blocks** — All available blocks (with evidence citations)
2. **method_chains** — Pre-built and custom chains
3. **method_ratings** — Post-session ratings per block and chain

**Analytics:**

- **Effectiveness stats** — Average rating per chain, per context
- **Usage frequency** — Which chains are used most often
- **Anomaly detection** — Flag chains with low ratings in specific contexts
- **Recommendations** — Suggest chains based on session context and historical performance

---

## §8 Scholar Integration

Scholar questions chain effectiveness and proposes improvements.

**Research Questions:**

1. Which blocks correlate with high retention (from RSR data)?
2. Do certain chains work better for specific class types?
3. Are there context patterns where effectiveness is consistently low?
4. Can we predict optimal chain selection based on past sessions?

**Outputs:**

- **Chain Optimization Proposals** — Reorder blocks, swap blocks, adjust durations
- **New Chain Designs** — Propose chains for underserved contexts
- **A/B Test Plans** — Compare variant chains in similar contexts

---

## Cross-References

- **Core Rules:** `01-core-rules.md` (planning, source-lock, seed-lock gates apply during method execution)
- **Session Flow:** `05-session-flow.md` (method chains run inside M2-M4; selection occurs during M0 Planning)
- **Modes:** `06-modes.md` (chains can be mode-specific; e.g., Sprint chains use retrieval-first blocks)
- **Logging:** `08-logging.md` (method_chain field added to Session Ledger and Enhanced JSON)
- **Templates:** `09-templates.md` (method_chain added to Session Ledger template)

---

## Implementation Notes

- Method chains are **optional**. Sessions can proceed without selecting a chain.
- Chains are **composable** — blocks can be reordered or omitted as needed.
- **Ad-hoc chains** can be built during M0 Planning if no template fits.
- Rating is **opt-in** but recommended for data-driven improvement.
- All blocks include evidence citations. Use `--force` re-seed to update.
- Use `--migrate` flag to update categories on an existing database without wiping data.
