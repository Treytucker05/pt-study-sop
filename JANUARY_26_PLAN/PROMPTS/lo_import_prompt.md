# Learning Objectives Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your LO document.

---

I need you to extract learning objectives from my course material.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "loCode": "string",
  "title": "string"
}

Rules:
1. loCode: Preserve original numbering if present (e.g., "LO-1.1", "4.2a", "3")
   - If no numbering exists, create sequential codes: "1", "2", "3"...
2. title: Keep the objective text exactly as written
3. One object per learning objective
4. Return ONLY the JSON array, nothing else

Example output:
[
  {"loCode": "1.1", "title": "Define the components of the musculoskeletal system"},
  {"loCode": "1.2", "title": "Explain the function of skeletal muscle"},
  {"loCode": "2.1", "title": "Identify the bones of the upper extremity"},
  {"loCode": "2.2", "title": "Describe the structure of synovial joints"}
]

Here are my learning objectives:

[PASTE YOUR LEARNING OBJECTIVES BELOW THIS LINE]
