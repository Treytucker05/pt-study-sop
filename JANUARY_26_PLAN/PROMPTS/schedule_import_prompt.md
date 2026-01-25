# Schedule Import Prompt

Copy this entire prompt and paste it into ChatGPT along with your syllabus.

---

I need you to extract schedule events from my course syllabus.

Return ONLY a valid JSON array with NO additional text, NO markdown code blocks, NO explanation.

Structure for each item:
{
  "type": "chapter" | "quiz" | "assignment" | "exam",
  "title": "string",
  "dueDate": "YYYY-MM-DD",
  "notes": "optional string or null"
}

Rules:
1. type must be EXACTLY one of: "chapter", "quiz", "assignment", "exam"
2. dueDate must be ISO format (YYYY-MM-DD) - if no date given, use null
3. title should be descriptive but concise
4. For chapters/topics, use the class date they're covered
5. Include ALL deadlines, exams, quizzes, and major topic dates
6. Return ONLY the JSON array, nothing else

Example output:
[
  {"type": "chapter", "title": "Module 1: Introduction", "dueDate": "2026-01-15", "notes": null},
  {"type": "quiz", "title": "Quiz 1 - Chapters 1-2", "dueDate": "2026-01-22", "notes": "Covers intro material"},
  {"type": "assignment", "title": "Case Study 1", "dueDate": "2026-01-29", "notes": null},
  {"type": "exam", "title": "Midterm Exam", "dueDate": "2026-02-15", "notes": "Chapters 1-5"}
]

Here's my syllabus:

[PASTE YOUR SYLLABUS BELOW THIS LINE]
