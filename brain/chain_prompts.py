"""Prompt templates for chain runner method blocks.

Each template returns {"system": str, "user": str} for call_llm().
Templates are keyed by method block name and receive:
  - topic: the study topic
  - rag_context: source material from RAG docs
  - accumulated: output from prior steps in the chain
"""

from __future__ import annotations

SYSTEM_BASE = (
    "You are a PT study tutor helping a DPT student master clinical content. "
    "Be accurate, concise, and focused on the topic. Use clinical terminology "
    "appropriate for a graduate-level physical therapy student."
)

# Map block name → prompt builder function
_TEMPLATES: dict[str, tuple[str, str]] = {}


def _register(name: str, system_suffix: str, user_template: str) -> None:
    """Register a prompt template for a method block."""
    _TEMPLATES[name] = (system_suffix, user_template)


def get_step_prompt(
    block: dict, topic: str, rag_context: str, accumulated: str
) -> dict[str, str]:
    """Build system + user prompts for a chain step.

    Args:
        block: method_blocks row dict with at least 'name' and 'category'
        topic: the study topic string
        rag_context: concatenated RAG document content
        accumulated: output from prior chain steps

    Returns:
        {"system": str, "user": str}
    """
    name = block["name"]

    # Use facilitation_prompt from DB when available (Tier 3 block-level prompt)
    facilitation = (block.get("facilitation_prompt") or "").strip()
    if facilitation:
        system = f"{SYSTEM_BASE}\n\n{facilitation}"
        return {
            "system": system,
            "user": (
                f"Topic: {topic}\n\n"
                f"Source Material:\n{rag_context}\n\n"
                f"Prior Steps:\n{accumulated}\n\n"
                f"Execute this activity block now."
            ),
        }

    entry = _TEMPLATES.get(name)
    if not entry:
        # Fallback: generic prompt for unknown blocks
        return {
            "system": SYSTEM_BASE,
            "user": (
                f"Topic: {topic}\n\n"
                f"Source Material:\n{rag_context}\n\n"
                f"Prior Steps:\n{accumulated}\n\n"
                f"Perform the '{name}' study method on this topic. "
                f"Produce structured, useful output."
            ),
        }

    system_suffix, user_tpl = entry
    system = f"{SYSTEM_BASE} {system_suffix}" if system_suffix else SYSTEM_BASE
    user = user_tpl.format(
        topic=topic, rag_context=rag_context, accumulated=accumulated
    )
    return {"system": system, "user": user}


# ---------------------------------------------------------------------------
# SWEEP chain blocks
# ---------------------------------------------------------------------------

_register(
    "Concept Cluster",
    "You organize information into meaningful clusters for efficient learning.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Group the key concepts for this topic into 3-5 named clusters. "
        "For each cluster:\n"
        "1. Give it a descriptive name\n"
        "2. List 3-6 related terms/concepts\n"
        "3. Write one sentence explaining why they belong together\n\n"
        "Format as markdown with ## headers for each cluster."
    ),
)

_register(
    "Concept Map",
    "You create Mermaid diagram syntax for concept maps.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Create a concept map as a Mermaid graph TD diagram. Requirements:\n"
        "- Include 8-15 nodes covering the key concepts\n"
        "- Use labeled edges showing relationships (e.g., --stabilizes-->)\n"
        "- Group related concepts visually\n"
        "- Include at least one clinical connection\n\n"
        "Output ONLY the Mermaid code block, starting with ```mermaid and ending with ```.\n"
        "Then add a brief 2-3 sentence summary of the key relationships shown."
    ),
)

_register(
    "Comparison Table",
    "You identify confusable pairs and create discriminating comparisons.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Identify 3-5 pairs of commonly confused concepts within this topic. "
        "For each pair, create a comparison table with:\n"
        "- Concept A vs Concept B\n"
        "- 3-4 discriminating features (the specific differences that matter)\n"
        "- A clinical scenario where confusing them would lead to error\n\n"
        "Format as markdown tables."
    ),
)

_register(
    "Sprint Quiz",
    "You create rapid-fire quiz questions testing key concepts.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Generate 10 rapid quiz questions about this topic. Mix these types:\n"
        "- 4 factual recall questions\n"
        "- 3 application questions (clinical scenarios)\n"
        "- 3 discrimination questions (between confusable concepts)\n\n"
        "For each question:\n"
        "1. The question\n"
        "2. The correct answer (brief)\n"
        "3. Why wrong answers are wrong (one common misconception)\n\n"
        "Format: number each Q/A pair. Use **bold** for answers."
    ),
)

_register(
    "Anki Card Draft",
    "You create high-quality Anki flashcards from study material.",
    (
        "Topic: {topic}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Create up to 10 Anki flashcard drafts from the material above. "
        "Focus on:\n"
        "- Concepts that were confused or error-prone\n"
        "- Key discriminating features between similar concepts\n"
        "- Clinical applications\n\n"
        "For each card, output exactly this format:\n"
        "CARD N:\n"
        "TYPE: basic | cloze\n"
        "FRONT: [question or cloze sentence]\n"
        "BACK: [answer]\n"
        "TAGS: [comma-separated tags]\n\n"
        "For cloze cards, use {{c1::answer}} syntax on the FRONT."
    ),
)

# ---------------------------------------------------------------------------
# DEPTH chain blocks
# ---------------------------------------------------------------------------

_register(
    "Pre-Test",
    "You create diagnostic pre-test questions to prime learning.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Create 5 diagnostic pre-test questions about this topic. These should:\n"
        "1. Range from foundational to advanced\n"
        "2. Expose common misconceptions\n"
        "3. Target the most clinically relevant concepts\n\n"
        "For each question provide:\n"
        "- The question\n"
        "- The expected correct answer\n"
        "- What a wrong answer reveals about the student's understanding\n\n"
        "Format as numbered list with **bold** labels."
    ),
)

_register(
    "Why-Chain",
    "You build causal depth by repeatedly asking 'why' about mechanisms.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Pick the 2 most important concepts from this topic and build a "
        "'Why-Chain' for each — ask 'why?' 3-5 times, going deeper into "
        "the underlying mechanism each time.\n\n"
        "Format:\n"
        "## Concept: [name]\n"
        "**Level 1**: [surface fact] → Why?\n"
        "**Level 2**: [mechanism] → Why?\n"
        "**Level 3**: [deeper mechanism] → Why?\n"
        "... continue until you reach foundational physiology/anatomy.\n\n"
        "End each chain with a **Clinical Relevance** note."
    ),
)

_register(
    "Mechanism Trace",
    "You trace cause-and-effect chains through physiological mechanisms.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Create a mechanism trace with at least 4 linked cause→effect steps "
        "for the primary mechanism in this topic.\n\n"
        "Format as:\n"
        "**Trigger**: [initial event]\n"
        "→ **Step 1**: [effect] — because [mechanism]\n"
        "→ **Step 2**: [effect] — because [mechanism]\n"
        "→ **Step 3**: [effect] — because [mechanism]\n"
        "→ **Step 4**: [effect] — because [mechanism]\n"
        "→ **Clinical Outcome**: [what the PT sees/treats]\n\n"
        "Then note where the chain could be interrupted therapeutically."
    ),
)

_register(
    "Clinical Application",
    "You apply concepts to realistic PT clinical scenarios.",
    (
        "Topic: {topic}\n\n"
        "Source Material:\n{rag_context}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Create a clinical scenario that applies the key concepts from this topic. "
        "Include:\n"
        "1. **Patient Presentation**: age, diagnosis, relevant history\n"
        "2. **Key Findings**: objective measures, test results\n"
        "3. **Clinical Question**: What would you do and why?\n"
        "4. **Reasoning**: Apply the concepts from earlier steps\n"
        "5. **Evidence Connection**: Link back to the mechanism/evidence\n\n"
        "Make it realistic for a DPT student's clinical rotation."
    ),
)

_register(
    "Variable Retrieval",
    "You test retrieval in multiple formats to strengthen memory traces.",
    (
        "Topic: {topic}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Test retrieval of the key concepts in 3 different formats:\n\n"
        "## Format 1: Free Recall\n"
        "List the 5 most important facts about this topic from memory "
        "(based on what was covered in prior steps).\n\n"
        "## Format 2: Application\n"
        "Give 3 clinical scenarios where this knowledge changes your "
        "PT decision-making. For each, state what you'd do differently.\n\n"
        "## Format 3: Comparison\n"
        "Compare and contrast 2 key concepts from this topic. "
        "What's the same? What's different? When does it matter clinically?"
    ),
)

_register(
    "Error Autopsy",
    "You analyze errors and misconceptions to strengthen understanding.",
    (
        "Topic: {topic}\n\n"
        "Prior Steps:\n{accumulated}\n\n"
        "Review the quiz responses and retrieval attempts from earlier steps. "
        "Identify:\n\n"
        "1. **Common Errors**: What concepts are most likely to be confused?\n"
        "2. **Root Causes**: For each error pattern, explain WHY students "
        "make this mistake (e.g., surface similarity, missing prerequisite)\n"
        "3. **Correction Strategy**: For each error, provide a specific "
        "strategy to prevent it (mnemonic, analogy, discriminating feature)\n"
        "4. **Near-Misses**: Concepts that seem correct but have subtle "
        "important differences\n\n"
        "Focus on errors that would matter clinically."
    ),
)
