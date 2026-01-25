# Module Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your course outline.

---

I need you to extract course modules/units from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "name": "string"
}

Rules:
1. name: The module/unit/week title
2. Preserve the order from the source
3. Include all modules, units, or weeks
4. Return ONLY the JSON array, nothing else

Example output:
[
  {"name": "Module 1: Introduction to Exercise Physiology"},
  {"name": "Module 2: Energy Systems"},
  {"name": "Module 3: Cardiovascular Responses to Exercise"},
  {"name": "Module 4: Respiratory Responses to Exercise"}
]

Here's my course outline:

[PASTE YOUR COURSE OUTLINE BELOW THIS LINE]
